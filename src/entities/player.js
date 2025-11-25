import { Entity } from './entity.js';
import { CONFIG } from '../config.js';
import { TileType } from '../tiles/tile-types.js';

/**
 * Player entity (Snoopy)
 */
export class Player extends Entity {
  constructor(x, y) {
    super(x / CONFIG.TILE_SIZE, y / CONFIG.TILE_SIZE);

    this.type = 'player';
    this.speed = CONFIG.PLAYER_SPEED;

    // Movement
    this.vx = 0;
    this.vy = 0;
    this.targetX = this.x;
    this.targetY = this.y;
    this.isMoving = false;
    this.isOnArrowTile = false;

    // Animation
    this.frame = 0;
    this.animationTimer = 0;
    this.animationSpeed = 0.15;
    this.direction = 'down'; // up, down, left, right
    this.directionIndex = 1; // 0=up, 1=down, 2=left, 3=right

    // Power-ups
    this.hasPowerUp = false;
    this.powerUpType = null;
    this.powerUpTimer = 0;
    this.blinkTimer = 0; // For invincibility blink effect

    // Hurt animation
    this.hurtTimer = 0;
    this.hurtDuration = 0.5; // 0.5 seconds

    // Action cooldown
    this.actionCooldown = 0;
    this.previousActionState = false; // Track previous action button state

    // Trapped on toggle block
    this.isTrapped = false;

    // Teleportation animation
    this.isTeleporting = false;
    this.teleportTimer = 0;
    this.teleportDuration = 0.8; // 800ms animation
    this.teleportDestination = null;
    this.teleportPhase = 0; // 0 = disappearing at source, 1 = appearing at destination

    // Victory animation
    this.isVictorious = false;
    this.victoryTimer = 0;
    this.victoryDuration = 3; // 3 seconds
    this.victoryFrame = 0;
    this.victoryAnimationTimer = 0;
    this.victoryAnimationSpeed = 0.2; // Speed of frame alternation

    // Defeated animation
    this.isDefeated = false;
    this.defeatTimer = 0;
    this.defeatFrame = 0;
    this.defeatAnimationTimer = 0;
    this.defeatAnimationSpeed = 0.1; // Speed per frame (33% faster)
    this.defeatSequence = [
      { col: 4, row: 0, frames: 1 }, // L1C5
      { col: 1, row: 0, frames: 1 }, // L1C2
      { col: 4, row: 0, frames: 1 }, // L1C5
      { col: 1, row: 0, frames: 1 }, // L1C2
      { col: 7, row: 1, frames: 1 }, // L2C8
      { col: 7, row: 0, frames: 1 }, // L1C8
      { col: 7, row: 1, frames: 1 }, // L2C8
      { col: 7, row: 0, frames: 1 }, // L1C8
      { col: 0, row: 1, frames: 6 }, // L2C1 (6 frames)
      { col: 2, row: 1, frames: 6 }, // L2C3 (6 frames)
    ];
    this.defeatSequenceIndex = 0;
    this.defeatFrameCount = 0;
  }

