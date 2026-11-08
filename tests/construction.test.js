// app/index.html est CONSTRUIT depuis app/src (refonte du 2026-11-08). Ce test
// refuse un index.html modifié à la main (la modification serait écrasée au
// prochain build) ou des sources modifiées sans reconstruction (la correction
// ne partirait pas sur le téléphone). Remède : python3 tools/update_vocab.py
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path");

const APP = path.join(__dirname, "..");
const lire = f => fs.readFileSync(path.join(APP, f), "utf8");

test("index.html correspond exactement aux sources de app/src", () => {
  const js = fs.readdirSync(path.join(APP, "src/js")).filter(f => f.endsWith(".js")).sort()
    .map(f => lire("src/js/" + f)).join("");
  const attendu = lire("src/page.html").replace("/*@styles*/", lire("src/styles.css")).replace("/*@scripts*/", js);
  const [avant, apres] = attendu.split("/*@donnees*/");
  const reel = lire("index.html");
  const sansTampon = t => t.replace(/(<span id="build-stamp">)[^<]*(<\/span>)/, "$1$2");
  assert.ok(apres !== undefined, "repère /*@donnees*/ absent des sources");
  const debut = sansTampon(reel).startsWith(sansTampon(avant));
  const fin = reel.endsWith(apres);
  assert.ok(debut && fin, "index.html ne correspond pas à app/src : relancer python3 tools/update_vocab.py (et ne jamais éditer index.html à la main)");
});
