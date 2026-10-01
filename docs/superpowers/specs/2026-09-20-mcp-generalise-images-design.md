# Spec — Lot B : MCP généralisé, révisions validées et images générées

**Date :** 2026-09-20
**Statut :** proposé
**Précède :** [lot A — contenu libre et retrait de l'IA embarquée](./2026-09-13-contenu-libre-retrait-ia-design.md), livré en 2.0.0

## Objectif

Le lot A a rendu le contenu libre et fermé tous les chemins d'écriture vers les anciennes colonnes fermées. Le serveur MCP sait écrire du HTML libre, mais seulement sur des **brouillons** : les 989 fiches en ligne et les 4 bannières lui sont inaccessibles.

Ce lot lève cette limite, ajoute la production d'images, et donne à l'administrateur une surface conversationnelle pour dialoguer avec le modèle et valider ce qu'il propose.

## Décisions prises

1. **Une modification d'une fiche publiée passe par une révision en attente.** Le MCP n'écrit jamais directement sur une ligne en ligne : il dépose une révision que l'administrateur applique. Sur une boutique en paiement à la livraison, une description fausse se paie en refus de colis à la porte du client ; le coût d'un écran de validation est sans commune mesure.

2. **L'administration gagne une surface conversationnelle, bâtie sur TanStack AI.** L'administrateur échange avec le modèle et valide depuis la même page. **Ce n'est pas un retour de l'IA embarquée retirée au lot A** — voir § 1, qui est le cœur de ce document.

3. **Une seule règle : tout passe par une révision, et l'écran est proportionné à la conséquence.** Le MCP peut proposer une publication *et* un retrait. Ce qui distingue les deux n'est pas le droit de le proposer, mais ce que l'administrateur doit voir avant d'appliquer (§ 2.6).

   *Amendement du 2026-09-30, remplaçant « jamais une dépublication ».* L'interdiction reposait sur « un retrait passe inaperçu » — un argument formé **avant** le § 2.3, donc avant qu'on décide que la publication elle-même passe par une révision. Une fois que rien n'atteint un client sans un clic humain, « passe inaperçu » ne qualifie plus l'opération mais **l'écran**. Interdire l'opération répondait à un risque que le portail traite déjà.

   Et l'interdiction ne protégeait pas ce qu'elle prétendait : `is_active` figurait dans `PRODUCT_WRITABLE_COLUMNS` alors que `products.is_active = 0` retire une fiche de la page produit, de toutes les catégories et de la recherche. Un canal de dépublication complet, par l'interface même que la liste blanche est censée garder — inatteignable depuis les outils d'alors, mais ouvert à la phase 5, qui dépose par le même `createRevision` sans passer par les schémas Zod. Une règle avec une liste d'exceptions se corrompt ; une règle uniforme tient.

4. **La génération d'images est bornée par un quota et un budget mensuel.** `grok-imagine-image-2.0` est facturé à l'image. Le dépassement renvoie un **échec typé**, jamais un résultat vide : ce lot hérite d'une session où quatre défauts sur douze étaient des pertes silencieuses.

5. **Recherche puis génération, en mode édition** (hérité du lot A, décision 7). La recherche ancre le modèle dans le réel ; la génération compose autour de la **photo réelle du produit**, qui reste l'image source. Un visuel qui ne correspond pas à ce qui est livré coûte un colis refusé.

6. **Le vocabulaire `nk-` est enseigné, pas imposé** (hérité du lot A, § 2.3). Les écarts relevés par `checkDesignConformance` repartent dans la réponse de l'outil, pour que le modèle se corrige sans aller-retour humain.

---

## 1. Pourquoi ceci n'est pas le retour de ce que le lot A a retiré

C'est la première objection qu'un relecteur formulera, et elle mérite une réponse avant toute architecture.

Ce que le lot A a supprimé, c'est un **pipeline parallèle** : `actions/admin/products-ai.ts` et ses six modules avaient leurs propres prompts, leur propre table de configuration `ai_config`, leur propre clé Anthropic, leur propre limiteur, leur propre filtre de vision — et **leurs propres écritures en base**, qui ont continué à peupler les colonnes story après la conversion jusqu'à ce qu'on les ferme.

Ce que ce lot ajoute, c'est un **client de plus** devant la même couche d'outils. La surface conversationnelle n'a ni prompt propre, ni écriture propre, ni configuration propre : elle appelle les outils MCP, exactement comme le ferait Claude Desktop.

> **Règle d'architecture, à tenir sur toute la durée du lot :** il n'existe qu'un seul chemin d'écriture, la couche d'outils. Si la surface conversationnelle a besoin d'écrire quelque chose qu'aucun outil n'expose, c'est l'outil qui manque — on l'ajoute, et le MCP en hérite.

Le test de non-régression de cette règle est mécanique et doit être écrit : **aucun fichier sous `app/(admin)/` ou `components/admin/` n'importe le client d'un fournisseur d'IA.** Le seul appel sortant vers un modèle part de la route de chat, et le seul chemin d'écriture part de `lib/mcp/tools/`.

---

## 2. Le modèle de révision

### 2.1 Table `content_revisions`

Une révision est une proposition de modification, non appliquée.

| colonne | rôle |
| --- | --- |
| `id` | identifiant |
| `target_type` | `product` \| `banner` |
| `target_id` | la ligne visée |
| `payload` | JSON : les colonnes proposées et leurs valeurs |
| `origin` | `mcp` \| `admin_chat` — quel client l'a déposée |
| `actor_id` | l'utilisateur au nom duquel l'outil a tourné |
| `status` | `pending` \| `applied` \| `rejected` \| `superseded` |
| `summary` | une phrase, écrite par le modèle, sur ce qu'il change et pourquoi |
| `created_at`, `resolved_at`, `resolved_by` | traçabilité |

`payload` est **déjà assaini** au dépôt, avec la portée de la ligne cible (`<productId>` ou `banner-<id>`). Une révision ne doit jamais contenir du HTML qui n'a pas traversé `sanitizeDescriptionHtml` : sinon l'assainissement dépendrait du moment de l'application, et le lot A a montré ce que coûte une garantie qui dépend de l'appelant.

### 2.2 Ce qui passe par une révision, et ce qui n'y passe pas

| cas | chemin |
| --- | --- |
| modifier une fiche **publiée** | révision |
| modifier un **brouillon** | écriture directe (comportement du lot A, inchangé) |
| publier | révision de type `publish` — § 2.3 |
| retirer (dépublier, désactiver) | révision de type `withdraw` — § 2.6 |
| remettre en ligne | révision de type `reactivate` — § 2.6 bis |
| créer une ligne publiable | révision de type `create` — § 2.7 |
| créer un brouillon | écriture directe |

### 2.3 La publication passe par une révision — et pourquoi

**Décidé.** `publish_product` ne publie pas : il dépose une révision de type `publish`, que l'administrateur applique.

Sans cette règle, la barrière du § 2.1 ne protégerait rien. Le contournement serait trivial — créer un brouillon, y écrire n'importe quoi, le publier — et le contenu atteindrait la vitrine sans qu'aucun humain l'ait lu, exactement ce que la validation existe pour empêcher.

La frontière tient donc **sans exception** : rien n'atteint un client sans un clic humain. Une règle à trou ne se défend pas six mois plus tard, et c'est toujours le trou qu'on emprunte quand on est pressé.

L'administrateur qui applique une révision `publish` voit la fiche entière avant sa mise en ligne, ce qui est précisément la relecture qu'il voudrait à ce moment. Le coût réel se réduit donc à un clic au bout d'une dictée.

**Implication pour l'écran de validation (§ 2.4) :** une révision `publish` ne se compare pas à un état antérieur — il n'y en a pas. L'écran montre la fiche complète telle qu'elle paraîtra, pas un côte-à-côte.

### 2.4 L'écran de validation

Une révision se lit, pas se devine. L'écran montre, côte à côte, **le rendu actuel et le rendu proposé**, dans le conteneur de portée correct, avec le vocabulaire `nk-` chargé.

**L'écran est proportionné à la conséquence.** C'est le principe qui remplace l'ancienne liste d'interdictions (décision 3) : une modification se compare, une création se montre entière (§ 2.7), un retrait montre ce qui disparaît et demande une saisie (§ 2.6). Un même écran pour des conséquences différentes, c'est ce qui laisse un clic valoir pour tout.

Un diff textuel de HTML est illisible et le lot A l'a prouvé à ses dépens : trois défauts sur douze portaient sur de la mise en forme qu'aucune lecture de code n'aurait attrapée. C'est le rendu qu'il faut comparer, pas la source.

Une révision `publish` fait exception au côte-à-côte : il n'y a pas d'état antérieur, l'écran montre la fiche complète telle qu'elle paraîtra.

Les avertissements de `checkDesignConformance` s'affichent à côté du rendu proposé, sans bloquer l'application — cohérent avec le lot A, où le contrôle avertit sans jamais refuser.

### 2.5 Concurrence

Deux révisions en attente sur la même cible ne doivent pas s'écraser. Appliquer une révision passe les autres révisions `pending` de la même cible en `superseded`, et l'écran le dit. La ligne cible porte une version, contrôlée à l'application : si la fiche a changé depuis le dépôt, l'application échoue et l'administrateur est invité à redemander une proposition fraîche.

---

### 2.6 Retirer : le type `withdraw`

Un retrait est une révision comme une autre. Ce qui change est l'écran.

**Pourquoi un type distinct plutôt qu'un `update` portant `is_active: false`.** Un retrait noyé parmi des changements de champs se clique sans être vu. Un type propre force un écran propre — c'est la leçon du mode `child` en phase 2 : séparer structurellement plutôt que brancher dans le composant.

**L'asymétrie est réelle et doit être honorée, pas niée.** Un ajout se voit quand on le regarde ; un retrait est une absence, donc invisible par nature. Un écran affichant « `is_active` : true → false » ne fait pas relire un retrait, il le déguise en changement de champ.

L'écran d'un `withdraw` montre donc **ce qui disparaît**, mesuré et non décrit :

- la fiche ou la bannière telle qu'un client la voit **maintenant** ;
- ce qui cesse d'exister pour lui : pour un produit, sa page, sa présence dans chaque page catégorie (la sienne **et celles de ses parents**, qui listent leurs descendants) et dans la recherche ; pour une bannière, sa place dans le carrousel (rang et nombre de bannières restantes, et le basculement du hero sur les produits en vedette quand c'est la dernière) ;
- ce qui reste attaché : stock restant, commandes qui la référencent (dont celles encore en cours), listes d'envies, paniers WhatsApp, statut « en vedette » — une fiche en vedette disparaît aussi du hero ;
- **et que le retrait est réversible** : rien n'est supprimé, et la réactivation se fait d'un clic depuis la liste des produits ou des bannières. C'est ce qui le distingue d'une suppression, et ce qui le rend acceptable.