  /**
   * Update player
   */
  update(dt, input, levelManager, game = null) {
    // Update defeated animation
    if (this.isDefeated) {
      this.defeatTimer += dt;
      this.defeatAnimationTimer += dt;

      if (this.defeatAnimationTimer >= this.defeatAnimationSpeed) {
        this.defeatFrameCount++;
        const currentSequence = this.defeatSequence[this.defeatSequenceIndex];

        if (this.defeatFrameCount >= currentSequence.frames) {
          this.defeatSequenceIndex++;
          this.defeatFrameCount = 0;

          // Animation complete
          if (this.defeatSequenceIndex >= this.defeatSequence.length) {
            // Lose a life after animation
            if (game) {
              game.loseLife();
            }
            return;
          }
        }

        this.defeatAnimationTimer = 0;
      }

      // Don't update anything else during defeat
      return;
    }

    // Update victory animation
    if (this.isVictorious) {
      this.victoryTimer += dt;
      this.victoryAnimationTimer += dt;

      // Alternate between frames 0 and 1
      if (this.victoryAnimationTimer >= this.victoryAnimationSpeed) {
        this.victoryFrame = (this.victoryFrame + 1) % 2;
        this.victoryAnimationTimer = 0;
      }

      // Don't update anything else during victory
      return;
    }

    // Update teleportation animation
    if (this.isTeleporting) {
      this.teleportTimer += dt;
      const halfDuration = this.teleportDuration / 2;

      // At 50% of animation, teleport to destination and start appearing phase
      if (this.teleportPhase === 0 && this.teleportTimer >= halfDuration) {
        if (this.teleportDestination) {
          this.x = this.teleportDestination.x * CONFIG.TILE_SIZE;
          this.y = this.teleportDestination.y * CONFIG.TILE_SIZE;
          this.targetX = this.x;
          this.targetY = this.y;
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
      }

      // Block all other updates during teleportation
      return;
    }

    // Check if player is trapped (update continuously)
    const gridX = this.getGridX();
    const gridY = this.getGridY();
    this.isTrapped = levelManager.isPlayerTrappedOnToggleBlock(gridX, gridY);

    // Handle grid-based movement
    if (!this.isMoving) {
      // Check arrow tiles continuously (in case toggle blocks change state)
      this.checkArrowTile(levelManager);

      // Only handle manual input if not forced by arrow tile
      if (!this.isMoving) {
        this.handleInput(input, levelManager);
      }
    } else {
      this.updateMovement(dt, levelManager);
    }

    // Allow breaking blocks even while moving
    // Detect "just pressed" ourselves
    const actionJustPressed = input.action && !this.previousActionState;
    this.previousActionState = input.action;

    if (actionJustPressed && this.actionCooldown <= 0) {
      this.performAction(levelManager, game);
      this.actionCooldown = 0.3; // 300ms cooldown
    }

    // Update hurt timer
    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      if (this.hurtTimer < 0) {
        this.hurtTimer = 0;
      }
    }

    // Update action cooldown
    if (this.actionCooldown > 0) {
      this.actionCooldown -= dt;
    }

    // Update power-up timer
    if (this.hasPowerUp) {
      this.powerUpTimer -= dt;
      this.blinkTimer += dt;
      if (this.powerUpTimer <= 0) {
        this.removePowerUp(game);
      }
    }

    // Update animation only when moving and not hurt
    if (this.isMoving && this.hurtTimer === 0) {
      this.animationTimer += dt;
      if (this.animationTimer >= this.animationSpeed) {
        this.frame = (this.frame + 1) % 3;
        this.animationTimer = 0;
      }
    } else if (this.hurtTimer === 0) {
      this.frame = 0; // Idle frame
    }
  }

  /**
   * Handle player input
   */
  handleInput(input, levelManager) {
    // Block input during teleportation
    if (this.isTeleporting) {
      return;
    }

    // If player is trapped, cannot move
    if (this.isTrapped) {
      return;
    }

    let gridX = this.getGridX();
    let gridY = this.getGridY();
    let newGridX = gridX;
    let newGridY = gridY;
    let dirX = 0;
    let dirY = 0;

    if (input.up) {
      newGridY--;
      dirY = -1;
      this.direction = 'up';
      this.directionIndex = 0;
    } else if (input.down) {
      newGridY++;
      dirY = 1;
      this.direction = 'down';
      this.directionIndex = 1;
    } else if (input.left) {
      newGridX--;
      dirX = -1;
      this.direction = 'left';
      this.directionIndex = 2;
    } else if (input.right) {
      newGridX++;
      dirX = 1;
      this.direction = 'right';
      this.directionIndex = 3;
    }

    // Check if movement is valid
    if (newGridX !== gridX || newGridY !== gridY) {
      const tile = levelManager.getTileAt(newGridX, newGridY);

      // Check if it's a pushable block
      if (levelManager.isPushable(newGridX, newGridY)) {
        // Try to push the block in the direction we're moving
        if (levelManager.tryPushBlock(newGridX, newGridY, this.direction)) {
          // Block was pushed successfully, player moves into the block's position
          this.startMovement(newGridX, newGridY);
        }
        // If push failed, do nothing (player stays in place)
      } else if (!levelManager.isSolid(newGridX, newGridY)) {
        // Move to the new position
        this.startMovement(newGridX, newGridY);
      }
    }

    // Note: Action button is now handled in update() to work even while moving
  }

