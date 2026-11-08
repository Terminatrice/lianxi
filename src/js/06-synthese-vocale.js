/* ---------- Synthèse vocale ---------- */
let zhVoices = [], zhVoice = null;
function voiceScore(v) {
  const t = (v.name + " " + (v.voiceURI || "")).toLowerCase();
  let s = 0;
  if (/premium/.test(t)) s += 4;
  if (/enhanced|amélior|ameliore/.test(t)) s += 3;
  if (/google|tingting|ting-ting|婷婷|meijia|siri/.test(t)) s += 2;
  if (/compact|eloquence/.test(t)) s -= 3;
  /* voix fantaisie d'Apple, très robotiques */
  if (/eddy|flo\b|flo |grandma|grandpa|reed|rocko|sandy|shelley|albert|bahh|bells|boing|bubbles|cellos|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|kathy|fred|ralph/.test(t)) s -= 5;
  if (/^zh[-_]CN/i.test(v.lang)) s += 1;
  return s;
}
function pickVoice() {
  const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  zhVoices = vs.filter(v => /^zh/i.test(v.lang)).sort((a, b) => voiceScore(b) - voiceScore(a));
  const saved = state.voiceURI ? zhVoices.find(v => v.voiceURI === state.voiceURI) : null;
  zhVoice = saved || zhVoices[0] || null;
  renderVoices();
}
function renderVoices() {
  const sel = $("voice-select");
  if (!sel) return;
  sel.innerHTML = zhVoices.length
    ? zhVoices.map(v =>
        `<option value="${esc(v.voiceURI)}"${v === zhVoice ? " selected" : ""}>${esc(v.name)} (${esc(v.lang)})</option>`).join("")
    : `<option value="">Voix système par défaut</option>`;
}
function setVoice(uri) {
  state.voiceURI = uri;
  save();
  pickVoice();
}
function testVoice() { speak("你好！我们一起学中文吧。"); }
if (window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = pickVoice;
}
function speak(text, rate) {
  if (!window.speechSynthesis) return;
  /* Toute autre prise de parole coupe la boucle d'écoute : sans ça, le cancel
     ci-dessous tuait la boucle en silence et son bouton restait sur Arrêter. */
  if (typeof boucleOn !== "undefined" && boucleOn) stopBoucle();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  if (zhVoice) u.voice = zhVoice;
  u.rate = rate || 0.85;
  speechSynthesis.speak(u);
}

