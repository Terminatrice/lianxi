/* ---------- Grammaire ----------
   Chaque fiche a sa propre progression (state.gram[id]), indépendante du vocabulaire :
   même moteur de répétition espacée, mais l'unité révisée est une structure, pas un mot.
   `vue` retient si la fiche a déjà été lue une fois : la première rencontre commence
   par l'explication, les suivantes attaquent directement l'exercice. */
const GRAM_SESSION_MAX = 12;
/* Fiches jamais abordées dont la place est réservée dans chaque entraînement.
   Les fiches ratées reviennent à un jour d'intervalle et se retrouvent en tête
   du tri par échéance : sans plancher, elles occupaient toute la session et on
   ne découvrait plus rien de nouveau (retour de Daphnée, 2026-08-20 : « j'ai
   l'impression de voir toujours la même chose »). */
const GRAM_NEUFS_MIN = 4;

function gramProg(id) {
  if (!state.gram) state.gram = {};
  if (!state.gram[id]) state.gram[id] = Object.assign(newTrack("gram"), { vue: false });
  migrateTrack(state.gram[id], "gram");
  return state.gram[id];
}
/* Le filtre par leçon a été retiré le 2026-08-21 : Daphnée ne s'en servait pas,
   et choisir sa leçon avant de s'entraîner revenait à décider soi-même ce qu'on
   doit réviser, ce que la planification fait mieux. L'entraînement vise
   maintenant, dans l'ordre : les points fragiles, puis les points neufs des
   leçons les plus récentes, puis le reste par échéance. */
/* Rang d'une leçon dans le programme : « HSK 2 · L1 » vient après « HSK 1 · L15 »,
   ce qu'un tri alphabétique fait exactement à l'envers. Plus le rang est élevé,
   plus la leçon est récente. */
function rangLecon(t) {
  const m = /HSK\s*(\d+).*?L(\d+)/.exec(t || "");
  return m ? +m[1] * 1000 + +m[2] : 0;
}
function gramDue() {
  /* Pistes créées d'abord, heure relevée ensuite : voir tonsDue(). */
  const prog = EMBED_GRAMMAR.map(p => ({ p, tr: gramProg(p.id) }));
  const now = Date.now();
  /* Trois priorités, dans cet ordre : ce qu'elle rate, puis ce qui vient de sa
     dernière leçon, puis le retard ordinaire. Le tri par seule échéance faisait
     remonter les fiches de la leçon 1 avant celles du cours de la semaine. */
  const score = x => x.tr.reviews && x.tr.errors ? 2 : !x.tr.reviews ? 1 : 0;
  return prog.filter(x => x.tr.due <= now)
    .sort((a, b) => score(b) - score(a)
      || (score(a) === 2 ? (b.tr.errors / b.tr.reviews) - (a.tr.errors / a.tr.reviews) : 0)
      || (score(a) === 1 ? rangLecon(b.p.theme) - rangLecon(a.p.theme) : 0)
      || a.tr.due - b.tr.due)
    .map(x => x.p);
}
/* Points fragiles : dès la première erreur, du plus raté au moins raté.
   Le seuil est volontairement bas : avec une cinquantaine de fiches, attendre
   deux passages retarderait trop le diagnostic. */
function gramWeak() {
  return EMBED_GRAMMAR
    .map(p => ({ p, g: gramProg(p.id) }))
    .filter(x => x.g.errors >= 1)
    .sort((a, b) => (b.g.errors / b.g.reviews) - (a.g.errors / a.g.reviews) || b.g.errors - a.g.errors)
    .slice(0, 10);
}
/* Synthèse dépliée d'un point fragile : la règle, le gabarit, le modèle et le
   contraste, c'est-à-dire exactement l'écran de première rencontre, à relire. */
