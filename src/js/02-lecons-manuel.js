/* ---------- Vocabulaire officiel des leçons du manuel ----------
   Demande de Daphnée (2026-11-11) : « analyse les supports de cours sur Google
   Drive pour bien rajouter tous les mots de chaque séance ». Listes relevées
   sur les diapositives 词汇 des supports « HSK标准教程3 第N课课件 » du dossier
   Drive « Chinois » : ce sont les mots nouveaux que le manuel introduit dans
   chaque leçon, dans l'ordre des diapositives.
   Les leçons 3 et 7 n'ont pas de support sur le Drive : la leçon 3 garde les
   mots déjà rangés dans son thème, la leçon 7 reprend les mots de la séance du
   2026-11-01 qui l'a révisée (intérêt, heure, durée).
   Ces listes vivent dans les sources et non dans vocab/*.json parce que
   l'ingestion automatique régénère les données chaque matin : elles survivent
   ainsi au prochain build. Elles servent à deux choses :
   - la révision d'une leçon (onglet Cours) prend tous ses mots, même ceux déjà
     rangés ailleurs (音乐 vu en HSK 1 reste un mot de la leçon 6 du HSK 3) ;
   - un mot sans leçon (thème « à venir » ou vide) est rangé dans la première
     leçon du manuel qui l'introduit (themeManuel, appelé par mergeEmbed). Un
     mot déjà rangé dans une leçon, ou dans Expressions, garde son thème. */
const LECONS_MANUEL = {
  "HSK 3 · L1": ["周末", "打算", "啊", "跟", "一直", "游戏", "作业", "着急", "复习", "南方", "北方", "面包", "带", "地图", "搬"],
  "HSK 3 · L2": ["腿", "疼", "脚", "树", "容易", "难", "太太", "秘书", "经理", "办公室", "辆", "楼", "拿", "把", "伞", "胖", "其实", "瘦"],
  "HSK 3 · L4": ["比赛", "照片", "年级", "又", "聪明", "热情", "努力", "总是", "回答", "站", "饿", "超市", "蛋糕", "年轻", "认真", "客人"],
  "HSK 3 · L5": ["发烧", "为", "照顾", "用", "感冒", "季节", "当然", "春天", "草", "夏天", "裙子", "最近", "越"],
  "HSK 3 · L6": ["眼镜", "突然", "离开", "清楚", "刚才", "帮忙", "特别", "讲", "明白", "锻炼", "音乐", "公园", "聊天", "睡着", "更"],
  "HSK 3 · L7": ["有意思", "差", "一刻", "多久", "多长时间", "迟到", "接"],
  "HSK 3 · L8": ["又", "满意", "电梯", "层", "害怕", "熊猫", "见面", "安静", "可乐", "一会儿", "马上", "洗手间", "老", "几乎", "变化", "健康", "重要"],
  "HSK 3 · L9": ["中文", "班", "一样", "最后", "放心", "一定", "担心", "比较", "了解", "先", "中间", "参加", "影响"],
  "HSK 3 · L10": ["个子", "矮", "历史", "体育", "数学", "方便", "自行车", "骑", "旧", "换", "地方", "中介", "主要", "环境", "附近"],
};
/* Première leçon du manuel qui introduit chaque mot. */
const LECON_DU_MOT = {};
Object.keys(LECONS_MANUEL).forEach(l => LECONS_MANUEL[l].forEach(h => { if (!LECON_DU_MOT[h]) LECON_DU_MOT[h] = l; }));
function themeManuel(hanzi, theme) {
  const sansLecon = !theme || /à venir$/.test(theme);
  return sansLecon && LECON_DU_MOT[hanzi] ? LECON_DU_MOT[hanzi] : theme;
}
/* Titres des leçons du HSK 3, tels qu'ils figurent en tête des supports
   (leçons 3 et 7 : titres du manuel, faute de support sur le Drive). */
const LECONS_TITRES = {
  "HSK 3 · L1": ["周末你有什么打算", "Qu'est-ce que tu as prévu ce week-end ?"],
  "HSK 3 · L2": ["他什么时候回来", "Quand est-ce qu'il revient ?"],
  "HSK 3 · L3": ["桌子上放着很多饮料", "Il y a plein de boissons sur la table"],
  "HSK 3 · L4": ["她总是笑着跟客人说话", "Elle parle toujours aux clients avec le sourire"],
  "HSK 3 · L5": ["我最近越来越胖了", "Je grossis de plus en plus ces temps-ci"],
  "HSK 3 · L6": ["怎么突然找不到了", "Pourquoi je ne le trouve plus tout d'un coup ?"],
  "HSK 3 · L7": ["我跟她都认识五年了", "Ça fait cinq ans qu'on se connaît, elle et moi"],
  "HSK 3 · L8": ["你去哪儿我就去哪儿", "Où tu vas, je vais"],
  "HSK 3 · L9": ["她的汉语说得跟中国人一样好", "Elle parle chinois aussi bien qu'une Chinoise"],
  "HSK 3 · L10": ["数学比历史难多了", "Les maths sont bien plus dures que l'histoire"],
};
/* ---------- Expressions du début des supports (热身) ----------
   Demande de Daphnée (2026-11-14) : « je ne passe jamais en revue les
   expressions de début de support de cours ». Chaque support s'ouvre sur un
   dicton (« 你知道这句话的意思吗？ »). Ils deviennent des fiches du thème
   Expressions, révisées comme les autres dans la session générale, et chaque
   leçon les reprend dans sa page et dans « Réviser toute la leçon ».
   Trois existaient déjà dans vocab.json ; les six autres sont ajoutées ici,
   dans les sources pour survivre à l'ingestion (si la même fiche arrive par
   vocab.json, c'est elle qui l'emporte). Leçons 3 et 7 : pas de support. */
