/* ---- 1. Mon oreille : discrimination de paires minimales ----
   On ne produit pas un contraste qu'on n'entend pas. Le français n'oppose ni
   les tons, ni l'aspiration (nos p et b se séparent par la sonorité, pas par
   le souffle) : l'oreille doit apprendre la distinction avant que la bouche
   puisse la faire. Toutes les familles sont tirées de SON vocabulaire, et le
   build refuse deux options homophones, qui donneraient deux bonnes réponses. */
const CONTRASTES = {
  ton: {
    label: "Tons",
    court: "le ton",
    note: "Écoute la hauteur : plate, qui monte, qui creuse, qui tombe."
  },
  aspiration: {
    label: "Souffle",
    court: "le souffle",
    note: "Écoute le souffle : p t k q c ch soufflent, b d g j z zh non."
  },
  nasale: {
    label: "n / ng",
    court: "la finale",
    note: "Écoute la fin : -n se ferme sur les dents, -ng au fond de la gorge."
  },
  retroflexe: {
    label: "Langue",
    court: "la langue",
    note: "Écoute la langue : zh ch sh en arrière, z c s contre les dents."
  },
};
const OREILLE_MAX = 10;
let curContraste = "all";

function pairesPool() {
  return EMBED_PAIRES.filter(f => curContraste === "all" || f.contraste === curContraste);
}
function paireProg(id) {
  if (!state.paires) state.paires = {};
  if (!state.paires[id]) state.paires[id] = newTrack("ton");
  migrateTrack(state.paires[id], "ton");
  return state.paires[id];
}
function pairesDue() {
  const dus = [], neufs = [];
  /* Même précaution que pour les tons : les pistes sont créées AVANT de relever
     l'heure, sinon une piste neuve paraît due une milliseconde trop tard. */
  const items = pairesPool().map(f => ({ f, tr: paireProg(f.id) }));
  const now = Date.now();
  items.forEach(({ f, tr }) => { if (tr.due <= now) (tr.reviews ? dus : neufs).push(f); });
  dus.sort((a, b) => paireProg(a.id).due - paireProg(b.id).due);
  return dus.concat(shuffle(neufs));
}
function paireFaibles() {
  return EMBED_PAIRES
    .map(f => ({ f, tr: state.paires && state.paires[f.id] }))
    .filter(x => x.tr && x.tr.errors > 0)
    .sort((a, b) => (b.tr.errors - b.tr.reviews) - (a.tr.errors - a.tr.reviews))
    .slice(0, 5);
}

let oreilleQueue = [], oIndex = 0, oreilleOk = 0, oreilleErrors = [];
let oreilleCible = null, oreilleOptions = [];