let gramWeakCourants = [];
function gramWeakBodyHTML(x) {
  const p = x.p;
  const m = p.modele || p.exemples[0];
  if (p.regle && p.gabarit) {
    return `<div class="gram-regle">${glose(p.regle)}</div>
      ${gabaritHTML(p.gabarit)}
      <div class="gram-modele"><div class="ruby">${rubyHTML(m.hanzi)}</div><div class="fr">${esc(m.fr)}</div>
        <div class="audio-row"><button class="audio-btn" onclick="speak(${jsattr(m.hanzi)})" aria-label="Écouter">🔊</button></div></div>
      ${contrasteHTML(p.contraste)}`;
  }
  return `<div class="gram-struct">${rubyHTML(p.structure)}</div>
    <p style="margin:.4rem 0">${glose(p.explication)}</p>
    <div class="gram-ex"><div class="ruby">${rubyHTML(m.hanzi)}</div><div class="fr">${esc(m.fr)}</div></div>`;
}
function toggleGramWeak(i) {
  const el = $("gram-weak-" + i);
  if (!el) return;
  if (!el.innerHTML && gramWeakCourants[i]) el.innerHTML = gramWeakBodyHTML(gramWeakCourants[i]);
  const ouvert = el.classList.toggle("hidden") === false;
  const head = el.parentElement.querySelector(".weak-head");
  if (head) head.setAttribute("aria-expanded", ouvert);
}
function toggleFiche(id) {
  const el = $("fiche-" + id);
  if (!el) return;
  const ouvert = el.classList.toggle("hidden") === false;
  const head = el.parentElement.querySelector(".gram-head");
  if (head) head.setAttribute("aria-expanded", ouvert);
}
function renderGram() {
  if (!$("gram-list")) return;
  const due = gramDue();
  const faitG = jourEstFait("gram");
  $("gram-due-count").textContent = faitG ? "0" : due.length;
  $("gram-due-label").textContent = faitG ? "à travailler : entraînement du jour fait"
    : due.length === 1 ? "point à travailler" : "points à travailler";
  $("gram-start-btn").disabled = due.length === 0;
  $("gram-start-btn").textContent = faitG ? "M'entraîner quand même"
    : due.length > GRAM_SESSION_MAX
    ? `Entraînement grammaire (${GRAM_SESSION_MAX})` : "Entraînement grammaire";
  $("gram-no-due").style.display = due.length === 0 && !faitG ? "" : "none";

  /* Le total par niveau, pour que « 57 fiches » cesse d'être un mur : 46 points
     en HSK 1 se regardent en face, 57 tout court ne veulent rien dire. */
  /* Le filtre comparait « HSK 1 · L7 » à « 1 » : aucun thème ne commençait par
     le seul chiffre du niveau, et ce bloc restait vide en permanence. Le
     préfixe complet est celui déjà employé dans « Ton parcours ». */
  $("gram-niveaux").innerHTML = HSK_PLAN.map(n => {
    const f = EMBED_GRAMMAR.filter(p => (p.theme || "").startsWith("HSK " + n.cle));
    if (!f.length) return "";
    const sol = f.filter(p => estSolide(gramProg(p.id))).length;
    const vus = f.filter(p => gramProg(p.id).reviews).length;
    /* La projection est reprise ici, restreinte à la grammaire : c'est sur cet
       onglet qu'elle décide de faire un entraînement de plus ou pas. */
    const pr = projection(f.length - vus, (rythmeCalendaire(state.gramNeuves, 14) || {}).moy || 0);
    const eta = pr.fini ? " · toutes abordées"
      : pr.arret ? ""
      : ` · encore ${esc(dureeTexte(pr.jours))} à ce rythme`;
    return `<div class="pc-ligne"><span>${esc(n.titre)}</span>
      <span><strong>${vus}</strong> abordées sur ${f.length}${sol ? ` · ${sol} solides` : ""}${eta}</span></div>`;
  }).join("");

  /* Même principe que les mots à consolider : la ligne se déplie en synthèse
     (règle, gabarit, modèle, contraste) pour se remémorer en lisant, et un
     bouton relance un entraînement ciblé sur ces points-là. */
  const weak = gramWeak();
  gramWeakCourants = weak;
  $("gram-weak").innerHTML = weak.map((x, i) =>
    `<li class="weak-item"><button class="weak-head" onclick="toggleGramWeak(${i})" aria-expanded="false">
     <span class="w-mid"><span class="w-pinyin">${esc(x.p.titre)}</span><span class="w-theme">${esc(x.p.theme)}</span><br><span class="w-fr">${glose(x.p.regle || x.p.resume)}</span></span>
     <span class="w-err">manqué ${x.g.errors} sur ${x.g.reviews}</span></button>
     <div class="weak-body hidden" id="gram-weak-${i}"></div></li>`).join("");
  $("gram-weak-empty").style.display = weak.length ? "none" : "";
  $("gram-weak-btn").style.display = weak.length ? "" : "none";
  $("gram-export").style.display = weak.length ? "" : "none";

  $("gram-count").textContent = EMBED_GRAMMAR.length;
  /* Les fiches sont groupées par leçon, chaque groupe portant son avancement.
     Une liste plate de 57 fiches ne dit ni où on en est, ni par où reprendre. */
  const list = EMBED_GRAMMAR;
  const groupes = [];
  list.forEach(p => {
    let gr = groupes.find(x => x.theme === p.theme);
    if (!gr) groupes.push(gr = { theme: p.theme, fiches: [] });
    gr.fiches.push(p);
  });
  /* Ordre du programme, pas ordre du fichier : « HSK 1 · L2 » doit précéder
     « HSK 1 · L11 », ce qu'un tri alphabétique fait exactement à l'envers. */
  groupes.sort((a, b) => (rangLecon(a.theme) || 9e6) - (rangLecon(b.theme) || 9e6)
    || a.theme.localeCompare(b.theme));
  $("gram-list").innerHTML = groupes.map(gr => {
    const sol = gr.fiches.filter(p => estSolide(gramProg(p.id))).length;
    const vus = gr.fiches.filter(p => gramProg(p.id).reviews).length;
    const pct = Math.round(100 * sol / gr.fiches.length);
    const etat = sol === gr.fiches.length ? "leçon acquise"
      : sol ? `${sol} solide${sol > 1 ? "s" : ""} sur ${gr.fiches.length}`
      : vus ? `${vus} en cours sur ${gr.fiches.length}`
      : `${gr.fiches.length} à découvrir`;
    return `<div class="gram-groupe">
      <div class="pc-tete"><span class="pc-nom">${esc(gr.theme)}</span><span class="pc-pct">${esc(etat)}</span></div>
      ${barreHTML(pct)}
      ${gr.fiches.map(ficheHTML).join("")}
      <button class="btn secondary" onclick="startGramCible(${jsattr(gr.fiches.map(p => p.id))})">M'entraîner sur cette leçon</button>
    </div>`;
  }).join("");
}
/* État d'une fiche, en mots plutôt qu'en score. « 2/5 » se lit comme un bulletin
   et décourage ; ce qui aide, c'est de savoir où en est le point et quoi faire.
   Le palier « solide » se lit sur bestGap, jamais sur l'intervalle promis. */
function gramEtat(g) {
  if (!g.reviews) return { mot: "à découvrir", cls: "neuf" };
  if (estSolide(g)) return { mot: "solide", cls: "ok" };
  const taux = g.errors / g.reviews;
  if (taux >= 0.5) return { mot: "à reprendre", cls: "ko" };
  /* « connue » remplace « presque » : c'est le palier qu'elle a demandé à voir,
     et il se constate (elle a répondu juste) au lieu de se calculer. */
  if (estConnu(g)) return { mot: "connue", cls: "presque" };
  return { mot: "en cours", cls: "" };
}
function ficheHTML(p) {
  const g = gramProg(p.id);
  const e = gramEtat(g);
  const m = p.modele || p.exemples[0];
  /* Ce qui s'affiche replié : la fonction communicative, l'état, et la règle en
     une phrase. C'est ce qu'elle doit pouvoir retrouver sans rien déplier. */
  const tete = `<button class="gram-head" onclick="toggleFiche(${jsattr(p.id)})" aria-expanded="false">
      <span class="t">${esc(p.titre)}</span><span class="gram-score ${e.cls}">${e.mot}</span>
      <span class="r">${glose(p.regle || p.resume)}</span>
    </button>`;
  const exemples = p.exemples.map(x =>
    `<div class="gram-ex"><div class="ruby">${rubyHTML(x.hanzi)}</div>
       <button class="audio-btn" onclick="speak(${jsattr(x.hanzi)})" aria-label="Écouter">🔊</button>
       <div class="fr">${esc(x.fr)}</div></div>`).join("");
  const pieges = (p.pieges || []).length
    ? `<h4>Pièges</h4><ul>${p.pieges.map(x => `<li>${glose(x)}</li>`).join("")}</ul>` : "";
  const corps = p.regle && p.gabarit
    ? `${gabaritHTML(p.gabarit)}
       <div class="gram-modele">
         <div class="ruby">${rubyHTML(m.hanzi)}</div><div class="fr">${esc(m.fr)}</div>
         <div class="audio-row"><button class="audio-btn" onclick="speak(${jsattr(m.hanzi)})" aria-label="Écouter">🔊</button></div>
       </div>
       ${contrasteHTML(p.contraste)}
       <details class="gram-plus"><summary>Aller plus loin</summary>
         <p style="margin:.4rem 0">${glose(p.explication)}</p>${pieges}
         <h4>Autres exemples</h4>${exemples}
       </details>`
    : `<p style="margin:.3rem 0">${glose(p.explication)}</p>${pieges}<h4>Exemples</h4>${exemples}`;
  return `<div class="gram-item">${tete}
    <div class="gram-body hidden" id="fiche-${esc(p.id)}">${corps}
      <button class="btn" onclick="startGramCible(${jsattr([p.id])})">M'entraîner sur cette structure</button></div>
  </div>`;
}
function exportGram() {
  const weak = gramWeak();
  const lines = weak.map(x =>
    `- ${x.p.titre} (${x.p.structure}, ${x.p.theme}) : manqué ${x.g.errors} fois sur ${x.g.reviews}`);
  const text = `Points de grammaire fragiles exportés depuis mon app Liànxí (${todayKey()}). Retravaille-les en priorité à la prochaine leçon, fais-moi produire des phrases dessus, et note-les au carnet :\n${lines.join("\n")}`;
  copyText(text, $("gram-msg"), "Copié. Colle-le dans ta session Claude Code.");
}

