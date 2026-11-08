/* ---------- Ton parcours ----------
   Un mot « rencontré » a été vu au moins une fois ; un mot « solide » a été
   retrouvé après trois semaines sans révision (bestGap). Les deux chiffres sont
   affichés côte à côte parce qu'ils ne disent pas la même chose, et que ne
   montrer que le premier reviendrait à créditer une rétention non démontrée. */
function estSolide(tr) { return ["longue", "ancre"].includes(maturity(tr)); }
/* Trois paliers, et non deux (demande de Daphnée, 2026-08-21) :
   CROISÉ  = rencontré au moins une fois, ce qui ne prouve rien ;
   CONNU   = elle a répondu « Su » au moins une fois. Le seul palier qu'elle
             puisse constater elle-même, et celui qu'elle voulait voir ;
   SOLIDE  = retrouvé après trois semaines sans révision (bestGap ≥ 21 j).
   « Connu » se déduit de ce qui est déjà enregistré, sans nouveau compteur :
   une piste dont les passages dépassent les ratés a forcément été réussie. */
/* `connu` est posé par le bouton « Acquis » : elle déclare savoir le mot sans
   passer par une carte. C'est une rencontre et une réussite, au même titre
   qu'une réponse juste, et les deux paliers doivent le refléter. */
function estCroise(tr) { return !!(tr && (tr.reviews || tr.connu)); }
function estConnu(tr) { return !!(tr && (tr.connu || tr.reviews > tr.errors)); }
/* Au niveau du MOT, les deux pistes comptent ensemble : savoir dire 红 sans
   savoir l'écrire, c'est déjà le connaître. */
function motCroise(c) { return estCroise(c.son) || estCroise(c.zi); }
function motConnu(c) { return estConnu(c.son) || estConnu(c.zi); }

/* Le programme du manuel HSK 1 est chargé en entier (15 leçons) ; du HSK 2 il
   n'y a que les 2 leçons déjà vues en cours. Afficher un pourcentage HSK 2 sur
   cette base laisserait croire que le niveau est presque atteint, alors que la
   grande majorité n'est pas dans l'app. On le dit au lieu de le masquer. */
/* Le nom du thème dans les données n'est pas forcément le bon mot à l'écran :
   « Informatique » ne dit pas qu'il s'agit de sa veille sur l'IA. */
const THEME_LABEL = { "Informatique": "Veille IA et informatique", "Expressions": "Expressions courantes" };
/* Le dénominateur est le référentiel OFFICIEL (HSK 2.0, celui du manuel
   HSK标准教程 que suit son cours), pas les supports du prof. Compter sur les
   slides revenait à ignorer les mots du niveau qu'ils ne couvrent pas, et à
   annoncer une progression flatteuse sur un programme rétréci. */
const HSK_PLAN = [
  { cle: "1", titre: "HSK 1" },
  { cle: "2", titre: "HSK 2" },
  { cle: "3", titre: "HSK 3" },
];
function barreHTML(pct, plein) {
  return `<div class="pc-rail"><div class="pc-fill${plein ? " plein" : ""}" style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>`;
}
/* Part connue, parmi les mots DÉJÀ travaillés. Refonte du 2026-08-24 (retour de
   Daphnée) : la répartition se lit sur le statut SU, pas sur la maturité. Un mot
   réussi dès le premier passage est un mot su ; il ne redescend que si les
   répétitions à long terme le prennent en défaut (errors rejoint reviews, et
   estConnu bascule tout seul). L'ancien découpage bestGap (« en cours », « aux
   premiers passages ») classait en travail récent des mots pourtant réussis, et
   personne ne comprenait la différence avec « connu ». Le taux de bonnes
   réponses cumulé a été retiré : invérifiable à l'œil, donc pas digne de
   confiance. */
