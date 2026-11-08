/* ---------- Onglets & rendu ---------- */
let curTab = "home";
function showTab(t) {
  curTab = t;
  ["home", "cours", "comp", "gram", "voix", "dico", "words"].forEach(k => {
    $("view-" + k).classList.toggle("hidden", t !== k);
    $("tab-" + k).setAttribute("aria-selected", t === k);
  });
  if (t === "dico") { renderDico(); renderChengyu(); }
  else if (t === "voix") renderVoix();
  else if (t === "gram") renderGram();
  else if (t === "cours") renderCours();
  else if (t === "comp") renderComp();
  else render();
}
/* Deux volets étanches. Le vocabulaire du cours et celui de la veille IA n'ont
   ni le même rythme ni le même usage : les mélanger dans une même file faisait
   remonter 芯片 au milieu d'une révision de la leçon 7. On révise l'un ou
   l'autre, jamais les deux ensemble. */
let curVolet = "all";
/* Quatre volets étanches, pour séparer ce qui se révise de ce qui s'apprend :
   ce qu'elle a vu en cours, les expressions de la conversation courante, le
   HSK 2 pris en avance sur son prof, et sa veille sur l'IA. Sans cette
   séparation, 126 mots jamais abordés en cours venaient se mêler aux révisions
   et brouillaient la lecture de son avancement.
   Les expressions ont quitté « Vu en cours » le 2026-08-17 : elles ne viennent
   pas du programme, elles s'emploient et se révisent autrement, et noyées dans
   la file du cours elles ne remontaient presque jamais. */
const VOLETS = [
  { cle: "cours", nom: "Vu en cours" },
  { cle: "expr", nom: "Expressions" },
  { cle: "avance", nom: "HSK en avance" },
  { cle: "info", nom: "Veille IA" },
  { cle: "combi", nom: "Mots assemblés" },
];
function voletDe(c) {
  if (c.theme === "Informatique") return "info";
  if (c.theme === "Expressions") return "expr";
  if (c.theme === "Combinaisons") return "combi";
  if ((c.theme || "").indexOf("à venir") >= 0) return "avance";
  return "cours";
}
/* « Tout » est l'état par défaut depuis le 2026-08-21. Les volets cloisonnaient
   la session : 189 mots sur 392 vivaient dans des volets que la session du jour
   ne touchait jamais, et les Expressions étaient à 0 croisé sur 24. Ils ne
   servent plus qu'à cibler volontairement un sujet. */
function voletMatch(c) { return curVolet === "all" || voletDe(c) === curVolet; }
function setVolet(v) { curVolet = v; curTheme = "all"; render(); }
/* ---- Ciblage par niveau HSK (2026-08-22, demande de Daphnée : « je ne vois
   plus passer les mots du HSK 2 ») ----
   Depuis le chargement du HSK 3 complet, les mots « HSK 2 à venir » se noient
   dans le volet « HSK en avance ». Le niveau d'un mot se lit sur le
   RÉFÉRENTIEL officiel (EMBED_HSK), pas sur le thème : un mot du niveau 2
   appris via une leçon ou la veille reste un mot du niveau 2. Le thème ne sert
   que de repli pour les mots hors référentiel. */
let curNiveau = "all";
let NIVEAU_SETS = null;
function niveauDe(c) {
  if (!NIVEAU_SETS) {
    NIVEAU_SETS = {};
    Object.keys(EMBED_HSK).forEach(k => { NIVEAU_SETS[k] = new Set(EMBED_HSK[k]); });
  }
  for (const k of Object.keys(NIVEAU_SETS)) { if (NIVEAU_SETS[k].has(c.hanzi)) return k; }
  const m = /^HSK\s*(\d)/.exec(c.theme || "");
  return m ? m[1] : "autre";
}
function niveauMatch(c) { return curNiveau === "all" || niveauDe(c) === curNiveau; }
/* Les mots que le ciblage d'un niveau propose réellement. Sert à la fois à la
   puce et au bloc de parcours, pour que les deux ne puissent plus diverger. */
function motsDuNiveau(cle) { return state.cards.filter(c => niveauDe(c) === cle); }
function setNiveau(n) { curNiveau = n; render(); }
function themeMatch(c) { return niveauMatch(c) && voletMatch(c) && (curTheme === "all" || (c.theme || "Général") === curTheme); }
/* Pistes jamais testées, pour le passage de mise à jour. Elles ne passent pas
   par le quota de nouveautés : le but est justement de balayer vite. */