/* Les fiches déclarées confusables (在/有, 不/没, 了 accompli / 了 de changement)
   ne doivent pas tomber dans la même session : la confusion s'installe justement
   quand on les rencontre côte à côte. */
function spreadGram(list) {
  const out = [], pool = [...list], recent = [];
  const clash = (a, b) => (a.confond || []).includes(b.id) || (b.confond || []).includes(a.id);
  while (pool.length) {
    let i = pool.findIndex(p => !recent.some(r => clash(r, p)));
    if (i < 0) i = 0;
    out.push(pool[i]); recent.unshift(pool[i]);
    if (recent.length > 4) recent.pop();
    pool.splice(i, 1);
  }
  return out;
}

/* ---------- Session de grammaire ---------- */
let gramQueue = [], gIndex = 0, gramErrors = [], gramOk = 0, gramTotal = 0;
let ordreLibre = [], ordreChoisi = [], qcmOrder = [];

/* Sélection des points de grammaire d'une session, avec le plancher de
   nouveauté. Extraite de startGramSession pour que la file mixte y puise la
   même chose que l'entraînement dédié. */
function gramSelection(maxi) {
  const max = maxi || GRAM_SESSION_MAX;
  /* Le ciblage par niveau de l'accueil vaut aussi pour la grammaire : cibler
     « HSK 2 » restreint aux règles de ce niveau. */
  let toutes = gramDue();
  if (curNiveau !== "all") toutes = toutes.filter(p => (p.theme || "").startsWith("HSK " + curNiveau));
  const neuves = toutes.filter(x => !gramProg(x.id).reviews);
  const revues = toutes.filter(x => gramProg(x.id).reviews);
  const tete = neuves.slice(0, Math.min(GRAM_NEUFS_MIN, neuves.length, max));
  return tete.concat(revues.concat(neuves.slice(tete.length)).slice(0, max - tete.length));
}
/* ---------- S'entraîner autrement (2026-08-22, demandes de Daphnée) ----------
   Après le cours de révision L1-5 : « je n'intègre pas bien les leçons de
   grammaire ». Trois modes libres, qui ne touchent JAMAIS à la planification
   (sessPractice) et ne mettent aucun compteur du jour à zéro :
   1. écouter les structures en boucle (les modèles, voix normale puis lente) ;
   2. la remise en ordre en série, façon Duolingo : douze exercices d'affilée,
      sans écran de fiche entre deux ;
   3. construire des phrases de zéro : production libre au clavier, sans
      banque de mots, parce qu'une liste de mots suggérés dispense de se
      rappeler les mots eux-mêmes. */

/* Fiches classées : les fragiles d'abord, puis les leçons les plus récentes. */
function fichesPrioritaires() {
  const weak = gramWeak().map(x => x.p);
  const recentes = EMBED_GRAMMAR.slice().sort((a, b) => rangLecon(b.theme) - rangLecon(a.theme));
  const out = [], vus = new Set();
  weak.concat(recentes).forEach(p => { if (!vus.has(p.id)) { vus.add(p.id); out.push(p); } });
  return out;
}

/* --- 1. Écoute en boucle --- */
let boucleOn = false, bouclePos = 0, boucleListe = [];
function boucleListeBuild() {
  const out = [];
  fichesPrioritaires().slice(0, 8).forEach(p => {
    const m = p.modele || p.exemples[0];
    out.push({ hanzi: m.hanzi, fr: m.fr, titre: p.titre });
    (p.exemples || []).slice(0, 1).forEach(x => {
      if (normHanzi(x.hanzi) !== normHanzi(m.hanzi)) out.push({ hanzi: x.hanzi, fr: x.fr, titre: p.titre });
    });
  });
  return out;
}
function toggleBoucle() {
  if (boucleOn) { stopBoucle(); return; }
  if (!window.speechSynthesis) return;
  boucleListe = boucleListeBuild();
  if (!boucleListe.length) return;
  boucleOn = true; bouclePos = 0;
  $("loop-btn").textContent = "⏹ Arrêter l'écoute";
  boucleSuivant();
}
function stopBoucle() {
  boucleOn = false;
  if (window.speechSynthesis) speechSynthesis.cancel();
  if ($("loop-btn")) $("loop-btn").textContent = "Écouter mes structures en boucle";
  if ($("loop-now")) $("loop-now").innerHTML = "";
}
function boucleSuivant() {
  if (!boucleOn) return;
  const it = boucleListe[bouclePos % boucleListe.length];
  bouclePos++;
  if ($("loop-now")) $("loop-now").innerHTML =
    `<div class="pc-note">${esc(it.titre)}</div>
     <div class="ruby" style="justify-content:center">${rubyHTML(it.hanzi)}</div>
     <div class="q-phrase-fr">${esc(it.fr)}</div>`;
  /* Chaque phrase passe deux fois, vitesse normale puis lente, avec une vraie
     pause avant la suivante : c'est le rythme du shadowing, pas du zapping. */
  const dire = (rate) => {
    const u = new SpeechSynthesisUtterance(it.hanzi);
    u.lang = "zh-CN"; if (zhVoice) u.voice = zhVoice; u.rate = rate;
    return u;
  };
  const u1 = dire(0.85), u2 = dire(0.6);
  u2.onend = () => { if (boucleOn) setTimeout(boucleSuivant, 1600); };
  speechSynthesis.cancel();
  speechSynthesis.speak(u1);
  speechSynthesis.speak(u2);
}

/* --- 2. Remise en ordre en série --- */
let drillExos = null, exoImpose = null;
const DRILL_MAX = 12;
function startDrillOrdre() {
  stopBoucle();
  const choisis = [];
  fichesPrioritaires().forEach(p => {
    if (choisis.length >= DRILL_MAX) return;
    const cand = exosDisponibles(p).filter(e => e.type === "ordre");
    if (cand.length) choisis.push({ p: p, ex: cand[Math.floor(Math.random() * cand.length)] });
  });
  if (!choisis.length) return;
  sessEnCours = true; if (state.reprise) { delete state.reprise; save(); }
  sessMode = "gram"; sessPractice = true; sessCalib = false; mixOn = false;
  gramQueue = choisis.map(x => x.p);
  drillExos = choisis.map(x => x.ex);
  gIndex = 0; gramTotal = gramQueue.length; gramErrors = []; gramOk = 0;
  exoCourant = null; exoImpose = null;
  speak(" ");
  $("session").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  nextGram();
}

