import { defineConfig } from 'vite';

// __BUILD__ : identifiant unique de chaque publication, ajouté aux adresses des fichiers
// du jeu (?v=…). Les fichiers peuvent ainsi rester en cache très longtemps dans le navigateur,
// et une nouvelle version force quand même leur mise à jour.
export default defineConfig({
  define: { __BUILD__: JSON.stringify(Date.now().toString(36)) },
});
