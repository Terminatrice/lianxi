/* ---------- Session ---------- */

/* Session à longueur fixe : la file est constituée une fois pour toutes et
   ne s'allonge jamais en cours de route. Les mots ratés ou passés reviennent
   dans une session suivante, pas dans celle-ci. */
/* ---------- La session du jour ----------
   Un seul bouton. L'app décide de l'ordre : ce que le prof a repris en cours
   d'abord, puis le vocabulaire dû, puis la grammaire due. Tant qu'il fallait
   choisir entre trois boutons, la partie la plus utile (les reprises du cours)
   était aussi la plus facile à sauter. */

/* ---------- Session mixte ----------
   Une seule file, tous formats confondus (demande de Daphnée, 2026-08-21).
   Avant : quatre sessions enchaînées, chacune avec sa barre de progression qui
   repartait de zéro et son écran de fin. « J'ai l'impression de ne jamais en
   finir », et c'était exact : finir les mots ne finissait rien.
   Chaque format garde son moteur (nextCard, nextGram, nextComp, nextErr,
   nextTone) : on ne les fusionne pas, on les pilote. La file mixte donne un
   élément à la fois au moteur concerné, et la fin de ce mini-lot rend la main
   à `avancerMix`. */
/* La longueur de la session du jour se choisit sur l'accueil : voir mixMax(). */
/* Places réservées par format, pour qu'aucun ne puisse être évincé par un autre.
   Les phrases reprises en cours passent en premier : c'est le principe posé le
   2026-08-12, il survit à la disparition de leur panneau. */
const MIX_PARTS = [
  { kind: "err",  max: 4 },
  { kind: "gram", max: 6 },
  { kind: "comp", max: 3 },
  { kind: "ton",  max: 3 },
  { kind: "oreille", max: 2 },
];
/* Les formats s'alternent : deux cartes du même type peuvent se suivre, jamais
   trois. Un bloc de six points de grammaire d'affilée, c'est la session par
   sections qu'on vient justement de supprimer. */
