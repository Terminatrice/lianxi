/* ---------- Tracé au doigt ----------
   La bibliothèque et les 866 Ko de données de tracé ne sont téléchargées qu'au
   premier usage réel du mode, et le navigateur les garde ensuite. Charger tout
   au démarrage aurait alourdi chaque ouverture de l'app pour un mode qui ne
   revient qu'une carte sur deux dans la piste Caractères. */
let HW = null, STROKES = null, hwPromise = null;
function chargerTrace() {
  if (hwPromise) return hwPromise;
  const script = () => new Promise((ok, ko) => {
    const el = document.createElement("script");
    el.src = "hanzi-writer.min.js";
    el.onload = ok; el.onerror = () => ko(new Error("bibliothèque de tracé indisponible"));
    document.head.appendChild(el);
  });
  hwPromise = Promise.all([script(), fetch("strokes.json").then(r => {
    if (!r.ok) throw new Error("données de tracé indisponibles");
    return r.json();
  })]).then(([, data]) => { HW = window.HanziWriter; STROKES = data; });
  return hwPromise;
}

let traceEtat = null;
function lancerTrace(card) {
  const zone = $("trace-zone");
  if (!zone) return;
  zone.innerHTML = `<div class="trace-attente">Chargement du tracé…</div>`;
  chargerTrace().then(() => {
    const lettres = [...card.hanzi].filter(ch => STROKES[ch]);
    if (!lettres.length) throw new Error("aucun tracé pour ce mot");
    traceEtat = { card: card, lettres: lettres, i: 0, fautes: 0 };
    traceCaractere();
  }).catch(err => replierSurClavier(card, err));
}
function traceCaractere() {
  const e = traceEtat, zone = $("trace-zone");
  if (!zone || !e) return;
  zone.innerHTML = "";
  const cote = Math.min(300, Math.max(220, Math.floor(window.innerWidth * 0.72)));
  $("trace-consigne").textContent = e.lettres.length > 1
    ? `Trace de mémoire, caractère ${e.i + 1} sur ${e.lettres.length}`
    : "Trace-le de mémoire";
  const w = HW.create(zone, e.lettres[e.i], {
    width: cote, height: cote, padding: 6,
    showCharacter: false, showOutline: false, showHintAfterMisses: 2,
    /* Tolérance du tracé. La valeur par défaut de la bibliothèque est 1, calibrée
       pour une souris ; au doigt sur un téléphone, elle rejette des traits
       pourtant justes. 1.8 accepte l'à-peu-près de position et de courbure sans
       rien céder sur l'ORDRE ni sur le SENS des traits, qui sont le vrai contenu
       de l'exercice. */
    leniency: 1.8,
    strokeColor: getComputedStyle(document.body).getPropertyValue("--ink").trim() || "#222",
    drawingColor: getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#c33",
    drawingWidth: 26, radicalColor: null,
    charDataLoader: (ch, onComplete) => onComplete({ strokes: STROKES[ch].s, medians: STROKES[ch].m }),
  });
  /* Le repère du quadrillage aide à placer les traits, comme sur un cahier. */
  zone.insertAdjacentHTML("afterbegin", `<div class="trace-grille" style="width:${cote}px;height:${cote}px"></div>`);
  w.quiz({
    onMistake: () => { e.fautes++; },
    onComplete: () => {
      e.i++;
      if (e.i < e.lettres.length) setTimeout(traceCaractere, 350);
      else setTimeout(finTrace, 350);
    },
  });
  /* Trois sorties possibles, jamais bloquantes : un indice (les briques du
     caractère, sans montrer sa forme), revoir le tracé, ou renoncer.
     Renoncer compte comme un échec, ce qui est la stricte vérité. */
  $("trace-actions").innerHTML =
    `<button class="btn ghost" onclick="indiceTrace()">Indice</button>
     <button class="btn ghost" onclick="revoirTrace()">Montre-moi</button>
     <button class="btn ghost" onclick="abandonTrace()">Je ne sais pas</button>`;
  if ($("trace-indice")) $("trace-indice").innerHTML = "";
  traceEtat.writer = w;
}
/* Indice d'écriture (demande de Daphnée, 2026-08-21) : les briques qui
   composent le caractère et son histoire mnémotechnique, sans jamais montrer
   la forme complète. Le caractère cible est masqué (◻) s'il apparaît dans sa
   propre histoire. Coût : une faute, bien moins que « Montre-moi » (deux). */
