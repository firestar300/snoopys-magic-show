import { Entity } from './entity.js';
import { CONFIG } from '../config.js';

/**
 * One-way portal entity that can be hidden in pushable blocks
 */
export class Portal extends Entity {
	constructor(gridX, gridY, destinationX, destinationY, hidden = false) {
		super(gridX, gridY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);

		this.type = 'portal';
		this.destinationX = destinationX;
		this.destinationY = destinationY;

		// Hidden state (portal inside a block)
		this.hidden = hidden;

		/** True only if the level placed this portal inside a block (can be covered again after reveal). */
		this.embeddedInBlockInitially = hidden;

		// Activation delay (prevents immediate teleportation when revealed)
		this.activationDelay = 0;
		this.activationDelayDuration = 0.3; // 300ms delay after reveal before portal becomes active

		// Global cooldown (portal becomes inactive for ALL entities after each use)
		this.globalCooldown = 0;
		this.globalCooldownDuration = 1.0; // 1 second cooldown after each teleportation
	}

	/**
	 * Update cooldowns and collision detection
	 */
	update(dt, input = null, levelManager = null, game = null) {
		// Don't update if hidden
		if (this.hidden) {
			return;
		}

		// Update activation delay
		if (this.activationDelay > 0) {
			this.activationDelay -= dt;
		}

		// Update global cooldown
		if (this.globalCooldown > 0) {
			this.globalCooldown -= dt;
			if (this.globalCooldown < 0) {
				this.globalCooldown = 0;
			}
		}

		// Only check collisions if activation delay has expired and portal is not in cooldown
		if (this.activationDelay <= 0 && this.globalCooldown <= 0) {
			// Check for player collision (teleportation)
			if (game && game.player) {
				this.checkPlayerCollision(game.player, game, levelManager);
			}

			// Check for Spike collisions (only if portal is still active after player check)
			if (this.globalCooldown <= 0 && game && game.entityManager) {
				const spikes = game.entityManager.getEntitiesByType('spike');
				for (const spike of spikes) {
					this.checkSpikeCollision(spike, game, levelManager);
					// Stop checking other spikes if portal went into cooldown
					if (this.globalCooldown > 0) {
						break;
					}
				}
			}

			// Check for ball collisions (only if portal is still active after player/spike check)
			if (this.globalCooldown <= 0 && game && game.entityManager) {
				const balls = game.entityManager.getEntitiesByType('ball');
				for (const ball of balls) {
					this.checkBallCollision(ball, game, levelManager);
					// Stop checking other balls if portal went into cooldown
					if (this.globalCooldown > 0) {
						break;
					}
				}
			}
		}
	}

	/**
	 * Check if player is on portal and teleport them
	 */
	checkPlayerCollision(player, game, levelManager) {
		// Don't teleport if player is already teleporting
		if (player.isTeleporting) return;

		// Don't teleport if player is still moving
		if (player.isMoving) return;

		// Don't teleport if portal is in cooldown
		if (this.globalCooldown > 0) return;

		// Don't teleport if portal is not yet active
		if (this.activationDelay > 0) return;

		// Check if player is at portal position
		const playerGridX = player.getGridX();
		const playerGridY = player.getGridY();
		const portalGridX = this.getGridX();
		const portalGridY = this.getGridY();

		if (playerGridX === portalGridX && playerGridY === portalGridY) {
			// Check if destination is solid
			const isDestinationSolid = levelManager && levelManager.isSolid(this.destinationX, this.destinationY);

			// Play teleportation sound
			if (game.audioManager) {
				game.audioManager.playSfx('teleport');
			}

			// If destination is solid, only play sound and activate cooldown but don't teleport
			if (isDestinationSolid) {
				// Activate global cooldown
				this.globalCooldown = this.globalCooldownDuration;
				return; // Don't teleport
			}

			// Start teleportation animation
			player.isTeleporting = true;
			player.teleportTimer = 0;
			player.teleportDestination = {
				x: this.destinationX,
				y: this.destinationY,
			};
			player.teleportPhase = 0;

			// Activate global cooldown
			this.globalCooldown = this.globalCooldownDuration;
		}
	}

