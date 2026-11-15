"use strict";
/* ANTI-DOTES DZ — saisie de la disponibilité des antidotes (pharmacies hospitalières).
   Mêmes codes d'antidotes que la plateforme nationale. */

const SCHEMA = "antidotes-dz/disponibilite@1";
const AB = [
  ["atro","Atropine (sulfate)","Organophosphorés, carbamates","Solution injectable 1 mg/mL, ampoule","amp."],
  ["prali","Pralidoxime","Organophosphorés","Poudre pour solution injectable, flacon","fl."],
  ["nac","Acétylcystéine IV","Paracétamol","Solution injectable 5 g/25 mL, flacon","fl."],
  ["nalox","Naloxone","Opioïdes","Solution injectable 0,4 mg/mL, ampoule","amp."],
  ["fluma","Flumazénil","Benzodiazépines","Solution injectable 0,5 mg/5 mL, ampoule","amp."],
  ["mblue","Bleu de méthylène","Méthémoglobinémies","Solution injectable 10 mg/mL, ampoule","amp."],
  ["hydroxo","Hydroxocobalamine","Cyanures, fumées d'incendie","Kit 5 g poudre pour perfusion","kit"],
  ["thio","Thiosulfate de sodium","Cyanures","Solution injectable 25 %, flacon","fl."],
  ["fomep","Fomépizole","Méthanol, éthylène glycol","Solution à diluer 5 mg/mL, flacon","fl."],
  ["ethanol","Éthanol (usage antidote)","Méthanol, éthylène glycol","Solution pour perfusion, flacon","fl."],
  ["calc","Gluconate de calcium","Inhibiteurs calciques, fluorures","Solution injectable 10 %, ampoule 10 mL","amp."],
  ["gluca","Glucagon","Bêtabloquants, inhibiteurs calciques","Poudre et solvant 1 mg","fl."],
  ["digifab","Fragments Fab antidigoxine","Digitaliques","Poudre pour perfusion, flacon","fl."],
  ["vitk","Vitamine K1 (phytoménadione)","Antivitamines K, rodenticides","Solution injectable 10 mg/mL, ampoule","amp."],
  ["prota","Protamine (sulfate)","Héparines","Solution injectable, ampoule","amp."],
  ["defer","Déféroxamine","Fer","Poudre pour solution injectable 500 mg, flacon","fl."],
  ["pyrid","Pyridoxine (vitamine B6)","Isoniazide","Solution injectable, ampoule","amp."],
  ["lipid","Émulsion lipidique 20 %","Anesthésiques locaux","Émulsion pour perfusion, poche","poche"],
  ["dantro","Dantrolène","Hyperthermie maligne","Poudre 20 mg, flacon","fl."],
  ["bal","Dimercaprol (BAL)","Arsenic, plomb, mercure","Solution injectable, ampoule","amp."],
  ["charbon","Charbon activé","Décontamination digestive","Suspension buvable 50 g, flacon","fl."],
  ["sas","Sérum antiscorpionique","Envenimation scorpionique","Solution injectable, ampoule","amp."],
  ["sav","Sérum antivenimeux (vipéridés)","Morsures de vipère","Solution injectable, flacon","fl."]
].map(r => ({ id: r[0], dci: r[1], ind: r[2], pres: r[3], unit: r[4] }));
const ABM = Object.fromEntries(AB.map(a => [a.id, a]));
const UNITS = ["amp.","fl.","kit","poche","boîte","seringue","g","autre"];
const WIL = ["Adrar","Chlef","Laghouat","Oum El Bouaghi","Batna","Béjaïa","Biskra","Béchar","Blida","Bouira","Tamanrasset","Tébessa","Tlemcen","Tiaret","Tizi Ouzou","Alger","Djelfa","Jijel","Sétif","Saïda","Skikda","Sidi Bel Abbès","Annaba","Guelma","Constantine","Médéa","Mostaganem","M'Sila","Mascara","Ouargla","Oran","El Bayadh","Illizi","Bordj Bou Arréridj","Boumerdès","El Tarf","Tindouf","Tissemsilt","El Oued","Khenchela","Souk Ahras","Tipaza","Mila","Aïn Defla","Naâma","Aïn Témouchent","Ghardaïa","Relizane","Timimoun","Bordj Badji Mokhtar","Ouled Djellal","Béni Abbès","In Salah","In Guezzam","Touggourt","Djanet","El M'Ghair","El Meniaa"].map((n, i) => ({ c: String(i + 1).padStart(2, "0"), n }));
const WILM = Object.fromEntries(WIL.map(w => [w.c, w.n]));
const TYPES = ["CHU","EHU","EH","EPH","EHS","EPSP","Établissement privé","Autre"];
const FONCTIONS = ["Pharmacien chef de service","Pharmacien assistant","Pharmacien praticien","Pharmacien résident","Autre"];
const STL = { dispo: "Disponible", rupture: "Rupture", absent: "Non détenu" };

/* ---------------- utilitaires ---------------- */
const DAY = 864e5;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const monthsTo = s => (Date.parse(s) - Date.now()) / (30.44 * DAY);
const fdate = ts => ts ? new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fdt = ts => ts ? new Date(ts).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmt = n => Number(n || 0).toLocaleString("fr-FR");
const slug = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const etabKey = d => d.etab.code ? slug(d.etab.code) : `${d.etab.wil || "00"}-${slug(d.etab.type)}-${slug(d.etab.name)}`;
function toast(s) { const el = $("toast"); el.textContent = s; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 4000); }
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

