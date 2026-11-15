import { handler, db, currentUser } from "../_lib.js";
// Toutes les fiches transmises (coordination uniquement).
export default handler(["GET"], async (req) => {
  await currentUser(req, { admin: true });
  const r = db();
  const names = await r.smembers("subs");
  if (!names.length) return { submissions: [] };
  const rows = await r.mget(...names.map((n) => "sub:" + n));
  return { submissions: rows.filter(Boolean) };
});
