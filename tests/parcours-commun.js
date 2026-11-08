// Parcours de bout en bout, dans Safari simulé (WebKit, taille iPhone) : chaque
// type de session est joué jusqu'à l'écran de fin par une « utilisatrice
// pressée » automatique. Le test échoue si un écran se fige (même « Passer »
// ne fait plus rien), si une session ne se termine pas, ou au moindre plantage.
const { test, before, after } = require("node:test");
module.exports = function definir(SESSIONS) {
const assert = require("node:assert/strict");
const { kit, APP } = require("./outils");

let app;
before(async () => { app = await kit.ouvrirApp(APP); });
after(async () => { await app.fermer(); });

/* La bonne réponse une fois sur deux, sinon une phrase quelconque : les deux
   branches (juste, pas juste) doivent mener à l'écran suivant. */
let bascule = 0;
const cfg = graine => ({
  zone: "#card-zone", passer: ".skip-btn:not(#know-btn)", graine, maxEtapes: 600,
  enSession: p => p.evaluate(() => !document.getElementById("session").classList.contains("hidden") && sessEnCours),
  texte: p => p.evaluate(b => {
    if (b % 2) return "我不知道";
    try {
      const it = typeof queue !== "undefined" && queue[qIndex];
      if (it && it.card && it.card.esc) return it.card.esc.etapes[escPas].hanzi;
      if (it && it.card && it.card.phrase) return it.card.phrase;
      const ex = typeof curExo === "function" && curExo();
      if (ex && (ex.modele || ex.reponse)) return ex.modele || ex.reponse;
    } catch (e) {}
    return "你好";
  }, bascule++),
  eviter: /Copier|Sauvegard|Réinitialiser|Restaurer|Partager|Exporter|Effacer/,
});

async function jouer(nom, lancer, graine = 7) {
  await app.page.evaluate(() => { if (sessEnCours) quitSession(); showTab("home"); });
  await app.page.evaluate(lancer);
  await app.page.waitForTimeout(200);
  const ouvert = await app.page.evaluate(() => sessEnCours);
  if (!ouvert) return { vide: true };
  const r = await kit.jouerSession(app.page, cfg(graine));
  assert.ok(r.fini, `${nom} ne se termine pas`);
  return r;
}

test("préparation : profil réaliste (mots du cours travaillés, une partie en retard)", async () => {
  await app.page.evaluate(() => { let k = 0; state.cards.forEach(c => { if (voletDe(c) === "cours") { const ko = (k++ % 2) === 0;
    ["son", "zi"].forEach(t => { c[t].reviews = 2; c[t].errors = ko ? 2 : 0; c[t].due = Date.now() - 1 - (k % 5) * 864e5; }); } }); save(); });
});

if (SESSIONS.onglets) test("chaque onglet s'affiche sans erreur", async () => {
  for (const t of ["home", "gram", "cours", "comp", "voix", "dico", "words"]) {
    await app.page.evaluate(t => showTab(t), t);
    await app.page.waitForTimeout(80);
  }
  assert.deepEqual(app.erreurs, []);
});


for (const [nom, lancer, graine] of SESSIONS) {
  test(`${nom} : se joue jusqu'au bout sans blocage`, async () => {
    const avant = app.erreurs.length;
    await jouer(nom, lancer, graine);
    assert.deepEqual(app.erreurs.slice(avant), [], "erreur JavaScript pendant la session");
  });
}

test("aucun « souci technique » enregistré par l'app", async () => {
  const s = await app.page.evaluate(() => localStorage.getItem("lianxi-soucis"));
  assert.ok(!s || s === "[]", s);
});
};