/* --- 3. Construire des phrases de zéro --- */
const ATELIER_MAX = 10;
function startAtelier() {
  stopBoucle();
  /* Moitié production libre des fiches (consigne → elle écrit), moitié phrases
     du vocabulaire à écrire en entier depuis le français. Les mots fragiles et
     les fiches fragiles passent d'abord. */
  const prods = [];
  fichesPrioritaires().forEach(p => {
    if (prods.length >= ATELIER_MAX / 2) return;
    const cand = exosDisponibles(p).filter(e => e.type === "production");
    if (cand.length) prods.push({ kind: "gram", v: p, exo: cand[Math.floor(Math.random() * cand.length)] });
  });
  const tout = state.cards.filter(c => c.phrase && (c.mots || []).length >= 3
    && (c.mots || []).length <= 8);
  /* Les mots déjà croisés d'abord ; sur un profil neuf, on pioche partout
     plutôt que de rendre l'atelier vide. */
  const croisesPot = tout.filter(motCroise);
  const pot = croisesPot.length >= 5 ? croisesPot : tout;
  const cartes = [], vusC = new Set();
  weakItems().map(it => it.card).concat(shuffle(pot)).forEach(c => {
    if (c.phrase && (c.mots || []).length >= 3 && !vusC.has(c.hanzi)) { vusC.add(c.hanzi); cartes.push(c); }
  });
  const ecrites = cartes.slice(0, ATELIER_MAX - prods.length)
    .map(c => ({ kind: "srs", v: { card: c, track: "zi", mode: "construire" } }));
  const parts = prods.concat(ecrites);
  if (!parts.length) return;
  sessEnCours = true; if (state.reprise) { delete state.reprise; save(); }
  sessPractice = true; sessCalib = false;
  drillExos = null; exoImpose = null;
  mix = entrelacer(shuffle(parts)); mixPos = 0; mixOn = true;
  mixBilan = nouveauBilan();
  mixEcrit = 0; mixEcritDern = -99;
  sessErrors = []; sessSkipped = []; sessOk = 0;
  gramErrors = []; gramOk = 0; compErrors = []; compOk = 0; errErrors = []; errOk = 0;
  speak(" ");
  $("session").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  lancerMix();
}

/* Entraînement ciblé sur les points les moins maîtrisés (demande de Daphnée,
   2026-08-21) : la liste « À consolider », sans attendre leur échéance. Les
   réponses comptent normalement : retravailler un point fragile EST une
   révision, pas un repassage. */
function startGramWeakSession() {
  const weak = gramWeak().map(x => x.p);
  if (!weak.length) return;
  sessEnCours = true; if (state.reprise) { delete state.reprise; save(); }
  sessMode = "gram";
  gramQueue = spreadGram(shuffle(weak)).slice(0, GRAM_SESSION_MAX);
  gIndex = 0; gramTotal = gramQueue.length; gramErrors = []; gramOk = 0;
  exoCourant = null; drillExos = null; exoImpose = null;
  speak(" ");
  $("session").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  nextGram();
}
/* Entraînement ciblé sur une leçon ou une structure (2026-10-27, demande de
   Daphnée : « des structures que j'aimerais pratiquer, tu ne me les proposes
   jamais, même quand je sélectionne la leçon »). Les fiches se lisaient par
   leçon sans pouvoir être lancées, et la révision d'un cours ne servait qu'un
   exercice par règle. Chaque fiche reçoit ici plusieurs exercices différents,
   entrelacés d'une fiche à l'autre. Seul le premier passage de chaque fiche
   est noté : trois réussites coup sur coup sur la même règle n'engagent que la
   mémoire de travail, les compter l'enverrait à deux semaines sans preuve. */
const CIBLE_PAR_FICHE = 4, CIBLE_MAX = 14;
function startGramCible(ids) {
  const fiches = (ids || []).map(id => EMBED_GRAMMAR.find(p => p.id === id)).filter(Boolean);
  if (!fiches.length) return;
  stopBoucle();
  const par = Math.max(2, Math.min(CIBLE_PAR_FICHE, Math.floor(CIBLE_MAX / fiches.length)));
  const tours = shuffle(fiches).map(p => {
    const autres = shuffle(exosDisponibles(p).filter(e => TYPES_ORDRE.indexOf(e.type) >= 0));
    return [{ kind: "gram", v: p }]
      .concat(autres.slice(0, par - 1).map(e => ({ kind: "gram", v: p, exo: e, libre: true })));
  });
  const parts = [];
  for (let i = 0; tours.some(t => t[i]); i++) tours.forEach(t => { if (t[i]) parts.push(t[i]); });
  startMix(parts, true, true);
}
function startGramSession() {
  sessEnCours = true; if (state.reprise) { delete state.reprise; save(); }
  const due = gramSelection();
  if (!due.length) return;
  sessMode = "gram";
  gramQueue = spreadGram(shuffle(due));
  gIndex = 0; gramTotal = gramQueue.length; gramErrors = []; gramOk = 0;
  exoCourant = null; drillExos = null; exoImpose = null;
  speak(" "); // amorce iOS
  $("session").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  nextGram();
}
function nextGram(forceExo) {
  if (window.speechSynthesis) speechSynthesis.cancel();
  stopRecog(); // une dictée en cours ne doit pas remplir le champ de l'exercice suivant
  if (gIndex >= gramQueue.length) { endGramSession(); return; }
  const p = gramQueue[gIndex], g = gramProg(p.id);
  $("sess-track").textContent = "📐";
  $("know-btn").classList.add("hidden");
  majProgres(gIndex, gramTotal);
  /* En drill ou en atelier, l'exercice est imposé d'avance : pas d'écran de
     fiche, on enchaîne directement, façon série d'exercices. */
  if (!g.vue && !forceExo && !drillExos && !exoImpose) { $("card-zone").innerHTML = gramLearnHTML(p); return; }
  /* Le tirage n'a lieu qu'ici, et l'exercice choisi est mémorisé. Sans ça, la
     correction rappelait exoFor et pouvait tomber sur un autre exercice que
     celui affiché, puisque le tirage comporte une part d'aléatoire. */
  const ex = exoCourant = drillExos ? drillExos[gIndex] : (exoImpose || exoFor(p, g));
  exoImpose = null;
  ordreLibre = []; ordreChoisi = [];
  $("card-zone").innerHTML =
    `<span class="mode-tag">📐 ${esc(p.titre)}</span>` + exoHTML(p, ex);
  if (ex.type === "ordre" || ex.type === "transformation") renderOrdre(ex);
}
/* Première rencontre : on lit la fiche avant de s'entraîner dessus */
/* Gabarit : une colonne par bloc de la structure, la fonction en français
   au-dessus, les caractères, le pinyin. Les mots-outils fixes (是 有 不 没 了)
   restent en caractères et prennent la couleur d'accent : ce sont les rares
   hanzi qu'elle a intérêt à finir par reconnaître d'un coup d'œil. */
