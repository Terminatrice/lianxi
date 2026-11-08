/* ---------- Sans parler (2026-11-08, demande de Daphnée) ----------
   « Il faudrait que je puisse passer à un autre ou écrire si je ne peux pas
   parler » (transports, bureau). Sur une carte orale, deux sorties : l'écrire
   au clavier chinois (le pinyin à taper oblige à retrouver le son, la carte
   reste notée normalement) ou un autre format silencieux. Après « l'écrire »,
   les cartes orales suivantes passent d'elles-mêmes à l'écrit pendant
   SANS_PARLER_MIN minutes, avec un bouton pour réactiver l'oral. */
const SANS_PARLER_MIN = 45;
let sansParlerDepuis = 0;
function sansParlerActif() { return Date.now() - sansParlerDepuis < SANS_PARLER_MIN * 60000; }
function ecritAuLieuDeDire(c) { return c.phrase && (c.mots || []).length >= 2 ? "construire" : "clavier"; }
function oralEcrit() {
  sansParlerDepuis = Date.now();
  const it = queue[qIndex];
  if (!it) return;
  it.mode = ecritAuLieuDeDire(it.card);
  it.sansParler = true;
  nextCard();
}
function oralAutre() {
  const it = queue[qIndex];
  if (!it) return;
  it.mode = "pinyin";
  nextCard();
}
function reparler() {
  sansParlerDepuis = 0;
  const it = queue[qIndex];
  if (it && it.sansParler) { it.mode = "oral"; delete it.sansParler; nextCard(); }
}
function sansParlerNote() {
  return `<div class="q-prompt">Sans parler pour ${SANS_PARLER_MIN} min ·
    <button class="audio-btn" onclick="reparler()">🎙️ Réactiver l'oral</button></div>`;
}
function modeFor(it) {
  const m = modeForBrut(it);
  if (m === "oral" && sansParlerActif()) { it.sansParler = true; return ecritAuLieuDeDire(it.card); }
  return m;
}
function modeForBrut(it) {
  /* La consolidation impose son format carte par carte : chaque mot faible du
     jour repasse dans tous les sens, écoute, pinyin, lecture, écriture, phrase. */
  if (it.mode) {
    if (it.mode === "ecoute" && !window.speechSynthesis) return "pinyin";
    return it.mode;
  }
  /* Pendant la mise à jour, un seul format par piste, le plus rapide : le but
     est de trancher « connu / pas connu » sur beaucoup de mots, pas de faire
     produire. L'oral et l'écriture reviendront dans les révisions normales. */
  if (sessCalib) return it.track === "son" ? "pinyin" : "lecture";
  const list = it.track === "son" ? MODES_SON : MODES_ZI;
  const tr = it.card[it.track];
  /* Premier test d'une piste : le format le plus simple (pinyin vers sens,
     lecture du caractère). Jamais d'écriture d'un caractère qui n'a pas
     encore été réussi en lecture (2026-09-16). */
  if (!tr.reviews) return list[0];
  /* Rotation de base pour garantir que tous les modes passent, plus un décalage
     pseudo-aléatoire : un format anticipé demande moins d'effort de récupération. */
  const saut = Math.random() < 0.35 ? 1 : 0;
  let m = list[(tr.reviews + saut) % list.length];
  /* Quota d'écriture. Tracer un caractère est le format le plus lent et le plus
     coûteux de l'app : enchaîné, il épuise l'attention et la carte suivante ne
     s'encode plus. Un huitième de la session au maximum (un cinquième restait
     trop lourd, retour de Daphnée du 2026-08-21), avec un écart minimal entre
     deux écritures. Le reste de la piste Caractères passe en lecture, qui teste
     la même forme graphique sans le coût moteur.
     En session mixte, la longueur et la position se lisent sur la file MIXTE :
     les compteurs de la mini-file d'une seule carte repartaient de zéro à
     chaque carte et laissaient passer une écriture sur deux. */
  if (m === "ecriture") {
    const len = mixOn ? mix.length : sessTotal;
    const pos = mixOn ? mixPos : qIndex;
    const plafond = Math.max(1, Math.round(len / 8));
    /* Écart calculé sur la longueur de la session plutôt que fixé : sinon les
       écritures autorisées tombent toutes au début et la fin de session n'en
       voit plus une seule. */
    const ecart = Math.max(3, Math.floor(len / (plafond + 1)));
    const deja = mixOn ? mixEcrit : sessEcrit;
    const derniere = mixOn ? mixEcritDern : sessEcritPos;
    if (deja >= plafond || pos - derniere < ecart) m = "lecture";
    else if (mixOn) { mixEcrit++; mixEcritDern = pos; }
    else { sessEcrit++; sessEcritPos = pos; }
  }
  if (m === "ecoute" && !window.speechSynthesis) return "pinyin";
  return m;
}
function nextCard() {
  stopRecog();
  if (qIndex >= queue.length) { endSession(); return; }
  const it = queue[qIndex];
  const card = it.card, mode = modeFor(it);
  majProgres(qIndex, sessTotal);
  const z = $("card-zone");
  /* Le libellé de mode ne va plus dans la carte : il décrivait le mécanisme interne
     (les deux pistes) et se relisait 25 fois par session pour une information que
     le contenu de la carte donne déjà. Il ne reste qu'une icône dans la barre du haut. */
  $("sess-track").textContent = TRACK_ICON[it.track];
  /* En repassage libre, « Acquis » ne ferait rien (rien n'est planifié) : on ne
     montre pas un bouton inerte. */
  $("know-btn").classList.toggle("hidden", sessPractice || mode === "reco");
  z.innerHTML = cardHTML(card, mode);
  /* Pas de focus automatique sur le champ d'écriture : le clavier chinois s'ouvrait
     aussitôt et masquait le bouton Vérifier. Elle touche le champ quand elle est prête. */
  const inp = z.querySelector("input.answer");
  if (inp) inp.addEventListener("keydown", e => {
    /* Entrée sert d'abord à valider un candidat de conversion pinyin → hanzi :
       on ne valide la réponse que si la saisie est déjà en caractères. */
    if (e.key === "Enter" && !e.isComposing && /[一-鿿]/.test(inp.value)) {
      (mode === "construire" ? checkConstruire : mode === "escalier" ? escVerifier : checkWriting)();
    }
  });
  $("session").scrollTop = 0;
  if (mode === "ecriture") lancerTrace(card);
  if (mode === "ecoute" || mode === "decouverte") speak(card.hanzi);
  if (mode === "phrase") initPhrase(card);
}