function startOreille() {
  if (!EMBED_PAIRES.length) return;
  ouvrirSession();
  sessMode = "oreille";
  oreilleQueue = pairesDue().slice(0, OREILLE_MAX);
  if (!oreilleQueue.length) oreilleQueue = shuffle(pairesPool().slice()).slice(0, OREILLE_MAX);
  oIndex = 0; oreilleOk = 0; oreilleErrors = [];
  speak(" "); // amorce iOS
  $("session").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  nextOreille();
}
function nextOreille() {
  if ($("session").classList.contains("hidden")) return;
  if (oIndex >= oreilleQueue.length) { endOreilleSession(); return; }
  const f = oreilleQueue[oIndex];
  majProgres(oIndex, oreilleQueue.length);
  oreilleCible = f.mots[Math.floor(Math.random() * f.mots.length)];
  oreilleOptions = shuffle(f.mots.slice());
  const c = CONTRASTES[f.contraste] || CONTRASTES.ton;
  $("know-btn").classList.add("hidden");
  $("card-zone").innerHTML = `<span class="mode-tag">Mon oreille · ${esc(c.label)}</span>
    <div class="qcard">
      <div class="q-prompt">Lequel entends-tu ?</div>
      <div><button class="audio-btn" onclick="speak(${jsattr(oreilleCible.hanzi)})">🔊 Réécouter</button></div>
      <div class="paire-opts" id="paire-opts">
        ${oreilleOptions.map((m, i) => `<button onclick="answerOreille(${i},this)">
          <span class="p-zh hanzi">${esc(m.hanzi)}</span>
          <span><span class="p-py">${renderPinyin(m.pinyin)}</span><br>
          <span class="p-fr">${esc(m.fr)}</span></span></button>`).join("")}
      </div>
      <p class="ecoute-note">${esc(c.note)}</p>
    </div>`;
  speak(oreilleCible.hanzi, 0.75);
}
function answerOreille(i, btn) {
  const f = oreilleQueue[oIndex], choix = oreilleOptions[i];
  const opts = $("paire-opts");
  [...opts.children].forEach(b => b.disabled = true);
  compterPassage();
  const ok = choix.hanzi === oreilleCible.hanzi;
  if (ok) { oreilleOk++; btn.classList.add("good"); }
  else {
    btn.classList.add("bad");
    const bon = oreilleOptions.findIndex(m => m.hanzi === oreilleCible.hanzi);
    if (opts.children[bon]) opts.children[bon].classList.add("good");
    oreilleErrors.push({ f, dit: choix, vrai: oreilleCible });
    /* Le mot mal entendu rejoint les mots du jour à consolider. */
    const cf = state.cards.find(c => c.hanzi === oreilleCible.hanzi)
      || state.cards.find(c => c.hanzi.includes(oreilleCible.hanzi));
    if (cf) noteFaibleJour(cf.hanzi);
  }
  schedule(paireProg(f.id), ok, "ton");
  noterMix(ok, "à l'oreille : " + oreilleCible.hanzi + " " + oreilleCible.pinyin);
  save();
  /* Pas d'enchaînement automatique : c'est ICI que l'apprentissage se fait, en
     réécoutant les deux sons l'un après l'autre. Elle avance quand elle a
     comparé, pas au bout d'une seconde et demie. */
  /* Le pinyin garde ses tons ici. Passé par pinyinPlain, un contraste de tons
     afficherait deux fois le même libellé (mǎi et mài donnent tous deux « mai »)
     et le bouton de comparaison ne comparerait plus rien. */
  const cmp = ok ? "" : `<div class="cmp-sons">
      <button class="audio-btn" onclick="speak(${jsattr(oreilleCible.hanzi)},0.6)">🔊 ${renderPinyin(oreilleCible.pinyin)} (le bon)</button>
      <button class="audio-btn" onclick="speak(${jsattr(choix.hanzi)},0.6)">🔊 ${renderPinyin(choix.pinyin)} (ton choix)</button>
    </div>`;
  opts.insertAdjacentHTML("afterend",
    `${cmp}<div style="margin-top:.8rem">${nextOnlyOreilleHTML()}</div>`);
}
function nextOnlyOreilleHTML() {
  return `<button class="btn" onclick="advanceOreille()">Suivant ›</button>`;
}
function advanceOreille() { oIndex++; nextOreille(); }
function endOreilleSession() {
  if (mixOn) { avancerMix(); return; }
  sessEnCours = false;
  $("prog-bar").style.width = "100%";
  $("prog-txt").textContent = "";
  const rates = oreilleErrors.length
    ? `<hr class="divider"><div class="end-list"><strong>Sons à réécouter :</strong>
       <ul class="words">${oreilleErrors.map(e =>
         `<li><span class="w-hanzi hanzi">${esc(e.vrai.hanzi)}</span>
          <span class="w-mid"><span class="w-pinyin">${renderPinyin(e.vrai.pinyin)}</span><br>
          <span class="w-fr">entendu comme ${renderPinyin(e.dit.pinyin)}</span></span></li>`).join("")}
       </ul></div>`
    : `<p class="q-fr">Oreille juste sur toute la série. 太棒了 tài bàng le !</p>`;
  $("card-zone").innerHTML = `<div class="qcard">
      <div class="q-hanzi hanzi">耳朵</div>
      <div class="q-pinyin">${renderPinyin("ěrduo")}</div>
      <div class="q-fr">Écoute terminée : ${oreilleOk} / ${oreilleQueue.length}.</div>
      ${rates}
      ${boutonFin()}
    </div>`;
}

