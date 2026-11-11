/* ---------- Écoute vocale (refonte du 2026-11-08) ----------
   Bug constaté sur iPhone (dictée « Je n'ai rien entendu », champ vide) :
   Safari iOS en écoute continue ne livre souvent JAMAIS de résultat définitif.
   Il fait grossir un seul résultat provisoire, et stop() peut ne rendre ni le
   résultat final ni même onend. L'ancien code ne gardait que le définitif.
   Désormais : on demande les résultats provisoires, on garde la DERNIÈRE
   version de chaque morceau (remplacée, jamais empilée), et si Safari ne rend
   pas la main après « J'ai fini de parler », on conclut nous-mêmes avec ce
   qui a été entendu. Une seule mécanique pour la dictée et le mode Oral. */
/* Relance automatique (2026-11-09). Bug restant sur iPhone, onglet Cours,
   « Traduire les phrases » et « Phrases pas à pas » : « Je n'ai rien entendu »
   puis « Le champ est vide ». Safari iOS arrête l'écoute de lui-même après
   quelques secondes de silence, ou à la première pause dans la phrase. Dans un
   exercice de traduction, elle réfléchit avant de parler : le micro était déjà
   coupé quand elle commençait. Désormais, tant qu'elle n'a pas touché « J'ai
   fini de parler », un arrêt du moteur relance une nouvelle écoute en gardant
   ce qui a déjà été entendu (les morceaux de la reprise s'ajoutent à la suite).
   Bornes : ECOUTE_MAX_MS au total, RELANCES_MAX relances. */
const ECOUTE_MAX_MS = 60000, RELANCES_MAX = 12;
/* Journal des dernières écoutes, copiable depuis Mots > Maintenance : si le
   micro se comporte encore mal sur le téléphone, c'est la seule trace de ce
   que Safari a réellement fait. */
/* Gardé dans le téléphone (2026-11-11) : le journal ne vivait qu'en mémoire et
   disparaissait au rechargement, donc jamais disponible quand on en avait
   besoin. */
const JOURNAL_CLE = "lianxi-journal-micro";
const journalMicro = (() => { try { return JSON.parse(localStorage.getItem(JOURNAL_CLE)) || []; } catch (e) { return []; } })();
function noteMicro(ev, detail) {
  journalMicro.push(`${new Date().toISOString().slice(0, 23).replace("T", " ")} ${ev}${detail ? " : " + detail : ""}`);
  while (journalMicro.length > 150) journalMicro.shift();
  try { localStorage.setItem(JOURNAL_CLE, JSON.stringify(journalMicro)); } catch (e) {}
}
/* App ouverte depuis l'icône de l'écran d'accueil (et non dans Safari). */
function appEcranAccueil() {
  try { return navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches); } catch (e) { return false; }
}
function copierJournalMicro() {
  const ua = navigator.userAgent || "";
  copyText(`Journal du micro Liànxí (${todayKey()})\n${ua}\nOuverte depuis l'écran d'accueil : ${appEcranAccueil() ? "oui" : "non"}\n${journalMicro.join("\n") || "(aucune écoute enregistrée)"}`,
    $("maint-msg"), "Journal du micro copié. Colle-le dans ta session Claude Code.");
}
function lancerEcoute({ alternatives = 1, surTexte, surFin, surErreur }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return false;
  stopRecog();
  /* Une voix de l'app encore en train de parler occupe le son de l'iPhone. */
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  const debut = Date.now(), sess = { finVoulue: false };
  let morceaux = [], base = 0, fini = false, relances = 0, r = null;
  const entendu = () => morceaux.filter(m => m && m.some(Boolean));
  const conclure = () => {
    if (fini) return;
    fini = true;
    if (recog === r) recog = null;
    if (recogTimer) { clearTimeout(recogTimer); recogTimer = null; }
    if (r) { r.onresult = r.onerror = r.onend = null; try { r.abort(); } catch (e) {} }
    noteMicro("fin", `${entendu().length} morceau(x), « ${texteEntendu(entendu())} »`);
    surFin(entendu());
  };
  sess.conclure = conclure;
  const relancer = raison => {
    if (fini) return;
    if (sess.finVoulue || relances >= RELANCES_MAX || Date.now() - debut > ECOUTE_MAX_MS) { conclure(); return; }
    relances++;
    base = morceaux.length;
    noteMicro("relance", raison);
    if (!demarrer()) { noteMicro("relance impossible"); conclure(); }
  };
  function demarrer() {
    let x;
    try { x = new SR(); } catch (e) { return false; }
    r = x; recog = x;
    x.sess = sess; x.conclure = conclure;
    x.lang = "zh-CN";
    x.continuous = true;
    x.interimResults = true;
    x.maxAlternatives = alternatives;
    x.onresult = ev => {
      if (x !== r || fini) return;
      for (let i = 0; i < ev.results.length; i++) morceaux[base + i] = Array.from(ev.results[i]).map(a => a.transcript || "");
      noteMicro("résultat", texteEntendu(entendu()));
      if (surTexte) surTexte(texteEntendu(entendu()));
    };
    x.onerror = ev => {
      if (x !== r || fini) return;
      noteMicro("erreur", ev.error);
      /* Silence ou coupure du moteur : la fin (onend) qui suit décide de la relance. */
      if (ev.error === "no-speech" || ev.error === "aborted") return;
      x.onend = null;
      if (entendu().length) { conclure(); return; }
      fini = true;
      if (recog === x) recog = null;
      stopRecog();
      if (surErreur) surErreur(ev.error);
    };
    x.onend = () => { if (x === r) relancer("arrêt du moteur"); };
    try { x.start(); } catch (e) { if (recog === x) recog = null; return false; }
    noteMicro("écoute", relances ? `reprise ${relances}` : `début${appEcranAccueil() ? " (écran d'accueil)" : ""}`);
    return true;
  }
  if (!demarrer()) return false;
  recogTimer = setTimeout(finirRecog, ECOUTE_MAX_MS); // filet de sécurité si iOS ne rend jamais la main
  return true;
}
/* Texte d'une prise : la meilleure alternative de chaque morceau, mis bout à
   bout. iOS renvoie parfois des morceaux cumulatifs (le suivant reprend le
   précédent) : on ne garde alors que le plus long. */
