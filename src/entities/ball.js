import { Entity } from './entity.js';
import { CONFIG } from '../config.js';
import { BallParticle } from './ball-particle.js';
import { TileType } from '../tiles/tile-types.js';

/**
 * Bouncing ball enemy
 * Sprite: L1C1, 8x8 pixels
 */
export class Ball extends Entity {
  constructor(gridX, gridY, vx = 1, vy = 1) {
    super(gridX, gridY, CONFIG.BALL_SIZE, CONFIG.BALL_SIZE);

    // Center the ball in the tile (8px ball in 32px tile)
    const offset = (CONFIG.TILE_SIZE - CONFIG.BALL_SIZE) / 2;
    this.x += offset;
    this.y += offset;

    this.type = 'ball';
    this.vx = vx * CONFIG.BALL_SPEED;
    this.vy = vy * CONFIG.BALL_SPEED;
    this.frozen = false; // For time power-up

    // Store constant speed for angle-based bouncing
    this.speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

    // Static sprite (no animation)
    this.frame = 0;

    // Teleportation animation
    this.isTeleporting = false;
    this.teleportTimer = 0;
    this.teleportDuration = 0.8; // 800ms animation (same as player)
    this.teleportDestination = null;
    this.teleportPhase = 0; // 0 = disappearing at source, 1 = appearing at destination
    this.teleportCooldown = 0; // Cooldown to prevent immediate re-teleportation
    this.teleportCooldownDuration = 1.0; // 1 second cooldown after teleport
  }

  /**
   * Calculate bounce angle based on impact position
   * @param {number} ballCenter - Center position of ball on collision axis
   * @param {number} blockCenter - Center position of block on collision axis
   * @param {number} blockSize - Size of the block (tile size)
   * @param {boolean} isHorizontal - True for horizontal collision, false for vertical
   * @returns {object} - New velocity { vx, vy }
   */
  calculateBounceAngle(ballCenter, blockCenter, blockSize, isHorizontal) {
    // Calculate offset from center (-1 to 1, where 0 is center)
    const offset = (ballCenter - blockCenter) / (blockSize / 2);
    const clampedOffset = Math.max(-0.9, Math.min(0.9, offset)); // Limit to avoid extreme angles

    // Current angle
    let angle = Math.atan2(this.vy, this.vx);

    if (isHorizontal) {
      // Horizontal collision: reflect vx and modify vy based on offset
      angle = Math.PI - angle; // Reflect horizontally
      angle += clampedOffset * (Math.PI / 6); // Add up to 30° variation
    } else {
      // Vertical collision: reflect vy and modify vx based on offset
      angle = -angle; // Reflect vertically
      angle += clampedOffset * (Math.PI / 6); // Add up to 30° variation
    }

    // Prevent too-flat angles (avoid infinite horizontal/vertical bouncing)
    // Min angle from horizontal/vertical
    const minAngleFromHorizontal = Math.PI / 4; // 45° from 0°/180°
    const minAngleFromVertical = Math.PI / 4;   // 45° from 90°/270°

    // Normalize angle to 0-2π range
    let normalizedAngle = angle;
    while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
    while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;

    // Define forbidden zones and clamp accordingly
    const halfPi = Math.PI / 2;

    // Quadrant 1 (0° to 90°): Top-right
    if (normalizedAngle >= 0 && normalizedAngle < halfPi) {
      if (normalizedAngle < minAngleFromHorizontal) {
        // Too horizontal (close to 0°), push to 30°
        normalizedAngle = minAngleFromHorizontal;
      } else if (normalizedAngle > halfPi - minAngleFromVertical) {
        // Too vertical (close to 90°), push to 60°
        normalizedAngle = halfPi - minAngleFromVertical;
      }
    }
    // Quadrant 2 (90° to 180°): Top-left
    else if (normalizedAngle >= halfPi && normalizedAngle < Math.PI) {
      if (normalizedAngle < halfPi + minAngleFromVertical) {
        // Too vertical (close to 90°), push to 120°
        normalizedAngle = halfPi + minAngleFromVertical;
      } else if (normalizedAngle > Math.PI - minAngleFromHorizontal) {
        // Too horizontal (close to 180°), push to 150°
        normalizedAngle = Math.PI - minAngleFromHorizontal;
      }
    }
    // Quadrant 3 (180° to 270°): Bottom-left
    else if (normalizedAngle >= Math.PI && normalizedAngle < Math.PI + halfPi) {
      if (normalizedAngle < Math.PI + minAngleFromHorizontal) {
        // Too horizontal (close to 180°), push to 210°
        normalizedAngle = Math.PI + minAngleFromHorizontal;
      } else if (normalizedAngle > Math.PI + halfPi - minAngleFromVertical) {
        // Too vertical (close to 270°), push to 240°
        normalizedAngle = Math.PI + halfPi - minAngleFromVertical;
      }
    }
    // Quadrant 4 (270° to 360°): Bottom-right
    else {
      if (normalizedAngle < Math.PI + halfPi + minAngleFromVertical) {
        // Too vertical (close to 270°), push to 300°
        normalizedAngle = Math.PI + halfPi + minAngleFromVertical;
      } else if (normalizedAngle > Math.PI * 2 - minAngleFromHorizontal) {
        // Too horizontal (close to 360°/0°), push to 330°
        normalizedAngle = Math.PI * 2 - minAngleFromHorizontal;
      }
    }

    angle = normalizedAngle;

    // Add random variation to make trajectories less predictable
    // Random value between -BALL_ANGLE_RANDOMNESS and +BALL_ANGLE_RANDOMNESS
    const randomVariation = (Math.random() - 0.5) * 2 * CONFIG.BALL_ANGLE_RANDOMNESS;
    angle += randomVariation;

    // Calculate new velocity maintaining constant speed
    return {
      vx: Math.cos(angle) * this.speed,
      vy: Math.sin(angle) * this.speed
    };
  }

