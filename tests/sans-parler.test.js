// « Je ne peux pas parler » (demande du 2026-11-08) : une carte orale doit
// toujours pouvoir s'écrire au clavier ou laisser place à un autre exercice.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { kit, APP, bouton } = require("./outils");

let app;
before(async () => { app = await kit.ouvrirApp(APP); });
after(async () => { await app.fermer(); });
const page = () => app.page;

/* Une file de cartes orales : avec phrase (écrite en phrase entière) ou sans. */
async function filOral(avecPhrase, n = 2) {
  await page().evaluate(([avecPhrase, n]) => {
    sansParlerDepuis = 0;
    const ok = c => avecPhrase ? (c.phrase && (c.mots || []).length >= 2 && /^[一-鿿，。！？]+$/.test(c.phrase)) : !c.phrase && /^[一-鿿]+$/.test(c.hanzi);
    /* Tous les mots ont une phrase d'exemple : pour le cas « mot seul », on
       fabrique une copie sans phrase. */
    const cartes = avecPhrase ? state.cards.filter(ok).slice(0, n)
      : state.cards.filter(c => /^[\u4e00-\u9fff]+$/.test(c.hanzi)).slice(0, n).map(c => ({ ...c, phrase: "", mots: [], son: {}, zi: {} }));
    startMix(cartes.map(card => ({ kind: "srs", v: { card, track: "son", mode: "oral" }, libre: true })), true, true);
  }, [avecPhrase, n]);
  await page().waitForSelector("#card-zone .qcard");
}
const cible = () => page().evaluate(() => { const c = queue[qIndex].card; return (c.phrase || c.hanzi).replace(/[。！？]$/, ""); });

test("mot : « l'écrire » ouvre un champ, la réponse tapée est jugée", async () => {
  await filOral(false);
  await bouton(page(), "⌨️ Je ne peux pas parler : l'écrire").click();
  const t = await cible();
  await page().locator("#write-input").fill(t);
  await bouton(page(), "Vérifier").click();
  await page().waitForSelector("#answer-zone .verdict");
  assert.match(await page().locator("#answer-zone .verdict").textContent(), /Correct/);
  await bouton(page(), "Suivant ›").click();
  await page().waitForTimeout(150);
  assert.equal(await page().locator("#write-input").count(), 1, "la carte orale suivante passe d'elle-même à l'écrit");
  assert.equal(await page().locator("#mic-btn").count(), 0);
  await page().evaluate(() => quitSession());
});

test("phrase : « l'écrire » demande la phrase entière, puis « Réactiver l'oral » rend la carte orale", async () => {
  await filOral(true);
  await bouton(page(), "⌨️ Je ne peux pas parler : l'écrire").click();
  const t = await cible();
  await page().locator("#write-input").fill(t);
  await bouton(page(), "Vérifier").click();
  await page().waitForSelector("#answer-zone .verdict");
  assert.match(await page().locator("#answer-zone .verdict").textContent(), /Juste/);
  await bouton(page(), "Suivant ›").click();
  await page().waitForTimeout(150);
  await bouton(page(), "🎙️ Réactiver l'oral").click();
  await page().waitForTimeout(150);
  assert.equal(await bouton(page(), "Révéler").count(), 1, "carte orale de retour");
  await page().evaluate(() => quitSession());
});

test("« Un autre exercice » remplace la carte orale par un format silencieux, sans la compter ratée", async () => {
  await filOral(false, 1);
  const avant = await page().evaluate(() => (state.faibles || {}) && JSON.stringify(state.faibles || {}));
  await bouton(page(), "Un autre exercice").click();
  await page().waitForTimeout(150);
  assert.equal(await page().locator("#mic-btn").count(), 0);
  assert.equal(await bouton(page(), "⌨️ Je ne peux pas parler : l'écrire").count(), 0);
  assert.equal(await page().evaluate(() => modeFor(queue[qIndex])), "pinyin");
  assert.equal(await page().evaluate(() => JSON.stringify(state.faibles || {})), avant);
  await page().evaluate(() => quitSession());
});

test("aucune erreur JavaScript", () => assert.deepEqual(app.erreurs, []));
