import { handler, clearSession } from "./_lib.js";
export default handler(["POST"], async (req, res) => { clearSession(res); return { ok: true }; });
