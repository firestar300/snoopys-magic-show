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
    this.revealDuration = 1; // Duration of movement animation (2x slower)
    this.startX = this.x;
    this.startY = this.y;
    this.targetX = this.x;
    this.targetY = this.y;

    // Blink animation (active during reveal and normal state)
    this.blinkTimer = 0;
    this.blinkSpeed = 0.05; // Speed of blinking (seconds) - faster blink
    this.isVisible = true;

    // Speed power-up animation (alternate between L1C3 and L1C4)
    this.speedAnimTimer = 0;
    this.speedAnimSpeed = 0.1; // Alternate every 0.5 seconds (slower transition)
    this.speedFrame = 0; // 0 or 1

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

    // Update blink timer (only for non-speed power-ups)
    if (this.powerType !== 'speed') {
      this.blinkTimer += dt;

      // Toggle visibility every blinkSpeed seconds
      if (this.blinkTimer >= this.blinkSpeed) {
        this.isVisible = !this.isVisible;
        this.blinkTimer = 0;
      }
    } else {
      // Speed power-up is always visible (no blink effect)
      this.isVisible = true;
    }

    // Update speed power-up animation
    if (this.powerType === 'speed') {
      this.speedAnimTimer += dt;
      if (this.speedAnimTimer >= this.speedAnimSpeed) {
        this.speedFrame = (this.speedFrame + 1) % 2;
        this.speedAnimTimer = 0;
      }
    }

    // Handle reveal animation (movement)
    if (this.isRevealing) {
      this.revealTimer += dt;
      const progress = Math.min(this.revealTimer / this.revealDuration, 1);

      // Linear movement (no easing)
      this.x = this.startX + (this.targetX - this.startX) * progress;
      this.y = this.startY + (this.targetY - this.startY) * progress;

      // End reveal animation
      if (progress >= 1) {
        this.isRevealing = false;
        this.x = this.targetX;
        this.y = this.targetY;
      }
    }
  }

  /**
   * Reveal the power-up from a block (moves 3 tiles in Snoopy's direction)
   */
  reveal(blockGridX, blockGridY, snoopyDirection) {
    if (!this.hidden) return;

    // Direction mapping
    const directionMap = {
      'up': { dx: 0, dy: -1 },
      'down': { dx: 0, dy: 1 },
      'left': { dx: -1, dy: 0 },
      'right': { dx: 1, dy: 0 },
    };

    const dir = directionMap[snoopyDirection] || { dx: 1, dy: 0 };

    // Calculate target position: 3 tiles in Snoopy's direction
    let targetGridX = blockGridX + (dir.dx * 3);
    let targetGridY = blockGridY + (dir.dy * 3);

    // Clamp to grid bounds
    targetGridX = Math.max(0, Math.min(targetGridX, CONFIG.GRID_WIDTH - 1));
    targetGridY = Math.max(0, Math.min(targetGridY, CONFIG.GRID_HEIGHT - 1));

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

    // Apply power-up effect (no score points for power-ups)
    player.applyPowerUp(this.powerType, game);
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
        this.height,
        this.speedFrame
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
