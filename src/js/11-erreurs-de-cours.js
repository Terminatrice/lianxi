/* ---------- Mes erreurs de cours ----------
   Les phrases réellement produites en cours et corrigées par le professeur.
   L'exercice est un contraste minimal : la traduction française d'un côté,
   et le choix entre la forme correcte et EXACTEMENT ce qu'elle avait dit.
   Son erreur sert de leurre, ce qui en fait le distracteur le plus utile
   possible, et rend la discrimination personnelle plutôt qu'abstraite. */
const ERR_SESSION_MAX = 10;

function errProg(id) {
  if (!state.err) state.err = {};
  if (!state.err[id]) state.err[id] = Object.assign(newTrack("gram"), { vue: false });
  migrateTrack(state.err[id], "gram");
  return state.err[id];
}
function errDue() {
  /* Pistes créées d'abord, heure relevée ensuite : voir tonsDue(). */
  const prog = EMBED_ERREURS.map(e => ({ e, tr: errProg(e.id) }));
  const now = Date.now();
  return prog.filter(x => x.tr.due <= now).sort((a, b) => a.tr.due - b.tr.due).map(x => x.e);
}
/* Le panneau « Repris en cours » a été retiré de l'accueil le 2026-08-21 :
   il ne portait qu'un compteur, et les phrases reprises par la prof entrent
   désormais directement dans la session mixte. Le principe « apprendre de ses
   erreurs d'abord » n'est pas abandonné pour autant : elles gardent leur place
   réservée en tête de file (voir sessionMixte). */
let errQueue = [], eIndex = 0, errErrors = [], errOk = 0, errTotal = 0, errOrder = [];

function startErrSession() {
  ouvrirSession();
  const due = errDue().slice(0, ERR_SESSION_MAX);
  if (!due.length) return;
  sessMode = "err";
  errQueue = shuffle(due);
  eIndex = 0; errTotal = errQueue.length; errErrors = []; errOk = 0;
  speak(" ");
  $("session").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  nextErr();
}
/* Production plutôt que reconnaissance (2026-11-26). Jusqu'ici l'exercice
   proposait la version juste et la version dite en cours : un choix à deux,
   que la règle de l'app interdit, et qui après trois mois se résolvait en
   reconnaissant la phrase elle-même. Désormais elle reconstruit la phrase
   juste depuis le français. Les morceaux propres à sa version de cours (le 了
   en trop, le mauvais mot) sont mêlés aux blocs comme leurres : c'est son
   erreur réelle qu'elle doit refuser de refaire. Jamais un leurre contenu
   dans la réponse (règle absolue des exercices d'ordre). */
