/* ---------- Dicter au lieu de taper (2026-10-27, demande de Daphnée) ----------
   Partout où l'app fait écrire une phrase entière, 🎤 remplit le champ avec ce
   que la reconnaissance vocale a entendu. Elle relit, corrige au besoin, puis
   vérifie comme si elle avait tapé. Le moteur choisit la phrase la plus
   probable : il remet les tons tout seul et redresse parfois l'ordre des mots.
   La dictée entraîne la production orale ; l'ordre exact se juge sur ce qui
   s'affiche dans le champ, à relire avant de vérifier. */
const DICTER_LABEL = "🎤 Dicter la phrase";
/* ---------- Lire le champ de réponse (2026-10-27) ----------
   Bug constaté sur iPhone : la réponse juste était comptée fausse. iOS garde le
   texte en cours de saisie (pinyin pas encore converti, dictée du clavier encore
   soulignée) hors de la valeur définitive du champ : on lisait un champ vide ou
   l'étape précédente seule, puis `disabled` effaçait ce texte provisoire. On fait
   d'abord quitter le champ (blur), ce qui valide la saisie, on lit un instant
   après, et on verrouille en lecture seule. Un champ vide ou resté en pinyin
   n'est pas jugé : un message dit quoi faire. */
/* Filet de sécurité : une erreur pendant un exercice s'affiche dans la carte
   au lieu de figer l'écran en silence. Le détail sert à la signaler. */
function signalerSouci(e) {
  const msg = String((e && (e.message || e.reason && e.reason.message || e.reason)) || e || "inconnu").slice(0, 160);
  try {
    const j = JSON.parse(localStorage.getItem("lianxi-soucis") || "[]");
    j.push({ t: new Date().toISOString(), msg, mode: typeof sessMode !== "undefined" ? sessMode : "" });
    localStorage.setItem("lianxi-soucis", JSON.stringify(j.slice(-20)));
  } catch (x) {}
  const s = $("session"), az = $("answer-zone");
  /* Affiché seulement quand l'exercice attend encore sa correction : une
     erreur bénigne après coup (audio, sauvegarde) ne doit pas inquiéter. */
  if (!s || s.classList.contains("hidden") || !az || !az.classList.contains("hidden")) return;
  let m = $("souci-msg");
  if (!m && $("card-zone")) { $("card-zone").insertAdjacentHTML("afterbegin", '<div class="q-prompt" id="souci-msg" style="color:var(--bad)"></div>'); m = $("souci-msg"); }
  if (m) m.textContent = `Un souci technique a bloqué cet exercice. Touche « Passer › » pour continuer, et fais une capture de ce message pour le signaler. Détail : ${msg}`;
}
window.addEventListener("error", ev => signalerSouci(ev.error || ev.message));
window.addEventListener("unhandledrejection", ev => signalerSouci(ev.reason));
/* Mémoire de la dernière saisie vue dans le champ de réponse (voir avecSaisie). */
document.addEventListener("input", ev => {
  const t = ev.target;
  if (t && t.id === "write-input" && t.dataset) t.dataset.vu = t.value;
}, true);
function avecSaisie(fn, cible) {
  const inp = $("write-input");
  if (!inp || inp.readOnly) return;
  /* Verrou de double appui seulement : au-delà d'une seconde et demie, il est
     périmé (iOS peut suspendre un minuteur) et ne doit plus bloquer Vérifier. */
  if (inp.dataset.lecture && Date.now() - Number(inp.dataset.lecture) < 1500) return;
  inp.dataset.lecture = String(Date.now());
  /* Trois lectures, la première non vide gagne : la valeur après la fermeture
     du clavier, celle d'avant, et la dernière vue par l'écouteur « input »
     (texte provisoire compris). Fermer le clavier pendant une dictée iOS peut
     effacer le texte souligné : on ne le perd plus. */
  const avant = inp.value;
  if (inp.blur) inp.blur();
  setTimeout(() => {
    delete inp.dataset.lecture;
    const brut = inp.value || avant || inp.dataset.vu || "";
    const msg = /[a-z]/i.test(brut) && !/[a-z]/i.test(cible || "")
      ? "Il reste du pinyin : choisis les caractères dans le clavier, puis vérifie."
      : !/[一-鿿]/.test(brut) ? "Le champ est vide : écris ou dicte la phrase, puis vérifie." : "";
    if (msg) {
      let m = $("saisie-msg");
      if (!m && inp.insertAdjacentHTML) { inp.insertAdjacentHTML("afterend", '<div class="q-prompt" id="saisie-msg"></div>'); m = $("saisie-msg"); }
      if (m) m.textContent = msg;
      return;
    }
    if ($("saisie-msg")) $("saisie-msg").remove();
    inp.readOnly = true;
    /* Bug du 2026-11 : si la correction plantait, le champ restait verrouillé
       et Vérifier ne répondait plus, sans un mot. On déverrouille et on montre
       le souci, pour pouvoir passer et le signaler. */
    try { fn(brut); }
    catch (e) { inp.readOnly = false; signalerSouci(e); }
  }, 80);
}
/* Comparaison alignée : un mot ajouté en tête ne décale plus toute la phrase
   en rouge. Vert = à sa place, barré = en trop, souligné = oublié. */