function partConnueHTML(trav, t) {
  if (!trav.length) return "";
  let sol = 0, sus = 0, rep = 0;
  trav.forEach(c => {
    if (estSolide(c[t])) sol++;
    else if (estConnu(c[t])) sus++;
    else rep++;
  });
  const p = n => Math.round(1000 * n / trav.length) / 10;
  return `<div class="pc-seg" role="img"
       aria-label="${sol} solides, ${sus} sus, ${rep} à reprendre">
      <i style="width:${p(sol)}%"></i><i class="moyen" style="width:${p(sus)}%"></i>
      <i class="faible" style="width:${p(rep)}%"></i>
    </div>
    <div class="pc-parts">
      <span><span class="pc-puce"></span><b>${sol}</b> solide${sol > 1 ? "s" : ""}</span>
      <span><span class="pc-puce moyen"></span><b>${sus}</b> su${sus > 1 ? "s" : ""}</span>
      <span><span class="pc-puce faible"></span><b>${rep}</b> à reprendre</span>
    </div>`;
}
/* Combien de temps avant ce niveau, au rythme actuel (demande de Daphnée,
   2026-08-20). Le niveau est atteint quand tous ses mots présents dans l'app ont
   été croisés ET que toutes ses règles ont été abordées : la date annoncée est
   donc la plus tardive des deux, et on nomme celle qui commande. Annoncer la
   seule échéance du vocabulaire laisserait croire le niveau bouclé alors qu'il
   resterait dix règles à voir.
   Le dénominateur des mots est ce que l'app contient, pas le référentiel entier :
   promettre une date pour des mots qui ne sont pas chargés serait une promesse
   que l'app ne peut pas tenir. La ligne « pas encore dans l'app » juste au-dessus
   dit ce qui manque. */
function echeanceHTML(motsRestants, reglesRestantes) {
  if (motsRestants <= 0 && reglesRestantes <= 0) {
    return `<div class="pc-eta fini">Tout ce que l'app contient de ce niveau est su. 加油 !</div>`;
  }
  /* Rythme de ce qu'elle SAIT (state.sus / state.gramSus), pas de ce qu'elle
     croise (state.decouvertes / state.gramNeuves) : le rythme de découverte
     gonflait la projection d'un savoir jamais démontré (2026-08-31). */
  const rm = rythmeCalendaire(state.sus, 14);
  const rg = rythmeCalendaire(state.gramSus, 14);
  const pm = projection(motsRestants, rm ? rm.moy : 0);
  const pg = projection(reglesRestantes, rg ? rg.moy : 0);
  const reste = [];
  if (motsRestants > 0) reste.push(`<strong>${motsRestants}</strong> mot${motsRestants > 1 ? "s" : ""}`);
  if (reglesRestantes > 0) reste.push(`<strong>${reglesRestantes}</strong> règle${reglesRestantes > 1 ? "s" : ""}`);
  /* Une seule des deux à l'arrêt suffit à rendre la date globale fausse : on
     préfère alors dire ce qui bloque plutôt qu'avancer un chiffre inventé. */
  const bloque = (pm.arret && motsRestants > 0) || (pg.arret && reglesRestantes > 0);
  if (bloque) {
    const quoi = pm.arret && motsRestants > 0 && pg.arret && reglesRestantes > 0 ? "aucun mot ni aucune règle"
      : pm.arret && motsRestants > 0 ? "aucun mot nouveau" : "aucune règle nouvelle";
    return `<div class="pc-eta">Il te reste ${reste.join(" et ")}.
      <span class="pc-eta-note">Pas d'échéance : tu n'as su ${quoi} ces derniers jours.</span></div>`;
  }
  const jours = Math.max(pm.fini ? 0 : pm.jours, pg.fini ? 0 : pg.jours);
  const frein = pm.fini || (!pg.fini && pg.jours >= pm.jours) ? "la grammaire" : "le vocabulaire";
  const chiffre = (v, sing, plur) => {
    const arr = Math.round(v * 10) / 10;
    return `${arr.toString().replace(".", ",")} ${arr >= 2 ? plur : sing}/jour`;
  };
  const detail = [];
  if (rm) detail.push(chiffre(rm.moy, "mot su", "mots sus"));
  if (rg) detail.push(chiffre(rg.moy, "règle sue", "règles sues"));
  return `<div class="pc-eta">Il te reste ${reste.join(" et ")}.
    <span class="pc-eta-big">${esc(dureeTexte(jours))}</span>
    <span class="pc-eta-note">soit vers le ${esc(dateDansTexte(jours))}, au rythme réel de ta quinzaine
      (${detail.join(", ")}, jours sans session compris). C'est ${frein} qui commande.</span></div>`;
}
/* Le cap long terme (2026-08-21, choisi par Daphnée à la place de « Séries à
   90 % ») : tenir une conversation professionnelle simple. Le seuil de 1500
   mots correspond aux référentiels HSK 1 à 4, le niveau où l'on tient un
   échange de travail courant avec un interlocuteur qui coopère. Plus proche,
   donc plus motivant que les 3000 mots des séries, qui restent l'étape d'après.
   La projection porte sur le vocabulaire seul, et le bloc le dit : la
   conversation elle-même se construit à l'oral, en cours et avec Claude.
   Le compteur est le total croisé dans l'app, tous volets confondus. */
