import bcrypt from "bcryptjs";
import { handler, body, db, currentUser, checkPassword, HttpError, rateLimit } from "./_lib.js";
export default handler(["POST"], async (req) => {
  const u = await currentUser(req);
  await rateLimit("pwd:" + u.username, 8, 900);
  const b = body(req);
  if (!(await bcrypt.compare(String(b.current || ""), u.hash))) throw new HttpError(400, "Mot de passe actuel incorrect.");
  checkPassword(b.next);
  u.hash = await bcrypt.hash(b.next, 10);
  await db().set("user:" + u.username, u);
  return { ok: true };
});
