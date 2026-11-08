/* ---------- Utilitaires ---------- */
const $ = id => document.getElementById(id);
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
/* Argument JS sûr dans un attribut onclick : les guillemets deviennent des entités HTML */
function jsattr(v) { return esc(JSON.stringify(v)); }
function cleDate(d) {
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function todayKey() { return cleDate(new Date()); }
function toneOf(syll) {
  if (/[āēīōūǖĀĒĪŌŪǕ]/.test(syll)) return 1;
  if (/[áéíóúǘÁÉÍÓÚǗ]/.test(syll)) return 2;
  if (/[ǎěǐǒǔǚǍĚǏǑǓǙ]/.test(syll)) return 3;
  if (/[àèìòùǜÀÈÌÒÙǛ]/.test(syll)) return 4;
  return 0;
}
function renderPinyin(p) {
  return esc(p).split(/(\s+)/).map(tok =>
    /^\s+$/.test(tok) || tok === "" ? tok : `<span class="t${toneOf(tok)}">${tok}</span>`
  ).join("");
}
function normHanzi(s) {
  return String(s).replace(/[\s，。！？、；：""''……—,.!?;:'"()（） ]/g, "");
}
/* pinyin sans accents ni majuscules, pour la recherche : "nǐ hǎo" -> "ni hao" */
function pinyinPlain(s) {
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
/* Index hanzi -> pinyin, construit depuis les mots et leurs décompositions.
   Sert à réafficher en pinyin ce que la reconnaissance vocale a entendu.
   (PY est déclaré plus haut : mergeEmbed l'invalide avant que ce bloc ne s'exécute.) */
function pyIndex() {
  if (PY) return PY;
  PY = new Map();
  const add = (h, p) => { if (h && p && !PY.has(h)) PY.set(h, p); };
  /* Les mots de la base d'abord : leur pinyin est la forme isolée, avec son vrai ton
     (上 shàng). Les décompositions de phrases donnent la forme en contexte, souvent
     atténuée (桌子上 shang), et ne servent qu'en second recours. */
  state.cards.forEach(c => add(c.hanzi, c.pinyin));
  state.cards.forEach(c => (c.mots || []).forEach(m => add(m[0], m[1])));
  /* Dernier recours : les caractères qui n'apparaissent que dans les fiches de
     grammaire. Sans eux, le rendu ruby affiche « ? » et la carte devient illisible. */
  Object.entries(EMBED_PY_EXTRA).forEach(([c, py]) => add(c, py));
  return PY;
}
/* Découpe un texte chinois en segments connus (correspondance la plus longue d'abord) */
const PUNCT = /[\s，。！？、；：""''……—,.!?;:'"()（）]/;
function segment(text) {
  const idx = pyIndex(), chars = [...String(text)], out = [];
  let i = 0;
  while (i < chars.length) {
    if (PUNCT.test(chars[i])) { out.push([chars[i], null, true]); i++; continue; }
    let hit = null;
    for (let L = Math.min(4, chars.length - i); L >= 1; L--) {
      const seg = chars.slice(i, i + L).join("");
      if (idx.has(seg)) { hit = [seg, idx.get(seg), false]; i += L; break; }
    }
    if (hit) out.push(hit);
    else {
      /* Un caractère non chinois (lettre latine, chiffre, symbole d'une formule
         comme « Sujet + 不 + 是 ») n'a pas de pinyin à afficher : il se rend tel
         quel, sans « ? » sous lui. */
      out.push([chars[i], null, !/[\u4e00-\u9fff]/.test(chars[i])]);
      i++;
    }
  }
  return out;
}
/* Glose de prose : toutes les explications de l'app mélangent du français et
   du chinois. Sans pinyin, ce chinois est illisible pour quelqu'un qui connaît
   le son mais pas encore la forme écrite, et l'explication devient inutile.
   Cette fonction annote chaque suite de caractères avec son pinyin, en ligne
   pour ne pas casser le rythme du paragraphe, et saute les cas où l'auteur a
   déjà écrit le pinyin juste derrière (« 好 hǎo se colle… »). */
function pinyinDeSuite(run) {
  const segs = segment(run);
  if (!segs.length || segs.some(s => !s[2] && !s[1])) return "";
  return segs.filter(s => !s[2]).map(s => s[1]).join(" ");
}
function glose(txt) {
  if (!txt) return "";
  const s = String(txt), CJK = /[一-鿿]/;
  let out = "", i = 0;
  while (i < s.length) {
    if (!CJK.test(s[i])) { out += esc(s[i]); i++; continue; }
    let j = i;
    while (j < s.length && CJK.test(s[j])) j++;
    const run = s.slice(i, j), py = pinyinDeSuite(run);
    const nu = pinyinPlain(py).replace(/[^a-z]/g, "");
    const suite = pinyinPlain(s.slice(j, j + 40)).replace(/[^a-z]/g, "");
    const dejaEcrit = nu && suite.startsWith(nu);
    out += (py && !dejaEcrit)
      ? `<span class="gl"><span class="hanzi">${esc(run)}</span><span class="gl-py">${renderPinyin(py)}</span></span>`
      : `<span class="hanzi">${esc(run)}</span>`;
    i = j;
  }
  return out;
}

/* Rendu « caractère au-dessus, pinyin coloré en dessous » */
function rubyHTML(text) {
  return segment(text).map(([seg, p, punct]) =>
    `<span class="pyseg"><span class="hanzi">${esc(seg)}</span>${punct ? "" : `<span class="pysub">${p ? renderPinyin(p) : "?"}</span>`}</span>`
  ).join("");
}
function streak() {
  let n = 0;
  const d = new Date();
  if (!state.days[todayKey()]) d.setDate(d.getDate() - 1); // la journée en cours ne casse pas la série
  while (true) {
    const k = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    if (state.days[k]) { n++; d.setDate(d.getDate() - 1); } else break;
  }
  return n;
}