  /**
   * Update ball movement with bouncing
   */
  update(dt, input, levelManager, game = null) {
    // Update teleport cooldown
    if (this.teleportCooldown > 0) {
      this.teleportCooldown -= dt;
      if (this.teleportCooldown < 0) {
        this.teleportCooldown = 0;
      }
    }

    // Update teleportation animation
    if (this.isTeleporting) {
      this.teleportTimer += dt;
      const halfDuration = this.teleportDuration / 2;

      // At 50% of animation, teleport to destination and start appearing phase
      if (this.teleportPhase === 0 && this.teleportTimer >= halfDuration) {
        if (this.teleportDestination) {
          // Center the ball in the destination tile
          const offset = (CONFIG.TILE_SIZE - CONFIG.BALL_SIZE) / 2;
          this.x = this.teleportDestination.x * CONFIG.TILE_SIZE + offset;
          this.y = this.teleportDestination.y * CONFIG.TILE_SIZE + offset;
        }
        this.teleportPhase = 1; // Switch to appearing phase
      }

      // At 100% of animation, complete teleportation
      if (this.teleportTimer >= this.teleportDuration) {
        // Reset teleport state
        this.isTeleporting = false;
        this.teleportTimer = 0;
        this.teleportDestination = null;
        this.teleportPhase = 0;

        // Start cooldown to prevent immediate re-teleportation
        this.teleportCooldown = this.teleportCooldownDuration;
      }

      // Block all other updates during teleportation
      return;
    }

    // Don't move if frozen
    if (this.frozen) return;

    // Store old position
    const oldX = this.x;
    const oldY = this.y;

    // Move the ball
    this.x += this.vx;
    this.y += this.vy;

    // Get current grid position
    const gridX = this.getGridX();
    const gridY = this.getGridY();

    // Check horizontal collision using ball edges
    const ballLeft = this.x;
    const ballRight = this.x + this.width;
    const ballCenterY = this.y + this.height / 2;

    let horizontalCollision = false;

    if (this.vx > 0) {
      // Check canvas right boundary
      if (ballRight >= CONFIG.GAME_AREA_WIDTH) {
        this.x = CONFIG.GAME_AREA_WIDTH - this.width;
        // Simple reflection at boundary
        this.vx = -Math.abs(this.vx);
        horizontalCollision = true;
      } else {
        // Moving right - check right edge
        const nextGridX = Math.floor(ballRight / CONFIG.TILE_SIZE);
        const checkGridY = Math.floor(ballCenterY / CONFIG.TILE_SIZE);
        if (levelManager.isSolid(nextGridX, checkGridY) || levelManager.isBlockedByAnimatingBlock(nextGridX, checkGridY)) {
          // Snap to left edge of the wall
          this.x = nextGridX * CONFIG.TILE_SIZE - this.width - 1;

          // Calculate bounce angle based on impact position
          const ballCenterYPos = this.y + this.height / 2;
          const blockCenterY = (checkGridY * CONFIG.TILE_SIZE) + (CONFIG.TILE_SIZE / 2);
          const newVelocity = this.calculateBounceAngle(ballCenterYPos, blockCenterY, CONFIG.TILE_SIZE, true);
          this.vx = newVelocity.vx;
          this.vy = newVelocity.vy;
          horizontalCollision = true;
        }
      }
    } else if (this.vx < 0) {
      // Check canvas left boundary
      if (ballLeft <= 0) {
        this.x = 0;
        // Simple reflection at boundary
        this.vx = Math.abs(this.vx);
        horizontalCollision = true;
      } else {
        // Moving left - check left edge
        const nextGridX = Math.floor(ballLeft / CONFIG.TILE_SIZE);
        const checkGridY = Math.floor(ballCenterY / CONFIG.TILE_SIZE);
        if (levelManager.isSolid(nextGridX, checkGridY) || levelManager.isBlockedByAnimatingBlock(nextGridX, checkGridY)) {
          // Snap to right edge of the wall
          this.x = (nextGridX + 1) * CONFIG.TILE_SIZE + 1;

          // Calculate bounce angle based on impact position
          const ballCenterYPos = this.y + this.height / 2;
          const blockCenterY = (checkGridY * CONFIG.TILE_SIZE) + (CONFIG.TILE_SIZE / 2);
          const newVelocity = this.calculateBounceAngle(ballCenterYPos, blockCenterY, CONFIG.TILE_SIZE, true);
          this.vx = newVelocity.vx;
          this.vy = newVelocity.vy;
          horizontalCollision = true;
        }
      }
    }

    // Check vertical collision using ball edges
    const ballTop = this.y;
    const ballBottom = this.y + this.height;
    const ballCenterX = this.x + this.width / 2;

    let verticalCollision = false;

    if (this.vy > 0) {
      // Check canvas bottom boundary
      if (ballBottom >= CONFIG.GAME_AREA_HEIGHT) {
        this.y = CONFIG.GAME_AREA_HEIGHT - this.height;
        // Simple reflection at boundary
        this.vy = -Math.abs(this.vy);
        verticalCollision = true;
      } else {
        // Moving down - check bottom edge
        const nextGridY = Math.floor(ballBottom / CONFIG.TILE_SIZE);
        const checkGridX = Math.floor(ballCenterX / CONFIG.TILE_SIZE);
        if (levelManager.isSolid(checkGridX, nextGridY) || levelManager.isBlockedByAnimatingBlock(checkGridX, nextGridY)) {
          // Snap to top edge of the wall
          this.y = nextGridY * CONFIG.TILE_SIZE - this.height - 1;

          // Calculate bounce angle based on impact position
          const ballCenterXPos = this.x + this.width / 2;
          const blockCenterX = (checkGridX * CONFIG.TILE_SIZE) + (CONFIG.TILE_SIZE / 2);
          const newVelocity = this.calculateBounceAngle(ballCenterXPos, blockCenterX, CONFIG.TILE_SIZE, false);
          this.vx = newVelocity.vx;
          this.vy = newVelocity.vy;
          verticalCollision = true;
        }
      }
    } else if (this.vy < 0) {
      // Check canvas top boundary
      if (ballTop <= 0) {
        this.y = 0;
        // Simple reflection at boundary
        this.vy = Math.abs(this.vy);
        verticalCollision = true;
      } else {
        // Moving up - check top edge
        const nextGridY = Math.floor(ballTop / CONFIG.TILE_SIZE);
        const checkGridX = Math.floor(ballCenterX / CONFIG.TILE_SIZE);
        if (levelManager.isSolid(checkGridX, nextGridY) || levelManager.isBlockedByAnimatingBlock(checkGridX, nextGridY)) {
          // Snap to bottom edge of the wall
          this.y = (nextGridY + 1) * CONFIG.TILE_SIZE + 1;

          // Calculate bounce angle based on impact position
          const ballCenterXPos = this.x + this.width / 2;
          const blockCenterX = (checkGridX * CONFIG.TILE_SIZE) + (CONFIG.TILE_SIZE / 2);
          const newVelocity = this.calculateBounceAngle(ballCenterXPos, blockCenterX, CONFIG.TILE_SIZE, false);
          this.vx = newVelocity.vx;
          this.vy = newVelocity.vy;
          verticalCollision = true;
        }
      }
    }

    // Check if ball is on a teleport tile
    this.checkTeleportTile(levelManager, game);
  }