*Correction d'implémentation (2026-09-30) :* ce paragraphe disait « une réactivation est à une révision de distance ». Il n'existe pas de révision de réactivation : `publish_product` refuse une fiche déjà publiée et aucun payload n'écrit `is_active`. La réactivation était alors une action humaine directe (`toggleProductActive`, `toggleBannerActive`). **Le type `reactivate` du § 2.6 bis, décidé ensuite, rétablit la symétrie** : un retrait demandé par le MCP peut désormais être annulé par le même chemin, sous le même clic humain. C'est cohérent avec la règle (rien d'autre que l'humain ne remet en ligne sans relecture), mais ce n'est pas ce que le paragraphe affirmait.

**Les chiffres sont mesurés à l'affichage, pas stockés dans la révision** (`lib/db/withdraw-impact.ts`) : chacun vient de la table qui porte la relation — `order_items.product_id` pour les commandes (`orders` ne porte aucun id de produit), `wishlist.product_id`, `whatsapp_carts.product_id`, la chaîne `categories.parent_id`, `products.is_featured`, et pour une bannière la condition même du carrousel (`displayedBannerCondition`, partagée avec la vitrine). Un zéro s'affiche (« commandes : 0 ») ; il ne disparaît pas.

**La confirmation** est la saisie du **nom** de la cible (nom du produit, titre de la bannière), pas d'un mot fixe qui se tape par réflexe. Elle est exigée par `applyRevision` lui-même (`lib/db/revisions.ts`), et non seulement par le champ de l'écran : un appelant sans champ de saisie est refusé, pas dispensé. Un retrait ne se dépose que sur une cible **actuellement en ligne** (`createRevision` refuse un brouillon et une cible déjà retirée) et avec un payload **vide** : seul `applyRevision` écrit `is_active = 0`.