const LECONS_DICTONS = {
  "HSK 3 · L1": ["大考大玩，小考小玩"],
  "HSK 3 · L2": ["上山容易下山难"],
  "HSK 3 · L4": ["友谊第一，比赛第二"],
  "HSK 3 · L5": ["身体是革命的本钱", "药到病除"],
  "HSK 3 · L6": ["万事开头难"],
  "HSK 3 · L8": ["站得高，看得远"],
  "HSK 3 · L9": ["三人行，必有我师"],
  "HSK 3 · L10": ["不可同日而语"],
};
const DICTONS_MANUEL = [
  { hanzi: "大考大玩，小考小玩", pinyin: "dà kǎo dà wán, xiǎo kǎo xiǎo wán", fr: "gros examen, grosse détente ; petit examen, petite détente",
    usage: "Boutade d'élève du support de la leçon 1 : plus l'examen est important, plus on s'amuse. Se dit en riant.",
    phrase: "大考大玩，小考小玩。", phraseFr: "Gros examen, grosse détente ; petit examen, petite détente.",
    mots: [["大考", "dà kǎo", "gros examen"], ["大玩", "dà wán", "s'amuser beaucoup"], ["小考", "xiǎo kǎo", "petit examen"], ["小玩", "xiǎo wán", "s'amuser un peu"]], theme: "Expressions" },
  { hanzi: "上山容易下山难", pinyin: "shàng shān róngyì xià shān nán", fr: "monter, c'est facile ; descendre, c'est dur",
    usage: "Phrase de Xiaogang dans le dialogue de la leçon 2, quand les jambes font mal à la descente.",
    phrase: "上山容易下山难，你不知道？", phraseFr: "Monter c'est facile, descendre c'est dur, tu ne savais pas ?",
    mots: [["上山", "shàng shān", "monter la montagne"], ["容易", "róngyì", "facile"], ["下山", "xià shān", "descendre"], ["难", "nán", "difficile"], ["你", "nǐ", "tu"], ["不", "bù", "ne pas"], ["知道", "zhīdào", "savoir"]], theme: "Expressions" },
  { hanzi: "药到病除", pinyin: "yào dào bìng chú", fr: "le remède arrive, la maladie s'en va (guérison immédiate)",
    usage: "Expression figée en quatre caractères, du support de la leçon 5 : pour un remède ou une solution qui marche tout de suite.",
    phrase: "这个药真好，药到病除。", phraseFr: "Ce médicament est vraiment bien, guérison immédiate.",
    mots: [["这个", "zhège", "ce"], ["药", "yào", "médicament"], ["真", "zhēn", "vraiment"], ["好", "hǎo", "bien"], ["药到病除", "yào dào bìng chú", "guérison immédiate"]], theme: "Expressions" },
  { hanzi: "站得高，看得远", pinyin: "zhàn de gāo, kàn de yuǎn", fr: "qui se tient haut voit loin (avoir une vision large)",
    usage: "Dicton du support de la leçon 8 : prendre de la hauteur pour penser à l'avenir, pas seulement au présent.",
    phrase: "站得高，看得远。", phraseFr: "Qui se tient haut voit loin.",
    mots: [["站", "zhàn", "se tenir debout"], ["得", "de", "particule de degré"], ["高", "gāo", "haut"], ["看", "kàn", "voir"], ["得", "de", "particule de degré"], ["远", "yuǎn", "loin"]], theme: "Expressions" },
  { hanzi: "三人行，必有我师", pinyin: "sān rén xíng, bì yǒu wǒ shī", fr: "parmi trois personnes qui marchent ensemble, il y a forcément un maître pour moi",
    usage: "Citation de Confucius, du support de la leçon 9 : on peut apprendre de tout le monde. Se dit avec modestie.",
    phrase: "三人行，必有我师。", phraseFr: "Parmi trois personnes qui marchent ensemble, il y a forcément un maître pour moi.",
    mots: [["三", "sān", "trois"], ["人", "rén", "personnes"], ["行", "xíng", "marcher"], ["必", "bì", "forcément"], ["有", "yǒu", "il y a"], ["我", "wǒ", "mon"], ["师", "shī", "maître"]], theme: "Expressions" },
  { hanzi: "不可同日而语", pinyin: "bù kě tóng rì ér yǔ", fr: "sans commune mesure, on ne peut pas comparer",
    usage: "Expression figée du support de la leçon 10 : deux choses trop différentes pour être comparées (« aujourd'hui, c'est bien mieux qu'avant »).",
    phrase: "现在的生活和过去不可同日而语。", phraseFr: "La vie d'aujourd'hui n'a rien à voir avec celle d'avant.",
    mots: [["现在", "xiànzài", "maintenant"], ["的", "de", "de"], ["生活", "shēnghuó", "la vie"], ["和", "hé", "et"], ["过去", "guòqù", "le passé"], ["不可同日而语", "bù kě tóng rì ér yǔ", "sans commune mesure"]], theme: "Expressions" },
];
{
  const ids = new Set(EMBED_VOCAB.map(w => w.hanzi));
  DICTONS_MANUEL.forEach(w => { if (!ids.has(w.hanzi)) EMBED_VOCAB.push(w); });
}
function dictonsLecon(l) {
  return (LECONS_DICTONS[l] || []).map(h => state.cards.find(c => c.hanzi === h)).filter(Boolean);
}