function indiceTrace() {
  const e = traceEtat;
  if (!e || !$("trace-indice")) return;
  const ch = e.lettres[e.i];
  const h = hzIndex().get(ch);
  e.fautes++;
  let html = "";
  if (h && (h.parts || []).length) {
    html += `<div class="dico-decomp">${h.parts.map(p =>
      `<span class="dico-mot"><span class="hanzi">${esc(p[0])}</span> ${esc(p[2])} <span style="color:var(--muted)">(${ROLE_LABEL[p[1]]})</span></span>`).join("")}</div>`;
  }
  if (h && h.histoire) html += `<div style="margin-top:.3rem">${glose(h.histoire)}</div>`;
  if (!html && STROKES && STROKES[ch]) html = `<div>${STROKES[ch].s.length} traits, pas de décomposition connue.</div>`;
  if (!html) html = `<div>Pas d'indice pour ce caractère.</div>`;
  $("trace-indice").innerHTML = `<div class="expl">${html.split(ch).join("◻")}</div>`;
}
function revoirTrace() {
  const e = traceEtat;
  if (!e || !e.writer) return;
  e.fautes += 2; // voir le modèle n'est pas le retrouver, mais ne condamne plus la carte
  e.writer.animateCharacter({ onComplete: () => e.writer.quiz({
    onMistake: () => { e.fautes++; },
    onComplete: () => { e.i++; (e.i < e.lettres.length ? traceCaractere : finTrace)(); },
  }) });
}
function abandonTrace() {
  if (!traceEtat) return;
  traceEtat.fautes += 99;
  finTrace();
}
function finTrace() {
  const e = traceEtat;
  if (!e) return;
  const card = e.card;
  /* Quatre fautes tolérées sur l'ensemble du mot. Le seuil précédent (deux)
     sanctionnait des hésitations de geste plutôt qu'un défaut de mémoire, et
     mieux vaut être exigeant sur le tracé qu'expéditif sur le verdict. */
  const ok = e.fautes <= 4;
  $("trace-actions").innerHTML = "";
  $("trace-consigne").textContent = "";
  $("answer-zone").innerHTML =
    `<div class="verdict ${ok ? "ok" : "ko"}">${ok ? "Retrouvé de mémoire" : "À revoir"}</div>
     <div class="q-hanzi small hanzi">${esc(card.hanzi)}</div>
     <div class="q-pinyin">${renderPinyin(card.pinyin)}</div>
     ${decompHTML(card.hanzi)}
     <div><button class="audio-btn" onclick="speak(${jsattr(card.hanzi)})">🔊 Écouter</button></div>`;
  $("answer-zone").classList.remove("hidden");
  autoGrade(ok);
  $("grades-slot").innerHTML = nextOnlyHTML();
  traceEtat = null;
}
/* Repli : sans données de tracé (caractère absent, réseau coupé), on revient à
   la saisie au clavier plutôt que de bloquer la carte. */
function replierSurClavier(card, err) {
  const zone = $("trace-zone");
  if (!zone) return;
  zone.innerHTML = "";
  $("trace-consigne").textContent = "Écris-le";
  $("trace-actions").innerHTML =
    `<p class="hint">Tracé indisponible ${err && err.message ? "(" + esc(err.message) + ")" : ""}. Écris au clavier pour cette fois.</p>
     <input class="answer" id="write-input" lang="zh-CN" autocomplete="off"
            autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done">`;
  $("reveal-zone").classList.remove("hidden");
  $("reveal-zone").innerHTML = `<button class="btn secondary" onclick="checkWriting()">Vérifier</button>`;
}