Une modification de dates qui sort une bannière du carrousel (`ends_at` passée, `starts_at` future) est un retrait de fait sous un autre nom : l'écran d'un `update` l'affiche en avertissement, et les libellés de tous les champs de bannière sont dérivés de la liste blanche, pour qu'une `ends_at` se lise « Fin d'affichage » et non `ends_at`.

**Côté produit**, `is_draft` et `is_active` sortent tous deux de `PRODUCT_WRITABLE_COLUMNS` : aucun payload ne les modifie, seul `applyRevision` les écrit pour le type qui le déclare. La garantie tient ainsi au dépôt et non chez l'appelant.

**Côté bannière, `is_active` sort lui aussi de `BANNER_WRITABLE_COLUMNS`.** Il est resté écrivable le temps que `withdraw` existe — une exception provisoire, justifiée par le fait qu'une diapositive absente se remarque au prochain chargement de l'accueil alors qu'un produit retiré ne se remarque que le jour où un client le cherche. `withdraw` existe : l'exception est refermée, `update_banner` n'expose plus `is_active`, et les deux surfaces passent par le même écran. Il ne reste aucune exception dans cette règle : activer une bannière relève de `create` (qui pose `is_active` depuis `applyRevision`), la retirer de `withdraw`, et aucun payload ne pose la colonne.

