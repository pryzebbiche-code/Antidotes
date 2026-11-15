import bcrypt from "bcryptjs";
import { handler, body, db, HttpError, USERNAME_RE, checkPassword, setSession, publicUser, adminList, rateLimit, clientIp, str } from "./_lib.js";

// Création de compte pharmacien : identifiant + mot de passe (+ nom, téléphone).
// Par défaut, le compte doit être activé par la coordination (REQUIRE_APPROVAL=false pour désactiver).
export default handler(["POST"], async (req, res) => {
  await rateLimit("reg:" + clientIp(req), 10, 3600);
  const b = body(req);
  const username = str(b.username, 40).toLowerCase();
  if (!USERNAME_RE.test(username)) throw new HttpError(400, "Identifiant : 3 à 32 caractères parmi a-z, 0-9, point, tiret et tiret bas.");
  if (adminList().includes(username)) throw new HttpError(409, "Cet identifiant est réservé.");
  checkPassword(b.password);
  const name = str(b.name, 120), phone = str(b.phone, 40);
  if (name.length < 3) throw new HttpError(400, "Indiquez votre nom et prénom.");
  const r = db();
  if (await r.get("user:" + username)) throw new HttpError(409, "Cet identifiant est déjà utilisé.");
  const status = process.env.REQUIRE_APPROVAL === "false" ? "active" : "pending";
  const user = { username, name, phone, hash: await bcrypt.hash(b.password, 10), role: "pharmacien", status, createdAt: new Date().toISOString(), lastLogin: null };
  await r.set("user:" + username, user);
  await r.sadd("users", username);
  if (status === "active") { setSession(req, res, username); return { user: publicUser(user) }; }
  return { pending: true };
});