function phraseHTML(c) {
  if (!c.mots || !c.mots.length) return `<div class="q-phrase hanzi">${esc(c.phrase)}</div>`;
  let html = "", i = 0, wi = 0;
  while (i < c.phrase.length) {
    const m = c.mots[wi];
    if (m && c.phrase.startsWith(m[0], i)) {
      html += `<button class="pword hanzi" onclick="showGloss(this, ${wi})">${esc(m[0])}</button>`;
      i += m[0].length; wi++;
    } else {
      html += esc(c.phrase[i]); i++;
    }
  }
  /* L'affordance ne s'explique que le temps de l'apprendre : le soulignement
     pointillé des mots suffit ensuite, et la consigne cesse d'être relue. */
  const aide = state.reviews < 20
    ? `<p class="q-prompt gloss-hint">Touche un mot de la phrase pour voir son sens</p>` : "";
  return `<div class="q-phrase hanzi">${html}</div>${aide}
    <div class="gloss" id="gloss-zone"></div>`;
}
function showGloss(el, wi) {
  const m = queue[qIndex].card.mots[wi];
  if (!m) return;
  document.querySelectorAll(".pword.active").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  $("gloss-zone").innerHTML =
    `<span class="hanzi">${esc(m[0])}</span> <span class="q-pinyin" style="font-size:1.05rem">${renderPinyin(m[1])}</span> : ${esc(m[2])}
     <button class="audio-btn" onclick="speak(${jsattr(m[0])})">🔊</button>`;
}

/* Le classificateur appartient au mot, pas à une leçon de grammaire séparée :
   il s'affiche donc partout où le mot apparaît. On n'apprend jamais 椅子 sans 把. */
/* Une expression figée ne s'apprend pas comme un mot : ce qui compte n'est pas
   sa traduction mais le moment où on l'emploie, et avec qui. Le champ `usage`
   porte ça, et il s'affiche partout où la carte se retourne. */