### 2.6 bis Remettre en ligne : le type `reactivate`

Symétrique de `withdraw`, **et volontairement plus léger**.

Le § 2.4 pose que l'écran est proportionné à la conséquence, et l'asymétrie joue ici dans l'autre sens : un retrait est une absence, donc invisible, et demande qu'on montre ce qui disparaît ; une remise en ligne est une **apparition**, qui se voit au premier chargement. Elle relève donc du même traitement que `create` et `publish` — l'objet entier, en une colonne, tel qu'il paraîtra.

**Pas de saisie de confirmation.** Elle existait pour le retrait parce qu'un clic distrait y coûte une absence que personne ne remarque. Une remise en ligne ratée se voit et se corrige par un `withdraw`. Exiger une saisie des deux côtés banaliserait le geste là où il compte.

Ce que l'écran doit montrer, en revanche, c'est **ce qui rend une fiche impropre à la vitrine** — parce que c'est précisément ce qu'une remise en ligne risque de laisser passer :

- l'absence d'image, sur une boutique en paiement à la livraison où l'image est ce que le client croit acheter ;
- un stock à zéro ;
- l'absence de description.

Ces constats **n'empêchent pas** d'appliquer : ce sont des avertissements, pas des refus, cohérents avec le contrôle de charte du lot A qui avertit sans jamais bloquer. Le vocabulaire ne peut pas anticiper tous les cas légitimes, et une fiche sans stock peut être remise en ligne pour préparer un réassort.

