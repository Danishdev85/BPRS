import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Sign in required" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "bprs-local-dev-secret");
    next();
  } catch {
    return res.status(401).json({ error: "Session expired, sign in again" });
  }
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET || "bprs-local-dev-secret",
    { expiresIn: "7d" }
  );
}
