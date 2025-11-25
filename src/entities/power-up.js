import { Entity } from './entity.js';
import { CONFIG } from '../config.js';

/**
 * Power-up collectible
 */
export class PowerUp extends Entity {
  constructor(gridX, gridY, powerType = 'speed', hidden = false, customTargets = null) {
    super(gridX, gridY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);

    this.type = 'powerup';
    this.powerType = powerType; // 'speed', 'invincible', or 'time'

    // Hidden state (power-up inside a block)
    this.hidden = hidden;
    this.isRevealing = false;
    this.revealTimer = 0;
    this.revealDuration = 1; // Will be calculated based on distance
    this.revealSpeedPerTile = 0.2; // Time per tile (seconds) - constant speed
    this.revealDirection = null; // Direction of reveal (up/down/left/right)
    this.startX = this.x;
    this.startY = this.y;
    this.targetX = this.x;
    this.targetY = this.y;

    // Custom target positions (optional, direction-based)
    // Format: { up: {x, y}, down: {x, y}, left: {x, y}, right: {x, y} }
    this.customTargets = customTargets;

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

    // Handle reveal animation (movement follows Snoopy's direction first)
    if (this.isRevealing) {
      this.revealTimer += dt;
      const progress = Math.min(this.revealTimer / this.revealDuration, 1);

      const deltaX = this.targetX - this.startX;
      const deltaY = this.targetY - this.startY;

      // Calculate distance in tiles for phase split
      const tilesX = Math.abs(deltaX) / CONFIG.TILE_SIZE;
      const tilesY = Math.abs(deltaY) / CONFIG.TILE_SIZE;
      const totalTiles = tilesX + tilesY;

      // Determine movement order based on Snoopy's direction
      const isVerticalFirst = this.revealDirection === 'up' || this.revealDirection === 'down';

      if (isVerticalFirst) {
        // Vertical movement first (up/down direction), then horizontal
        const verticalPhaseEnd = totalTiles > 0 ? tilesY / totalTiles : 0.5;

        if (progress < verticalPhaseEnd) {
          // Phase 1: Vertical movement only
          const verticalProgress = verticalPhaseEnd > 0 ? progress / verticalPhaseEnd : 0;
          this.x = this.startX; // Stay at start X
          this.y = this.startY + deltaY * verticalProgress;
        } else {
          // Phase 2: Horizontal movement only (vertical is complete)
          const horizontalPhaseLength = 1 - verticalPhaseEnd;
          const horizontalProgress = horizontalPhaseLength > 0 ? (progress - verticalPhaseEnd) / horizontalPhaseLength : 1;
          this.x = this.startX + deltaX * horizontalProgress;
          this.y = this.targetY; // Already at target Y
        }
      } else {
        // Horizontal movement first (left/right direction), then vertical
        const horizontalPhaseEnd = totalTiles > 0 ? tilesX / totalTiles : 0.5;

        if (progress < horizontalPhaseEnd) {
          // Phase 1: Horizontal movement only
          const horizontalProgress = horizontalPhaseEnd > 0 ? progress / horizontalPhaseEnd : 0;
          this.x = this.startX + deltaX * horizontalProgress;
          this.y = this.startY; // Stay at start Y
        } else {
          // Phase 2: Vertical movement only (horizontal is complete)
          const verticalPhaseLength = 1 - horizontalPhaseEnd;
          const verticalProgress = verticalPhaseLength > 0 ? (progress - horizontalPhaseEnd) / verticalPhaseLength : 1;
          this.x = this.targetX; // Already at target X
          this.y = this.startY + deltaY * verticalProgress;
        }
      }

      // End reveal animation
      if (progress >= 1) {
        this.isRevealing = false;
        this.x = this.targetX;
        this.y = this.targetY;
      }
    }
  }