function diffHTML(got, want) {
  const g = [...got], w = [...want], n = g.length, m = w.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i][j] = g[i] === w[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  let i = 0, j = 0, out = "";
  while (i < n || j < m) {
    if (i < n && j < m && g[i] === w[j]) { out += `<span class="okc">${esc(g[i])}</span>`; i++; j++; }
    else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { out += `<span class="manq">${esc(w[j])}</span>`; j++; }
    else { out += `<span class="koc">${esc(g[i])}</span>`; i++; }
  }
  return out;
}
/* ---------- Juger une phrase dite (2026-10-27) ----------
   Retour de Daphnée : « parfois je disais les bonnes choses, la tolérance n'est
   pas assez élevée », sans pour autant « me mettre toujours juste ». La
   reconnaissance vocale écrit le mot le plus probable (她 pour 他, 在 pour 再,
   3 pour 三) : comparer les caractères la punissait pour les choix du moteur.
   On compare donc les SONS sans les tons, syllabe par syllabe, dans l'ordre.
   Mêmes sons : juste. Au moins 70 % des syllabes communes et dans le même
   ordre : « presque », et c'est elle qui tranche, puisqu'une autre
   formulation correcte peut exister. En dessous : pas reconnu. */
const CHIFFRES_ZH = "零一二三四五六七八九";
const SYL_RE = /(?:[zcs]h|[bpmfdtnlgkhjqxrzcsyw])?(?:iang|iong|uang|ang|eng|ing|ong|ian|iao|uai|uan|ai|ei|ao|ou|an|en|er|in|un|ia|ie|iu|ua|uo|ui|ue|a|o|e|i|u)(?:(?=n[aeiou])|(?=ng?[^aeiou]|ng?$))?(?:ng|n)?/g;
function syllabes(txt) {
  const out = [];
  const t = String(txt).replace(/[0-9]/g, d => CHIFFRES_ZH[d]);
  for (const [seg, py, punct] of segment(t)) {
    if (punct) continue;
    const n = [...seg].length;
    let parts = py ? pinyinPlain(py).split(/[^a-z]+/).filter(Boolean) : [];
    if (parts.length && parts.length !== n) parts = parts.join("").match(SYL_RE) || [];
    if (parts.length === n) out.push(...parts); else out.push(...seg); // repli : le caractère lui-même
  }
  return out;
}
function lcsLen(a, b) {
  let prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = [0];
    for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    prev = cur;
  }
  return prev[b.length];
}
/* niveau : "exact" (mêmes caractères), "sons" (mêmes sons, autres caractères),
   "presque" (même ordre à quelques syllabes près), "loin". */