function gabaritHTML(g) {
  if (!g || !g.length) return "";
  return `<div class="gab">${g.map(s => `<div class="gab-col${s.fixe ? " fixe" : ""}">
      <div class="gab-lab">${s.fixe ? "&nbsp;" : esc(s.label || "")}</div>
      <div class="gab-zh hanzi">${esc(s.hanzi)}</div>
      <div class="gab-py">${renderPinyin(s.pinyin)}</div>
    </div>`).join("")}</div>`;
}
/* Sur une règle de prononciation (le ton de 不, celui de 一, le 一 lu yāo dans
   les numéros), les deux phrases s'écrivent avec les mêmes caractères et ne
   diffèrent que par le son. L'annotation automatique irait chercher le pinyin
   du dictionnaire et afficherait donc, sous la version fautive, la prononciation
   correcte : exactement le contraire de ce que la fiche enseigne. Ces fiches
   fournissent alors leur pinyin à la main. */
function ctLigne(sens, marque, hanzi, pinyin) {
  return `<div class="ct ${sens}"><span class="ct-m">${marque}</span>` + (pinyin
    ? `<span class="ruby"><span class="pyseg"><span class="hanzi">${esc(hanzi)}</span><span class="pysub">${renderPinyin(pinyin)}</span></span></span>`
    : `<span class="ruby">${rubyHTML(hanzi)}</span>`) + `</div>`;
}
function contrasteHTML(c) {
  if (!c || !c.length) return "";
  return c.map(x => `<div class="contraste">
      ${ctLigne("ok", "✓", x.ok, x.ok_pinyin)}
      ${ctLigne("ko", "✕", x.ko, x.ko_pinyin)}
      <div class="ct-why">${glose(x.pourquoi)}</div>
    </div>`).join("");
}
/* Première rencontre. Format court : une règle, un gabarit, un modèle, un
   contraste. L'explication longue et les pièges rédigés restent consultables
   dans l'onglet Grammaire, ils ne sont plus imposés en pleine session. */
function gramLearnHTML(p) {
  if (p.regle && p.gabarit) {
    const m = p.modele || p.exemples[0];
    return `<div class="qcard" style="text-align:left">
      <div class="gram-titre">${esc(p.titre)}</div>
      ${gabaritHTML(p.gabarit)}
      <div class="gram-modele">
        <div class="ruby">${rubyHTML(m.hanzi)}</div>
        <div class="fr">${esc(m.fr)}</div>
        <div class="audio-row"><button class="audio-btn" onclick="speak(${jsattr(m.hanzi)})" aria-label="Écouter l'exemple">🔊</button></div>
      </div>
      <div class="gram-regle">${glose(p.regle)}</div>
      ${contrasteHTML(p.contraste)}
      <button class="btn" onclick="startExo()">S'entraîner</button>
    </div>`;
  }
  /* Fiches pas encore migrées : ancien format, avec le pinyin sous les exemples */
  const ex = p.exemples.map(e =>
    `<div class="gram-ex"><div class="ruby">${rubyHTML(e.hanzi)}</div>
      <button class="audio-btn" onclick="speak(${jsattr(e.hanzi)})" aria-label="Écouter l'exemple">🔊</button>
      <div class="fr">${esc(e.fr)}</div></div>`).join("");
  return `<div class="qcard" style="text-align:left">
      <div class="gram-titre">${esc(p.titre)}</div>
      <div class="gram-struct">${rubyHTML(p.structure)}</div>
      <p style="margin:.2rem 0;font-size:1.06rem">${glose(p.explication)}</p>
      ${(p.pieges || []).length ? `<div class="expl"><strong>Pièges :</strong><ul style="margin:.3rem 0;padding-left:1.1rem">${p.pieges.map(x => `<li>${glose(x)}</li>`).join("")}</ul></div>` : ""}
      ${ex}
      <button class="btn" onclick="startExo()">S'entraîner</button>
    </div>`;
}
function startExo() {
  gramProg(gramQueue[gIndex].id).vue = true;
  save();
  nextGram(true);
}
function exoHTML(p, ex) {
  if (ex.type === "qcm") {
    /* Chaque morceau de chinois est rendu avec son pinyin sous les caractères.
       Sans ça, une débutante qui lit mal les hanzi ne peut simplement pas faire
       l'exercice : elle devine au lieu de raisonner sur la structure. */
    const phrase = ex.phrase.split("___")
      .map(seg => seg ? `<span class="ruby">${rubyHTML(seg)}</span>` : "")
      .join(`<span class="blank">?</span>`);
    /* Les options sont mélangées à chaque affichage : sinon la bonne réponse,
       toujours écrite en premier dans les données, se repère sans réfléchir. */
    qcmOrder = shuffle(ex.options.map((o, i) => i));
    return `<div class="qcard">
      <div class="q-prompt">${esc(ex.consigne || "Complète la phrase")}</div>
      <div class="gram-q">${phrase}</div>
      ${ex.fr ? `<div class="q-phrase-fr">« ${esc(ex.fr)} »</div>` : ""}
      <div class="opts" id="opts">${qcmOrder.map((real, pos) =>
        `<button onclick="answerQcm(${pos})"><span class="ruby">${rubyHTML(ex.options[real])}</span></button>`).join("")}</div>
      <div id="answer-zone" class="hidden"></div>
    </div><div id="grades-slot"></div>`;
  }
  if (ex.type === "ordre") {
    const n = (ex.intrus || []).length;
    return `<div class="qcard">
      <div class="q-prompt">${esc(ex.consigne || "Remets la phrase dans l'ordre")}${
        n ? ` <strong>${n} morceau${n > 1 ? "x" : ""} en trop.</strong>` : ""}</div>
      ${ex.fr ? `<div class="q-fr">« ${esc(ex.fr)} »</div>` : ""}
      <div class="drop" id="drop"></div>
      <div class="segs" id="segs"></div>
      <div id="reveal-zone"><button class="btn secondary" onclick="checkOrdre()">Vérifier</button></div>
      <div id="answer-zone" class="hidden"></div>
    </div><div id="grades-slot"></div>`;
  }

  /* Transformation : une phrase de départ, une consigne d'une ligne, et elle
     recompose. C'est le type qui vérifie qu'elle manipule la structure, ce
     qu'aucun QCM ne fait. */
  if (ex.type === "transformation") {
    return `<div class="qcard">
      <div class="ruby">${rubyHTML(ex.depart)}</div>
      <div class="q-phrase-fr">« ${esc(ex.depart_fr)} »</div>
      <div class="q-prompt"><strong>${esc(ex.consigne)}</strong></div>
      <div class="drop" id="drop"></div>
      <div class="segs" id="segs"></div>
      <div id="reveal-zone"><button class="btn secondary" onclick="checkOrdre()">Vérifier</button></div>
      <div id="answer-zone" class="hidden"></div>
    </div><div id="grades-slot"></div>`;
  }

  /* Production libre, vérifiée par contraintes plutôt que par comparaison de
     chaîne : elle écrit ce qu'elle veut, l'app contrôle que la structure visée
     est présente. Le verdict porte sur la structure, jamais sur « ta phrase
     est correcte » : d'autres formulations justes existent. */
  if (ex.type === "production") {
    return `<div class="qcard">
      <div class="q-prompt"><strong>${esc(ex.consigne)}</strong></div>
      <input class="answer" id="write-input" lang="zh-CN" autocomplete="off"
             autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done">
      ${dicterHTML()}
      <div id="reveal-zone"><button class="btn secondary" onclick="checkProduction()">Vérifier</button></div>
      <div id="answer-zone" class="hidden"></div>
    </div><div id="grades-slot"></div>`;
  }
  return `<div class="qcard">
      <div class="q-prompt">Traduis en chinois, à voix haute puis dans ta tête</div>
      <div class="q-fr">« ${esc(ex.fr)} »</div>
      ${ex.indice ? `<div class="q-prompt">Indice <span class="ruby">${rubyHTML(ex.indice)}</span></div>` : ""}
      <div id="reveal-zone"><button class="btn secondary" onclick="revealTrad()">Révéler</button></div>
      <div id="answer-zone" class="hidden">
        <div class="ruby">${rubyHTML(ex.reponse)}</div>
        <div class="q-pinyin" style="font-size:1.15rem">${renderPinyin(ex.pinyin)}</div>
        <div><button class="audio-btn" onclick="speak(${jsattr(ex.reponse)})">🔊 Écouter</button>
             <button class="audio-btn" onclick="speak(${jsattr(ex.reponse)}, 0.55)">🐢 Lent</button></div>
        <div class="expl">${glose(ex.explication)}</div>
      </div>
    </div>${gradesHTML()}`;
}
/* Les exercices tournent à chaque passage. Le décalage de départ dépend de l'identifiant
   de la fiche : sans lui, chaque première rencontre tomberait sur un QCM et la session
   d'ouverture serait toujours du même format. */
