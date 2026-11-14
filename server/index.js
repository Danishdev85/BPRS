import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.js";
import { requireAuth, signToken } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "uploads"),
    filename: (req, file, cb) =>
      cb(null, `order-${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname || ".jpg")}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
});

/* ---------------- boot: schema + admin seed + trash purge ---------------- */
async function boot() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    await pool.query(stmt);
  }
  const [users] = await pool.query("SELECT COUNT(*) AS n FROM users");
  if (users[0].n === 0) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "bprs123", 10);
    await pool.query("INSERT INTO users (username, password_hash) VALUES (?, ?)", [
      process.env.ADMIN_USERNAME || "admin",
      hash,
    ]);
    console.log("[bprs] Admin account seeded");
  }
  await pool.query("DELETE FROM orders WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL 30 DAY");
}

/* ---------------- auth ---------------- */
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username.trim()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: "Invalid username or password" });
  res.json({ token: signToken(user), username: user.username });
});
app.get("/api/auth/me", requireAuth, (req, res) => res.json({ username: req.user.username }));

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch {
    res.status(500).json({ ok: false, database: "unreachable" });
  }
});

/* ---------------- products ---------------- */
app.get("/api/products", requireAuth, async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM products ORDER BY name ASC");
  res.json(rows);
});
app.post("/api/products", requireAuth, async (req, res) => {
  const { name, category, sku, price, cost_price, stock } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "Product name is required" });
  const [r] = await pool.query(
    "INSERT INTO products (name, category, sku, price, cost_price, stock) VALUES (?,?,?,?,?,?)",
    [name.trim(), category || "General", sku || "", Number(price) || 0, Number(cost_price) || 0, parseInt(stock) || 0]
  );
  const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [r.insertId]);
  res.status(201).json(rows[0]);
});
app.put("/api/products/:id", requireAuth, async (req, res) => {
  const { name, category, sku, price, cost_price, stock } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "Product name is required" });
  await pool.query(
    "UPDATE products SET name=?, category=?, sku=?, price=?, cost_price=?, stock=? WHERE id=?",
    [name.trim(), category || "General", sku || "", Number(price) || 0, Number(cost_price) || 0, parseInt(stock) || 0, req.params.id]
  );
  const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [req.params.id]);
  res.json(rows[0]);
});
app.delete("/api/products/:id", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM products WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

/* ---------------- orders ---------------- */
function orderTotals(body, product) {
  const quantity = Math.max(1, parseInt(body.quantity) || 1);
  const unit_price = body.unit_price !== undefined && body.unit_price !== "" ? Number(body.unit_price) : Number(product?.price || 0);
  const unit_cost = Number(product?.cost_price || 0);
  return { quantity, unit_price, total_price: unit_price * quantity, cost_total: unit_cost * quantity };
}

app.get("/api/orders", requireAuth, async (req, res) => {
  const { status, q } = req.query;
  let sql = "SELECT * FROM orders WHERE deleted_at IS NULL";
  const args = [];
  if (status) { sql += " AND status = ?"; args.push(status); }
  if (q) { sql += " AND (customer_name LIKE ? OR order_ref LIKE ? OR product_name LIKE ?)"; args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  sql += " ORDER BY order_date DESC, id DESC";
  const [rows] = await pool.query(sql, args);
  res.json(rows);
});

app.post("/api/orders", requireAuth, upload.single("image"), async (req, res) => {
  const b = req.body || {};
  if (!b.customer_name?.trim()) return res.status(400).json({ error: "Customer name is required" });
  let product = null;
  if (b.product_id) {
    const [p] = await pool.query("SELECT * FROM products WHERE id = ?", [b.product_id]);
    product = p[0] || null;
  }
  const product_name = product ? product.name : (b.product_name || "").trim();
  if (!product_name) return res.status(400).json({ error: "Choose a product or type a product name" });
  const t = orderTotals(b, product);
  const [count] = await pool.query("SELECT COUNT(*) AS n FROM orders");
  const order_ref = "ORD-" + String(1001 + count[0].n);
  const [r] = await pool.query(
    `INSERT INTO orders (order_ref, customer_name, customer_phone, product_id, product_name, quantity, unit_price, total_price, cost_total, status, payment_status, image_path, notes, order_date)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [order_ref, b.customer_name.trim(), b.customer_phone || "", product?.id || null, product_name,
     t.quantity, t.unit_price, t.total_price, t.cost_total,
     b.status || "pending", b.payment_status || "unpaid",
     req.file ? `/uploads/${req.file.filename}` : null, b.notes || null,
     b.order_date || new Date().toISOString().slice(0, 10)]
  );
  if (product && b.deduct_stock === "true") {
    await pool.query("UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?", [t.quantity, product.id]);
  }
  const [rows] = await pool.query("SELECT * FROM orders WHERE id = ?", [r.insertId]);
  res.status(201).json(rows[0]);
});

