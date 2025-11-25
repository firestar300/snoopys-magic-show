import { Entity } from './entity.js';
import { CONFIG } from '../config.js';

/**
 * Score popup animation (e.g., "1000pts" when collecting Woodstock)
 */
export class ScorePopup extends Entity {
  constructor(gridX, gridY, points = 1000) {
    super(gridX, gridY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);

    this.type = 'score-popup';
    this.points = points;

    // Animation properties
    this.startY = this.y;
    this.moveDistance = CONFIG.TILE_SIZE * 1.5; // 1.5 tiles
    this.moveSpeed = 60; // pixels per second
    this.duration = this.moveDistance / this.moveSpeed; // time to complete animation
    this.timer = 0;
  }

  /**
   * Update animation
   */
  update(dt) {
    this.timer += dt;

    // Move up
    this.y = this.startY - (this.moveSpeed * this.timer);

    // Destroy when animation is complete
    if (this.timer >= this.duration) {
      this.destroy();
    }
  }

  /**
   * Render score popup
   */
  render(renderer, spriteManager) {
    if (spriteManager && spriteManager.isLoaded()) {
      spriteManager.drawScorePopup(
        renderer,
        this.x,
        this.y,
        this.width,
        this.height
      );
    }
  }
}
