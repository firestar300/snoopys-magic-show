/**
 * Get the correct asset path with Vite's base URL
 * This ensures assets work correctly on GitHub Pages
 *
 * @param {string} path - The asset path (e.g., '/sprites/ball.png')
 * @returns {string} The full path with base URL
 */
export const getAssetPath = (path) => {
  const base = import.meta.env.BASE_URL;
  // Remove leading slash from path if base already ends with one
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${cleanPath}`;
};
