/* ---------- Dictionnaire ---------- */
/* Un idiome se lit en trois temps : les quatre caractères un par un, le sens
   littéral qui en découle, puis ce qu'il veut vraiment dire. L'histoire est
   repliée : c'est le plaisir, pas le prérequis. */
function chengyuHTML(x) {
  const cs = x.caracteres.map(c =>
    `<div class="cy-car"><span class="cy-zh hanzi">${esc(c[0])}</span>
       <span class="cy-py">${renderPinyin(c[1])}</span>
       <span class="cy-fr">${esc(c[2])}</span></div>`).join("");
  return `<div class="gram-item">
    <button class="gram-head" onclick="toggleFiche(${jsattr("cy-" + x.hanzi)})" aria-expanded="false">
      <span class="t hanzi" style="font-size:1.5rem">${esc(x.hanzi)}</span>
      <span class="t" style="font-weight:400">${renderPinyin(x.pinyin)}</span>
      <span class="r">${esc(x.sens)}</span>
    </button>
    <div class="gram-body hidden" id="fiche-cy-${esc(x.hanzi)}">
      <div class="cy-cars">${cs}</div>
      <div class="cy-litt">Mot à mot : ${esc(x.litteral)}</div>
      <div class="audio-row"><button class="audio-btn" onclick="speak(${jsattr(x.hanzi)})" aria-label="Écouter">🔊</button></div>
      <details class="gram-plus" open><summary>L'histoire</summary>
        <p style="margin:.4rem 0">${glose(x.histoire)}</p></details>
      <div class="usage-note">${glose(x.quand)}</div>
    </div>
  </div>`;
}
function renderChengyu() {
  if ($("chengyu-list")) $("chengyu-list").innerHTML = EMBED_CHENGYU.map(chengyuHTML).join("");
}
function renderDico() {
  const zone = $("dico-results");
  if (!zone) return;
  const q = ($("dico-search").value || "").trim().toLowerCase();
  const qPlain = pinyinPlain(q).replace(/\s+/g, "");
  let list = state.cards;
  if (q) list = state.cards.filter(c =>
    c.hanzi.includes(q) ||
    pinyinPlain(c.pinyin).replace(/\s+/g, "").includes(qPlain) ||
    (c.fr || "").toLowerCase().includes(q));
  list = list.slice().sort((a, b) => a.hanzi.localeCompare(b.hanzi));
  if (!list.length) {
    zone.innerHTML = `<p class="hint" style="padding:0 .2rem">Aucun mot ne correspond. Essaie un caractère, un pinyin sans accent, ou un mot français.</p>`;
    return;
  }
  zone.innerHTML = list.slice(0, 60).map(dicoCardHTML).join("");
}
function dicoCardHTML(c) {
  const decomp = (c.mots && c.mots.length)
    ? `<div class="dico-decomp">${c.mots.map(m =>
        `<button class="dico-mot" onclick="speak(${jsattr(m[0])})"><span class="hanzi">${esc(m[0])}</span> ${renderPinyin(m[1])} · ${esc(m[2])}</button>`).join("")}</div>`
    : "";
  const ex = c.phrase
    ? `<div class="dico-ex hanzi">${esc(c.phrase)}</div>${c.phraseFr ? `<div class="dico-ex-fr">${esc(c.phraseFr)}</div>` : ""}
       <div class="audio-row"><button class="audio-btn" onclick="speak(${jsattr(c.phrase)})" aria-label="Écouter la phrase">🔊</button>
            <button class="audio-btn" onclick="speak(${jsattr(c.phrase)}, 0.55)" aria-label="Écouter la phrase lentement">🐢</button></div>`
    : "";
  return `<div class="dico-card">
    <div class="dico-head">
      <span class="dico-hanzi hanzi">${esc(c.hanzi)}</span>
      <span class="q-pinyin" style="font-size:1.2rem">${renderPinyin(c.pinyin)}</span>
      <span class="w-theme">${esc(c.theme || "Général")}</span>
    </div>
    <div class="dico-fr">${esc(c.fr)}</div>
    <div class="audio-row"><button class="audio-btn" onclick="speak(${jsattr(c.hanzi)})" aria-label="Écouter le mot">🔊</button>
         <button class="audio-btn" onclick="speak(${jsattr(c.hanzi)}, 0.55)" aria-label="Écouter le mot lentement">🐢</button></div>
    ${usageHTML(c)}${clHTML(c, true)}${decomp}${decompHTML(c.hanzi)}${ex}
  </div>`;
}

