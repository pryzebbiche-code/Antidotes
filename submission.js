import { handler, body, db, currentUser, HttpError } from "./_lib.js";
import { normalize, missing } from "./_schema.js";

// GET : la fiche du compte connecté. POST : transmettre une nouvelle version.
export default handler(["GET", "POST"], async (req) => {
  const u = await currentUser(req);
  const r = db();
  const key = "sub:" + u.username;
  if (req.method === "GET") return { submission: await r.get(key) };
  const raw = body(req).data;
  if (JSON.stringify(raw || {}).length > 200000) throw new HttpError(413, "Fiche trop volumineuse.");
  const n = normalize(raw);
  const m = missing(n);
  if (m.length) throw new HttpError(400, "Fiche incomplète : " + m.join(", ") + ".");
  const prev = await r.get(key);
  const sub = { ...n, owner: u.username, submittedAt: new Date().toISOString(), version: (prev?.version || 0) + 1 };
  await r.set(key, sub);
  await r.sadd("subs", u.username);
  await r.lpush("hist:" + u.username, sub);
  await r.ltrim("hist:" + u.username, 0, 19);
  return { submission: sub };
});