/* Progression par stade. Le tirage précédent, `(reviews + seed) % length`,
   ramenait le même QCM au quatrième passage, si bien que c'est l'item qui se
   mémorisait, pas la structure.
   Depuis le 2026-08-20, la rotation ne contient plus que des formats où elle
   PLACE les mots : remise en ordre, transformation, production. Les QCM et les
   traductions sont sortis du tirage automatique et ne servent plus que de
   secours pour une fiche qui n'aurait rien d'autre. Demande de Daphnée : la
   reconnaissance du vocabulaire lui est acquise, ce qui lui coûte c'est l'ordre
   des mots, et chaque écran de reconnaissance retarde le seul travail utile. */
const STADES = ["ordre", "transformation", "ordre", "production", "transformation"];
const TYPES_ORDRE = ["ordre", "transformation", "production"];
/* Cible d'un exercice : la phrase qu'il fait produire. Sert à ne pas resservir
   deux fois de suite la même phrase sur une fiche. */
function cibleExo(e) { return normHanzi(e.reponse || e.modele || ""); }
/* Leurres réutilisables d'une fiche : ceux déjà écrits pour ses exercices d'ordre
   et les mauvaises options de ses QCM. Ce sont des distracteurs choisis pour
   cette règle-là, donc bien meilleurs qu'un mot pris au hasard. On écarte les
   options qui sont des phrases entières : un leurre doit avoir la taille d'un
   bloc, sinon il se repère sans réfléchir. */
function intrusPour(p, cible) {
  const vus = [], out = [];
  (p.exercices || []).forEach(e => {
    (e.intrus || []).forEach(x => vus.push(x));
    if (e.type === "qcm") (e.options || []).forEach((o, i) => { if (i !== e.reponse) vus.push(o); });
  });
  vus.forEach(x => {
    const h = normHanzi(x);
    if (h && h.length <= 3 && cible.indexOf(h) < 0 && out.indexOf(x) < 0) out.push(x);
  });
  return shuffle(out).slice(0, 2);
}
/* Une substitution devient un assemblage en UN SEUL temps. Version précédente :
   étape 1, choisir la valeur de chaque bloc ; étape 2, remettre dans l'ordre.
   L'étape 1 ne testait que la reconnaissance des mots et retardait l'assemblage.
   Les mauvaises valeurs des options deviennent les leurres : le choix du mot se
   joue maintenant DANS l'assemblage, au lieu d'être réglé avant lui.
   Une fiche dont le gabarit ne reconstitue pas la réponse n'a pas d'ordre
   vérifiable : sa substitution est simplement écartée du tirage. */
function subEnOrdre(p, ex) {
  const g = (p.gabarit || []).filter(x => x.fixe || ex.slots[x.role]);
  if (g.length < 2) return null;
  const segments = g.map(x => x.fixe ? x.hanzi : ex.slots[x.role]);
  if (normHanzi(segments.join("")) !== normHanzi(ex.reponse)) return null;
  const bons = segments.map(normHanzi);
  const intrus = [];
  Object.keys(ex.options || {}).forEach(r => {
    const mauvais = (ex.options[r] || []).filter(v =>
      bons.indexOf(normHanzi(v)) < 0 && normHanzi(ex.reponse).indexOf(normHanzi(v)) < 0);
    if (mauvais.length) intrus.push(mauvais[Math.floor(Math.random() * mauvais.length)]);
  });
  return { type: "ordre", consigne: ex.consigne, fr: ex.fr || "",
    segments: segments, intrus: shuffle(intrus).slice(0, 2),
    reponse: ex.reponse, pinyin: ex.pinyin, explication: ex.explication };
}
/* Les exercices fabriqués depuis les `exemples` de la fiche ont été retirés le
   2026-08-21. Ils visaient la monotonie, ils l'ont aggravée : un exemple est
   affiché sur la fiche d'apprentissage juste avant l'exercice, et le remettre
   dans l'ordre ne demande alors plus que de recopier ce qu'on vient de lire.
   Retour de Daphnée : « les exercices reprennent exactement les phrases
   exemples, du coup c'est trop facile ». La variété vient désormais des 114
   phrases d'entraînement écrites dans grammar.json, qui appliquent la structure
   de chaque fiche avec d'autres mots de son vocabulaire. */
