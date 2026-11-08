// État de session (refonte du 2026-11-08) : aucune session ne doit hériter des
// réglages de la précédente. Protège contre la famille de bugs d'août (repassage
// quitté en route qui coupait toute planification, ratés de la session
// précédente restés dans l'écran de fin).
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { kit, APP } = require("./outils");

let app;
before(async () => { app = await kit.ouvrirApp(APP, { moteur: "chromium" }); });
after(async () => { await app.fermer(); });
const ev = (fn, arg) => app.page.evaluate(fn, arg);

/* Salit tout l'état de session, comme le ferait une session interrompue. */
const salir = () => ev(() => {
  sessPractice = true; sessCalib = true; mixCible = true; mixCours = true; mixOn = true;
  consoMots = ["你好"]; sessErrors = [{}]; sessSkipped = [{}]; sessOk = 7; drillExos = [{}]; exoImpose = {};
  gramErrors = [{}]; compErrors = [{}]; errErrors = [{}]; mixBilan = { ok: 3, total: 9, rates: ["x"], items: [] };
});
const etat = () => ev(() => ({ sessPractice, sessCalib, mixCible, mixCours, consoMots, sessErrors: sessErrors.length,
  sessSkipped: sessSkipped.length, drillExos, gramErrors: gramErrors.length, compErrors: compErrors.length, errErrors: errErrors.length }));
const PROPRE = { sessPractice: false, sessCalib: false, mixCible: false, mixCours: false, consoMots: null, sessErrors: 0,
  sessSkipped: 0, drillExos: null, gramErrors: 0, compErrors: 0, errErrors: 0 };

test("« Quitter » remet toute la session à zéro", async () => {
  await salir();
  await ev(() => quitSession());
  assert.deepEqual(await etat(), PROPRE);
  assert.equal(await ev(() => sessEnCours), false);
});

test("quitter un repassage puis lancer un entraînement : les réponses sont de nouveau planifiées (bug d'août)", async () => {
  await ev(() => { startJour(); sessPractice = true; quitSession(); startGramSession(); });
  assert.equal(await ev(() => sessPractice), false);
  await ev(() => quitSession());
});

const DEMARRAGES = {
  "session du jour": () => startJour(),
  "grammaire": () => startGramSession(),
  "briques": () => startCompSession(),
  "quiz tons": () => startToneQuiz(),
  "mon oreille": () => startOreille(),
  "mots jamais testés": () => startCalibrage(),
};
for (const [nom, lancer] of Object.entries(DEMARRAGES)) {
  test(`${nom} : démarre propre même après une session salie`, async () => {
    await salir();
    await ev(lancer);
    const e = await etat();
    assert.equal(await ev(() => sessEnCours), true, "session ouverte");
    for (const k of ["mixCible", "mixCours", "consoMots", "sessErrors", "sessSkipped", "gramErrors", "compErrors", "errErrors"])
      assert.deepEqual(e[k], PROPRE[k], k);
    assert.equal(e.sessCalib, nom === "mots jamais testés", "sessCalib");
    await ev(() => quitSession());
  });
}

test("une file vide n'ouvre pas de session", async () => {
  await ev(() => quitSession());
  await ev(() => startMix([], true, true));
  assert.equal(await ev(() => sessEnCours), false);
  assert.equal(await ev(() => document.getElementById("session").classList.contains("hidden")), true);
});

test("consolidation : garde ses mots pour les consommer en fin de session", async () => {
  await ev(() => { quitSession(); const c = state.cards.slice(0, 3); c.forEach(x => noteFaibleJour(x.hanzi)); startConsolidation(); });
  const mots = await ev(() => consoMots);
  assert.ok(Array.isArray(mots) && mots.length > 0, JSON.stringify(mots));
  await ev(() => quitSession());
});

test("aucune erreur JavaScript", () => assert.deepEqual(app.erreurs, []));
