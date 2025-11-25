import { Entity } from './entity.js';
import { CONFIG } from '../config.js';

/**
 * Ball particle for explosion animation
 * Created when ball is destroyed by invincible player
 */
export class BallParticle extends Entity {
  constructor(x, y, vx, vy) {
    super(0, 0, CONFIG.BALL_DISPLAY_SIZE, CONFIG.BALL_DISPLAY_SIZE);

    // Use pixel coordinates directly (not grid)
    this.x = x;
    this.y = y;

    this.type = 'ball-particle';
    this.vx = vx;
    this.vy = vy;

    // Lifetime
    this.lifetime = 0.5; // 0.5 seconds
  }

  /**
   * Update particle movement
   */
  update(dt, input = null, levelManager = null, game = null) {
    // Move the particle (4x faster)
    this.x += this.vx * dt * 240; // Scale by 240 for frame-independent movement (4x speed)
    this.y += this.vy * dt * 240;

    // Update lifetime
    this.lifetime -= dt;

    // Destroy when lifetime is over
    if (this.lifetime <= 0) {
      this.destroy();
    }
  }

  /**
   * Render the particle with sprite
   */
  render(renderer, spriteManager) {
    if (spriteManager && spriteManager.isLoaded()) {
      spriteManager.drawBallParticle(
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
        CONFIG.COLORS.DARK
      );
    }
  }
}
