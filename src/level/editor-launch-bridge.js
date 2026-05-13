/**
 * Reads world JSON queued by snoopy-level-editor "Play now" (same-origin localStorage).
 * Key must stay in sync with editor `src/play-in-game-bridge.js` (`PLAY_WORLD_STORAGE_KEY`).
 */
export const PLAY_WORLD_STORAGE_KEY = 'snoopy-level-editor-play-world-v1';

/**
 * @returns {string | null} Raw JSON then clears storage
 */
export const takeQueuedWorldJsonString = () => {
  try {
    const raw = localStorage.getItem(PLAY_WORLD_STORAGE_KEY);
    if (!raw) return null;
    localStorage.removeItem(PLAY_WORLD_STORAGE_KEY);
    return raw;
  } catch {
    return null;
  }
};
