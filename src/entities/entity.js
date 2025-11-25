import { CONFIG } from '../config.js';

/**
 * Base entity class
 */
export class Entity {
  constructor(x, y, width = CONFIG.TILE_SIZE, height = CONFIG.TILE_SIZE) {
    this.x = x * CONFIG.TILE_SIZE;
    this.y = y * CONFIG.TILE_SIZE;
    this.width = width;
    this.height = height;

    this.type = 'entity';
    this.isDead = false;
  }

  /**
   * Get grid position
   */
  getGridX() {
    return Math.floor(this.x / CONFIG.TILE_SIZE);
  }

  getGridY() {
    return Math.floor(this.y / CONFIG.TILE_SIZE);
  }

  /**
   * Get center position
   */
  getCenterX() {
    return this.x + this.width / 2;
  }

  getCenterY() {
    return this.y + this.height / 2;
  }

  /**
   * Update entity (to be overridden)
   */
  update(dt, input, levelManager) {
    // Override in subclasses
  }

  /**
   * Render entity (to be overridden)
   */
  render(renderer) {
    // Override in subclasses
  }

  /**
   * Handle collision with player (to be overridden)
   */
  onCollideWithPlayer(player, game) {
    // Override in subclasses
  }

  /**
   * Mark entity for removal
   */
  destroy() {
    this.isDead = true;
  }
}
