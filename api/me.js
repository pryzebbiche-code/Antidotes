import { handler, currentUser, publicUser, HttpError } from "./_lib.js";
// Session en cours + paramètres utiles à l'écran de connexion.
export default handler(["GET"], async (req) => {
  const config = { registrationCode: !!process.env.REGISTRATION_CODE, requireApproval: process.env.REQUIRE_APPROVAL === "true" };
  try { return { user: publicUser(await currentUser(req)), config }; }
  catch (e) { if (e instanceof HttpError && e.status === 401) return { user: null, config }; throw e; }
});
