import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    sequence: {
      /**
       * L'ORDRE EST TIRÉ AU SORT, À CHAQUE EXÉCUTION.
       *
       * La suite était verte dans son ordre habituel, et cet ordre cachait
       * six tests qui en dépendaient : ils passaient grâce à l'état laissé
       * par un autre. Un test qui passe pour cette raison ne prouve rien —
       * le jour où le code régresse, rien ne garantit qu'il rougira.
       *
       * CE QUI EST REMIS À ZÉRO ENTRE DEUX TESTS, ET CE QUI NE L'EST PAS.
       * Mesuré sur cette version de Vitest : l'HISTORIQUE DES APPELS d'un
       * mock est effacé automatiquement (un `m.mock.calls` repart à zéro
       * sans qu'aucun hook ne le demande). Ne le sont PAS : l'implémentation
       * posée par `mockImplementation` / `mockResolvedValue` / `mockRejectedValue`,
       * et la file des valeurs `…Once` non consommées. `vi.clearAllMocks()`
       * n'y change rien non plus — seul `mockReset()` efface les deux.
       *
       * De là, trois causes distinctes, une par fichier corrigé, et une
       * seule famille : un état hors du test que personne ne remet à zéro.
       *  - `admin-orders` : une valeur `…Once` non consommée, mangée par le
       *    test suivant avant ce que son `beforeEach` vient de poser ;
       *  - `account` : une implémentation persistante (un `cookieStoreSet`
       *    qui lève) jamais rétablie ;
       *  - `local-jwks` : un état global hors mock — le drapeau
       *    `Symbol.for(...)` posé sur `globalThis` par la première pose.
       *
       * Garder le tirage au sort est ce qui empêche la QUATRIÈME CAUSE
       * d'arriver sans qu'on la voie. Quand un tirage rougit, Vitest imprime
       * sa graine : l'échec se rejoue à l'identique avec
       * `--sequence.seed=<n>`. Un rouge intermittent se REJOUE, il ne se
       * relance pas — et la CI ne doit jamais acquérir de `retry`, qui
       * transformerait ce signal en bruit.
       */
      shuffle: true,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