function entrelacer(items) {
  const out = [], pool = [...items];
  while (pool.length) {
    let i = pool.findIndex(x => !(out.length >= 2
      && out[out.length - 1].kind === x.kind && out[out.length - 2].kind === x.kind));
    if (i < 0) i = 0;
    out.push(pool[i]); pool.splice(i, 1);
  }
  return out;
}
function sessionMixte() {
  const parts = [];
  /* Les places réservées suivent la longueur choisie : sur une session de 15,
     garder les quotas d'une session de 30 ne laisserait presque aucune place
     au vocabulaire. */
  const echelle = mixMax() / 30;
  /* Campagne de niveau (2026-09-16) : quand un niveau HSK est ciblé, la
     session ne contient que le vocabulaire et la grammaire de ce niveau. Le
     but d'un ciblage est de BOUCLER le niveau ; briques, tons, oreille et
     phrases reprises en cours n'y contribuent pas et prenaient la moitié des
     places. */
  const campagne = curNiveau !== "all";
  MIX_PARTS.forEach(x => {
    if (campagne && x.kind !== "gram") return;
    const due = x.kind === "err" ? errDue()
      : x.kind === "gram" ? gramSelection()
      : x.kind === "comp" ? compDue()
      : x.kind === "oreille" ? pairesDue()
      : tonsDue();
    due.slice(0, Math.max(1, Math.round(x.max * echelle))).forEach(v => parts.push({ kind: x.kind, v: v }));
  });
  /* Le vocabulaire prend toute la place qui reste : c'est le gros du travail,
     et sa propre file réserve déjà ses nouveautés. Le plafond est ferme : les
     nouveautés se réservent en MOTS (deux pistes chacun) et débordaient la
     longueur annoncée, jusqu'à 21 cartes pour une session de 15. Les nouveautés
     étant en tête de file, la coupe ne retire que du rattrapage. */
  /* Plancher du vocabulaire : la moitié de la session, tant qu'il y a de quoi
     la remplir. Les autres formats se partagent le reste ; quand ils débordent,
     on retire au format le plus représenté, en partant de la fin de sa liste
     (ses éléments sont classés par priorité). Avant ce plancher, 18 places sur
     30 partaient aux autres formats et il en restait 12 pour les mots, toutes
     prises par les nouveautés (audit du 2026-09-16). */
  const max = mixMax();
  const vocabDispo = nbTests(sessionItems(max));
  const placeVocab = Math.max(Math.min(vocabDispo, Math.ceil(max / 2)), max - parts.length);
  while (parts.length > max - placeVocab) {
    const parKind = {};
    parts.forEach(x => { parKind[x.kind] = (parKind[x.kind] || 0) + 1; });
    const gros = Object.keys(parKind).sort((a, b) => parKind[b] - parKind[a])[0];
    let i = parts.length - 1;
    while (i >= 0 && parts[i].kind !== gros) i--;
    parts.splice(i, 1);
  }
  const place = Math.max(0, max - parts.length);
  /* Pas de coupe ici : sessionItems respecte `place` en tests, et ses cartes
     de découverte s'ajoutent par-dessus la longueur annoncée (2026-09-20). */
  sessionItems(place).forEach(it => parts.push({ kind: "srs", v: it }));
  return placerDecouvertes(entrelacer(shuffle(parts)));
}
/* Compteurs d'ensemble : un seul écran de fin, un seul score. */
function nouveauBilan() { return { ok: 0, total: 0, rates: [], items: [] }; }
function majProgres(i, total) {
  const a = mixOn ? mixPos : i, b = mixOn ? mix.length : total;
  $("prog-bar").style.width = Math.round(100 * a / Math.max(1, b)) + "%";
  $("prog-txt").textContent = `${Math.min(a + 1, b)} / ${b}`;
}
function startMix(liste, cours, cible) {
  /* Une file vide n'ouvre pas de session : avant, la session était déclarée
     « en cours » sans rien afficher, et la reprise proposée à tort. */
  const file = liste || sessionMixte();
  if (!file.length) return;
  ouvrirSession();
  mix = file;
  mixCours = !!(liste && cours);
  mixCible = !!(liste && cible);
  mixOn = true; mixPos = 0; mixBilan = nouveauBilan();
  mixEcrit = 0; mixEcritDern = -99;
  /* Ces listes servent aux écrans de fin des entraînements par onglet. En
     session mixte, chaque format reçoit une file d'un élément et ne les remet
     donc jamais à zéro : sans cette ligne, elles gardaient les ratés de la
     session précédente. */
  sessErrors = []; sessSkipped = []; sessOk = 0;
  gramErrors = []; gramOk = 0; compErrors = []; compOk = 0; errErrors = []; errOk = 0;
  plan = []; planPos = 0;
  sessPractice = false; sessCalib = false;
  drillExos = null; exoImpose = null;
  speak(" "); // amorce iOS
  $("session").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  lancerMix();
}
/* Chaque format reçoit une file d'UN élément. Sa propre fonction de fin détecte
   la file épuisée et rappelle `avancerMix` : voir les gardes en tête des
   fonctions endXSession. */
