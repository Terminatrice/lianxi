// Parcours de bout en bout (voir parcours-commun.js). Réparti en plusieurs
// fichiers pour que les tests tournent en parallèle.
const sessions = [
  ["atelier « construire des phrases »", () => startAtelier()],
  ["remise en ordre en série", () => startDrillOrdre()],
  ["phrases en escalier", () => startEscaliersRecents()],
  ["entraînement de grammaire", () => startGramSession()],
  ["briques", () => startCompSession()],
];
sessions.onglets = false;
require("./parcours-commun")(sessions);