  /**
   * Check if ball is on a teleport tile and start teleport animation
   */
  checkTeleportTile(levelManager, game = null) {
    // Don't teleport if already teleporting or in cooldown
    if (this.isTeleporting || this.teleportCooldown > 0) return;

    const gridX = this.getGridX();
    const gridY = this.getGridY();
    const tile = levelManager.getTileAt(gridX, gridY);

    // Check if on a teleport tile
    if (tile === TileType.TELEPORT_A || tile === TileType.TELEPORT_B) {
      const teleportDest = levelManager.findTeleportDestination(gridX, gridY, tile);
      if (teleportDest) {
        // Start teleportation animation
        this.isTeleporting = true;
        this.teleportTimer = 0;
        this.teleportDestination = teleportDest;
        this.teleportPhase = 0; // Start at disappearing phase

        // Play teleportation sound
        if (game && game.audioManager) {
          game.audioManager.playSfx('teleport');
        }
      }
    }
  }

  /**
   * Handle collision with player
   */
  onCollideWithPlayer(player, game) {
    // Check if player is invincible
    if (player.hasPowerUp && player.powerUpType === 'invincible') {
      // Create explosion particles
      this.createExplosionParticles(game);

      // Destroy the ball
      this.destroy();
      game.addScore(100);
    } else {
      // Player is defeated - start defeat animation
      if (!player.isDefeated) {
        player.startDefeatAnimation(game);
      }
    }
  }

