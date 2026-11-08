/* ---------- Restauration / export ---------- */
function restoreData() {
  const box = $("restore-box"), msg = $("maint-msg");
  const txt = box.value.trim();
  if (!txt) {
    msg.className = "msg err";
    msg.textContent = "Colle d'abord la sauvegarde (bouton « Copier une sauvegarde complète »).";
    return;
  }
  if (lireEtRestaurer(txt, "le texte collé")) box.value = "";
}

function copyText(text, btnMsgEl, okLabel) {
  const done = () => { btnMsgEl.className = "msg ok"; btnMsgEl.textContent = okLabel; };
  const fail = () => { btnMsgEl.className = "msg err"; btnMsgEl.textContent = "Copie impossible, sélectionne et copie manuellement :";
    const ta = document.createElement("textarea"); ta.value = text; ta.style.minHeight = "8rem";
    btnMsgEl.after(ta); ta.select(); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, fail);
  } else fail();
}
function exportWeak() {
  const weak = weakItems();
  const lines = weak.map(it => {
    const tr = it.card[it.track];
    return `- ${it.card.hanzi} (${it.card.pinyin}) « ${it.card.fr} » : piste ${TRACK_LABEL[it.track]}, manqué ${tr.errors} fois sur ${tr.reviews}`;
  });
  const text = `Mots faibles exportés depuis mon app Liànxí (${todayKey()}). La piste indique ce qui coince : « Son » = pinyin, tons, sens ; « Caractères » = lecture et écriture des hanzi. Intègre-les en priorité à ma prochaine leçon et au carnet :\n${lines.join("\n")}`;
  copyText(text, $("weak-empty"), "Copié. Colle-le dans ta session Claude Code.");
  $("weak-empty").style.display = "";
}
function copyBackup() {
  copyText(JSON.stringify(buildBackup()), $("maint-msg"), "Sauvegarde copiée. Garde-la dans une note ou un fichier.");
}
let resetArmed = false;
function resetApp() {
  const msg = $("maint-msg");
  if (!resetArmed) {
    resetArmed = true;
    msg.className = "msg err";
    msg.textContent = "Appuie encore une fois pour tout effacer (progression comprise).";
    setTimeout(() => { resetArmed = false; if (msg.textContent.startsWith("Appuie")) msg.textContent = ""; }, 5000);
    return;
  }
  try { localStorage.removeItem(LS_KEY); } catch (e) {}
  state = load(); save(); resetArmed = false;
  msg.className = "msg ok"; msg.textContent = "Réinitialisé avec le vocabulaire embarqué.";
  render();
}

