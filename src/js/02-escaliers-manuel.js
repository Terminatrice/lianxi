/* ---------- Phrases en escalier des leçons 7 à 10 du HSK 3 ----------
   Demande de Daphnée (2026-11-14) : remettre le bouton « phrases longues »
   dans l'onglet Cours. Les leçons 7 à 10 n'avaient aucune phrase en escalier
   (vocab/escaliers.json s'arrête à la leçon 6). Celles-ci reprennent les
   dialogues des supports du Drive (leçon 7 : phrases bâties sur son
   vocabulaire, faute de support). Même format que vocab/escaliers.json : les
   blocs dans l'ordre de la phrase finale, chaque étape est une phrase correcte,
   la dernière est la phrase visée.
   Gardées dans les sources pour survivre à l'ingestion automatique ; si une
   phrase de même id arrive un jour par vocab/escaliers.json, c'est elle qui
   l'emporte. */
const ESCALIERS_MANUEL = [
  { id: "manuel-l7-renshi-wu-nian", lecon: "HSK 3 · L7",
    blocs: [["我", "wǒ", "je", "QUI"], ["跟", "gēn", "avec", "AVEC QUI"], ["她", "tā", "elle", "AVEC QUI"], ["都", "dōu", "déjà", "DEGRÉ"],
      ["认识", "rènshi", "connaître", "ACTION"], ["五年", "wǔ nián", "cinq ans", "COMBIEN"], ["了", "le", "et ça continue", "FIN"]],
    etapes: [
      { hanzi: "我认识她。", pinyin: "wǒ rènshi tā.", fr: "Je la connais.", ajout: "Le noyau : QUI + 认识 rènshi + la personne." },
      { hanzi: "我认识她五年了。", pinyin: "wǒ rènshi tā wǔ nián le.", fr: "Ça fait cinq ans que je la connais.", ajout: "COMBIEN : la durée 五年 wǔ nián après le verbe et son objet, puis 了 le à la fin : ça dure depuis cinq ans et ça continue." },
      { hanzi: "我跟她都认识五年了。", pinyin: "wǒ gēn tā dōu rènshi wǔ nián le.", fr: "Ça fait déjà cinq ans qu'on se connaît, elle et moi.", ajout: "AVEC QUI : 跟她 gēn tā devant le verbe, qui n'a plus d'objet. 都 dōu ajoute « déjà » : cinq ans, c'est long." },
    ] },
  { id: "manuel-l7-cha-yi-ke", lecon: "HSK 3 · L7",
    blocs: [["现在", "xiànzài", "maintenant", "QUAND"], ["差", "chà", "moins", "QUAND"], ["一刻", "yí kè", "un quart d'heure", "QUAND"], ["八点", "bā diǎn", "huit heures", "QUAND"],
      ["我们", "wǒmen", "nous", "QUI"], ["要", "yào", "aller (bientôt)", "QUAND"], ["迟到", "chídào", "être en retard", "ACTION"], ["了", "le", "c'est imminent", "FIN"]],
    etapes: [
      { hanzi: "我们要迟到了。", pinyin: "wǒmen yào chídào le.", fr: "On va être en retard.", ajout: "Le noyau : 要…了 yào… le encadre le verbe : ça va arriver tout de suite." },
      { hanzi: "现在八点，我们要迟到了。", pinyin: "xiànzài bā diǎn, wǒmen yào chídào le.", fr: "Il est huit heures, on va être en retard.", ajout: "QUAND : l'heure en tête de phrase, 现在八点 xiànzài bā diǎn." },
      { hanzi: "现在差一刻八点，我们要迟到了。", pinyin: "xiànzài chà yí kè bā diǎn, wǒmen yào chídào le.", fr: "Il est huit heures moins le quart, on va être en retard.", ajout: "差一刻 chà yí kè se place AVANT l'heure : « il manque un quart d'heure pour huit heures »." },
    ] },
  { id: "manuel-l7-jichang-jie", lecon: "HSK 3 · L7",
    blocs: [["明天", "míngtiān", "demain", "QUAND"], ["我", "wǒ", "je", "QUI"], ["去", "qù", "aller", "ACTION"], ["机场", "jīchǎng", "l'aéroport", "OÙ"],
      ["接", "jiē", "chercher (quelqu'un)", "ACTION"], ["你", "nǐ", "toi", "QUOI"]],
    etapes: [
      { hanzi: "我接你。", pinyin: "wǒ jiē nǐ.", fr: "Je viens te chercher.", ajout: "Le noyau : 接 jiē, aller chercher quelqu'un qui arrive." },
      { hanzi: "我去机场接你。", pinyin: "wǒ qù jīchǎng jiē nǐ.", fr: "Je vais te chercher à l'aéroport.", ajout: "Deux verbes à la suite : d'abord le déplacement 去机场 qù jīchǎng, puis le but 接你 jiē nǐ." },
      { hanzi: "明天我去机场接你。", pinyin: "míngtiān wǒ qù jīchǎng jiē nǐ.", fr: "Demain, je vais te chercher à l'aéroport.", ajout: "QUAND : 明天 míngtiān en tête, ou juste après QUI." },
    ] },
  { id: "manuel-l8-you-zai-kan", lecon: "HSK 3 · L8",
    blocs: [["昨天", "zuótiān", "hier", "QUAND"], ["去看了看", "qù kàn le kàn", "suis allée voir", "ACTION"], ["今天", "jīntiān", "aujourd'hui", "QUAND"], ["又", "yòu", "de nouveau (c'est fait)", "COMMENT"],
      ["去看了看", "qù kàn le kàn", "suis allée voir", "ACTION"], ["明天", "míngtiān", "demain", "QUAND"], ["还要", "hái yào", "vais encore", "COMMENT"], ["再", "zài", "de nouveau (à venir)", "COMMENT"], ["去看看", "qù kànkan", "aller voir", "ACTION"]],
    etapes: [
      { hanzi: "昨天去看了看。", pinyin: "zuótiān qù kàn le kàn.", fr: "Hier, je suis allée voir.", ajout: "Le noyau : 看了看 kàn le kàn, « jeter un œil », avec 了 au milieu parce que c'est fait." },
      { hanzi: "昨天去看了看，今天又去看了看。", pinyin: "zuótiān qù kàn le kàn, jīntiān yòu qù kàn le kàn.", fr: "Hier je suis allée voir, aujourd'hui j'y suis retournée.", ajout: "又 yòu devant le verbe : on a RE-fait, c'est déjà arrivé." },
      { hanzi: "昨天去看了看，今天又去看了看，明天还要再去看看。", pinyin: "zuótiān qù kàn le kàn, jīntiān yòu qù kàn le kàn, míngtiān hái yào zài qù kànkan.", fr: "Hier je suis allée voir, aujourd'hui j'y suis retournée, et demain j'y retourne encore.", ajout: "Pour demain, 再 zài et non 又 : la répétition n'a pas encore eu lieu. 还要 hái yào se met devant 再." },
    ] },
  { id: "manuel-l8-mashang-huilai", lecon: "HSK 3 · L8",
    blocs: [["你", "nǐ", "tu", "QUI"], ["等", "děng", "attendre", "ACTION"], ["我", "wǒ", "moi", "QUOI"], ["一会儿", "yíhuìr", "un moment", "COMBIEN"],
      ["我", "wǒ", "je", "QUI"], ["马上", "mǎshàng", "tout de suite", "QUAND"], ["回来", "huílai", "revenir", "ACTION"]],
    etapes: [
      { hanzi: "我回来。", pinyin: "wǒ huílai.", fr: "Je reviens.", ajout: "Le noyau : QUI + 回来 huílai." },
      { hanzi: "我马上回来。", pinyin: "wǒ mǎshàng huílai.", fr: "Je reviens tout de suite.", ajout: "QUAND : 马上 mǎshàng juste devant le verbe." },
      { hanzi: "你等我一会儿，我马上回来。", pinyin: "nǐ děng wǒ yíhuìr, wǒ mǎshàng huílai.", fr: "Attends-moi un moment, je reviens tout de suite.", ajout: "COMBIEN de temps : 一会儿 yíhuìr se place APRÈS le verbe et son objet, 等我一会儿." },
    ] },
  { id: "manuel-l8-jihu-mei-bianhua", lecon: "HSK 3 · L8",
    blocs: [["快", "kuài", "presque", "COMBIEN"], ["五年", "wǔ nián", "cinq ans", "COMBIEN"], ["了", "le", "ça fait", "FIN"],
      ["你", "nǐ", "tu", "QUI"], ["几乎", "jīhū", "presque", "DEGRÉ"], ["没", "méi", "ne pas", "NÉGATION"], ["变化", "biànhuà", "changer", "ACTION"]],
    etapes: [
      { hanzi: "你没变化。", pinyin: "nǐ méi biànhuà.", fr: "Tu n'as pas changé.", ajout: "Le noyau : 没 méi devant 变化 biànhuà, puisqu'on parle de ce qui s'est passé." },
      { hanzi: "你几乎没变化。", pinyin: "nǐ jīhū méi biànhuà.", fr: "Tu n'as presque pas changé.", ajout: "DEGRÉ : 几乎 jīhū se met devant la négation." },
      { hanzi: "快五年了，你几乎没变化。", pinyin: "kuài wǔ nián le, nǐ jīhū méi biànhuà.", fr: "Ça fait presque cinq ans, et tu n'as presque pas changé.", ajout: "En tête, 快…了 kuài… le : « bientôt cinq ans »." },
    ] },
  { id: "manuel-l9-gen-zhongguoren", lecon: "HSK 3 · L9",
    blocs: [["她的", "tā de", "son", "QUI"], ["汉语", "Hànyǔ", "chinois", "QUOI"], ["说得", "shuō de", "parlé", "ACTION"], ["跟", "gēn", "comme", "COMMENT"],
      ["中国人", "Zhōngguó rén", "un Chinois", "COMMENT"], ["一样", "yíyàng", "pareil", "COMMENT"], ["好", "hǎo", "bien", "DEGRÉ"]],
    etapes: [
      { hanzi: "她说得很好。", pinyin: "tā shuō de hěn hǎo.", fr: "Elle parle très bien.", ajout: "Le noyau : verbe + 得 de + la manière." },
      { hanzi: "她的汉语说得很好。", pinyin: "tā de Hànyǔ shuō de hěn hǎo.", fr: "Elle parle très bien chinois.", ajout: "QUOI : la langue passe en tête, 她的汉语 tā de Hànyǔ, et le verbe suit." },
      { hanzi: "她的汉语说得跟中国人一样好。", pinyin: "tā de Hànyǔ shuō de gēn Zhōngguó rén yíyàng hǎo.", fr: "Elle parle chinois aussi bien qu'une Chinoise.", ajout: "跟…一样 gēn… yíyàng remplace 很 hěn, juste devant l'adjectif : « aussi bien que »." },
    ] },
  { id: "manuel-l9-shan-yue-gao", lecon: "HSK 3 · L9",
    blocs: [["山", "shān", "la montagne", "QUI"], ["越高", "yuè gāo", "plus elle est haute", "DEGRÉ"], ["路", "lù", "le chemin", "QUI"], ["越难走", "yuè nán zǒu", "plus il est dur", "DEGRÉ"],
      ["我", "wǒ", "je", "QUI"], ["也", "yě", "aussi", "LIEN"], ["越爬越冷", "yuè pá yuè lěng", "plus je grimpe, plus j'ai froid", "DEGRÉ"]],
    etapes: [
      { hanzi: "路很难走。", pinyin: "lù hěn nán zǒu.", fr: "Le chemin est difficile.", ajout: "Le noyau : 难走 nán zǒu, « difficile à parcourir »." },
      { hanzi: "山越高，路越难走。", pinyin: "shān yuè gāo, lù yuè nán zǒu.", fr: "Plus la montagne est haute, plus le chemin est difficile.", ajout: "越…越… yuè… yuè… : chaque 越 se place devant ce qui augmente, un dans chaque moitié." },
      { hanzi: "山越高，路越难走，我也越爬越冷。", pinyin: "shān yuè gāo, lù yuè nán zǒu, wǒ yě yuè pá yuè lěng.", fr: "Plus la montagne est haute, plus le chemin est dur, et plus je grimpe, plus j'ai froid.", ajout: "越 + verbe + 越 + adjectif : 越爬越冷 yuè pá yuè lěng, avec un seul sujet." },
    ] },
  { id: "manuel-l9-xiuxi-de-yue-duo", lecon: "HSK 3 · L9",
    blocs: [["他", "tā", "il", "QUI"], ["让", "ràng", "dire de", "ACTION"], ["我", "wǒ", "moi", "À QUI"], ["多", "duō", "davantage", "DEGRÉ"], ["休息", "xiūxi", "se reposer", "ACTION"],
      ["休息得", "xiūxi de", "se reposer", "ACTION"], ["越多", "yuè duō", "plus", "DEGRÉ"], ["好得", "hǎo de", "guérir", "ACTION"], ["越快", "yuè kuài", "plus vite", "DEGRÉ"]],
    etapes: [
      { hanzi: "他让我休息。", pinyin: "tā ràng wǒ xiūxi.", fr: "Il m'a dit de me reposer.", ajout: "Le noyau : 让 ràng + la personne + ce qu'elle doit faire." },
      { hanzi: "他让我多休息。", pinyin: "tā ràng wǒ duō xiūxi.", fr: "Il m'a dit de me reposer davantage.", ajout: "DEGRÉ : 多 duō DEVANT le verbe veut dire « faire davantage »." },
      { hanzi: "他让我多休息，休息得越多，好得越快。", pinyin: "tā ràng wǒ duō xiūxi, xiūxi de yuè duō, hǎo de yuè kuài.", fr: "Il m'a dit de me reposer davantage : plus je me repose, plus je guéris vite.", ajout: "Verbe + 得越 + adjectif, deux fois : 休息得越多，好得越快 xiūxi de yuè duō, hǎo de yuè kuài." },
    ] },
  { id: "manuel-l10-shuxue-lishi", lecon: "HSK 3 · L10",
    blocs: [["数学", "shùxué", "les maths", "QUI"], ["比", "bǐ", "que", "COMMENT"], ["历史", "lìshǐ", "l'histoire", "COMMENT"], ["难", "nán", "difficile", "DEGRÉ"], ["多了", "duō le", "beaucoup plus", "DEGRÉ"]],
    etapes: [
      { hanzi: "数学很难。", pinyin: "shùxué hěn nán.", fr: "Les maths, c'est difficile.", ajout: "Le noyau : QUI + 很 hěn + adjectif." },
      { hanzi: "数学比历史难。", pinyin: "shùxué bǐ lìshǐ nán.", fr: "Les maths sont plus difficiles que l'histoire.", ajout: "A 比 B + adjectif : 比历史 bǐ lìshǐ devant l'adjectif, et 很 disparaît." },
      { hanzi: "数学比历史难多了。", pinyin: "shùxué bǐ lìshǐ nán duō le.", fr: "Les maths sont bien plus difficiles que l'histoire.", ajout: "DEGRÉ : l'écart se met APRÈS l'adjectif, 难多了 nán duō le. Jamais 很 dans une phrase avec 比." },
    ] },
  { id: "manuel-l10-bi-make-da", lecon: "HSK 3 · L10",
    blocs: [["马可", "Mǎkě", "Marco", "QUI"], ["比", "bǐ", "que", "COMMENT"], ["我", "wǒ", "moi", "COMMENT"], ["高", "gāo", "grand", "DEGRÉ"],
      ["我", "wǒ", "je", "QUI"], ["比", "bǐ", "que", "COMMENT"], ["马可", "Mǎkě", "Marco", "COMMENT"], ["大", "dà", "âgé", "DEGRÉ"], ["两岁", "liǎng suì", "de deux ans", "COMBIEN"]],
    etapes: [
      { hanzi: "我比马可大。", pinyin: "wǒ bǐ Mǎkě dà.", fr: "Je suis plus âgé que Marco.", ajout: "Le noyau : A 比 B + adjectif ; 大 dà, pour l'âge, veut dire « plus vieux »." },
      { hanzi: "我比马可大两岁。", pinyin: "wǒ bǐ Mǎkě dà liǎng suì.", fr: "J'ai deux ans de plus que Marco.", ajout: "COMBIEN : l'écart chiffré se met APRÈS l'adjectif, 大两岁 dà liǎng suì." },
      { hanzi: "马可比我高，我比马可大两岁。", pinyin: "Mǎkě bǐ wǒ gāo, wǒ bǐ Mǎkě dà liǎng suì.", fr: "Marco est plus grand que moi, j'ai deux ans de plus que lui.", ajout: "Deux comparaisons qui se répondent, chacune avec son 比 bǐ." },
    ] },
  { id: "manuel-l10-meiyou-name-anjing", lecon: "HSK 3 · L10",
    blocs: [["学校", "xuéxiào", "l'école", "OÙ"], ["里边的", "lǐbian de", "de l'intérieur", "OÙ"], ["没有", "méiyǒu", "pas autant que", "NÉGATION"], ["学校", "xuéxiào", "l'école", "OÙ"],
      ["外边的", "wàibian de", "ceux de l'extérieur", "OÙ"], ["那么", "nàme", "aussi", "DEGRÉ"], ["安静", "ānjìng", "calme", "DEGRÉ"]],
    etapes: [
      { hanzi: "学校里边的很安静。", pinyin: "xuéxiào lǐbian de hěn ānjìng.", fr: "Ceux à l'intérieur de l'école sont très calmes.", ajout: "Le noyau : 的 de tout seul remplace le nom déjà connu (les logements)." },
      { hanzi: "学校里边的没有学校外边的安静。", pinyin: "xuéxiào lǐbian de méiyǒu xuéxiào wàibian de ānjìng.", fr: "Ceux à l'intérieur de l'école sont moins calmes que ceux à l'extérieur.", ajout: "A 没有 B + adjectif : la comparaison négative, 没有 méiyǒu à la place de 比 bǐ." },
      { hanzi: "学校里边的没有学校外边的那么安静。", pinyin: "xuéxiào lǐbian de méiyǒu xuéxiào wàibian de nàme ānjìng.", fr: "Ceux à l'intérieur de l'école ne sont pas aussi calmes que ceux à l'extérieur.", ajout: "那么 nàme devant l'adjectif : « pas AUSSI calme que »." },
    ] },
  { id: "manuel-l10-yi-liang-ge-xiaoshi", lecon: "HSK 3 · L10",
    blocs: [["我", "wǒ", "je", "QUI"], ["每天", "měitiān", "chaque jour", "QUAND"], ["学习", "xuéxí", "étudier", "ACTION"], ["一两个小时", "yì liǎng ge xiǎoshí", "une heure ou deux", "COMBIEN"], ["汉语", "Hànyǔ", "le chinois", "QUOI"]],
    etapes: [
      { hanzi: "我每天学习汉语。", pinyin: "wǒ měitiān xuéxí Hànyǔ.", fr: "J'étudie le chinois tous les jours.", ajout: "Le noyau : QUI + QUAND + verbe + QUOI." },
      { hanzi: "我每天学习两个小时汉语。", pinyin: "wǒ měitiān xuéxí liǎng ge xiǎoshí Hànyǔ.", fr: "J'étudie le chinois deux heures par jour.", ajout: "COMBIEN de temps : la durée se glisse entre le verbe et la matière, 学习两个小时汉语." },
      { hanzi: "我每天学习一两个小时汉语。", pinyin: "wǒ měitiān xuéxí yì liǎng ge xiǎoshí Hànyǔ.", fr: "J'étudie le chinois une heure ou deux par jour.", ajout: "Deux chiffres qui se suivent, 一两 yì liǎng, donnent une quantité approximative." },
    ] },
];
{
  const ids = new Set(EMBED_ESCALIERS.map(e => e.id));
  ESCALIERS_MANUEL.forEach(e => { if (!ids.has(e.id)) EMBED_ESCALIERS.push(e); });
}