app.put("/api/orders/:id", requireAuth, upload.single("image"), async (req, res) => {
  const b = req.body || {};
  const [existing] = await pool.query("SELECT * FROM orders WHERE id = ? AND deleted_at IS NULL", [req.params.id]);
  if (!existing[0]) return res.status(404).json({ error: "Order not found" });
  let product = null;
  if (b.product_id) {
    const [p] = await pool.query("SELECT * FROM products WHERE id = ?", [b.product_id]);
    product = p[0] || null;
  }
  const product_name = product ? product.name : (b.product_name || existing[0].product_name);
  const t = orderTotals({ quantity: b.quantity ?? existing[0].quantity, unit_price: b.unit_price ?? existing[0].unit_price }, product || { price: existing[0].unit_price, cost_price: existing[0].quantity ? existing[0].cost_total / existing[0].quantity : 0 });
  await pool.query(
    `UPDATE orders SET customer_name=?, customer_phone=?, product_id=?, product_name=?, quantity=?, unit_price=?, total_price=?, cost_total=?, status=?, payment_status=?, image_path=?, notes=?, order_date=? WHERE id=?`,
    [b.customer_name ?? existing[0].customer_name, b.customer_phone ?? existing[0].customer_phone,
     product ? product.id : existing[0].product_id, product_name, t.quantity, t.unit_price, t.total_price, t.cost_total,
     b.status ?? existing[0].status, b.payment_status ?? existing[0].payment_status,
     req.file ? `/uploads/${req.file.filename}` : existing[0].image_path,
     b.notes ?? existing[0].notes, b.order_date ?? existing[0].order_date, req.params.id]
  );
  const [rows] = await pool.query("SELECT * FROM orders WHERE id = ?", [req.params.id]);
  res.json(rows[0]);
});

/* trash */
app.delete("/api/orders/:id", requireAuth, async (req, res) => {
  await pool.query("UPDATE orders SET deleted_at = NOW() WHERE id = ?", [req.params.id]);
  res.json({ ok: true, trashed: true });
});
app.get("/api/orders/trash", requireAuth, async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM orders WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC");
  res.json(rows);
});
app.post("/api/orders/:id/restore", requireAuth, async (req, res) => {
  await pool.query("UPDATE orders SET deleted_at = NULL WHERE id = ?", [req.params.id]);
  res.json({ ok: true, restored: true });
});
app.delete("/api/orders/:id/forever", requireAuth, async (req, res) => {
  const [rows] = await pool.query("SELECT image_path FROM orders WHERE id = ?", [req.params.id]);
  if (rows[0]?.image_path) {
    fs.unlink(path.join(__dirname, rows[0].image_path), () => {});
  }
  await pool.query("DELETE FROM orders WHERE id = ?", [req.params.id]);
  res.json({ ok: true, deleted: true });
});

