// Parcours de bout en bout (voir parcours-commun.js). Réparti en plusieurs
// fichiers pour que les tests tournent en parallèle.
const sessions = [
  ["session du jour", () => startJour()],
  ["session du jour, autre tirage", () => startJour(), 99],
];
sessions.onglets = true;
require("./parcours-commun")(sessions);
