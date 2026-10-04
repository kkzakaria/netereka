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
       * Les trois causes trouvées, toutes de la même famille :
       *  - une valeur `…Once` NON CONSOMMÉE survit à `vi.clearAllMocks()` et
       *    est mangée par le test suivant, avant ce que son `beforeEach`
       *    vient de poser (mesuré — `clearAllMocks` n'efface ni les
       *    implémentations ni la file des `Once` ; `mockReset` fait les
       *    deux) ;
       *  - une implémentation persistante posée par un test (ici un
       *    `cookieStoreSet` qui lève) et jamais rétablie ;
       *  - un test qui suppose un état installé par un test précédent.
       *
       * Garder le tirage au sort est ce qui empêche la quatrième d'arriver
       * sans qu'on la voie. Quand un tirage rougit, Vitest imprime sa graine
       * (`--sequence.seed=<n>`) : l'échec est rejouable à l'identique.
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
