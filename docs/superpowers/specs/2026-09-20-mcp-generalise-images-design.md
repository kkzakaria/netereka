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

3. **Le MCP peut publier, jamais dépublier.** Une mise en ligne ratée est visible et se corrige ; un retrait passe inaperçu jusqu'à ce qu'un client cherche un produit disparu.

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
| publier | révision — voir § 2.3 |
| dépublier | **interdit au MCP** |
| créer un brouillon | écriture directe |

### 2.3 Une contradiction à trancher

Les décisions 1 et 3 se contredisent si on les applique littéralement.

Si une modification d'une fiche publiée demande une validation, mais qu'une publication n'en demande pas, alors le contournement est trivial : créer un brouillon, y écrire n'importe quoi, le publier. La barrière ne protège plus rien.

**Ma lecture, à renverser si elle ne correspond pas à l'intention :** `publish_product` dépose lui aussi une révision, de type `publish`. L'administrateur qui l'applique voit la fiche entière avant sa mise en ligne — ce qui est précisément la relecture qu'il voudrait. Le MCP garde donc le pouvoir de *proposer* une publication, et la frontière « rien n'atteint un client sans un clic humain » reste vraie sans exception.

Le coût de ce choix : dicter une fiche de bout en bout demande un clic à la fin. Le bénéfice : la règle n'a pas de trou, et une règle à trou ne se défend pas six mois plus tard.

### 2.4 L'écran de validation

Une révision se lit, pas se devine. L'écran montre, côte à côte, **le rendu actuel et le rendu proposé**, dans le conteneur de portée correct, avec le vocabulaire `nk-` chargé.

Un diff textuel de HTML est illisible et le lot A l'a prouvé à ses dépens : trois défauts sur douze portaient sur de la mise en forme qu'aucune lecture de code n'aurait attrapée. C'est le rendu qu'il faut comparer, pas la source.

Les avertissements de `checkDesignConformance` s'affichent à côté du rendu proposé, sans bloquer l'application — cohérent avec le lot A, où le contrôle avertit sans jamais refuser.

### 2.5 Concurrence

Deux révisions en attente sur la même cible ne doivent pas s'écraser. Appliquer une révision passe les autres révisions `pending` de la même cible en `superseded`, et l'écran le dit. La ligne cible porte une version, contrôlée à l'application : si la fiche a changé depuis le dépôt, l'application échoue et l'administrateur est invité à redemander une proposition fraîche.

---

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
| **`publish_product`** | nouveau — dépose une révision de type `publish` |
| **`get_banner`, `update_banner`, `create_banner`** | nouveaux — bannières, révision systématique (toutes sont publiées) |
| **`search_product_images`** | nouveau — § 4.1 |
| **`generate_product_image`** | nouveau — § 4.2 |

La réponse d'un outil qui dépose une révision **dit qu'il a déposé une révision**, avec son identifiant et où la valider. Un outil qui laisserait croire à une écriture appliquée reproduirait la perte silencieuse que le lot A a mis trois revues à débusquer sur le champ `story`.

---

## 4. Images

### 4.1 Recherche — `search_product_images`

`lib/media/image-search.ts` existe, testé, sans appelant : le lot A l'a conservé pour ce moment. Il lit `BRAVE_API_KEY` et renvoie `{ ok: false, reason: "no_api_key" }` en cas d'absence — un échec typé, que l'outil doit propager tel quel plutôt que de le replier sur « aucune image trouvée ».

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

- **La contradiction du § 2.3** est tranchée par ma lecture, pas par une décision explicite. À confirmer ou renverser avant l'implémentation.
- **Le plafond mensuel d'images** n'a pas de valeur. Elle dépend du budget xAI réel, que je n'ai pas.
- **La surface conversationnelle peut être abandonnée** si l'usage depuis Claude Desktop suffit. Le reste du lot tient sans elle.