/* Le catalogue réel d'une fiche : ses exercices, substitutions déjà converties
   en assemblage, plus les phrases tirées de ses exemples. */
function exosDisponibles(p) {
  const out = [];
  (p.exercices || []).forEach(e => {
    const c = e.type === "substitution" ? subEnOrdre(p, e) : e;
    if (c) out.push(c);
  });
  return out;
}
/* Phrases que la fiche montre : exemples, modèle, versions correctes des
   contrastes. Un exercice bâti sur l'une d'elles se résout de mémoire. */
function phrasesMontrees(p) {
  if (p._montrees) return p._montrees;
  const v = (p.exemples || []).map(x => normHanzi(x.hanzi));
  if (p.modele) v.push(normHanzi(p.modele.hanzi));
  (p.contraste || []).forEach(c => v.push(normHanzi(c.ok)));
  return (p._montrees = v);
}
function exoFor(p, g) {
  const dispo = exosDisponibles(p);
  const prod = dispo.filter(e => TYPES_ORDRE.indexOf(e.type) >= 0);
  const pool = prod.length ? prod : dispo;
  /* Préférence pour les phrases inédites, appliquée À L'INTÉRIEUR d'un type et
     jamais entre types. Appliquée globalement, elle vidait la rotation : les 114
     phrases neuves sont toutes des remises en ordre, si bien que transformation
     et production, qui travaillent forcément sur la phrase de la fiche,
     disparaissaient du tirage. */
  const inedit = e => phrasesMontrees(p).indexOf(cibleExo(e)) < 0;
  const preferer = list => {
    const neufs = list.filter(inedit);
    return neufs.length ? neufs : list;
  };
  const r = g.reviews || 0;
  let choix = null;
  if (r < STADES.length) {
    const voulu = preferer(pool.filter(e => e.type === STADES[r]));
    if (voulu.length) choix = voulu[r % voulu.length];
  }
  if (!choix) {
    /* Au-delà des premiers stades, on vise le type le plus raté : placer sans
       produire est exactement la définition d'une tournure mal intégrée. */
    const parType = g.parType || {};
    const scores = pool.map(e => {
      const t = parType[e.type] || { ok: 0, ko: 0 };
      return { e: e, taux: t.ok + t.ko ? t.ko / (t.ok + t.ko) : 0.5 };
    }).sort((a, b) => b.taux - a.taux);
    const tete = scores.filter(x => x.taux >= scores[0].taux - 0.01);
    const vise = tete[Math.floor(Math.random() * tete.length)].e.type;
    const memeType = preferer(pool.filter(e => e.type === vise));
    choix = memeType[Math.floor(Math.random() * memeType.length)];
  }
  /* Jamais la même phrase deux fois de suite sur une fiche. C'est ce qui donnait
     l'impression de tourner en rond : les exercices d'une même fiche partagent
     très souvent leur phrase cible, et seul l'habillage changeait. */
  if (g.dernier && cibleExo(choix) === g.dernier) {
    const autres = pool.filter(e => cibleExo(e) !== g.dernier);
    if (autres.length) choix = autres[Math.floor(Math.random() * autres.length)];
  }
  return choix;
}
let exoCourant = null;
function curExo() {
  if (exoCourant) return exoCourant;
  const p = gramQueue[gIndex];
  return exoCourant = exoFor(p, gramProg(p.id));
}
function answerQcm(pos) {
  const ex = curExo(), ok = qcmOrder[pos] === ex.reponse;
  const opts = $("opts");
  [...opts.children].forEach(b => b.disabled = true);
  opts.children[pos].classList.add(ok ? "good" : "bad");
  if (!ok) opts.children[qcmOrder.indexOf(ex.reponse)].classList.add("good");
  const plein = ex.phrase.replace("___", ex.options[ex.reponse]);
  $("answer-zone").innerHTML =
    `<div class="verdict ${ok ? "ok" : "ko"}">${ok ? "✓ Correct" : "✕ Pas celle-là"}</div>
     <div class="ruby">${rubyHTML(plein)}</div>
     <div class="q-pinyin" style="font-size:1.1rem">${renderPinyin(ex.pinyin)}</div>
     <div class="q-phrase-fr">${esc(ex.fr)}</div>
     <div><button class="audio-btn" onclick="speak(${jsattr(plein)})">🔊 Écouter</button></div>
     <div class="expl">${glose(ex.explication)}</div>`;
  $("answer-zone").classList.remove("hidden");
  autoGradeGram(ok);
  $("grades-slot").innerHTML = nextOnlyGramHTML();
  speak(plein);
}
function renderOrdre(ex) {
  if (!ordreLibre.length && !ordreChoisi.length) {
    /* Les intrus sont mêlés aux segments utiles : sans eux, une remise en ordre
       se résout par élimination, sans rien savoir de la structure. */
    const tout = ex.segments.concat(ex.intrus || []);
    ordreLibre = shuffle(tout.map((s, i) => ({ s, i })));
  }
  const drop = $("drop"), segs = $("segs");
  if (!drop || !segs) return;
  drop.innerHTML = ordreChoisi.length
    ? ordreChoisi.map((it, k) => `<button onclick="ordreRetirer(${k})"><span class="ruby">${rubyHTML(it.s)}</span></button>`).join("")
    : `<span class="ph">Touche les mots dans le bon ordre</span>`;
  segs.innerHTML = ordreLibre.map((it, k) =>
    `<button onclick="ordreAjouter(${k})"><span class="ruby">${rubyHTML(it.s)}</span></button>`).join("");
}
function ordreAjouter(k) {
  ordreChoisi.push(ordreLibre[k]);
  ordreLibre.splice(k, 1);
  renderOrdre(curExo());
}
function ordreRetirer(k) {
  ordreLibre.push(ordreChoisi[k]);
  ordreChoisi.splice(k, 1);
  renderOrdre(curExo());
}
/* La substitution en deux temps (choisir les mots, puis les ordonner) a été
   retirée le 2026-08-20. Elle est convertie en assemblage direct par
   `subEnOrdre` : voir le commentaire de cette fonction. */