function calibMots() {
  return state.cards.filter(c => themeMatch(c) &&
    TRACKS.some(t => trackMatch(t) && c[t] && !c[t].reviews));
}
function calibItems(mots) {
  const out = [];
  (mots || calibMots()).forEach(c => {
    TRACKS.forEach(t => { if (trackMatch(t) && c[t] && !c[t].reviews) out.push({ card: c, track: t }); });
  });
  return out;
}
function trackMatch(t) { return curTrack === "all" || curTrack === t; }
/* Une « carte due » est désormais un couple (mot, piste) : un mot peut être dû
   en Son sans l'être en Caractères, et inversement. */
/* Quota de nouveautés du jour. Les 220 mots ont été injectés d'un coup : sans
   quota, la file affiche une dette de 440 pistes et les nouveautés se rempilent
   plus vite qu'elles ne s'apprennent. Les révisions dues passent toujours avant. */
/* Historique des découvertes, jour par jour. `state.days` compte les cartes
   vues, ce qui n'est pas la même chose : réviser vingt fois le même mot ne fait
   pas vingt mots appris. */
function noteDecouverte(card) {
  /* Un MOT compte une fois, pas deux. Un mot a deux pistes (son et caractères) :
     les compter séparément doublait le rythme affiché. On ne compte donc que le
     tout premier contact, quelle que soit la piste par laquelle il arrive. */
  if (!card || card.son.reviews || card.zi.reviews || card.vu) return;
  if (!state.decouvertes) state.decouvertes = {};
  const k = todayKey();
  state.decouvertes[k] = (state.decouvertes[k] || 0) + 1;
  /* Compteur par niveau, réservé au CIBLAGE explicite (2026-08-31, bug signalé
     par Daphnée : « je suis bloquée pour le HSK 2 »). Compter TOUTE découverte
     au niveau officiel du mot, y compris en session mixte « Tous niveaux »,
     était le bug : le vocabulaire de cours du manuel 2 EST du HSK 2, si bien
     que la révision quotidienne normale épuisait à elle seule le quota du jour
     pour ce niveau, avant même qu'elle choisisse de cibler « HSK 2 » pour
     rattraper les mots « en avance ». Seul un ciblage EXPLICITE (curNiveau
     réglé sur ce niveau) doit consommer ce quota-là. */
  if (curNiveau !== "all") {
    if (!state.decCible) state.decCible = {};
    if (!state.decCible[k]) state.decCible[k] = {};
    state.decCible[k][curNiveau] = (state.decCible[k][curNiveau] || 0) + 1;
  }
}
/* Rythme CALENDAIRE : ce qui a été découvert sur les N derniers jours, jours
   creux compris. C'est le seul rythme affiché depuis le 2026-08-21, et le seul
   sur lequel une date se projette honnêtement : compter les seuls jours
   travaillés annonce une échéance qu'un week-end suffit à démentir.
   La fenêtre ne remonte jamais avant la première journée enregistrée : sur une
   app utilisée depuis cinq jours, diviser par quatorze inventerait neuf jours
   d'inactivité qui n'ont pas eu lieu. */
function rythmeCalendaire(hist, jours) {
  const h = hist || {};
  const cles = Object.keys(h).sort();
  if (!cles.length) return null;
  const debut = new Date(cles[0] + "T00:00:00");
  const ecoules = Math.round((Date.now() - debut.getTime()) / 864e5) + 1;
  const fenetre = Math.max(1, Math.min(jours, ecoules));
  const d = new Date();
  let total = 0;
  for (let k = 0; k < fenetre; k++) { total += h[cleDate(d)] || 0; d.setDate(d.getDate() - 1); }
  return { moy: total / fenetre, jours: fenetre, total: total };
}
/* Une durée en jours, dite comme on la dirait à voix haute. « 47 jours » ne se
   projette pas ; « 7 semaines » se place dans un calendrier. */
function dureeTexte(j) {
  if (j <= 1) return "un jour";
  if (j < 14) return j + " jours";
  if (j < 70) return Math.round(j / 7) + " semaines";
  if (j < 400) return Math.round(j / 30) + " mois";
  return "plus d'un an";
}
/* Pour les caps lointains (Séries à 90 %), « plus d'un an » ne dit rien : on
   arrondit au demi-an, ce qui est la précision honnête d'une projection à cette
   distance. */
function dureeLongueTexte(j) {
  if (j < 400) return dureeTexte(j);
  const demi = Math.max(2, Math.round(j / 182.5));
  const ans = Math.floor(demi / 2);
  const base = ans === 1 ? "un an" : ans + " ans";
  return demi % 2 ? base + " et demi" : base;
}
const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
                 "août", "septembre", "octobre", "novembre", "décembre"];