function lancerMix() {
  if (mixPos >= mix.length) { endMix(); return; }
  const e = mix[mixPos];
  if (mixCible) sessPractice = !!e.libre;
  if (e.kind === "srs") {
    sessMode = "srs"; queue = [e.v]; qIndex = 0; sessTotal = 1;
    sessEcrit = 0; sessEcritPos = -9; nextCard();
  } else if (e.kind === "gram") {
    sessMode = "gram"; gramQueue = [e.v]; gIndex = 0; gramTotal = 1;
    /* L'atelier impose son exercice (production libre) : voir startAtelier. */
    exoCourant = null; exoImpose = e.exo || null; nextGram();
  } else if (e.kind === "comp") {
    sessMode = "comp"; compQueue = [e.v]; cIndex = 0; compTotal = 1; nextComp();
  } else if (e.kind === "err") {
    sessMode = "err"; errQueue = [e.v]; eIndex = 0; errTotal = 1; nextErr();
  } else if (e.kind === "oreille") {
    sessMode = "oreille"; oreilleQueue = [e.v]; oIndex = 0; nextOreille();
  } else {
    sessMode = "tones"; toneQueue = [e.v]; toneIndex = 0; nextTone();
  }
}
function avancerMix() { mixPos++; lancerMix(); }
/* Ce que chaque format vient de noter est reversé au bilan d'ensemble. */
function noterMix(ok, libelle) {
  if (!mixOn || !mixBilan) return;
  mixBilan.total++;
  if (ok) { mixBilan.ok++; return; }
  if (libelle) mixBilan.rates.push(libelle);
  /* On retient aussi l'élément lui-même, pas seulement son libellé : c'est ce
     qui permet de le rejouer en fin de session. */
  const e = mix[mixPos];
  if (e && mixBilan.items.indexOf(e) < 0) mixBilan.items.push(e);
}
/* Repasser en fin de session ce qui a coincé, tous formats confondus. Le
   repassage ne compte pas : `sessPractice` coupe la planification et les
   compteurs du jour (voir `schedule` et `compterPassage`).
   Cette possibilité existait avant l'unification des sessions du 2026-08-21 et
   avait disparu avec elle : `endSession` la portait, et en session mixte
   `endSession` rend la main à `avancerMix` avant de l'afficher. */
function rejouerMix() {
  const encore = (mixBilan && mixBilan.items) ? mixBilan.items.slice() : [];
  if (!encore.length) { quitSession(); return; }
  sessPractice = true;
  mix = shuffle(encore); mixPos = 0; mixOn = true;
  mixBilan = nouveauBilan();
  mixEcrit = 0; mixEcritDern = -99;
  lancerMix();
}
/* Bilan copiable, à coller dans une session Claude Code ou à montrer au prof. */
function copierBilanMix(rates) {
  const text = `Bilan de ma session Liànxí du ${todayKey()}. À retravailler :\n`
    + rates.map(x => "- " + x).join("\n");
  copyText(text, $("sess-msg"), "Copié. Colle-le dans ta session Claude Code.");
}
function endMix() {
  /* Un entraînement ciblé finit souvent sur un exercice libre : il garde son
     écran de score, ce n'est pas un repassage. */
  if (mixCible) { sessPractice = false; mixCible = false; }
  /* Fin d'un repassage : rien n'a été planifié, il n'y a pas de score à donner. */
  if (sessPractice) {
    sessPractice = false; mixOn = false; sessEnCours = false;
    $("prog-bar").style.width = "100%";
    $("prog-txt").textContent = "";
    $("card-zone").innerHTML = `<div class="qcard">
        <div class="q-hanzi hanzi">加油</div>
        <div class="q-pinyin">${renderPinyin("jiā yóu")}</div>
        <div class="q-fr">Repassage terminé.</div>
        <p class="q-prompt">Ces points reviendront d'eux-mêmes dans une prochaine session.</p>
        <button class="btn" onclick="quitSession()">Terminer</button>
      </div>`;
    return;
  }
  sessEnCours = false; mixOn = false;
  /* La session du jour couvre tous les formats : la terminer met les compteurs
     du jour à zéro partout (accueil, grammaire, briques). Pas la révision d'un
     cours, qui est un complément. */
  if (!mixCours) {
    const f = faitJour();
    f.mix = true; f.gram = true; f.comp = true;
  }
  mixCours = false;
  save();
  $("prog-bar").style.width = "100%";
  $("prog-txt").textContent = "";
  const b = mixBilan || nouveauBilan();
  const liste = b.rates.length
    ? `<hr class="divider"><div class="end-list"><strong>À reprendre :</strong>
       <ul class="words">${b.rates.map(x => `<li><span class="w-mid"><span class="w-fr">${esc(x)}</span></span></li>`).join("")}</ul></div>`
    : `<p class="q-fr">Sans faute. 太好了 tài hǎo le !</p>`;
  $("card-zone").innerHTML = `<div class="qcard">
      <div class="q-hanzi hanzi">加油</div>
      <div class="q-pinyin">${renderPinyin("jiā yóu")}</div>
      <div class="q-fr">Session terminée : ${b.ok} / ${b.total}.</div>
      ${liste}
      ${b.items.length ? `<button class="btn secondary" onclick="rejouerMix()">Repasser ces ${b.items.length} point(s) sans compter</button>
       <button class="btn ghost" onclick="copierBilanMix(${jsattr(b.rates)})">Copier le bilan</button>
       <div class="msg" id="sess-msg"></div>` : ""}
      <button class="btn" onclick="quitSession()">Terminer</button>
    </div>`;
}
/* Le plan par étapes (erreurs, puis tons, puis mots, puis grammaire) a été
   remplacé le 2026-08-21 par la file mixte : quatre sessions à la suite, chacune
   avec sa barre repartant de zéro, donnaient l'impression de ne jamais en finir.
   `startJour` lance désormais une seule file. Les entraînements par format
   restent accessibles depuis leur propre onglet, pour cibler quand elle veut. */
