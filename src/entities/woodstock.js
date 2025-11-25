import { Entity } from './entity.js';
import { CONFIG } from '../config.js';
import { ScorePopup } from './score-popup.js';

/**
 * Woodstock collectible
 */
export class Woodstock extends Entity {
  constructor(gridX, gridY) {
    super(gridX, gridY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);

    this.type = 'woodstock';
    this.gridX = gridX;
    this.gridY = gridY;
  }

  /**
   * Update (no animation)
   */
  update(dt, input = null, levelManager = null, game = null) {
    // Woodstock is static
  }

  /**
   * Handle collision with player
   */
  onCollideWithPlayer(player, game) {
    // Player collects Woodstock - 1000 points
    game.addScore(1000);

    // Create score popup animation
    const scorePopup = new ScorePopup(this.gridX, this.gridY, 1000);
    game.entityManager.add(scorePopup);

    this.destroy();
  }

  /**
   * Render Woodstock with sprite (static)
   */
  render(renderer, spriteManager) {
    if (spriteManager && spriteManager.isLoaded()) {
      spriteManager.drawWoodstock(
        renderer,
        this.x,
        this.y,
        this.width,
        this.height
      );
    } else {
      // Fallback rendering
      renderer.drawCircle(
        this.getCenterX(),
        this.getCenterY(),
        this.width / 2,
        '#FFD700'
      );
    }
  }
}
