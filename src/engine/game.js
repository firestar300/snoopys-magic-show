import { CONFIG } from '../config.js';
import { InputManager } from './input-manager.js';
import { Renderer } from './renderer.js';
import { LevelManager } from './level-manager.js';
import { Player } from '../entities/player.js';
import { EntityManager } from './entity-manager.js';
import { UIManager } from '../ui/ui-manager.js';
import { GameState } from '../ui/game-states.js';
import { SpriteManager } from './sprite-manager.js';
import { AudioManager } from './audio-manager.js';

/**
 * Main game class that orchestrates the game loop and systems
 */
export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.canvas.width = CONFIG.CANVAS_WIDTH;
    this.canvas.height = CONFIG.CANVAS_HEIGHT;

    // Initialize systems
    this.renderer = new Renderer(canvas);
    this.spriteManager = new SpriteManager();
    this.audioManager = new AudioManager();
    this.inputManager = new InputManager(canvas);
    this.levelManager = new LevelManager();
    this.entityManager = new EntityManager();
    this.uiManager = new UIManager(this);

    // Load sprites and audio
    this.spriteManager.loadAll();
    this.audioManager.loadAll();

    // Game state
    this.state = {
      score: 0,
      lives: 3,
      level: 1,
      currentState: GameState.MENU,
      levelReady: false,
    };

    // Timer state
    this.timer = {
      elapsed: 0,
      filledSegments: 0,
      totalSegments: 0, // Will be calculated based on canvas size
      isActive: true, // Timer is active by default
    };

    // Input tracking
    this.pauseKeyPressed = false;

    // Game loop
    this.lastTime = 0;
    this.accumulator = 0;
    this.timestep = 1000 / CONFIG.FPS;
    this.animationFrameId = null;

    // Start title screen music
    this.audioManager.playMusic('title');

    // Start game loop immediately (menu will show first)
    this.start();
  }

  /**
   * Initialize/Reset the game
   */
  async init() {
    // Reset state
    this.state.score = 0;
    this.state.lives = 3;
    this.state.level = 0; // Start at test level (use 1 for normal game)
    this.state.currentState = GameState.PLAYING;
    this.state.levelReady = false;
    this.uiManager.setState(GameState.PLAYING);

    // Clear entities
    this.entityManager.clear();

    // Load first level (0 = test level, 1 = first real level)
    await this.levelManager.loadLevel(this.state.level);

    // Create player
    const startPos = this.levelManager.getStartPosition();
    this.player = new Player(startPos.x, startPos.y);
    this.entityManager.add(this.player);

    // Spawn entities from level
    this.spawnLevelEntities();

    // Mark level as ready
    this.state.levelReady = true;

    // Initialize timer
    this.initTimer();

    // Play level music if defined
    const levelMusic = this.levelManager.currentLevel?.music;
    if (levelMusic) {
      this.audioManager.playMusic(levelMusic);
    }

    // Update UI
    this.updateUI();
  }

  /**
   * Initialize timer for the level
   */
  initTimer() {
    const border = CONFIG.TIMER_BORDER;
    const width = CONFIG.CANVAS_WIDTH;
    const height = CONFIG.CANVAS_HEIGHT;

    // Calculate total number of 16px segments in the border
    // Top (excluding center 64px and corners)
    const topSegments = Math.floor((width - 64 - (border * 2)) / border);
    // Right side (excluding corners)
    const rightSegments = Math.floor((height - (border * 2)) / border);
    // Bottom (excluding corners)
    const bottomSegments = Math.floor((width - (border * 2)) / border);
    // Left side (excluding corners)
    const leftSegments = Math.floor((height - (border * 2)) / border);

    this.timer.totalSegments = topSegments + rightSegments + bottomSegments + leftSegments;
    this.timer.elapsed = 0;
    this.timer.filledSegments = 0;
    this.timer.isActive = true; // Reactivate timer for new level
  }

  /**
   * Update timer - fills one segment per second
   */
  updateTimer(dt) {
    // Don't update if timer is not active
    if (!this.timer.isActive) {
      return;
    }

    this.timer.elapsed += dt;

    // Fill one segment per second
    const targetSegments = Math.floor(this.timer.elapsed);

    if (targetSegments > this.timer.filledSegments && targetSegments <= this.timer.totalSegments) {
      this.timer.filledSegments = targetSegments;
    }

    // Check if time is up
    if (this.timer.filledSegments >= this.timer.totalSegments) {
      // Time's up - start defeat animation
      if (this.player && !this.player.isDefeated) {
        this.player.startDefeatAnimation(this);
      }
    }
  }

  /**
   * Spawn entities defined in the level
   */
  spawnLevelEntities() {
    const entities = this.levelManager.getEntities();
    entities.forEach(entityData => {
      this.entityManager.spawnFromData(entityData, this.levelManager);
    });
  }

  /**
   * Start the game loop
   */
  start() {
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  /**
   * Main game loop using fixed timestep
   */
  gameLoop(currentTime) {
    this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulator += deltaTime;

    // Handle input for state changes
    this.handleStateInput();

    // Fixed timestep updates
    while (this.accumulator >= this.timestep) {
      if (this.state.currentState === GameState.PLAYING) {
        this.update(this.timestep / 1000);
      }
      this.accumulator -= this.timestep;
    }

    // Render
    this.render();
  }

  /**
   * Handle input for state transitions
   */
  handleStateInput() {
    const input = this.inputManager.getState();

    switch (this.state.currentState) {
      case GameState.MENU:
        if (input.actionJustPressed) {
          this.init();
        }
        break;

      case GameState.GAME_OVER:
      case GameState.VICTORY:
        if (input.actionJustPressed) {
          this.init();
        }
        break;

      case GameState.LEVEL_COMPLETE:
        if (input.actionJustPressed) {
          this.continueToNextLevel();
        }
        break;

      case GameState.PLAYING:
        // Check for pause (P key)
        if (this.inputManager.keys['p'] || this.inputManager.keys['P']) {
          if (!this.pauseKeyPressed) {
            this.togglePause();
            this.pauseKeyPressed = true;
          }
        } else {
          this.pauseKeyPressed = false;
        }
        break;

      case GameState.PAUSED:
        if (this.inputManager.keys['p'] || this.inputManager.keys['P']) {
          if (!this.pauseKeyPressed) {
            this.togglePause();
            this.pauseKeyPressed = true;
          }
        } else {
          this.pauseKeyPressed = false;
        }
        break;
    }
  }

  /**
   * Update game logic
   */
  update(dt) {
    // Check if player exists
    if (!this.player) return;

    // Update timer
    this.updateTimer(dt);

    // Update level animations (blocks moving)
    this.levelManager.update(dt);

    // Get input state
    const input = this.inputManager.getState();

    // Block player input if blocks are animating
    if (this.levelManager.isAnimating()) {
      // Clear input to prevent player from moving
      input.up = false;
      input.down = false;
      input.left = false;
      input.right = false;
    }

    // Store previous moving state
    const wasMoving = this.player.isMoving;

    // Check if player has time freeze power-up
    const ballsFrozen = this.player.hasPowerUp && this.player.powerUpType === 'time';

    // Freeze/unfreeze balls
    const balls = this.entityManager.getByType('ball');
    balls.forEach(ball => {
      ball.frozen = ballsFrozen;
    });

    // Update entities
    this.entityManager.update(dt, input, this.levelManager, this);

    // Check collisions only when player just finished moving
    const justStoppedMoving = wasMoving && !this.player.isMoving;

    // Always check collision with balls (dangerous)
    this.checkBallCollisions();

    // Check collectibles only when player has finished moving
    if (justStoppedMoving || !this.player.isMoving) {
      this.checkCollectibleCollisions();
    }

    // Check win/lose conditions
    this.checkGameState();
  }

  /**
   * Check collisions with balls (always checked)
   */
  checkBallCollisions() {
    const player = this.player;

    // Player is invulnerable during teleportation or defeat animation
    if (player.isTeleporting || player.isDefeated) {
      return;
    }

    const balls = this.entityManager.getByType('ball');

    balls.forEach(ball => {
      if (this.isColliding(player, ball)) {
        ball.onCollideWithPlayer(player, this);
      }
    });
  }

  /**
   * Check collisions with collectibles (only when not moving)
   */
  checkCollectibleCollisions() {
    const player = this.player;

    // Don't collect items if player is defeated
    if (player.isDefeated) {
      return;
    }

    const collectibles = [
      ...this.entityManager.getByType('woodstock'),
      ...this.entityManager.getByType('powerup'),
    ];

    collectibles.forEach(entity => {
      if (this.isColliding(player, entity)) {
        entity.onCollideWithPlayer(player, this);
      }
    });
  }

  /**
   * Check if two entities are colliding
   */
  isColliding(entity1, entity2) {
    // Use hitbox offsets for more precise collision
    const e1 = this.getHitbox(entity1);
    const e2 = this.getHitbox(entity2);

    return (
      e1.x < e2.x + e2.width &&
      e1.x + e1.width > e2.x &&
      e1.y < e2.y + e2.height &&
      e1.y + e1.height > e2.y
    );
  }

  /**
   * Get hitbox for entity with offsets
   */
  getHitbox(entity) {
    // Balls have a smaller hitbox (centered)
    if (entity.type === 'ball') {
      const offset = 4;
      return {
        x: entity.x + offset,
        y: entity.y + offset,
        width: entity.width - offset * 2,
        height: entity.height - offset * 2,
      };
    }

    // Woodstock and powerups have smaller hitbox
    if (entity.type === 'woodstock' || entity.type === 'powerup') {
      const offset = 3;
      return {
        x: entity.x + offset,
        y: entity.y + offset,
        width: entity.width - offset * 2,
        height: entity.height - offset * 2,
      };
    }

    // Default: use full entity size
    return {
      x: entity.x,
      y: entity.y,
      width: entity.width,
      height: entity.height,
    };
  }

  /**
   * Check win/lose conditions
   */
  checkGameState() {
    // Don't check until level is ready
    if (!this.state.levelReady) return;

    // Check if player collected all Woodstocks
    const collectibles = this.entityManager.getByType('woodstock');
    if (collectibles.length === 0) {
      const player = this.entityManager.getByType('player')[0];

      // Start victory animation if not already started
      if (player && !player.isVictorious) {
        // Stop the timer
        this.timer.isActive = false;

        // Remove any active power-ups (which stops their music)
        if (player.hasPowerUp) {
          player.hasPowerUp = false;
          player.powerUpType = null;
          player.speed = CONFIG.PLAYER_SPEED;
        }

        // Play level clear music immediately
        const clearMusic = this.levelManager.currentLevel?.clearMusic;
        if (clearMusic) {
          this.audioManager.playMusic(clearMusic);
        }

        player.startVictoryAnimation();

        // Explode all remaining balls
        this.explodeAllBalls();

        // Complete level after victory animation duration
        setTimeout(() => {
          this.levelComplete();
        }, player.victoryDuration * 1000);
      }
    }
  }

  /**
   * Explode all balls on the map
   */
  explodeAllBalls() {
    const balls = this.entityManager.getByType('ball');

    for (const ball of balls) {
      // Create explosion particles for each ball
      ball.createExplosionParticles(this);
      // Destroy the ball
      ball.destroy();
    }
  }

  /**
   * Render the game
   */
  render() {
    this.renderer.clear();

    // Only render game if not in menu
    if (this.state.currentState !== GameState.MENU && this.levelManager.currentLevel) {
      // Draw timer border
      this.renderer.drawTimerBorder(this.spriteManager, this.timer.filledSegments);

      // Save context and translate for game area
      this.renderer.ctx.save();
      this.renderer.ctx.translate(CONFIG.TIMER_BORDER, CONFIG.TIMER_BORDER);

      // Render level
      this.levelManager.render(this.renderer, this.spriteManager);

      // Render entities
      this.entityManager.render(this.renderer, this.spriteManager);

      // Render grid overlay
      this.renderer.drawGrid();

      // Restore context
      this.renderer.ctx.restore();
    }

    // Render UI overlays
    this.uiManager.render();
  }

  /**
   * Update UI elements
   */
  updateUI() {
    document.getElementById('score').textContent = `Score: ${this.state.score}`;
    document.getElementById('lives').textContent = `Lives: ${this.state.lives}`;
    document.getElementById('level').textContent = `Level: ${this.state.level}`;
  }

  /**
   * Add score
   */
  addScore(points) {
    this.state.score += points;
    this.updateUI();
  }

  /**
   * Remove a life
   */
  loseLife() {
    this.state.lives--;
    this.updateUI();

    if (this.state.lives > 0) {
      this.respawnPlayer();
    } else {
      this.gameOver();
    }
  }

  /**
   * Respawn the player at the start position
   */
  respawnPlayer() {
    // Clear all entities except the player will be removed
    this.entityManager.clear();

    // Respawn all level entities
    this.spawnLevelEntities();

    // Recreate player at start position
    const startPos = this.levelManager.getStartPosition();
    this.player = new Player(startPos.x, startPos.y);
    this.entityManager.add(this.player);

    // Reset timer for retry
    this.initTimer();

    // Restart level music
    const levelMusic = this.levelManager.currentLevel?.music;
    if (levelMusic) {
      this.audioManager.playMusic(levelMusic);
    }
  }

  /**
   * Mark level as complete
   */
  levelComplete() {
    this.state.currentState = GameState.LEVEL_COMPLETE;
    this.uiManager.setState(GameState.LEVEL_COMPLETE);
  }

  /**
   * Continue to next level after level complete screen
   */
  async continueToNextLevel() {
    this.state.level++;
    this.state.levelReady = false;

    try {
      this.entityManager.clear();
      await this.levelManager.loadLevel(this.state.level);

      const startPos = this.levelManager.getStartPosition();
      this.player = new Player(startPos.x, startPos.y);
      this.entityManager.add(this.player);

      this.spawnLevelEntities();

      // Mark level as ready
      this.state.levelReady = true;

      // Initialize timer for new level
      this.initTimer();

      // Play level music if defined
      const levelMusic = this.levelManager.currentLevel?.music;
      if (levelMusic) {
        this.audioManager.playMusic(levelMusic);
      }

      this.updateUI();

      this.state.currentState = GameState.PLAYING;
      this.uiManager.setState(GameState.PLAYING);
    } catch (error) {
      // No more levels, player wins!
      this.victory();
    }
  }

  /**
   * Game over
   */
  gameOver() {
    this.state.currentState = GameState.GAME_OVER;
    this.uiManager.setState(GameState.GAME_OVER);
    console.log('Game Over! Final Score:', this.state.score);
  }

  /**
   * Victory (all levels complete)
   */
  victory() {
    this.state.currentState = GameState.VICTORY;
    this.uiManager.setState(GameState.VICTORY);
    console.log('Victory! Final Score:', this.state.score);
  }

  /**
   * Pause/unpause the game
   */
  togglePause() {
    if (this.state.currentState === GameState.PLAYING) {
      this.state.currentState = GameState.PAUSED;
      this.uiManager.setState(GameState.PAUSED);
    } else if (this.state.currentState === GameState.PAUSED) {
      this.state.currentState = GameState.PLAYING;
      this.uiManager.setState(GameState.PLAYING);
    }
  }

  /**
   * Stop the game loop
   */
  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
