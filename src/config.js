/**
 * Game configuration constants
 */
export const CONFIG = {
  // Grid dimensions
  GRID_WIDTH: 9,
  GRID_HEIGHT: 8,
  TILE_SIZE: 32,

  // Timer border
  TIMER_BORDER: 16,

  // Canvas dimensions (based on grid + timer border)
  get CANVAS_WIDTH() {
    return this.GRID_WIDTH * this.TILE_SIZE + (this.TIMER_BORDER * 2);
  },
  get CANVAS_HEIGHT() {
    return this.GRID_HEIGHT * this.TILE_SIZE + (this.TIMER_BORDER * 2);
  },

  // Game area dimensions (without timer border)
  get GAME_AREA_WIDTH() {
    return this.GRID_WIDTH * this.TILE_SIZE;
  },
  get GAME_AREA_HEIGHT() {
    return this.GRID_HEIGHT * this.TILE_SIZE;
  },

  // Game Boy color palette
  COLORS: {
    DARK: '#0f380f',
    MID_DARK: '#306230',
    MID_LIGHT: '#8bac0f',
    LIGHT: '#9bbc0f',
  },

  // Developer mode
  DEV_MODE: true,

  // Game settings
  FPS: 60,
  PLAYER_SPEED: 3,
  BALL_SPEED: 2,
  BALL_SIZE: 8, // Ball collision size (8x8 pixels)
  BALL_DISPLAY_SIZE: 16, // Ball display size (16x16 pixels)
  BALL_ANGLE_RANDOMNESS: Math.PI / 8, // random variation on bounce angle

  // Input KEYS
  KEYS: {
    UP: ['ArrowUp', 'w', 'W'],
    DOWN: ['ArrowDown', 's', 'S'],
    LEFT: ['ArrowLeft', 'a', 'A'],
    RIGHT: ['ArrowRight', 'd', 'D'],
    ACTION: [' ', 'Enter'],
    RESTART: ['r', 'R'],
  },
};
