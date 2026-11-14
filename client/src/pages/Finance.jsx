import { useEffect, useState } from "react";
import { api, rs } from "../api.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mLabel = (m) => { const [y, mo] = m.split("-"); return `${MONTHS[Number(mo) - 1]} ${y}`; };

export default function Finance() {
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [sim, setSim] = useState({ ordersPerDay: 5, avgValue: 2500, marginPct: 30, growthPct: 5, days: 30 });
  useEffect(() => {
    api("/api/stats/overview").then(setStats).catch(() => {});
    api("/api/stats/monthly").then(setMonthly).catch(() => {});
  }, []);
  if (!stats) return <p style={{ color: "var(--muted)" }}>Loading finance...</p>;

  const projectedRevenue = sim.ordersPerDay * sim.avgValue * sim.days * (1 + sim.growthPct / 100);
  const projectedProfit = projectedRevenue * (sim.marginPct / 100);
  const projectedOrders = Math.round(sim.ordersPerDay * sim.days);
  const margin = stats.revenue ? Math.round((stats.profit / stats.revenue) * 100) : 0;
  const set = (k) => (e) => setSim({ ...sim, [k]: Number(e.target.value) || 0 });

  return (
    <>
      <div className="page-head"><div><h1>Finance</h1><p>Financial monitoring of your business — and a simulator for what comes next.</p></div></div>

      <div className="stats-grid">
        <div className="card stat-card"><div className="stat-label">Total revenue</div><div className="stat-value num">{rs(stats.revenue)}</div><div className="stat-note">Across {stats.orders_count} orders</div></div>
        <div className="card stat-card"><div className="stat-label">Total product cost</div><div className="stat-value num">{rs(stats.cost)}</div><div className="stat-note">What those sales cost you</div></div>
        <div className="card stat-card"><div className="stat-label">Gross profit</div><div className="stat-value num">{rs(stats.profit)}</div><div className="stat-note"><b>{margin}%</b> overall margin</div></div>
        <div className="card stat-card"><div className="stat-label">Money still to collect</div><div className="stat-value num">{rs(stats.unpaid_amount)}</div><div className="stat-note">Unpaid across {stats.unpaid_count} orders</div></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-pad" style={{ paddingBottom: 6 }}><h3 className="card-title">Monthly breakdown</h3><p className="card-sub">Revenue, cost and profit month by month. Cancelled orders excluded.</p></div>
        {monthly.length === 0 ? <div className="empty"><b>No data yet</b>Monthly finance will appear after your first orders.</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Month</th><th className="right">Orders</th><th className="right">Revenue</th><th className="right">Cost</th><th className="right">Profit</th><th className="right">Margin</th></tr></thead>
            <tbody>
              {monthly.map((m) => (
                <tr key={m.month}><td className="cell-main">{mLabel(m.month)}</td><td className="right num">{m.orders_count}</td><td className="right num" style={{ fontWeight: 600 }}>{rs(m.revenue)}</td><td className="right num">{rs(m.cost)}</td><td className="right num" style={{ color: "var(--green)", fontWeight: 600 }}>{rs(m.profit)}</td><td className="right num">{m.revenue ? Math.round((m.profit / m.revenue) * 100) : 0}%</td></tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      <div className="card card-pad">
        <h3 className="card-title">Revenue simulator</h3>
        <p className="card-sub">Play with the numbers — what happens to revenue and profit if sales grow? Nothing here changes your real records.</p>
        <div className="sim-grid">
          <div className="field"><label className="f">Expected orders per day</label><input type="number" min="0" value={sim.ordersPerDay} onChange={set("ordersPerDay")} /></div>
          <div className="field"><label className="f">Average order value (Rs)</label><input type="number" min="0" value={sim.avgValue} onChange={set("avgValue")} /></div>
          <div className="field"><label className="f">Profit margin (%)</label><input type="number" min="0" max="100" value={sim.marginPct} onChange={set("marginPct")} /></div>
          <div className="field"><label className="f">Growth boost (%)</label><input type="number" min="0" value={sim.growthPct} onChange={set("growthPct")} /></div>
        </div>
        <div className="sim-result">
          <div className="sim-card v"><div className="stat-label">Projected revenue · {sim.days} days</div><div className="stat-value num">{rs(projectedRevenue)}</div><div className="stat-note">From about {projectedOrders} orders</div></div>
          <div className="sim-card g"><div className="stat-label">Projected profit</div><div className="stat-value num">{rs(projectedProfit)}</div><div className="stat-note">At {sim.marginPct}% margin</div></div>
          <div className="sim-card p"><div className="stat-label">Projected per day</div><div className="stat-value num">{rs(projectedRevenue / Math.max(1, sim.days))}</div><div className="stat-note">Average daily revenue</div></div>
        </div>
      </div>
    </>
  );
}
