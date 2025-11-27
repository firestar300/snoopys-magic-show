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

		// Activation delay (prevents immediate teleportation when revealed)
		this.activationDelay = 0;
		this.activationDelayDuration = 0.3; // 300ms delay after reveal before portal becomes active

		// Track entities that have recently used this portal to prevent immediate re-teleportation
		this.recentUsers = new Map(); // entity -> cooldown timer
		this.useCooldown = 1.0; // 1 second cooldown per entity
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

		// Update entity cooldowns
		for (const [entity, cooldown] of this.recentUsers.entries()) {
			const newCooldown = cooldown - dt;
			if (newCooldown <= 0) {
				this.recentUsers.delete(entity);
			} else {
				this.recentUsers.set(entity, newCooldown);
			}
		}

		// Only check collisions if activation delay has expired
		if (this.activationDelay <= 0) {
			// Check for player collision (teleportation)
			if (game && game.player) {
				this.checkPlayerCollision(game.player, game);
			}

			// Check for ball collisions
			if (game && game.entityManager) {
				const balls = game.entityManager.getEntitiesByType('ball');
				for (const ball of balls) {
					this.checkBallCollision(ball, game);
				}
			}
		}
	}

	/**
	 * Check if player is on portal and teleport them
	 */
	checkPlayerCollision(player, game) {
		// Don't teleport if player is already teleporting
		if (player.isTeleporting) return;

		// Check if player has cooldown
		if (this.recentUsers.has(player)) return;

		// Check if player is at portal position
		const playerGridX = player.getGridX();
		const playerGridY = player.getGridY();
		const portalGridX = this.getGridX();
		const portalGridY = this.getGridY();

		if (playerGridX === portalGridX && playerGridY === portalGridY) {
			// Start teleportation animation
			player.isTeleporting = true;
			player.teleportTimer = 0;
			player.teleportDestination = {
				x: this.destinationX,
				y: this.destinationY,
			};
			player.teleportPhase = 0;

			// Add cooldown
			this.recentUsers.set(player, this.useCooldown);

			// Play teleportation sound
			if (game.audioManager) {
				game.audioManager.playSfx('teleport');
			}
		}
	}

	/**
	 * Check if ball is on portal and teleport it
	 */
	checkBallCollision(ball, game) {
		// Don't teleport if ball is already teleporting
		if (ball.isTeleporting) return;

		// Check if ball has cooldown
		if (this.recentUsers.has(ball)) return;

		// Check if ball is at portal position
		const ballGridX = ball.getGridX();
		const ballGridY = ball.getGridY();
		const portalGridX = this.getGridX();
		const portalGridY = this.getGridY();

		if (ballGridX === portalGridX && ballGridY === portalGridY) {
			// Start teleportation animation
			ball.isTeleporting = true;
			ball.teleportTimer = 0;
			ball.teleportDestination = {
				x: this.destinationX,
				y: this.destinationY,
			};
			ball.teleportPhase = 0;

			// Add cooldown
			this.recentUsers.set(ball, this.useCooldown);

			// Play teleportation sound
			if (game.audioManager) {
				game.audioManager.playSfx('teleport');
			}
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
