/* ---------- Sauvegarde et synchronisation ----------
   La progression ne vit que dans le localStorage de ce navigateur : perdre le
   téléphone, c'est tout perdre. Deux filets partagent ici le même format, un
   fichier exporté à la main et une copie automatique dans un gist GitHub privé.

   Le format ne conserve pas les champs que mergeEmbed() réécrit depuis
   EMBED_VOCAB (pinyin, traduction, phrase d'exemple, classificateur...) : ils
   reviennent seuls à la restauration. Une sauvegarde pèse ainsi quelques
   dizaines de Ko au lieu de près de trois cents, ce qui la rend transportable.
   Les fiches absentes du vocabulaire embarqué sont gardées entières : rien ne
   pourrait les reconstruire. Tout le reste de l'état (jours, grammaire,
   briques, tons, voix) est repris tel quel, y compris les clés qui seront
   ajoutées plus tard. */
const BACKUP_V = 2;
const CHAMPS_EMBARQUES = ["pinyin", "fr", "phrase", "phraseFr", "mots",
  "cl", "cl_pinyin", "cl_note", "usage", "construction"];

/* Clés qui subsistent sur une fiche embarquée une fois le contenu retiré. Une
   fiche qui en porterait d'autres (champ ajouté plus tard) est conservée en
   entier plutôt que jetée : la sauvegarde ne doit jamais perdre ce qu'elle ne
   sait pas relire. */
const CHAMPS_PROGRESSION = ["hanzi", "theme", "son", "zi", "vu"];
function trackVierge(tr) {
  return !tr || (!tr.inter && !tr.reviews && !tr.errors && !tr.bestGap && !tr.last);
}
function buildBackup() {
  const embarques = new Set(EMBED_VOCAB.map(w => w.hanzi.trim()));
  const cards = [];
  state.cards.forEach(c => {
    /* Fiche ajoutée à la main : rien ne pourrait la reconstruire, on garde tout. */
    if (!embarques.has(c.hanzi)) { cards.push(c); return; }
    const out = {};
    Object.keys(c).forEach(k => { if (CHAMPS_EMBARQUES.indexOf(k) < 0) out[k] = c[k]; });
    const connue = Object.keys(out).every(k => CHAMPS_PROGRESSION.indexOf(k) >= 0);
    /* Jamais travaillée : mergeEmbed la recréera à l'identique au chargement. */
    if (connue && !out.vu && TRACKS.every(t => trackVierge(out[t]))) return;
    cards.push(out);
  });
  return Object.assign({}, state, { app: "lianxi", v: BACKUP_V, ts: state.ts || Date.now(), cards });
}
/* Une sauvegarde neuve peut n'avoir aucune fiche travaillée : c'est le marqueur
   qui l'identifie. Les anciennes, sans marqueur, portaient toujours des fiches. */
function estSauvegarde(d) {
  return !!d && Array.isArray(d.cards) && (d.app === "lianxi" || d.cards.length > 0);
}
/* Accepte aussi les sauvegardes de l'ancien format (état complet) : mergeEmbed
   repose de toute façon le contenu embarqué par-dessus. */