function dateDansTexte(j) {
  const d = new Date();
  d.setDate(d.getDate() + j);
  const q = d.getDate();
  return q + (q === 1 ? "er" : "") + " " + MOIS_FR[d.getMonth()] +
    (d.getFullYear() !== new Date().getFullYear() ? " " + d.getFullYear() : "");
}
/* Projection : ce qu'il reste, divisé par le rythme réel. Rien n'est affiché si
   le rythme est nul, plutôt qu'une échéance infinie : « jamais » n'apprend rien,
   « tu n'as rien découvert cette quinzaine » se corrige. */
function projection(restant, moy) {
  if (restant <= 0) return { fini: true };
  if (!moy) return { fini: false, arret: true };
  const j = Math.ceil(restant / moy);
  return { fini: false, jours: j, duree: dureeTexte(j), date: dateDansTexte(j) };
}
/* Quota de nouveautés. Sans ciblage, six mots par jour toutes origines
   confondues. Avec un ciblage de niveau, ces six places se comptent sur le
   NIVEAU VISÉ : jusqu'au 2026-08-25 le quota était global, si bien que viser le
   HSK 2 après avoir découvert six mots ailleurs ne laissait aucune place et la
   session ne contenait plus un seul mot, sans rien dire. Un plafond du jour
   empêche d'enchaîner les niveaux pour multiplier les nouveautés et de recréer
   la dette que ce quota existe pour éviter. */
function decouvertesJour() { return (state.decouvertes || {})[todayKey()] || 0; }
/* Quota consommé par le CIBLAGE explicite de ce niveau uniquement (voir
   noteDecouverte) : une découverte faite en session mixte « Tous niveaux » n'y
   compte pas, même si le mot appartient à ce niveau. C'est ce compteur-là qui
   doit gater newQuotaLeft, sinon la révision normale du cours (HSK 2) épuise
   le quota d'un ciblage HSK 2 jamais demandé (2026-08-31). */
function decouvertesCible(n) { return (((state.decCible || {})[todayKey()]) || {})[n] || 0; }
function newQuotaLeft() {
  const total = decouvertesJour();
  if (curNiveau === "all") return Math.max(0, NEW_WORDS_PER_DAY - total);
  return Math.max(0, Math.min(NEW_WORDS_PER_DAY - decouvertesCible(curNiveau),
                              NEW_DAY_CAP - total));
}
function duePartage() {
  const now = Date.now(), revus = [], neufs = [];
  state.cards.filter(themeMatch).forEach(c => {
    TRACKS.forEach(t => {
      if (!trackMatch(t) || !c[t] || c[t].due > now) return;
      (c[t].reviews ? revus : neufs).push({ card: c, track: t });
    });
  });
  revus.sort((a, b) => a.card[a.track].due - b.card[b.track].due);
  return { revus: revus, neufs: rotationVolets(neufs) };
}
/* Les nouveautés ne sortent plus dans l'ordre du catalogue (2026-08-21). Cet
   ordre place les 126 mots « HSK 2 à venir » avant les Expressions : à six mots
   par jour, une tournure courante ne serait apparue qu'après des mois, ce qui
   explique le « 0 croisé sur 24 » du tableau de bord. On alterne donc les
   volets, deux mots du cours pour un mot d'ailleurs : la révision du cours reste
   prioritaire sans condamner le reste du catalogue. */
function rotationVolets(items) {
  const cours = [], autres = new Map();
  items.forEach(it => {
    const v = voletDe(it.card);
    if (v === "cours") cours.push(it);
    else { if (!autres.has(v)) autres.set(v, []); autres.get(v).push(it); }
  });
  const cles = [...autres.keys()];
  const out = [];
  let tour = 0, garde = 0;
  while ((cours.length || cles.some(v => autres.get(v).length)) && garde++ < 1e4) {
    for (let k = 0; k < 2 && cours.length; k++) out.push(cours.shift());
    for (let t = 0; t < cles.length; t++) {
      const v = cles[(tour + t) % cles.length];
      if (autres.get(v).length) { out.push(autres.get(v).shift()); tour++; break; }
    }
  }
  return out;
}
/* Les nouveautés se comptent en mots : on retient les pistes des `mots` premiers
   mots jamais rencontrés, les deux pistes d'un même mot ne consommant qu'une
   place. Compter des pistes doublait le rythme affiché. */
