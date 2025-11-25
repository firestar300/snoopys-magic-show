/**
 * Enum for tile types in the game
 */
export const TileType = {
  EMPTY: 0,
  WALL: 1,
  PUSHABLE: 2, // Deprecated - use directional pushable instead
  BREAKABLE: 3,
  TELEPORT_A: 4,
  TELEPORT_B: 5,
  ARROW_UP: 6,
  ARROW_RIGHT: 7,
  ARROW_DOWN: 8,
  ARROW_LEFT: 9,
  BROKEN: 10, // État cassé du bloc
  PUSHABLE_UP: 11,
  PUSHABLE_DOWN: 12,
  PUSHABLE_LEFT: 13,
  PUSHABLE_RIGHT: 14,
  TOGGLE_BLOCK: 15, // Bloc qui alterne entre traversable et non-traversable
};
