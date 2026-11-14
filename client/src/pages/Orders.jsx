import { useEffect, useState } from "react";
import { api, rs, downloadCSV } from "../api.js";
import { Icon, I } from "../App.jsx";

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const EMPTY = { customer_name: "", customer_phone: "", product_id: "", product_name: "", quantity: 1, unit_price: "", status: "pending", payment_status: "unpaid", order_date: today(), notes: "", deduct_stock: true };

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState(null);
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    api(`/api/orders?${params}`).then(setOrders).catch(() => {});
  };
  useEffect(() => { load(); }, [status, q]);
  useEffect(() => { api("/api/products").then(setProducts).catch(() => {}); }, []);

  function pickProduct(pid) {
    const p = products.find((x) => x.id === Number(pid));
    setForm({ ...form, product_id: pid, product_name: p ? p.name : form.product_name, unit_price: p ? p.price : form.unit_price });
  }
  async function save(e) {
    e.preventDefault(); setError("");
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, k === "deduct_stock" ? String(!!v) : (v ?? "")));
    if (image) fd.append("image", image);
    try {
      if (form.id) await api(`/api/orders/${form.id}`, { method: "PUT", body: fd });
      else await api("/api/orders", { method: "POST", body: fd });
      setForm(null); setImage(null); load();
    } catch (err) { setError(err.message); }
  }
  async function trash(o) {
    if (!confirm(`Move ${o.order_ref} to Trash? You can restore it any time.`)) return;
    await api(`/api/orders/${o.id}`, { method: "DELETE" }); load();
  }

  return (
    <>
      <div className="page-head">
        <div><h1>Orders</h1><p>Full order history — add, edit, track, and download it any time.</p></div>
        <div className="toolbar">
          <div className="search-box"><Icon d={I.search} size={16} /><input placeholder="Search orders..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select style={{ width: 160 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
          <button className="btn ghost" onClick={downloadCSV}><Icon d={I.download} size={17} />Download history</button>
          <button className="btn" onClick={() => { setForm({ ...EMPTY }); setImage(null); setError(""); }}><Icon d={I.plus} size={17} />Add order</button>
        </div>
      </div>

      <div className="card">
        {orders.length === 0 ? <div className="empty"><b>No orders found</b>Add an order, or change the search and filters.</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th></th><th>Order</th><th>Customer</th><th>Product</th><th>Status</th><th>Payment</th><th className="right">Total</th><th className="right">Profit</th><th></th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.image_path ? <img className="thumb" src={o.image_path} alt="Order" /> : <div className="thumb-empty"><Icon d={I.image} size={17} /></div>}</td>
                  <td><div className="cell-main">{o.order_ref}</div><div className="cell-sub">{o.order_date}</div></td>
                  <td><div className="cell-main">{o.customer_name}</div><div className="cell-sub">{o.customer_phone || "—"}</div></td>
                  <td><div className="cell-main">{o.product_name}</div><div className="cell-sub">× {o.quantity} at {rs(o.unit_price)}</div></td>
                  <td><span className={`pill ${o.status}`}>{o.status}</span></td>
                  <td><span className={`pill ${o.payment_status}`}>{o.payment_status}</span></td>
                  <td className="right num" style={{ fontWeight: 700 }}>{rs(o.total_price)}</td>
                  <td className="right num" style={{ color: "var(--green)", fontWeight: 600 }}>{rs(Number(o.total_price) - Number(o.cost_total))}</td>
                  <td className="right" style={{ whiteSpace: "nowrap" }}>
                    <button className="icon-btn" title="Edit" onClick={() => { setForm({ ...o, deduct_stock: false }); setImage(null); setError(""); }}><Icon d={I.edit} size={16} /></button>
                    <button className="icon-btn red" title="Move to Trash" onClick={() => trash(o)}><Icon d={I.trash} size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {form && (
        <div className="overlay" onClick={() => setForm(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="modal-head"><h2>{form.id ? `Edit ${form.order_ref}` : "Add order"}</h2><button type="button" className="icon-btn" onClick={() => setForm(null)}><Icon d={I.x} /></button></div>
            <div className="modal-body">
              {error && <div className="error">{error}</div>}
              <div className="form-grid">
                <div className="field"><label className="f">Customer name</label><input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required /></div>
                <div className="field"><label className="f">Customer phone</label><input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} placeholder="03xx xxxxxxx" /></div>
              </div>
              <div className="field"><label className="f">Product</label>
                <select value={form.product_id || ""} onChange={(e) => pickProduct(e.target.value)}>
                  <option value="">Type a custom product below...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {rs(p.price)}</option>)}
                </select>
              </div>
              {!form.product_id && <div className="field"><label className="f">Custom product name</label><input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} placeholder="Product name" /></div>}
              <div className="form-grid">
                <div className="field"><label className="f">Quantity</label><input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required /></div>
                <div className="field"><label className="f">Unit price (Rs)</label><input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} placeholder="Auto from product" /></div>
                <div className="field"><label className="f">Order status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select></div>
                <div className="field"><label className="f">Payment</label><select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })}><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></div>
                <div className="field"><label className="f">Order date</label><input type="date" value={String(form.order_date).slice(0, 10)} onChange={(e) => setForm({ ...form, order_date: e.target.value })} required /></div>
                <div className="field"><label className="f">Order picture (optional)</label><input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0] || null)} /></div>
              </div>
              {form.id && form.image_path && <p className="cell-sub" style={{ marginBottom: 12 }}>Current picture attached. Choose a new file to replace it.</p>}
              <div className="field"><label className="f">Notes</label><textarea rows="2" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Address, delivery note, anything..."></textarea></div>
              {!form.id && <label className="check" style={{ marginBottom: 14 }}><input type="checkbox" checked={!!form.deduct_stock} onChange={(e) => setForm({ ...form, deduct_stock: e.target.checked })} /> Deduct quantity from product stock</label>}
              <div className="modal-foot"><button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button><button className="btn">{form.id ? "Save changes" : "Add order"}</button></div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