async function api(path, opts = {}) {
  const init = { method: opts.method || "GET", credentials: "same-origin", headers: { "X-Requested-With": "adz" } };
  if (opts.body) { init.method = opts.method || "POST"; init.headers["Content-Type"] = "application/json"; init.body = JSON.stringify(opts.body); }
  let res;
  try { res = await fetch(path, init); } catch (e) { throw new Error("Serveur injoignable. Vérifiez votre connexion internet."); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && S.user && path !== "/api/me") { S.user = null; S.authMsg = data.error || "Session expirée. Reconnectez-vous."; render(); }
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

function blank() {
  return { schema: SCHEMA, etab: { wil: "", type: "", name: "", code: "" }, pharm: { resp: "", fonction: "", tel: "", email: "", h24: "", urg: "" },
    items: Object.fromEntries(AB.map(a => [a.id, { st: "", pres: "", lots: [], cmd: false, obs: "" }])), extra: [], cert: { name: "", ok: false },
    submittedAt: null, version: 0, updatedAt: null };
}
function normalize(d) {
  const b = blank(); if (!d || typeof d !== "object") return b;
  const o = { ...b, ...d, etab: { ...b.etab, ...(d.etab || {}) }, pharm: { ...b.pharm, ...(d.pharm || {}) }, cert: { ...b.cert, ...(d.cert || {}) } };
  o.items = {};
  AB.forEach(a => { const it = (d.items || {})[a.id] || {};
    o.items[a.id] = { st: ["dispo","rupture","absent"].includes(it.st) ? it.st : "", pres: String(it.pres || ""), lots: Array.isArray(it.lots) ? it.lots.map(l => ({ q: Number(l.q) || 0, u: String(l.u || a.unit), lot: String(l.lot || ""), exp: String(l.exp || "") })) : [], cmd: !!it.cmd, obs: String(it.obs || "") }; });
  o.extra = Array.isArray(d.extra) ? d.extra.map(x => ({ name: String(x.name || ""), pres: String(x.pres || ""), q: Number(x.q) || 0, u: String(x.u || "amp."), lot: String(x.lot || ""), exp: String(x.exp || "") })) : [];
  return o;
}

/* ---------------- état ---------------- */
const S = { user: null, config: {}, authTab: "login", authMsg: "", authErr: "", tab: "fiche", F: blank(), filter: "", onlyTodo: false, showErr: false, result: null,
  subs: null, users: null, loading: false };
const draftKey = () => "adz_fiche_" + (S.user ? S.user.username : "anon");

function counts(F) {
  const it = Object.values(F.items); const lots = it.filter(x => x.st === "dispo").flatMap(x => x.lots);
  return { done: it.filter(x => x.st).length, total: AB.length, dispo: it.filter(x => x.st === "dispo").length, rupture: it.filter(x => x.st === "rupture").length, absent: it.filter(x => x.st === "absent").length,
    exp3: lots.filter(l => l.exp && monthsTo(l.exp) > 0 && monthsTo(l.exp) <= 3).length, units: lots.reduce((s, l) => s + (Number(l.q) || 0), 0) };
}
function validate(F) {
  const e = []; const E = F.etab, P = F.pharm;
  if (!E.wil) e.push("Wilaya de l'établissement"); if (!E.type) e.push("Type d'établissement"); if (!E.name.trim()) e.push("Nom de l'établissement");
  if (!P.resp.trim()) e.push("Nom du pharmacien responsable"); if (!P.tel.trim()) e.push("Téléphone de la pharmacie");
  AB.forEach(a => { const it = F.items[a.id]; if (!it.st) { e.push(`${a.dci} : statut non renseigné`); return; }
    if (it.st === "dispo") { if (!it.lots.length) e.push(`${a.dci} : ajoutez au moins un lot`);
      it.lots.forEach((l, i) => { if (!(l.q > 0)) e.push(`${a.dci}, lot ${i + 1} : quantité manquante`); if (!l.exp) e.push(`${a.dci}, lot ${i + 1} : date de péremption manquante`); else if (monthsTo(l.exp) <= 0) e.push(`${a.dci}, lot ${i + 1} : lot périmé, à retirer du stock disponible`); }); } });
  F.extra.forEach((x, i) => { if (!x.name.trim()) e.push(`Autre antidote ${i + 1} : nom manquant`); });
  if (!F.cert.name.trim() || !F.cert.ok) e.push("Certification (nom et case à cocher)");
  return e;
}

/* ---------------- rendu ---------------- */
function render() {
  const tabs = $("tabs"), ub = $("userbox");
  if (!S.user) { tabs.innerHTML = ""; ub.innerHTML = ""; $("app").innerHTML = authView(); return; }
  const t = [["fiche", "Ma fiche"], ["compte", "Mon compte"]];
  if (S.user.role === "admin") t.push(["cons", "Consolidation"], ["comptes", "Comptes"]);
  tabs.innerHTML = t.map(([k, l]) => `<button role="tab" aria-selected="${S.tab === k}" data-act="tab" data-v="${k}">${l}</button>`).join("");
  ub.innerHTML = `<span class="who"><b>${esc(S.user.name)}</b><br>${esc(S.user.username)} · ${S.user.role === "admin" ? "coordination" : "pharmacien"}</span><button class="btn sm" data-act="logout">Se déconnecter</button>`;
  $("app").innerHTML = `<div class="wrap">${S.tab === "cons" ? consView() : S.tab === "comptes" ? usersView() : S.tab === "compte" ? accountView() : ficheView()}</div>`;
}

/* ----- connexion / création de compte ----- */
function authView() {
  const c = S.config || {};
  const login = `<form class="stack" data-form="login" autocomplete="on">
    <div class="f"><label for="l_u">Identifiant</label><input class="inp" id="l_u" name="username" autocomplete="username" required autocapitalize="none" spellcheck="false"></div>
    <div class="f"><label for="l_p">Mot de passe</label><input class="inp" id="l_p" name="password" type="password" autocomplete="current-password" required></div>
    <button class="btn pri" type="submit" style="justify-content:center">Se connecter</button></form>`;
  const reg = `<form class="stack" data-form="register" autocomplete="on">
    <div class="f"><label class="req" for="r_u">Identifiant</label><input class="inp" id="r_u" name="username" autocomplete="username" required minlength="3" maxlength="32" pattern="[a-z0-9._\\-]{3,32}" autocapitalize="none" spellcheck="false" placeholder="ex. pharm.chu-blida"><span class="hint">3 à 32 caractères : lettres minuscules, chiffres, point, tiret.</span></div>
    <div class="f"><label class="req" for="r_n">Nom et prénom</label><input class="inp" id="r_n" name="name" autocomplete="name" required></div>
    <div class="f"><label for="r_t">Téléphone</label><input class="inp" id="r_t" name="phone" type="tel" autocomplete="tel"></div>
    <div class="f"><label class="req" for="r_p">Mot de passe</label><input class="inp" id="r_p" name="password" type="password" autocomplete="new-password" required minlength="8"><span class="hint">8 caractères minimum, avec au moins une lettre et un chiffre.</span></div>
    <div class="f"><label class="req" for="r_c">Confirmer le mot de passe</label><input class="inp" id="r_c" name="confirm" type="password" autocomplete="new-password" required minlength="8"></div>
    ${c.registrationCode ? `<div class="f"><label class="req" for="r_k">Code d'inscription</label><input class="inp" id="r_k" name="code" required autocomplete="off"><span class="hint">Communiqué par le Centre Antipoison ou votre coordination régionale.</span></div>` : ""}
    <button class="btn pri" type="submit" style="justify-content:center">Créer mon compte</button>
    ${c.requireApproval ? `<p class="hint" style="margin:0">Votre compte sera activé par la coordination avant la première connexion.</p>` : ""}</form>`;
  return `<div class="auth"><section class="pitch"><span class="step">Recensement national</span><h1>ANTI-DOTES DZ</h1>
    <p>Indiquez quels antidotes sont disponibles dans votre établissement, avec leurs lots et dates de péremption. Ces informations permettront au Centre Antipoison de localiser rapidement un antidote lors d'une urgence toxicologique.</p>
    <ul><li>Un compte par pharmacie hospitalière, créé avec un identifiant et un mot de passe.</li><li>Chaque pharmacien ne voit et ne modifie que la fiche de son établissement.</li><li>Aucune donnée patient n'est collectée.</li><li>Mise à jour attendue à chaque mouvement important, et au moins une fois par mois.</li></ul></section>
    <section class="panel"><div class="authtabs" role="tablist"><button role="tab" aria-selected="${S.authTab === "login"}" data-act="authTab" data-v="login">Se connecter</button><button role="tab" aria-selected="${S.authTab === "register"}" data-act="authTab" data-v="register">Créer un compte</button></div>
    ${S.authMsg ? `<div class="info" role="status" style="margin-bottom:12px">${esc(S.authMsg)}</div>` : ""}${S.authErr ? `<div class="err" role="alert" style="margin-bottom:12px">${esc(S.authErr)}</div>` : ""}
    ${S.authTab === "login" ? login : reg}</section></div>`;
}

/* ----- fiche pharmacien ----- */
function sel(name, opts, val, ph) { return `<select class="sel" id="${name.replace(/\./g, "_")}" data-k="${name}">${ph ? `<option value="">${ph}</option>` : ""}${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(val) === String(v) ? "selected" : ""}>${esc(l)}</option>`; }).join("")}</select>`; }
function inp(name, val, attrs = "") { return `<input class="inp" id="${name.replace(/\./g, "_")}" data-k="${name}" value="${esc(val)}" ${attrs}>`; }
function progressBar() {
  const c = counts(S.F); const pct = Math.round(c.done / c.total * 100);
  return `<div class="prog" id="prog"><b class="num">${c.done}/${c.total}</b><span class="small muted">antidotes renseignés</span><div class="bar"><span style="width:${pct}%"></span></div><span class="chip ok"><i></i>${c.dispo} disponibles</span><span class="chip crit"><i></i>${c.rupture} en rupture</span><span class="chip off"><i></i>${c.absent} non détenus</span><span class="small muted">${S.F.updatedAt ? "Brouillon enregistré sur cet appareil" : ""}</span></div>`;
}
function totalTxt(id) { const by = {}; S.F.items[id].lots.forEach(l => { if (l.q > 0) by[l.u] = (by[l.u] || 0) + Number(l.q); }); const s = Object.entries(by).map(([u, q]) => `${fmt(q)} ${u}`).join(" + "); return s ? `Total : ${s}` : ""; }
function abCard(a) {
  const it = S.F.items[a.id];
  const lots = it.st === "dispo" ? `<div class="body"><div class="f"><label for="pres_${a.id}">Nom commercial et présentation détenus</label><input class="inp" id="pres_${a.id}" data-ab="${a.id}" data-f="pres" value="${esc(it.pres)}" placeholder="${esc(a.pres)}"></div>
    <div class="tw"><table class="lots"><thead><tr><th>Quantité</th><th>Unité</th><th>N° de lot</th><th>Péremption</th><th></th></tr></thead><tbody>${it.lots.map((l, i) => { const m = l.exp ? monthsTo(l.exp) : null; return `<tr><td style="min-width:90px"><input class="inp num${S.showErr && !(l.q > 0) ? " bad" : ""}" type="number" min="0" step="1" inputmode="numeric" aria-label="Quantité lot ${i + 1}" data-ab="${a.id}" data-i="${i}" data-f="q" value="${l.q || ""}"></td><td style="min-width:90px"><select class="sel" aria-label="Unité lot ${i + 1}" data-ab="${a.id}" data-i="${i}" data-f="u">${UNITS.map(u => `<option ${u === l.u ? "selected" : ""}>${u}</option>`).join("")}</select></td><td style="min-width:120px"><input class="inp" aria-label="Numéro de lot ${i + 1}" data-ab="${a.id}" data-i="${i}" data-f="lot" value="${esc(l.lot)}"></td><td style="min-width:150px"><input class="inp${(S.showErr && !l.exp) || (m !== null && m <= 0) ? " bad" : ""}" type="date" aria-label="Péremption lot ${i + 1}" data-ab="${a.id}" data-i="${i}" data-f="exp" value="${esc(l.exp)}">${m !== null && m <= 0 ? `<div class="errline">Lot périmé</div>` : m !== null && m <= 3 ? `<div class="warnline">Péremption dans moins de 3 mois</div>` : m !== null && m <= 6 ? `<div class="warnline">Péremption dans moins de 6 mois</div>` : ""}</td><td><button class="btn sm" data-act="delLot" data-ab="${a.id}" data-i="${i}" aria-label="Supprimer le lot ${i + 1}">Retirer</button></td></tr>`; }).join("")}</tbody></table></div>
    <div class="row"><button class="btn sm" data-act="addLot" data-ab="${a.id}">+ Ajouter un lot</button><span class="total" id="tot_${a.id}">${totalTxt(a.id)}</span></div>
    <div class="f"><label for="obs_${a.id}">Observation (facultatif)</label><input class="inp" id="obs_${a.id}" data-ab="${a.id}" data-f="obs" value="${esc(it.obs)}" placeholder="ex. conservation au réfrigérateur du service des urgences"></div></div>`
    : it.st === "rupture" ? `<div class="body"><label class="row small"><input type="checkbox" data-ab="${a.id}" data-f="cmd" ${it.cmd ? "checked" : ""}> Commande en cours auprès du fournisseur (PCH ou autre)</label><div class="f"><label for="obs_${a.id}">Observation (facultatif)</label><input class="inp" id="obs_${a.id}" data-ab="${a.id}" data-f="obs" value="${esc(it.obs)}" placeholder="ex. rupture depuis mars, besoin estimé 10 ampoules"></div></div>` : "";
  return `<div class="ab st-${it.st}"><div><h3>${esc(a.dci)}</h3><div class="meta">${esc(a.ind)} · référence : ${esc(a.pres)}</div>${S.showErr && !it.st ? `<div class="errline">Choisissez un statut</div>` : ""}</div>
   <div class="seg" role="group" aria-label="Statut ${esc(a.dci)}">${["dispo","rupture","absent"].map(k => `<button class="${k}" aria-pressed="${it.st === k}" data-act="st" data-ab="${a.id}" data-v="${k}">${STL[k]}</button>`).join("")}</div>${lots}</div>`;
}
function ficheView() {
  const F = S.F, E = F.etab, P = F.pharm; const errs = validate(F); const c = counts(F);
  const q = S.filter.trim().toLowerCase(); const list = AB.filter(a => (!q || (a.dci + " " + a.ind).toLowerCase().includes(q)) && (!S.onlyTodo || !F.items[a.id].st));
  const res = S.result ? `<section class="okbox" role="status"><h2>Fiche transmise</h2><p style="margin:6px 0 0">Version ${S.result.version} enregistrée le ${fdt(S.result.submittedAt)}. La coordination la voit immédiatement. Revenez la mettre à jour à chaque mouvement important.</p><div class="row" style="margin-top:10px"><button class="btn sm" data-act="exportOne">Télécharger une copie</button><button class="btn sm" data-act="closeRes">Fermer</button></div></section>` : "";
  return `<section class="panel intro"><div><span class="step">Recensement national</span><h1>Antidotes disponibles dans votre établissement</h1><p>Ces informations alimentent la plateforme nationale ANTI-DOTES DZ : lors d'une urgence toxicologique, le Centre Antipoison saura où trouver l'antidote nécessaire. Comptez 10 à 15 minutes, l'inventaire en main.</p></div>
   <div><ol><li>Identifiez votre établissement et la pharmacie.</li><li>Pour chacun des ${AB.length} antidotes : disponible, en rupture ou non détenu. Pour un antidote disponible, saisissez chaque lot.</li><li>Certifiez et transmettez. Mettez à jour à chaque mouvement important et au moins une fois par mois.</li></ol><div class="row" style="margin-top:10px">${F.submittedAt ? `<span class="chip brand"><i></i>Dernière transmission : ${fdate(F.submittedAt)} (v${F.version})</span>` : `<span class="chip off"><i></i>Aucune transmission pour l'instant</span>`}</div></div></section>
  ${res}${progressBar()}
  <section class="panel"><div class="ph"><div><span class="step">Étape 1</span><h2>Établissement et pharmacie</h2></div></div><div class="form">
    <div class="f"><label class="req" for="etab_wil">Wilaya</label>${sel("etab.wil", WIL.map(w => [w.c, `${w.c} — ${w.n}`]), E.wil, "Choisir…")}</div>
    <div class="f"><label class="req" for="etab_type">Type d'établissement</label>${sel("etab.type", TYPES, E.type, "Choisir…")}</div>
    <div class="f wide"><label class="req" for="etab_name">Nom de l'établissement</label>${inp("etab.name", E.name, 'placeholder="ex. CHU Mustapha Pacha" autocomplete="organization"')}</div>
    <div class="f"><label for="etab_code">Code établissement (si attribué)</label>${inp("etab.code", E.code, 'placeholder="code ministériel ou interne"')}</div>
    <div class="f"><label class="req" for="pharm_resp">Pharmacien responsable</label>${inp("pharm.resp", P.resp, 'autocomplete="name"')}</div>
    <div class="f"><label for="pharm_fonction">Fonction</label>${sel("pharm.fonction", FONCTIONS, P.fonction, "Choisir…")}</div>
    <div class="f"><label class="req" for="pharm_tel">Téléphone de la pharmacie (garde)</label>${inp("pharm.tel", P.tel, 'type="tel" inputmode="tel" placeholder="0XX XX XX XX"')}</div>
    <div class="f"><label for="pharm_email">E-mail professionnel</label>${inp("pharm.email", P.email, 'type="email" autocomplete="email"')}</div>
    <div class="f"><label for="pharm_h24">Pharmacie accessible 24 h/24</label>${sel("pharm.h24", [["oui","Oui, présence permanente"],["astreinte","Oui, par astreinte"],["non","Non"]], P.h24, "Choisir…")}</div>
    <div class="f"><label for="pharm_urg">Service d'urgences dans l'établissement</label>${sel("pharm.urg", [["oui","Oui"],["non","Non"]], P.urg, "Choisir…")}</div></div></section>
  <section class="panel"><div class="ph"><div><span class="step">Étape 2</span><h2>Disponibilité des antidotes</h2></div><span class="small muted">Liste de référence de la plateforme, à compléter si besoin</span></div>
   <div class="tools"><input class="inp" type="search" id="flt" placeholder="Rechercher un antidote ou un toxique" value="${esc(S.filter)}" aria-label="Rechercher"><label class="row small"><input type="checkbox" id="todo" ${S.onlyTodo ? "checked" : ""}> Non renseignés uniquement</label><button class="btn sm" data-act="restAbsent">Marquer le reste « non détenu »</button></div>
   <div class="abl">${list.map(abCard).join("") || `<div class="empty">Aucun antidote ne correspond.</div>`}</div>
   <div style="margin-top:16px"><h3 style="margin-bottom:8px">Autres antidotes détenus (hors liste)</h3>${F.extra.length ? `<div class="tw"><table class="lots"><thead><tr><th>Antidote (DCI)</th><th>Présentation</th><th>Quantité</th><th>Unité</th><th>N° de lot</th><th>Péremption</th><th></th></tr></thead><tbody>${F.extra.map((x, i) => `<tr><td style="min-width:160px"><input class="inp" aria-label="Nom" data-x="${i}" data-f="name" value="${esc(x.name)}"></td><td style="min-width:150px"><input class="inp" aria-label="Présentation" data-x="${i}" data-f="pres" value="${esc(x.pres)}"></td><td style="min-width:80px"><input class="inp num" type="number" min="0" aria-label="Quantité" data-x="${i}" data-f="q" value="${x.q || ""}"></td><td style="min-width:90px"><select class="sel" aria-label="Unité" data-x="${i}" data-f="u">${UNITS.map(u => `<option ${u === x.u ? "selected" : ""}>${u}</option>`).join("")}</select></td><td style="min-width:110px"><input class="inp" aria-label="Lot" data-x="${i}" data-f="lot" value="${esc(x.lot)}"></td><td style="min-width:150px"><input class="inp" type="date" aria-label="Péremption" data-x="${i}" data-f="exp" value="${esc(x.exp)}"></td><td><button class="btn sm" data-act="delExtra" data-i="${i}">Retirer</button></td></tr>`).join("")}</tbody></table></div>` : ""}<button class="btn sm" data-act="addExtra" style="margin-top:8px">+ Ajouter un antidote hors liste</button></div></section>
  <section class="panel"><div class="ph"><div><span class="step">Étape 3</span><h2>Vérification et transmission</h2></div></div>
   <div class="sum"><div><b>${c.dispo}</b><span>antidotes disponibles</span></div><div><b>${c.rupture}</b><span>en rupture</span></div><div><b>${c.absent}</b><span>non détenus</span></div><div><b>${fmt(c.units)}</b><span>unités en stock</span></div><div><b style="color:${c.exp3 ? "var(--warn)" : "inherit"}">${c.exp3}</b><span>lots périmant sous 3 mois</span></div></div>
   <div class="form" style="margin-top:14px"><div class="f"><label class="req" for="cert_name">Nom du pharmacien qui certifie</label>${inp("cert.name", F.cert.name)}</div><div class="f wide"><label class="row" style="color:var(--ink)"><input type="checkbox" data-k="cert.ok" ${F.cert.ok ? "checked" : ""}> Je certifie que ces informations reflètent l'inventaire physique de la pharmacie à la date du ${fdate(Date.now())}.</label></div></div>
   ${S.showErr && errs.length ? `<div class="errs" role="alert" style="margin-top:12px"><b>${errs.length} point(s) à compléter avant la transmission :</b><ul>${errs.slice(0, 12).map(x => `<li>${esc(x)}</li>`).join("")}${errs.length > 12 ? `<li>… et ${errs.length - 12} autre(s)</li>` : ""}</ul></div>` : ""}
   <div class="row" style="margin-top:14px"><button class="btn pri" data-act="submit" ${S.loading ? "disabled" : ""}>${S.loading ? "Transmission…" : "Valider et transmettre"}</button><button class="btn" data-act="exportOne">Télécharger une copie</button><button class="btn" data-act="clearDraft">Effacer le brouillon</button></div>
   <p class="small muted" style="margin:10px 0 0">Le brouillon est conservé sur cet appareil jusqu'à la transmission. Aucune donnée patient n'est collectée.</p></section>`;
}

/* ----- mon compte ----- */
function accountView() {
  const u = S.user;
  return `<section class="panel"><span class="step">Mon compte</span><h1 style="margin-bottom:12px">${esc(u.name)}</h1><table class="t"><tbody>
    <tr><td class="muted" style="width:40%">Identifiant</td><td class="mono">${esc(u.username)}</td></tr><tr><td class="muted">Profil</td><td>${u.role === "admin" ? "Coordination (administration)" : "Pharmacien hospitalier"}</td></tr>
    <tr><td class="muted">Téléphone</td><td>${esc(u.phone || "—")}</td></tr><tr><td class="muted">Compte créé le</td><td>${fdate(u.createdAt)}</td></tr><tr><td class="muted">Dernière connexion</td><td>${fdt(u.lastLogin)}</td></tr></tbody></table></section>
  <form class="panel" data-form="password"><h2 style="margin-bottom:10px">Changer mon mot de passe</h2><div class="form">
    <div class="f"><label for="pw_o">Mot de passe actuel</label><input class="inp" id="pw_o" name="current" type="password" autocomplete="current-password" required></div>
    <div class="f"><label for="pw_n">Nouveau mot de passe</label><input class="inp" id="pw_n" name="next" type="password" autocomplete="new-password" required minlength="8"></div>
    <div class="f"><label for="pw_c">Confirmation</label><input class="inp" id="pw_c" name="confirm" type="password" autocomplete="new-password" required minlength="8"></div></div>
    <div class="row" style="margin-top:10px"><button class="btn pri" type="submit">Enregistrer</button><span class="hint">8 caractères minimum, au moins une lettre et un chiffre.</span></div></form>`;
}

/* ----- coordination : consolidation ----- */
function allSubs() { return (S.subs || []).map(d => ({ ...normalize(d), owner: d.owner, submittedAt: d.submittedAt, version: d.version, _key: etabKey(normalize(d)) })).sort((a, b) => (a.etab.wil + a.etab.name).localeCompare(b.etab.wil + b.etab.name)); }
function lotRows(list) { const rows = []; list.forEach(d => { AB.forEach(a => { const it = d.items[a.id]; if (it.st === "dispo") it.lots.forEach(l => rows.push({ d, code: a.id, dci: a.dci, st: "dispo", pres: it.pres || a.pres, ...l })); else rows.push({ d, code: a.id, dci: a.dci, st: it.st, pres: "", q: "", u: "", lot: "", exp: "" }); }); d.extra.forEach(x => rows.push({ d, code: "autre", dci: x.name, st: "dispo", ...x })); }); return rows; }
function consView() {
  if (S.subs === null) { loadSubs(); return `<div class="empty">Chargement des fiches…</div>`; }
  const list = allSubs(); const wils = new Set(list.map(d => d.etab.wil)); const stale = list.filter(d => Date.now() - Date.parse(d.submittedAt || 0) > 30 * DAY).length;
  const holders = AB.map(a => { const h = list.filter(d => d.items[a.id].st === "dispo"); return { a, h: h.length, units: h.reduce((s, d) => s + d.items[a.id].lots.reduce((t, l) => t + (Number(l.q) || 0), 0), 0), rup: list.filter(d => d.items[a.id].st === "rupture").length, w: new Set(h.map(d => d.etab.wil)).size }; });
  const exp3 = lotRows(list).filter(r => r.exp && monthsTo(r.exp) > 0 && monthsTo(r.exp) <= 3).length;
  const dis = list.length ? "" : "disabled";
  return `<section class="panel"><div class="ph"><div><span class="step">Coordination</span><h1>Consolidation nationale</h1></div><button class="btn sm" data-act="reloadSubs">Actualiser</button></div>
   <p class="muted" style="margin:0;max-width:72ch">Une ligne par compte pharmacien ; seule la dernière version transmise est retenue.</p>
   <div class="row" style="margin-top:12px"><button class="btn pri" data-act="expLots" ${dis}>Exporter les lots (CSV d'intégration)</button><button class="btn" data-act="expEtab" ${dis}>Exporter les établissements (CSV)</button><button class="btn" data-act="expJson" ${dis}>Exporter tout (JSON)</button></div></section>
  <div class="kpis"><div><b>${list.length}</b><span>établissements</span></div><div><b>${wils.size}/58</b><span>wilayas couvertes</span></div><div><b style="color:${stale ? "var(--warn)" : "inherit"}">${stale}</b><span>fiches de plus de 30 jours</span></div><div><b style="color:${list.length && holders.some(x => !x.h) ? "var(--crit)" : "inherit"}">${list.length ? holders.filter(x => !x.h).length : "—"}</b><span>antidotes sans aucun détenteur</span></div><div><b>${exp3}</b><span>lots périmant sous 3 mois</span></div></div>
  <section class="panel"><h2 style="margin-bottom:10px">Établissements</h2>${list.length ? `<div class="tw"><table class="t"><thead><tr><th>Wilaya</th><th>Établissement</th><th>Pharmacien responsable</th><th>Transmise le</th><th>Compte</th><th class="n">Disponibles</th><th class="n">Ruptures</th><th>Fraîcheur</th></tr></thead><tbody>${list.map(d => { const c = counts(d); const age = (Date.now() - Date.parse(d.submittedAt || 0)) / DAY; return `<tr class="click" data-act="openSub" data-o="${esc(d.owner)}"><td>${esc(d.etab.wil)} — ${esc(WILM[d.etab.wil] || "")}</td><td><b>${esc(d.etab.type)} ${esc(d.etab.name)}</b>${d.etab.code ? `<div class="small muted mono">${esc(d.etab.code)}</div>` : ""}</td><td>${esc(d.pharm.resp)}<div class="small muted">${esc(d.pharm.tel)}</div></td><td class="small">${fdt(d.submittedAt)}<div class="muted">v${esc(d.version)}</div></td><td class="small mono">${esc(d.owner)}</td><td class="n">${c.dispo}</td><td class="n">${c.rupture}</td><td>${age <= 7 ? `<span class="chip ok"><i></i>&lt; 7 jours</span>` : age <= 30 ? `<span class="chip warn"><i></i>${Math.round(age)} jours</span>` : `<span class="chip crit"><i></i>à relancer</span>`}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="empty">Aucune fiche transmise pour l'instant. Communiquez l'adresse du site aux pharmaciens hospitaliers.</div>`}</section>
  <section class="panel"><h2 style="margin-bottom:10px">Couverture par antidote</h2><div class="tw"><table class="t"><thead><tr><th>Antidote</th><th class="n">Établissements détenteurs</th><th class="n">Unités en stock</th><th class="n">Wilayas couvertes</th><th class="n">Ruptures signalées</th></tr></thead><tbody>${holders.map(x => `<tr><td>${esc(x.a.dci)}<div class="small muted">${esc(x.a.ind)}</div></td><td class="n" style="${list.length && !x.h ? "color:var(--crit);font-weight:600" : ""}">${x.h}</td><td class="n">${fmt(x.units)}</td><td class="n">${x.w}</td><td class="n">${x.rup}</td></tr>`).join("")}</tbody></table></div><p class="small muted" style="margin:8px 0 0">Les unités s'additionnent quelle que soit la présentation : à interpréter avec le détail des lots.</p></section>
  <section class="panel"><details><summary style="cursor:pointer;font-weight:600">Format d'intégration dans la plateforme</summary><p class="small" style="margin:8px 0 0;max-width:80ch">Le CSV des lots suit la table <span class="mono">STOCK_LOTS</span> du modèle de données de la plateforme : une ligne par lot (ou par antidote en rupture / non détenu), séparateur point-virgule, UTF-8. Colonnes : <span class="mono">etablissement_cle, wilaya_code, etablissement_type, etablissement_nom, antidote_code, dci, statut, presentation, quantite, unite, numero_lot, date_peremption, transmis_le, certifie_par, version, compte</span>. Le JSON conserve les fiches complètes au schéma <span class="mono">${SCHEMA}</span>.</p></details></section>`;
}
function subModal(owner) {
  const d = allSubs().find(x => x.owner === owner); if (!d) return;
  $("modal").innerHTML = `<div class="modal" data-act="modalBg"><div class="box" role="dialog" aria-modal="true" aria-label="Détail de la fiche"><div class="ph" style="margin:0"><div><span class="step">${esc(d.etab.wil)} — ${esc(WILM[d.etab.wil] || "")}</span><h2>${esc(d.etab.type)} ${esc(d.etab.name)}</h2></div><button class="btn sm" data-act="closeModal">Fermer</button></div>
  <p class="small" style="margin:0">Pharmacien responsable : <b>${esc(d.pharm.resp)}</b> (${esc(d.pharm.fonction || "fonction non précisée")}) · <span class="mono">${esc(d.pharm.tel)}</span>${d.pharm.email ? ` · ${esc(d.pharm.email)}` : ""} · 24 h/24 : ${esc(d.pharm.h24 || "—")} · urgences : ${esc(d.pharm.urg || "—")}<br>Certifiée par ${esc(d.cert.name)} le ${fdt(d.submittedAt)} · version ${esc(d.version)} · compte <span class="mono">${esc(d.owner)}</span></p>
  <div class="tw"><table class="t"><thead><tr><th>Antidote</th><th>Statut</th><th>Lots (quantité · n° · péremption)</th><th>Observation</th></tr></thead><tbody>${AB.map(a => { const it = d.items[a.id]; return `<tr><td>${esc(a.dci)}${it.pres ? `<div class="small muted">${esc(it.pres)}</div>` : ""}</td><td>${it.st === "dispo" ? `<span class="chip ok"><i></i>Disponible</span>` : it.st === "rupture" ? `<span class="chip crit"><i></i>Rupture</span>${it.cmd ? `<div class="small muted">commande en cours</div>` : ""}` : it.st === "absent" ? `<span class="chip off"><i></i>Non détenu</span>` : "—"}</td><td class="small mono">${it.lots.map(l => `<div style="${monthsTo(l.exp) <= 3 ? "color:var(--warn)" : ""}">${fmt(l.q)} ${esc(l.u)} · ${esc(l.lot || "sans n°")} · ${esc(l.exp)}</div>`).join("")}</td><td class="small">${esc(it.obs)}</td></tr>`; }).join("")}${d.extra.map(x => `<tr><td>${esc(x.name)}<div class="small muted">hors liste · ${esc(x.pres)}</div></td><td><span class="chip ok"><i></i>Disponible</span></td><td class="small mono">${fmt(x.q)} ${esc(x.u)} · ${esc(x.lot || "sans n°")} · ${esc(x.exp)}</td><td></td></tr>`).join("")}</tbody></table></div></div></div>`;
}

/* ----- coordination : comptes ----- */
function usersView() {
  if (S.users === null) { loadUsers(); return `<div class="empty">Chargement des comptes…</div>`; }
  const st = { active: ["ok", "Actif"], pending: ["warn", "En attente"], disabled: ["crit", "Désactivé"] };
  const pend = S.users.filter(u => u.status === "pending").length;
  return `<section class="panel"><div class="ph"><div><span class="step">Coordination</span><h1>Comptes</h1></div><button class="btn sm" data-act="reloadUsers">Actualiser</button></div>
   <p class="muted" style="margin:0 0 12px">${S.users.length} compte(s)${pend ? ` · <b style="color:var(--warn)">${pend} en attente d'activation</b>` : ""}. Les pharmaciens créent eux-mêmes leur compte depuis la page d'accueil.</p>
   <div class="tw"><table class="t"><thead><tr><th>Identifiant</th><th>Nom</th><th>Téléphone</th><th>Profil</th><th>Statut</th><th>Créé le</th><th>Dernière connexion</th><th>Actions</th></tr></thead><tbody>${S.users.map(u => { const s = st[u.status] || ["off", u.status]; const me = u.username === S.user.username; return `<tr><td class="mono small">${esc(u.username)}</td><td>${esc(u.name)}</td><td class="small">${esc(u.phone || "")}</td><td class="small">${u.role === "admin" ? "Coordination" : "Pharmacien"}</td><td><span class="chip ${s[0]}"><i></i>${s[1]}</span></td><td class="small">${fdate(u.createdAt)}</td><td class="small">${fdt(u.lastLogin)}</td><td><div class="row" style="gap:4px">${me ? `<span class="small muted">vous</span>` : `${u.status !== "active" ? `<button class="btn sm" data-act="uAct" data-a="activate" data-u="${esc(u.username)}">Activer</button>` : `<button class="btn sm" data-act="uAct" data-a="disable" data-u="${esc(u.username)}">Désactiver</button>`}${u.role === "admin" ? `<button class="btn sm" data-act="uAct" data-a="remove-admin" data-u="${esc(u.username)}">Retirer coordination</button>` : `<button class="btn sm" data-act="uAct" data-a="make-admin" data-u="${esc(u.username)}">Nommer coordination</button>`}<button class="btn sm" data-act="uPwd" data-u="${esc(u.username)}">Nouveau mot de passe</button>`}</div></td></tr>`; }).join("")}</tbody></table></div></section>`;
}
async function loadSubs() { try { S.subs = (await api("/api/admin/submissions")).submissions; } catch (e) { S.subs = []; toast(e.message); } render(); }
async function loadUsers() { try { S.users = (await api("/api/admin/users")).users; } catch (e) { S.users = []; toast(e.message); } render(); }

/* ---------------- exports ---------------- */
const csvCell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
const toCsv = (cols, rows) => "﻿" + [cols, ...rows].map(r => r.map(csvCell).join(";")).join("\r\n");
function saveFile(filename, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000); toast(`Fichier téléchargé : ${filename}`);
}

/* ---------------- événements ---------------- */
let saveT = null;
function touch(full) {
  S.F.updatedAt = Date.now(); clearTimeout(saveT); saveT = setTimeout(() => lsSet(draftKey(), S.F), 400);
  if (full) { const y = window.scrollY; render(); window.scrollTo(0, y); } else { const p = $("prog"); if (p) p.outerHTML = progressBar(); }
}
function setPath(obj, path, val) { const ks = path.split("."); let o = obj; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = val; }

document.addEventListener("input", e => {
  const el = e.target; if (!S.user) return;
  if (el.id === "flt") { S.filter = el.value; const y = window.scrollY; render(); window.scrollTo(0, y); const f = $("flt"); f.focus(); f.setSelectionRange(f.value.length, f.value.length); return; }
  if (el.dataset.k && el.type !== "checkbox" && el.tagName !== "SELECT") { setPath(S.F, el.dataset.k, el.value); touch(false); return; }
  if (el.dataset.ab && el.dataset.i !== undefined && el.tagName !== "SELECT") { const l = S.F.items[el.dataset.ab].lots[+el.dataset.i]; l[el.dataset.f] = el.dataset.f === "q" ? Number(el.value) : el.value; const t = $("tot_" + el.dataset.ab); if (t) t.textContent = totalTxt(el.dataset.ab); touch(false); return; }
  if (el.dataset.ab && el.dataset.f && el.type !== "checkbox") { S.F.items[el.dataset.ab][el.dataset.f] = el.value; touch(false); return; }
  if (el.dataset.x !== undefined && el.tagName !== "SELECT") { const x = S.F.extra[+el.dataset.x]; x[el.dataset.f] = el.dataset.f === "q" ? Number(el.value) : el.value; touch(false); }
});
document.addEventListener("change", e => {
  const el = e.target; if (!S.user) return;
  if (el.id === "todo") { S.onlyTodo = el.checked; render(); return; }
  if (el.dataset.k && (el.type === "checkbox" || el.tagName === "SELECT")) { setPath(S.F, el.dataset.k, el.type === "checkbox" ? el.checked : el.value); touch(false); return; }
  if (el.dataset.ab && el.dataset.i !== undefined && el.tagName === "SELECT") { S.F.items[el.dataset.ab].lots[+el.dataset.i][el.dataset.f] = el.value; const t = $("tot_" + el.dataset.ab); if (t) t.textContent = totalTxt(el.dataset.ab); touch(false); return; }
  if (el.dataset.ab && el.dataset.i !== undefined && el.dataset.f === "exp") { touch(true); return; }
  if (el.dataset.ab && el.dataset.f === "cmd") { S.F.items[el.dataset.ab].cmd = el.checked; touch(false); return; }
  if (el.dataset.x !== undefined && el.tagName === "SELECT") { S.F.extra[+el.dataset.x][el.dataset.f] = el.value; touch(false); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape") $("modal").innerHTML = ""; });

document.addEventListener("submit", async e => {
  e.preventDefault(); const f = e.target; const fd = Object.fromEntries(new FormData(f)); const btn = f.querySelector("button[type=submit]");
  if (btn) btn.disabled = true;
  try {
    if (f.dataset.form === "login") {
      const r = await api("/api/login", { body: { username: fd.username, password: fd.password } });
      S.authErr = ""; S.authMsg = ""; await afterLogin(r.user); return;
    }
    if (f.dataset.form === "register") {
      if (fd.password !== fd.confirm) throw new Error("Les deux mots de passe ne correspondent pas.");
      const r = await api("/api/register", { body: { username: (fd.username || "").toLowerCase(), password: fd.password, name: fd.name, phone: fd.phone, code: fd.code } });
      S.authErr = "";
      if (r.pending) { S.authTab = "login"; S.authMsg = "Compte créé. Il sera activé par la coordination ; vous pourrez ensuite vous connecter."; render(); return; }
      await afterLogin(r.user); toast("Compte créé — bienvenue"); return;
    }
    if (f.dataset.form === "password") {
      if (fd.next !== fd.confirm) throw new Error("La confirmation ne correspond pas au nouveau mot de passe.");
      await api("/api/password", { body: { current: fd.current, next: fd.next } }); f.reset(); toast("Mot de passe modifié"); return;
    }
  } catch (err) {
    if (f.dataset.form === "password") toast(err.message); else { S.authErr = err.message; render(); }
  } finally { if (btn && btn.isConnected) btn.disabled = false; }
});

document.addEventListener("click", async e => {
  const el = e.target.closest("[data-act]"); if (!el) return; const d = el.dataset;
  switch (d.act) {
    case "authTab": S.authTab = d.v; S.authErr = ""; render(); break;
    case "logout": try { await api("/api/logout", { body: {} }); } catch (err) {} S.user = null; S.subs = null; S.users = null; S.authMsg = "Vous êtes déconnecté."; S.authTab = "login"; render(); break;
    case "tab": S.tab = d.v; if (d.v === "cons") S.subs = null; if (d.v === "comptes") S.users = null; render(); window.scrollTo(0, 0); break;
    case "st": { const it = S.F.items[d.ab]; it.st = it.st === d.v ? "" : d.v; if (it.st === "dispo" && !it.lots.length) it.lots.push({ q: 0, u: ABM[d.ab].unit, lot: "", exp: "" }); touch(true); break; }
    case "addLot": S.F.items[d.ab].lots.push({ q: 0, u: ABM[d.ab].unit, lot: "", exp: "" }); touch(true); break;
    case "delLot": S.F.items[d.ab].lots.splice(+d.i, 1); touch(true); break;
    case "addExtra": S.F.extra.push({ name: "", pres: "", q: 0, u: "amp.", lot: "", exp: "" }); touch(true); break;
    case "delExtra": S.F.extra.splice(+d.i, 1); touch(true); break;
    case "restAbsent": { let n = 0; AB.forEach(a => { if (!S.F.items[a.id].st) { S.F.items[a.id].st = "absent"; n++; } }); toast(`${n} antidote(s) marqué(s) non détenu(s)`); touch(true); break; }
    case "clearDraft":
      if (el.dataset.confirm !== "1") { el.dataset.confirm = "1"; el.textContent = "Confirmer : effacer"; setTimeout(() => { if (el.isConnected) { el.dataset.confirm = ""; el.textContent = "Effacer le brouillon"; } }, 4000); break; }
      lsSet(draftKey(), null); await loadOwn(true); toast("Brouillon effacé"); break;
    case "submit": await submit(); break;
    case "exportOne": saveFile(`antidotes_${etabKey(S.F)}_${today()}.json`, JSON.stringify(S.F, null, 1), "application/json"); break;
    case "closeRes": S.result = null; render(); break;
    case "reloadSubs": S.subs = null; render(); break;
    case "reloadUsers": S.users = null; render(); break;
    case "openSub": subModal(d.o); break;
    case "closeModal": $("modal").innerHTML = ""; break;
    case "modalBg": if (e.target === el) $("modal").innerHTML = ""; break;
    case "uAct": try { await api("/api/admin/users", { body: { username: d.u, action: d.a } }); toast("Compte mis à jour"); S.users = null; render(); } catch (err) { toast(err.message); } break;
    case "uPwd": {
      const pw = Math.random().toString(36).slice(2, 7) + Math.floor(Math.random() * 90 + 10) + Math.random().toString(36).slice(2, 5).toUpperCase();
      try { await api("/api/admin/users", { body: { username: d.u, action: "reset-password", password: pw } });
        $("modal").innerHTML = `<div class="modal" data-act="modalBg"><div class="box" role="dialog" aria-modal="true" aria-label="Nouveau mot de passe"><h2>Nouveau mot de passe</h2><p>Mot de passe provisoire pour <b class="mono">${esc(d.u)}</b> :</p><p class="mono" style="font-size:20px;user-select:all">${esc(pw)}</p><p class="small muted">Communiquez-le au pharmacien par un canal sûr et demandez-lui de le changer dans « Mon compte ». Il ne sera plus affiché.</p><div class="row"><button class="btn pri" data-act="closeModal">Fermer</button></div></div></div>`;
      } catch (err) { toast(err.message); } break; }
    case "expLots": { const rows = lotRows(allSubs()).map(r => [r.d._key, r.d.etab.wil, r.d.etab.type, r.d.etab.name, r.code, r.dci, STL[r.st] || "Non renseigné", r.pres, r.q, r.u, r.lot, r.exp, r.d.submittedAt, r.d.cert.name, r.d.version, r.d.owner]);
      saveFile(`antidotes-dz_stock-lots_${today()}.csv`, toCsv(["etablissement_cle","wilaya_code","etablissement_type","etablissement_nom","antidote_code","dci","statut","presentation","quantite","unite","numero_lot","date_peremption","transmis_le","certifie_par","version","compte"], rows), "text/csv;charset=utf-8"); break; }
    case "expEtab": { const rows = allSubs().map(x => { const c = counts(x); return [x._key, x.etab.wil, WILM[x.etab.wil] || "", x.etab.type, x.etab.name, x.etab.code, x.pharm.resp, x.pharm.fonction, x.pharm.tel, x.pharm.email, x.pharm.h24, x.pharm.urg, c.dispo, c.rupture, c.absent, x.submittedAt, x.version, x.owner]; });
      saveFile(`antidotes-dz_etablissements_${today()}.csv`, toCsv(["etablissement_cle","wilaya_code","wilaya","type","nom","code","pharmacien_responsable","fonction","telephone","email","acces_24h","urgences","nb_disponibles","nb_ruptures","nb_non_detenus","transmis_le","version","compte"], rows), "text/csv;charset=utf-8"); break; }
    case "expJson": saveFile(`antidotes-dz_fiches_${today()}.json`, JSON.stringify({ schema: SCHEMA, exportedAt: new Date().toISOString(), fiches: S.subs }, null, 1), "application/json"); break;
  }
});

async function submit() {
  S.showErr = true; const errs = validate(S.F);
  if (errs.length) { render(); const b = document.querySelector(".errs"); if (b) b.scrollIntoView({ block: "center" }); return; }
  S.loading = true; render();
  try {
    const r = await api("/api/submission", { body: { data: S.F } });
    S.F = normalize(r.submission); S.F.updatedAt = null; lsSet(draftKey(), null);
    S.result = { version: r.submission.version, submittedAt: r.submission.submittedAt }; S.showErr = false;
  } catch (err) { toast(err.message); }
  S.loading = false; render(); window.scrollTo(0, 0);
}
async function loadOwn(ignoreDraft) {
  let remote = null; try { remote = (await api("/api/submission")).submission; } catch (e) {}
  const draft = ignoreDraft ? null : lsGet(draftKey());
  if (draft && draft.updatedAt && (!remote || draft.updatedAt > Date.parse(remote.submittedAt || 0))) S.F = normalize(draft);
  else if (remote) S.F = normalize(remote);
  else S.F = blank();
  render();
}
async function afterLogin(user) { S.user = user; S.tab = "fiche"; S.result = null; S.showErr = false; render(); await loadOwn(false); }

(async () => {
  try { const r = await api("/api/me"); S.config = r.config || {}; if (r.user) { await afterLogin(r.user); return; } }
  catch (e) { S.authErr = e.message; }
  render();
})();
