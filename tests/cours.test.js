// Onglet Cours (2026-11-21, demande de Daphnée) : chaque leçon a un panneau
// « Autres exercices », et l'entraînement sur les phrases du support y figure
// dès que la leçon a ses phrases relevées (plus de bouton isolé ailleurs).
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { kit, APP } = require("./outils");

let app;
before(async () => { app = await kit.ouvrirApp(APP, { moteur: "chromium" }); });
after(async () => { await app.fermer(); });

test("toutes les leçons ont « Autres exercices », avec « Phrases du support » quand il y en a", async () => {
  const res = await app.page.evaluate(() => leconsListe().map(l => {
    curLecon = l; renderCours();
    const panneaux = [...document.querySelectorAll("#cours-body .panel")];
    const autres = panneaux.find(p => p.querySelector("h2") && p.querySelector("h2").textContent === "Autres exercices");
    const boutons = autres ? [...autres.querySelectorAll("button")].map(b => b.textContent) : [];
    return { l, autres: !!autres, support: phrasesSupport(l).length,
      option: boutons.some(t => t.startsWith("Phrases du support")) };
  }));
  for (const r of res) {
    assert.ok(r.autres, `${r.l} : pas de panneau Autres exercices`);
    assert.equal(r.option, r.support > 0, `${r.l} : option Phrases du support`);
  }
  assert.ok(res.some(r => r.option), "au moins une leçon a ses phrases du support");
});
