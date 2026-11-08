
"use strict";
/* ============================================================
   Liànxí v2 : répétition espacée + 4 modes de pratique.
   Vocabulaire embarqué généré depuis vocab/vocab.json
   (tools/update_vocab.py), progression en localStorage.
   ============================================================ */

const LS_KEY = "lianxi-v1";

/* ---------- Planification (SM-2 simplifié) ----------
   Une seule question posée à l'utilisatrice : « su » ou « pas su ». Tout le reste
   se règle ici, sans rien lui demander ni rien lui afficher.

   Chaque piste porte :
     inter : l'intervalle courant en jours (0 = à revoir aujourd'hui)
     ease  : la facilité du mot pour elle, qui monte quand elle réussit et
             descend quand elle rate. C'est ce qui sépare un mot qu'elle
             retient vraiment d'un mot qu'elle « repasse » de justesse.

   Court terme vs long terme : un mot n'est compté en mémoire longue qu'à partir
   de MATURE jours d'intervalle, c'est-à-dire après plusieurs réussites espacées
   sur plusieurs semaines. Une bonne réponse deux jours de suite ne suffit plus. */
/* Facilité de départ plus basse sur les caractères que sur le son : une forme
   graphique jamais tracée ne tient pas les mêmes intervalles qu'un mot dont on
   connaît déjà le son. Le gain par réussite est volontairement faible (0.02) :
   avec une notation binaire, un gain de 0.05 saturait le plafond en dix cartes. */
const EASE_START = { son: 2.2, zi: 1.9, gram: 2.1, ton: 2.0 };
const EASE_MIN = 1.3, EASE_MAX = 2.5, EASE_UP = 0.02, EASE_DOWN = 0.25;
const STEP_1 = 1, STEP_2 = { son: 3, zi: 2, ton: 2 }; // premiers paliers, plus serrés sur les caractères
const MAX_INTER = 365;             // plafond : un mot ancré revient au moins une fois par an
const MATURE = 21, ANCRE = 90;     // paliers de rétention démontrée, en jours
/* Rythme de découverte, compté en MOTS et non en pistes. Un mot a deux pistes :
   un quota de 8 pistes voulait dire 4 mots par jour, ce que rien n'annonçait.
   NEW_RESERVE est le nombre de places que les nouveautés occupent d'office en
   tête de session. Sans réservation, elles étaient concaténées APRÈS les
   révisions dues, puis la file était tronquée à SESSION_MAX : à partir de 25
   révisions en retard, aucun mot nouveau n'entrait plus jamais dans une session
   (bug relevé le 2026-08-20 : file qui tourne en rond, compteur de découvertes
   figé à zéro, progression bloquée sans que rien ne le signale). */
const NEW_WORDS_PER_DAY = 8;       // mots jamais rencontrés introduits par jour (6 -> 8 le 2026-09-20, « j'ai l'impression de stagner »)
const NEW_RESERVE = 8;             // places gardées aux nouveautés dans une session
const NEW_DAY_CAP = 16;            // plafond du jour, ciblages de niveau cumulés (12 -> 16 le 2026-08-25)
/* Mise à jour : le premier passage sert de test de niveau. Réussi du premier
   coup, le mot est réputé déjà acquis et n'est revérifié qu'un mois plus tard.
   Raté, il entre dans l'échelle normale et revient dès le lendemain. */
const CALIB_OK = 30;
const CALIB_MOTS_MAX = 15;         // 15 mots par passage, soit 30 questions courtes
/* Ancienne échelle par niveaux, conservée pour convertir la progression déjà acquise */
const OLD_LEVELS = [0, 1, 2, 4, 7, 15, 30, 60];

/* Deux pistes indépendantes par mot, avec chacune son niveau et son échéance :
   « son » = pinyin, tons, sens, oral (sans exiger les caractères)
   « zi »  = reconnaître et écrire les caractères (le pinyin est donné en indice) */
const TRACKS = ["son", "zi"];
const TRACK_LABEL = { son: "Son", zi: "Caractères" };
const TRACK_ICON = { son: "🔊", zi: "汉" };
const MODES_SON = ["pinyin", "ecoute", "oral"];
const MODES_ZI = ["lecture", "ecriture"];
const MODE_LABEL = {
  pinyin: "Son → sens", ecoute: "Écoute", oral: "Oral",
  lecture: "Caractères → sens", ecriture: "Écriture"
};