/* ---- Micro partagé par « Ma voix » et « Écho » ----
   Une seule prise sert aux deux : le blob part à la lecture comparée, et le PCM
   décodé part à l'analyse de hauteur. Le flux est refermé aussitôt, pour ne pas
   laisser le voyant du micro allumé entre deux essais. */
function micDispo() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}
function micMime() {
  return ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"]
    .find(m => { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } }) || "";
}
async function micPrise(ms, elNiveau, onFin) {
  if (!micDispo()) { onFin(null, "Le micro n'est pas disponible dans ce navigateur."); return; }
  let flux;
  try {
    flux = await navigator.mediaDevices.getUserMedia({ audio: {
      echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  } catch (e) {
    if (elNiveau) elNiveau.classList.add("hidden");
    onFin(null, "Micro refusé. Autorise-le dans les réglages du navigateur."); return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  let raf = null;
  try {
    const an = ctx.createAnalyser(); an.fftSize = 1024;
    ctx.createMediaStreamSource(flux).connect(an);
    const buf = new Float32Array(an.fftSize);
    const jauge = elNiveau && elNiveau.firstElementChild;
    if (elNiveau) elNiveau.classList.remove("hidden");
    const tic = () => {
      an.getFloatTimeDomainData(buf);
      let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      if (jauge) jauge.style.width = Math.min(100, Math.sqrt(s / buf.length) * 350) + "%";
      raf = requestAnimationFrame(tic);
    };
    tic();
  } catch (e) {}
  const mime = micMime();
  let rec;
  try { rec = new MediaRecorder(flux, mime ? { mimeType: mime } : undefined); }
  catch (e) {
    flux.getTracks().forEach(t => t.stop()); try { ctx.close(); } catch (x) {}
    onFin(null, "L'enregistrement n'est pas disponible ici."); return;
  }
  const morceaux = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) morceaux.push(e.data); };
  rec.onstop = async () => {
    if (raf) cancelAnimationFrame(raf);
    if (elNiveau) {
      elNiveau.classList.add("hidden");
      if (elNiveau.firstElementChild) elNiveau.firstElementChild.style.width = "0%";
    }
    flux.getTracks().forEach(t => t.stop());
    const blob = new Blob(morceaux, { type: (morceaux[0] && morceaux[0].type) || mime || "audio/mp4" });
    let pcm = null, sr = 0;
    try {
      const ab = await blob.arrayBuffer();
      const audio = await ctx.decodeAudioData(ab);
      pcm = audio.getChannelData(0); sr = audio.sampleRate;
    } catch (e) {}
    try { ctx.close(); } catch (e) {}
    onFin({ blob, pcm, sr }, null);
  };
  try { rec.start(); } catch (e) {
    flux.getTracks().forEach(t => t.stop()); try { ctx.close(); } catch (x) {}
    onFin(null, "L'enregistrement n'a pas pu démarrer."); return;
  }
  setTimeout(() => { try { if (rec.state !== "inactive") rec.stop(); } catch (e) {} }, ms);
}

/* ---- 2. Ma voix : mesure de la hauteur (F0) ----
   Un ton mandarin EST une courbe de hauteur. Le mesurer, c'est mesurer le ton,
   sans passer par la reconnaissance vocale, qui ne sait pas juger la prononciation
   puisqu'elle cherche le mot le plus probable. Autocorrélation normalisée, sur un
   signal ramené à 16 kHz : largement assez pour une voix (70 à 400 Hz) et assez
   léger pour tourner sur un téléphone. */
function reduireTaux(pcm, sr, cible) {
  const f = Math.max(1, Math.round(sr / cible));
  if (f === 1) return { pcm, sr };
  const out = new Float32Array(Math.floor(pcm.length / f));
  for (let i = 0; i < out.length; i++) {
    let s = 0; for (let j = 0; j < f; j++) s += pcm[i * f + j];
    out[i] = s / f;   // moyenne : anti-repliement sommaire, suffisant pour la F0
  }
  return { pcm: out, sr: sr / f };
}
function f0Trame(buf, sr) {
  const lagMin = Math.floor(sr / 400), lagMax = Math.floor(sr / 70);
  const n = buf.length;
  if (lagMax >= n) return 0;
  let e = 0;
  for (let i = 0; i < n; i++) e += buf[i] * buf[i];
  if (Math.sqrt(e / n) < 0.006) return 0;          // trop faible : pas de voix
  const N = n - lagMax;
  let meilleur = 0, score = 0, corr = new Float32Array(lagMax + 2);
  for (let lag = lagMin; lag <= lagMax; lag++) {
    let num = 0, d1 = 0, d2 = 0;
    for (let i = 0; i < N; i++) {
      const a = buf[i], b = buf[i + lag];
      num += a * b; d1 += a * a; d2 += b * b;
    }
    /* Normalisation par l'énergie des deux fenêtres. Sans elle l'autocorrélation
       privilégie mécaniquement les petits décalages et se trompe d'octave. */
    const r = num / (Math.sqrt(d1 * d2) || 1);
    corr[lag] = r;
    if (r > score) { score = r; meilleur = lag; }
  }
  if (score < 0.45 || !meilleur) return 0;         // signal non périodique
  const y1 = corr[meilleur - 1] || 0, y2 = corr[meilleur], y3 = corr[meilleur + 1] || 0;
  const a = (y1 + y3 - 2 * y2) / 2, b = (y3 - y1) / 2;
  const lag = a ? meilleur - b / (2 * a) : meilleur;  // interpolation parabolique
  return sr / lag;
}
function contourF0(pcmBrut, srBrut) {
  const { pcm, sr } = reduireTaux(pcmBrut, srBrut, 16000);
  const win = Math.round(sr * 0.045), hop = Math.round(sr * 0.010);
  const pts = [];
  for (let d = 0; d + win < pcm.length; d += hop) {
    pts.push({ t: d / sr, f: f0Trame(pcm.subarray(d, d + win), sr) });
  }
  return pts;
}
function nettoyerContour(pts) {
  const voisees = pts.filter(p => p.f > 0);
  if (voisees.length < 6) return [];
  /* Médiane glissante : elle tue les sauts d'octave isolés sans lisser la pente,
     ce qu'une moyenne ferait. */
  const f = voisees.map(p => p.f);
  const med = f.slice().sort((a, b) => a - b)[Math.floor(f.length / 2)];
  const lisse = voisees.map((p, i) => {
    const w = [f[i - 1], f[i], f[i + 1]].filter(x => x > 0).sort((a, b) => a - b);
    return { t: p.t, f: w[Math.floor(w.length / 2)] };
  }).filter(p => p.f / med < 1.7 && p.f / med > 0.58);   // reste des erreurs d'octave
  if (lisse.length < 6) return [];
  /* On garde la plus longue suite continue : un claquement de doigts ou un mot
     parasite en fin de prise fabriquerait une fausse courbe. */
  let best = [], cur = [lisse[0]];
  for (let i = 1; i < lisse.length; i++) {
    if (lisse[i].t - lisse[i - 1].t < 0.05) cur.push(lisse[i]);
    else { if (cur.length > best.length) best = cur; cur = [lisse[i]]; }
  }
  if (cur.length > best.length) best = cur;
  return best.length >= 6 ? best : [];
}
const CONTOURS = {   // t de 0 à 1, hauteur en demi-tons autour du registre moyen
  1: [[0, 4], [1, 4]],
  2: [[0, -1.5], [0.4, -1], [1, 4]],
  3: [[0, -1], [0.45, -5], [1, 0.5]],
  4: [[0, 5], [1, -5]],
};
function classerContour(st) {
  const n = st.length;
  const moy = (a, b) => { let s = 0, c = 0; for (let i = a; i < b; i++) { s += st[i]; c++; } return c ? s / c : 0; };
  const debut = moy(0, Math.max(1, Math.round(n * 0.25)));
  const fin = moy(Math.floor(n * 0.75), n);
  let creux = Infinity;
  for (let i = Math.floor(n * 0.15); i < Math.max(1, Math.floor(n * 0.85)); i++) creux = Math.min(creux, st[i]);
  const delta = fin - debut;
  const plongeon = Math.min(debut, fin) - creux;
  const etendue = Math.max.apply(null, st) - Math.min.apply(null, st);
  let ton;
  if (plongeon >= 2 && delta > -3) ton = 3;
  else if (delta <= -3.5) ton = 4;
  else if (delta >= 2.5) ton = 2;
  else ton = 1;
  return { ton, delta, plongeon, etendue };
}
let voixMot = null, voixCourbe = null;
function voixPool() {
  const p = tonesPool().filter(x => x.tone >= 1 && x.tone <= 4);
  return p.length ? p : [];
}
function voixTirer(fragilesDabord) {
  const pool = voixPool();
  if (!pool.length) return null;
  if (fragilesDabord) {
    /* Les tons déjà manqués au Quiz tons passent devant : c'est là qu'elle a
       démontré que le souvenir ne tient pas. */
    const faibles = pool.filter(x => {
      const tr = state.tons && state.tons[x.hanzi];
      return tr && tr.errors > 0;
    });
    if (faibles.length) return faibles[Math.floor(Math.random() * faibles.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
function voixAfficher() {
  const el = $("voix-cible");
  if (!el) return;
  if (!voixMot) { el.innerHTML = `<p class="hint">Ajoute quelques mots d'un seul caractère pour t'entraîner ici.</p>`; return; }
  el.innerHTML = `<div class="v-zh hanzi">${esc(voixMot.hanzi)}</div>
    <div class="v-py">${renderPinyin(voixMot.pinyin)}</div>
    <div class="v-fr">${esc(voixMot.fr)} · ${esc(TONE_NOM[voixMot.tone] || "")}</div>`;
}
let voixFragiles = true;   // par défaut on vise ce qu'elle a déjà manqué
function voixAutre() {
  voixMot = voixTirer(voixFragiles); voixCourbe = null;
  voixAfficher(); voixDessiner(); voixEffacerVerdict();
}
function voixBasculerCible() { voixFragiles = !voixFragiles; voixAutre(); majChipsVoix(); }
function majChipsVoix() {
  const c = $("voix-chip-faible");
  if (c) c.setAttribute("aria-pressed", voixFragiles ? "true" : "false");
}
function voixModele() { if (voixMot) speak(voixMot.hanzi, 0.6); }
function voixEffacerVerdict() {
  if ($("voix-verdict")) { $("voix-verdict").textContent = ""; $("voix-verdict").className = "verdict-voix"; }
  if ($("voix-mesure")) $("voix-mesure").textContent = "";
}
function voixDessiner() {
  const cv = $("voix-canvas");
  if (!cv) return;
  const g = cv.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const W = Math.round(cv.clientWidth || 320), H = Math.round(cv.clientHeight || 190);
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);   // on dessine en pixels CSS
  const style = getComputedStyle(document.body);
  const ligne = style.getPropertyValue("--line").trim() || "#ddd";
  const muet = style.getPropertyValue("--muted").trim() || "#777";
  const accent = style.getPropertyValue("--accent").trim() || "#a33";
  const encre = style.getPropertyValue("--ink").trim() || "#222";
  g.clearRect(0, 0, W, H);
  const MAR = 46, ST = 8;                       // ±8 demi-tons affichés
  const y = st => H / 2 - (st / ST) * (H / 2 - MAR / 2);
  const x = t => MAR + t * (W - MAR - 12);
  g.strokeStyle = ligne; g.lineWidth = 1;
  [-8, -4, 0, 4, 8].forEach(v => {
    g.beginPath(); g.moveTo(MAR, y(v)); g.lineTo(W - 12, y(v)); g.stroke();
  });
  g.fillStyle = ligne; g.font = "600 15px system-ui, sans-serif"; g.textAlign = "right";
  g.fillText("aigu", MAR - 8, y(6)); g.fillText("grave", MAR - 8, y(-6));
  if (voixMot) {
    const c = CONTOURS[voixMot.tone];
    if (c) {
      g.strokeStyle = muet; g.globalAlpha = .6;
      g.lineWidth = 3; g.setLineDash([7, 6]); g.beginPath();
      c.forEach((p, i) => i ? g.lineTo(x(p[0]), y(p[1])) : g.moveTo(x(p[0]), y(p[1])));
      g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    }
  }
  if (voixCourbe && voixCourbe.length) {
    g.strokeStyle = accent; g.lineWidth = 3.5; g.lineJoin = "round"; g.beginPath();
    voixCourbe.forEach((v, i) => {
      const px = x(i / Math.max(1, voixCourbe.length - 1)), py = y(Math.max(-ST, Math.min(ST, v)));
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    });
    g.stroke();
  } else {
    g.fillStyle = encre; g.globalAlpha = .45; g.textAlign = "center";
    g.font = "500 15px system-ui, sans-serif";
    g.fillText("En pointillé : la courbe à viser.", W / 2, H - 12);
    g.globalAlpha = 1;
  }
}
function voixEnregistrer() {
  if (!voixMot) return;
  const b = $("voix-rec");
  if (b.dataset.on === "1") return;
  b.dataset.on = "1"; b.textContent = "🎤 Parle…";
  voixEffacerVerdict();
  $("voix-verdict").textContent = "Dis la syllabe.";
  micPrise(2200, $("voix-niveau"), (prise, err) => {
    b.dataset.on = ""; b.textContent = "🎤 M'écouter";
    if (err || !prise) { $("voix-verdict").className = "verdict-voix ko"; $("voix-verdict").textContent = err || "Prise ratée."; return; }
    if (!prise.pcm) {
      $("voix-verdict").className = "verdict-voix ko";
      $("voix-verdict").textContent = "Je n'ai pas pu relire l'enregistrement sur ce navigateur.";
      return;
    }
    voixAnalyser(prise);
  });
}
function voixAnalyser(prise) {
  const pts = nettoyerContour(contourF0(prise.pcm, prise.sr));
  const vd = $("voix-verdict"), ms = $("voix-mesure");
  if (!pts.length) {
    voixCourbe = null; voixDessiner();
    vd.className = "verdict-voix ko";
    vd.textContent = "Je n'ai pas trouvé ta voix.";
    ms.textContent = "Rapproche-toi du micro, dis la syllabe un peu plus fort et tiens-la une bonne seconde.";
    return;
  }
  /* Normalisation par sa propre médiane : on mesure la FORME de la courbe, pas
     la hauteur de sa voix. Une voix grave et une voix aiguë doivent recevoir le
     même verdict sur un 4ᵉ ton réussi. */
  const f = pts.map(p => p.f);
  const ref = f.slice().sort((a, b) => a - b)[Math.floor(f.length / 2)];
  voixCourbe = f.map(v => 12 * Math.log2(v / ref));
  voixDessiner();
  const r = classerContour(voixCourbe);
  const attendu = voixMot.tone, un = x => x.toFixed(1).replace(".", ",");
  const juste = r.ton === attendu;
  vd.className = "verdict-voix " + (juste ? "ok" : "ko");
  vd.textContent = juste
    ? `C'est bien un ${TONE_NOM[attendu]}.`
    : `J'entends un ${TONE_NOM[r.ton]}, il fallait un ${TONE_NOM[attendu]}.`;
  /* Une mesure et une consigne, pas un cours : le panneau était devenu un mur
     de texte (retour de Daphnée). La description générale du ton ne sert que
     lorsqu'il n'y a rien de précis à corriger. */
  const CONSEIL = {
    1: "Le 1ᵉʳ ton se tient haut et plat, sans bouger.",
    2: "Le 2ᵉ ton part bas et monte franchement.",
    3: "Le 3ᵉ ton descend au plus grave, puis remonte à peine.",
    4: "Le 4ᵉ ton part haut et tombe d'un coup.",
  };
  let visee = "";
  if (attendu === 4 && r.delta > -3.5) visee = "Vise 5 demi-tons de chute : pars plus haut, laisse tomber d'un coup.";
  else if (attendu === 2 && r.delta < 2.5) visee = "Vise 4 demi-tons de montée : pars plus bas, remonte jusqu'au bout.";
  else if (attendu === 3 && r.plongeon < 2) visee = "Creuse davantage : descends au plus grave avant de remonter.";
  else if (attendu === 1 && r.etendue > 3) visee = `Tiens la note : ta voix bouge de ${un(r.etendue)} demi-tons, vise moins de 3.`;
  const mesure = r.plongeon >= 2
    ? `Creux de ${un(r.plongeon)} demi-tons.`
    : `${r.delta >= 0 ? "Montée" : "Chute"} de ${un(Math.abs(r.delta))} demi-tons.`;
  ms.textContent = mesure + " " + (visee || CONSEIL[attendu] || "");
}

/* ---- 3. Écho : le modèle, ta voix, le modèle ----
   Aucun jugement automatique ici, et c'est assumé : s'entendre juste après le
   modèle rend audible ce qu'on n'entend pas en parlant. */
let echoMot = null, echoBlob = null, echoAudio = null;
function echoPool() {
  const faibles = weakItems().map(it => it.card).filter(Boolean);
  const pool = faibles.length >= 3 ? faibles : state.cards.filter(themeMatch);
  return pool.length ? pool : state.cards;
}
function echoTirer() {
  const pool = echoPool();
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}
function echoAfficher() {
  const el = $("echo-cible");
  if (!el) return;
  if (!echoMot) { el.innerHTML = `<p class="hint">Ajoute du vocabulaire pour t'entraîner ici.</p>`; return; }
  el.innerHTML = `<div class="v-zh hanzi">${esc(echoMot.hanzi)}</div>
    <div class="v-py">${renderPinyin(echoMot.pinyin)}</div>
    <div class="v-fr">${esc(echoMot.fr)}</div>`;
}
function echoAutre() {
  echoMot = echoTirer(); echoBlob = null;
  if ($("echo-cmp")) $("echo-cmp").classList.add("hidden");
  if ($("echo-etat")) $("echo-etat").textContent = "";
  echoAfficher();
}
function echoModele() { if (echoMot) speak(echoMot.hanzi, 0.7); }
function direAsync(txt, rate) {
  return new Promise(res => {
    if (!window.speechSynthesis) return res();
    let fini = false;
    const fin = () => { if (!fini) { fini = true; res(); } };
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = "zh-CN"; if (zhVoice) u.voice = zhVoice; u.rate = rate || 0.7;
    u.onend = fin; u.onerror = fin;
    speechSynthesis.speak(u);
    setTimeout(fin, 6000);   // iOS n'appelle pas toujours onend
  });
}
function jouerBlob(blob) {
  return new Promise(res => {
    try {
      if (echoAudio) { try { echoAudio.pause(); URL.revokeObjectURL(echoAudio.src); } catch (e) {} }
      echoAudio = new Audio(URL.createObjectURL(blob));
      let fini = false;
      const fin = () => { if (!fini) { fini = true; res(); } };
      echoAudio.onended = fin; echoAudio.onerror = fin;
      setTimeout(fin, 8000);
      const p = echoAudio.play();
      if (p && p.catch) p.catch(fin);
    } catch (e) { res(); }
  });
}
function echoEnregistrer() {
  if (!echoMot) return;
  const b = $("echo-rec");
  if (b.dataset.on === "1") return;
  b.dataset.on = "1"; b.textContent = "🎤 Parle…";
  $("echo-etat").textContent = "Dis le mot.";
  micPrise(3000, $("echo-niveau"), (prise, err) => {
    b.dataset.on = ""; b.textContent = "🎤 M'enregistrer";
    if (err || !prise) { $("echo-etat").textContent = err || "Prise ratée."; return; }
    echoBlob = prise.blob;
    $("echo-cmp").classList.remove("hidden");
    $("echo-etat").textContent = "";
  });
}
async function echoComparer() {
  if (!echoBlob || !echoMot) return;
  const b = $("echo-cmp");
  b.disabled = true;
  const pause = ms => new Promise(r => setTimeout(r, ms));
  $("echo-etat").textContent = "Le modèle…";
  await direAsync(echoMot.hanzi); await pause(400);
  $("echo-etat").textContent = "Ta voix…";
  await jouerBlob(echoBlob); await pause(400);
  $("echo-etat").textContent = "Le modèle, à nouveau…";
  await direAsync(echoMot.hanzi);
  $("echo-etat").textContent = "Où est l'écart ? La hauteur, le souffle, la fin de la syllabe ?";
  b.disabled = false;
}

/* ---- Rendu de l'onglet ----
   Un seul des trois entraînements est monté à la fois. Les empiler donnait une
   page de prose où rien ne ressortait (retour de Daphnée, 2026-08-28). */
const VOIX_MODES = [
  { k: "oreille", lab: "Oreille" },
  { k: "voix",    lab: "Ma voix" },
  { k: "echo",    lab: "Écho" },
];
let curVoixMode = "oreille";
function setVoixMode(m) { curVoixMode = m; renderVoix(); }
function renderVoix() {
  $("voix-modes").innerHTML = VOIX_MODES.map(m =>
    `<button class="chip" aria-pressed="${curVoixMode === m.k}" onclick="setVoixMode(${jsattr(m.k)})">${esc(m.lab)}</button>`).join("");
  VOIX_MODES.forEach(m => $("pan-" + m.k).classList.toggle("hidden", curVoixMode !== m.k));
  if (curVoixMode === "oreille") renderOreille();
  else if (curVoixMode === "voix") {
    if (!voixMot) voixMot = voixTirer(voixFragiles);
    majChipsVoix(); voixAfficher(); voixDessiner();
  } else {
    if (!echoMot) echoMot = echoTirer();
    echoAfficher();
  }
}
function renderOreille() {
  const due = pairesDue().length;
  $("oreille-n").textContent = due;
  $("oreille-chips").innerHTML = ["all"].concat(Object.keys(CONTRASTES)
    .filter(k => EMBED_PAIRES.some(f => f.contraste === k)))
    .map(k => `<button class="chip" aria-pressed="${curContraste === k}" onclick="setContraste(${jsattr(k)})">${
      k === "all" ? "Tout" : esc(CONTRASTES[k].label)}</button>`).join("");
  const faibles = paireFaibles();
  $("oreille-weak-box").classList.toggle("hidden", !faibles.length);
  $("oreille-weak-lab").textContent = `À reprendre (${faibles.length})`;
  $("oreille-weak").innerHTML = faibles.map(({ f, tr }) =>
    `<li><span class="w-hanzi hanzi">${esc(f.mots.map(m => m.hanzi).join(""))}</span>
     <span class="w-mid"><span class="w-pinyin">${f.mots.map(m => renderPinyin(m.pinyin)).join(" · ")}</span><br>
     <span class="w-fr">${esc((CONTRASTES[f.contraste] || {}).court || "")}</span></span></li>`).join("");
}
function setContraste(k) { curContraste = k; renderOreille(); }