function neufsLimites(neufs, mots) {
  const pris = [], out = [];
  neufs.forEach(it => {
    if (pris.includes(it.card)) { out.push(it); return; }
    if (pris.length < mots) { pris.push(it.card); out.push(it); }
  });
  return out;
}
/* Un mot jamais vu n'arrive plus directement en test (2026-09-16). Avant, un
   mot « à venir » que Daphnée n'avait jamais rencontré se présentait à deviner,
   y compris en écriture du caractère : elle ne pouvait que révéler et se noter
   « Pas su », ou deviner. Désormais :
   1. le premier contact est une carte de DÉCOUVERTE (caractères, pinyin, sens,
      phrase glosée, audio, construction), un seul bouton « Vu » ;
   2. le test Son vient plus loin dans la même session (voir placerDecouvertes) ;
   3. la piste Caractères attend que le Son ait été testé au moins une fois, donc
      une autre session : jamais de lecture ni d'écriture d'un mot dont le son
      n'a pas encore été retrouvé.
   `card.vu` (date) marque la découverte faite ; elle compte dans le quota du
   jour (noteDecouverte), pas comme une révision. */
function avecDecouvertes(items) {
  const out = [];
  items.forEach(it => {
    const c = it.card;
    const jamaisVu = !c.son.reviews && !c.zi.reviews && !c.vu && !c.son.connu && !c.zi.connu;
    if (it.track === "zi" && !c.son.reviews && !c.son.connu) return;
    if (jamaisVu) out.push({ card: c, track: "son", mode: "decouverte" });
    out.push(it);
  });
  return out;
}
/* Dans la file mixte mélangée, la découverte d'un mot doit précéder son test,
   avec au moins deux cartes entre les deux : assez pour que le test demande un
   vrai rappel, pas assez pour que le mot soit déjà retombé. */
function placerDecouvertes(list) {
  const decouvertes = list.filter(e => e.kind === "srs" && e.v.mode === "decouverte");
  /* Une découverte en toute fin de file n'aurait pas la place de son test :
     elle remonte en tête. */
  decouvertes.forEach(e => {
    const i = list.indexOf(e);
    if (i > list.length - 4) { list.splice(i, 1); list.unshift(e); }
  });
  /* Déplacer un test peut resserrer l'écart d'une autre paire : on repasse
     jusqu'à ce que plus rien ne bouge (borné, deux ou trois tours suffisent). */
  for (let tour = 0, bouge = true; bouge && tour < 6; tour++) {
    bouge = false;
    decouvertes.forEach(e => {
      const i = list.indexOf(e);
      const j = list.findIndex(x => x.kind === "srs" && x.v.card === e.v.card && x.v.mode !== "decouverte");
      if (i < 0 || j < 0 || j >= i + 3) return;
      const [test] = list.splice(j, 1);
      list.splice(Math.min(list.length, list.indexOf(e) + 3), 0, test);
      bouge = true;
    });
  }
  return list;
}
function dueItems() {
  const d = duePartage();
  return d.revus.concat(neufsLimites(d.neufs, newQuotaLeft()));
}
/* File de la session, en trois parts :
   1. les nouveautés du jour, dont la place est réservée quoi qu'il arrive ;
   2. la moitié des places restantes pour les cartes les plus en retard, celles
      qu'il y a vraiment urgence à rattraper ;
   3. l'autre moitié tirée au sort dans le fond de la dette. Sans ce tirage, la
      file prenait toujours les échéances les plus anciennes : un bloc stable
      d'un jour sur l'autre, qui revenait encore et encore pendant que le reste
      du retard n'apparaissait jamais. */