const OBJECTIF_CONV = 1500;
const OBJECTIF_SERIES = 3000;
function seriesHTML() {
  /* Le cap se compte en mots SUS, plus en mots croisés (demande de Daphnée,
     2026-08-24) : croiser un mot ne prouve rien, le savoir se constate. Un mot
     su peut redescendre si les répétitions à long terme le prennent en défaut :
     le compteur suit, sans rien lui demander. Le rythme projeté est celui des
     mots devenus sus (state.sus), pas celui des découvertes : le débit
     d'entrée du tunnel ne dit rien de ce qui en ressort su (2026-08-31). */
  const sus = state.cards.filter(motConnu).length;
  const restant = Math.max(0, OBJECTIF_CONV - sus);
  const pct = Math.min(100, Math.round(100 * sus / OBJECTIF_CONV));
  const rm = rythmeCalendaire(state.sus, 14);
  const p = projection(restant, rm ? rm.moy : 0);
  const JALONS = [600, 1000, OBJECTIF_CONV];
  const jalon = JALONS.find(j => j > sus);
  const rj = jalon ? projection(jalon - sus, rm ? rm.moy : 0) : { fini: true };
  let eta;
  if (p.fini) {
    eta = `<div class="pc-eta fini">Le stock de mots de la conversation pro est là. Place à l'oral. 加油 !</div>`;
  } else if (p.arret) {
    eta = `<div class="pc-eta">
      <span class="pc-eta-note">Pas d'échéance pour l'instant : tu n'as su aucun mot nouveau
        ces derniers jours. La projection revient dès ta prochaine session.</span></div>`;
  } else {
    const rythme = (Math.round(rm.moy * 10) / 10).toString().replace(".", ",");
    /* Deux échéances peuvent cohabiter ici : chacune dit EN TOUTES LETTRES ce
       qu'elle mesure et combien de mots elle représente. Une date de jalon et
       une durée de cap sans étiquette se lisaient comme une contradiction
       (retour de Daphnée, 2026-08-21 : « fin août et trois mois en même temps ? »). */
    const ligneJalon = jalon && jalon < OBJECTIF_CONV && !rj.fini && !rj.arret
      ? ` En chemin, premier jalon à ${jalon} mots sus (${jalon - sus} de plus) : vers ${rj.jours < 400 ? "le " : ""}${esc(dateDansTexte(rj.jours))}.`
      : "";
    eta = `<div class="pc-eta">Cap complet, ${OBJECTIF_CONV} mots sus :
      <span class="pc-eta-big">encore ${esc(dureeLongueTexte(p.jours))}</span>
      <span class="pc-eta-note">soit vers ${p.jours < 400 ? "le " : ""}${esc(dateDansTexte(p.jours))}, au rythme réel de ta
        quinzaine (${rythme} mot${rm.moy >= 2 ? "s" : ""} su${rm.moy >= 2 ? "s" : ""}/jour, jours sans session compris).${ligneJalon}</span></div>`;
  }
  /* Le contexte du cap (stock de l'app, étape des séries) se lit sur demande :
     affiché en permanence, il se relisait à chaque visite (2026-08-24). */
  return `<div class="pc-niveau">
    <div class="pc-tete"><span class="pc-nom">Conversation pro</span><span class="pc-pct">cap long terme</span></div>
    ${barreHTML(pct)}
    <div class="pc-phrase">Tenir une conversation professionnelle simple demande environ
      ${OBJECTIF_CONV} mots et les structures des niveaux HSK 3 et 4. Tu en sais déjà
      <strong>${sus}</strong>, tous volets confondus.</div>
    ${eta}
    <details class="gram-plus"><summary>Explications</summary>
      <div class="pc-note">L'app contient ${state.cards.length} mots (HSK 3 complet inclus) : le
        catalogue grandit avec toi, il ne te limitera pas. L'étape d'après, les séries sans
        sous-titres, demande environ ${OBJECTIF_SERIES} mots : tout ce que tu fais ici y mène déjà.</div>
    </details>
  </div>`;
}
function renderParcours() {
  /* Chaque bloc dit en toutes lettres ce qu'il compte. La version précédente
     empilait « 15 / 159 » et « 12 % » sans jamais préciser douze pour cent de
     quoi, ni ce que « solide » voulait dire. Des phrases, pas des nombres nus. */
  const parHanzi = new Map(state.cards.map(c => [c.hanzi, c]));
  const niveaux = HSK_PLAN.map(n => {
    const officiel = EMBED_HSK[n.cle] || [];
    if (!officiel.length) return "";
    const dansApp = officiel.filter(h => parHanzi.has(h));
    const vus = dansApp.filter(h => motCroise(parHanzi.get(h))).length;
    const con = dansApp.filter(h => motConnu(parHanzi.get(h))).length;
    const sol = dansApp.filter(h => { const c = parHanzi.get(h); return estSolide(c.son) || estSolide(c.zi); }).length;
    const gram = EMBED_GRAMMAR.filter(p => (p.theme || "").startsWith("HSK " + n.cle));
    const gVus = gram.filter(p => estCroise(gramProg(p.id))).length;
    const gCon = gram.filter(p => estConnu(gramProg(p.id))).length;
    const gSol = gram.filter(p => estSolide(gramProg(p.id))).length;
    /* La jauge se lit sur ce qu'elle SAIT (con), pas sur ce qu'elle a croisé
       (vus) : croiser un mot ne prouve rien, et une barre remplie par le seul
       croisement affichait un niveau plus avancé qu'il ne l'était vraiment
       (demande de Daphnée, 2026-08-31). */
    const pct = Math.round(100 * con / officiel.length);
    const phrase = vus
      ? `Tu sais <strong>${con}</strong> des ${officiel.length} mots du niveau (et tu en as croisé <strong>${vus}</strong>).`
      : `${officiel.length} mots composent ce niveau.`;
    const acquis = (sol || gSol)
      ? `<div class="pc-note">Solides : ${sol} mot${sol > 1 ? "s" : ""} et ${gSol} règle${gSol > 1 ? "s" : ""}.</div>` : "";
    const gramLigne = gram.length
      ? `<div class="pc-note">Grammaire : ${gCon} règle${gCon > 1 ? "s" : ""} sue${gCon > 1 ? "s" : ""} sur les ${gram.length} de tes cours (${gVus} abordée${gVus > 1 ? "s" : ""}).</div>` : "";
    /* Deux choses distinctes qu'il ne faut jamais confondre : ce qu'elle a appris,
       et ce que l'app contient. Un mot du niveau absent de l'app n'est pas un mot
       qu'elle a raté, c'est du contenu qui manque ici. */
    const trou = officiel.length - dansApp.length;
    const manque = trou
      ? `<div class="pc-note">${trou} mot${trou > 1 ? "s" : ""} du niveau ne ${trou > 1 ? "sont" : "est"} pas encore dans l'app.</div>` : "";
    /* Le dénominateur ci-dessus est le référentiel officiel, celui de l'examen.
       La puce de ciblage, elle, propose tous les mots que `niveauDe` rattache au
       niveau, référentiel ou repli par thème. Les deux nombres diffèrent, et
       les lire comme un seul rendait le tableau incompréhensible (retour de
       Daphnée, 2026-08-25). On écrit donc l'écart au lieu de le taire. */
    const cible = motsDuNiveau(n.cle);
    const horsProgramme = cible.filter(c => !dansApp.includes(c.hanzi)).length;
    const ailleurs = dansApp.filter(hz => niveauDe(parHanzi.get(hz)) !== n.cle).length;
    const morceaux = [];
    if (horsProgramme) morceaux.push(`${horsProgramme} rattaché${horsProgramme > 1 ? "s" : ""} à ce niveau hors programme officiel`);
    if (ailleurs) morceaux.push(`${ailleurs} du référentiel rangé${ailleurs > 1 ? "s" : ""} à un autre niveau, ${ailleurs > 1 ? "ils figurent" : "il figure"} dans deux listes`);
    const ciblage = morceaux.length
      ? `<div class="pc-note">Le ciblage « ${esc(n.titre)} » te propose ${cible.length} mots : les ${dansApp.length - ailleurs} du référentiel présents ici, plus ${morceaux.join(", et ")}.</div>`
      : "";
    return `<div class="pc-niveau">
      <div class="pc-tete"><span class="pc-nom">${esc(n.titre)}</span><span class="pc-pct">référentiel officiel</span></div>
      ${barreHTML(pct)}
      <div class="pc-phrase">${phrase}</div>
      ${acquis}${gramLigne}${manque}${ciblage}
      ${echeanceHTML(dansApp.length - con, gram.length - gCon)}
    </div>`;
  }).join("");

  /* Le vocabulaire ajouté à côté du manuel : il ne compte pas dans le niveau,
     mais il compte pour elle. « Hors programme » sonnait comme une mise à
     l'écart de ce qu'elle a justement choisi d'apprendre en plus. */
  const ligne = (nom, mots) => {
    const vus = mots.filter(motCroise).length, con = mots.filter(motConnu).length;
    return `<div class="pc-ligne"><span>${esc(nom)}</span><span><strong>${vus}</strong> croisé${vus > 1 ? "s" : ""} sur ${mots.length}${con ? ` · ${con} su${con > 1 ? "s" : ""}` : ""}</span></div>`;
  };
  /* Trois lignes au plus (demande de Daphnée, 2026-08-21) : la veille IA, les
     expressions, et TOUT le reste fusionné en une ligne. Une ligne par petit
     thème (couleurs, mots assemblés, divers) faisait un inventaire plus long
     que l'information qu'il portait. Le HSK 3 a son bloc de niveau plus haut. */
  const officielTout = new Set([].concat(...Object.values(EMBED_HSK)));
  const enPlusDuCours = state.cards.filter(c =>
    (c.theme || "").startsWith("HSK") && !officielTout.has(c.hanzi));
  const grands = ["Informatique", "Expressions"];
  const restes = state.cards.filter(c => {
    const t = c.theme || "Général";
    return !t.startsWith("HSK") && !grands.includes(t);
  }).concat(enPlusDuCours);
  const autres = grands.filter(t => state.cards.some(c => c.theme === t))
    .map(t => ligne(THEME_LABEL[t] || t, state.cards.filter(c => c.theme === t))).join("")
    + (restes.length ? ligne("Autres mots (couleurs, assemblés, divers)", restes) : "");
  /* « En plus du programme » se consulte sur demande (2026-08-24) : c'est du
     contexte, pas du pilotage, et il allongeait le parcours à chaque visite. */
  $("pc-niveaux").innerHTML = niveaux + (autres
    ? `<details class="gram-plus"><summary>En plus du programme</summary>
       <div class="pc-note" style="margin-top:0">Ce que tu apprends à côté du manuel, pour ta veille et pour parler.</div>${autres}</details>`
    : "") + seriesHTML();

  /* Un mot se connaît de deux façons indépendantes. Les intituler explicitement
     évite d'avoir à deviner ce que « Son » recouvre. */
  const total = state.cards.length;
  const DESC = { son: "reconnaître à l'oreille et dire le pinyin", zi: "lire et écrire les caractères" };
  $("pc-pistes").innerHTML = `<div class="pc-nom" style="margin-bottom:.5rem">Deux façons de connaître un mot</div>` +
    TRACKS.map(t => {
      const trav = state.cards.filter(c => c[t] && c[t].reviews);
      const vus = trav.length;
      const sus = trav.filter(c => estConnu(c[t])).length;
      /* La jauge se lit sur ce qu'elle sait (sus), pas sur ce qu'elle a croisé
         (vus) : mêmes raisons que le tableau par niveau HSK (2026-08-31). */
      const pct = total ? Math.round(100 * sus / total) : 0;
      return `<div class="pc-piste">
        <div class="pc-tete"><span class="pc-nom">${TRACK_ICON[t]} ${esc(TRACK_LABEL[t])}</span></div>
        <div class="pc-note">${DESC[t]}</div>
        ${barreHTML(pct)}
        <div class="pc-phrase"><strong>${sus}</strong> mot${sus > 1 ? "s" : ""} su${sus > 1 ? "s" : ""} sur ${total} (dont <strong>${vus}</strong> croisé${vus > 1 ? "s" : ""} au total).</div>
        ${partConnueHTML(trav, t)}
      </div>`;
    }).join("");

  /* Un seul rythme affiché, le calendaire (demande de Daphnée, 2026-08-21).
     Deux chiffres côte à côte, l'un par jour travaillé et l'autre par jour réel,
     obligeaient à comprendre la différence avant de pouvoir lire l'un ou
     l'autre. On garde celui qui fixe les échéances et qui ne ment pas quand une
     semaine saute. */
  const rc = rythmeCalendaire(state.decouvertes, 14);
  $("st-rythme").textContent = rc ? (Math.round(rc.moy * 10) / 10).toString().replace(".", ",") : "—";
  const d = new Date(), semaine = [];
  for (let k = 0; k < 7; k++) { semaine.push(cleDate(d)); d.setDate(d.getDate() - 1); }
  $("st-semaine").textContent = semaine.reduce((s, k) => s + (state.days[k] || 0), 0);
  /* Les définitions se lisent sur demande (repliées sous « C'est quoi croisé,
     su, solide ? ») : affichées en permanence, elles encombraient le tableau
     pour une information qu'on ne relit pas (retour de Daphnée, 2026-08-24). */
  $("st-hint").innerHTML = "<strong>Croisé</strong> : rencontré au moins une fois, ce qui ne prouve rien. <strong>Su</strong> : tu as répondu « Su » plus souvent que « Pas su », y compris dès le premier passage ; un mot su redescend tout seul si les répétitions à long terme le prennent en défaut. <strong>Solide</strong> : retrouvé après trois semaines sans le revoir. C'est le dernier qui prouve que ça tient. <strong>À reprendre</strong> : croisé, mais les « Pas su » dominent encore."
    + (rc ? ` Ton rythme porte sur les ${rc.jours} derniers jours, jours sans session compris.` : "");
}

