/* ---------- Quiz tons ---------- */
let toneQueue = [], toneIndex = 0, toneScore = 0, toneMissed = [], toneTimer = null;
const TONE_SESSION_MAX = 10;
const TONE_NOM = { 1: "1ᵉʳ ton", 2: "2ᵉ ton", 3: "3ᵉ ton", 4: "4ᵉ ton", 0: "ton neutre" };

/* Chaque caractère porte sa propre piste de tons, séparée de sa piste Son et de
   sa piste Caractères : savoir qu'un mot veut dire « livre » et savoir qu'il se
   dit au 1ᵉʳ ton sont deux souvenirs distincts, et c'est le second qui coince. */
function tonProg(h) {
  if (!state.tons) state.tons = {};
  if (!state.tons[h]) state.tons[h] = newTrack("ton");
  migrateTrack(state.tons[h], "ton");
  return state.tons[h];
}
/* Les confusions se comptent par paire (ton réel → ton annoncé). Une erreur
   isolée ne dit rien ; « 3ᵉ pris pour un 2ᵉ, onze fois » est un diagnostic. */
function noteConfusion(vrai, dit) {
  if (!state.tonConf) state.tonConf = {};
  const k = vrai + ">" + dit;
  state.tonConf[k] = (state.tonConf[k] || 0) + 1;
}
function tonsDue() {
  const dus = [], neufs = [];
  /* Les pistes sont créées d'abord, l'heure est relevée ensuite : une piste
     neuve porte `due = Date.now()` au moment de sa création, donc la lire avec
     un `now` capturé avant la boucle la faisait paraître due dans le futur, et
     le premier affichage annonçait zéro ton à travailler. */
  const items = tonesPool().map(it => ({ it, tr: tonProg(it.hanzi) }));
  const now = Date.now();
  items.forEach(({ it, tr }) => {
    if (tr.due > now) return;
    (tr.reviews ? dus : neufs).push(it);
  });
  dus.sort((a, b) => tonProg(a.hanzi).due - tonProg(b.hanzi).due);
  return dus.concat(shuffle(neufs));
}

