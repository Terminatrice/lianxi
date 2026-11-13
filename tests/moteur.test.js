// Règles du moteur de révision, telles que décidées avec Daphnée (voir CLAUDE.md
// du dossier Chinois). Chaque test porte la date de la règle qu'il protège :
// si une modification future la casse, le déploiement est bloqué.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { kit, APP } = require("./outils");

let app;
before(async () => { app = await kit.ouvrirApp(APP, { moteur: "chromium" }); });
after(async () => { await app.fermer(); });
const ev = (fn, arg) => app.page.evaluate(fn, arg);

test("planification : premier succès d'un mot vu en cours = vérification à un mois (calibrage)", async () => {
  const r = await ev(() => { const tr = { reviews: 0, errors: 0, inter: 0 }; schedule(tr, true, "son", true); return tr.inter; });
  assert.equal(r, await ev(() => CALIB_OK));
});

test("planification : pas de raccourci à un mois pour un mot jamais vu en cours (2026-09-16)", async () => {
  const r = await ev(() => { const tr = { reviews: 0, errors: 0, inter: 0 }; schedule(tr, true, "son", false); return tr.inter; });
  assert.ok(r <= 3, `intervalle ${r} jours`);
});

test("planification : la grammaire suit l'échelle 1, 3, 6, 13, 28 jours, jamais le raccourci (2026-08-21)", async () => {
  const r = await ev(() => { Math.random = () => 0; const tr = { reviews: 0, errors: 0, inter: 0 }; const out = [];
    for (let i = 0; i < 5; i++) { schedule(tr, true, "gram"); out.push(tr.inter); } return out; });
  assert.deepEqual(r, [1, 3, 6, 13, 28]);
});

test("planification : un échec sur une carte jeune la renvoie à demain", async () => {
  const r = await ev(() => { const tr = { reviews: 3, errors: 0, inter: 8, bestGap: 3 }; schedule(tr, false, "son"); return tr.inter; });
  assert.equal(r, 1);
});

test("planification : jamais au-delà d'un an", async () => {
  const r = await ev(() => { const tr = { reviews: 9, errors: 0, inter: 300, ease: 2.5, bestGap: 200 }; schedule(tr, true, "son"); return tr.inter; });
  assert.ok(r <= 365);
});

test("repassage : rien n'est planifié pendant un repassage", async () => {
  const r = await ev(() => { sessPractice = true; const tr = { reviews: 2, errors: 0, inter: 3 }; schedule(tr, false, "son"); sessPractice = false; return tr; });
  assert.deepEqual(r, { reviews: 2, errors: 0, inter: 3 });
});

/* Profil réaliste (reprend la sonde d'audit du 2026-09-16) : les mots du
   cours déjà travaillés, moitié sus, moitié à reprendre, tous en retard ;
   le reste jamais vu. Sur un profil vierge, rien n'est à réviser et la
   session est légitimement courte. */
test("préparation : profil réaliste", async () => {
  await ev(() => { let k = 0; state.cards.forEach(c => { if (voletDe(c) === "cours") { const ko = (k++ % 2) === 0;
    ["son", "zi"].forEach(t => { c[t].reviews = 2; c[t].errors = ko ? 2 : 0; c[t].due = Date.now() - 1 - (k % 5) * 864e5; }); } }); });
});
for (const taille of [20, 35, 50]) {
  test(`session du jour (${taille}) : longueur respectée, vocabulaire au moins à moitié, nouveautés sous le quota`, async () => {
    const r = await ev(t => {
      state.taille = t; curNiveau = "all";
      const m = sessionMixte(), srs = m.filter(e => e.kind === "srs");
      const tests = m.filter(e => !(e.kind === "srs" && e.v.mode === "decouverte"));
      const neufs = new Set(srs.filter(e => !e.v.card.son.reviews && !e.v.card.zi.reviews).map(e => e.v.card.hanzi));
      return { total: tests.length, vocab: srs.filter(e => e.v.mode !== "decouverte").length, neufs: neufs.size, max: mixMax(), quota: NEW_WORDS_PER_DAY };
    }, taille);
    assert.ok(r.total <= r.max, `${r.total} exercices pour ${r.max} annoncés`);
    assert.ok(r.total >= r.max * 0.8, `session trop courte : ${r.total}`);
    assert.ok(r.vocab >= Math.ceil(r.max / 2) - 1, `vocabulaire ${r.vocab} sur ${r.max}`);
    assert.ok(r.neufs <= r.quota, `${r.neufs} mots nouveaux pour un quota de ${r.quota}`);
  });
}