function render() {
  const themes = [...new Set(state.cards.filter(voletMatch).map(c => c.theme || "Général"))].sort();
  if (curTheme !== "all" && !themes.includes(curTheme)) curTheme = "all";
  $("theme-chips").innerHTML = themes.length > 1
    ? [`<button class="chip" aria-pressed="${curTheme === "all"}" onclick="setTheme('all')">Tout</button>`,
       ...themes.map(t => `<button class="chip" aria-pressed="${curTheme === t}" onclick="setTheme(${jsattr(t)})">${esc(t)}</button>`)
      ].join("")
    : "";
  $("filtre-btn").textContent = filtresOuverts ? "Masquer les thèmes" : filtreLabel();
  $("filtre-btn").style.display = themes.length > 1 ? "" : "none";
  $("track-chips").innerHTML =
    [`<button class="chip" aria-pressed="${curTrack === "all"}" onclick="setTrack('all')">Les deux</button>`,
     ...TRACKS.map(t => `<button class="chip" aria-pressed="${curTrack === t}" onclick="setTrack(${jsattr(t)})">${TRACK_ICON[t]} ${esc(TRACK_LABEL[t])}</button>`)
    ].join("");

  /* Un volet vide n'est pas proposé : inutile de lui offrir un onglet qui
     n'a rien à montrer. */
  $("volet-chips").innerHTML =
    `<button class="chip" aria-pressed="${curVolet === "all"}" onclick="setVolet('all')">Tout</button>` +
    VOLETS.filter(x => state.cards.some(c => voletDe(c) === x.cle))
      .map(x => `<button class="chip" aria-pressed="${curVolet === x.cle}" onclick="setVolet(${jsattr(x.cle)})">${esc(x.nom)}</button>`).join("");

  /* Ciblage par niveau : une rangée dédiée, toujours visible. Le référentiel
     fait foi, donc « HSK 2 » cible tous les mots du niveau 2 où qu'ils vivent
     (leçons, à venir, veille). */
  $("niveau-chips").innerHTML =
    `<button class="chip" aria-pressed="${curNiveau === "all"}" onclick="setNiveau('all')">Tous niveaux</button>` +
    HSK_PLAN.filter(n => state.cards.some(c => niveauDe(c) === n.cle))
      .map(n => `<button class="chip" aria-pressed="${curNiveau === n.cle}" onclick="setNiveau(${jsattr(n.cle)})">${esc(n.titre)} (${motsDuNiveau(n.cle).length})</button>`).join("");

  const NOTE_VOLET = {
    all: "Ta session mélange tout : mots, grammaire, briques, tons et phrases reprises en cours.",
    cours: "Ce que tu as vu avec ta prof. C'est ta révision.",
    expr: "Les tournures de la conversation courante, avec leur note d'usage : quand les dire, à qui, sur quel ton.",
    avance: "Les mots des niveaux HSK que ta prof n'a pas encore abordés (fin du HSK 2, début du HSK 3). C'est de l'apprentissage neuf, à faire quand tu en as envie.",
    info: "Le vocabulaire de ta veille sur l'IA, à part du programme.",
    combi: "Des mots fabriqués en assemblant ceux que tu connais déjà. La note de fabrication montre l'assemblage : presque tout se devine.",
  };
  /* Campagne de niveau : la note dit ce qu'il reste à faire passer en su, et
     que la session se limite au vocabulaire et à la grammaire du niveau. */
  if (curNiveau === "all") {
    $("volet-note").textContent = NOTE_VOLET[curVolet] || "";
  } else {
    const mots = motsDuNiveau(curNiveau).filter(themeMatch);
    const restM = mots.filter(c => !motConnu(c)).length;
    const regles = EMBED_GRAMMAR.filter(p => (p.theme || "").startsWith("HSK " + curNiveau));
    const restG = regles.filter(p => !estConnu(gramProg(p.id))).length;
    const reste = [];
    if (restM) reste.push(`${restM} mot${restM > 1 ? "s" : ""}`);
    if (restG) reste.push(`${restG} règle${restG > 1 ? "s" : ""}`);
    $("volet-note").textContent = `Campagne HSK ${curNiveau} : ` + (reste.length
      ? `il te reste ${reste.join(" et ")} à faire passer en su. `
      : `tout ce que l'app contient de ce niveau est su. `)
      + "Ta session ne contient que le vocabulaire et la grammaire de ce niveau, ce qui est à reprendre d'abord.";
  }

  /* Le compteur d'accueil annonce la session entière, dans l'ordre où elle va se
     dérouler, et non le seul vocabulaire. */
  /* Le compteur annonce la file mixte réellement composée : c'est le nombre de
     cartes qu'elle va enchaîner, tous formats confondus, et il correspond
     exactement à la barre de progression qu'elle verra. */
  const file = sessionMixte();
  const compte = k => file.filter(x => x.kind === k).length;
  const nErr = compte("err"), nSrs = compte("srs"), nGram = compte("gram"),
        nTon = compte("ton"), nComp = compte("comp");
  const total = file.length;
  const fait = jourEstFait("mix");
  const faibles = faiblesJour();
  $("due-count").textContent = fait ? "0" : total;
  $("due-label").textContent = fait ? "à travailler : ta session du jour est faite"
    : total === 1 ? "chose à travailler aujourd'hui" : "choses à travailler aujourd'hui";
  $("start-btn").disabled = total === 0;
  const morceaux = [];
  if (nSrs) morceaux.push(`${nSrs} mot${nSrs > 1 ? "s" : ""}`);
  if (nGram) morceaux.push(`${nGram} point${nGram > 1 ? "s" : ""} de grammaire`);
  if (nComp) morceaux.push(`${nComp} brique${nComp > 1 ? "s" : ""}`);
  if (nTon) morceaux.push(`${nTon} ton${nTon > 1 ? "s" : ""}`);
  if (nErr) morceaux.push(`${nErr} phrase${nErr > 1 ? "s" : ""} reprise${nErr > 1 ? "s" : ""} en cours`);
  const rep = !fait && state.reprise && state.reprise.d === todayKey() ? state.reprise : null;
  $("start-btn").textContent = fait ? "Refaire une session"
    : rep && total ? "Reprendre ma session" : "Ma session du jour";
  /* Après la session du jour : la suite logique n'est pas d'enchaîner une
     deuxième session, c'est de consolider ce qui a coincé aujourd'hui, dans
     tous les sens (écoute, pinyin, lecture, écriture, phrase complète). Ce
     repassage ne touche pas à la planification. */
  $("conso-btn").classList.toggle("hidden", !(fait && faibles.length));
  /* Le bouton annonce exactement la fournée : au plus 12 mots par session, le
     reste attend la suivante. « 48 mots » pour 96 cartes, plus jamais. */
  if (faibles.length) $("conso-btn").textContent = faibles.length > CONSO_MOTS_MAX
    ? `Consolider mes mots du jour (${CONSO_MOTS_MAX} sur ${faibles.length})`
    : `Consolider mes ${faibles.length} mot${faibles.length > 1 ? "s" : ""} du jour`;
  const programme = morceaux.length ? "Au programme : " + morceaux.join(", ") + "." : "";
  /* Une session ciblée qui ne contient aucun mot alors qu'il en reste à
     découvrir doit dire pourquoi. C'est ce silence, et non le quota lui-même,
     qui donnait l'impression que le ciblage ne marchait pas. */
  const resteAvoir = curNiveau !== "all" && !nSrs && !newQuotaLeft()
    && motsDuNiveau(curNiveau).some(c => TRACKS.some(t => c[t] && !c[t].reviews));
  const motQuota = resteAvoir
    ? ` Aucun mot neuf du HSK ${curNiveau} aujourd'hui : ${decouvertesCible(curNiveau) >= NEW_WORDS_PER_DAY
        ? `tu en as déjà découvert ${decouvertesCible(curNiveau)} en ciblant ce niveau`
        : `le plafond de ${NEW_DAY_CAP} nouveautés du jour est atteint`}. Le panneau « mots jamais testés » ci-dessous n'est pas soumis à ce quota.`
    : "";
  /* Quitter en cours de route n'efface rien : chaque réponse est écrite au
     moment où elle est donnée. Le dire explicitement, sinon la croix en haut à
     gauche ressemble à un bouton qui annule la session. */
  $("plan-hint").innerHTML = fait
    ? (faibles.length
        ? "Bien joué. Si tu veux en faire plus, commence par consolider les mots qui ont coincé aujourd'hui."
        : "Bien joué, et rien n'a coincé aujourd'hui. Reviens demain.")
    : rep
    ? `<strong>${rep.faites} carte${rep.faites > 1 ? "s" : ""} déjà faite${rep.faites > 1 ? "s" : ""} aujourd'hui, c'est enregistré.</strong><br>${programme}${esc(motQuota)}`
    : programme + esc(motQuota);
  $("taille-chips").innerHTML = TAILLES.map(n =>
    `<button class="chip" aria-pressed="${mixMax() === n}" onclick="setTaille(${n})">${n} cartes</button>`).join("");
  $("no-due-hint").style.display = total === 0 && !fait ? "" : "none";
  $("quit-safe").style.display = total === 0 || fait ? "none" : "";

  /* Mise à jour : proposée tant qu'il reste des mots jamais testés dans le volet. */
  const jamais = calibMots().length;
  $("calib-panel").classList.toggle("hidden", jamais === 0);
  $("calib-count").textContent = jamais;
  $("calib-label").textContent = jamais === 1 ? "mot jamais testé" : "mots jamais testés";
  $("calib-btn").textContent = jamais > CALIB_MOTS_MAX
    ? `Me tester sur ${CALIB_MOTS_MAX}` : "Me tester dessus";
  $("streak").textContent = "🔥 " + streak();

  /* Compteurs de progression : ils suivent le filtre de thème affiché juste
     au-dessus, et comptent des pistes (un mot pèse deux fois, son et caractères). */
  /* Le cadre montre le chemin parcouru, pas la montagne restante. L'ancienne
     version affichait « 440 à peine vus » et trois zéros : exact, et
     décourageant au point d'être contre-productif. */
  renderParcours();

  /* Les mots à retravailler. Le bloc des confusions de tons qui les précédait a
     été retiré le 2026-08-21 à la demande de Daphnée. */
  /* Chaque ligne se déplie en une synthèse à lire, pas à travailler : le mot,
     sa phrase, sa décomposition, sa note d'usage. De quoi se remémorer en dix
     secondes sans lancer d'exercice (demande de Daphnée, 2026-08-21). */
  const weak = weakItems();
  weakCourants = weak;
  $("weak-list").innerHTML = weak.map((it, i) =>
    `<li class="weak-item"><button class="weak-head" onclick="toggleWeak(${i})" aria-expanded="false">
     <span class="w-hanzi hanzi">${esc(it.card.hanzi)}</span>
     <span class="w-mid"><span class="w-pinyin">${renderPinyin(it.card.pinyin)}</span><span class="w-theme">${TRACK_ICON[it.track]} ${esc(TRACK_LABEL[it.track])}</span><br><span class="w-fr">${esc(it.card.fr)}</span></span>
     <span class="w-err">${it.card[it.track].errors}✕</span></button>
     <div class="weak-body hidden" id="weak-${i}"></div></li>`).join("");
  $("weak-empty").style.display = weak.length ? "none" : "";
  $("export-weak").style.display = weak.length ? "" : "none";

  $("word-count").textContent = state.cards.length;
  /* Les mots les moins ancrés d'abord : c'est la liste qu'on parcourt pour voir
     ce qui reste à travailler, pas un palmarès. */
  const sorted = [...state.cards].sort((a, b) =>
    (a.son.inter + a.zi.inter) - (b.son.inter + b.zi.inter) ||
    (b.son.errors + b.zi.errors) - (a.son.errors + a.zi.errors));
  const MAT_ICON = { neuf: "·", fragile: "○", encours: "◐", longue: "●", ancre: "★" };
  $("word-list").innerHTML = sorted.map(c =>
    `<li><span class="w-hanzi hanzi">${esc(c.hanzi)}</span>
     <span class="w-mid"><span class="w-pinyin">${renderPinyin(c.pinyin)}</span><span class="w-theme">${esc(c.theme || "Général")}</span><br><span class="w-fr">${esc(c.fr)}</span></span>
     <span class="w-lvl" title="Son / Caractères">🔊 ${MAT_ICON[maturity(c.son)]}<br>汉 ${MAT_ICON[maturity(c.zi)]}</span></li>`).join("");
}