  /**
   * Reveal the power-up from a block (moves 3 tiles in Snoopy's direction, or to custom target)
   */
  reveal(blockGridX, blockGridY, snoopyDirection, levelManager = null, entityManager = null) {
    if (!this.hidden) return;

    let targetGridX, targetGridY;

    // Check if custom targets are defined for this direction
    if (this.customTargets && this.customTargets[snoopyDirection]) {
      targetGridX = this.customTargets[snoopyDirection].x;
      targetGridY = this.customTargets[snoopyDirection].y;
    } else {
      // Otherwise, use automatic behavior (3 tiles in Snoopy's direction)
      // Direction mapping
      const directionMap = {
        'up': { dx: 0, dy: -1 },
        'down': { dx: 0, dy: 1 },
        'left': { dx: -1, dy: 0 },
        'right': { dx: 1, dy: 0 },
      };

      const dir = directionMap[snoopyDirection] || { dx: 1, dy: 0 };

      // Calculate target position: 3 tiles in Snoopy's direction
      targetGridX = blockGridX + (dir.dx * 3);
      targetGridY = blockGridY + (dir.dy * 3);

      // Clamp to grid bounds
      targetGridX = Math.max(0, Math.min(targetGridX, CONFIG.GRID_WIDTH - 1));
      targetGridY = Math.max(0, Math.min(targetGridY, CONFIG.GRID_HEIGHT - 1));

      // Check if target position is eligible (non-solid, no entity)
      if (levelManager && entityManager) {
        const isTargetEligible = this.isPositionEligible(targetGridX, targetGridY, levelManager, entityManager);

        if (!isTargetEligible) {
          // Find adjacent eligible position
          const adjacentPos = this.findAdjacentEligiblePosition(targetGridX, targetGridY, levelManager, entityManager);
          if (adjacentPos) {
            targetGridX = adjacentPos.x;
            targetGridY = adjacentPos.y;
          }
          // If no adjacent position found, keep original (will be on solid block but at least visible)
        }
      }
    }

    // Set up reveal animation
    this.hidden = false;
    this.isRevealing = true;
    this.revealTimer = 0;
    this.revealDirection = snoopyDirection; // Store direction for animation
    this.startX = blockGridX * CONFIG.TILE_SIZE;
    this.startY = blockGridY * CONFIG.TILE_SIZE;
    this.targetX = targetGridX * CONFIG.TILE_SIZE;
    this.targetY = targetGridY * CONFIG.TILE_SIZE;
    this.x = this.startX;
    this.y = this.startY;

    // Calculate duration based on distance (Manhattan distance in tiles)
    const tilesX = Math.abs(targetGridX - blockGridX);
    const tilesY = Math.abs(targetGridY - blockGridY);
    const totalTiles = tilesX + tilesY;
    this.revealDuration = totalTiles * this.revealSpeedPerTile;

    // Minimum duration to avoid instant movement
    if (this.revealDuration < 0.1) {
      this.revealDuration = 0.1;
    }

    // Start lifetime timer
    this.isLifetimeActive = true;
    this.lifetimeTimer = 0;
  }

  /**
   * Check if a position is eligible (non-solid, no entity blocking)
   */
  isPositionEligible(gridX, gridY, levelManager, entityManager) {
    // Check if tile is solid
    if (levelManager.isSolid(gridX, gridY)) {
      return false;
    }

    // Check if any entity is blocking this position
    const entities = [
      ...entityManager.getByType('ball'),
      ...entityManager.getByType('woodstock'),
      ...entityManager.getByType('powerup'),
    ];

    for (const entity of entities) {
      const entityGridX = Math.floor(entity.x / CONFIG.TILE_SIZE);
      const entityGridY = Math.floor(entity.y / CONFIG.TILE_SIZE);
      if (entityGridX === gridX && entityGridY === gridY) {
        return false;
      }
    }

    return true;
  }

  /**
   * Find an adjacent eligible position
   */
  findAdjacentEligiblePosition(gridX, gridY, levelManager, entityManager) {
    // Check all 4 adjacent positions (up, right, down, left)
    const adjacentOffsets = [
      { dx: 0, dy: -1 },  // up
      { dx: 1, dy: 0 },   // right
      { dx: 0, dy: 1 },   // down
      { dx: -1, dy: 0 },  // left
    ];

    for (const offset of adjacentOffsets) {
      const adjX = gridX + offset.dx;
      const adjY = gridY + offset.dy;

      // Check bounds
      if (adjX < 0 || adjX >= CONFIG.GRID_WIDTH || adjY < 0 || adjY >= CONFIG.GRID_HEIGHT) {
        continue;
      }

      // Check if eligible
      if (this.isPositionEligible(adjX, adjY, levelManager, entityManager)) {
        return { x: adjX, y: adjY };
      }
    }

    return null; // No eligible adjacent position found
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
