import { Entity } from './entity.js';
import { CONFIG } from '../config.js';

/**
 * Power-up collectible
 */
export class PowerUp extends Entity {
  constructor(gridX, gridY, powerType = 'speed', hidden = false) {
    super(gridX, gridY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);

    this.type = 'powerup';
    this.powerType = powerType; // 'speed', 'invincible', or 'time'

    // Hidden state (power-up inside a block)
    this.hidden = hidden;
    this.isRevealing = false;
    this.revealTimer = 0;
    this.revealDuration = 0.33; // Duration of movement animation (33% faster)
    this.startX = this.x;
    this.startY = this.y;
    this.targetX = this.x;
    this.targetY = this.y;

    // Blink animation (active during reveal and normal state)
    this.blinkTimer = 0;
    this.blinkSpeed = 0.05; // Speed of blinking (seconds) - faster blink
    this.isVisible = true;

    // Lifetime timer (disappears after 10 seconds)
    this.lifetimeTimer = 0;
    this.lifetimeDuration = 10; // 10 seconds before disappearing
    this.isLifetimeActive = !hidden; // Start timer only if not hidden
  }

  /**
   * Update animation
   */
  update(dt, input = null, levelManager = null, game = null) {
    // Don't update if hidden
    if (this.hidden) {
      return;
    }

    // Update lifetime timer
    if (this.isLifetimeActive) {
      this.lifetimeTimer += dt;

      // Disappear after 10 seconds
      if (this.lifetimeTimer >= this.lifetimeDuration) {
        this.destroy();
        return;
      }
    }

    // Update blink timer (always active when not hidden)
    this.blinkTimer += dt;

    // Toggle visibility every blinkSpeed seconds
    if (this.blinkTimer >= this.blinkSpeed) {
      this.isVisible = !this.isVisible;
      this.blinkTimer = 0;
    }

    // Handle reveal animation (movement)
    if (this.isRevealing) {
      this.revealTimer += dt;
      const progress = Math.min(this.revealTimer / this.revealDuration, 1);

      // Smooth easing
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      // Interpolate position
      this.x = this.startX + (this.targetX - this.startX) * eased;
      this.y = this.startY + (this.targetY - this.startY) * eased;

      // End reveal animation
      if (progress >= 1) {
        this.isRevealing = false;
        this.x = this.targetX;
        this.y = this.targetY;
      }
    }
  }

  /**
   * Reveal the power-up from a block (horizontal or vertical movement)
   */
  reveal(blockGridX, blockGridY, levelManager) {
    if (!this.hidden) return;

    // Directions: up, down, left, right (horizontal and vertical only)
    const directions = [
      { dx: 0, dy: -1, name: 'up' },
      { dx: 0, dy: 1, name: 'down' },
      { dx: -1, dy: 0, name: 'left' },
      { dx: 1, dy: 0, name: 'right' },
    ];

    // Find first valid position in any direction (check up to 3 tiles away)
    let targetGridX = blockGridX;
    let targetGridY = blockGridY;
    let found = false;

    for (const dir of directions) {
      for (let distance = 1; distance <= 3; distance++) {
        const newGridX = blockGridX + (dir.dx * distance);
        const newGridY = blockGridY + (dir.dy * distance);

        // Check if position is valid (not solid and in bounds)
        if (!levelManager.isSolid(newGridX, newGridY) &&
            levelManager.isInBounds(newGridX, newGridY)) {
          targetGridX = newGridX;
          targetGridY = newGridY;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    // Set up reveal animation
    this.hidden = false;
    this.isRevealing = true;
    this.revealTimer = 0;
    this.startX = blockGridX * CONFIG.TILE_SIZE;
    this.startY = blockGridY * CONFIG.TILE_SIZE;
    this.targetX = targetGridX * CONFIG.TILE_SIZE;
    this.targetY = targetGridY * CONFIG.TILE_SIZE;
    this.x = this.startX;
    this.y = this.startY;

    // Start lifetime timer
    this.isLifetimeActive = true;
    this.lifetimeTimer = 0;
  }

  /**
   * Handle collision with player
   */
  onCollideWithPlayer(player, game) {
    // Can't be collected during reveal animation
    if (this.isRevealing) {
      return;
    }

    player.applyPowerUp(this.powerType, game);
    game.addScore(200);
    this.destroy();
  }

  /**
   * Render power-up with sprite and blink effect
   */
  render(renderer, spriteManager) {
    // Don't render if hidden
    if (this.hidden) {
      return;
    }

    // Don't render if in blink-off state
    if (!this.isVisible) {
      return;
    }

    if (spriteManager && spriteManager.isLoaded()) {
      spriteManager.drawPowerUp(
        renderer,
        this.powerType,
        this.x,
        this.y,
        this.width,
        this.height
      );
    } else {
      // Fallback rendering
      const ctx = renderer.ctx;
      const centerX = this.getCenterX();
      const centerY = this.getCenterY();

      ctx.save();
      ctx.translate(centerX, centerY);

      if (this.powerType === 'speed') {
        ctx.fillStyle = '#00FF00';
      } else if (this.powerType === 'invincible') {
        ctx.fillStyle = '#FFFF00';
      } else {
        ctx.fillStyle = '#00FFFF';
      }

      ctx.fillRect(-6, -6, 12, 12);
      ctx.restore();
    }
  }
}