function usageHTML(c) {
  if (!c) return "";
  /* Deux notes de même nature à l'écran : quand employer une expression, et
     comment un mot composé est fabriqué. La seconde est le vrai levier sur le
     vocabulaire technique, où presque tout se déduit de deux ou trois briques. */
  return (c.usage ? `<div class="usage-note">${glose(c.usage)}</div>` : "")
       + (c.construction ? `<div class="usage-note construction">${glose(c.construction)}</div>` : "");
}
function clHTML(c, avecNote) {
  if (!c.cl) return "";
  return `<div class="cl-bloc"><span class="cl-lab">classificateur</span>
    <span class="hanzi cl-zi">${esc(c.cl)}</span> <span class="cl-py">${renderPinyin(c.cl_pinyin)}</span>
    <span class="cl-ex hanzi">一${esc(c.cl)}${esc(c.hanzi)}</span>
    ${avecNote ? `<div class="cl-note">${glose(c.cl_note)}</div>` : ""}</div>`;
}
function cardHTML(c, mode) {
  /* Boutons audio en icônes seules : « Écouter / Lent / La phrase / Lente »
     faisait quatre cibles qui ne se distinguaient qu'à la lecture, dont deux
     par un « e » final. */
  const audio = (t, label) => `<div class="audio-row">
    <button class="audio-btn" onclick="speak(${jsattr(t)})" aria-label="Écouter ${label}">🔊</button>
    <button class="audio-btn" onclick="speak(${jsattr(t)}, 0.55)" aria-label="Écouter ${label} lentement">🐢</button>
  </div>`;
  const audioBtns = audio(c.hanzi, "le mot");
  const phrase = c.phrase ? `<hr class="divider">${phraseHTML(c)}
    ${c.phraseFr ? `<div class="q-phrase-fr">${esc(c.phraseFr)}</div>` : ""}
    ${audio(c.phrase, "la phrase")}` : "";
  const answer = `<div class="q-pinyin">${renderPinyin(c.pinyin)}</div><div class="q-fr">${esc(c.fr)}</div>`;
  /* Sur la piste Son, les caractères ne sont qu'une information de contexte, jamais la question */
  const ziAside = `<div class="aside-zi">à l'écrit : <span class="hanzi">${esc(c.hanzi)}</span></div>`;

  /* --- Découverte : tout est montré, rien n'est demandé. Le test vient plus
     loin dans la session (piste Son), les caractères une autre fois. --- */
  if (mode === "decouverte") return `<div class="qcard">
      <div class="q-prompt">Nouveau mot : lis, écoute, puis continue. Il te sera demandé un peu plus loin.</div>
      <div class="q-hanzi hanzi">${esc(c.hanzi)}</div>
      ${answer}
      ${audioBtns}
      ${usageHTML(c)}${clHTML(c, true)}${phrase}
      ${decompHTML(c.hanzi)}
      <button class="btn" onclick="finDecouverte()">Vu, on continue ›</button>
    </div>`;

  /* --- Piste Son ---
     Consignes réduites à l'essentiel : la carte se touche n'importe où pour révéler,
     donc plus besoin de dire « puis révèle » à chaque fois. */
  if (mode === "pinyin") return `<div class="qcard tappable" onclick="cardTap(event)">
      <div class="q-pinyin" style="font-size:2.4rem">${renderPinyin(c.pinyin)}</div>
      <div class="q-prompt">Le sens ?</div>
      ${audioBtns}
      <div id="reveal-zone"><button class="btn secondary" onclick="reveal()">Révéler</button></div>
      <div id="answer-zone" class="hidden"><div class="q-fr">${esc(c.fr)}</div>${usageHTML(c)}${clHTML(c)}${ziAside}${phrase}</div>
    </div>${gradesHTML()}`;

  if (mode === "ecoute") return `<div class="qcard tappable" onclick="cardTap(event)">
      <button class="big-audio" onclick="speak(${jsattr(c.hanzi)})" aria-label="Réécouter">🔊</button>
      <div class="q-prompt">Qu'as-tu entendu ?</div>
      <div class="audio-row"><button class="audio-btn" onclick="speak(${jsattr(c.hanzi)}, 0.55)" aria-label="Réécouter lentement">🐢</button></div>
      <div id="reveal-zone"><button class="btn secondary" onclick="reveal()">Révéler</button></div>
      <div id="answer-zone" class="hidden">${answer}${ziAside}${phrase}</div>
    </div>${gradesHTML()}`;

  /* --- Piste Caractères --- */
  /* Reconnaissance (onglet Cours) : QCM noté par l'app, voir startReco. */
  if (mode === "reco") {
    const it = queue[qIndex] || {}, forme = it.variante === "forme";
    return `<div class="qcard">
      ${forme ? `<div class="q-prompt">Lequel veut dire :</div><div class="q-fr">« ${esc(c.fr)} »</div>`
        : `<div class="q-prompt">Que veut dire ce mot ?</div><div class="q-hanzi hanzi">${esc(c.hanzi)}</div>`}
      <div class="opts" id="opts">${(it.opts || []).map((d, i) => forme
        ? `<button class="hanzi" style="font-size:1.9rem" onclick="checkReco(${i})">${esc(d.hanzi)}</button>`
        : `<button onclick="checkReco(${i})">${esc(d.fr)}</button>`).join("")}</div>
      <div id="answer-zone" class="hidden"></div>
    </div><div id="grades-slot"></div>`;
  }
  if (mode === "lecture") return `<div class="qcard tappable" onclick="cardTap(event)">
      <div class="q-hanzi hanzi">${esc(c.hanzi)}</div>
      <div class="q-prompt">Pinyin et sens ?</div>
      <div id="reveal-zone"><button class="btn secondary" onclick="reveal()">Révéler</button></div>
      <div id="answer-zone" class="hidden">${answer}${usageHTML(c)}${clHTML(c)}${audioBtns}${decompHTML(c.hanzi)}${phrase}</div>
    </div>${gradesHTML()}`;

  /* Fabrication de la phrase complète du mot, en remettant ses blocs dans
     l'ordre. Réservé à la consolidation : le sens français est donné, le mot
     travaillé est mis en avant, deux leurres tirés du reste du vocabulaire
     rendent l'assemblage non trivial. */
  /* Construction de zéro (atelier, 2026-08-22) : le français seul, et elle
     écrit la phrase entière au clavier chinois. Aucune banque de mots : une
     liste de mots suggérés dispense de se rappeler les mots eux-mêmes, et
     c'est précisément ce rappel qu'elle veut travailler. L'indice donne le
     pinyin, pas les caractères. */
  /* Aides graduées (2026-10-27, « c'est encore difficile pour les phrases
     longues ») : d'abord l'ordre des idées en français, qui montre la
     structure sans donner un seul caractère, puis le pinyin, puis les blocs à
     assembler, et enfin l'escalier quand la phrase en a un. Chaque aide
     dévoile un peu plus : elle prend la première qui la débloque. */
  if (mode === "construire") return `<div class="qcard">
      <div class="q-prompt">Écris ou dicte toute la phrase en caractères</div>
      <div class="q-fr">« ${esc(c.phraseFr || c.fr)} »</div>
      <input class="answer" id="write-input" lang="zh-CN" autocomplete="off"
             autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done">
      ${dicterHTML()}
      <div id="constr-indice"></div>
      <div id="reveal-zone">
        <button class="btn secondary" onclick="checkConstruire()">Vérifier</button>
        <button class="btn ghost" onclick="voirConstruire()">Voir la réponse</button>
        <details class="gram-plus"><summary>Je bloque : m'aider à la construire</summary>
          <button class="btn ghost" onclick="constrIdees()">1. L'ordre des idées</button>
          <button class="btn ghost" onclick="indiceConstruire()">2. Le pinyin</button>
          <button class="btn ghost" onclick="constrBlocs()">3. Assembler avec les blocs</button>
          ${escalierDe(c.phrase) ? `<button class="btn ghost" onclick="constrEscalier()">4. La construire pas à pas</button>` : ""}
        </details>
      </div>
      ${sansParlerActif() && queue[qIndex] && queue[qIndex].sansParler ? sansParlerNote() : ""}
      <div id="answer-zone" class="hidden"></div>
    </div><div id="grades-slot"></div>`;

  if (mode === "escalier") { escPas = 0; escOk = true; return escEtapeHTML(c.esc, 0); }

  /* Écrire un mot au clavier chinois, à la place de le dire (voir « Sans parler »). */
  if (mode === "clavier") return `<div class="qcard">
      <div class="q-fr">« ${esc(c.fr)} »</div>
      <div class="q-prompt">Écris-le en chinois</div>
      <input class="answer" id="write-input" lang="zh-CN" autocomplete="off"
             autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done">
      <div id="reveal-zone"><button class="btn secondary" onclick="checkWriting()">Vérifier</button></div>
      ${sansParlerActif() ? sansParlerNote() : ""}
      <div id="answer-zone" class="hidden"></div>
    </div><div id="grades-slot"></div>`;

  if (mode === "phrase") return `<div class="qcard">
      <div class="q-prompt">Fabrique la phrase complète avec
        <span class="hanzi" style="font-size:1.4rem">${esc(c.hanzi)}</span>
        <span class="q-pinyin" style="font-size:1.05rem">${renderPinyin(c.pinyin)}</span></div>
      <div class="q-fr">« ${esc(c.phraseFr || c.fr)} »</div>
      <div class="drop" id="drop"></div>
      <div class="segs" id="segs"></div>
      <div id="reveal-zone"><button class="btn secondary" onclick="checkPhrase()">Vérifier</button></div>
      <div id="answer-zone" class="hidden"></div>
    </div><div id="grades-slot"></div>`;

  /* Le pinyin est donné : on teste les caractères seuls, pas le rappel du son.
     La carte n'est pas « tappable » ici, un tap parasite fermerait le clavier. */
  /* Écriture : elle trace au doigt, de mémoire. Le pinyin et le sens sont
     donnés, le caractère non. L'ancienne version faisait taper au clavier
     chinois, qui est un IME pinyin : on tapait le son (déjà affiché) et on
     choisissait le caractère dans une liste. C'était de la reconnaissance
     assistée, jamais du rappel de la forme. */
  if (mode === "ecriture") return `<div class="qcard">
      <div class="q-pinyin">${renderPinyin(c.pinyin)}</div>
      <div class="q-fr">« ${esc(c.fr)} »</div>
      <div class="q-prompt" id="trace-consigne">Trace-le de mémoire</div>
      <div class="trace-wrap"><div id="trace-zone"></div></div>
      <div class="trace-actions" id="trace-actions"></div>
      <div id="trace-indice"></div>
      <div id="reveal-zone" class="hidden"></div>
      <div id="answer-zone" class="hidden"></div>
    </div><div id="grades-slot"></div>`;

  /* oral : le micro est optionnel et ne bloque jamais ; « Révéler » est toujours dispo */
  const target = c.phrase || c.hanzi;
  const targetFr = c.phrase ? (c.phraseFr || c.fr) : c.fr;
  const sr = hasRecog();
  return `<div class="qcard tappable" onclick="cardTap(event)">
      <div class="q-fr">« ${esc(targetFr)} »</div>
      <div class="q-prompt">Dis-le en chinois</div>
      <div id="reveal-zone">
        <button class="btn" onclick="reveal()">Révéler</button>
        ${sr ? `<button class="audio-btn" id="mic-btn" onclick="toggleRecog(${jsattr(target)})">🎙️ M'enregistrer</button>
                <div class="heard" id="heard"></div>` : ""}
        <div class="sans-parler">
          <button class="btn ghost" onclick="oralEcrit()">⌨️ Je ne peux pas parler : l'écrire</button>
          <button class="btn ghost" onclick="oralAutre()">Un autre exercice</button>
        </div>
      </div>
      <div id="answer-zone" class="hidden">
        <div class="cmp-row"><span class="cmp-lab">Modèle</span><span class="ruby">${rubyHTML(target)}</span></div>
        <div class="q-fr">${esc(c.hanzi)} <span class="q-pinyin">${renderPinyin(c.pinyin)}</span> : ${esc(c.fr)}</div>
        ${audio(target, "le modèle")}
        <div class="q-prompt">Réécoute et répète 2 fois</div>
      </div>
    </div>${gradesHTML()}`;
}
/* Tap n'importe où sur la carte pour révéler, sauf sur un bouton */
function cardTap(ev) {
  if (ev.target.closest("button")) return;
  if ($("reveal-zone") && !$("reveal-zone").classList.contains("hidden")) reveal();
}

