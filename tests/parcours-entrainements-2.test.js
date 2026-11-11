// Parcours de bout en bout (voir parcours-commun.js). Réparti en plusieurs
// fichiers pour que les tests tournent en parallèle.
const sessions = [
  ["quiz tons", () => startToneQuiz()],
  ["mon oreille", () => startOreille()],
  ["traduire les phrases du cours", () => startTraduction(seancesRecentes())],
  ["reconnaître les caractères récents", () => startRecoRecents()],
  ["vocabulaire d'une leçon du manuel", () => startLecon(leconsListe()[0])],
  ["mots jamais testés", () => startCalibrage()],
  ["consolidation des mots du jour", () => startConsolidation()],
];
sessions.onglets = false;
require("./parcours-commun")(sessions);
