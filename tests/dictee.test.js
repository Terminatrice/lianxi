// Dictée et saisie des phrases (bug du 2026-11-08 : « Je n'ai rien entendu »,
// puis « Le champ est vide », sur iPhone). Tous les scénarios tournent dans
// WebKit, le moteur de Safari, en taille iPhone.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { kit, APP, carteSeule, bouton, cibleCourante } = require("./outils");

let app;
before(async () => { app = await kit.ouvrirApp(APP); });
after(async () => { await app.fermer(); });
const page = () => app.page;
const ecoute = (mode, texte) => page().evaluate(([mode, texte]) => { window.__ecoute = { mode, texte }; }, [mode, texte]);
// (chaque appel crée un nouveau scénario : « premiere » repart de zéro)
const verdict = () => page().locator("#answer-zone .verdict").textContent();

for (const mode of ["escalier", "construire"]) {
  test(`${mode} : dictée iOS (résultat jamais définitif), puis « J'ai fini de parler »`, async () => {
    await carteSeule(page(), mode);
    const cible = await cibleCourante(page());
    await ecoute("ios", cible);
    await bouton(page(), "🎤 Dicter la phrase").click();
    await page().waitForTimeout(200);
    await bouton(page(), "✅ J'ai fini de parler").click();
    await page().waitForTimeout(1500);
    assert.equal(await page().locator("#write-input").inputValue(), cible);
    await bouton(page(), "Vérifier").click();
    await page().waitForSelector("#answer-zone .verdict");
    assert.match(await verdict(), /Juste/);
    await page().evaluate(() => quitSession());
  });

  test(`${mode} : dictée iOS puis « Vérifier » directement, sans finir la prise`, async () => {
    await carteSeule(page(), mode);
    const cible = await cibleCourante(page());
    await ecoute("ios", cible);
    await bouton(page(), "🎤 Dicter la phrase").click();
    await page().waitForTimeout(200);
    await bouton(page(), "Vérifier").click();
    await page().waitForSelector("#answer-zone .verdict", { timeout: 3000 });
    assert.match(await verdict(), /Juste/);
    await page().evaluate(() => quitSession());
  });
}

/* Bug du 2026-11-09 (onglet Cours) : Safari iOS coupe l'écoute sur un silence.
   Elle réfléchit avant de parler, ou marque une pause au milieu de la phrase :
   l'app doit relancer l'écoute et garder tout ce qui a été entendu. */
for (const mode of ["escalier", "construire"]) {
  for (const cas of ["ios-silence", "ios-pause"]) {
    test(`${mode} : ${cas}, l'écoute se relance et garde toute la phrase`, async () => {
      await carteSeule(page(), mode);
      const cible = await cibleCourante(page());
      await ecoute(cas, cible);
      await bouton(page(), "🎤 Dicter la phrase").click();
      await page().waitForTimeout(400);
      assert.equal(await bouton(page(), "✅ J'ai fini de parler").count(), 1, "toujours à l'écoute après l'arrêt de Safari");
      await bouton(page(), "✅ J'ai fini de parler").click();
      await page().waitForTimeout(1500);
      assert.equal(await page().locator("#write-input").inputValue(), cible);
      await bouton(page(), "Vérifier").click();
      await page().waitForSelector("#answer-zone .verdict");
      assert.match(await verdict(), /Juste/);
      await page().evaluate(() => quitSession());
    });
  }
}

test("dictée Chrome (résultats définitifs à l'arrêt)", async () => {
  await carteSeule(page(), "construire");
  const cible = await cibleCourante(page());
  await ecoute("chrome", cible);
  await bouton(page(), "🎤 Dicter la phrase").click();
  await page().waitForTimeout(150);
  await bouton(page(), "✅ J'ai fini de parler").click();
  await page().waitForTimeout(300);
  assert.equal(await page().locator("#write-input").inputValue(), cible);
  await page().evaluate(() => quitSession());
});

test("rien entendu : message clair, puis la saisie au clavier marche encore", async () => {
  await carteSeule(page(), "construire");
  const cible = await cibleCourante(page());
  await ecoute("muet", "");
  await bouton(page(), "🎤 Dicter la phrase").click();
  await page().waitForTimeout(150);
  await bouton(page(), "✅ J'ai fini de parler").click();
  await page().waitForTimeout(300);
  assert.match(await page().locator("#dict-etat").textContent(), /rien entendu/);
  assert.equal(await bouton(page(), "🎤 Dicter la phrase").count(), 1, "le bouton de dictée revient à son état initial");
  await page().locator("#write-input").fill(cible);
  await bouton(page(), "Vérifier").click();
  await page().waitForSelector("#answer-zone .verdict");
  assert.match(await verdict(), /Juste/);
  await page().evaluate(() => quitSession());
});

test("micro refusé : message, rien ne se bloque", async () => {
  await carteSeule(page(), "construire");
  await ecoute("refus", "");
  await bouton(page(), "🎤 Dicter la phrase").click();
  await page().waitForTimeout(200);
  assert.match(await page().locator("#dict-etat").textContent(), /Micro refusé/);
  await page().evaluate(() => quitSession());
});

test("champ vraiment vide : message, puis Vérifier répond toujours", async () => {
  await carteSeule(page(), "construire");
  const cible = await cibleCourante(page());
  await bouton(page(), "Vérifier").click();
  await page().waitForTimeout(250);
  assert.match(await page().locator("#saisie-msg").textContent(), /champ est vide/);
  await page().locator("#write-input").fill(cible);
  await bouton(page(), "Vérifier").click();
  await page().waitForSelector("#answer-zone .verdict");
  assert.match(await verdict(), /Juste/);
  await page().evaluate(() => quitSession());
});

test("mode Oral : prise iOS jugée après « J'ai fini de parler »", async () => {
  await carteSeule(page(), "oral", "son");
  const cible = await cibleCourante(page());
  await ecoute("ios", cible);
  await page().locator("#mic-btn").click();
  await page().waitForTimeout(200);
  await page().locator("#mic-btn").click();
  await page().waitForTimeout(1500);
  assert.match(await page().locator("#answer-zone").textContent(), /Bien reconnu/);
  await page().evaluate(() => quitSession());
});

test("aucune erreur JavaScript pendant ces scénarios", () => {
  assert.deepEqual(app.erreurs, []);
});