function startJour() { startMix(); }
/* Bouton de fin des entraînements lancés depuis un onglet : ils n'ont jamais de
   suite, la file mixte étant le seul enchaînement. */
function boutonFin() {
  return `<button class="btn" onclick="quitSession()">Terminer</button>`;
}

function startCalibrage() {
  ouvrirSession();
  const items = calibItems(shuffle(calibMots()).slice(0, CALIB_MOTS_MAX));
  if (!items.length) return;
  sessMode = "srs";
  sessPractice = false;
  sessCalib = true;
  plan = []; planPos = 0;
  runQueue(spread(shuffle(items)));
  speak(" ");
  $("session").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  nextCard();
}

/* ---------- Consolidation des mots du jour ----------
   Après la session du jour, les mots qui ont coincé se retravaillent dans tous
   les sens : écoute, pinyin, lecture, écriture (avec indices de briques), et
   fabrication de la phrase complète (demande de Daphnée, 2026-08-21). Ce
   repassage ne touche JAMAIS à la planification (sessPractice) : réussir un mot
   quelques heures après l'avoir raté n'engage que la mémoire de travail. */
const CONSO_MODES = ["ecoute", "pinyin", "lecture", "ecriture", "phrase"];
const CONSO_MAX = 30;       // plafond FERME de cartes par session
const CONSO_MOTS_MAX = 12;  // mots par session : le reste attend la suivante
function startConsolidation() {
  const tous = faiblesJour();
  if (!tous.length) return;
  /* Une session reste courte : 12 mots au plus, 30 cartes au plus. Avant, 48
     mots donnaient 96 cartes sous un bouton qui annonçait 48 (bug relevé par
     Daphnée le 2026-08-24). Les mots non servis restent dans la liste : le
     bouton propose la fournée suivante dès la fin de celle-ci. */
  const cartes = shuffle(tous).slice(0, CONSO_MOTS_MAX);
  ouvrirSession();
  consoMots = cartes.map(c => c.hanzi);
  sessMode = "srs"; sessPractice = true; sessCalib = false;
  plan = []; planPos = 0;
  const parMot = Math.max(2, Math.min(CONSO_MODES.length, Math.floor(CONSO_MAX / cartes.length)));
  const items = [];
  cartes.forEach(c => {
    const modes = shuffle(CONSO_MODES.filter(m => {
      if (m === "phrase") return c.phrase && (c.mots || []).length >= 3;
      if (m === "ecoute") return !!window.speechSynthesis;
      return true;
    })).slice(0, parMot);
    modes.forEach(m => items.push({ card: c, track: m === "lecture" || m === "ecriture" ? "zi" : "son", mode: m }));
  });
  runQueue(spread(shuffle(items)).slice(0, CONSO_MAX));
  speak(" ");
  $("session").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  nextCard();
}
/* Fin de consolidation : les mots servis sortent de la liste du jour. Appelée
   par l'écran de fin (endSession, branche repassage). */
function consommerConso() {
  if (!consoMots || !state.faibles) { consoMots = null; return; }
  state.faibles.mots = (state.faibles.mots || []).filter(h => !consoMots.includes(h));
  consoMots = null;
  save();
}