`applyRevision` écrit `is_active = 1` depuis la branche du type, jamais depuis un payload — comme `withdraw` écrit le zéro. Le payload d'une réactivation est vide, et cette forme est contrôlée au dépôt comme à l'application.

**Ce que cela débloque.** Sept fiches sont `is_draft = 0, is_active = 0` en production, sans trace d'audit ni commande, deux d'entre elles sans image (voir le constat d'exploitation du 2026-09-30). Elles n'étaient pas réactivables par une voie relue : `publish_product` refuse une fiche déjà publiée, et aucun payload n'écrit `is_active`. `reactivate` leur donne ce chemin — et son écran montre justement ce qui manquait à celles qui n'ont pas d'image.

*Précisions d'implémentation (2026-10-01) :*

- **Produits seulement.** `reactivate` ne s'applique qu'à une fiche publiée et retirée (`is_draft = 0`, `is_active = 0`), contrôlé au dépôt **et** à l'application. Une bannière se remet en ligne depuis sa liste d'administration. C'est du périmètre différé, pas une impossibilité : `getBannerWithdrawImpact` lit déjà la fenêtre d'affichage (`displayedBannerCondition`, `displayed_after`, `dateWithdrawalWarning`), un écran de remise en ligne de bannière pourrait s'en servir. Le spec n'a décidé que la fiche.
- **Le stock a deux sources, et l'avertissement lit celle du client.** La page lit `products.stock_quantity`, mais dès qu'une fiche a des variantes actives le paiement ne regarde que celui de la variante (`resolveOrderLine`). En production, `products.stock_quantity` diverge de la somme des variantes sur 42 fiches. « Stock nul » se calcule donc sur les variantes actives quand il y en a (39 fiches publiées sont dans ce cas, contre 7 si l'on ne lisait que la colonne de la fiche), et un écart entre les deux se signale à part.
- Les constats sont mesurés à l'affichage (`lib/db/reactivation-readiness.ts`) et rédigés par une fonction pure (`lib/revisions/reactivation-reading.ts`) ; l'image « principale » (`is_primary`) se signale distinctement de l'absence d'image, parce que les cartes ne lisent qu'elle.

### 2.7 Créer : le type `create`

**Rejeter une création supprime la ligne.** `create_banner` insère la ligne (inactive, vide) avant de déposer la révision, et seule l'application l'active. « Rejeter la création » doit donc vouloir dire que la bannière n'existe plus : `rejectRevision` supprime la ligne si elle est encore inactive (jamais une bannière devenue visible) et passe `superseded` les révisions sœurs en attente sur elle. Meilleur effort, journalisé : le rejet est déjà acté en base quand la suppression s'exécute.

Une création n'a pas d'état antérieur — comme une publication (§ 2.3), l'écran montre l'objet entier tel qu'il paraîtra, en une colonne.

Ce n'est pas un raffinement : rendu comme un `update`, le diff ne montre que ce qui **change**, et un objet neuf ne change rien. Le filtre d'égalité posé en phase 2 — pour supprimer le bruit `html → html` — élimine précisément les champs qu'un modèle vient d'écrire. Une bannière créée par le MCP s'y réduisait à une ligne « Active : Non → Oui », pendant que dix champs rédigés par le modèle atteignaient la page d'accueil sans qu'aucun humain les ait lus.

### 2.8 Ce que « publier » veut dire

Publier rend visible. Sur ce projet, cela demande **deux** colonnes : `is_draft = 0` **et** `is_active = 1`.

Un brouillon MCP naît `is_active = 0`. Une application qui ne lève que `is_draft` laisse donc la fiche invisible sur toutes les requêtes vitrine, pendant que l'outil annonce qu'elle « devient visible en boutique » et que l'écran la montre « telle qu'elle paraîtra ». L'administrateur applique, on lui dit que c'est fait, et rien n'apparaît.

Le défaut n'était dans aucune couche : le brouillon inactif est normal, lever `is_draft` est conforme, filtrer sur `is_active` est évident. **Il était dans leur jonction** — ce qu'aucune revue de couche ne voit.

Un `publish` écrit donc les deux, ou refuse le dépôt en disant laquelle manque.

## 3. Généralisation des outils

Les neuf outils du lot A restent, avec leur périmètre élargi. On n'ajoute pas d'outils parallèles « pour les publiés » : deux familles d'outils divergeraient en un lot.

| outil | changement |
| --- | --- |
| `get_product_draft` → `get_product` | lit un brouillon **ou** une fiche publiée |
| `update_product_draft` → `update_product` | brouillon : écrit. Publié : dépose une révision |
| `add_product_images`, `remove_product_image` | idem |
| `set_product_variants` | idem |
| `delete_product_draft` | reste borné aux brouillons |
| `search_products`, `list_categories` | inchangés |
| **`publish_product`** | nouveau — dépose une révision `publish`, ne publie pas lui-même |
| **`get_banner`, `update_banner`, `create_banner`** | nouveaux — bannières, révision systématique (toutes sont publiées) |
| **`search_product_images`** | nouveau — § 4.1 |
| **`generate_product_image`** | nouveau — § 4.2 |

La réponse d'un outil qui dépose une révision **dit qu'il a déposé une révision**, avec son identifiant et où la valider. Un outil qui laisserait croire à une écriture appliquée reproduirait la perte silencieuse que le lot A a mis trois revues à débusquer sur le champ `story`.

---

## 4. Images

### 4.1 Recherche — `search_product_images`

`lib/media/image-search.ts` existe, testé, sans appelant : le lot A l'a conservé pour ce moment. Il lit `BRAVE_SEARCH_API_KEY` — le nom du secret réellement posé en production ; cette ligne a longtemps écrit `BRAVE_API_KEY`, repris du spec du lot A, et personne ne l'avait confronté au Worker — et renvoie `{ ok: false, reason: "no_api_key" }` en cas d'absence — un échec typé, que l'outil doit propager tel quel plutôt que de le replier sur « aucune image trouvée ».

La recherche sert à **montrer au modèle à quoi ressemble réellement le produit** avant qu'il compose. Elle ne fournit pas les images finales : rien de ce qu'elle renvoie n'est téléchargé ni publié sans passer par § 4.2 ou par un ajout explicite via `add_product_images`.

### 4.2 Génération — `generate_product_image`

Moteur : `grok-imagine-image-2.0`, en **mode édition**.

| entrée | rôle |
| --- | --- |
| `product_id` | la fiche visée |
| `source_image_id` | une image **déjà attachée au produit**, dans R2 — la photo réelle |
| `prompt` | le contexte à composer autour d'elle |

La source est une image déjà présente, pas une URL arbitraire : c'est ce qui garantit que le visuel produit montre le produit livré. Le modèle compose le décor, l'éclairage, la mise en situation — il ne réinvente pas l'objet.

Le résultat traverse `lib/storage/fetch-image.ts`, qui porte la garde SSRF, le plafond de 5 Mo et le délai de 10 s, puis monte dans R2 et s'attache comme une image de produit ordinaire.

### 4.3 Quota et budget

Deux barrières, toutes deux renvoyant un échec typé et nommé :

- **Par fenêtre** — `lib/rate-limit/kv-window-limit.ts`, déjà en service pour les commandes, le rapport CSP et les promos.
- **Par mois** — un compteur persistant, clé KV portant le mois (`ai:images:2026-09`), avec un plafond configurable. Au dépassement : `{ ok: false, reason: "monthly_budget_exceeded", used, limit }`.

Le budget compte les **images générées**, pas les appels : un échec de génération ne doit pas consommer le quota d'une image que personne n'a reçue.

---

## 5. La surface conversationnelle

### 5.1 Où elle vit

Une route `app/api/admin/chat/route.ts`, en `runtime = "edge"`, derrière `requireAdmin()`. TanStack AI expose `chat()` et `toServerSentEventsResponse()` et fonctionne en App Router ; un adaptateur Cloudflare existe si l'on veut passer par Workers AI plus tard.

Côté écran, une page d'administration où l'administrateur décrit ce qu'il veut, voit les outils s'exécuter, et retrouve les révisions déposées avec leur lien de validation.

### 5.2 Ce qu'elle n'a pas le droit d'avoir

- **Pas d'écriture propre.** Elle appelle les outils, point.
- **Pas de table de configuration.** La clé du fournisseur est un secret d'environnement, pas une ligne en base. `ai_config` est condamnée par la migration *contract* et ne doit pas ressusciter.
- **Pas de prompt système qui duplique les règles de rédaction.** `DESCRIPTION_RULES` est déjà exposé par la description des outils MCP ; la surface conversationnelle hérite des mêmes descriptions, sinon les deux clients divergent.

### 5.3 Ce que ça coûte

Un fournisseur d'IA de plus à financer, et une clé à gérer. À poser lucidement : si l'administrateur travaille déjà depuis Claude Desktop connecté au MCP, cette surface est un confort, pas une nécessité. Elle se justifie si l'on veut que la validation et la conversation vivent au même endroit — ce qui est l'argument retenu — mais elle peut se livrer **après** le reste du lot sans rien bloquer.

---

## 6. Sécurité

Le lot A a livré l'essentiel ; ce lot ne doit rien défaire.

- **Assainissement à l'écriture et à la lecture**, avec la portée de la ligne. Les quatre écrivains actuels le font ; les révisions deviennent le cinquième et doivent le faire au **dépôt**.
- **La garde SSRF** de `fetch-image.ts` couvre les formes numériques et IPv6 depuis 2.0.0. La génération d'images ne doit pas ouvrir un second chemin de téléchargement qui la contourne.
- **Le MCP reste borné par `requireAdmin()`** et relit l'utilisateur en base à chaque requête (`lib/mcp/context.ts`).
- **Le consentement OAuth forcé** (`lib/auth/mcp-consent-hook.ts`) reste en place. L'enregistrement dynamique des clients est ouvert : c'est ce qui rend le contrat MCP public, et c'est pourquoi 2.0.0 a porté un `BREAKING CHANGE`.
- **Chaque révision et chaque application sont journalisées** dans `audit_log`, avec `details.via`, dans le même `db.batch()` que la mutation.

---

## 7. Hors périmètre

- **La migration *contract*** — suppression des colonnes story, de `ai_config`, de `icons.ts`, des variables d'environnement inertes. Elle appartient à son propre lot, pour ne pas mêler une migration destructive à une livraison de fonctionnalités.
- **La modération de questions clients** — l'onglet « Questions » écarté au lot A le reste.
- **La traduction ou le multilingue.**
- **La génération de fiches entières sans intervention** — ce lot donne les outils ; l'enchaînement reste au modèle et à l'administrateur.

---

## 8. Séquencement proposé

1. **Le modèle de révision** — table, dépôt, application, écran de validation. Rien d'autre n'a de sens avant.
2. **La généralisation des outils** — les neuf existants passent aux publiés, `publish_product` arrive.
3. **Les bannières** — trois outils, révision systématique.
4. **Les images** — recherche, puis génération, puis quota et budget.
5. **La surface conversationnelle** — en dernier, parce qu'elle ne débloque rien.

Chaque étape est livrable et vérifiable seule. La première apporte déjà une valeur réelle : un administrateur peut faire relire ses fiches publiées par un modèle depuis Claude Desktop, et appliquer ce qui lui convient.

---

## 9. Questions ouvertes

- **Le plafond mensuel d'images** n'a pas de valeur. Elle dépend du budget xAI réel, que je n'ai pas.
- **La surface conversationnelle peut être abandonnée** si l'usage depuis Claude Desktop suffit. Le reste du lot tient sans elle.