function jugerDit(entendu, cible) {
  if (normHanzi(entendu) === normHanzi(cible)) return { niveau: "exact", ratio: 1 };
  const a = syllabes(entendu), b = syllabes(cible);
  if (!a.length || !b.length) return { niveau: "loin", ratio: 0 };
  if (a.join(" ") === b.join(" ")) return { niveau: "sons", ratio: 1 };
  const ratio = 2 * lcsLen(a, b) / (a.length + b.length);
  return { niveau: ratio >= 0.7 ? "presque" : "loin", ratio, a, b };
}
const DIFF_LEGENDE = `<div class="q-prompt diff-leg"><span class="okc">vert</span> à sa place, <span class="koc">barré</span> en trop, <span class="manq">souligné</span> oublié</div>`;
function dicterHTML() {
  return hasRecog() ? `<button class="btn ghost" id="dict-btn" onclick="dicter()">${DICTER_LABEL}</button>
    <div class="q-prompt" id="dict-etat"></div>` : "";
}
function dicter() {
  if (recog) { finirRecog(); return; } // deuxième appui : j'ai fini de parler
  const remettre = msg => { if ($("dict-btn")) $("dict-btn").textContent = DICTER_LABEL; if ($("dict-etat")) $("dict-etat").textContent = msg; };
  const lance = lancerEcoute({
    surTexte: t => { if ($("dict-etat")) $("dict-etat").textContent = `J'entends : ${t}`; },
    surFin: morceaux => {
      const texte = texteEntendu(morceaux);
      if (!texte) { remettre("Je n'ai rien entendu. Réessaie, ou tape la phrase."); return; }
      if ($("write-input")) { $("write-input").value = texte; $("write-input").dataset.dicte = "1"; $("write-input").dataset.vu = texte; }
      remettre("Relis ce que j'ai compris, corrige si besoin, puis vérifie.");
    },
    surErreur: err => remettre(err === "not-allowed" || err === "service-not-allowed"
      ? "Micro refusé : tape la phrase, ou utilise le micro du clavier."
      : `Micro indisponible (${err}) : tape la phrase, ou utilise le micro du clavier.`),
  });
  if (!lance) { remettre("Micro indisponible ici : tape la phrase."); return; }
  if ($("dict-btn")) $("dict-btn").textContent = "✅ J'ai fini de parler";
  if ($("dict-etat")) $("dict-etat").textContent = "Je t'écoute. Dis toute la phrase, puis touche « J'ai fini de parler ».";
}

/* ---------- Décomposer une phrase ----------
   Les blocs d'une phrase, dans l'ordre chinois : ceux de son escalier (avec le
   rôle de chaque bloc), sinon la décomposition `mots` du mot, sinon le
   découpage de l'index pinyin, sens repris du vocabulaire. */
function sensDe(h) {
  const c = state.cards.find(x => x.hanzi === h);
  if (c) return c.fr;
  for (const w of state.cards) for (const m of (w.mots || [])) if (m[0] === h) return m[2];
  return "";
}
function blocsPhrase(c) {
  const e = escalierDe(c.phrase);
  if (e) return e.blocs.map(b => ({ h: b[0], py: b[1], sens: b[2], role: b[3] }));
  if ((c.mots || []).length >= 2) return c.mots.map(m => ({ h: m[0], py: m[1], sens: m[2] }));
  return segment(c.phrase || "").filter(s => !s[2]).map(([h, py]) => ({ h: h, py: py || "", sens: sensDe(h) }));
}
/* Après la correction : la phrase étalée bloc par bloc, rôle au-dessus, sens
   en dessous. C'est la lecture qu'elle doit apprendre à faire seule. */
