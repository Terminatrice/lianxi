/* ---------- Interférence proactive ----------
   Deux caractères proches appris coup sur coup se contaminent : c'est le
   mécanisme d'oubli le plus documenté sur les hanzi (己/已, 未/末, 妈/吗).
   On écarte donc dans la file : les deux pistes d'un même mot, les mots qui
   partagent un caractère, et les homophones sans le ton. */
function pinyinKey(p) { return pinyinPlain(p).replace(/[^a-z]/g, ""); }
function conflict(a, b) {
  if (a.card === b.card) return true;                       // même mot, autre piste
  if (pinyinKey(a.card.pinyin) === pinyinKey(b.card.pinyin)) return true; // homophones
  return [...a.card.hanzi].some(ch => b.card.hanzi.includes(ch)); // caractère commun
}
/* Alternance des pistes. `conflict` écartait les mots qui se ressemblent, mais
   rien n'empêchait six cartes « Caractères » de se suivre : la session devenait
   un bloc d'écriture, le format le plus coûteux, et la mémorisation tombait.
   On refuse donc une troisième carte d'affilée sur la même piste tant qu'un
   candidat de l'autre piste reste disponible. */
function memeTrack(recent, it) {
  return recent.length >= 2 && recent[0].track === it.track && recent[1].track === it.track;
}
function spread(items, k) {
  const out = [], pool = [...items], recent = [];
  while (pool.length) {
    let i = pool.findIndex(it => !recent.some(r => conflict(r, it)) && !memeTrack(recent, it));
    if (i < 0) i = pool.findIndex(it => !recent.some(r => conflict(r, it)));
    if (i < 0) i = 0; // plus aucun candidat compatible : on relâche la contrainte
    out.push(pool[i]);
    recent.unshift(pool[i]);
    if (recent.length > (k || 8)) recent.pop();
    pool.splice(i, 1);
  }
  return out;
}
function weakItems() {
  const out = [];
  state.cards.filter(themeMatch).forEach(c => {
    TRACKS.forEach(t => {
      const tr = c[t];
      if (tr && tr.reviews >= 2 && tr.errors >= 2) out.push({ card: c, track: t, rate: tr.errors / tr.reviews });
    });
  });
  return out.sort((a, b) => b.rate - a.rate).slice(0, 10);
}
/* Corps déplié d'un mot « À consolider » : tout ce qui aide à se le remémorer
   en le lisant. Construit à la première ouverture seulement. */
let weakCourants = [];
function weakBodyHTML(it) {
  const c = it.card, tr = c[it.track];
  const phrase = c.phrase
    ? `<div class="ruby" style="margin:.4rem 0">${rubyHTML(c.phrase)}</div>
       ${c.phraseFr ? `<div class="q-phrase-fr">${esc(c.phraseFr)}</div>` : ""}` : "";
  return `<div class="pc-note">Piste ${esc(TRACK_LABEL[it.track])} : manqué ${tr.errors} fois sur ${tr.reviews} passages.</div>
    ${phrase}
    <div class="audio-row" style="justify-content:flex-start;margin:.4rem 0">
      <button class="audio-btn" onclick="speak(${jsattr(c.hanzi)})" aria-label="Écouter le mot">🔊</button>
      ${c.phrase ? `<button class="audio-btn" onclick="speak(${jsattr(c.phrase)})" aria-label="Écouter la phrase">🔊 la phrase</button>` : ""}
    </div>
    ${usageHTML(c)}${clHTML(c, true)}${decompHTML(c.hanzi)}`;
}
function toggleWeak(i) {
  const el = $("weak-" + i);
  if (!el) return;
  if (!el.innerHTML && weakCourants[i]) el.innerHTML = weakBodyHTML(weakCourants[i]);
  const ouvert = el.classList.toggle("hidden") === false;
  const head = el.parentElement.querySelector(".weak-head");
  if (head) head.setAttribute("aria-expanded", ouvert);
}
/* Les 14 thèmes occupaient six rangées avant le bouton Commencer : il fallait
   scroller pour agir. Ils sont repliés, et s'ouvrent quand on veut filtrer. */
let filtresOuverts = false;
function toggleFiltres() {
  filtresOuverts = !filtresOuverts;
  ["theme-chips", "track-chips", "tones-btn"].forEach(id =>
    $(id).classList.toggle("hidden", !filtresOuverts));
  $("filtre-btn").setAttribute("aria-expanded", filtresOuverts);
  $("filtre-btn").textContent = filtresOuverts ? "Masquer les options" : filtreLabel();
}
function filtreLabel() {
  return curTheme === "all" ? "Options" : `Thème : ${curTheme}`;
}
function setTheme(t) { curTheme = t; render(); }
function setTrack(t) { curTrack = t; render(); }