  /**
   * Start movement to a new grid position
   */
  startMovement(gridX, gridY) {
    this.targetX = gridX * CONFIG.TILE_SIZE;
    this.targetY = gridY * CONFIG.TILE_SIZE;
    this.isMoving = true;

    // Calculate velocity
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      this.vx = (dx / distance) * this.speed;
      this.vy = (dy / distance) * this.speed;
    }
  }

  /**
   * Update movement towards target
   */
  updateMovement(dt, levelManager) {
    const moveAmount = this.speed;
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= moveAmount) {
      // Snap to target
      this.x = this.targetX;
      this.y = this.targetY;
      this.isMoving = false;
      this.vx = 0;
      this.vy = 0;

      // Check if we landed on a teleport tile
      this.checkTeleportTile(levelManager, game);

      // Check if we landed on an arrow tile
      this.checkArrowTile(levelManager);
    } else {
      // Move towards target
      this.x += this.vx;
      this.y += this.vy;
    }
  }

  /**
   * Check if player is on a teleport tile and start teleport animation
   */
  checkTeleportTile(levelManager, game = null) {
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
   * Check if player is on an arrow tile and force movement
   */
  checkArrowTile(levelManager) {
    const gridX = this.getGridX();
    const gridY = this.getGridY();
    const tile = levelManager.getTileAt(gridX, gridY);

    let forcedX = gridX;
    let forcedY = gridY;
    let targetDirection = null;
    let targetDirectionIndex = null;

    // Arrow tiles: 6=UP, 7=RIGHT, 8=DOWN, 9=LEFT
    switch (tile) {
      case 6: // ARROW_UP
        forcedY--;
        targetDirection = 'up';
        targetDirectionIndex = 0;
        break;
      case 7: // ARROW_RIGHT
        forcedX++;
        targetDirection = 'right';
        targetDirectionIndex = 3;
        break;
      case 8: // ARROW_DOWN
        forcedY++;
        targetDirection = 'down';
        targetDirectionIndex = 1;
        break;
      case 9: // ARROW_LEFT
        forcedX--;
        targetDirection = 'left';
        targetDirectionIndex = 2;
        break;
      default:
        return; // Not on an arrow tile
    }

    // Force movement if the target is not solid
    if (!levelManager.isSolid(forcedX, forcedY)) {
      // Update direction and sprite only if movement is possible
      this.direction = targetDirection;
      this.directionIndex = targetDirectionIndex;
      this.startMovement(forcedX, forcedY);
    }
  }

  /**
   * Perform action (break blocks, etc.)
   */
  performAction(levelManager, game = null) {
    // Get the tile in front of the player based on direction
    let targetX = this.getGridX();
    let targetY = this.getGridY();

    switch (this.direction) {
      case 'up':
        targetY--;
        break;
      case 'down':
        targetY++;
        break;
      case 'left':
        targetX--;
        break;
      case 'right':
        targetX++;
        break;
    }

    // Check if it's a breakable tile
    const tile = levelManager.getTileAt(targetX, targetY);

    if (tile === 3) { // BREAKABLE
      levelManager.setTileAt(targetX, targetY, 10); // Set to BROKEN (type 10)

      // Reveal power-up if there was one hidden in this block
      if (game) {
        const powerUp = levelManager.revealPowerUpFromBlock(targetX, targetY);
        if (powerUp) {
          powerUp.reveal(targetX, targetY, this.direction);
        }
      }
    }
  }

  /**
   * Apply a power-up
   */
  applyPowerUp(powerType, game = null) {
    this.hasPowerUp = true;
    this.powerUpType = powerType;
    this.blinkTimer = 0;

    // Set duration based on power-up type
    const duration = powerType === 'time' ? 4 : 5; // 3s for time, 5s for others
    this.powerUpTimer = duration;

    switch (powerType) {
      case 'speed':
        this.speed = CONFIG.PLAYER_SPEED * 1.5;
        // Accelerate music x1.5
        if (game && game.audioManager) {
          game.audioManager.setMusicSpeed(1.5);
        }
        break;
      case 'invincible':
        // Play invincible music
        if (game && game.audioManager) {
          game.audioManager.playMusic('invincible');
        }
        break;
      case 'time':
        // Play frozen time music
        if (game && game.audioManager) {
          game.audioManager.playMusic('frozen-time');
        }
        break;
    }
  }

  /**
   * Remove current power-up
   */
  removePowerUp(game = null) {
    // Stop power-up music if it was playing and restart level music
    if (game && game.audioManager && (this.powerUpType === 'invincible' || this.powerUpType === 'time')) {
      // Restart level music
      const levelMusic = game.levelManager.currentLevel?.music;
      if (levelMusic) {
        game.audioManager.playMusic(levelMusic);
      }
    }

    // Reset music speed if it was a speed power-up
    if (game && game.audioManager && this.powerUpType === 'speed') {
      game.audioManager.resetMusicSpeed();
    }

    this.hasPowerUp = false;
    this.powerUpType = null;
    this.speed = CONFIG.PLAYER_SPEED;
  }

  /**
   * Start victory animation
   */
  startVictoryAnimation() {
    this.isVictorious = true;
    this.victoryTimer = 0;
    this.victoryFrame = 0;
    this.victoryAnimationTimer = 0;
    this.isMoving = false;
    this.vx = 0;
    this.vy = 0;
  }

  /**
   * Start defeat animation
   */
  startDefeatAnimation(game = null) {
    // Remove any active power-ups and stop their music
    if (this.hasPowerUp) {
      this.removePowerUp(game);
    }

    this.isDefeated = true;
    this.defeatTimer = 0;
    this.defeatFrame = 0;
    this.defeatAnimationTimer = 0;
    this.defeatSequenceIndex = 0;
    this.defeatFrameCount = 0;
    this.isMoving = false;
    this.vx = 0;
    this.vy = 0;

    // Play defeat music
    if (game && game.audioManager) {
      game.audioManager.playMusic('miss');
    }
  }

  /**
   * Reset player state
   */
  reset() {
    this.isMoving = false;
    this.vx = 0;
    this.vy = 0;
    this.removePowerUp();
    this.isTeleporting = false;
    this.teleportTimer = 0;
    this.teleportDestination = null;
    this.teleportPhase = 0;
    this.isVictorious = false;
    this.victoryTimer = 0;
    this.isDefeated = false;
    this.defeatTimer = 0;
  }

  /**
   * Render player with sprites
   */
  render(renderer, spriteManager) {
    // Defeat animation
    if (this.isDefeated) {
      if (spriteManager && spriteManager.isLoaded() && this.defeatSequenceIndex < this.defeatSequence.length) {
        const currentSequence = this.defeatSequence[this.defeatSequenceIndex];
        spriteManager.drawSnoopyDefeated(
          renderer,
          currentSequence.col,
          currentSequence.row,
          this.x,
          this.y,
          this.width,
          this.height
        );
      }
      return;
    }

    // Victory animation
    if (this.isVictorious) {
      if (spriteManager && spriteManager.isLoaded()) {
        // Victory sprite is 16x24, scale proportionally
        const spriteWidth = 16;
        const spriteHeight = 24;
        const scale = 2; // Scale 2x to make it visible (16x24 -> 32x48)
        const renderWidth = spriteWidth * scale;
        const renderHeight = spriteHeight * scale;

        // Center horizontally, anchor to bottom
        const adjustedX = this.x + (this.width - renderWidth) / 2;
        const adjustedY = this.y + this.height - renderHeight;

        spriteManager.drawSnoopyVictory(
          renderer,
          this.victoryFrame,
          adjustedX,
          adjustedY,
          renderWidth,
          renderHeight
        );
      }
      return;
    }

    // Blink effect during teleportation
    if (this.isTeleporting) {
      const blinkSpeed = 0.08; // Faster blink for teleportation
      if (Math.floor(this.teleportTimer / blinkSpeed) % 2 === 0) {
        return; // Skip rendering this frame for blink effect
      }
    }

    // Don't render if invincible and blinking (blink effect)
    if (this.hasPowerUp && this.powerUpType === 'invincible') {
      const blinkSpeed = 0.1;
      if (Math.floor(this.blinkTimer / blinkSpeed) % 2 === 0) {
        return; // Skip rendering this frame for blink effect
      }
    }

    // Check if hurt (just lost a life)
    const hurt = this.hurtTimer > 0;

    // Draw Snoopy sprite
    if (spriteManager && spriteManager.isLoaded()) {
      spriteManager.drawSnoopy(
        renderer,
        this.directionIndex,
        hurt ? Math.floor(this.hurtTimer * 10) % 3 : this.frame,
        this.x,
        this.y,
        this.width,
        this.height,
        hurt
      );
    } else {
      // Fallback rendering
      const padding = 4;
      renderer.drawRect(
        this.x + padding,
        this.y + padding,
        this.width - padding * 2,
        this.height - padding * 2,
        CONFIG.COLORS.LIGHT
      );
    }

    // Trapped indicator (red pulsating outline)
    if (this.isTrapped) {
      const alpha = Math.sin(Date.now() / 150) * 0.4 + 0.6;
      renderer.ctx.globalAlpha = alpha;
      renderer.drawRectOutline(
        this.x - 3,
        this.y - 3,
        this.width + 6,
        this.height + 6,
        '#ff0000',
        3
      );
      renderer.ctx.globalAlpha = 1;
    }
  }
}
