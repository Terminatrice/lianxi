/* ---------- Composants de caractères ----------
   Un caractère se retient comme un assemblage de briques réutilisables, pas comme
   un dessin. Cette section enseigne les briques et, surtout, le principe
   phono-sémantique : une brique donne le sens, l'autre donne une piste de son.
   Les exercices sont générés à la volée depuis les données, donc les distracteurs
   changent à chaque passage : impossible d'apprendre l'item au lieu de la notion. */
const COMP_SESSION_MAX = 8;

function hzIndex() {
  if (HZ) return HZ;
  HZ = new Map();
  EMBED_HANZI.forEach(h => HZ.set(h.hanzi, h));
  return HZ;
}
/* Caractères listés avec leur pinyin ET leur sens. Ils s'affichaient nus
   (« Tu l'as déjà croisé dans : 你 妈 好 »), ce qui suppose de savoir déjà les
   lire, c'est-à-dire exactement ce que ces fiches sont censées construire
   (retour de Daphnée, 2026-08-21). */
function gloseChar(ch) {
  if (!GLOSE_CHAR) {
    GLOSE_CHAR = new Map();
    const add = (h, py, fr) => {
      if (!h || [...h].length !== 1) return;
      const dej = GLOSE_CHAR.get(h);
      if (!dej) GLOSE_CHAR.set(h, { py: py || "", fr: fr || "" });
      else if (!dej.fr && fr) { dej.fr = fr; if (!dej.py) dej.py = py || ""; }
    };
    /* Le mot isolé d'abord : son pinyin porte le vrai ton (上 shàng), là où une
       décomposition de phrase donne la forme atténuée (桌子上 shang). */
    state.cards.forEach(c => add(c.hanzi, c.pinyin, c.fr));
    state.cards.forEach(c => (c.mots || []).forEach(m => add(m[0], m[1], m[2])));
  }
  const g = GLOSE_CHAR.get(ch) || {};
  /* Un caractère qui n'existe pas seul (什 de 什么, 们 de 你们) n'a pas de sens à
     afficher. Plutôt qu'une case vide, on montre le mot où elle le connaît :
     c'est ce qui rend la brique reconnaissable. */
  let dans = "";
  if (!g.fr) {
    const mot = state.cards.find(c => c.hanzi.length > 1 && c.hanzi.indexOf(ch) >= 0);
    if (mot) dans = mot.hanzi;
  }
  return { py: g.py || pyIndex().get(ch) || "", fr: g.fr || "", dans: dans };
}
function charsHTML(chars) {
  return `<div class="char-gloses">${chars.map(ch => {
    const g = gloseChar(ch);
    return `<button class="char-glose" onclick="speak(${jsattr(ch)})" aria-label="Écouter ${esc(ch)}">
      <span class="hanzi">${esc(ch)}</span>
      <span class="cg-py">${g.py ? renderPinyin(g.py) : "&nbsp;"}</span>
      <span class="cg-fr">${g.fr ? esc(g.fr) : (g.dans ? `dans <span class="hanzi">${esc(g.dans)}</span>` : "&nbsp;")}</span></button>`;
  }).join("")}</div>`;
}
/* Pour chaque composant, les caractères de SON vocabulaire qui le contiennent.
   Rien n'est enseigné qu'elle n'ait déjà rencontré. */
function compChars() {
  if (COMPCHARS) return COMPCHARS;
  const idx = hzIndex();
  const siens = new Set();
  state.cards.forEach(c => [...c.hanzi].forEach(ch => siens.add(ch)));
  COMPCHARS = new Map();
  EMBED_COMPONENTS.forEach(comp => {
    const liste = [];
    idx.forEach((h, ch) => {
      if (!siens.has(ch)) return;
      if ((h.parts || []).some(p => p[0] === comp.forme)) liste.push(ch);
    });
    COMPCHARS.set(comp.id, liste);
  });
  return COMPCHARS;
}
function compProg(id) {
  if (!state.comp) state.comp = {};
  if (!state.comp[id]) state.comp[id] = Object.assign(newTrack("gram"), { vue: false });
  migrateTrack(state.comp[id], "gram");
  return state.comp[id];
}
function compDue() {
  const now = Date.now();
  return EMBED_COMPONENTS.filter(c => compProg(c.id).due <= now)
    .sort((a, b) => compProg(a.id).due - compProg(b.id).due);
}
const ROLE_LABEL = { sem: "donne le sens", phon: "donne le son" };