/* Deux boutons, une seule question : est-ce que tu le savais ?
   Le calcul de la prochaine échéance est entièrement en arrière-plan. */
function gradesHTML() {
  return `<div class="grades" id="grades" style="visibility:hidden">
    <button class="g-again" onclick="grade(0)">✕ Pas su</button>
    <button class="g-good" onclick="grade(1)">✓ Su</button>
  </div>`;
}
/* Modes où l'app sait elle-même si c'est juste : elle note à la place de
   Daphnée et n'affiche qu'un bouton pour continuer. */
function nextOnlyHTML() {
  return `<div class="grades" id="grades" style="grid-template-columns:1fr">
    <button class="g-good" onclick="advance()">Suivant ›</button>
  </div>`;
}
/* Notation déclenchée par l'app elle-même (écriture vérifiée caractère par
   caractère). Elle planifie tout de suite ; le bouton « Suivant » ne fait
   qu'avancer. */
function autoGrade(ok) {
  const it = queue[qIndex];
  if (!it) return;
  /* Entraînement ciblé libre (traduction, atelier de cours) : rien n'est
     planifié, mais le score de fin doit compter ces phrases. */
  if (sessPractice && mixCible) { noterMix(ok, it.card.phrase || it.card.hanzi); if (!ok && !sessErrors.includes(it)) sessErrors.push(it); }
  if (sessPractice) return;
  const tr = it.card[it.track];
  noteDecouverte(it.card);
  schedule(tr, ok, it.track, voletDe(it.card) === "cours");
  compterPassage();
  if (ok) sessOk++;
  else { if (!sessErrors.includes(it)) sessErrors.push(it); noteFaibleJour(it.card.hanzi); }
  noterMix(ok, it.card.hanzi + " " + it.card.pinyin + " « " + it.card.fr + " »");
  save();
}
function advance() { qIndex++; nextCard(); }
/* Fin d'une carte de découverte : le mot est compté découvert (quota du jour),
   marqué vu, et rien n'est planifié : la première note viendra du test. */
