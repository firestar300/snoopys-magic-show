import { Player } from './player.js';
import { CONFIG } from '../config.js';

/**
 * Spike entity (Snoopy's brother) - AI-controlled enemy
 * Same abilities as Snoopy but controlled by AI
 */
export class Spike extends Player {
	constructor(x, y) {
		super(x, y);

		this.type = 'spike';

		// Spike is slower than Snoopy (70% of Snoopy's speed)
		this.speed = this.speed * 0.7;

		// AI behavior
		this.aiTimer = 0;
		this.aiThinkDelay = 0.02; // Think quickly but moves smoothly
		this.currentDirection = null; // Current movement direction
		this.movesInDirection = 0; // How many moves made in current direction
		this.maxMovesInDirection = 3; // Continue 2-4 tiles in same direction before changing
		this.actionCooldown = 0; // Cooldown for breaking blocks

		// Spike cannot have power-ups
		this.canUsePowerUps = false;

		// Spike cannot be hit by balls
		this.invulnerableToBalls = true;

		// Defeated state (when hit by invincible Snoopy)
		this.isDefeatedByPlayer = false;

		// Frozen state (for time power-up)
		this.frozen = false;
	}

	/**
	 * Update Spike (AI-controlled)
	 */
	update(dt, input, levelManager, game = null) {
		// Don't update if frozen (time power-up)
		if (this.frozen) {
			return;
		}

		// If defeated by player, play defeat animation
		if (this.isDefeatedByPlayer && !this.isDefeated) {
			this.startDefeatAnimation();
		}

		// Update defeat animation if active
		if (this.isDefeated) {
			this.updateDefeatAnimation(dt);
			return;
		}

		// Update teleportation
		if (this.isTeleporting) {
			this.updateTeleportation(dt);
			return;
		}

		// Update hurt animation
		if (this.hurtTimer > 0) {
			this.hurtTimer -= dt;
		}

		// Update action cooldown
		if (this.actionCooldown > 0) {
			this.actionCooldown -= dt;
		}

		// AI thinking - make decisions when not moving
		if (!this.isMoving) {
			this.aiTimer += dt;
			if (this.aiTimer >= this.aiThinkDelay) {
				this.aiTimer = 0;
				this.think(levelManager, game);
			}
		}

		// Update action cooldown
		if (this.actionCooldown > 0) {
			this.actionCooldown -= dt;
		}

		// Try to break blocks when not moving (like Player does)
		if (!this.isMoving && this.actionCooldown <= 0) {
			this.tryBreakBlock(levelManager, game);
		}

		// Update movement
		if (this.isMoving) {
			this.updateMovement(dt, levelManager, game);
		}

		// Check if on arrow tile
		if (!this.isMoving) {
			const gridX = this.getGridX();
			const gridY = this.getGridY();
			const tile = levelManager.getTileAt(gridX, gridY);

			if (tile >= 6 && tile <= 9) {
				this.isOnArrowTile = true;
				if (this.arrowTileDelay <= 0) {
					this.handleArrowTile(tile, levelManager);
					this.arrowTileDelay = this.arrowTileDelayDuration;
				}
			} else {
				this.isOnArrowTile = false;
			}
		}

		// Update arrow tile delay
		if (this.arrowTileDelay > 0) {
			this.arrowTileDelay -= dt;
		}

		// Update animation (same as Player)
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
	 * AI thinking - decide what to do
	 */
	think(levelManager, game) {
		if (!game || !game.player) return;

		const myGridX = this.getGridX();
		const myGridY = this.getGridY();

		// Check if on arrow tile - force only that direction
		const currentTile = levelManager.getTileAt(myGridX, myGridY);
		let forcedDirection = null;

		// Arrow tiles: 6=UP, 7=RIGHT, 8=DOWN, 9=LEFT
		// When on arrow tile, ONLY move in arrow direction
		switch (currentTile) {
			case 6: forcedDirection = 'up'; break;    // UP arrow forces up
			case 7: forcedDirection = 'right'; break; // RIGHT arrow forces right
			case 8: forcedDirection = 'down'; break;  // DOWN arrow forces down
			case 9: forcedDirection = 'left'; break;  // LEFT arrow forces left
		}

		// If on arrow tile, only execute that direction
		if (forcedDirection) {
			this.currentDirection = forcedDirection;
			this.movesInDirection = 1;
			this.maxMovesInDirection = 1; // Reset to ensure we re-check next time
			this.executeAIMove(forcedDirection, levelManager, game);
			return;
		}

		// Try to continue in current direction first (for smooth movement)
		if (this.currentDirection && this.movesInDirection < this.maxMovesInDirection) {
			const [dx, dy] = this.getDirectionDelta(this.currentDirection);
			const newX = myGridX + dx;
			const newY = myGridY + dy;

			// Check if can continue in this direction
			if (levelManager.isInBounds(newX, newY) &&
			    (!levelManager.isSolid(newX, newY) || levelManager.isPushable(newX, newY))) {
				// Continue in same direction
				this.movesInDirection++;
				this.executeAIMove(this.currentDirection, levelManager, game);
				return;
			}
		}

		// Need to choose new direction (hit obstacle or reached max moves)
		const player = game.player;
		const playerGridX = player.getGridX();
		const playerGridY = player.getGridY();

		const directions = ['up', 'down', 'left', 'right'];
		const validDirections = directions.filter(dir => {
			const [dx, dy] = this.getDirectionDelta(dir);
			const newX = myGridX + dx;
			const newY = myGridY + dy;

			// Check if movement is valid
			if (!levelManager.isInBounds(newX, newY)) return false;
			if (levelManager.isSolid(newX, newY) && !levelManager.isPushable(newX, newY)) return false;

			return true;
		});

		if (validDirections.length === 0) return;

		// 50% chance to move towards player, 50% random
		let chosenDirection;
		if (Math.random() < 0.5) {
			// Move towards player
			const dx = playerGridX - myGridX;
			const dy = playerGridY - myGridY;

			if (Math.abs(dx) > Math.abs(dy)) {
				chosenDirection = dx > 0 ? 'right' : 'left';
			} else {
				chosenDirection = dy > 0 ? 'down' : 'up';
			}

			// If chosen direction is not valid, pick random
			if (!validDirections.includes(chosenDirection)) {
				chosenDirection = validDirections[Math.floor(Math.random() * validDirections.length)];
			}
		} else {
			// Random movement
			chosenDirection = validDirections[Math.floor(Math.random() * validDirections.length)];
		}

		// Start new direction
		this.currentDirection = chosenDirection;
		this.movesInDirection = 1;
		this.maxMovesInDirection = 2 + Math.floor(Math.random() * 3); // 2-4 tiles
		this.executeAIMove(chosenDirection, levelManager, game);
	}

	/**
	 * Execute AI move
	 */
	executeAIMove(direction, levelManager, game) {
		// Don't move if already moving or teleporting
		if (this.isMoving || this.isTeleporting) {
			return;
		}

		const gridX = this.getGridX();
		const gridY = this.getGridY();
		const [dx, dy] = this.getDirectionDelta(direction);
		const newGridX = gridX + dx;
		const newGridY = gridY + dy;

		this.direction = direction;
		this.directionIndex = ['up', 'down', 'left', 'right'].indexOf(direction);

		// Check if it's a pushable block
		if (levelManager.isPushable(newGridX, newGridY)) {
			const entityManager = game ? game.entityManager : null;
			const audioManager = game ? game.audioManager : null;
			if (levelManager.tryPushBlock(newGridX, newGridY, direction, entityManager, audioManager)) {
				this.startMovement(newGridX, newGridY);
			}
		} else if (!levelManager.isSolid(newGridX, newGridY)) {
			this.startMovement(newGridX, newGridY);
		}
	}

	/**
	 * Get direction delta
	 */
	getDirectionDelta(direction) {
		switch (direction) {
			case 'up': return [0, -1];
			case 'down': return [0, 1];
			case 'left': return [-1, 0];
			case 'right': return [1, 0];
			default: return [0, 0];
		}
	}

	/**
	 * Handle arrow tile (force movement in arrow direction)
	 */
	handleArrowTile(tile, levelManager) {
		const gridX = this.getGridX();
		const gridY = this.getGridY();

		let forcedX = gridX;
		let forcedY = gridY;
		let targetDirection = null;

		// Arrow tiles: 6=UP, 7=RIGHT, 8=DOWN, 9=LEFT
		switch (tile) {
			case 6: // ARROW_UP
				forcedY--;
				targetDirection = 'up';
				this.directionIndex = 0;
				break;
			case 7: // ARROW_RIGHT
				forcedX++;
				targetDirection = 'right';
				this.directionIndex = 3;
				break;
			case 8: // ARROW_DOWN
				forcedY++;
				targetDirection = 'down';
				this.directionIndex = 1;
				break;
			case 9: // ARROW_LEFT
				forcedX--;
				targetDirection = 'left';
				this.directionIndex = 2;
				break;
			default:
				return; // Not on an arrow tile
		}

		// Force movement if the target is not solid
		if (levelManager && !levelManager.isSolid(forcedX, forcedY)) {
			this.direction = targetDirection;
			this.startMovement(forcedX, forcedY);
		}
	}

	/**
	 * Try to break adjacent breakable blocks
	 */
	tryBreakBlock(levelManager, game) {
		// Only try to break blocks 30% of the time (randomness)
		if (Math.random() > 0.3) {
			return;
		}

		const gridX = this.getGridX();
		const gridY = this.getGridY();

		// Check all adjacent tiles for breakable blocks
		const directions = [
			{ dir: 'up', dx: 0, dy: -1 },
			{ dir: 'down', dx: 0, dy: 1 },
			{ dir: 'left', dx: -1, dy: 0 },
			{ dir: 'right', dx: 1, dy: 0 }
		];

		for (const { dir, dx, dy } of directions) {
			const targetX = gridX + dx;
			const targetY = gridY + dy;
			const tile = levelManager.getTileAt(targetX, targetY);

			// Check if it's a breakable tile (type 3)
			if (tile === 3) {
				// Break the block
				levelManager.setTileAt(targetX, targetY, 10); // Set to BROKEN (type 10)

				// Reveal power-up if there was one hidden in this block
				const powerUp = game ? levelManager.revealPowerUpFromBlock(targetX, targetY) : null;

				// Set cooldown before next block break
				this.actionCooldown = 0.3;

				// Play appropriate block break sound
				if (game && game.audioManager) {
					const soundName = powerUp ? 'block-break-item' : 'block-break';
					game.audioManager.playSfx(soundName);
				}

				// Reveal and animate the power-up (even though Spike can't use it)
				if (powerUp) {
					powerUp.reveal(targetX, targetY, dir, game.levelManager, game.entityManager);
					// Play power-up reveal sound based on type
					if (game.audioManager) {
						const soundName = powerUp.powerType === 'time' ? 'powerup-time' : 'powerup-god';
						game.audioManager.playSfx(soundName);
					}
				}

				// Face the direction of the broken block
				this.direction = dir;
				this.directionIndex = ['up', 'down', 'left', 'right'].indexOf(dir);

				// Only break one block at a time
				return;
			}
		}
	}

	/**
	 * Spike cannot collect power-ups
	 */
	activatePowerUp(powerUpType) {
		// Spike cannot use power-ups
		return;
	}

	/**
	 * Defeat Spike (called when hit by invincible Snoopy)
	 */
	defeat() {
		this.isDefeatedByPlayer = true;
	}

	/**
	 * Update teleportation animation
	 */
	updateTeleportation(dt) {
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
	}

	/**
	 * Update defeat animation
	 */
	updateDefeatAnimation(dt) {
		this.defeatTimer += dt;
		this.defeatAnimationTimer += dt;

		if (this.defeatAnimationTimer >= this.defeatAnimationSpeed) {
			this.defeatFrameCount++;
			const currentSequence = this.defeatSequence[this.defeatSequenceIndex];

			if (this.defeatFrameCount >= currentSequence.frames) {
				this.defeatSequenceIndex++;
				this.defeatFrameCount = 0;

				// Animation complete - remove Spike from the game
				if (this.defeatSequenceIndex >= this.defeatSequence.length) {
					// Mark as dead so EntityManager removes it
					this.isDead = true;
					return;
				}
			}

			this.defeatAnimationTimer = 0;
		}
	}

	/**
	 * Render Spike
	 */
	render(renderer, spriteManager) {
		// Don't render if defeated
		if (this.isDefeated) {
			// Render defeat animation using drawSnoopyDefeated (same sprite layout)
			if (spriteManager && spriteManager.isLoaded() && this.defeatSequenceIndex < this.defeatSequence.length) {
				const currentSeq = this.defeatSequence[this.defeatSequenceIndex];
				// Use drawSnoopyDefeated but with spike sprite
				const sprite = spriteManager.sprites.spike;
				if (sprite) {
					const frameSize = 16;
					const sx = currentSeq.col * frameSize;
					const sy = currentSeq.row * frameSize;
					renderer.drawSprite(sprite, sx, sy, frameSize, frameSize, this.x, this.y, this.width, this.height);
				}
			}
			return;
		}

		// Blink effect during teleportation
		if (this.isTeleporting) {
			const blinkSpeed = 0.08;
			if (Math.floor(this.teleportTimer / blinkSpeed) % 2 === 0) {
				return; // Skip rendering this frame for blink effect
			}
		}

		// Render Spike sprite (use same logic as Snoopy)
		if (spriteManager && spriteManager.isLoaded()) {
			spriteManager.drawSpike(
				renderer,
				this.directionIndex,
				this.frame,
				this.x,
				this.y,
				CONFIG.TILE_SIZE,
				CONFIG.TILE_SIZE
			);
		} else {
			// Fallback rendering (different color from Snoopy)
			renderer.drawRect(this.x + 2, this.y + 2, CONFIG.TILE_SIZE - 4, CONFIG.TILE_SIZE - 4, '#8B4513'); // Brown color
		}
	}
}
