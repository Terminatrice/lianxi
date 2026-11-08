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
function nextErr() {
  if (window.speechSynthesis) speechSynthesis.cancel();
  if (eIndex >= errQueue.length) { endErrSession(); return; }
  const e = errQueue[eIndex];
  $("sess-track").textContent = "✎";
  $("know-btn").classList.add("hidden");
  majProgres(eIndex, errTotal);
  $("session").scrollTop = 0;
  /* L'ordre des deux propositions change à chaque passage : sinon la bonne
     réponse se repère à sa position au lieu de sa structure. */
  errOrder = shuffle([e.correct, e.dit]);
  $("card-zone").innerHTML = `<div class="qcard">
      <div class="q-prompt">Repris en cours le ${esc(e.date)}. Laquelle est juste ?</div>
      <div class="q-fr">« ${esc(e.fr)} »</div>
      <div class="opts" id="opts">${errOrder.map(o =>
        `<button onclick="answerErr(${jsattr(o)})"><span class="ruby">${rubyHTML(o)}</span></button>`).join("")}</div>
      <div id="answer-zone" class="hidden"></div>
    </div><div id="grades-slot"></div>`;
}
function answerErr(choix) {
  const e = errQueue[eIndex], ok = choix === e.correct;
  const opts = $("opts");
  [...opts.children].forEach((b, i) => {
    b.disabled = true;
    b.classList.add(errOrder[i] === e.correct ? "good" : "bad");
  });
  $("answer-zone").innerHTML =
    `<div class="verdict ${ok ? "ok" : "ko"}">${ok ? "✓ Correct" : "✕ C'est la version que tu avais dite en cours"}</div>
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