function finDecouverte() {
  const it = queue[qIndex];
  if (!it) return;
  if (!sessPractice) { noteDecouverte(it.card); it.card.vu = todayKey(); save(); }
  advance();
}

/* « Je maîtrise » : la carte n'est pas notée, elle est propulsée loin dans le
   temps. bestGap n'est pas touché, donc elle n'est pas comptée en mémoire
   longue : on note qu'elle n'a plus besoin d'être travaillée, on ne prétend
   pas qu'elle a été prouvée. Sert à purger la file de ce qu'elle sait déjà. */
function markKnown() {
  if (sessMode !== "srs" || sessPractice) return;
  const it = queue[qIndex];
  if (!it) return;
  const tr = it.card[it.track];
  tr.inter = Math.max(tr.inter, 60);
  tr.ease = Math.max(tr.ease || 2.2, 2.5);
  tr.due = Date.now() + tr.inter * 864e5;
  const etaitConnu = estConnu(tr);
  tr.connu = true;
  /* Le mot est rencontré, et déclaré su : les deux doivent être enregistrés.
     Sans cet appel, un mot jamais vu poussé à 60 jours par « Acquis » gardait
     `reviews` à zéro : il restait « à découvrir » dans le parcours, ne comptait
     ni comme croisé ni comme connu, ne consommait pas le quota de nouveautés du
     jour, et reparaissait indéfiniment dans « Faire le point » (2026-08-21). */
  noteDecouverte(it.card);
  if (!etaitConnu) noteSu(it.track);
  save();
  advance();
}