  /**
   * Create explosion particles when destroyed
   */
  createExplosionParticles(game) {
    // Get ball center position
    const centerX = this.getCenterX();
    const centerY = this.getCenterY();

    // Particle speed
    const speed = 3;

    // Create 4 particles going in diagonal directions
    const directions = [
      { vx: speed, vy: -speed },   // Top-right
      { vx: speed, vy: speed },    // Bottom-right
      { vx: -speed, vy: -speed },  // Top-left
      { vx: -speed, vy: speed },   // Bottom-left
    ];

    for (const dir of directions) {
      // Create particle at ball center, offset to center the particle sprite
      const particleX = centerX - CONFIG.BALL_DISPLAY_SIZE / 2;
      const particleY = centerY - CONFIG.BALL_DISPLAY_SIZE / 2;

      const particle = new BallParticle(particleX, particleY, dir.vx, dir.vy);
      game.entityManager.add(particle);
    }
  }

  /**
   * Render the ball with sprite
   */
  render(renderer, spriteManager) {
    // Blink effect during teleportation (same as player)
    if (this.isTeleporting) {
      const blinkSpeed = 0.08; // Faster blink for teleportation
      if (Math.floor(this.teleportTimer / blinkSpeed) % 2 === 0) {
        return; // Skip rendering this frame for blink effect
      }
    }

    // Calculate display position (center the larger sprite on the collision box)
    const displaySize = CONFIG.BALL_DISPLAY_SIZE;
    const offset = (displaySize - this.width) / 2;
    const displayX = this.x - offset;
    const displayY = this.y - offset;

    if (spriteManager && spriteManager.isLoaded()) {
      spriteManager.drawBall(
        renderer,
        this.frame,
        displayX,
        displayY,
        displaySize,
        displaySize
      );
    } else {
      // Fallback rendering
      renderer.drawCircle(
        this.getCenterX(),
        this.getCenterY(),
        displaySize / 2,
        CONFIG.COLORS.DARK
      );
    }
  }
}