function renderComp() {
  if (!$("comp-list")) return;
  const due = compDue();
  const faitC = jourEstFait("comp");
  $("comp-due-count").textContent = faitC ? "0" : due.length;
  $("comp-due-label").textContent = faitC ? "à travailler : entraînement du jour fait"
    : due.length === 1 ? "composant à travailler" : "composants à travailler";
  $("comp-start-btn").disabled = due.length === 0;
  $("comp-start-btn").textContent = faitC ? "M'entraîner quand même"
    : due.length > COMP_SESSION_MAX
    ? `Entraînement composants (${COMP_SESSION_MAX})` : "Entraînement composants";
  $("comp-no-due").style.display = due.length === 0 && !faitC ? "" : "none";
  $("comp-count").textContent = EMBED_COMPONENTS.length;
  $("comp-list").innerHTML = EMBED_COMPONENTS.map(compFicheHTML).join("");
}
function compFicheHTML(c) {
  const g = compProg(c.id);
  const chars = compChars().get(c.id) || [];
  const e = gramEtat(g);
  const famille = chars.length
    ? `<h4>Dans tes mots</h4>${charsHTML(chars)}`
    : "";
  return `<div class="gram-item">
    <button class="gram-head" onclick="toggleFiche(${jsattr("c-" + c.id)})" aria-expanded="false">
      <span class="t hanzi" style="font-size:1.8rem">${esc(c.forme)}</span>
      <span class="t">${esc(c.sens)}</span><span class="gram-score ${e.cls}">${e.mot}</span>
      <span class="r">${c.role === "phon" ? "brique sonore" : "brique de sens"}${c.origine ? ` · forme liée de ${c.origine}` : ""}${chars.length ? ` · ${chars.length} de tes caractères` : ""}</span>
    </button>
    <div class="gram-body hidden" id="fiche-c-${esc(c.id)}">
      <p style="margin:.3rem 0">${glose(c.mnemo)}</p>
      ${c.position ? `<p class="hint">Position : ${esc(c.position)}.</p>` : ""}
      ${famille}
      ${motsDeBrique(c.id).length ? `<button class="btn secondary" onclick="startBriqueSession(${jsattr(c.id)})">Réviser les mots avec cette brique (${motsDeBrique(c.id).length})</button>` : ""}
    </div>
  </div>`;
}

/* ---------- Session composants ---------- */
let compQueue = [], cIndex = 0, compErrors = [], compOk = 0, compTotal = 0;

