import { useEffect, useState } from "react";
import { api, rs } from "../api.js";
import { Icon, I } from "../App.jsx";

export default function Trash() {
  const [rows, setRows] = useState([]);
  const load = () => { api("/api/orders/trash").then(setRows).catch(() => {}); };
  useEffect(() => { load(); }, []);

  async function restore(o) { await api(`/api/orders/${o.id}/restore`, { method: "POST" }); load(); }
  async function forever(o) {
    if (!confirm(`Delete ${o.order_ref} forever? This cannot be undone.`)) return;
    await api(`/api/orders/${o.id}/forever`, { method: "DELETE" }); load();
  }
  const daysLeft = (d) => Math.max(0, 30 - Math.floor((Date.now() - new Date(d).getTime()) / 86400000));

  return (
    <>
      <div className="page-head"><div><h1>Trash</h1><p>Deleted orders stay here for 30 days — restore them any time, or delete them forever.</p></div></div>
      <div className="card">
        {rows.length === 0 ? <div className="empty"><b>Trash is empty</b>Orders you delete will appear here before they are gone for good.</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Order</th><th>Customer</th><th>Product</th><th className="right">Total</th><th>Deleted</th><th>Auto-delete in</th><th></th></tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td><div className="cell-main">{o.order_ref}</div><div className="cell-sub">{o.order_date}</div></td>
                  <td className="cell-main">{o.customer_name}</td>
                  <td>{o.product_name} × {o.quantity}</td>
                  <td className="right num" style={{ fontWeight: 700 }}>{rs(o.total_price)}</td>
                  <td className="cell-sub">{String(o.deleted_at).slice(0, 10)}</td>
                  <td><span className="pill pending">{daysLeft(o.deleted_at)} days</span></td>
                  <td className="right" style={{ whiteSpace: "nowrap" }}>
                    <button className="btn ghost sm" onClick={() => restore(o)}><Icon d={I.restore} size={15} />Restore</button>{" "}
                    <button className="btn danger sm" onClick={() => forever(o)}>Delete forever</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