/* ---- Production libre sous contraintes ---- */
function checkProduction() {
  clorePrise();
  avecSaisie(brut => jugerProduction(brut), (curExo() || {}).modele);
}
function jugerProduction(brut) {
  const ex = curExo(), a = ex.attendu || {};
  const saisi = normHanzi(brut);
  const manque = (a.contient || []).filter(x => !saisi.includes(normHanzi(x)));
  const fautif = (a.interdit || []).filter(x => saisi.includes(normHanzi(x)));
  /* L'ordre se vérifie comme une sous-séquence : les éléments attendus doivent
     apparaître dans cet ordre, sans exiger qu'ils se suivent. */
  let pos = -1, ordreOk = true;
  (a.ordre || []).forEach(x => {
    const i = saisi.indexOf(normHanzi(x), pos + 1);
    if (i < 0 || i <= pos) ordreOk = false; else pos = i;
  });
  const ok = !manque.length && !fautif.length && ordreOk;
  $("reveal-zone").classList.add("hidden");
  const diag = ok ? "" :
    (fautif.length ? `<div>À éviter ici : <span class="hanzi">${fautif.map(esc).join(" ")}</span></div>` : "") +
    (manque.length ? `<div>Il manque : <span class="hanzi">${manque.map(esc).join(" ")}</span></div>` : "") +
    (ordreOk ? "" : `<div>Les éléments ne sont pas dans le bon ordre.</div>`);
  $("answer-zone").innerHTML =
    `<div class="verdict ${ok ? "ok" : "ko"}">${ok ? "✓ La structure est bonne" : "✕ La structure n'y est pas"}</div>
     ${diag}
     <div class="q-prompt">Un modèle possible :</div>
     <div class="ruby">${rubyHTML(ex.modele)}</div>
     <div class="q-pinyin" style="font-size:1.1rem">${renderPinyin(ex.modele_pinyin)}</div>
     <div class="audio-row"><button class="audio-btn" onclick="speak(${jsattr(ex.modele)})" aria-label="Écouter">🔊</button></div>
     <div class="expl">${glose(ex.explication)}</div>`;
  $("answer-zone").classList.remove("hidden");
  autoGradeGram(ok);
  $("grades-slot").innerHTML = nextOnlyGramHTML();
  speak(ex.modele);
}

function checkOrdre() {
  const ex = curExo();
  const got = normHanzi(ordreChoisi.map(it => it.s).join(""));
  const want = normHanzi(ex.reponse);
  const ok = got === want;
  $("reveal-zone").classList.add("hidden");
  $("segs").innerHTML = "";
  [...$("drop").children].forEach(b => { if (b.tagName === "BUTTON") b.disabled = true; });
  $("answer-zone").innerHTML =
    `<div class="verdict ${ok ? "ok" : "ko"}">${ok ? "✓ Correct" : "✕ Pas dans cet ordre"}</div>
     <div class="ruby">${rubyHTML(ex.reponse)}</div>
     <div class="q-pinyin" style="font-size:1.1rem">${renderPinyin(ex.pinyin)}</div>
     <div><button class="audio-btn" onclick="speak(${jsattr(ex.reponse)})">🔊 Écouter</button>
          <button class="audio-btn" onclick="speak(${jsattr(ex.reponse)}, 0.55)">🐢 Lent</button></div>
     <div class="expl">${glose(ex.explication)}</div>`;
  $("answer-zone").classList.remove("hidden");
  autoGradeGram(ok);
  $("grades-slot").innerHTML = nextOnlyGramHTML();
  speak(ex.reponse);
}
function revealTrad() {
  reveal();
  speak(curExo().reponse);
}
/* QCM et remise en ordre : l'app connaît la bonne réponse, elle note toute seule.
   Seule la traduction reste auto-évaluée, faute de pouvoir juger une production libre. */
function autoGradeGram(ok) {
  const p = gramQueue[gIndex], pr = gramProg(p.id);
  pr.vue = true;
  noteGramPassage(pr, curExo());
  noteType(pr, curExo().type, ok);
  schedule(pr, ok, "gram");
  compterPassage();
  if (ok) gramOk++;
  else if (!gramErrors.includes(p)) gramErrors.push(p);
  noterMix(ok, p.titre);
  save();
}
function advanceGram() { exoCourant = null; gIndex++; nextGram(); }
function nextOnlyGramHTML() {
  return `<div class="grades" id="grades" style="grid-template-columns:1fr">
    <button class="g-good" onclick="advanceGram()">Suivant ›</button>
  </div>`;
}
/* Réussite et échec comptés par type d'exercice : une fiche réussie en QCM et
   ratée en production signale qu'elle reconnaît la structure sans la produire. */
/* Dernière phrase travaillée sur la fiche, et première rencontre datée.
   La première sert à varier les phrases d'un passage à l'autre ; la seconde
   alimente le rythme de découverte des règles, sans lequel aucune projection
   d'échéance n'est possible côté grammaire. */
function noteGramPassage(pr, ex) {
  if (!pr.reviews) {
    if (!state.gramNeuves) state.gramNeuves = {};
    const k = todayKey();
    state.gramNeuves[k] = (state.gramNeuves[k] || 0) + 1;
  }
  pr.dernier = cibleExo(ex);
}
function noteType(pr, type, ok) {
  if (!pr.parType) pr.parType = {};
  const s = pr.parType[type] || (pr.parType[type] = { ok: 0, ko: 0 });
  s[ok ? "ok" : "ko"]++;
}
function gradeGram(g) {
  const p = gramQueue[gIndex], pr = gramProg(p.id);
  pr.vue = true;
  noteGramPassage(pr, curExo());
  noteType(pr, curExo().type, g !== 0);
  schedule(pr, g !== 0, "gram");
  compterPassage();
  if (g !== 0) gramOk++;
  else if (!gramErrors.includes(p)) gramErrors.push(p);
  noterMix(g !== 0, p.titre);
  save();
  exoCourant = null;
  gIndex++;
  nextGram();
}
function endGramSession() {
  if (mixOn) { avancerMix(); return; }
  sessEnCours = false;
  /* Un drill libre (remise en ordre en série) ne compte pas comme la dose du
     jour : seul un entraînement planifié met le compteur à zéro. */
  if (!sessPractice) { faitJour().gram = true; save(); }
  drillExos = null;
  $("prog-bar").style.width = "100%";
  $("prog-txt").textContent = "";
  const list = gramErrors.length
    ? `<hr class="divider"><div class="end-list"><strong>À reprendre :</strong>
       <ul class="words">${gramErrors.map(p =>
         `<li><span class="w-mid"><span class="w-pinyin">${esc(p.titre)}</span><br><span class="w-fr">${esc(p.structure)}</span></span></li>`).join("")}</ul></div>`
    : `<p class="q-fr">Sans faute sur la grammaire. 太棒了 tài bàng le !</p>`;
  $("card-zone").innerHTML = `<div class="qcard">
      <div class="q-hanzi hanzi">语法</div>
      <div class="q-pinyin">${renderPinyin("yǔfǎ")}</div>
      <div class="q-fr">Entraînement terminé : ${gramOk} / ${gramTotal}.</div>
      ${list}
      ${boutonFin()}
    </div>`;
}