function blocsHTML(b) {
  if (!b || b.length < 2) return "";
  return `<h4 style="margin:.8rem 0 0">Comment elle se construit</h4>
    <div class="gab">${b.map(x => `<div class="gab-col">
      <div class="gab-lab">${esc(x.role || "")}&nbsp;</div>
      <div class="gab-zh hanzi">${esc(x.h)}</div>
      <div class="gab-py">${renderPinyin(x.py)}</div>
      <div class="gab-sens">${esc(x.sens || "")}</div></div>`).join("")}</div>`;
}
/* Aide 1 : les idées dans l'ordre où le chinois les pose, en français. Aucun
   caractère n'est donné, seulement la charpente : c'est l'ordre qui diffère du
   français et qui bloque sur les phrases longues. */
function constrIdees() {
  const b = blocsPhrase(queue[qIndex].card);
  if ($("constr-indice")) $("constr-indice").innerHTML = `<p class="q-prompt" style="margin:.6rem 0 .2rem">Dans l'ordre chinois :</p>
    <div class="idees">${b.map((x, i) => `<span class="idee"><small>${esc(x.role || String(i + 1))}</small>${esc(x.sens || "?")}</span>`).join("")}</div>`;
}
/* Aide 3 : les blocs de la phrase, plus deux leurres, à toucher dans l'ordre. */
function constrBlocs() {
  const c = queue[qIndex].card;
  const tmp = Object.assign({}, c, { mots: blocsPhrase(c).map(x => [x.h, x.py, x.sens]) });
  if ($("constr-indice")) $("constr-indice").innerHTML = `<div class="drop" id="drop"></div><div class="segs" id="segs"></div>`;
  $("reveal-zone").innerHTML = `<button class="btn secondary" onclick="checkPhrase()">Vérifier l'assemblage</button>`;
  initPhrase(tmp);
}
/* Aide 4 : la même phrase, construite en escalier. */
function constrEscalier() {
  const it = queue[qIndex], e = escalierDe(it.card.phrase);
  if (!e) return;
  it.card = carteEscalier(e); it.mode = "escalier";
  $("card-zone").innerHTML = cardHTML(it.card, "escalier");
}

/* ---------- Phrases en escalier (2026-10-27) ----------
   Demande de Daphnée : « aide-moi à mieux décomposer et construire les phrases,
   c'est encore difficile pour les phrases longues ». Une phrase longue du cours
   se construit en 3 à 6 étapes : un noyau court (qui + action + quoi), puis un
   élément de plus à chaque étape, avec la règle qui dit où il se place. Le champ
   est pré-rempli avec l'étape précédente : le travail porte sur l'endroit où
   glisser le nouvel élément, pas sur la recopie. Contenu dans
   vocab/escaliers.json (EMBED_ESCALIERS), rédigé et vérifié au build : chaque
   étape est une phrase correcte, la dernière est mot pour mot celle du cours.
   Entraînement libre : rien n'est planifié. */