/* Pool de caractères d'une seule syllabe, avec leur ton connu, dans le thème courant */
function tonesPool() {
  const seen = new Set(), pool = [];
  const add = (hanzi, pinyin, fr) => {
    if (!hanzi || [...hanzi].length !== 1 || seen.has(hanzi)) return;
    if (!/[a-zA-ZüÜ]/.test(pinyin || "")) return;
    seen.add(hanzi);
    pool.push({ hanzi, pinyin, fr, tone: toneOf(pinyin) });
  };
  /* Même précaution que pyIndex : le pinyin isolé du mot prime sur celui d'une
     décomposition, sinon le quiz demanderait le ton de 上 dans 桌子上 (neutre) au
     lieu de son vrai ton. */
  const cards = state.cards.filter(themeMatch);
  cards.forEach(c => { if ([...c.hanzi].length === 1) add(c.hanzi, c.pinyin, c.fr); });
  cards.forEach(c => (c.mots || []).forEach(m => { if ([...m[0]].length === 1) add(m[0], m[1], m[2]); }));
  return pool;
}
function startToneQuiz() {
  sessEnCours = true; if (state.reprise) { delete state.reprise; save(); }
  sessMode = "tones";
  const pool = tonesPool();
  toneQueue = tonsDue().slice(0, TONE_SESSION_MAX);
  if (!toneQueue.length) toneQueue = shuffle(pool).slice(0, TONE_SESSION_MAX);
  toneIndex = 0; toneScore = 0; toneMissed = [];
  speak(" ");
  $("session").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  if (pool.length < 4) {
    $("prog-bar").style.width = "0%"; $("prog-txt").textContent = "";
    $("card-zone").innerHTML = `<div class="qcard">
      <div class="q-fr">Il faut quelques mots d'un seul caractère pour le quiz de tons. Ajoute du vocabulaire, puis reviens.</div>
      <button class="btn" onclick="quitSession()">Fermer</button></div>`;
    return;
  }
  nextTone();
}
function nextTone() {
  if ($("session").classList.contains("hidden")) return;
  if (window.speechSynthesis) speechSynthesis.cancel();
  if (toneIndex >= toneQueue.length) { endToneQuiz(); return; }
  const it = toneQueue[toneIndex];
  majProgres(toneIndex, toneQueue.length);
  $("card-zone").innerHTML = `<span class="mode-tag">Quiz tons</span>
    <div class="qcard">
      <div class="q-hanzi hanzi">${esc(it.hanzi)}</div>
      <div class="q-pinyin">${esc(pinyinPlain(it.pinyin))}</div>
      <div class="q-prompt">Quel est le ton ?</div>
      <div><button class="audio-btn" onclick="speak(${jsattr(it.hanzi)})">🔊 Réécouter</button></div>
      <div class="tone-opts" id="tone-opts">
        <button class="t1" onclick="answerTone(1,this)">1ᵉʳ<br>ā</button>
        <button class="t2" onclick="answerTone(2,this)">2ᵉ<br>á</button>
        <button class="t3" onclick="answerTone(3,this)">3ᵉ<br>ǎ</button>
        <button class="t4" onclick="answerTone(4,this)">4ᵉ<br>à</button>
        <button class="t0" onclick="answerTone(0,this)">neutre<br>a</button>
      </div>
    </div>`;
  speak(it.hanzi);
}
function answerTone(t, btn) {
  const it = toneQueue[toneIndex];
  const opts = $("tone-opts");
  [...opts.children].forEach(b => b.disabled = true);
  compterPassage();
  const ok = t === it.tone;
  if (ok) {
    toneScore++;
    btn.classList.add("good");
  } else {
    btn.classList.add("bad");
    const idxOf = { 1: 0, 2: 1, 3: 2, 4: 3, 0: 4 };
    const good = opts.children[idxOf[it.tone]];
    if (good) good.classList.add("good");
    toneMissed.push(it);
    noteConfusion(it.tone, t);
    /* Un ton manqué signale un mot à consolider : on retrouve le mot du
       vocabulaire qui porte ce caractère pour la session de consolidation. */
    const cf = state.cards.find(c => c.hanzi === it.hanzi)
      || state.cards.find(c => c.hanzi.includes(it.hanzi));
    if (cf) noteFaibleJour(cf.hanzi);
  }
  /* Le quiz alimente la même mécanique que le reste : un ton retrouvé s'espace,
     un ton manqué revient. Sans ça, il se rejouait à vide indéfiniment. */
  schedule(tonProg(it.hanzi), ok, "ton");
  noterMix(ok, "ton de " + it.hanzi + " " + it.pinyin);
  save();
  toneTimer = setTimeout(() => { toneTimer = null; toneIndex++; nextTone(); }, 1300);
}
function endToneQuiz() {
  if (mixOn) { avancerMix(); return; }
  sessEnCours = false;
  $("prog-bar").style.width = "100%";
  $("prog-txt").textContent = "";
  const missed = toneMissed.length
    ? `<hr class="divider"><div class="end-list"><strong>Tons à revoir :</strong>
       <ul class="words">${toneMissed.map(it =>
         `<li><span class="w-hanzi hanzi">${esc(it.hanzi)}</span>
          <span class="w-mid"><span class="w-pinyin">${renderPinyin(it.pinyin)}</span><br><span class="w-fr">${esc(it.fr)}</span></span></li>`).join("")}
       </ul></div>`
    : `<p class="q-fr">Sans faute sur les tons. 太棒了 tài bàng le !</p>`;
  $("card-zone").innerHTML = `<div class="qcard">
      <div class="q-hanzi hanzi">声调</div>
      <div class="q-pinyin">${renderPinyin("shēngdiào")}</div>
      <div class="q-fr">Quiz tons terminé : ${toneScore} / ${toneQueue.length}.</div>
      ${missed}
      ${boutonFin()}
    </div>`;
}


/* ============================================================
   PRONONCIATION — trois entraînements, trois natures d'erreur
   ------------------------------------------------------------
   Diagnostic du cours du 2026-08-28 : 4ᵉ ton aplati en 2ᵉ ou 3ᵉ (6 fois),
   consonnes aspirées prononcées sans souffle (4), finales n/ng confondues (2),
   rétroflexes zh/z (2). Aucun de ces défauts n'était visible dans l'app :
   le Quiz tons teste de SAVOIR le ton, pas de le PRODUIRE, et la reconnaissance
   vocale du mode Oral normalise vers le mot le plus probable, donc elle valide
   un ton faux. D'où ces trois ajouts, du plus fondamental au plus fin.
   ============================================================ */

