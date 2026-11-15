import bcrypt from "bcryptjs";
import { handler, body, db, HttpError, setSession, publicUser, rateLimit, clientIp, str, adminList, roleOf, safeEqual } from "./_lib.js";

const FAKE = bcrypt.hashSync("adz-placeholder", 10); // égalise le temps de réponse quand le compte n'existe pas

// Connexion. `admin: true` = connexion depuis l'espace coordination (réservée aux administrateurs).
// Premier accès d'un administrateur : si l'identifiant figure dans ADMIN_USERNAMES et que le mot de passe
// est égal à ADMIN_PASSWORD, le compte est créé automatiquement (il peut ensuite changer son mot de passe).
export default handler(["POST"], async (req, res) => {
  const b = body(req);
  const username = str(b.username, 40).toLowerCase();
  const password = String(b.password || "");
  await rateLimit("login-ip:" + clientIp(req), 30, 900);
  await rateLimit("login-u:" + username, 8, 900);
  const r = db();
  let u = username ? await r.get("user:" + username) : null;

  if (!u && adminList().includes(username) && process.env.ADMIN_PASSWORD && safeEqual(password, process.env.ADMIN_PASSWORD)) {
    u = { username, name: "Coordination — Centre Antipoison", phone: "", hash: await bcrypt.hash(password, 10), role: "admin", status: "active", createdAt: new Date().toISOString(), lastLogin: null };
    await r.set("user:" + username, u);
    await r.sadd("users", username);
  } else {
    const ok = await bcrypt.compare(password, u ? u.hash : FAKE);
    if (!u || !ok) throw new HttpError(401, "Identifiant ou mot de passe incorrect.");
  }
  if (b.admin && roleOf(u) !== "admin") throw new HttpError(403, "Ce compte n'a pas accès à l'espace coordination. Utilisez l'onglet « Se connecter ».");
  if (u.status === "pending") throw new HttpError(403, "Compte en attente d'activation par la coordination.");
  if (u.status !== "active") throw new HttpError(403, "Compte désactivé. Contactez la coordination.");
  u.lastLogin = new Date().toISOString();
  await r.set("user:" + username, u);
  setSession(req, res, username);
  return { user: publicUser(u) };
});