/* export order history as CSV */
app.get("/api/orders/export.csv", requireAuth, async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM orders WHERE deleted_at IS NULL ORDER BY order_date DESC, id DESC");
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Order Ref", "Date", "Customer", "Phone", "Product", "Quantity", "Unit Price", "Total", "Cost Total", "Profit", "Status", "Payment", "Notes"];
  const lines = rows.map((o) => [o.order_ref, o.order_date, o.customer_name, o.customer_phone, o.product_name, o.quantity, o.unit_price, o.total_price, o.cost_total, Number(o.total_price) - Number(o.cost_total), o.status, o.payment_status, o.notes || ""].map(esc).join(","));
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="bprs-order-history.csv"');
  res.send([head.map(esc).join(","), ...lines].join("\n"));
});

/* ---------------- finance / stats ---------------- */
const LIVE = "deleted_at IS NULL AND status <> 'cancelled'";
app.get("/api/stats/overview", requireAuth, async (req, res) => {
  const [[rev]] = await pool.query(`SELECT COALESCE(SUM(total_price),0) AS revenue, COALESCE(SUM(cost_total),0) AS cost, COUNT(*) AS orders_count FROM orders WHERE ${LIVE}`);
  const [[pc]] = await pool.query("SELECT COUNT(*) AS n FROM products");
  const [[pending]] = await pool.query("SELECT COUNT(*) AS n FROM orders WHERE deleted_at IS NULL AND status IN ('pending','confirmed')");
  const [[unpaid]] = await pool.query(`SELECT COALESCE(SUM(total_price),0) AS amount, COUNT(*) AS n FROM orders WHERE ${LIVE} AND payment_status='unpaid'`);
  const [[last30]] = await pool.query(`SELECT COALESCE(SUM(total_price),0) AS revenue FROM orders WHERE ${LIVE} AND order_date >= CURDATE() - INTERVAL 30 DAY`);
  const [recent] = await pool.query("SELECT * FROM orders WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 6");
  const [lowStock] = await pool.query("SELECT * FROM products WHERE stock <= 5 ORDER BY stock ASC LIMIT 6");
  res.json({
    revenue: Number(rev.revenue), cost: Number(rev.cost), profit: Number(rev.revenue) - Number(rev.cost),
    orders_count: rev.orders_count, products_count: pc.n, pending_orders: pending.n,
    unpaid_amount: Number(unpaid.amount), unpaid_count: unpaid.n,
    avg_order_value: rev.orders_count ? Math.round(Number(rev.revenue) / rev.orders_count) : 0,
    last30_revenue: Number(last30.revenue),
    recent_orders: recent, low_stock: lowStock,
  });
});
app.get("/api/stats/monthly", requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(order_date, '%Y-%m') AS month, COALESCE(SUM(total_price),0) AS revenue, COALESCE(SUM(cost_total),0) AS cost, COUNT(*) AS orders_count
     FROM orders WHERE ${LIVE} AND order_date >= CURDATE() - INTERVAL 6 MONTH GROUP BY month ORDER BY month ASC`
  );
  res.json(rows.map((r) => ({ ...r, revenue: Number(r.revenue), cost: Number(r.cost), profit: Number(r.revenue) - Number(r.cost) })));
});
app.get("/api/stats/top-products", requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT product_name, COUNT(*) AS orders_count, SUM(quantity) AS units, COALESCE(SUM(total_price),0) AS revenue
     FROM orders WHERE ${LIVE} GROUP BY product_name ORDER BY revenue DESC LIMIT 6`
  );
  res.json(rows.map((r) => ({ ...r, revenue: Number(r.revenue) })));
});

/* ---------------- start ---------------- */
const PORT = Number(process.env.PORT || 4100);
boot()
  .then(() => app.listen(PORT, () => console.log(`[bprs] Server running on http://localhost:${PORT}`)))
  .catch((e) => { console.error("[bprs] Boot failed:", e.message); process.exit(1); });