test("session du jour : quota de nouveautés épuisé = aucun mot nouveau (2026-08-20)", async () => {
  const r = await ev(() => {
    state.taille = 35; curNiveau = "all"; state.decouvertes = state.decouvertes || {};
    state.decouvertes[todayKey()] = NEW_WORDS_PER_DAY + 2;
    const m = sessionMixte();
    const n = m.filter(e => e.kind === "srs" && !e.v.card.son.reviews && !e.v.card.zi.reviews && !e.v.card.son.connu).length;
    delete state.decouvertes[todayKey()];
    return n;
  });
  assert.equal(r, 0);
});

test("campagne HSK 2 : seulement du vocabulaire et de la grammaire du niveau (2026-09-16)", async () => {
  const r = await ev(() => {
    curNiveau = "2"; state.taille = 35;
    const m = sessionMixte(); curNiveau = "all";
    return { kinds: [...new Set(m.map(e => e.kind))], niveaux: [...new Set(m.filter(e => e.kind === "srs").map(e => niveauDe(e.v.card)))] };
  });
  assert.ok(r.kinds.every(k => k === "srs" || k === "gram"), r.kinds.join(","));
  assert.deepEqual(r.niveaux.filter(n => String(n) !== "2"), []);
});

test("une piste « Caractères » n'est jamais testée en écriture avant une lecture réussie", async () => {
  const r = await ev(() => { state.taille = 50; const m = sessionMixte();
    return m.filter(e => e.kind === "srs" && e.v.mode === "ecriture" && !(e.v.card.zi.reviews > e.v.card.zi.errors)).map(e => e.v.card.hanzi); });
  assert.deepEqual(r, []);
});

test("aucune erreur JavaScript", () => assert.deepEqual(app.erreurs, []));

test("leçon du manuel : tous ses mots, y compris ceux pas encore rangés dans la leçon (2026-11-11)", async () => {
  const r = await ev(() => {
    const l = "HSK 3 · L9", cartes = leconCartes(l);
    const parTheme = state.cards.filter(c => c.theme === l).length;
    const seance = EMBED_COURS.find(s => leconsSeance(s).includes(l));
    return { n: cartes.length, parTheme, plage: leconsSeance({ lecon: "HSK 3 · L4–L6" }), seance: !!seance,
      etrangers: cartes.filter(c => c.theme !== l && !LECONS_MANUEL[l].includes(c.hanzi)).length,
      manquants: LECONS_MANUEL[l].filter(h => !cartes.some(c => c.hanzi === h)),
      l10: leconCartes("HSK 3 · L10").length, aVenirL10: state.cards.filter(c => LECONS_MANUEL["HSK 3 · L10"].includes(c.hanzi) && /à venir$/.test(c.theme || "")).length };
  });
  assert.deepEqual(r.plage, ["HSK 3 · L4", "HSK 3 · L5", "HSK 3 · L6"]);
  assert.ok(r.n >= r.parTheme && r.n > 0);
  assert.equal(r.etrangers, 0, "aucun mot hors du thème ou de la liste du manuel");
  assert.deepEqual(r.manquants, [], "tous les mots du support de la leçon 9");
  assert.equal(r.l10, 15, "les 15 mots du support de la leçon 10");
  assert.equal(r.aVenirL10, 0, "les mots de la leçon 10 ne sont plus « à venir »");
});

test("écran Cours : une page par leçon, sans date, phrases d'une séance « L9–L10 » réparties (2026-11-13)", async () => {
  const r = await ev(() => {
    showTab("cours"); choisirLecon("HSK 3 · L10");
    const z = document.getElementById("cours-body").textContent;
    const f = l => leconSeance(l).formulations.map(x => x.hanzi);
    return { dates: /\d\d\/\d\d/.test(z), titre: z.includes("数学比历史难多了"),
      l10: f("HSK 3 · L10"), l9: f("HSK 3 · L9") };
  });
  assert.equal(r.dates, false, "aucune date à l'écran");
  assert.ok(r.titre);
  assert.ok(r.l10.includes("数学比历史难多了。") && !r.l10.includes("吃得越多，胖得越快。"));
  assert.ok(r.l9.includes("吃得越多，胖得越快。") && !r.l9.includes("数学比历史难多了。"));
});