const ESC_MAX = 6;
let escPas = 0, escOk = true, ESC_INDEX = null;
function escalierDe(phrase) {
  if (!ESC_INDEX) { ESC_INDEX = new Map(); EMBED_ESCALIERS.forEach(e => ESC_INDEX.set(normHanzi(e.etapes[e.etapes.length - 1].hanzi), e)); }
  return phrase ? ESC_INDEX.get(normHanzi(phrase)) || null : null;
}
function carteEscalier(e) {
  const f = e.etapes[e.etapes.length - 1];
  return { hanzi: f.hanzi, pinyin: f.pinyin, fr: f.fr, phrase: f.hanzi, phraseFr: f.fr,
    mots: e.blocs.map(b => [b[0], b[1], b[2]]), esc: e, son: {}, zi: {} };
}
function escaliersDe(seances) {
  const ids = new Set(seances.map(s => s.id));
  const mots = new Set(seances.flatMap(s => (s.mots || []).concat(s.expressions || [])));
  return EMBED_ESCALIERS.filter(e => ids.has((e.source || {}).cours) || mots.has((e.source || {}).mot));
}
function startEscaliers(liste) {
  const pris = shuffle((liste || EMBED_ESCALIERS).slice()).slice(0, ESC_MAX);
  if (!pris.length) return;
  startMix(pris.map(e => ({ kind: "srs", v: { card: carteEscalier(e), track: "zi", mode: "escalier" }, libre: true })), true, true);
}
/* Grammaire : les escaliers des leçons les plus récentes d'abord. */
function startEscaliersRecents() {
  const tri = EMBED_ESCALIERS.slice().sort((a, b) => (rangLecon(b.lecon) || 0) - (rangLecon(a.lecon) || 0));
  startEscaliers(shuffle(tri.slice(0, 18)));
}
function escEtapeHTML(e, k) {
  const s = e.etapes[k], prev = k ? e.etapes[k - 1] : null, n = e.etapes.length;
  return `<div class="qcard">
      <div class="q-prompt">Phrase en escalier · étape ${k + 1} sur ${n}</div>
      ${prev ? `<div class="esc-prev"><div class="ruby">${rubyHTML(prev.hanzi)}</div>
        <div class="q-phrase-fr">${esc(prev.fr)}</div></div>` : ""}
      <div class="esc-ajout">${glose(s.ajout)}</div>
      <div class="q-fr">« ${esc(s.fr)} »</div>
      <input class="answer" id="write-input" lang="zh-CN" autocomplete="off" value="${prev ? esc(prev.hanzi.replace(/[。！？!?.]$/, "")) : ""}"
             autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done"
             onkeydown="if (event.key === 'Enter' && !event.isComposing && /[一-鿿]/.test(this.value)) escVerifier()">
      ${dicterHTML()}
      <div id="constr-indice"></div>
      <div id="reveal-zone">
        <button class="btn secondary" onclick="escVerifier()">Vérifier</button>
        <button class="btn ghost" onclick="escIndice()">Indice : le pinyin</button>
      </div>
      <div id="answer-zone" class="hidden"></div>
    </div><div id="grades-slot"></div>`;
}
function escIndice() {
  const s = queue[qIndex].card.esc.etapes[escPas];
  if ($("constr-indice")) $("constr-indice").innerHTML = `<div class="expl" style="margin-top:.5rem">${renderPinyin(s.pinyin)}</div>`;
}
function escVerifier() {
  const it = queue[qIndex];
  if (!it || !it.card.esc) return;
  clorePrise();
  avecSaisie(brut => escJuger(it, brut), it.card.esc.etapes[escPas].hanzi);
}
/* Verdict d'une phrase écrite ou dictée. Dictée : mêmes sons = juste, puisque
   c'est le moteur qui a choisi les caractères. Tapée : un homophone reste une
   faute d'écriture, mais on le dit (« bons sons »). « Presque » laisse le
   dernier mot à Daphnée : bouton « Ma version dit la même chose ». */
