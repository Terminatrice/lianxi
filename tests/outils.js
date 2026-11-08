// Outils partagés par les tests de Liànxí. Le kit commun est dans
// ../../../kit-apps (dossier Languages), réutilisable par les autres apps.
const path = require("path");
const kit = require("../../../kit-apps/lib/harnais");
const APP = path.join(__dirname, "..");

/* Lance une session d'une seule carte dans un mode donné (construire, oral,
   escalier...) sur un mot qui a une phrase. */
async function carteSeule(page, mode, track = "zi") {
  await page.evaluate(([mode, track]) => {
    const c = mode === "escalier" ? carteEscalier(EMBED_ESCALIERS[0]) : state.cards.find(x => x.phrase && x.mots && x.mots.length >= 3 && /^[一-鿿，。！？]+$/.test(x.phrase));
    startMix([{ kind: "srs", v: { card: c, track, mode }, libre: true }], true, true);
  }, [mode, track]);
  await page.waitForSelector("#card-zone .qcard");
}
const bouton = (page, nom) => page.getByRole("button", { name: nom, exact: true });
async function cibleCourante(page) {
  return page.evaluate(() => {
    const it = queue[qIndex];
    if (it.card.esc) return it.card.esc.etapes[escPas].hanzi.replace(/[。！？]$/, "");
    return (it.card.phrase || it.card.hanzi).replace(/[。！？]$/, "");
  });
}
module.exports = { kit, APP, carteSeule, bouton, cibleCourante };
