# Thème des fêtes de fin d'année — design

Date : 2026-11-22 · Statut : approuvé (design court)

## Intention

Donner à la boutique un air de fête pour Noël et le Nouvel An, pour qu'un client
qui arrive en décembre sente tout de suite que la saison est là. NETEREKA doit rester
reconnaissable (bleu marine et vert menthe), et la vitesse sur mobile ne doit pas en
pâtir. C'est la première brique de la préparation des fêtes. Les promotions, les codes
promo et une sélection cadeaux viendront après, à part.

## Objectifs

- Un habillage festif qui **s'active et se désactive seul** selon une fenêtre de dates.
- Visible au premier coup d'œil : bandeau d'annonce, guirlande d'étoiles sous l'en-tête,
  petite étoile près du logo, touches dorées sur les titres de section, message de fête
  dans le pied de page.
- Il fonctionne en mode clair **et** en mode sombre.
- **Aperçu avant ouverture** : l'équipe peut voir le thème avant le 1er décembre, les
  clients non.

## Hors périmètre

- Les bannières de Noël du carrousel : c'est du contenu, créé via l'admin ou le MCP.
- Les promotions, les prix barrés, l'écran admin des codes promo, une page « idées cadeaux ».
- Un interrupteur dans l'admin (approche B). Il pourra s'ajouter plus tard sans rien casser.
- L'admin, les pages d'authentification et les e-mails.

## Ce qui ferait échouer le projet même si « ça marche »

- Une perte de vitesse mesurable sur mobile (LCP de l'accueil). D'où : pas d'animation, pas
  de JS ajouté côté client hors bouton de fermeture, pas d'image lourde.
- Une marque méconnaissable : la palette `--primary` et les autres tokens ne changent pas.
- Un contraste illisible : le texte du bandeau et les touches dorées doivent passer
  WCAG AA dans les deux modes.
- Le thème encore affiché après la fenêtre, ou qui change d'un rechargement à l'autre.
- Une fausse promesse de livraison dans le bandeau.

## Approches considérées

| | Approche | Compromis |
|---|---|---|
| **A (choisie)** | Fenêtre de dates dans le code, habillage par-dessus la marque | Peu de code, rien en base, zéro coût de performance. Changer les dates ou le texte demande un déploiement. |
| B | Même habillage, piloté par un interrupteur et des dates dans l'admin | Arrêt possible sans déployer, mais il faut une table, un écran et des tests : environ 3× plus de travail pour un usage annuel. |
| C | Repeindre toute la palette en rouge et or | Écartée : la marque n'est plus reconnaissable, l'admin est touché, tous les contrastes sont à revalider. |

L'approche A a été choisie par l'utilisateur, sur ma recommandation.

## Décidé

- **Style** : étoiles et guirlandes lumineuses, or et rouge en touches. Pas de neige
  (décalée à Abidjan ; l'utilisateur peut la redemander).
- **Statique** : SVG et CSS uniquement, aucune animation.
- **Le logo n'est pas modifié** : une petite étoile décorative est posée à côté.
- **Portée** : uniquement le groupe de routes `(storefront)`.
- **Bandeau** : en haut, refermable. Le message parle de la date limite de commande pour
  être livré avant Noël.

## À confirmer par l'utilisateur avant la mise en ligne

1. **La date limite de commande** affichée dans le bandeau (« commandez avant le XX
   décembre »). C'est une promesse faite aux clients, à ne pas inventer. Tant qu'elle n'est
   pas fournie, le bandeau affiche un message de vœux sans date.
2. **La fenêtre d'activation.** Par défaut (mon choix) : du **1er décembre 00:00 au 6 janvier
   23:59, heure d'Abidjan** (UTC+0, sans heure d'été).

## Laissé au constructeur

- Comment l'activation est décidée côté serveur (une fonction pure `saisonActive(date)`
  testée, puis un attribut, par exemple `data-saison="fetes"`, sur le conteneur de la
  boutique, que le CSS cible). La décision doit être prise **côté serveur, à chaque
  requête** (la boutique est `force-dynamic`), jamais d'après l'horloge du navigateur, pour
  éviter un décalage d'hydratation et un thème qui dépend de l'appareil.
- Le mécanisme d'aperçu (paramètre ou cookie réservé à l'admin, par exemple). Il ne doit
  pas pouvoir être indexé ni laisser fuiter le thème aux clients en dehors de la fenêtre.
- Le souvenir de la fermeture du bandeau (`localStorage`, protégé par try/catch). Le
  bandeau est rendu côté serveur et masqué sans saut de mise en page.
- Les tokens festifs (`--festif-or`, `--festif-rouge`, …) en oklch dans `app/globals.css`,
  avec leur variante `.dark`, scopés sous l'attribut de saison.
- Les tests : bornes de la fenêtre (veille, premier instant, dernier instant, lendemain,
  passage d'année), présence et absence de l'habillage selon la date, aperçu.
- Cibles tactiles d'au moins 44 px pour le bouton de fermeture. Décorations en
  `aria-hidden`, bandeau annoncé normalement.
