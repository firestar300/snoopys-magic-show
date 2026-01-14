import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // Base path for GitHub Pages deployment
  // Use '/' for custom domain (snoopys-magic-show.firestar300.github.io)
  // Change to '/repo-name/' if deploying to firestar300.github.io/repo-name/
  base: '/',

  build: {
    // Output directory
    outDir: 'dist',

    // Generate sourcemaps for debugging
    sourcemap: false,

    // Minify for production
    minify: 'esbuild',
  },

  // Development server options
  server: {
    port: 3000,
    open: true,
  },
});
