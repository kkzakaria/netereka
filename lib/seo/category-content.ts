/**
 * Texte SEO éditorial par catégorie, affiché sous la grille produits
 * et utilisé comme meta description. Keyed par slug (source de vérité :
 * catégories actives en production). Une catégorie absente de cette map
 * garde le fallback générique — le site ne casse jamais.
 */
export interface CategorySeoContent {
  /** 100–160 caractères — meta description + og:description */
  metaDescription: string;
  /** H2 du bloc éditorial */
  heading: string;
  /** Paragraphes du bloc éditorial (texte brut, pas de HTML) */
  paragraphs: string[];
}

export const CATEGORY_SEO_CONTENT: Record<string, CategorySeoContent> = {
  smartphones: {
    metaDescription:
      "Achetez votre smartphone au meilleur prix en Côte d'Ivoire : iPhone, Samsung, Xiaomi, Tecno… Neufs et garantis, livraison Abidjan, paiement à la livraison.",
    heading: "Acheter un smartphone en Côte d'Ivoire au meilleur prix",
    paragraphs: [
      "Vous cherchez un téléphone neuf, garanti et au vrai prix du marché à Abidjan ? NETEREKA vous propose les dernières nouveautés — iPhone, Samsung Galaxy, Xiaomi, Redmi, OPPO, Tecno, Google Pixel — avec des prix affichés en francs CFA, sans surprise. Du smartphone à petit prix pour rester connecté au flagship dernier cri, chaque appareil est neuf, scellé et couvert par une garantie.",
      "Commandez en ligne et payez à la livraison : vous vérifiez votre téléphone avant de payer. Livraison rapide à Abidjan (Cocody, Plateau, Yopougon, Marcory et toutes les communes) et partout en Côte d'Ivoire. Besoin d'un conseil pour choisir entre deux modèles ? Notre équipe répond sur WhatsApp.",
    ],
  },
  ordinateurs: {
    metaDescription:
      "PC portables et ordinateurs de bureau neufs à Abidjan : HP, Dell, Lenovo, MacBook. Prix en FCFA, garantie, livraison rapide et paiement à la livraison.",
    heading: "Acheter un ordinateur portable ou de bureau à Abidjan",
    paragraphs: [
      "Étudiant, entrepreneur ou gamer : trouvez l'ordinateur qu'il vous faut au juste prix en Côte d'Ivoire. Notre sélection couvre les PC portables HP, Dell, Lenovo et Asus, les MacBook Apple et les ordinateurs de bureau complets avec écran — pour la bureautique, les études, le graphisme ou le jeu.",
      "Tous nos ordinateurs sont neufs et garantis, avec les caractéristiques détaillées (processeur, RAM, stockage SSD) pour comparer facilement. Paiement à la livraison : votre PC est livré chez vous à Abidjan ou dans votre ville, vous l'inspectez, puis vous payez. C'est aussi simple que ça.",
    ],
  },
  tablettes: {
    metaDescription:
      "Tablettes tactiles au meilleur prix en Côte d'Ivoire : iPad, Samsung Galaxy Tab, Xiaomi Pad. Neuves et garanties, livraison Abidjan, paiement à la livraison.",
    heading: "Acheter une tablette tactile en Côte d'Ivoire",
    paragraphs: [
      "Pour les études, le divertissement ou le travail en déplacement, la tablette est le bon compromis entre smartphone et ordinateur. Retrouvez chez NETEREKA les iPad d'Apple, les Samsung Galaxy Tab, les Xiaomi Pad et OnePlus Pad, du modèle familial abordable à la tablette pro avec stylet.",
      "Chaque tablette est neuve, scellée et garantie, avec le prix affiché en FCFA. Commandez en ligne, faites-vous livrer rapidement à Abidjan ou partout en Côte d'Ivoire, et payez uniquement à la réception.",
    ],
  },
  "montres-connectees": {
    metaDescription:
      "Montres connectées à Abidjan : Apple Watch, Galaxy Watch, Xiaomi Watch. Suivi santé et sport, prix FCFA, garantie et paiement à la livraison en Côte d'Ivoire.",
    heading: "Montres connectées au meilleur prix à Abidjan",
    paragraphs: [
      "Suivez votre santé, vos entraînements et vos notifications directement au poignet. Notre catalogue de montres connectées réunit l'Apple Watch, la Samsung Galaxy Watch, les Xiaomi Watch et les bracelets connectés abordables — pour le sport, le style ou les deux.",
      "Toutes nos montres sont neuves et garanties. Livraison rapide à Abidjan et dans toute la Côte d'Ivoire, paiement à la livraison : vous essayez, vous vérifiez, vous payez.",
    ],
  },
  ecouteurs: {
    metaDescription:
      "Écouteurs sans fil et casques audio en Côte d'Ivoire : AirPods, Galaxy Buds, JBL. Son de qualité au prix juste, livraison Abidjan, paiement à la livraison.",
    heading: "Écouteurs et casques audio en Côte d'Ivoire",
    paragraphs: [
      "AirPods d'Apple, Galaxy Buds de Samsung, casques JBL ou écouteurs à réduction de bruit : trouvez l'audio qui accompagne votre quotidien, du trajet en gbaka aux sessions de sport. Tous les produits sont authentiques, neufs et garantis — fini les contrefaçons qui lâchent au bout d'un mois.",
      "Les prix sont affichés en FCFA et vous payez à la livraison, à Abidjan comme dans les autres villes de Côte d'Ivoire.",
    ],
  },
  accessoires: {
    metaDescription:
      "Accessoires électroniques à Abidjan : chargeurs, power banks, coques, câbles, claviers. Produits authentiques, prix FCFA et paiement à la livraison en CI.",
    heading: "Accessoires électroniques : chargeurs, power banks et plus",
    paragraphs: [
      "Un bon appareil mérite de bons accessoires. Retrouvez ici les chargeurs rapides et power banks Anker, les coques et protections d'écran, les câbles certifiés, claviers, souris et hubs USB — tout ce qui prolonge et protège vos équipements au quotidien, y compris pendant les coupures.",
      "Contrairement aux accessoires de contrefaçon qui abîment vos appareils, tous nos produits sont authentiques et garantis. Livraison rapide à Abidjan et partout en Côte d'Ivoire, paiement à la réception.",
    ],
  },
  jeux: {
    metaDescription:
      "Consoles et jeux vidéo en Côte d'Ivoire : PlayStation 5, manettes et accessoires gaming. Prix en FCFA, neufs, livraison Abidjan, paiement à la livraison.",
    heading: "Consoles et jeux vidéo en Côte d'Ivoire",
    paragraphs: [
      "Passionné de gaming ? Retrouvez les consoles PlayStation, les manettes officielles et les accessoires gaming au prix juste à Abidjan. Que vous montiez votre premier setup ou complétiez votre collection, nos produits sont neufs, scellés et garantis.",
      "Commandez votre console en ligne et payez à la livraison : vous déballez et vérifiez avant de sortir le moindre franc. Livraison rapide dans toutes les communes d'Abidjan et en Côte d'Ivoire.",
    ],
  },
  televiseurs: {
    metaDescription:
      "Téléviseurs neufs à Abidjan : Smart TV 4K, écrans 32 à 85 pouces des grandes marques. Prix en FCFA, garantie, livraison rapide et paiement à la livraison.",
    heading: "Acheter un téléviseur à Abidjan : Smart TV et 4K",
    paragraphs: [
      "Matchs de foot, séries, Netflix ou YouTube : offrez-vous une image à la hauteur. Notre sélection de téléviseurs couvre les Smart TV connectées, les écrans 4K UHD et toutes les tailles, du 32 pouces pour la chambre au 85 pouces pour le salon familial.",
      "Chaque téléviseur est neuf, garanti, et livré avec précaution chez vous à Abidjan ou dans votre ville. Vous payez à la livraison, après avoir vérifié l'écran. Les prix sont clairs, en FCFA, sans frais cachés.",
    ],
  },
  projecteurs: {
    metaDescription:
      "Vidéoprojecteurs en Côte d'Ivoire pour cinéma maison, église ou salle de réunion. Prix FCFA, neufs et garantis, livraison Abidjan, paiement à la livraison.",
    heading: "Vidéoprojecteurs pour la maison, l'église et le bureau",
    paragraphs: [
      "Transformez n'importe quel mur en écran géant : soirée cinéma à la maison, projection à l'église, présentation en salle de réunion ou cours en amphi. Nos vidéoprojecteurs couvrent tous les usages et tous les budgets, avec les caractéristiques détaillées (luminosité, résolution, connectique) pour bien choisir.",
      "Produits neufs et garantis, prix affichés en FCFA, livraison rapide à Abidjan et partout en Côte d'Ivoire — et comme toujours, vous payez à la réception.",
    ],
  },
  imprimantes: {
    metaDescription:
      "Imprimantes et scanners à Abidjan : jet d'encre, laser, multifonctions HP, Epson, Canon. Pour bureau et maison. Prix FCFA, paiement à la livraison en CI.",
    heading: "Imprimantes et scanners pour le bureau et la maison",
    paragraphs: [
      "Cyber, PME, école ou bureau à domicile : trouvez l'imprimante adaptée à votre volume d'impression. Jet d'encre économique, laser rapide ou multifonction avec scanner — nos modèles HP, Epson et Canon sont neufs, garantis, et sélectionnés pour leur fiabilité et le coût raisonnable des consommables.",
      "Prix transparents en FCFA, livraison rapide à Abidjan et dans toute la Côte d'Ivoire, paiement à la livraison. Une question sur la compatibilité des cartouches ? Écrivez-nous sur WhatsApp.",
    ],
  },
  reseau: {
    metaDescription:
      "Routeurs, box WiFi et équipements réseau en Côte d'Ivoire. Améliorez votre connexion à la maison ou au bureau. Prix FCFA et paiement à la livraison à Abidjan.",
    heading: "Routeurs et équipements réseau : améliorez votre connexion",
    paragraphs: [
      "Une connexion stable, ça change tout — pour le télétravail, les cours en ligne ou le streaming. Retrouvez nos routeurs WiFi, répéteurs, box 4G/5G et accessoires réseau pour couvrir toute la maison ou équiper votre bureau, même dans les zones où la fibre n'arrive pas.",
      "Matériel neuf et garanti, prix en FCFA, livraison partout en Côte d'Ivoire et paiement à la réception. Notre équipe peut vous aider à choisir selon votre opérateur et la taille de votre logement.",
    ],
  },
  apple: {
    metaDescription:
      "iPhone et produits Apple neufs en Côte d'Ivoire : iPhone 17, iPhone Air, prix officiels en FCFA. Garantie, livraison Abidjan et paiement à la livraison.",
    heading: "iPhone et produits Apple en Côte d'Ivoire",
    paragraphs: [
      "Les derniers iPhone au prix juste à Abidjan : iPhone 17, iPhone 17 Pro, iPhone Air et les générations précédentes, tous neufs, scellés et garantis — jamais de reconditionné vendu comme neuf. Les prix sont affichés en FCFA pour chaque capacité et coloris.",
      "Payez à la livraison après avoir vérifié le scellé Apple. Livraison rapide dans toutes les communes d'Abidjan et partout en Côte d'Ivoire.",
    ],
  },
  samsung: {
    metaDescription:
      "Samsung Galaxy au meilleur prix en Côte d'Ivoire : S26 Ultra, Z Flip, Galaxy A. Neufs et garantis, livraison rapide à Abidjan, paiement à la livraison.",
    heading: "Samsung Galaxy au meilleur prix à Abidjan",
    paragraphs: [
      "Du Galaxy A abordable au S26 Ultra en passant par les pliables Z Flip et Z Fold : toute la gamme Samsung, neuve et garantie, au vrai prix du marché ivoirien. Comparez les capacités et coloris directement sur chaque fiche produit, prix en FCFA affichés.",
      "Commandez en ligne, recevez votre Galaxy rapidement à Abidjan ou dans votre ville, vérifiez le scellé et payez à la livraison.",
    ],
  },
  xiaomi: {
    metaDescription:
      "Smartphones Xiaomi en Côte d'Ivoire : Xiaomi 17, 17 Ultra et plus. Le haut de gamme au prix malin, garantie, livraison Abidjan, paiement à la livraison.",
    heading: "Xiaomi en Côte d'Ivoire : la performance au prix malin",
    paragraphs: [
      "Xiaomi s'est imposé comme le meilleur rapport performance/prix du marché : photo de flagship, charge ultra-rapide et écrans AMOLED, pour bien moins cher que la concurrence. Retrouvez le Xiaomi 17, le 17 Ultra et les autres modèles de la gamme, neufs et garantis.",
      "Prix en FCFA clairement affichés, livraison rapide à Abidjan et partout en Côte d'Ivoire, paiement à la réception de votre téléphone.",
    ],
  },
  redmi: {
    metaDescription:
      "Redmi en Côte d'Ivoire : smartphones fiables à petit prix. Grande autonomie, bon appareil photo, garantie. Livraison Abidjan et paiement à la livraison.",
    heading: "Redmi : le smartphone fiable à petit prix",
    paragraphs: [
      "Besoin d'un bon téléphone sans casser la tirelire ? La gamme Redmi de Xiaomi offre de grandes batteries, des écrans lumineux et des appareils photo corrects à des prix imbattables — idéal pour un premier smartphone, un étudiant ou un téléphone de travail.",
      "Tous nos Redmi sont neufs, scellés et garantis. Livraison rapide à Abidjan et en Côte d'Ivoire, paiement uniquement à la réception.",
    ],
  },
  oppo: {
    metaDescription:
      "Smartphones OPPO en Côte d'Ivoire : Find X9, Find N6 et Reno. Design premium et photo portrait, garantie, livraison Abidjan, paiement à la livraison.",
    heading: "OPPO en Côte d'Ivoire : design et photo portrait",
    paragraphs: [
      "OPPO se distingue par ses designs soignés, sa charge rapide SuperVOOC et ses portraits réussis. Du Reno accessible au pliable Find N6 et au flagship Find X9 Ultra, retrouvez les modèles OPPO neufs et garantis au prix juste en FCFA.",
      "Livraison rapide dans toutes les communes d'Abidjan et partout en Côte d'Ivoire, paiement à la livraison après vérification.",
    ],
  },
  oneplus: {
    metaDescription:
      "OnePlus en Côte d'Ivoire : smartphones et tablettes rapides et fluides. OnePlus Pad, flagships neufs et garantis. Livraison Abidjan, paiement à la livraison.",
    heading: "OnePlus à Abidjan : la fluidité avant tout",
    paragraphs: [
      "Réputé pour ses écrans fluides, sa charge éclair et son interface épurée, OnePlus séduit ceux qui veulent un appareil rapide sans payer le prix d'un iPhone. Smartphones et tablettes OnePlus Pad, neufs, scellés et garantis.",
      "Prix affichés en FCFA, livraison rapide à Abidjan et dans toute la Côte d'Ivoire, et comme toujours chez NETEREKA : vous payez à la réception.",
    ],
  },
  huawei: {
    metaDescription:
      "Huawei en Côte d'Ivoire : smartphones photo, montres et tablettes. Excellente autonomie, produits neufs garantis. Livraison Abidjan, paiement à la livraison.",
    heading: "Huawei en Côte d'Ivoire : photo et autonomie",
    paragraphs: [
      "Huawei reste une référence pour la photo mobile et l'autonomie. Retrouvez les smartphones, montres et tablettes de la marque, neufs et garantis, avec les caractéristiques détaillées pour choisir en connaissance de cause.",
      "Prix transparents en FCFA, livraison rapide à Abidjan et partout en Côte d'Ivoire, paiement à la livraison après vérification de votre appareil.",
    ],
  },
  nothing: {
    metaDescription:
      "Nothing Phone en Côte d'Ivoire : le smartphone au design unique avec interface Glyph. Neuf, garanti, livraison rapide à Abidjan et paiement à la livraison.",
    heading: "Nothing Phone : le smartphone qui ne ressemble à aucun autre",
    paragraphs: [
      "Avec son dos transparent et son interface lumineuse Glyph, le Nothing Phone est le choix de ceux qui veulent se démarquer — sans sacrifier la performance ni la photo. Retrouvez les modèles Nothing neufs et garantis chez NETEREKA.",
      "Prix en FCFA affichés, livraison rapide à Abidjan et dans toute la Côte d'Ivoire, paiement à la réception : vous vérifiez votre téléphone avant de payer.",
    ],
  },
  "quasi-neuf": {
    metaDescription:
      "Smartphones quasi neufs vérifiés en Côte d'Ivoire : l'état du neuf, le prix en moins. Testés et garantis, livraison Abidjan, paiement à la livraison.",
    heading: "Quasi neuf : la qualité vérifiée, le prix réduit",
    paragraphs: [
      "Envie d'un haut de gamme sans le prix du neuf ? Nos appareils quasi neufs sont inspectés, testés et vendus en parfait état de fonctionnement, à des prix nettement réduits. Chaque fiche produit décrit précisément l'état de l'appareil — aucune mauvaise surprise.",
      "Contrairement au marché de l'occasion classique, vous êtes protégé : produit vérifié, garantie incluse et paiement à la livraison après inspection. Livraison rapide à Abidjan et partout en Côte d'Ivoire.",
    ],
  },
};

export function getCategorySeoContent(slug: string): CategorySeoContent | null {
  return CATEGORY_SEO_CONTENT[slug] ?? null;
}