function applyBackup(data) {
  const s = Object.assign({}, data);
  delete s.app; delete s.v;
  state = s;
  if (!Array.isArray(state.cards)) state.cards = [];
  if (!state.days) state.days = {};
  if (!state.gram) state.gram = {};
  if (typeof state.reviews !== "number") state.reviews = 0;
  mergeEmbed(state);
  save(); render(); renderGram(); renderComp();
}
function backupNom() { return `lianxi-${todayKey()}.json`; }
function dateLisible(ts) {
  if (!ts) return "date inconnue";
  const d = new Date(ts);
  return `${cleDate(d)} à ${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
}
/* On annonce le nombre de fiches travaillées, pas le vocabulaire total : la
   sauvegarde ne contient que celles-là, et afficher « 252 mots » face à un
   compteur d'accueil à 716 laisserait croire à une perte. */
function backupResume(d) {
  return `${d.cards.length} fiches travaillées, ${Object.keys(d.gram || {}).length} points de grammaire, du ${dateLisible(d.ts)}`;
}
function depuis(ts) {
  if (!ts) return "jamais";
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const hh = Math.round(m / 60);
  if (hh < 24) return `il y a ${hh} h`;
  return `il y a ${Math.round(hh / 24)} j`;
}

/* ---- Fichier ---- */
/* Sur iPhone la feuille de partage est le seul chemin confortable vers Fichiers
   ou iCloud Drive ; ailleurs on retombe sur un téléchargement classique. */
function exportFichier() {
  const msg = $("maint-msg"), txt = JSON.stringify(buildBackup()), nom = backupNom();
  let file = null;
  try { file = new File([txt], nom, { type: "application/json" }); } catch (e) {}
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: nom }).then(() => {
      msg.className = "msg ok";
      msg.textContent = "Sauvegarde envoyée. Range-la dans Fichiers ou iCloud Drive.";
    }, err => {
      /* Annuler la feuille de partage n'est pas une erreur. */
      if (err && err.name === "AbortError") { msg.className = "msg"; msg.textContent = ""; return; }
      telechargerBackup(txt, nom, msg);
    });
    return;
  }
  telechargerBackup(txt, nom, msg);
}
function telechargerBackup(txt, nom, msg) {
  try {
    const url = URL.createObjectURL(new Blob([txt], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = nom;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    msg.className = "msg ok"; msg.textContent = `Fichier ${nom} enregistré.`;
  } catch (e) {
    msg.className = "msg err";
    msg.textContent = "Enregistrement impossible sur cet appareil. Utilise « Copier une sauvegarde complète ».";
  }
}
function importFichier(input) {
  const f = input.files && input.files[0];
  input.value = "";
  if (!f) return;
  const r = new FileReader();
  r.onload = () => lireEtRestaurer(String(r.result), "le fichier " + f.name);
  r.onerror = () => {
    const m = $("maint-msg"); m.className = "msg err"; m.textContent = "Fichier illisible.";
  };
  r.readAsText(f);
}

/* ---- Restauration ----
   Une restauration remplace l'état local, elle ne le fusionne pas : c'est le
   comportement attendu d'une vraie sauvegarde, et il évite qu'un état abîmé
   contamine le bon. D'où la confirmation en deux temps, sur le modèle de
   « Tout réinitialiser ». */
let restaureEnAttente = null;
function lireEtRestaurer(txt, source) {
  const msg = $("maint-msg");
  msg.className = "msg err";
  let data;
  const brut = String(txt).trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  try { data = JSON.parse(brut); }
  catch (e) { msg.textContent = "Sauvegarde illisible. Recopie le texte complet."; return false; }
  if (!estSauvegarde(data)) { msg.textContent = "Ce n'est pas une sauvegarde Liànxí."; return false; }
  restaureEnAttente = data;
  $("restore-confirm").style.display = "";
  msg.className = "msg";
  msg.textContent = `Trouvé dans ${source} : ${backupResume(data)}. Ta progression actuelle sera remplacée. Appuie sur « Confirmer la restauration » pour continuer.`;
  showTab("words");
  $("restore-confirm").scrollIntoView({ block: "center" });
  return true;
}
function confirmerRestauration() {
  const msg = $("maint-msg"), data = restaureEnAttente;
  restaureEnAttente = null;
  $("restore-confirm").style.display = "none";
  if (!data) { msg.className = "msg err"; msg.textContent = "Plus rien à restaurer."; return; }
  applyBackup(data);
  cacherBandeau();
  majSyncUI();
  msg.className = "msg ok";
  msg.textContent = `Sauvegarde restaurée : ${state.cards.length} mots, progression comprise.`;
}

/* ---- Sync gist ----
   Le jeton vit dans son propre enregistrement, hors de `state` : ni une
   restauration ni une réinitialisation ne doivent débrancher la sauvegarde. */
const SYNC_KEY = "lianxi-sync";
const GIST_FILE = "lianxi-progression.json";
const SYNC_DELAI = 60000; // au plus une poussée par minute pendant une session
let syncTimer = null, syncEnCours = false, syncSale = false;

function syncConf() {
  try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; } catch (e) { return {}; }
}
function syncSave(c) { try { localStorage.setItem(SYNC_KEY, JSON.stringify(c)); } catch (e) {} }

function gistFetch(chemin, opts) {
  const c = syncConf();
  if (!c.token) return Promise.reject(new Error("Aucun jeton GitHub enregistré sur cet appareil."));
  const o = Object.assign({ method: "GET" }, opts || {});
  o.headers = Object.assign({
    "Authorization": "Bearer " + c.token,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  }, o.headers || {});
  if (o.body) o.headers["Content-Type"] = "application/json";
  return fetch("https://api.github.com" + chemin, o).then(r => {
    if (r.status === 401 || r.status === 403)
      throw new Error("Jeton refusé par GitHub : expiré, révoqué, ou sans la portée « gist ».");
    if (r.status === 404)
      throw new Error("Sauvegarde en ligne introuvable. Le gist a peut-être été supprimé.");
    if (!r.ok) throw new Error("GitHub a répondu " + r.status + ".");
    return r.json();
  }, () => { throw new Error("GitHub injoignable. Vérifie ta connexion."); });
}
function pousserGist() {
  const c = syncConf();
  const fichiers = { files: {} };
  fichiers.files[GIST_FILE] = { content: JSON.stringify(buildBackup()) };
  /* `public` n'est accepté qu'à la création : GitHub ne sait pas rendre privé
     un gist déjà publié, et le renvoyer sur un PATCH ferait une erreur. */
  const corps = c.gistId
    ? Object.assign({ description: "Progression Liànxí" }, fichiers)
    : Object.assign({ description: "Progression Liànxí", public: false }, fichiers);
  const p = c.gistId
    ? gistFetch("/gists/" + c.gistId, { method: "PATCH", body: JSON.stringify(corps) })
    : gistFetch("/gists", { method: "POST", body: JSON.stringify(corps) });
  return p.then(g => {
    const n = syncConf();
    n.gistId = g.id; n.last = Date.now(); delete n.err;
    syncSave(n);
    return g;
  }, e => {
    const n = syncConf();
    if (n.token) { n.err = e.message; syncSave(n); }
    throw e;
  });
}
function tirerGist() {
  const c = syncConf();
  if (!c.gistId) return Promise.reject(new Error("Aucune sauvegarde en ligne pour l'instant."));
  return gistFetch("/gists/" + c.gistId).then(g => {
    const f = g.files && g.files[GIST_FILE];
    if (!f) throw new Error("Ce gist ne contient pas de sauvegarde Liànxí.");
    /* Au-delà d'un mégaoctet, GitHub tronque le contenu et ne donne qu'une URL. */
    if (f.truncated && f.raw_url) return fetch(f.raw_url).then(r => r.text());
    return f.content;
  }).then(t => JSON.parse(t));
}

/* Poussée différée : `save()` est appelé à chaque réponse, on ne veut pas d'un
   appel réseau par carte. Le compteur se relance au premier changement et la
   poussée part une minute plus tard, plus un envoi quand l'app passe en fond. */
function planSync() {
  if (!syncConf().token) return;
  syncSale = true;
  if (syncTimer) return;
  syncTimer = setTimeout(() => { syncTimer = null; flushSync(); }, SYNC_DELAI);
}
function flushSync() {
  if (!syncConf().token || !syncSale || syncEnCours) return Promise.resolve();
  syncEnCours = true; syncSale = false;
  return pousserGist().then(() => {
    syncEnCours = false; majSyncUI();
  }, () => {
    /* Échec : on remet le drapeau pour retenter à la prochaine occasion. */
    syncEnCours = false; syncSale = true; majSyncUI();
  });
}

function majSyncUI() {
  const el = $("sync-etat");
  if (!el) return;
  const c = syncConf(), on = !!c.token;
  $("sync-off").style.display = on ? "none" : "";
  $("sync-actions").style.display = on ? "" : "none";
  if (!on) {
    el.className = "hint";
    el.textContent = "Sauvegarde en ligne désactivée : ta progression ne vit que sur cet appareil.";
    return;
  }
  if (c.err) {
    el.className = "msg err";
    el.textContent = "Dernière tentative en échec : " + c.err;
    return;
  }
  el.className = "msg ok";
  el.textContent = c.last
    ? `Sauvegardé en ligne ${depuis(c.last)}, le ${dateLisible(c.last)}.`
    : "Sauvegarde en ligne activée, première copie en attente.";
}
function activerSync() {
  const champ = $("sync-token"), msg = $("maint-msg"), t = champ.value.trim();
  if (!t) { msg.className = "msg err"; msg.textContent = "Colle d'abord un jeton GitHub."; return; }
  const c = syncConf();
  c.token = t; delete c.err;
  syncSave(c);
  champ.value = "";
  msg.className = "msg"; msg.textContent = "Vérification du jeton...";
  /* Le premier envoi sert de test : il valide le jeton et crée le gist. */
  pousserGist().then(() => {
    msg.className = "msg ok";
    msg.textContent = "Sauvegarde en ligne activée. Une copie privée vient d'être créée sur GitHub.";
    majSyncUI();
  }, e => {
    const n = syncConf();
    delete n.token; delete n.err;
    syncSave(n);
    msg.className = "msg err"; msg.textContent = e.message;
    majSyncUI();
  });
}
function desactiverSync() {
  const n = syncConf();
  delete n.token; delete n.err;
  syncSave(n);
  syncSale = false;
  if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
  majSyncUI();
  const msg = $("maint-msg");
  msg.className = "msg ok";
  msg.textContent = "Jeton oublié sur cet appareil. La sauvegarde déjà en ligne reste intacte.";
}
function syncMaintenant() {
  const msg = $("maint-msg");
  msg.className = "msg"; msg.textContent = "Envoi en cours...";
  pousserGist().then(() => {
    msg.className = "msg ok"; msg.textContent = "Sauvegarde en ligne à jour.";
    syncSale = false; majSyncUI();
  }, e => {
    msg.className = "msg err"; msg.textContent = e.message; majSyncUI();
  });
}
function restaurerDepuisLigne() {
  const msg = $("maint-msg");
  msg.className = "msg"; msg.textContent = "Lecture de la sauvegarde en ligne...";
  tirerGist().then(d => lireEtRestaurer(JSON.stringify(d), "la sauvegarde en ligne"),
    e => { msg.className = "msg err"; msg.textContent = e.message; });
}

/* ---- Reprise sur un appareil en retard ----
   Au chargement, si la sauvegarde en ligne est plus récente que l'état trouvé
   ici (nouveau téléphone, app réinstallée, stockage purgé), on le signale.
   Jamais de restauration automatique : c'est une opération destructive. */
function verifierSyncAuDemarrage() {
  const c = syncConf();
  if (!c.token || !c.gistId) return;
  tirerGist().then(d => {
    if (!estSauvegarde(d) || !d.ts) return;
    /* Une minute de marge : la poussée est toujours datée après l'état local. */
    if (d.ts <= TS_CHARGE + 60000) return;
    restaureEnAttente = d;
    $("sync-banner-txt").textContent =
      `Une sauvegarde en ligne plus récente existe (${backupResume(d)}). Cet appareil est daté du ${TS_CHARGE ? dateLisible(TS_CHARGE) : "premier lancement"}.`;
    $("sync-banner").style.display = "";
  }, () => {});
}
function restaurerDepuisBandeau() {
  $("sync-banner").style.display = "none";
  const d = restaureEnAttente;
  if (!d) return;
  applyBackup(d);
  restaureEnAttente = null;
  majSyncUI();
  const msg = $("maint-msg");
  msg.className = "msg ok";
  msg.textContent = `Sauvegarde en ligne restaurée : ${state.cards.length} mots.`;
}
function ignorerBandeau() {
  cacherBandeau();
  /* Cet appareil fait foi désormais : on écrase la copie en ligne. */
  syncSale = true;
  flushSync();
}
function cacherBandeau() {
  const b = $("sync-banner");
  if (b) b.style.display = "none";
  restaureEnAttente = null;
}

