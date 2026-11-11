/* ---------- Onglet Cours : réviser les nouveautés d'une séance ----------
   Demande de Daphnée (2026-10-03) : une partie où réviser TOUT ce qui est venu
   du dernier cours, vocabulaire, écriture, grammaire, expressions. Le contenu
   d'une séance vit dans vocab/cours.json (EMBED_COURS) et ne fait que POINTER
   vers des mots de vocab.json et des fiches de grammar.json : rien n'est dupliqué,
   la progression de chaque mot reste la même qu'ailleurs dans l'app.
   Les réponses comptent normalement (c'est une vraie révision). La session ne
   met pas à zéro les compteurs du jour (`mixCours`) : elle s'ajoute à la
   session du jour, elle ne la remplace pas. */
let curCours = 0;
const COURS_MOTS_MAX = 14; // mots par session : les moins sus d'abord, le reste attend
function coursListe() { return EMBED_COURS.slice().sort((a, b) => b.date.localeCompare(a.date)); }
function coursCartes(s) {
  return (s.mots || []).concat(s.expressions || [])
    .map(h => state.cards.find(c => c.hanzi === h)).filter(Boolean);
}
function coursEtat(c) {
  if (!estCroise(c.son) && !estCroise(c.zi) && !c.vu) return "neuf";
  return estConnu(c.son) && estConnu(c.zi) ? "su" : "encours";
}
/* Les caractères de la séance, et ceux qu'aucun autre mot de l'app ne contient :
   ce sont les vrais nouveaux caractères à apprendre à lire et à écrire. */