function verdictPhrase(brut, cible, avant) {
  const dicte = !!($("write-input") && $("write-input").dataset.dicte);
  const j = jugerDit(brut, cible);
  /* Escalier : l'étape précédente est toujours « proche » de la suivante. Pour
     mériter « presque », il faut avoir ajouté au moins la moitié du nouvel
     élément ; renvoyer le champ pré-rempli tel quel reste « pas tout à fait ». */
  if (avant && j.niveau === "presque") {
    const base = lcsLen(syllabes(avant), j.b), ajout = j.b.length - base;
    if (lcsLen(j.a, j.b) - base < Math.ceil(ajout / 2)) j.niveau = "loin";
  }
  const ok = j.niveau === "exact" || (dicte && j.niveau === "sons");
  const presque = !ok && (j.niveau === "presque" || j.niveau === "sons");
  const diff = `<div class="q-phrase hanzi diff" style="font-size:1.3rem">${diffHTML(normHanzi(brut), normHanzi(cible))}</div>${DIFF_LEGENDE}`;
  const html = ok
    ? `<div class="verdict ok">✓ Juste</div>${j.niveau === "sons" ? `<p class="q-prompt">Mêmes sons que le modèle : la dictée a seulement choisi d'autres caractères.</p>` : ""}`
    : presque
      ? `<div class="verdict mid">${j.niveau === "sons" ? "Bons sons, caractères à revoir" : "Presque : à toi de juger"}</div>${diff}
         <p class="q-prompt">${j.niveau === "sons" ? "Tu as écrit les bons sons avec d'autres caractères." : "Les mots sont là, dans le même ordre, à quelques syllabes près. Si ta version dit la même chose, compte-la juste."}</p>`
      : `<div class="verdict ko">✕ Pas tout à fait</div>${diff}`;
  return { ok, presque: presque && j.niveau === "presque", html };
}
function escJuger(it, brut) {
  const e = it.card.esc, s = e.etapes[escPas], dernier = escPas === e.etapes.length - 1;
  const v = verdictPhrase(brut, s.hanzi, escPas ? e.etapes[escPas - 1].hanzi : "");
  $("reveal-zone").classList.add("hidden");
  $("answer-zone").innerHTML = `${v.html}
     <div class="ruby">${rubyHTML(s.hanzi)}</div>
     <div><button class="audio-btn" onclick="speak(${jsattr(s.hanzi)})">🔊 Écouter</button>
          <button class="audio-btn" onclick="speak(${jsattr(s.hanzi)}, 0.55)">🐢 Lent</button></div>
     ${dernier ? blocsHTML(e.blocs.map(b => ({ h: b[0], py: b[1], sens: b[2], role: b[3] }))) : ""}`;
  $("answer-zone").classList.remove("hidden");
  speak(s.hanzi);
  const suite = dernier ? "Phrase suivante ›" : "Étape suivante ›";
  $("grades-slot").innerHTML = v.presque
    ? `<div class="grades" id="grades" style="grid-template-columns:1fr">
        <button class="g-good" onclick="escConclure(true)">✓ Ma version dit la même chose</button>
        <button class="g-again" onclick="escConclure(false)">${suite}</button></div>`
    : `<div class="grades" id="grades" style="grid-template-columns:1fr">
        <button class="g-good" onclick="escConclure(${v.ok})">${suite}</button></div>`;
}
function escConclure(okEtape) {
  const it = queue[qIndex], e = it.card.esc;
  if (!okEtape) escOk = false;
  if (escPas < e.etapes.length - 1) { escSuivant(); return; }
  if (escOk) sessOk++; else if (!sessErrors.includes(it)) sessErrors.push(it);
  noterMix(escOk, it.card.phrase + " « " + it.card.phraseFr + " »");
  advance();
}
function escSuivant() {
  escPas++;
  $("card-zone").innerHTML = escEtapeHTML(queue[qIndex].card.esc, escPas);
  $("session").scrollTop = 0;
  if (window.scrollTo) window.scrollTo(0, 0);
}
function checkReco(i) {
  const it = queue[qIndex];
  if (!it || !it.opts || $("opts").querySelector("button:disabled")) return;
  const c = it.card, choix = it.opts[i], ok = choix.hanzi === c.hanzi;
  [...$("opts").children].forEach((b, j) => {
    b.disabled = true;
    if (it.opts[j].hanzi === c.hanzi) b.classList.add("good");
    else if (j === i) b.classList.add("bad");
  });
  const confondu = ok ? "" : `<p class="q-prompt">Ton choix : <span class="hanzi">${esc(choix.hanzi)}</span>
      ${renderPinyin(choix.pinyin)}, « ${esc(choix.fr)} »</p>`;
  $("answer-zone").innerHTML = `<div class="verdict ${ok ? "ok" : "ko"}">${ok ? "✓ Correct" : "✕ Pas celui-là"}</div>
    <div class="q-hanzi hanzi">${esc(c.hanzi)}</div>
    <div class="q-pinyin">${renderPinyin(c.pinyin)}</div><div class="q-fr">${esc(c.fr)}</div>
    <div class="audio-row"><button class="audio-btn" onclick="speak(${jsattr(c.hanzi)})" aria-label="Écouter le mot">🔊</button></div>
    ${confondu}${decompHTML(c.hanzi)}`;
  $("answer-zone").classList.remove("hidden");
  speak(c.hanzi);
  if (ok) sessOk++;
  else { if (!sessErrors.includes(it)) sessErrors.push(it); noteFaibleJour(c.hanzi); }
  noterMix(ok, c.hanzi + " " + c.pinyin + " « " + c.fr + " »");
  save();
  $("grades-slot").innerHTML = `<div class="grades" id="grades" style="grid-template-columns:1fr">
    <button class="g-good" onclick="advance()">Suivant ›</button></div>`;
}

