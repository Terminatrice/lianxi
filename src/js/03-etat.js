
/* ---------- État ---------- */
let PY = null; // index hanzi -> pinyin, (re)construit à la demande (voir pyIndex)
/* Index des décompositions, déclarés ici et pas dans la section Composants :
   mergeEmbed() les invalide dès le chargement, avant que ce bloc ne s'exécute. */
let HZ = null, COMPCHARS = null;
/* Déclaré ici et non près de gloseChar : mergeEmbed l'invalide, et mergeEmbed
   tourne dès `let state = load()`, bien avant le corps du fichier. */
let GLOSE_CHAR = null;
let state = load();
/* Date de l'etat tel qu'il etait dans ce navigateur au chargement, relevee
   avant le premier save() qui la reecrirait. C'est elle qu'on compare a la
   sauvegarde en ligne pour savoir laquelle des deux est en retard. */
const TS_CHARGE = state.ts || 0;
let curTheme = "all";
let curTrack = "all"; // "all" | "son" | "zi"

function load() {
  let s = null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) s = JSON.parse(raw);
  } catch (e) { /* stockage indisponible : session éphémère */ }
  if (!s) s = { cards: [], days: {}, reviews: 0 };
  if (!s.gram) s.gram = {}; // progression des points de grammaire, une entrée par id de fiche
  mergeEmbed(s);
  return s;
}
function mergeEmbed(s) {
  EMBED_VOCAB.forEach(w => {
    const ex = s.cards.find(c => c.hanzi === w.hanzi);
    if (ex) {
      ex.pinyin = w.pinyin; ex.fr = w.fr;
      ex.phrase = w.phrase || ""; ex.phraseFr = w.phraseFr || "";
      ex.mots = w.mots || [];
      ex.cl = w.cl || ""; ex.cl_pinyin = w.cl_pinyin || ""; ex.cl_note = w.cl_note || "";
      ex.usage = w.usage || ""; ex.construction = w.construction || "";
      ex.theme = themeManuel(w.hanzi.trim(), w.theme) || ex.theme || "Général";
    } else {
      s.cards.push(newCard(w));
    }
  });
  s.cards.forEach(migrate);
  PY = null; COMPCHARS = null; GLOSE_CHAR = null;
}
/* Ancienne progression (un seul niveau par mot) : on la duplique sur les deux pistes,
   qui divergeront ensuite au fil des révisions. */
function migrate(c) {
  if (!c.son || !c.zi) {
    const base = { level: c.level || 0, due: c.due || Date.now(), errors: c.errors || 0, reviews: c.reviews || 0 };
    if (!c.son) c.son = Object.assign({}, base);
    if (!c.zi) c.zi = Object.assign({}, base);
    delete c.level; delete c.due; delete c.errors; delete c.reviews;
  }
  TRACKS.forEach(t => migrateTrack(c[t], t));
}
/* Passage de l'échelle par niveaux à l'intervalle adaptatif. On repart de
   l'intervalle qu'avait le niveau atteint, et on déduit la facilité du taux
   d'erreur observé : un mot souvent raté redémarre avec une facilité basse. */
function migrateTrack(tr, kind) {
  if (!tr) return;
  if (typeof tr.inter !== "number") {
    tr.inter = OLD_LEVELS[Math.min(tr.level || 0, OLD_LEVELS.length - 1)] || 0;
    const rate = tr.reviews ? (tr.errors || 0) / tr.reviews : 0;
    tr.ease = Math.max(EASE_MIN, Math.min(EASE_MAX, (EASE_START[kind] || 2.2) - rate));
    delete tr.level;
  }
  /* La rétention démontrée n'était pas mesurée avant : on la déduit prudemment
     de l'intervalle déjà atteint, en le divisant par deux pour ne pas créditer
     une maturité qui n'a jamais été prouvée. */
  /* Rattrapage du raccourci de calibrage mal appliqué. Jusqu'au 2026-08-21, une
     règle, une brique ou une phrase reprise en cours réussie du premier coup
     partait à 30 jours comme un mot du vocabulaire. Ces points-là sont ramenés
     à l'échelle normale : ils reviennent dans les prochains jours au lieu du
     mois prochain. Rien n'est effacé, seule l'échéance avance, et le drapeau
     évite de refaire le rattrapage à chaque chargement. */
  if (TRACKS.indexOf(kind) < 0 && !tr.calibCorrige) {
    tr.calibCorrige = 1;
    if (tr.reviews === 1 && tr.inter >= CALIB_OK && !tr.bestGap) {
      tr.inter = STEP_1;
      tr.due = Math.min(tr.due || 0, Date.now() + STEP_1 * 864e5);
    }
  }
  if (typeof tr.bestGap !== "number") tr.bestGap = Math.floor((tr.inter || 0) / 2);
  if (typeof tr.last !== "number") tr.last = 0;
  if (typeof tr.ease !== "number") tr.ease = EASE_START[kind] || 2.2;
}
function save() {
  state.ts = Date.now();
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
  planSync();
}
function newTrack(kind) { return { inter: 0, ease: EASE_START[kind] || 2.2, due: Date.now(), errors: 0, reviews: 0, bestGap: 0, last: 0 }; }
function newCard(w) {
  return { hanzi: w.hanzi.trim(), pinyin: (w.pinyin||"").trim(), fr: (w.fr||"").trim(),
    phrase: (w.phrase||"").trim(), phraseFr: (w.phraseFr||"").trim(),
    mots: w.mots || [],
    cl: w.cl || "", cl_pinyin: w.cl_pinyin || "", cl_note: w.cl_note || "",
    usage: w.usage || "", construction: w.construction || "",
    theme: (themeManuel(w.hanzi.trim(), (w.theme||"").trim()) || "Général"),
    son: newTrack("son"), zi: newTrack("zi") };
}