function reveal() {
  $("reveal-zone").classList.add("hidden");
  $("answer-zone").classList.remove("hidden");
  $("grades").style.visibility = "visible";
}

/* ---- Mode écriture ---- */
function checkWriting() {
  avecSaisie(brut => jugerEcriture(brut), queue[qIndex].card.hanzi);
}
function jugerEcriture(raw) {
  const card = queue[qIndex].card;
  const got = normHanzi(raw), want = normHanzi(card.hanzi);
  const ok = got === want;
  const diff = diffHTML(got, want);
  $("answer-zone").innerHTML =
    `<div class="verdict ${ok ? "ok" : "ko"}">${ok ? "Correct !" : "Pas tout à fait"}</div>
     ${ok ? "" : `<div class="q-hanzi small hanzi diff">${diff}</div>`}
     <div class="q-hanzi small hanzi">${esc(card.hanzi)}</div>
     <div class="q-pinyin">${renderPinyin(card.pinyin)}</div>
     ${decompHTML(card.hanzi)}
     <div><button class="audio-btn" onclick="speak(${jsattr(card.hanzi)})">🔊 Écouter</button></div>`;
  $("reveal-zone").classList.add("hidden");
  $("answer-zone").classList.remove("hidden");
  /* La comparaison des caractères est fiable : l'app note toute seule. */
  autoGrade(ok);
  $("grades-slot").innerHTML = nextOnlyHTML();
}

/* ---- Mode phrase : remettre la phrase du mot dans l'ordre ---- */
let phrLibre = [], phrChoisi = [], phrCible = "";
/* Leurres pris dans le reste du vocabulaire : jamais un morceau de la réponse
   (règle absolue des exercices d'ordre), jamais un mot de même sens qu'un
   segment, sinon on fabrique une seconde réponse correcte. */
function leurresPhrase(c, n) {
  const cible = normHanzi(c.phrase);
  const sens = new Set((c.mots || []).map(m => (m[2] || "").toLowerCase()));
  const cand = state.cards.filter(w => [...w.hanzi].length <= 2
    && cible.indexOf(normHanzi(w.hanzi)) < 0
    && !sens.has((w.fr || "").toLowerCase()));
  return shuffle(cand).slice(0, n).map(w => w.hanzi);
}
function initPhrase(c) {
  phrCible = normHanzi(c.phrase);
  const segs = c.mots.map(m => m[0]).concat(leurresPhrase(c, 2));
  phrLibre = shuffle(segs.map((s, i) => ({ s: s, i: i })));
  phrChoisi = [];
  renderPhrase();
}
function renderPhrase() {
  const drop = $("drop"), segs = $("segs");
  if (!drop || !segs) return;
  drop.innerHTML = phrChoisi.length
    ? phrChoisi.map((it, k) => `<button onclick="phrRetirer(${k})"><span class="ruby">${rubyHTML(it.s)}</span></button>`).join("")
    : `<span class="ph">Touche les mots dans le bon ordre (2 sont en trop)</span>`;
  segs.innerHTML = phrLibre.map((it, k) =>
    `<button onclick="phrAjouter(${k})"><span class="ruby">${rubyHTML(it.s)}</span></button>`).join("");
}
function phrAjouter(k) { phrChoisi.push(phrLibre[k]); phrLibre.splice(k, 1); renderPhrase(); }
function phrRetirer(k) { phrLibre.push(phrChoisi[k]); phrChoisi.splice(k, 1); renderPhrase(); }
/* ---- Mode construire : écrire toute la phrase depuis le français ---- */
function indiceConstruire() {
  const card = queue[qIndex].card;
  const py = (card.mots || []).map(m => m[1]).join("  ");
  if ($("constr-indice")) $("constr-indice").innerHTML =
    `<div class="expl" style="margin-top:.5rem">${renderPinyin(py)}</div>`;
}
function checkConstruire() {
  clorePrise();
  avecSaisie(brut => jugerConstruire(brut), queue[qIndex].card.phrase);
}
/* « Voir la réponse » (demande de Daphnée, 2026-11-11 : « pour qu'au moins
   je puisse apprendre même quand ça ne marche pas ») : la phrase s'affiche
   comme après une vérification, comptée « pas su ». */
