import bcrypt from "bcryptjs";
import { handler, body, db, HttpError, setSession, publicUser, rateLimit, clientIp, str } from "./_lib.js";

const FAKE = bcrypt.hashSync("adz-placeholder", 10); // égalise le temps de réponse quand le compte n'existe pas

export default handler(["POST"], async (req, res) => {
  const b = body(req);
  const username = str(b.username, 40).toLowerCase();
  await rateLimit("login-ip:" + clientIp(req), 30, 900);
  await rateLimit("login-u:" + username, 8, 900);
  const r = db();
  const u = username ? await r.get("user:" + username) : null;
  const ok = await bcrypt.compare(String(b.password || ""), u ? u.hash : FAKE);
  if (!u || !ok) throw new HttpError(401, "Identifiant ou mot de passe incorrect.");
  if (u.status === "pending") throw new HttpError(403, "Compte en attente d'activation par la coordination.");
  if (u.status !== "active") throw new HttpError(403, "Compte désactivé. Contactez la coordination.");
  u.lastLogin = new Date().toISOString();
  await r.set("user:" + username, u);
  setSession(req, res, username);
  return { user: publicUser(u) };
});
