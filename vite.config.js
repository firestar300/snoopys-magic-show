import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // Base path for GitHub Pages deployment
  // For project pages: /repo-name/
  base: '/snoopys-magic-show/',

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