function texteEntendu(morceaux, cible) {
  const cibleSyl = cible ? syllabes(cible) : null;
  const choisis = morceaux.map(alts => cibleSyl
    ? alts.reduce((m, a) => lcsLen(syllabes(a), cibleSyl) > lcsLen(syllabes(m), cibleSyl) ? a : m, alts[0] || "")
    : alts[0] || "").map(t => t.replace(/\s+/g, "")).filter(Boolean);
  /* La comparaison ignore la ponctuation : iOS en ajoute (« 我喜欢。 » puis
     « 我喜欢喝茶。 ») et la reprise passait alors en double. */
  const gardes = choisis.filter((t, i) => !(choisis[i + 1] && normHanzi(choisis[i + 1]).startsWith(normHanzi(t))));
  /* Un point ajouté par iOS à la pause ne doit pas couper la phrase en deux. */
  return gardes.map((t, i) => i < gardes.length - 1 ? t.replace(/[。.!?！？]+$/, "") : t).join("");
}
/* Abandon silencieux (changement de carte, session quittée) : tout est jeté. */
function stopRecog() {
  if (recogTimer) { clearTimeout(recogTimer); recogTimer = null; }
  if (recog) { const r = recog; recog = null; r.onresult = r.onerror = r.onend = null; try { r.abort(); } catch (e) {} }
  const mic = $("mic-btn");
  if (mic) mic.textContent = MIC_LABEL;
  if ($("dict-btn")) $("dict-btn").textContent = DICTER_LABEL;
}
/* Fin volontaire : « J'ai fini de parler ». stop() demande au moteur de livrer
   la prise ; s'il ne rend pas la main en 1,2 s (iOS), on conclut avec ce qui
   a déjà été entendu. */
function finirRecog() {
  if (!recog) return;
  if (recogTimer) { clearTimeout(recogTimer); recogTimer = null; }
  const r = recog;
  if (r.sess) r.sess.finVoulue = true; // plus de relance : c'est elle qui arrête
  noteMicro("fin demandée");
  try { r.stop(); } catch (e) {}
  setTimeout(() => { if (r.conclure) r.conclure(); }, 1200);
}
/* Vérifier pendant une dictée : on GARDE ce qui a été entendu (l'ancien code
   jetait la prise et jugeait un champ vide). */