function startGramExoReset() { exoCourant = null; }
function startCompSession() {
  sessEnCours = true; if (state.reprise) { delete state.reprise; save(); }
  const due = compDue().slice(0, COMP_SESSION_MAX);
  if (!due.length) return;
  sessMode = "comp";
  compQueue = shuffle(due);
  cIndex = 0; compTotal = compQueue.length; compErrors = []; compOk = 0;
  speak(" ");
  $("session").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  nextComp();
}
function nextComp(forceExo) {
  if (window.speechSynthesis) speechSynthesis.cancel();
  if (cIndex >= compQueue.length) { endCompSession(); return; }
  const c = compQueue[cIndex], g = compProg(c.id);
  $("sess-track").textContent = "⿰";
  $("know-btn").classList.add("hidden");
  majProgres(cIndex, compTotal);
  $("session").scrollTop = 0;
  if (!g.vue && !forceExo) { $("card-zone").innerHTML = compLearnHTML(c); return; }
  $("card-zone").innerHTML = compExoHTML(c);
}
function compLearnHTML(c) {
  const chars = compChars().get(c.id) || [];
  return `<div class="qcard">
      <div class="q-hanzi hanzi">${esc(c.forme)}</div>
      ${c.origine ? `<div class="q-prompt">forme liée de <span class="hanzi">${esc(c.origine)}</span></div>` : ""}
      <div class="q-fr">${esc(c.sens)}</div>
      <p style="font-size:1.06rem;text-align:left">${glose(c.mnemo)}</p>
      ${chars.length ? `<div class="q-prompt">Tu l'as déjà croisé dans :</div>${charsHTML(chars)}` : ""}
      <button class="btn" onclick="startCompExo()">S'entraîner dessus</button>
    </div>`;
}
function startCompExo() { compProg(compQueue[cIndex].id).vue = true; save(); nextComp(true); }

/* Trois exercices, tirés au sort à chaque passage, tous corrigés automatiquement. */
function compExoHTML(c) {
  const chars = compChars().get(c.id) || [];
  const types = ["sens"];
  if (chars.length) types.push("reperage");
  const avecRole = chars.filter(ch => {
    const h = hzIndex().get(ch);
    return h && (h.parts || []).length >= 2 && h.parts.some(p => p[1] === "phon");
  });
  if (avecRole.length) types.push("role");
  /* La prédiction est l'exercice qui a le plus de valeur : deviner le sens d'un
     caractère jamais appris à partir de sa brique. C'est ce qui transforme la
     brique en outil au lieu d'un fait de plus à retenir. On le tire deux fois
     plus souvent que les autres quand il existe. */
  if (c.predire) { types.push("predire"); types.push("predire"); }
  const t = types[Math.floor(Math.random() * types.length)];

  if (t === "predire") {
    const pr = c.predire;
    compAttendu = pr.bon;
    const opts = shuffle([pr.bon, ...pr.leurres]);
    return `<div class="qcard">
      <div class="q-prompt">Tu n'as jamais appris ce caractère. Que veut-il dire, à ton avis ?</div>
      <div class="q-hanzi hanzi">${esc(pr.hanzi)}</div>
      <div class="q-pinyin">${renderPinyin(pr.pinyin)}</div>
      <div class="q-prompt">Indice : il contient <span class="hanzi" style="font-size:1.4rem">${esc(c.forme)}</span></div>
      <div class="opts" id="opts">${opts.map(o =>
        `<button onclick="answerComp(${jsattr(o)})">${esc(o)}</button>`).join("")}</div>
      <div id="answer-zone" class="hidden"></div>
    </div><div id="grades-slot"></div>`;
  }

  if (t === "reperage") {
    /* Quatre caractères, un seul contient la brique. Les leurres sont tirés
       parmi ses autres caractères décomposés, donc plausibles. */
    const bon = chars[Math.floor(Math.random() * chars.length)];
    const autres = [...hzIndex().keys()].filter(ch => !chars.includes(ch));
    const leurres = shuffle(autres).slice(0, 3);
    const opts = shuffle([bon, ...leurres]);
    compAttendu = bon;
    return `<div class="qcard">
      <div class="q-prompt">Lequel contient <span class="hanzi" style="font-size:1.6rem">${esc(c.forme)}</span> ?</div>
      <div class="opts" id="opts">${opts.map(o =>
        `<button class="hanzi" style="font-size:2rem" onclick="answerComp(${jsattr(o)})">${esc(o)}</button>`).join("")}</div>
      <div id="answer-zone" class="hidden"></div>
    </div><div id="grades-slot"></div>`;
  }
  if (t === "role") {
    const ch = avecRole[Math.floor(Math.random() * avecRole.length)];
    const hz = hzIndex().get(ch);
    const bonne = hz.parts.find(p => p[1] === "sem") || hz.parts[0];
    compAttendu = bonne[0];
    /* Un choix entre les deux seules briques du caractère se joue à pile ou face.
       On ajoute une brique étrangère plausible pour que la réponse demande de
       reconnaître, pas de deviner. Et on donne le sens du mot : sans lui, la
       question est indevinable autrement que par élimination. */
    const siennes = hz.parts.map(p => p[0]);
    const etrangere = shuffle(EMBED_COMPONENTS.filter(x => x.role === "sem" && !siennes.includes(x.forme)))[0];
    const mot = state.cards.find(cd => cd.hanzi.includes(ch));
    const opts = shuffle(siennes.concat(etrangere ? [etrangere.forme] : []));
    return `<div class="qcard">
      <div class="q-hanzi hanzi">${esc(ch)}</div>
      ${mot ? `<div class="q-fr">« ${esc(mot.fr)} »</div>` : ""}
      <div class="q-prompt">Quelle brique donne le sens ?</div>
      <div class="opts" id="opts">${opts.map(o =>
        `<button class="hanzi" style="font-size:2rem" onclick="answerComp(${jsattr(o)})">${esc(o)}</button>`).join("")}</div>
      <div id="answer-zone" class="hidden"></div>
    </div><div id="grades-slot"></div>`;
  }
  const memeRole = EMBED_COMPONENTS.filter(x => x.id !== c.id && x.role === c.role);
  const pool = memeRole.length >= 3 ? memeRole : EMBED_COMPONENTS.filter(x => x.id !== c.id);
  const leurres = shuffle(pool).slice(0, 3).map(x => x.sens);
  const opts = shuffle([c.sens, ...leurres]);
  compAttendu = c.sens;
  return `<div class="qcard">
      <div class="q-hanzi hanzi">${esc(c.forme)}</div>
      <div class="q-prompt">Que signale cette brique ?</div>
      <div class="opts" id="opts">${opts.map(o =>
        `<button onclick="answerComp(${jsattr(o)})">${esc(o)}</button>`).join("")}</div>
      <div id="answer-zone" class="hidden"></div>
    </div><div id="grades-slot"></div>`;
}
let compAttendu = null;
function answerComp(choix) {
  const c = compQueue[cIndex], ok = choix === compAttendu;
  const opts = $("opts");
  [...opts.children].forEach(b => {
    b.disabled = true;
    if (b.textContent === compAttendu) b.classList.add("good");
    else if (b.textContent === choix) b.classList.add("bad");
  });
  const chars = compChars().get(c.id) || [];
  const pred = compAttendu === (c.predire || {}).bon ? c.predire : null;
  $("answer-zone").innerHTML =
    `<div class="verdict ${ok ? "ok" : "ko"}">${ok ? "✓ Correct" : "✕ Pas celle-là"}</div>
     <div class="expl">${pred ? glose(pred.pourquoi)
       : `<span class="hanzi" style="font-size:1.5rem">${esc(c.forme)}</span> ${esc(c.sens)}. ${glose(c.mnemo)}`}</div>
     ${chars.length ? charsHTML(chars) : ""}`;
  $("answer-zone").classList.remove("hidden");
  const pr = compProg(c.id);
  pr.vue = true;
  schedule(pr, ok, "gram");
  compterPassage();
  if (ok) compOk++;
  else if (!compErrors.includes(c)) compErrors.push(c);
  noterMix(ok, c.forme + " " + c.sens);
  save();
  $("grades-slot").innerHTML = `<div class="grades" id="grades" style="grid-template-columns:1fr">
    <button class="g-good" onclick="advanceComp()">Suivant ›</button></div>`;
}
function advanceComp() { cIndex++; nextComp(); }
function endCompSession() {
  if (mixOn) { avancerMix(); return; }
  sessEnCours = false;
  faitJour().comp = true; save();
  $("prog-bar").style.width = "100%";
  $("prog-txt").textContent = "";
  const list = compErrors.length
    ? `<hr class="divider"><div class="end-list"><strong>À reprendre :</strong>
       <ul class="words">${compErrors.map(c =>
         `<li><span class="w-hanzi hanzi">${esc(c.forme)}</span>
          <span class="w-mid"><span class="w-fr">${esc(c.sens)}</span></span></li>`).join("")}</ul></div>`
    : `<p class="q-fr">Sans faute sur les composants. 太棒了 tài bàng le !</p>`;
  $("card-zone").innerHTML = `<div class="qcard">
      <div class="q-hanzi hanzi">部件</div>
      <div class="q-pinyin">${renderPinyin("bùjiàn")}</div>
      <div class="q-fr">Entraînement terminé : ${compOk} / ${compTotal}.</div>
      ${list}
      ${boutonFin()}
    </div>`;
}
/* Décomposition d'un mot, affichée au dos des cartes Caractères et dans le Dico.
   Encodage élaboré : voir la structure à chaque révélation vaut mieux que
   mémoriser une forme opaque. */
function decompHTML(hanzi) {
  const idx = hzIndex();
  const blocs = [...hanzi].map(ch => idx.get(ch)).filter(Boolean);
  if (!blocs.length) return "";
  return blocs.map(h => {
    const parts = (h.parts || []).length
      ? `<div class="dico-decomp">${h.parts.map(p =>
          `<span class="dico-mot"><span class="hanzi">${esc(p[0])}</span> ${esc(p[2])} <span style="color:var(--muted)">(${ROLE_LABEL[p[1]]})</span></span>`).join("")}</div>`
      : "";
    return `<div class="expl" style="margin-top:.5rem">
      <span class="hanzi" style="font-size:1.5rem">${esc(h.hanzi)}</span>
      ${parts}<div style="margin-top:.3rem">${glose(h.histoire)}</div></div>`;
  }).join("");
}

