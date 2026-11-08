/* ---- Notation & planification ----
   Tout se joue ici, à partir d'un seul bit d'information : su / pas su.
   Réussite : l'intervalle est multiplié par la facilité du mot, donc il s'allonge
   d'autant plus vite que le mot est bien retenu. Les deux premières réussites
   passent par des paliers fixes (demain, puis 3 jours) pour ne pas envoyer trop
   loin un mot vu une seule fois.
   Échec : retour à demain et facilité rabotée. Un mot souvent raté garde donc une
   facilité basse et reste durablement en révision rapprochée, même après une bonne
   réponse ponctuelle. C'est ce qui empêche la mémoire de court terme de faire
   passer un mot pour acquis. */
/* Compteurs d'activité du jour. Muets pendant un repassage, qui ne doit pas
   gonfler « cartes cette semaine » avec des cartes déjà comptées. */
function compterPassage() {
  if (sessPractice) return;
  state.reviews++;
  state.days[todayKey()] = (state.days[todayKey()] || 0) + 1;
}
/* Historique du jour où une piste devient SUE pour la première fois (bascule
   estConnu false -> true). Sert de rythme aux jauges et aux échéances : le
   rythme de découverte (state.decouvertes) mesurait ce qu'elle croise, pas ce
   qu'elle sait, et gonflait les projections d'un savoir jamais démontré
   (demande de Daphnée, 2026-08-31). Deux compteurs séparés, comme pour les
   découvertes : les mots de vocabulaire (state.sus) et les points de
   grammaire (state.gramSus), chacun avec son propre rythme et sa propre
   échéance dans echeanceHTML. */
function noteSu(kind) {
  const j = todayKey();
  if (TRACKS.indexOf(kind) >= 0) {
    if (!state.sus) state.sus = {};
    state.sus[j] = (state.sus[j] || 0) + 1;
  } else if (kind === "gram") {
    if (!state.gramSus) state.gramSus = {};
    state.gramSus[j] = (state.gramSus[j] || 0) + 1;
  }
}
function schedule(tr, ok, kind, calibrable) {
  /* Repassage de fin de session : on ne touche à rien. Réussir maintenant un
     point raté il y a deux minutes n'engage que la mémoire de travail.
     La garde est ici plutôt qu'aux appelants : `grade` et `autoGrade` la
     faisaient déjà pour le vocabulaire, mais la grammaire, les briques, les
     tons et les phrases reprises en cours planifiaient pendant le repassage.
     Tant qu'aucun repassage mixte n'existait, le cas ne se présentait pas. */
  if (sessPractice) return;
  const k = kind || "son";
  const etaitConnu = estConnu(tr);
  tr.reviews++;
  if (typeof tr.ease !== "number") tr.ease = EASE_START[k];
  /* Délai réellement écoulé depuis la dernière fois qu'elle a vu cette carte.
     C'est la seule mesure honnête de rétention : l'intervalle que l'algorithme
     vient d'attribuer n'est qu'une prédiction, il ne prouve rien. */
  const gap = tr.last ? (Date.now() - tr.last) / 864e5 : 0;
  tr.last = Date.now();
  if (ok) {
    tr.bestGap = Math.max(tr.bestGap || 0, gap);
    const step2 = STEP_2[k] || 3;
    /* Premier contact réussi sur un MOT : elle le connaissait déjà. Lui refaire
       monter l'échelle 1 jour → 3 jours → 8 jours reviendrait à lui réapprendre
       ce qu'elle sait, quatre fois. On vérifie une fois, à un mois.
       Ce raccourci ne vaut QUE pour le vocabulaire (corrigé le 2026-08-21).
       Appliqué à une règle de grammaire, à une brique ou à une phrase reprise
       en cours, il faisait disparaître le point pour un mois sur une seule bonne
       réponse, puis le déclarait « solide » sur ce seul écart : trois semaines
       de rétention créditées sans avoir jamais été démontrées. Reconnaître une
       structure une fois n'est pas la maîtriser, et c'est précisément ce que
       « solide » prétend prouver.
       Il ne vaut pas non plus pour un mot que le cours n'a jamais abordé
       (volets HSK en avance, veille IA, expressions, mots assemblés) : une
       première réussite y est une devinette après révélation, pas un savoir
       préalable, et l'envoyer à un mois le comptait « su » sur cette
       devinette (audit du 2026-09-16). Ces mots suivent l'échelle normale. */
    if (tr.reviews === 1 && !tr.inter && TRACKS.indexOf(k) >= 0 && calibrable !== false) tr.inter = CALIB_OK;
    else if (tr.inter < STEP_1) tr.inter = STEP_1;
    else if (tr.inter < step2) tr.inter = step2;
    else tr.inter = Math.min(MAX_INTER, Math.round(tr.inter * tr.ease));
    tr.ease = Math.min(EASE_MAX, tr.ease + EASE_UP);
  } else {
    tr.errors++;
    /* Un mot déjà tenu trois semaines qui flanche une fois n'a pas tout perdu :
       il redescend à quelques jours. Un mot fragile revient dès demain. */
    tr.inter = (tr.bestGap || 0) >= MATURE
      ? Math.min(7, Math.max(2, Math.round(tr.inter * 0.3)))
      : 1;
    tr.ease = Math.max(EASE_MIN, tr.ease - EASE_DOWN);
  }
  /* Le décalage aléatoire évite que 40 mots appris le même jour ne retombent
     tous ensemble des semaines plus tard. */
  const jitter = tr.inter >= 7 ? Math.floor(Math.random() * tr.inter * 0.15) : 0;
  tr.due = Date.now() + (tr.inter + jitter) * 864e5;
  if (!etaitConnu && estConnu(tr)) noteSu(k);
}
/* Maturité d'une piste, pour les compteurs d'accueil uniquement.
   Jamais affichée pendant une révision : rien à lire, rien à décider.
   Elle se lit sur `bestGap`, le plus long délai après lequel elle a réellement
   retrouvé le mot, jamais sur l'intervalle promis par l'algorithme. */