function coursCaracteres(s) {
  const siens = new Set(coursCartes(s).map(c => c.hanzi));
  const ailleurs = new Set();
  state.cards.forEach(c => { if (!siens.has(c.hanzi)) [...c.hanzi].forEach(ch => ailleurs.add(ch)); });
  const vus = new Set(), out = [];
  coursCartes(s).forEach(c => [...c.hanzi].forEach(ch => {
    if (!/[一-鿿]/.test(ch) || vus.has(ch)) return;
    vus.add(ch); out.push({ ch: ch, nouveau: !ailleurs.has(ch) });
  }));
  return out;
}
function coursDate(d) {
  const t = new Date(d + "T12:00:00");
  return isNaN(t) ? d : t.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function setCours(i) { curCours = i; renderCours(); }
function renderCours() {
  const liste = coursListe(), z = $("cours-body");
  if (!liste.length) { z.innerHTML = `<div class="panel"><p class="hint">Aucun cours enregistré pour l'instant.</p></div>`; return; }
  if (curCours >= liste.length) curCours = 0;
  const s = liste[curCours], cartes = coursCartes(s);
  const mots = (s.mots || []).map(h => state.cards.find(c => c.hanzi === h)).filter(Boolean);
  const exprs = (s.expressions || []).map(h => state.cards.find(c => c.hanzi === h)).filter(Boolean);
  const gram = (s.grammaire || []).map(id => EMBED_GRAMMAR.find(p => p.id === id)).filter(Boolean);
  const chars = coursCaracteres(s), nouveaux = chars.filter(x => x.nouveau);
  const sus = cartes.filter(c => coursEtat(c) === "su").length;
  const ligne = c => {
    const e = coursEtat(c);
    return `<li><span class="w-hanzi hanzi">${esc(c.hanzi)}</span>
      <span class="w-mid"><span class="w-pinyin">${renderPinyin(c.pinyin)}</span>
      <span class="cours-etat ${e === "su" ? "su" : ""}">${e === "su" ? "su" : e === "neuf" ? "à découvrir" : "en cours"}</span><br>
      <span class="w-fr">${esc(c.fr)}</span></span>
      <button class="audio-btn" style="margin-left:auto" onclick="speak(${jsattr(c.hanzi)})" aria-label="Écouter ${esc(c.hanzi)}">🔊</button></li>`;
  };
  const choix = liste.length > 1
    ? `<div class="chips" style="justify-content:flex-start;margin:0 0 1rem">${liste.map((x, i) =>
        `<button class="chip" aria-pressed="${i === curCours}" onclick="setCours(${i})">${esc(x.date.slice(8) + "/" + x.date.slice(5, 7))}</button>`).join("")}</div>` : "";
  const bouton = (q, txt) => `<button class="btn secondary" onclick="startCours(${jsattr(s.id)}, '${q}')">${txt}</button>`;
  const formu = (s.formulations || []).map(f => `<div class="cours-formu"><div class="ruby">${rubyHTML(f.hanzi)}</div>
        <div class="q-phrase-fr">${esc(f.fr)}</div>
        <div class="audio-row"><button class="audio-btn" onclick="speak(${jsattr(f.hanzi)})" aria-label="Écouter la phrase">🔊</button></div></div>`).join("");
  const exprListe = exprs.map(c => ligne(c) + (c.usage ? `<li style="display:block;border-bottom:none;padding-top:0"><div class="q-phrase-fr">${glose(c.usage)}</div></li>` : "")).join("");
  const resume = [mots.length && `${mots.length} mots`, exprs.length && `${exprs.length} expressions`, gram.length && `${gram.length} règles`, nouveaux.length && `${nouveaux.length} nouveaux caractères`].filter(Boolean).join(", ");
  const recents = motsRecents();
  const reco = recents.length >= 4 ? `<div class="panel">
      <h2>Préparer la révision de mes derniers cours</h2>
      <p class="hint" style="margin-top:0">${recents.length} mots de tes derniers cours et de tes découvertes récentes. Reconnaître : relier un caractère à son sens, ou un sens au bon caractère. Traduire : écrire en entier les phrases du cours depuis le français.</p>
      <button class="btn" onclick="startRecoRecents()">Reconnaître les caractères (${Math.min(RECO_MAX, recents.length)})</button>
      <button class="btn secondary" onclick="startTraduction(seancesRecentes())">Traduire les phrases du cours</button>
      ${escaliersDe(seancesRecentes()).length ? `<button class="btn secondary" onclick="startEscaliers(escaliersDe(seancesRecentes()))">Phrases longues pas à pas</button>` : ""}
    </div>` : "";
  z.innerHTML = `${reco}${leconPanelHTML()}${choix}
    <div class="panel">
      <p class="cours-date">${esc(coursDate(s.date))}${s.lecon ? " · " + esc(s.lecon) : ""}</p>
      <h2 class="cours-titre hanzi" style="text-transform:none;letter-spacing:0;color:var(--ink)">${esc(s.titre)}</h2>
      <p style="margin:.2rem 0 .8rem;font-size:1.1rem">${esc(s.resume)}</p>
      ${cartes.length || gram.length ? `<p class="hint" style="margin:0">${resume}.${cartes.length ? ` Su pour l'instant : ${sus} mots sur ${cartes.length}.` : ""}</p>
      <button class="btn" onclick="startCours(${jsattr(s.id)}, 'tout')">Réviser tout ce cours</button>` : ""}
    </div>
    ${mots.length ? `<div class="panel"><h2>Vocabulaire</h2><ul class="words">${mots.map(ligne).join("")}</ul>
      ${bouton("vocab", "Réviser le vocabulaire et les expressions")}</div>` : ""}
    ${exprs.length || formu ? `<div class="panel"><h2>Expressions et formulations</h2>
      ${exprs.length ? `<ul class="words">${exprListe}</ul>` : ""}${formu}
      ${formu ? bouton("trad", "Traduire ces phrases") : ""}
      ${escaliersDe([s]).length ? bouton("escalier", "Construire les phrases longues pas à pas") : ""}</div>` : ""}
    ${chars.length ? `<div class="panel"><h2>Écriture et lecture</h2>
      <p class="hint" style="margin-top:0">${nouveaux.length
        ? `Caractères nouveaux dans l'app : <span class="cours-nouveau">${nouveaux.map(x => esc(x.ch)).join(" ")}</span>. Sans pinyin au niveau HSK 3 : l'enjeu est de les reconnaître seule.`
        : "Aucun caractère nouveau : tous figuraient déjà dans d'autres mots."}</p>
      ${charsHTML(chars.map(x => x.ch))}
      ${bouton("reco", "Reconnaître les caractères")}${bouton("ecriture", "M'entraîner à écrire")}${bouton("lecture", "Lire sans pinyin")}</div>` : ""}
    ${gram.length ? `<div class="panel"><h2>Grammaire</h2>
      ${gram.map(p => `<details class="gram-plus"><summary><strong>${esc(p.titre)}</strong></summary>
        <div style="margin-top:.5rem">${gramWeakBodyHTML({ p: p })}</div></details>`).join("")}
      ${bouton("gram", "S'entraîner sur ces règles")}</div>` : ""}
    ${(s.distinctions || []).length ? `<div class="panel"><h2>Distinctions à retenir</h2>
      <ul class="cours-liste">${s.distinctions.map(x => `<li>${glose(x)}</li>`).join("")}</ul></div>` : ""}
    ${((s.conseils || []).length || (s.devoirs || []).length) ? `<div class="panel"><h2>Conseils et devoirs du prof</h2>
      <ul class="cours-liste">${(s.conseils || []).concat(s.devoirs || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      ${s.prochain ? `<p class="hint">Prochain cours : ${esc(s.prochain)}</p>` : ""}</div>` : ""}`;
}
/* Les mots les moins sus d'abord (à découvrir, puis en cours, puis sus), puis un
   tirage pour ne pas resservir toujours les mêmes à égalité. */
function coursChoisir(cartes, max) {
  const poids = c => (estConnu(c.son) ? 1 : 0) + (estConnu(c.zi) ? 1 : 0);
  return shuffle(cartes).sort((a, b) => poids(a) - poids(b)).slice(0, max);
}
function coursItems(cartes, formats) {
  const out = [];
  cartes.forEach(c => {
    const jamaisVu = !c.son.reviews && !c.zi.reviews && !c.vu && !c.son.connu && !c.zi.connu;
    if (jamaisVu) out.push({ card: c, track: "son", mode: "decouverte" });
    formats.forEach(f => out.push(f(c)));
  });
  return out;
}
const COURS_SON = c => ({ card: c, track: "son" });
const COURS_ZI = c => ({ card: c, track: "zi" });
function startCours(id, quoi) {
  const s = EMBED_COURS.find(x => x.id === id);
  if (!s) return;
  const cartes = coursCartes(s);
  const gram = (s.grammaire || []).map(i => EMBED_GRAMMAR.find(p => p.id === i)).filter(Boolean);
  const nouveauxCh = new Set(coursCaracteres(s).filter(x => x.nouveau).map(x => x.ch));
  let items = [], grams = [], choisis = [];
  if (quoi === "tout" || quoi === "vocab") {
    choisis = coursChoisir(cartes, quoi === "tout" ? 10 : COURS_MOTS_MAX);
    items = coursItems(choisis, [COURS_SON, COURS_ZI]);
  }
  if (quoi === "tout") {
    /* Quatre écritures au plus, sur les mots qui portent un caractère nouveau,
       réparties dans la seconde moitié de la file plutôt qu'en bloc final. */
    const ecrire = coursChoisir(choisis.filter(c => [...c.hanzi].some(ch => nouveauxCh.has(ch))), 4);
    const n = ecrire.length, base = items.length;
    ecrire.forEach((c, i) => items.splice(Math.floor(base * (0.4 + 0.55 * (i + 1) / (n + 1))) + i, 0,
      { card: c, track: "zi", mode: "ecriture" }));
  }
  if (quoi === "ecriture") {
    const avec = cartes.filter(c => [...c.hanzi].some(ch => nouveauxCh.has(ch)));
    const base = avec.length >= 4 ? avec : cartes;
    items = coursItems(coursChoisir(base, 10), [c => ({ card: c, track: "zi", mode: "ecriture" })]);
  }
  if (quoi === "lecture") {
    items = coursItems(coursChoisir(cartes, COURS_MOTS_MAX), [c => ({ card: c, track: "zi", mode: "lecture" })]);
  }
  /* Les règles seules : plusieurs exercices par règle, comme depuis l'onglet
     Grammaire. Un seul exercice par règle ne suffisait pas à la pratiquer. */
  if (quoi === "gram") { startGramCible(gram.map(p => p.id)); return; }
  if (quoi === "reco") { startReco(cartes); return; }
  if (quoi === "trad") { startTraduction([s]); return; }
  if (quoi === "escalier") { startEscaliers(escaliersDe([s])); return; }
  if (quoi === "tout") grams = shuffle(gram);
  if (!items.length && !grams.length) return;
  const parts = spread(items).map(it => ({ kind: "srs", v: it }));
  /* Les règles s'intercalent à intervalles réguliers dans le vocabulaire. */
  grams.forEach((p, i) => parts.splice(Math.floor((i + 1) * parts.length / (grams.length + 1)) + i, 0, { kind: "gram", v: p }));
  startMix(placerDecouvertes(parts), true);
}

/* ---------- Réviser tout le vocabulaire d'une leçon du manuel ----------
   Demande de Daphnée (2026-11-11) : « réviser tout le nouveau vocabulaire
   d'une leçon ». Les boutons par séance plafonnent à 14 mots et une leçon
   s'étale sur plusieurs séances. Les mots d'une leçon : ceux dont le thème est
   la leçon (« HSK 3 · L9 »), plus les mots des séances qui couvrent cette
   leçon et qui n'ont pas encore été rangés dans une leçon (thème « à venir »,
   sans thème, Expressions) : sans ce rattrapage, une leçon toute récente dont
   les mots ne sont pas encore rethémés paraîtrait vide.
   Depuis le relevé des supports du Drive (LECONS_MANUEL), une leçon dont on a
   la liste officielle prend toute cette liste, plus les mots rangés dans son
   thème ; le rattrapage par les séances ne sert plus qu'aux leçons sans liste,
   et il écarte les mots que le manuel place dans une autre leçon (une séance
   « L9–L10 » mêle les deux).
   Tous les mots, une carte par mot sur la piste la moins sue ; un mot jamais
   vu passe d'abord par sa carte de découverte. Notation normale. */
let curLecon = null;
const LECON_RE = /^HSK (\d) · L(\d+)$/;
function leconsSeance(s) {
  const m = /HSK (\d) · L(\d+)(?:\s*[–-]\s*L?(\d+))?/.exec(s.lecon || "");
  if (!m) return [];
  const out = [];
  for (let k = +m[2]; k <= +(m[3] || m[2]); k++) out.push(`HSK ${m[1]} · L${k}`);
  return out;
}
function leconCartes(l) {
  const set = new Set(state.cards.filter(c => c.theme === l));
  const manuel = LECONS_MANUEL[l];
  if (manuel) {
    const parHanzi = new Map(state.cards.map(c => [c.hanzi, c]));
    manuel.forEach(h => { const c = parHanzi.get(h); if (c) set.add(c); });
    return [...set];
  }
  const libre = c => (!c.theme || /à venir$/.test(c.theme) || c.theme === "Expressions") && !LECON_DU_MOT[c.hanzi];
  EMBED_COURS.forEach(s => { if (leconsSeance(s).includes(l)) coursCartes(s).filter(libre).forEach(c => set.add(c)); });
  return [...set];
}
function leconsListe() {
  const set = new Set();
  state.cards.forEach(c => { if (LECON_RE.test(c.theme || "")) set.add(c.theme); });
  EMBED_COURS.forEach(s => leconsSeance(s).forEach(l => set.add(l)));
  Object.keys(LECONS_MANUEL).forEach(l => set.add(l));
  const rang = l => { const m = LECON_RE.exec(l); return +m[1] * 100 + +m[2]; };
  return [...set].filter(l => leconCartes(l).length).sort((a, b) => rang(b) - rang(a));
}
function leconPanelHTML() {
  const liste = leconsListe();
  if (!liste.length) return "";
  if (!liste.includes(curLecon)) curLecon = liste[0];
  const cartes = leconCartes(curLecon), sus = cartes.filter(c => coursEtat(c) === "su").length;
  return `<div class="panel">
      <h2>Réviser une leçon du manuel</h2>
      <select id="lecon-select" onchange="curLecon = this.value; renderCours()" aria-label="Leçon à réviser">
        ${liste.map(l => `<option value="${esc(l)}"${l === curLecon ? " selected" : ""}>${esc(l)}</option>`).join("")}
      </select>
      <p class="hint">${cartes.length} mots, dont ${sus} déjà sus.</p>
      <button class="btn" onclick="startLecon(curLecon)">Réviser tout le vocabulaire de la leçon</button>
    </div>`;
}
function startLecon(l) {
  const cartes = leconCartes(l);
  if (!cartes.length) return;
  const items = [];
  shuffle(cartes).forEach(c => {
    const jamaisVu = !c.son.reviews && !c.zi.reviews && !c.vu && !c.son.connu && !c.zi.connu;
    if (jamaisVu) items.push({ card: c, track: "son", mode: "decouverte" });
    items.push({ card: c, track: jamaisVu || !estConnu(c.son) ? "son" : "zi" });
  });
  startMix(placerDecouvertes(spread(items).map(it => ({ kind: "srs", v: it }))), true);
}

/* ---------- Reconnaître les caractères récents ----------
   Demande de Daphnée (2026-10-27) : une section dédiée à la reconnaissance des
   caractères des mots appris récemment. Deux questions qui alternent, notées
   par l'app : un caractère sans pinyin à relier à son sens, ou un sens à relier
   au bon caractère parmi des formes proches. Les leurres partagent d'abord un
   caractère ou une brique avec le mot, puis viennent des mots récents : ce sont
   ceux qu'elle confond vraiment.
   Rien n'est planifié : choisir parmi quatre options est plus facile que
   retrouver seule, et créditer la piste Caractères sur un QCM ferait passer
   pour su un mot seulement reconnu. Un mot manqué rejoint les mots du jour à
   consolider, où il est retravaillé en lecture et en écriture. */
const RECO_JOURS = 21, RECO_MAX = 12;
function seancesRecentes() {
  const lim = cleDate(new Date(Date.now() - RECO_JOURS * 864e5));
  const liste = coursListe();
  const seances = liste.filter(s => s.date >= lim);
  return seances.length >= 2 ? seances : liste.slice(0, 3);
}
function motsRecents() {
  const lim = cleDate(new Date(Date.now() - RECO_JOURS * 864e5));
  const set = new Set();
  seancesRecentes().forEach(s => coursCartes(s).forEach(c => set.add(c)));
  state.cards.forEach(c => { if (c.vu && c.vu >= lim) set.add(c); });
  return [...set];
}
function recoLeurres(c, pool) {
  const parts = ch => ((hzIndex().get(ch) || {}).parts || []).map(x => x[0]);
  const siens = new Set([...c.hanzi]), briques = new Set([...c.hanzi].flatMap(parts));
  const recents = new Set(pool.map(d => d.hanzi));
  const fr = d => (d.fr || "").trim().toLowerCase();
  const vus = new Set([c.hanzi]);
  const cand = pool.concat(shuffle(state.cards.slice())).filter(d => {
    if (vus.has(d.hanzi) || !d.fr || fr(d) === fr(c)) return false;
    if (d.hanzi.includes(c.hanzi) || c.hanzi.includes(d.hanzi)) return false;
    vus.add(d.hanzi); return true;
  });
  const score = d => [...d.hanzi].reduce((s, ch) => s + (siens.has(ch) ? 3 : 0)
      + parts(ch).filter(b => briques.has(b)).length * 2, 0)
    + ([...d.hanzi].length === [...c.hanzi].length ? 1 : 0) + (recents.has(d.hanzi) ? 1 : 0);
  const tri = shuffle(cand).sort((a, b) => score(b) - score(a));
  return shuffle(tri.slice(0, 6)).slice(0, 3);
}
function startReco(cartes) {
  /* Les caractères les moins sus d'abord, à égalité tirés au sort. */
  const choisis = shuffle(cartes.slice())
    .sort((a, b) => (estConnu(a.zi) ? 1 : 0) - (estConnu(b.zi) ? 1 : 0)).slice(0, RECO_MAX);
  if (choisis.length < 2) return;
  const items = choisis.map((c, i) => ({ card: c, track: "zi", mode: "reco",
    variante: i % 2 ? "forme" : "sens", opts: shuffle([c].concat(recoLeurres(c, cartes))) }));
  startMix(spread(items).map(it => ({ kind: "srs", v: it })), true);
}
function startRecoRecents() { startReco(motsRecents()); }

/* ---------- Traduire les phrases du cours ----------
   Cours du 2026-10-27 : la prof révise une leçon en faisant produire ses
   phrases depuis la langue de départ, et Daphnée n'avait révisé que le
   vocabulaire. Ici : le français seul, elle écrit la phrase entière au clavier
   chinois (mode « construire » de l'atelier), indice facultatif = le pinyin.
   Les phrases de la prof (`formulations`) passent d'abord, puis les phrases
   d'exemple des mots de la séance. Entraînement libre : rien n'est planifié,
   une phrase de la prof n'est pas une carte et il existe d'autres traductions
   justes que la comparaison caractère par caractère compterait fausses. */
const TRAD_MAX = 10;
function startTraduction(seances) {
  const vues = new Set(), formu = [], mots = [];
  seances.forEach(s => (s.formulations || []).forEach(f => {
    if (vues.has(normHanzi(f.hanzi))) return;
    vues.add(normHanzi(f.hanzi));
    formu.push({ hanzi: f.hanzi, pinyin: f.pinyin, fr: f.fr, phrase: f.hanzi, phraseFr: f.fr,
      mots: [[f.hanzi, f.pinyin, f.fr]], son: {}, zi: {} });
  }));
  seances.forEach(s => coursCartes(s).forEach(c => {
    if (!c.phrase || (c.mots || []).length < 3 || vues.has(normHanzi(c.phrase))) return;
    vues.add(normHanzi(c.phrase)); mots.push(c);
  }));
  const pris = shuffle(formu).slice(0, Math.ceil(TRAD_MAX * 0.7));
  const liste = pris.concat(shuffle(mots).slice(0, TRAD_MAX - pris.length));
  if (!liste.length) return;
  startMix(shuffle(liste).map(c => ({ kind: "srs", v: { card: c, track: "zi", mode: "construire" }, libre: true })), true, true);
}

