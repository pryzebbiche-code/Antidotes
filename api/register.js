import bcrypt from "bcryptjs";
import { handler, body, db, HttpError, USERNAME_RE, checkPassword, setSession, publicUser, adminList, rateLimit, clientIp, safeEqual, str } from "./_lib.js";

// Création de compte : identifiant + mot de passe (+ nom, téléphone, code d'inscription éventuel).
export default handler(["POST"], async (req, res) => {
  await rateLimit("reg:" + clientIp(req), 10, 3600);
  const b = body(req);
  const username = str(b.username, 40).toLowerCase();
  if (!USERNAME_RE.test(username)) throw new HttpError(400, "Identifiant : 3 à 32 caractères parmi a-z, 0-9, point, tiret et tiret bas.");
  checkPassword(b.password);
  const name = str(b.name, 120), phone = str(b.phone, 40);
  if (name.length < 3) throw new HttpError(400, "Indiquez votre nom et prénom.");
  const code = process.env.REGISTRATION_CODE;
  if (code && !safeEqual(str(b.code, 100), code)) throw new HttpError(403, "Code d'inscription incorrect.");
  const r = db();
  if (await r.get("user:" + username)) throw new HttpError(409, "Cet identifiant est déjà utilisé.");
  const isAdmin = adminList().includes(username);
  const status = process.env.REQUIRE_APPROVAL === "true" && !isAdmin ? "pending" : "active";
  const user = { username, name, phone, hash: await bcrypt.hash(b.password, 10), role: isAdmin ? "admin" : "pharmacien", status, createdAt: new Date().toISOString(), lastLogin: null };
  await r.set("user:" + username, user);
  await r.sadd("users", username);
  if (status === "active") { setSession(req, res, username); return { user: publicUser(user) }; }
  return { pending: true };
});