let errLibre = [], errChoisi = [];
function errBlocs(texte) {
  let segs = segment(texte).filter(x => !x[2]).map(x => x[0]);
  /* Phrase trop courte pour un vrai ordre : on descend au caractère. */
  if (segs.length < 3) segs = [...normHanzi(texte)];
  return segs;
}
function errLeurres(e) {
  const cible = normHanzi(e.correct);
  const out = [];
  errBlocs(e.dit).forEach(s => { if (cible.indexOf(s) < 0 && out.indexOf(s) < 0) out.push(s); });
  const vocab = shuffle(state.cards.filter(w => [...w.hanzi].length <= 2 && cible.indexOf(normHanzi(w.hanzi)) < 0
    && out.indexOf(w.hanzi) < 0));
  while (out.length < 2 && vocab.length) out.push(vocab.shift().hanzi);
  return out.slice(0, 3);
}
function nextErr() {
  if (window.speechSynthesis) speechSynthesis.cancel();
  if (eIndex >= errQueue.length) { endErrSession(); return; }
  const e = errQueue[eIndex];
  $("sess-track").textContent = "✎";
  $("know-btn").classList.add("hidden");
  majProgres(eIndex, errTotal);
  $("session").scrollTop = 0;
  const leurres = errLeurres(e);
  errLibre = shuffle(errBlocs(e.correct).concat(leurres).map((s, i) => ({ s, i })));
  errChoisi = [];
  $("card-zone").innerHTML = `<div class="qcard">
      <div class="q-prompt">Repris en cours le ${esc(e.date)}. Dis-le juste :
        <strong>${leurres.length} morceau${leurres.length > 1 ? "x" : ""} en trop.</strong></div>
      <div class="q-fr">« ${esc(e.fr)} »</div>
      <div class="drop" id="drop"></div>
      <div class="segs" id="segs"></div>
      <div id="reveal-zone"><button class="btn secondary" onclick="answerErr()">Vérifier</button>
        <button class="btn ghost" onclick="answerErr(true)">Voir la réponse</button></div>
      <div id="answer-zone" class="hidden"></div>
    </div><div id="grades-slot"></div>`;
  renderErrOrdre();
}
function renderErrOrdre() {
  const drop = $("drop"), segs = $("segs");
  if (!drop || !segs) return;
  drop.innerHTML = errChoisi.length
    ? errChoisi.map((it, k) => `<button onclick="errRetirer(${k})"><span class="ruby">${rubyHTML(it.s)}</span></button>`).join("")
    : `<span class="ph">Touche les mots dans le bon ordre</span>`;
  segs.innerHTML = errLibre.map((it, k) =>
    `<button onclick="errAjouter(${k})"><span class="ruby">${rubyHTML(it.s)}</span></button>`).join("");
}
function errAjouter(k) { errChoisi.push(errLibre[k]); errLibre.splice(k, 1); renderErrOrdre(); }
function errRetirer(k) { errLibre.push(errChoisi[k]); errChoisi.splice(k, 1); renderErrOrdre(); }
function answerErr(vu) {
  const e = errQueue[eIndex];
  const got = normHanzi(errChoisi.map(it => it.s).join(""));
  const ok = !vu && got === normHanzi(e.correct);
  const refait = !vu && got === normHanzi(e.dit);
  $("reveal-zone").classList.add("hidden");
  $("segs").innerHTML = "";
  [...$("drop").children].forEach(b => { if (b.tagName === "BUTTON") b.disabled = true; });
  $("answer-zone").innerHTML =
    `<div class="verdict ${ok ? "ok" : "ko"}">${ok ? "✓ Correct" : vu ? "La version juste" : refait ? "✕ C'est la version que tu avais dite en cours" : "✕ Pas tout à fait"}</div>
     <div class="contraste">
       <div class="ct ok"><span class="ct-m">✓</span><span class="ruby">${rubyHTML(e.correct)}</span></div>
       <div class="ct ko"><span class="ct-m">✕</span><span class="ruby">${rubyHTML(e.dit)}</span></div>
       <div class="ct-why">${glose(e.nature)}</div>
     </div>
     <div class="audio-row"><button class="audio-btn" onclick="speak(${jsattr(e.correct)})" aria-label="Écouter la forme correcte">🔊</button></div>`;
  $("answer-zone").classList.remove("hidden");
  const pr = errProg(e.id);
  pr.vue = true;
  schedule(pr, ok, "gram");
  compterPassage();
  if (ok) errOk++;
  else if (!errErrors.includes(e)) errErrors.push(e);
  noterMix(ok, e.correct + " « " + e.fr + " »");
  save();
  $("grades-slot").innerHTML = `<div class="grades" id="grades" style="grid-template-columns:1fr">
    <button class="g-good" onclick="advanceErr()">Suivant ›</button></div>`;
  speak(e.correct);
}
function advanceErr() { eIndex++; nextErr(); }
function endErrSession() {
  if (mixOn) { avancerMix(); return; }
  sessEnCours = false;
  $("prog-bar").style.width = "100%";
  $("prog-txt").textContent = "";
  const list = errErrors.length
    ? `<hr class="divider"><div class="end-list"><strong>À reprendre bientôt :</strong>
       <ul class="words">${errErrors.map(e =>
         `<li><span class="w-mid"><span class="ruby">${rubyHTML(e.correct)}</span><br><span class="w-fr">${esc(e.fr)}</span></span></li>`).join("")}</ul></div>`
    : `<p class="q-fr">Toutes corrigées. 太棒了 tài bàng le !</p>`;
  $("card-zone").innerHTML = `<div class="qcard">
      <div class="q-hanzi hanzi">进步</div>
      <div class="q-pinyin">${renderPinyin("jìnbù")}</div>
      <div class="q-fr">Terminé : ${errOk} / ${errTotal}.</div>
      ${list}
      ${boutonFin()}
    </div>`;
}

