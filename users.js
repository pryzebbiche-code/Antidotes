import bcrypt from "bcryptjs";
import { handler, body, db, currentUser, publicUser, HttpError, checkPassword, str, adminList } from "../_lib.js";

// GET : liste des comptes. POST : activer, désactiver, nommer/retirer administrateur, réinitialiser le mot de passe.
export default handler(["GET", "POST"], async (req) => {
  const me = await currentUser(req, { admin: true });
  const r = db();
  if (req.method === "GET") {
    const names = await r.smembers("users");
    const rows = names.length ? await r.mget(...names.map((n) => "user:" + n)) : [];
    return { users: rows.filter(Boolean).map(publicUser).sort((a, b) => a.username.localeCompare(b.username)) };
  }
  const b = body(req);
  const username = str(b.username, 40).toLowerCase();
  const u = await r.get("user:" + username);
  if (!u) throw new HttpError(404, "Compte introuvable.");
  if (username === me.username && ["disable", "remove-admin"].includes(b.action)) throw new HttpError(400, "Vous ne pouvez pas modifier votre propre accès.");
  switch (b.action) {
    case "activate": u.status = "active"; break;
    case "disable": u.status = "disabled"; break;
    case "make-admin": u.role = "admin"; break;
    case "remove-admin":
      if (adminList().includes(username)) throw new HttpError(400, "Ce compte est administrateur par la variable ADMIN_USERNAMES.");
      u.role = "pharmacien"; break;
    case "reset-password": checkPassword(b.password); u.hash = await bcrypt.hash(b.password, 10); break;
    default: throw new HttpError(400, "Action inconnue.");
  }
  await r.set("user:" + username, u);
  return { user: publicUser(u) };
});