function maturity(tr) {
  if (!tr.reviews) return "neuf";
  const g = tr.bestGap || 0;
  if (g >= ANCRE) return "ancre";
  if (g >= MATURE) return "longue";
  if (g >= STEP_2.son) return "encours";
  return "fragile";
}

function grade(g) {
  if (sessMode === "gram") { gradeGram(g); return; }
  const it = queue[qIndex];
  /* Repassage libre en fin de session : on rejoue les cartes sans toucher à la
     planification. Réussir maintenant un mot raté il y a deux minutes ne prouve
     rien d'autre que la mémoire de travail. */
  if (sessPractice) { qIndex++; nextCard(); return; }
  const tr = it.card[it.track], ok = g !== 0;
  noteDecouverte(it.card);
  schedule(tr, ok, it.track, voletDe(it.card) === "cours");
  compterPassage();
  if (ok) sessOk++;
  else { if (!sessErrors.includes(it)) sessErrors.push(it); noteFaibleJour(it.card.hanzi); }
  noterMix(ok, it.card.hanzi + " " + it.card.pinyin + " « " + it.card.fr + " »");
  save();
  qIndex++;
  nextCard();
}

function itemLI(it) {
  return `<li><span class="w-hanzi hanzi">${esc(it.card.hanzi)}</span>
    <span class="w-mid"><span class="w-pinyin">${renderPinyin(it.card.pinyin)}</span><span class="w-theme">${TRACK_ICON[it.track]} ${esc(TRACK_LABEL[it.track])}</span><br><span class="w-fr">${esc(it.card.fr)}</span></span></li>`;
}
function endSession() {
  if (mixOn) { avancerMix(); return; }
  sessEnCours = false;
  $("prog-bar").style.width = "100%";
  $("prog-txt").textContent = "";
  if (sessPractice) {
    /* Une consolidation menée au bout consomme ses mots : le bouton de
       l'accueil propose alors la fournée suivante. */
    const etaitConso = !!consoMots;
    consommerConso();
    const restent = faiblesJour().length;
    $("card-zone").innerHTML = `<div class="qcard">
      <div class="q-hanzi hanzi">加油</div>
      <div class="q-pinyin">${renderPinyin("jiā yóu")}</div>
      <div class="q-fr">Repassage terminé sur ${sessTotal} carte(s).</div>
      ${etaitConso && restent
        ? `<p class="q-prompt">Il reste ${restent} mot${restent > 1 ? "s" : ""} du jour à consolider : la fournée suivante t'attend sur l'accueil.</p>`
        : `<p class="q-prompt">Ces mots reviendront d'eux-mêmes dans une prochaine session.</p>`}
      ${boutonFin()}
    </div>`;
    return;
  }
  const missed = sessErrors.concat(sessSkipped.filter(it => !sessErrors.includes(it)));
  const listHTML = block => block.items.length
    ? `<hr class="divider"><div class="end-list"><strong>${block.title}</strong>
       <ul class="words">${block.items.map(itemLI).join("")}</ul></div>` : "";
  const body = missed.length
    ? listHTML({ title: "À reprendre :", items: sessErrors }) +
      listHTML({ title: "Reportés à plus tard :", items: sessSkipped.filter(it => !sessErrors.includes(it)) }) +
      `<button class="btn secondary" onclick="replayMissed()">Repasser ces ${missed.length} carte(s) sans compter</button>
       <button class="btn ghost" onclick="copySessionReport()">Copier le bilan</button>
       <div class="msg" id="sess-msg"></div>`
    : `<p class="q-fr">Sans faute. 太好了 tài hǎo le !</p>`;
  $("card-zone").innerHTML = `<div class="qcard">
      <div class="q-hanzi hanzi">加油</div>
      <div class="q-pinyin">${renderPinyin("jiā yóu")}</div>
      <div class="q-fr">Session terminée sur ${sessTotal} carte(s).</div>
      <div class="score">
        <div class="sc ok"><div class="n">${sessOk}</div><div class="l">maîtrisées</div></div>
        <div class="sc ko"><div class="n">${sessErrors.length}</div><div class="l">à reprendre</div></div>
        <div class="sc"><div class="n">${sessSkipped.filter(it => !sessErrors.includes(it)).length}</div><div class="l">reportées</div></div>
      </div>
      ${body}
      ${boutonFin()}
    </div>`;
}
function copySessionReport() {
  const missed = sessErrors.concat(sessSkipped.filter(it => !sessErrors.includes(it)));
  const lines = missed.map(it =>
    `- ${it.card.hanzi} (${it.card.pinyin}) « ${it.card.fr} » : piste ${TRACK_LABEL[it.track]}${sessErrors.includes(it) ? " (raté)" : " (passé)"}`);
  const text = `Bilan de ma session Liànxí du ${todayKey()} : ${sessOk} réussites sur ${sessTotal}. Mots à intégrer au carnet et à la prochaine leçon (la piste indique si c'est le son ou les caractères qui coincent) :\n${lines.join("\n")}`;
  copyText(text, $("sess-msg"), "Copié. Colle-le dans ta session Claude Code.");
}

save();
render();
renderGram();
renderComp();
if (window.speechSynthesis) pickVoice();
majSyncUI();
verifierSyncAuDemarrage();
/* L'app passe en fond quand on la quitte ou qu'on verrouille l'écran : c'est
   le dernier moment sûr pour pousser ce qui vient d'être révisé. */
document.addEventListener("visibilitychange", () => { if (document.hidden) flushSync(); });
window.addEventListener("pagehide", flushSync);
window.addEventListener("resize", () => { if (curTab === "voix") voixDessiner(); });
