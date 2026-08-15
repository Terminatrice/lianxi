# Sources tierces embarquées

## Tracé des caractères

- **hanzi-writer.min.js** (v3.7.2) : bibliothèque de tracé et de validation des
  caractères chinois. Licence MIT. https://chanind.github.io/hanzi-writer
- **strokes.json** : données de tracé (chemins SVG et médianes) pour les 410
  caractères du vocabulaire de cette app. Extraites du paquet
  `hanzi-writer-data`, lui-même dérivé du projet **Make Me a Hanzi**
  (https://github.com/skishore/makemeahanzi), dont les données de caractères
  proviennent des polices Arphic et sont distribuées sous
  **Arphic Public License**. Le champ `radStrokes` a été retiré (inutilisé ici)
  et les données limitées aux caractères du vocabulaire.

## Vocabulaire

- Listes officielles HSK 2.0 (niveaux 1 et 2), reprises de
  https://github.com/glxxyz/hskhsk.com