	/**
	 * Check if Spike is on portal and teleport them
	 */
	checkSpikeCollision(spike, game, levelManager) {
		// Don't teleport if Spike is already teleporting
		if (spike.isTeleporting) return;

		// Don't teleport if Spike is defeated
		if (spike.isDefeated) return;

		// Don't teleport if portal is in cooldown
		if (this.globalCooldown > 0) return;

		// Don't teleport if portal is not yet active
		if (this.activationDelay > 0) return;

		// Check if Spike is at portal position
		const spikeGridX = spike.getGridX();
		const spikeGridY = spike.getGridY();
		const portalGridX = this.getGridX();
		const portalGridY = this.getGridY();

		if (spikeGridX === portalGridX && spikeGridY === portalGridY) {
			// Check if destination is solid
			const isDestinationSolid = levelManager && levelManager.isSolid(this.destinationX, this.destinationY);

			// Play teleportation sound
			if (game.audioManager) {
				game.audioManager.playSfx('teleport');
			}

			// If destination is solid, only play sound and activate cooldown but don't teleport
			if (isDestinationSolid) {
				// Activate global cooldown
				this.globalCooldown = this.globalCooldownDuration;
				return; // Don't teleport
			}

			// Start teleportation animation
			spike.isTeleporting = true;
			spike.teleportTimer = 0;
			spike.teleportDestination = {
				x: this.destinationX,
				y: this.destinationY,
			};
			spike.teleportPhase = 0;

			// Activate global cooldown
			this.globalCooldown = this.globalCooldownDuration;
		}
	}

	/**
	 * Check if ball is on portal and teleport it
	 */
	checkBallCollision(ball, game, levelManager) {
		// Don't teleport if ball is already teleporting
		if (ball.isTeleporting) return;

		// Don't teleport if portal is in cooldown
		if (this.globalCooldown > 0) return;

		// Don't teleport if portal is not yet active
		if (this.activationDelay > 0) return;

		// Check if ball is at portal position
		const ballGridX = ball.getGridX();
		const ballGridY = ball.getGridY();
		const portalGridX = this.getGridX();
		const portalGridY = this.getGridY();

		if (ballGridX === portalGridX && ballGridY === portalGridY) {
			// Check if destination is solid
			const isDestinationSolid = levelManager && levelManager.isSolid(this.destinationX, this.destinationY);

			// Play teleportation sound
			if (game.audioManager) {
				game.audioManager.playSfx('teleport');
			}

			// If destination is solid, only play sound and activate cooldown but don't teleport
			if (isDestinationSolid) {
				// Activate global cooldown
				this.globalCooldown = this.globalCooldownDuration;
				return; // Don't teleport
			}

			// Start teleportation animation
			ball.isTeleporting = true;
			ball.teleportTimer = 0;
			ball.teleportDestination = {
				x: this.destinationX,
				y: this.destinationY,
			};
			ball.teleportPhase = 0;

			// Also set ball's own cooldown to prevent it from using other portals immediately
			if (ball.teleportCooldown !== undefined) {
				ball.teleportCooldown = ball.teleportCooldownDuration || 1.0;
			}

			// Activate global cooldown
			this.globalCooldown = this.globalCooldownDuration;
		}
	}

	/**
	 * Reveal the portal from a block (instant, no animation)
	 */
	reveal() {
		if (!this.hidden) return;

		this.hidden = false;
		// Set activation delay to prevent immediate teleportation
		this.activationDelay = this.activationDelayDuration;
	}

	/**
	 * Render the portal (static, no animations)
	 */
	render(renderer, spriteManager) {
		// Don't render if hidden
		if (this.hidden) {
			return;
		}

		// Get portal sprite from blocks spritesheet
		// Position: x=80 (5*16), y=16 (line 2)
		const sprite = spriteManager.sprites.blocks;
		if (!sprite) return;

		const frameWidth = 16;
		const frameHeight = 16;
		const spriteX = 5 * 16; // Column 6 (x=80)
		const spriteY = 16;     // Line 2

		// Render portal (static, no animation)
		renderer.drawSprite(
			sprite,
			spriteX,
			spriteY,
			frameWidth,
			frameHeight,
			this.x,
			this.y,
			CONFIG.TILE_SIZE,
			CONFIG.TILE_SIZE
		);
	}
}
