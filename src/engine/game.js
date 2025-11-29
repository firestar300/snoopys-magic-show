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
import { DevConsole } from '../ui/dev-console.js';

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
    this.devConsole = CONFIG.DEV_MODE ? new DevConsole(this) : null;

    // Load sprites and audio
    this.spriteManager.loadAll();
    this.audioManager.loadAll();

    // Dev console key listener
    if (CONFIG.DEV_MODE) {
      let consoleKeyPressed = false;

      window.addEventListener('keydown', (e) => {
        // Toggle console with CMD+Shift (Mac) or CTRL+Shift (Windows/Linux)
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && !consoleKeyPressed) {
          e.preventDefault();
          this.devConsole.toggle();
          consoleKeyPressed = true;
          return;
        }

        // Handle console input if open
        if (this.devConsole.isOpen) {
          this.devConsole.handleInput(e);
        }
      });

      window.addEventListener('keyup', (e) => {
        // Reset flag when modifier keys are released
        if (e.key === 'Meta' || e.key === 'Control' || e.key === 'Shift') {
          consoleKeyPressed = false;
        }
      });
    }

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

    // Ready? Go! state
    this.readyGo = {
      isActive: false,
      timer: 0,
      duration: 1.0, // 1 second
    };

    // Input tracking
    this.pauseKeyPressed = false;
    this.godModeKeyPressed = false;
    this.levelKeyPressed = false;
    this.hideDevInfoKeyPressed = false;
    this.restartKeyPressed = false;

    // Dev mode UI visibility (hidden by default, press H to show)
    this.showDevInfo = false;

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
    // Remove power-ups from current player before resetting
    if (this.player && this.player.hasPowerUp) {
      this.player.removePowerUp(this);
    }

    // Reset state
    this.state.score = 0;
    this.state.lives = 3;
    this.state.level = CONFIG.DEV_MODE ? 0 : 1; // Start at level 0 in dev mode, level 1 otherwise
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

    // Start "Ready? Go!" animation
    this.startReadyGo();

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
   * Start "Ready? Go!" animation
   */
  startReadyGo() {
    this.readyGo.isActive = true;
    this.readyGo.timer = 0;
    this.timer.isActive = false; // Pause timer during Ready? Go!
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
    // Block all game inputs when dev console is open
    if (this.devConsole && this.devConsole.isOpen) {
      return;
    }

    const input = this.inputManager.getState();

    switch (this.state.currentState) {
      case GameState.MENU:
        if (input.actionJustPressed || input.pauseJustPressed) {
          this.init();
        }
        break;

      case GameState.GAME_OVER:
      case GameState.VICTORY:
        if (input.actionJustPressed || input.pauseJustPressed) {
          this.init();
        }
        break;

      case GameState.LEVEL_COMPLETE:
        // Only allow continuing when time bonus animation is finished
        if ((input.actionJustPressed || input.pauseJustPressed) && !this.uiManager.timeBonusAnimation.active) {
          this.continueToNextLevel();
        }
        break;

      case GameState.PLAYING:
        // Check for pause (P key, Escape, or gamepad Start button)
        // But don't allow pause during:
        // - "Ready? Go!" animation
        // - Snoopy's victory animation
        // - Snoopy's defeat animation
        const canPause = this.player &&
                        !this.readyGo?.isActive &&
                        !this.player?.isVictorious &&
                        !this.player?.isDefeated;

        if (canPause) {
          if (this.inputManager.keys['p'] || this.inputManager.keys['P'] || this.inputManager.keys['Escape'] || input.pause) {
            if (!this.pauseKeyPressed) {
              this.togglePause();
              this.pauseKeyPressed = true;
            }
          } else {
            this.pauseKeyPressed = false;
          }
        }

        // Check for restart (R key or L1/LB button) - trigger defeat animation
        // Allow restart during gameplay (not during animations)
        const canRestart = this.player &&
                          !this.readyGo.isActive &&
                          !this.player.isVictorious &&
                          !this.player.isDefeated;

        if (canRestart) {
          if (this.inputManager.keys['r'] || this.inputManager.keys['R'] || input.restart) {
            if (!this.restartKeyPressed) {
              // Trigger defeat animation to restart the level
              this.player.startDefeatAnimation(this);
              this.restartKeyPressed = true;
            }
          } else {
            this.restartKeyPressed = false;
          }
        }
        break;

      case GameState.PAUSED:
        // Check for unpause (P key, Escape, or gamepad Start button)
        if (this.inputManager.keys['p'] || this.inputManager.keys['P'] || this.inputManager.keys['Escape'] || input.pause) {
          if (!this.pauseKeyPressed) {
            this.togglePause();
            this.pauseKeyPressed = true;
          }
        } else {
          this.pauseKeyPressed = false;
        }
        break;
    }

    // Dev mode shortcuts for quick level switching
    if (CONFIG.DEV_MODE && (this.state.currentState === GameState.PLAYING || this.state.currentState === GameState.PAUSED)) {
      // Check if any level key (0-9) is pressed
      let levelKeyCurrentlyPressed = false;
      for (let i = 0; i <= 9; i++) {
        if (this.inputManager.keys[i.toString()]) {
          levelKeyCurrentlyPressed = true;
          if (!this.levelKeyPressed) {
            this.loadDevLevel(i);
            this.levelKeyPressed = true;
          }
          break;
        }
      }

      // Reset flag when no level key is pressed
      if (!levelKeyCurrentlyPressed) {
        this.levelKeyPressed = false;
      }

      // God mode toggle with G key
      if (this.inputManager.keys['g'] || this.inputManager.keys['G']) {
        if (!this.godModeKeyPressed) {
          this.toggleGodMode();
          this.godModeKeyPressed = true;
        }
      } else {
        this.godModeKeyPressed = false;
      }

      // Toggle dev info visibility with H key
      if (this.inputManager.keys['h'] || this.inputManager.keys['H']) {
        if (!this.hideDevInfoKeyPressed) {
          this.showDevInfo = !this.showDevInfo;
          this.hideDevInfoKeyPressed = true;
        }
      } else {
        this.hideDevInfoKeyPressed = false;
      }
    }
  }

  /**
   * Update game logic
   */
  update(dt) {
    // Check if player exists
    if (!this.player) return;

    // Update "Ready? Go!" animation
    if (this.readyGo.isActive) {
      this.readyGo.timer += dt;

      if (this.readyGo.timer >= this.readyGo.duration) {
        // Animation finished, resume game
        this.readyGo.isActive = false;
        this.timer.isActive = true;
      }

      // Block all updates during "Ready? Go!"
      return;
    }

    // Update timer
    this.updateTimer(dt);

    // Update level animations (blocks moving), pass player for toggle block logic
    this.levelManager.update(dt, this.player, this.entityManager);

    // Get input state
    const input = this.inputManager.getState();

    // Block all input if dev console is open
    if (CONFIG.DEV_MODE && this.devConsole && this.devConsole.isOpen) {
      input.up = false;
      input.down = false;
      input.left = false;
      input.right = false;
      input.action = false;
      return; // Skip all game updates
    }

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

    // Check collectibles BEFORE update if player is not moving
    // This ensures collectibles on arrow tiles can be collected
    if (!this.player.isMoving) {
      this.checkCollectibleCollisions();
    }

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

    // Check collectibles again if player just stopped moving
    if (justStoppedMoving) {
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
        // Stop the timer (we'll animate it during level complete screen)
        this.timer.isActive = false;

        // Remove any active power-ups (stop their music without restarting level music)
        if (player.hasPowerUp) {
          player.removePowerUp(this, false); // false = don't restart level music
        }

        // Play level-specific clear music during victory animation
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

      // Render level (static tiles)
      this.levelManager.render(this.renderer, this.spriteManager);

      // Render entities
      this.entityManager.render(this.renderer, this.spriteManager);

      // Render animating blocks on top of entities (so they stay in foreground)
      this.levelManager.renderAnimatingBlocks(this.renderer, this.spriteManager);

      // Render grid overlay
      this.renderer.drawGrid();

      // Restore context
      this.renderer.ctx.restore();

      // Render "Ready? Go!" if active
      if (this.readyGo.isActive) {
        const ctx = this.renderer.ctx;
        const sprite = this.spriteManager.sprites.ready_go;

        if (sprite) {
          // Calculate center position (2x scale)
          const spriteWidth = 128;  // 64 * 2
          const spriteHeight = 16;   // 8 * 2
          const x = (CONFIG.CANVAS_WIDTH - spriteWidth) / 2;
          const y = (CONFIG.CANVAS_HEIGHT - spriteHeight) / 2;

          this.spriteManager.drawReadyGo(this.renderer, x, y, spriteWidth, spriteHeight);
        }
      }

      // Dev mode: Display level info and god mode
      if (CONFIG.DEV_MODE && this.showDevInfo) {
        const ctx = this.renderer.ctx;
        ctx.save();

        // Level info box
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 180, 112);
        ctx.fillStyle = CONFIG.COLORS.LIGHT;
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`LEVEL: ${this.state.level}`, 20, 28);

        // Snoopy position
        if (this.player) {
          const snoopyX = this.player.getGridX();
          const snoopyY = this.player.getGridY();
          ctx.fillText(`SNOOPY: (${snoopyX}, ${snoopyY})`, 20, 42);
        }

        ctx.fillText(`Press 0-9 to jump`, 20, 56);
        ctx.fillText(`Press G for God Mode`, 20, 70);
        ctx.fillText(`Press H to hide`, 20, 84);
        ctx.fillText(`Press CMD+SHIFT for console`, 20, 98);

        // God mode indicator
        let yOffset = 118;
        if (this.player && this.player.godMode) {
          ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
          ctx.fillRect(10, yOffset, 100, 24);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
          ctx.font = 'bold 14px "Courier New", monospace';
          ctx.fillText(`GOD MODE`, 20, yOffset + 17);
          yOffset += 28;
        }

        // Noclip mode indicator
        if (this.player && this.player.noclipMode) {
          ctx.fillStyle = 'rgba(138, 43, 226, 0.9)';
          ctx.fillRect(10, yOffset, 100, 24);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = 'bold 14px "Courier New", monospace';
          ctx.fillText(`NOCLIP`, 20, yOffset + 17);
        }

        ctx.restore();
      }
    }

    // Render UI overlays
    this.uiManager.render();

    // Render dev console (always on top)
    if (CONFIG.DEV_MODE && this.devConsole) {
      this.devConsole.render(this.renderer.ctx);
    }
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
  async respawnPlayer() {
    // Remove power-ups from current player before clearing (safety check)
    if (this.player && this.player.hasPowerUp) {
      this.player.removePowerUp(this);
    }

    // Clear all entities
    this.entityManager.clear();

    // Reload the level to reset all tiles (toggle blocks, etc.)
    await this.levelManager.loadLevel(this.state.level);

    // Respawn all level entities
    this.spawnLevelEntities();

    // Recreate player at start position
    const startPos = this.levelManager.getStartPosition();
    this.player = new Player(startPos.x, startPos.y);
    this.entityManager.add(this.player);

    // Reset timer for retry
    this.initTimer();

    // Start "Ready? Go!" animation
    this.startReadyGo();

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
    this.uiManager.setState(GameState.LEVEL_COMPLETE, {
      game: this
    });
  }

  /**
   * Continue to next level after level complete screen
   */
  async continueToNextLevel() {
    this.state.level++;
    this.state.levelReady = false;

    // Remove power-ups from current player before clearing
    if (this.player && this.player.hasPowerUp) {
      this.player.removePowerUp(this);
    }

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

      // Start "Ready? Go!" animation
      this.startReadyGo();

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
    // Play game over music
    this.audioManager.playMusic('game-over');

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
      // Play pause sound
      this.audioManager.playSfx('pause');
      // Pause music
      this.audioManager.pauseMusic();
    } else if (this.state.currentState === GameState.PAUSED) {
      this.state.currentState = GameState.PLAYING;
      this.uiManager.setState(GameState.PLAYING);
      // Resume music (no sound effect on unpause)
      this.audioManager.resumeMusic();
    }
  }

  /**
   * Toggle god mode (dev mode only)
   */
  toggleGodMode() {
    if (!CONFIG.DEV_MODE || !this.player) return;

    this.player.godMode = !this.player.godMode;
    console.log(`[DEV] God Mode: ${this.player.godMode ? 'ON' : 'OFF'}`);
  }

  /**
   * Load a specific level in dev mode
   */
  async loadDevLevel(levelNumber) {
    console.log(`[DEV] Loading level ${levelNumber}...`);

    // Remove power-ups from current player before clearing
    if (this.player && this.player.hasPowerUp) {
      this.player.removePowerUp(this);
    }

    // Stop any current music
    this.audioManager.stopMusic();

    // Clear entities
    this.entityManager.clear();

    // Reset state (important when coming from menu)
    this.state.score = 0;
    this.state.lives = 3;
    this.state.level = levelNumber;
    this.state.levelReady = false;
    this.state.currentState = GameState.PLAYING;
    this.uiManager.setState(GameState.PLAYING);

    try {
      // Load the level
      await this.levelManager.loadLevel(levelNumber);

      // Create player
      const startPos = this.levelManager.getStartPosition();
      this.player = new Player(startPos.x, startPos.y);
      this.entityManager.add(this.player);

      // Spawn entities from level
      this.spawnLevelEntities();

      // Mark level as ready
      this.state.levelReady = true;

      // Reset timer
      this.initTimer();

      // Start "Ready? Go!" animation
      this.startReadyGo();

      // Play level music if defined
      const levelMusic = this.levelManager.currentLevel?.music;
      if (levelMusic) {
        this.audioManager.playMusic(levelMusic);
      }

      // Update UI
      this.updateUI();

      console.log(`[DEV] Level ${levelNumber} loaded successfully!`);
    } catch (error) {
      console.error(`[DEV] Failed to load level ${levelNumber}:`, error);
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
