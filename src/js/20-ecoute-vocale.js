/* ---------- Écoute vocale (refonte du 2026-11-08) ----------
   Bug constaté sur iPhone (dictée « Je n'ai rien entendu », champ vide) :
   Safari iOS en écoute continue ne livre souvent JAMAIS de résultat définitif.
   Il fait grossir un seul résultat provisoire, et stop() peut ne rendre ni le
   résultat final ni même onend. L'ancien code ne gardait que le définitif.
   Désormais : on demande les résultats provisoires, on garde la DERNIÈRE
   version de chaque morceau (remplacée, jamais empilée), et si Safari ne rend
   pas la main après « J'ai fini de parler », on conclut nous-mêmes avec ce
   qui a été entendu. Une seule mécanique pour la dictée et le mode Oral. */
function lancerEcoute({ alternatives = 1, surTexte, surFin, surErreur }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return false;
  stopRecog();
  let r;
  try { r = new SR(); } catch (e) { return false; }
  recog = r;
  r.lang = "zh-CN";
  r.continuous = true;
  r.interimResults = true;
  r.maxAlternatives = alternatives;
  let morceaux = [], fini = false;
  const conclure = () => {
    if (fini) return;
    fini = true;
    if (recog === r) recog = null;
    if (recogTimer) { clearTimeout(recogTimer); recogTimer = null; }
    r.onresult = r.onerror = r.onend = null;
    try { r.abort(); } catch (e) {}
    surFin(morceaux.filter(m => m && m.some(Boolean)));
  };
  r.conclure = conclure;
  r.onresult = ev => {
    for (let i = 0; i < ev.results.length; i++) morceaux[i] = Array.from(ev.results[i]).map(a => a.transcript || "");
    if (surTexte) surTexte(texteEntendu(morceaux.filter(Boolean)));
  };
  r.onerror = ev => {
    if (fini || ev.error === "aborted") return;
    /* « no-speech » après avoir entendu quelque chose : iOS coupe sur un
       silence, mais la prise est bonne, on la garde. */
    if (morceaux.length) { conclure(); return; }
    fini = true;
    if (recog === r) recog = null;
    stopRecog();
    if (ev.error === "no-speech") surFin([]); else if (surErreur) surErreur(ev.error);
  };
  r.onend = conclure;
  recogTimer = setTimeout(finirRecog, 30000); // filet de sécurité si iOS ne rend jamais la main
  try { r.start(); } catch (e) { recog = null; return false; }
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
  return choisis.filter((t, i) => !(choisis[i + 1] && choisis[i + 1].startsWith(t))).join("");
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
  try { r.stop(); } catch (e) {}
  setTimeout(() => { if (r.conclure) r.conclure(); }, 1200);
}
/* Vérifier pendant une dictée : on GARDE ce qui a été entendu (l'ancien code
   jetait la prise et jugeait un champ vide). */
function clorePrise() {
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

