// Schéma de la fiche de disponibilité — mêmes codes d'antidotes que la plateforme ANTI-DOTES DZ.
export const SCHEMA = "antidotes-dz/disponibilite@1";
export const AB_IDS = ["atro","prali","nac","nalox","fluma","mblue","hydroxo","thio","fomep","ethanol","calc","gluca","digifab","vitk","prota","defer","pyrid","lipid","dantro","bal","charbon","sas","sav"];
const S = (v, n = 200) => String(v ?? "").trim().slice(0, n);
const lot = (l) => ({ q: Math.max(0, Math.min(1e6, Math.round(Number(l?.q) || 0))), u: S(l?.u, 20), lot: S(l?.lot, 60), exp: /^\d{4}-\d{2}-\d{2}$/.test(l?.exp) ? l.exp : "" });

export function normalize(d) {
  d = d && typeof d === "object" ? d : {};
  const e = d.etab || {}, p = d.pharm || {}, c = d.cert || {}, items = d.items || {};
  return {
    schema: SCHEMA,
    etab: { wil: /^\d{2}$/.test(e.wil) ? e.wil : "", type: S(e.type, 40), name: S(e.name, 160), code: S(e.code, 60) },
    pharm: { resp: S(p.resp, 120), fonction: S(p.fonction, 80), tel: S(p.tel, 40), email: S(p.email, 120), h24: S(p.h24, 20), urg: S(p.urg, 10) },
    items: Object.fromEntries(AB_IDS.map((id) => {
      const it = items[id] || {};
      return [id, { st: ["dispo", "rupture", "absent"].includes(it.st) ? it.st : "", pres: S(it.pres, 160),
        lots: Array.isArray(it.lots) ? it.lots.slice(0, 30).map(lot) : [], cmd: !!it.cmd, obs: S(it.obs, 300) }];
    })),
    extra: Array.isArray(d.extra) ? d.extra.slice(0, 30).map((x) => ({ name: S(x?.name, 120), pres: S(x?.pres, 160), ...lot(x) })) : [],
    cert: { name: S(c.name, 120), ok: !!c.ok },
  };
}
export function missing(n) {
  const m = [];
  if (!n.etab.wil || !n.etab.type || !n.etab.name) m.push("établissement");
  if (!n.pharm.resp || !n.pharm.tel) m.push("pharmacien responsable et téléphone");
  if (AB_IDS.some((id) => !n.items[id].st)) m.push("statut de chaque antidote");
  if (!n.cert.ok || !n.cert.name) m.push("certification");
  return m;
}
