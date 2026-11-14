import { useEffect, useState } from "react";
import { api, getToken, setToken } from "./api.js";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import Orders from "./pages/Orders.jsx";
import Finance from "./pages/Finance.jsx";
import Trash from "./pages/Trash.jsx";

export const Icon = ({ d, size = 19 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
export const I = {
  grid: (<><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></>),
  box: (<><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></>),
  cart: (<><circle cx="9" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" /><path d="M2.5 3.5h2l2.6 12h10.9l2.4-9.5H6" /></>),
  chart: (<><path d="M3 3v18h18" /><path d="M8 16v-5" /><path d="M13 16V8" /><path d="M18 16v-8" /></>),
  trash: (<><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></>),
  plus: (<><path d="M12 5v14M5 12h14" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.8-3.8" /></>),
  download: (<><path d="M12 3v12" /><path d="M6.5 10.5L12 16l5.5-5.5" /><path d="M4 20h16" /></>),
  logout: (<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>),
  edit: (<><path d="M17 3a2.8 2.8 0 1 1 4 4L8 20l-5 1 1-5L17 3z" /></>),
  restore: (<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>),
  x: (<><path d="M18 6L6 18M6 6l12 12" /></>),
  image: (<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="M21 16l-5-5-9 9" /></>),
  wallet: (<><rect x="2.5" y="6" width="19" height="13" rx="2.5" /><path d="M2.5 10h19" /></>),
  alert: (<><path d="M12 3l10 17H2L12 3z" /><path d="M12 10v4M12 17.5v.5" /></>),
};

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: I.grid },
  { id: "products", label: "Products", icon: I.box },
  { id: "orders", label: "Orders", icon: I.cart },
  { id: "finance", label: "Finance", icon: I.chart },
  { id: "trash", label: "Trash", icon: I.trash },
];

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      setToken(data.token);
      onLogin(data.username);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark">BPRS</div>
        <h1>Welcome back</h1>
        <p>Sign in to your private business workspace.</p>
        {error && <div className="error">{error}</div>}
        <div className="field"><label className="f">Username</label><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoComplete="username" required /></div>
        <div className="field"><label className="f">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" required /></div>
        <button className="btn" style={{ width: "100%", justifyContent: "center", padding: "11px 18px" }} disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
        <p style={{ margin: "16px 0 0", fontSize: 12.5, textAlign: "center" }}>BPRS — Business Private Revenue Simulation.<br />Private software. Your data stays yours.</p>
      </form>
    </div>
  );
}

export default function App() {
  const [username, setUsername] = useState(null);
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [trashCount, setTrashCount] = useState(0);

  useEffect(() => {
    if (!getToken()) { setChecking(false); return; }
    api("/api/auth/me").then((d) => setUsername(d.username)).catch(() => {}).finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    if (!username) return;
    api("/api/orders/trash").then((rows) => setTrashCount(rows.length)).catch(() => {});
  }, [username, page]);

  if (checking) return null;
  if (!username) return <Login onLogin={setUsername} />;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">BPRS</div>
          <div><b>BPRS</b><span>Business Private Revenue Simulation</span></div>
        </div>
        <nav>
          {NAV.map((n) => (
            <button key={n.id} className={`nav-item ${page === n.id ? "active" : ""}`} onClick={() => setPage(n.id)}>
              <Icon d={n.icon} />{n.label}
              {n.id === "trash" && trashCount > 0 && <span className="nav-badge">{trashCount}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-chip">
            <div className="avatar">{username.slice(0, 1).toUpperCase()}</div>
            <div><b>{username}</b><span>Business owner</span></div>
            <button className="logout-btn" title="Sign out" onClick={() => { setToken(null); setUsername(null); }}><Icon d={I.logout} size={18} /></button>
          </div>
        </div>
      </aside>
      <main className="main">
        {page === "dashboard" && <Dashboard go={setPage} />}
        {page === "products" && <Products />}
        {page === "orders" && <Orders />}
        {page === "finance" && <Finance />}
        {page === "trash" && <Trash />}
      </main>
    </div>
  );
}
