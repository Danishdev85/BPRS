import { useEffect, useState } from "react";
import { api, rs } from "../api.js";
import { Icon, I } from "../App.jsx";

const EMPTY = { name: "", category: "General", sku: "", price: "", cost_price: "", stock: "" };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const load = () => { api("/api/products").then(setProducts).catch(() => {}); };
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault(); setError("");
    try {
      if (form.id) await api(`/api/products/${form.id}`, { method: "PUT", body: JSON.stringify(form) });
      else await api("/api/products", { method: "POST", body: JSON.stringify(form) });
      setForm(null); load();
    } catch (err) { setError(err.message); }
  }
  async function remove(p) {
    if (!confirm(`Delete "${p.name}"? Orders already placed keep their record.`)) return;
    await api(`/api/products/${p.id}`, { method: "DELETE" }); load();
  }
  const shown = products.filter((p) => (p.name + p.category + p.sku).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="page-head">
        <div><h1>Products</h1><p>Every product you sell — any category, any kind of e-commerce.</p></div>
        <div className="toolbar">
          <div className="search-box"><Icon d={I.search} size={16} /><input placeholder="Search products..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <button className="btn" onClick={() => { setForm({ ...EMPTY }); setError(""); }}><Icon d={I.plus} size={17} />Add product</button>
        </div>
      </div>

      <div className="card">
        {shown.length === 0 ? <div className="empty"><b>No products yet</b>Add your first product to start recording orders.</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Product</th><th>Category</th><th>SKU</th><th className="right">Cost price</th><th className="right">Selling price</th><th className="right">Margin</th><th className="right">Stock</th><th></th></tr></thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id}>
                  <td><div className="cell-main">{p.name}</div></td>
                  <td>{p.category}</td>
                  <td className="cell-sub">{p.sku || "—"}</td>
                  <td className="right num">{rs(p.cost_price)}</td>
                  <td className="right num" style={{ fontWeight: 600 }}>{rs(p.price)}</td>
                  <td className="right num">{p.price ? Math.round(((p.price - p.cost_price) / p.price) * 100) : 0}%</td>
                  <td className="right">{p.stock <= 5 ? <span className="pill pending">{p.stock}</span> : <span className="num">{p.stock}</span>}</td>
                  <td className="right" style={{ whiteSpace: "nowrap" }}>
                    <button className="icon-btn" title="Edit" onClick={() => { setForm({ ...p }); setError(""); }}><Icon d={I.edit} size={16} /></button>
                    <button className="icon-btn red" title="Delete" onClick={() => remove(p)}><Icon d={I.trash} size={16} /></button>
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
            <div className="modal-head"><h2>{form.id ? "Edit product" : "Add product"}</h2><button type="button" className="icon-btn" onClick={() => setForm(null)}><Icon d={I.x} /></button></div>
            <div className="modal-body">
              {error && <div className="error">{error}</div>}
              <div className="field"><label className="f">Product name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Wireless Earbuds Pro" required /></div>
              <div className="form-grid">
                <div className="field"><label className="f">Category</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Electronics, Fashion, Grocery..." /></div>
                <div className="field"><label className="f">SKU (optional)</label><input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="EB-001" /></div>
                <div className="field"><label className="f">Selling price (Rs)</label><input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
                <div className="field"><label className="f">Cost price (Rs)</label><input type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} /></div>
                <div className="field"><label className="f">Stock quantity</label><input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
              </div>
              <div className="modal-foot"><button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button><button className="btn">{form.id ? "Save changes" : "Add product"}</button></div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