function sessionItems(limite) {
  const d = duePartage();
  /* Nouveautés (refonte du 2026-09-20, après « mes stats n'avancent pas »).
     Le plafond du 2026-09-16 se comptait en CARTES (un tiers des places) et
     chaque mot nouveau en coûtait deux (découverte + test), la demi-carte
     restante était jetée, et la première lecture des caractères des mots de la
     veille passait pour une nouveauté : 1,5 mot nouveau par jour au lieu des
     six du quota, mesuré au harnais. Désormais :
     - le plafond se compte en MOTS testés (un tiers des places de vocabulaire),
       borné par le quota du jour ;
     - la carte de découverte ne compte ni dans le plafond ni dans les places :
       c'est un écran de lecture, pas un test. La file dépasse donc `limite` du
       nombre de mots découverts (au plus NEW_RESERVE) ;
     - la première lecture des caractères d'un mot dont le son est déjà
       retrouvé est une RÉVISION prioritaire, pas une nouveauté. */
  const plafondMots = Math.max(0, Math.floor(limite / 3));
  const sonNeufs = d.neufs.filter(it => it.track === "son");
  const ziPremiers = d.neufs.filter(it => it.track === "zi" && (it.card.son.reviews || it.card.son.connu));
  /* Un mot découvert mais jamais testé (session quittée entre les deux) passe
     avant les inconnus et ne consomme pas de quota : il l'a déjà consommé. */
  const dejaVus = sonNeufs.filter(it => it.card.vu);
  const aDecouvrir = sonNeufs.filter(it => !it.card.vu).slice(0, newQuotaLeft());
  const tests = dejaVus.concat(aDecouvrir).slice(0, Math.min(plafondMots, NEW_RESERVE));
  const nouveaux = avecDecouvertes(tests);
  const place = Math.max(0, limite - tests.length);
  const retard = d.revus.slice(0, Math.ceil(place / 2));
  /* Le fond de la dette n'est plus tiré au sort à l'aveugle : les pistes pas
     encore sues (une réussite de moins que d'échecs, ou jamais réussies)
     passent d'abord, échéances les plus anciennes en tête. Ce sont celles qui
     sont le plus près de devenir sues, et le tirage au sort dans une dette de
     plusieurs centaines de cartes ne les ramenait presque jamais. Le tirage
     ne sert plus qu'à compléter avec les pistes déjà sues. */
  const fond = d.revus.slice(retard.length);
  /* Les premières lectures de caractères et les pistes ratées alternent une
     pour une : mises en tête, les lectures prenaient toutes les places et la
     dette de mots pas encore sus ne remontait plus (mesuré au harnais). */
  const rates = fond.filter(it => !estConnu(it.card[it.track]));
  const pasSues = [];
  for (let i = 0; i < Math.max(ziPremiers.length, rates.length); i++) {
    if (i < rates.length) pasSues.push(rates[i]);
    if (i < ziPremiers.length) pasSues.push(ziPremiers[i]);
  }
  const sues = shuffle(fond.filter(it => estConnu(it.card[it.track])));
  const tirage = pasSues.concat(sues).slice(0, place - retard.length);
  return nouveaux.concat(retard, tirage);
}
/* Nombre de TESTS d'une file : les cartes de découverte ne comptent pas dans
   la longueur annoncée de la session. */
function nbTests(items) { return items.filter(it => it.mode !== "decouverte").length; }

/* ---------- La journée est faite ----------
   Une fois la session du jour terminée, le compteur d'accueil redescend à zéro
   (demande de Daphnée, 2026-08-21) : la dette restante n'est pas son travail du
   jour, et un compteur qui ne bouge jamais donne l'impression de ne jamais en
   finir. Même logique par onglet : un entraînement grammaire ou briques terminé
   met son compteur du jour à zéro. La session du jour, elle, couvre tous les
   formats : la terminer met tout à zéro. */
function faitJour() {
  if (!state.fait || state.fait.d !== todayKey()) state.fait = { d: todayKey() };
  return state.fait;
}
function jourEstFait(quoi) {
  return !!(state.fait && state.fait.d === todayKey() && state.fait[quoi]);
}
/* Les mots qui ont coincé aujourd'hui, toutes sessions confondues. C'est la
   matière de la consolidation du soir : les retravailler dans tous les sens
   (écoute, pinyin, lecture, écriture avec indices, phrase complète). */
function noteFaibleJour(hanzi) {
  if (!hanzi) return;
  if (!state.faibles || state.faibles.d !== todayKey()) state.faibles = { d: todayKey(), mots: [] };
  if (!state.faibles.mots.includes(hanzi)) state.faibles.mots.push(hanzi);
}
function faiblesJour() {
  const f = state.faibles;
  if (!f || f.d !== todayKey() || !(f.mots || []).length) return [];
  return f.mots.map(h => state.cards.find(c => c.hanzi === h)).filter(Boolean);
}
/* Longueur de la session du jour, choisie sur l'accueil (20, 35 ou 50 depuis le 2026-09-20).
   Une seule longueur imposée obligeait à s'engager sur 30 cartes ou rien. */
/* 20 / 35 / 50 depuis le 2026-09-20 (demande de Daphnée : cinq cartes de plus
   par palier, « je peux bien aller jusqu'à 50 »). Une taille enregistrée sous
   l'ancienne échelle (15 / 30 / 45) est relevée d'un cran. */
const TAILLES = [20, 35, 50];
function mixMax() {
  if (TAILLES.includes(state.taille)) return state.taille;
  if (TAILLES.includes(state.taille + 5)) return state.taille + 5;
  return 35;
}
function setTaille(n) { state.taille = n; save(); render(); }