function voirConstruire() {
  stopRecog();
  const inp = $("write-input");
  if (!inp || inp.readOnly) return;
  inp.readOnly = true;
  jugerConstruire(inp.value || "", true);
}
function jugerConstruire(brut, vu) {
  const card = queue[qIndex].card;
  const v = vu ? REPONSE_VUE : verdictPhrase(brut, card.phrase);
  $("reveal-zone").classList.add("hidden");
  $("answer-zone").innerHTML =
    `${v.html}
     <div class="ruby">${rubyHTML(card.phrase)}</div>
     ${card.phraseFr ? `<div class="q-phrase-fr">${esc(card.phraseFr)}</div>` : ""}
     <div><button class="audio-btn" onclick="speak(${jsattr(card.phrase)})">🔊 Écouter</button>
          <button class="audio-btn" onclick="speak(${jsattr(card.phrase)}, 0.55)">🐢 Lent</button></div>
     ${blocsHTML(blocsPhrase(card))}`;
  $("answer-zone").classList.remove("hidden");
  /* « Presque » : la note attend son choix, elle n'est pas posée d'office. */
  if (v.presque) $("grades-slot").innerHTML = `<div class="grades" id="grades" style="grid-template-columns:1fr">
      <button class="g-good" onclick="autoGrade(true); advance()">✓ Ma version dit la même chose</button>
      <button class="g-again" onclick="autoGrade(false); advance()">Suivant ›</button></div>`;
  else { autoGrade(v.ok); $("grades-slot").innerHTML = nextOnlyHTML(); }
  speak(card.phrase);
}

function checkPhrase() {
  const card = queue[qIndex].card;
  const ok = normHanzi(phrChoisi.map(it => it.s).join("")) === phrCible;
  $("reveal-zone").classList.add("hidden");
  $("segs").innerHTML = "";
  [...$("drop").children].forEach(b => { if (b.tagName === "BUTTON") b.disabled = true; });
  $("answer-zone").innerHTML =
    `<div class="verdict ${ok ? "ok" : "ko"}">${ok ? "✓ Correct" : "✕ Pas dans cet ordre"}</div>
     <div class="ruby">${rubyHTML(card.phrase)}</div>
     ${card.phraseFr ? `<div class="q-phrase-fr">${esc(card.phraseFr)}</div>` : ""}
     <div><button class="audio-btn" onclick="speak(${jsattr(card.phrase)})">🔊 Écouter</button>
          <button class="audio-btn" onclick="speak(${jsattr(card.phrase)}, 0.55)">🐢 Lent</button></div>
     ${blocsHTML(blocsPhrase(card))}`;
  $("answer-zone").classList.remove("hidden");
  autoGrade(ok);
  $("grades-slot").innerHTML = nextOnlyHTML();
  speak(card.phrase);
}

/* ---- Mode oral : micro optionnel, jamais bloquant ---- */
const MIC_LABEL = "🎙️ M'enregistrer";
let recog = null, recogTimer = null;
function hasRecog() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