function clorePrise() {
  if (recog && recog.sess) recog.sess.finVoulue = true;
  if (recog && recog.conclure) recog.conclure(); else stopRecog();
}
function toggleRecog(target) {
  if (recog) { finirRecog(); return; } // deuxième appui : j'ai fini de parler
  const mic = $("mic-btn"), heard = $("heard");
  const lance = lancerEcoute({
    alternatives: 3,
    surTexte: t => { if ($("heard")) $("heard").textContent = `J'entends : ${t}`; },
    surErreur: err => { if ($("heard")) $("heard").textContent = (err === "not-allowed" || err === "service-not-allowed")
      ? "Micro refusé. Révèle la réponse et évalue-toi toi-même."
      : "Micro indisponible ici. Révèle la réponse et évalue-toi."; },
    surFin: morceaux => {
      if ($("mic-btn")) $("mic-btn").textContent = MIC_LABEL;
      juge(morceaux);
    },
  });
  if (!lance) { if (heard) heard.textContent = "Micro indisponible ici. Révèle la réponse et évalue-toi."; return; }
  if (mic) mic.textContent = "✅ J'ai fini de parler";
  if (heard) heard.textContent = "Je t'écoute... Prends ton temps, puis touche « J'ai fini de parler ».";
  /* Le verdict se rend à la fin de la prise, une fois tous les morceaux reçus. */
  function juge(morceaux) {
    if (!morceaux.length) {
      if ($("heard")) $("heard").textContent = "Je n'ai rien entendu. Réessaie, ou révèle et évalue-toi.";
      return;
    }
    /* Pour chaque morceau, on garde l'alternative la plus proche de la cible :
       le moteur en propose plusieurs et la première n'est pas toujours la bonne. */
    const best = texteEntendu(morceaux, target);
    /* Le moteur peut entendre un mot de plus avant ou après (« 嗯 », une
       reprise) : si la cible y figure en entier, c'est juste. */
    const j = normHanzi(best).includes(normHanzi(target)) ? { niveau: "exact" } : jugerDit(best, target);
    const hit = j.niveau === "exact" || j.niveau === "sons";
    if ($("heard")) $("heard").textContent = "";
    reveal();
    const zone = $("answer-zone");
    const titre = hit ? "Bien reconnu !" : j.niveau === "presque" ? "Presque : à toi de juger" : "Ce n'est pas ce que j'ai entendu";
    const note = j.niveau === "sons" ? `<p class="q-prompt cmp-hint">Mêmes sons que le modèle : le moteur a seulement choisi d'autres caractères.</p>`
      : j.niveau === "presque" ? `<div class="q-phrase hanzi diff" style="font-size:1.3rem">${diffHTML(normHanzi(best), normHanzi(target))}</div>${DIFF_LEGENDE}
         <p class="q-prompt cmp-hint">Les mots sont là, dans le même ordre, à quelques syllabes près. Si ta version dit la même chose, compte-la juste.</p>`
      : hit ? "" : `<p class="q-prompt cmp-hint">Compare avec la ligne « Modèle » : le son que tu as produit est celui-ci. Attention, le moteur corrige souvent les tons tout seul, un ton faux peut passer inaperçu. Le quiz tons reste le meilleur juge.</p>`;
    if (zone) zone.insertAdjacentHTML("afterbegin",
      `<div class="verdict ${hit ? "ok" : j.niveau === "presque" ? "mid" : "ko"}">${titre}</div>
       <div class="cmp-row"><span class="cmp-lab">Entendu</span><span class="ruby">${rubyHTML(best)}</span></div>${note}`);
    const btn = j.niveau === "presque" ? null : document.querySelector(hit ? ".g-good" : ".g-again");
    if (btn) btn.classList.add("suggest");
  }
}

/* Passer sans noter : la carte reste due telle quelle et revient à une prochaine
   session. Elle n'allonge pas celle-ci, elle est juste comptée dans le bilan. */
function skipCard() {
  if (window.speechSynthesis) speechSynthesis.cancel();
  if (sessMode === "tones") {
    if (toneTimer) { clearTimeout(toneTimer); toneTimer = null; }
    toneIndex++;
    nextTone();
    return;
  }
  if (sessMode === "gram") { gIndex++; nextGram(); return; }
  if (sessMode === "comp") { cIndex++; nextComp(); return; }
  if (sessMode === "err") { eIndex++; nextErr(); return; }
  if (sessMode === "oreille") { oIndex++; nextOreille(); return; }
  stopRecog();
  const it = queue[qIndex];
  if (it && !sessSkipped.includes(it)) sessSkipped.push(it);
  /* Un mot passé est un mot esquivé : il rejoint les mots du jour à consolider,
     au même titre qu'un mot manqué (demande de Daphnée, 2026-08-24). Ni le
     calibrage (jamais travaillé) ni les repassages libres ne comptent. */
  if (it && !sessPractice && !sessCalib) noteFaibleJour(it.card.hanzi);
  qIndex++;
  nextCard();
}

