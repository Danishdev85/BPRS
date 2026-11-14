import { useEffect, useState } from "react";
import { api, rs } from "../api.js";
import { Icon, I } from "../App.jsx";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mLabel = (m) => { const [y, mo] = m.split("-"); return `${MONTHS[Number(mo) - 1]} ${y.slice(2)}`; };

export default function Dashboard({ go }) {
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [top, setTop] = useState([]);
  useEffect(() => {
    api("/api/stats/overview").then(setStats).catch(() => {});
    api("/api/stats/monthly").then(setMonthly).catch(() => {});
    api("/api/stats/top-products").then(setTop).catch(() => {});
  }, []);
  if (!stats) return <p style={{ color: "var(--muted)" }}>Loading your business...</p>;
  const maxRev = Math.max(...monthly.map((m) => m.revenue), 1);
  const margin = stats.revenue ? Math.round((stats.profit / stats.revenue) * 100) : 0;

  return (
    <>
      <div className="page-head">
        <div><h1>Dashboard</h1><p>Your business at a glance — revenue, profit and orders.</p></div>
        <button className="btn" onClick={() => go("orders")}><Icon d={I.plus} size={17} />New order</button>
      </div>

      <div className="stats-grid">
        <div className="card stat-card"><div className="stat-label">Total revenue</div><div className="stat-value num">{rs(stats.revenue)}</div><div className="stat-note"><b>{rs(stats.last30_revenue)}</b> in the last 30 days</div></div>
        <div className="card stat-card"><div className="stat-label">Gross profit</div><div className="stat-value num">{rs(stats.profit)}</div><div className="stat-note"><b>{margin}%</b> margin after product cost</div></div>
        <div className="card stat-card"><div className="stat-label">Orders</div><div className="stat-value num">{stats.orders_count}</div><div className="stat-note"><b>{stats.pending_orders}</b> waiting to be fulfilled</div></div>
        <div className="card stat-card"><div className="stat-label">Avg. order value</div><div className="stat-value num">{rs(stats.avg_order_value)}</div><div className="stat-note"><b>{rs(stats.unpaid_amount)}</b> unpaid across {stats.unpaid_count} orders</div></div>
      </div>

      <div className="grid-2">
        <div className="card card-pad">
          <h3 className="card-title">Revenue — last 6 months</h3>
          <p className="card-sub">Monthly sales across all channels, cancelled orders excluded.</p>
          {monthly.length === 0 ? <div className="empty"><b>No sales yet</b>Your monthly revenue chart will appear here.</div> : (
            <div className="bars">
              {monthly.map((m) => (
                <div className="bar-col" key={m.month}>
                  <span className="bar-val num">{rs(m.revenue)}</span>
                  <div className="bar" style={{ height: `${Math.max(4, (m.revenue / maxRev) * 120)}px` }} title={`${mLabel(m.month)} — ${rs(m.revenue)}`}></div>
                  <span className="bar-lab">{mLabel(m.month)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card card-pad">
          <h3 className="card-title">Top products</h3>
          <p className="card-sub">Best sellers by revenue.</p>
          {top.length === 0 ? <div className="empty"><b>Nothing here yet</b>Top products will appear after your first orders.</div> :
            top.map((t, i) => (
              <div key={t.product_name} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i < top.length - 1 ? "1px solid var(--border)" : "0" }}>
                <div><div className="cell-main">{t.product_name}</div><div className="cell-sub">{t.units} units · {t.orders_count} orders</div></div>
                <div className="num" style={{ fontWeight: 700 }}>{rs(t.revenue)}</div>
              </div>
            ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-pad" style={{ paddingBottom: 8 }}><h3 className="card-title">Recent orders</h3><p className="card-sub">The latest activity in your store.</p></div>
          {stats.recent_orders.length === 0 ? <div className="empty"><b>No orders yet</b>Add your first order from the Orders page.</div> : (
            <div className="table-wrap"><table><tbody>
              {stats.recent_orders.map((o) => (
                <tr key={o.id}>
                  <td><div className="cell-main">{o.order_ref}</div><div className="cell-sub">{o.order_date}</div></td>
                  <td><div className="cell-main">{o.customer_name}</div><div className="cell-sub">{o.product_name} × {o.quantity}</div></td>
                  <td><span className={`pill ${o.status}`}>{o.status}</span></td>
                  <td className="right num" style={{ fontWeight: 700 }}>{rs(o.total_price)}</td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </div>
        <div className="card card-pad">
          <h3 className="card-title">Low stock watch</h3>
          <p className="card-sub">Products at 5 units or less.</p>
          {stats.low_stock.length === 0 ? <div className="empty"><b>Stock looks healthy</b>No product is running low right now.</div> :
            stats.low_stock.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                <div><div className="cell-main">{p.name}</div><div className="cell-sub">{p.category}</div></div>
                <span className="pill pending">{p.stock} left</span>
              </div>
            ))}
          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button className="btn ghost sm" onClick={() => go("products")}>Manage products</button>
            <button className="btn ghost sm" onClick={() => go("finance")}>Open finance</button>
          </div>
        </div>
      </div>
    </>
  );
}
