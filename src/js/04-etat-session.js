/* ---------- État de la session en cours (refonte du 2026-11-08) ----------
   Toutes les variables qui décrivent LA session en cours, déclarées ici et
   nulle part ailleurs, avec une seule remise à zéro : `remettreSessionAZero`.
   Avant, chacun des douze démarrages de session et « Quitter » remettaient à
   zéro leur propre sélection de variables, à la main. Un oubli suffisait pour
   qu'un réglage d'une session déborde sur la suivante : c'est ainsi qu'un
   repassage quitté en route laissait les entraînements suivants sans aucune
   planification (corrigé en août), et que la session mixte gardait les ratés
   de la précédente. Règle : toute nouvelle variable de session se déclare ici
   ET se remet à zéro dans `remettreSessionAZero`. Les files propres à un format
   (gramQueue, compQueue, toneQueue...) restent dans le fichier de ce format :
   elles sont réécrites à chaque carte par le format lui-même. */

/* Format en cours, file et position, compteurs de l'écran de fin. */
let sessMode = "srs"; // "srs" (révision) ou "tones" (quiz tons)
let queue = [], qIndex = 0, sessTotal = 0, sessErrors = [], sessSkipped = [], sessOk = 0;
let sessEcrit = 0, sessEcritPos = -9;   // écritures déjà passées, et à quelle position
/* true pendant un repassage libre : on rejoue les cartes ratées sans planifier */
let sessPractice = false;
/* Vrai pendant le passage de mise à jour : il ne consomme pas le quota de
   nouveautés du jour, sinon balayer 30 mots connus bloquerait l'app une semaine. */
let sessCalib = false;
/* Vrai entre le démarrage d'une session et son écran de fin. Sert uniquement à
   distinguer « elle a terminé » de « elle est partie en cours de route » : les
   réponses, elles, sont déjà enregistrées carte par carte. */
let sessEnCours = false;

/* Session du jour, ancienne version par plan. */
let plan = [], planPos = 0;

/* Session mixte : voir 15-session-du-jour.js (sessionMixte, lancerMix). */
let mix = [], mixPos = 0, mixOn = false, mixBilan = null;
/* Quota d'écriture au niveau de la session ENTIÈRE. Dans la file mixte, chaque
   carte de vocabulaire arrive dans une file d'un seul élément : les compteurs
   de session (sessEcrit, sessEcritPos) repartaient donc de zéro à chaque carte
   et le quota ne limitait plus rien. D'où le trop-plein d'exercices d'écriture
   signalé par Daphnée le 2026-08-21. Ces deux compteurs-ci survivent d'une
   carte à l'autre de la même session du jour. */
let mixEcrit = 0, mixEcritDern = -99;
/* `liste` : une file toute faite (révision d'un cours, voir startCours). Sans
   elle, c'est la session du jour. `cours` empêche la révision d'un cours de
   mettre les compteurs du jour à zéro : elle ne remplace pas la session du jour. */
let mixCours = false;
/* `cible` : entraînement ciblé sur des fiches (startGramCible). Les éléments
   marqués `libre` y passent en repassage, sans rien planifier. */
let mixCible = false;
/* Les mots servis par la session en cours : consommés de la liste du jour à la
   FIN de la session seulement. Quitter en route ne consomme rien. */
let consoMots = null;
/* Entraînements de grammaire imposant leurs exercices (startDrillOrdre, atelier). */
let drillExos = null, exoImpose = null;

/* Valeurs de départ de toute session : appelée par chaque démarrage (via
   `ouvrirSession`) et par « Quitter ». */
function remettreSessionAZero() {
  sessMode = "srs"; queue = []; qIndex = 0; sessTotal = 0;
  sessErrors = []; sessSkipped = []; sessOk = 0; sessEcrit = 0; sessEcritPos = -9;
  sessPractice = false; sessCalib = false; sessEnCours = false;
  plan = []; planPos = 0;
  mix = []; mixPos = 0; mixOn = false; mixBilan = null; mixEcrit = 0; mixEcritDern = -99;
  mixCours = false; mixCible = false; consoMots = null;
  drillExos = null; exoImpose = null; exoCourant = null;
  gramErrors = []; gramOk = 0; compErrors = []; compOk = 0; errErrors = []; errOk = 0;
  escPas = 0; escOk = true;
}
/* Début de n'importe quelle session : tout repart de zéro, puis on note
   qu'une session est en cours (pour la reprise si elle quitte en route). */
function ouvrirSession() {
  stopRecog();
  remettreSessionAZero();
  sessEnCours = true;
  if (state.reprise) { delete state.reprise; save(); }
}