/* ---------- Révision par brique ----------
   Depuis une fiche de l'onglet Briques : travailler les mots du vocabulaire qui
   contiennent cette brique (demande de Daphnée, 2026-08-21). Les mots dus
   passent d'abord, la piste Caractères en tête puisque la brique est un fait
   graphique. Les réponses comptent normalement : c'est une vraie révision. */
function motsDeBrique(id) {
  const chars = compChars().get(id) || [];
  return state.cards.filter(c => [...c.hanzi].some(ch => chars.includes(ch)));
}
function startBriqueSession(id) {
  const mots = motsDeBrique(id);
  if (!mots.length) return;
  ouvrirSession();
  sessMode = "srs"; sessPractice = false; sessCalib = false;
  plan = []; planPos = 0;
  /* Deux tiers de piste Caractères (c'est elle que la brique éclaire), un tiers
     de piste Son pour garder l'alternance ; dans chaque piste, les échéances
     passent d'abord. */
  const now = Date.now();
  const parEcheance = t => shuffle(mots.map(c => ({ card: c, track: t })))
    .sort((a, b) => ((a.card[t].due <= now) ? 0 : 1) - ((b.card[t].due <= now) ? 0 : 1));
  const items = parEcheance("zi").slice(0, 10).concat(parEcheance("son").slice(0, 5));
  runQueue(spread(items));
  speak(" ");
  $("session").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  nextCard();
}

/* La session de vocabulaire seule a disparu le 2026-08-21 : « Ma session du
   jour » passe par `startMix`, et le vocabulaire n'a pas d'onglet à lui d'où on
   la relancerait. `sessionItems` sert désormais uniquement à la file mixte. */
function runQueue(items) {
  queue = items;
  qIndex = 0; sessTotal = queue.length; sessErrors = []; sessSkipped = []; sessOk = 0;
  sessEcrit = 0; sessEcritPos = -9;
}
/* Repasser, à la fin d'une session, uniquement ce qui a coincé.
   Ce repassage ne compte pas : les échéances calculées pendant la session
   restent telles quelles. Réussir un mot deux minutes après l'avoir raté
   n'engage que la mémoire de travail, l'app ne doit pas le prendre pour un
   acquis. */
function replayMissed() {
  const again = sessErrors.concat(sessSkipped.filter(it => !sessErrors.includes(it)));
  if (!again.length) { quitSession(); return; }
  sessPractice = true;
  runQueue(shuffle(again));
  nextCard();
}
function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}
function quitSession() {
  /* Rien à sauver ici : chaque réponse a déjà été planifiée et écrite. On note
     seulement qu'une session a été interrompue, pour pouvoir le lui dire et lui
     proposer de reprendre au lieu de la laisser croire qu'elle a tout perdu. */
  if (sessEnCours) {
    const faites = state.days[todayKey()] || 0;
    state.reprise = { d: todayKey(), faites: faites };
    save();
  }
  /* Tout retombe, sessPractice compris : quitter en plein repassage le
     laissait à true (bug d'août), et quitter une consolidation en route ne
     consomme rien (consoMots remis à null). */
  remettreSessionAZero();
  if (toneTimer) { clearTimeout(toneTimer); toneTimer = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
  stopRecog();
  $("session").classList.add("hidden");
  document.body.style.overflow = "";
  render();
  renderGram();
  renderComp();
}
