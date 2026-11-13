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
