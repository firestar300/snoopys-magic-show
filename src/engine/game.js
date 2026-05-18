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
import { devLog, devWarn, devError } from '../utils/dev-logger.js';
import { getLevelFromPassword, cyclePasswordChar } from '../data/gb-passwords.js';
import { takeQueuedWorldJsonString } from '../level/editor-launch-bridge.js';
import { powerState } from '../power-state.js';
import { validateImportedLevel } from '../level/validate-imported-level.js';

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
      highScore: this.loadHighScore(), // Load from localStorage
      lives: 3,
      level: 1,
      currentState: GameState.MENU,
      levelReady: false,
      isNewHighScore: false, // Flag to show "NEW RECORD!" message
      /** When true, custom JSON campaign is active (see importedCampaignLevels). */
      isCustomImportedLevel: false,
    };

    /** @type {object[] | null} Cloned levels from last import (single-level = length 1). */
    this.importedCampaignLevels = null;
    /** 0-based index into importedCampaignLevels while playing an import. */
    this.importedCampaignIndex = 0;
    /** Display name for the active imported world (used on the custom complete menu). */
    this.importedCampaignWorldName = '';

    // Life bonus tracking (every 50,000 points)
    this.lastLifeBonusThreshold = 0;

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
    /** Prevents double level advance while continueToNextLevel() is in progress. */
    this.isContinuingToNextLevel = false;
    /** When true, do not start title screen music on boot (editor / custom launch). */
    this.skipTitleMusicOnStart = false;

    // Dev mode UI visibility (hidden by default, press H to show)
    this.showDevInfo = false;

    // Game loop
    this.lastTime = 0;
    this.accumulator = 0;
    this.timestep = 1000 / CONFIG.FPS;
    this.animationFrameId = null;

    this.setupCustomLevelFileImport();
    this.tryConsumeQueuedEditorWorld();

    // Title music only on the title screen (not after editor "Play now" or custom boot)
    if (this.state.currentState === GameState.MENU && !this.skipTitleMusicOnStart) {
      this.audioManager.playMusic('title');
    }

    // Start game loop immediately (menu will show first)
    this.start();
  }

  /**
   * Show import feedback under the page HUD (DOM).
   * @param {string} message
   * @param {'neutral' | 'error' | 'success'} [variant]
   */
  setCustomLevelImportStatus(message, variant = 'neutral') {
    const el = document.getElementById('custom-level-import-status');
    if (!el) return;
    el.textContent = message;
    if (variant === 'error') el.dataset.variant = 'error';
    else if (variant === 'success') el.dataset.variant = 'success';
    else delete el.dataset.variant;
  }

  /**
   * If the level editor stored a world JSON in localStorage, validate and start play.
   */
  tryConsumeQueuedEditorWorld() {
    const raw = powerState.takePendingEditorWorldJson() ?? takeQueuedWorldJsonString();
    if (!raw) return;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.setCustomLevelImportStatus('Editor "Play now" payload was not valid JSON.', 'error');
      return;
    }

    const result = validateImportedLevel(parsed);
    if (!result.ok) {
      const lines = result.errors.slice(0, 4);
      const extra = result.errors.length > 4 ? ` (+${result.errors.length - 4} more)` : '';
      this.setCustomLevelImportStatus(lines.join(' | ') + extra, 'error');
      if (this.audioManager) this.audioManager.playSfx('block-break');
      return;
    }

    this.setCustomLevelImportStatus('');
    this.inputManager.resetState();
    this.skipTitleMusicOnStart = true;
    void this.initFromCustomCampaign(result.levels, result.worldName).catch((err) => devError(err));
  }

  /**
   * Hidden file input: parse JSON, validate against level schema + import rules, then start play.
   */
  setupCustomLevelFileImport() {
    const fileInput = document.getElementById('custom-level-import');
    if (!fileInput) return;

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        let parsed;
        try {
          parsed = JSON.parse(String(reader.result));
        } catch {
          this.setCustomLevelImportStatus('Invalid JSON file.', 'error');
          if (this.audioManager) this.audioManager.playSfx('block-break');
          return;
        }

        const result = validateImportedLevel(parsed);
        if (!result.ok) {
          const lines = result.errors.slice(0, 4);
          const extra = result.errors.length > 4 ? ` (+${result.errors.length - 4} more)` : '';
          this.setCustomLevelImportStatus(lines.join(' | ') + extra, 'error');
          if (this.audioManager) this.audioManager.playSfx('block-break');
          return;
        }

        this.setCustomLevelImportStatus('');
        this.inputManager.resetState();
        void this.initFromCustomCampaign(result.levels, result.worldName).catch((err) => devError(err));
      };

      reader.onerror = () => {
        this.setCustomLevelImportStatus('Could not read file.', 'error');
        if (this.audioManager) this.audioManager.playSfx('block-break');
      };

      reader.readAsText(file);
    });
  }

  clearCustomImportedLevel() {
    this.state.isCustomImportedLevel = false;
    this.importedCampaignLevels = null;
    this.importedCampaignIndex = 0;
    this.importedCampaignWorldName = '';
  }

  /**
   * Check if game is running
   */
  isRunning() {
    return this.animationFrameId !== null;
  }

  /**
   * Initialize/Reset the game
   */
  async init() {
    // Remove power-ups from current player before resetting
    if (this.player && this.player.hasPowerUp) {
      this.player.removePowerUp(this);
    }

    this.clearCustomImportedLevel();
    this.setCustomLevelImportStatus('');

    // Reset state
    this.state.score = 0;
    this.state.lives = 3;
    this.state.level = CONFIG.DEV_MODE ? 0 : 1; // Start at level 0 in dev mode, level 1 otherwise
    this.state.currentState = GameState.PLAYING;
    this.state.levelReady = false;
    this.state.isNewHighScore = false; // Reset high score flag
    this.lastLifeBonusThreshold = 0; // Reset life bonus tracking
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
   * Start the game at a level reached via the original GB password screen.
   * @param {number} levelNumber
   */
  async initFromPasswordLevel(levelNumber) {
    if (this.player && this.player.hasPowerUp) {
      this.player.removePowerUp(this);
    }

    this.clearCustomImportedLevel();
    this.setCustomLevelImportStatus('');

    this.state.score = 0;
    this.state.lives = 3;
    this.state.level = levelNumber;
    this.state.currentState = GameState.PLAYING;
    this.state.levelReady = false;
    this.state.isNewHighScore = false;
    this.lastLifeBonusThreshold = 0;
    this.uiManager.setState(GameState.PLAYING);

    this.entityManager.clear();

    await this.levelManager.loadLevel(this.state.level);

    const startPos = this.levelManager.getStartPosition();
    this.player = new Player(startPos.x, startPos.y);
    this.entityManager.add(this.player);

    this.spawnLevelEntities();

    this.state.levelReady = true;

    this.initTimer();
    this.startReadyGo();

    const levelMusic = this.levelManager.currentLevel?.music;
    if (levelMusic) {
      this.audioManager.playMusic(levelMusic);
    }

    this.updateUI();
  }

  /**
   * Load current imported stage into LevelManager, spawn entities, timer, Ready Go, music.
   */
  bootstrapCurrentImportedStage() {
    this.state.levelReady = false;
    if (this.player && this.player.hasPowerUp) {
      this.player.removePowerUp(this);
    }

    this.entityManager.clear();

    const level = this.importedCampaignLevels[this.importedCampaignIndex];
    this.levelManager.loadLevelFromData(level);

    const startPos = this.levelManager.getStartPosition();
    this.player = new Player(startPos.x, startPos.y);
    this.entityManager.add(this.player);

    this.spawnLevelEntities();

    this.state.levelReady = true;
    this.state.level = this.importedCampaignIndex + 1;

    this.initTimer();
    this.startReadyGo();

    const levelMusic = this.levelManager.currentLevel?.music;
    if (levelMusic) {
      this.audioManager.playMusic(levelMusic);
    }

    this.state.currentState = GameState.PLAYING;
    this.uiManager.setState(GameState.PLAYING);
    this.updateUI();
  }

  /**
   * Start play from validated custom level(s): one level object or a world with multiple stages.
   * @param {object[]} levels - Non-empty cloned levels from {@link validateImportedLevel}
   * @param {string} [worldName] - World display name when applicable
   */
  async initFromCustomCampaign(levels, worldName = '') {
    if (!levels?.length) return;

    this.skipTitleMusicOnStart = true;
    this.audioManager.stopMusic();

    if (this.player && this.player.hasPowerUp) {
      this.player.removePowerUp(this);
    }

    this.state.isCustomImportedLevel = true;
    this.importedCampaignLevels = levels;
    this.importedCampaignIndex = 0;
    this.importedCampaignWorldName = typeof worldName === 'string' ? worldName.trim() : '';

    this.state.score = 0;
    this.state.lives = 3;
    this.state.currentState = GameState.PLAYING;
    this.state.levelReady = false;
    this.state.isNewHighScore = false;
    this.lastLifeBonusThreshold = 0;
    this.uiManager.setState(GameState.PLAYING);

    this.bootstrapCurrentImportedStage();

    const n = levels.length;
    const w = typeof worldName === 'string' ? worldName.trim() : '';
    const firstName = typeof levels[0].name === 'string' ? levels[0].name.trim() : '';
    if (n > 1) {
      this.setCustomLevelImportStatus(w ? `Loaded world "${w}" (${n} stages)` : `Loaded ${n} stages`, 'success');
    } else {
      const label = w || firstName || 'Custom level';
      this.setCustomLevelImportStatus(`Loaded: ${label}`, 'success');
    }
  }

  /**
   * Reload tiles for the current run (numbered level file or imported JSON snapshot).
   * @param {boolean} [useFallback=true] - Only used for built-in levels.
   */
  async loadLevelForCurrentRun(useFallback = true) {
    if (this.state.isCustomImportedLevel && this.importedCampaignLevels?.length) {
      this.levelManager.loadLevelFromData(this.importedCampaignLevels[this.importedCampaignIndex]);
      return;
    }
    await this.levelManager.loadLevel(this.state.level, useFallback);
  }

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
   * Title menu: main options or password entry
   * @param {object} input - Current frame input from InputManager.getState()
   */
  handleMenuInput(input) {
    const ui = this.uiManager;

    if (ui.menuScreen === 'custom_complete') {
      const menuMax = 1;
      if (input.upJustPressed) ui.menuSelection = Math.max(0, ui.menuSelection - 1);
      if (input.downJustPressed) ui.menuSelection = Math.min(menuMax, ui.menuSelection + 1);
      if (input.actionJustPressed || input.pauseJustPressed) {
        this.inputManager.resetState();
        if (ui.menuSelection === 0) {
          void this.replayCustomCampaign().catch((err) => devError(err));
        } else {
          void this.startNewGameFromCustomComplete().catch((err) => devError(err));
        }
      }
      return;
    }

    if (ui.menuScreen === 'main') {
      const menuMax = 1;
      if (input.upJustPressed) ui.menuSelection = Math.max(0, ui.menuSelection - 1);
      if (input.downJustPressed) ui.menuSelection = Math.min(menuMax, ui.menuSelection + 1);
      if (input.actionJustPressed || input.pauseJustPressed) {
        if (ui.menuSelection === 0) {
          void this.init().catch((err) => devError(err));
        } else {
          this.inputManager.resetState();
          ui.menuScreen = 'password';
          ui.passwordSlots = ['', '', '', ''];
          ui.passwordCursor = 0;
        }
      }
      return;
    }

    if (input.keysJustPressed.includes('Escape') || this.inputManager.isGamepadButtonJustPressed(8)) {
      this.inputManager.resetState();
      ui.menuScreen = 'main';
      return;
    }

    if (input.leftJustPressed && ui.passwordCursor > 0) ui.passwordCursor -= 1;
    if (input.rightJustPressed && ui.passwordCursor < 3) ui.passwordCursor += 1;

    if (input.upJustPressed) {
      ui.passwordSlots[ui.passwordCursor] = cyclePasswordChar(ui.passwordSlots[ui.passwordCursor], -1);
    }
    if (input.downJustPressed) {
      ui.passwordSlots[ui.passwordCursor] = cyclePasswordChar(ui.passwordSlots[ui.passwordCursor], 1);
    }

    if (input.keysJustPressed.includes('Backspace')) {
      if (ui.passwordSlots[ui.passwordCursor]) {
        ui.passwordSlots[ui.passwordCursor] = '';
      } else if (ui.passwordCursor > 0) {
        ui.passwordCursor -= 1;
        ui.passwordSlots[ui.passwordCursor] = '';
      }
    } else {
      for (const k of input.keysJustPressed) {
        if (k.length === 1 && /^[a-zA-Z0-9]$/.test(k)) {
          ui.passwordSlots[ui.passwordCursor] = k.toUpperCase();
          if (ui.passwordCursor < 3) ui.passwordCursor += 1;
        }
      }
    }

    const pwdComplete = ui.passwordSlots.every((s) => s.length === 1);
    const submit =
      pwdComplete &&
      (input.keysJustPressed.includes('Enter') ||
        input.keysJustPressed.includes(' ') ||
        this.inputManager.isGamepadButtonJustPressed(9));

    if (submit) {
      const code = ui.passwordSlots.join('');
      const level = getLevelFromPassword(code);
      if (level === null) {
        ui.passwordInvalidUntil = performance.now() + 900;
        if (this.audioManager) this.audioManager.playSfx('block-break');
      } else {
        this.inputManager.resetState();
        void this.initFromPasswordLevel(level).catch((err) => devError(err));
      }
    }
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
        this.handleMenuInput(input);
        break;

      case GameState.GAME_OVER:
        if (input.actionJustPressed || input.pauseJustPressed) {
          // Return to title screen instead of restarting the game
          this.state.currentState = GameState.MENU;
          this.uiManager.setState(GameState.MENU);
          // Reset state for potential new game
          this.state.score = 0;
          this.state.lives = 3;
          this.state.level = CONFIG.DEV_MODE ? 0 : 1;
          this.state.isNewHighScore = false;
          this.lastLifeBonusThreshold = 0;
          this.clearCustomImportedLevel();
          // Clear entities
          this.entityManager.clear();
          this.player = null;
        }
        break;

      case GameState.VICTORY:
        // Only allow returning to menu when background scroll animation is finished
        if ((input.actionJustPressed || input.pauseJustPressed) && this.uiManager.endBackgroundScroll.scrollComplete) {
          // Return to title screen instead of restarting the game
          this.state.currentState = GameState.MENU;
          this.uiManager.setState(GameState.MENU);
          // Reset state for potential new game
          this.state.score = 0;
          this.state.lives = 3;
          this.state.level = CONFIG.DEV_MODE ? 0 : 1;
          this.state.isNewHighScore = false;
          this.lastLifeBonusThreshold = 0;
          this.clearCustomImportedLevel();
          // Clear entities
          this.entityManager.clear();
          this.player = null;
        }
        break;

      case GameState.LEVEL_COMPLETE:
        // Only allow continuing when time bonus animation is finished
        if (
          !this.isContinuingToNextLevel &&
          (input.actionJustPressed || input.pauseJustPressed) &&
          !this.uiManager.timeBonusAnimation.active
        ) {
          this.inputManager.resetState();
          void this.continueToNextLevel();
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

    // Freeze/unfreeze Spike entities
    const spikes = this.entityManager.getByType('spike');
    spikes.forEach(spike => {
      spike.frozen = ballsFrozen;
    });

    // Update entities
    this.entityManager.update(dt, input, this.levelManager, this);

    // Check collisions only when player just finished moving
    const justStoppedMoving = wasMoving && !this.player.isMoving;

    // Always check collision with balls (dangerous)
    this.checkBallCollisions();

    // Always check collision with Spike
    this.checkSpikeCollisions();

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
   * Check collisions with Spike (always checked)
   */
  checkSpikeCollisions() {
    const player = this.player;

    // Don't check if player is defeated, victorious, or teleporting
    if (player.isDefeated || player.isVictorious || player.isTeleporting) {
      return;
    }

    // Don't check if player is in god mode (dev only)
    if (CONFIG.DEV_MODE && player.godMode) {
      return;
    }

    const spikes = this.entityManager.getByType('spike');

    spikes.forEach(spike => {
      // Skip if Spike is already defeated or teleporting
      if (spike.isDefeated || spike.isTeleporting) {
        return;
      }

      if (this.isColliding(player, spike)) {
        // If player has invincibility power-up, defeat Spike
        if (player.hasPowerUp && player.powerUpType === 'invincible') {
          spike.defeat();
        } else {
          // If player doesn't have invincibility, Spike defeats Snoopy
          player.startDefeatAnimation(this);

          // Play miss music and stop current music
          this.audioManager.stopMusic();
          this.audioManager.playMusic('miss');
        }
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
      // Skip entities that are already dead (collected in a previous check this frame)
      if (entity.isDead) {
        return;
      }

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

    // Only render game if in PLAYING, PAUSED, or LEVEL_COMPLETE state
    const renderGameStates = [GameState.PLAYING, GameState.PAUSED, GameState.LEVEL_COMPLETE];
    if (renderGameStates.includes(this.state.currentState) && this.levelManager.currentLevel) {
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
        const levelLabel =
          this.state.isCustomImportedLevel && this.importedCampaignLevels?.length > 1
            ? `${this.importedCampaignIndex + 1}/${this.importedCampaignLevels.length}`
            : this.state.isCustomImportedLevel
              ? '★'
              : this.state.level;
        ctx.fillText(`LEVEL: ${levelLabel}`, 20, 28);

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
    const scoreValue = document.querySelector('#score .ui-value');
    const livesValue = document.querySelector('#lives .ui-value');
    const levelValue = document.querySelector('#level .ui-value');
    const highScoreValue = document.querySelector('#high-score .ui-value');

    if (scoreValue) scoreValue.textContent = this.state.score;
    if (livesValue) livesValue.textContent = this.state.lives;
    if (levelValue) {
      if (this.state.isCustomImportedLevel && this.importedCampaignLevels?.length > 1) {
        levelValue.textContent = `${this.importedCampaignIndex + 1}/${this.importedCampaignLevels.length}`;
      } else if (this.state.isCustomImportedLevel) {
        levelValue.textContent = '★';
      } else {
        levelValue.textContent = this.state.level;
      }
    }
    if (highScoreValue) highScoreValue.textContent = this.state.highScore;
  }

  /**
   * Load high score from localStorage
   */
  loadHighScore() {
    try {
      const saved = localStorage.getItem('snoopy-magic-show-highscore');
      return saved ? parseInt(saved, 10) : 0;
    } catch (error) {
      devWarn('Failed to load high score from localStorage:', error);
      return 0;
    }
  }

  /**
   * Save high score to localStorage
   */
  saveHighScore(score) {
    try {
      localStorage.setItem('snoopy-magic-show-highscore', score.toString());
      devLog(`[HIGH SCORE] New record saved: ${score}`);
    } catch (error) {
      devWarn('Failed to save high score to localStorage:', error);
    }
  }

  /**
   * Add score
   */
  addScore(points) {
    const oldScore = this.state.score;
    this.state.score += points;

    // Check if we beat the high score
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      this.state.isNewHighScore = true;
      this.saveHighScore(this.state.highScore);

      devLog(`[HIGH SCORE] New record: ${this.state.highScore}`);
    }

    // Check if player reached a new 50,000 points threshold for bonus life
    const LIFE_BONUS_THRESHOLD = 50000;
    const oldThreshold = Math.floor(oldScore / LIFE_BONUS_THRESHOLD);
    const newThreshold = Math.floor(this.state.score / LIFE_BONUS_THRESHOLD);

    // If we crossed a new threshold, give a bonus life (with celebratory SFX)
    if (newThreshold > oldThreshold) {
      this.gainLife({ playBonusSfx: true });
      devLog(`[BONUS] Life bonus! Score: ${this.state.score} - Lives: ${this.state.lives}`);
    }

    this.updateUI();
  }

  /**
   * Add one life.
   * @param {{ playBonusSfx?: boolean }} [options] - If playBonusSfx is false, skip the bonus-life SFX (e.g. level clear reward).
   */
  gainLife(options = {}) {
    const playBonusSfx = options.playBonusSfx !== false;
    this.state.lives++;
    if (playBonusSfx && this.audioManager) {
      this.audioManager.playSfx('pause');
    }
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
    await this.loadLevelForCurrentRun();

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
   * Show Replay / New Game menu after the last stage of a custom imported world.
   */
  showCustomWorldCompleteMenu() {
    if (this.player && this.player.hasPowerUp) {
      this.player.removePowerUp(this);
    }

    this.entityManager.clear();
    this.player = null;
    this.state.isCustomImportedLevel = false;
    this.state.levelReady = false;

    this.state.currentState = GameState.MENU;
    this.uiManager.setState(GameState.MENU, { menuScreen: 'custom_complete' });
  }

  /**
   * Restart the current custom imported world from the first stage.
   */
  async replayCustomCampaign() {
    const levels = this.importedCampaignLevels;
    if (!levels?.length) {
      return;
    }

    await this.initFromCustomCampaign(levels, this.importedCampaignWorldName);
  }

  /**
   * Leave custom world complete menu and start the built-in campaign at level 1.
   */
  async startNewGameFromCustomComplete() {
    this.inputManager.resetState();
    await this.init();
  }

  /**
   * Mark level as complete
   */
  levelComplete() {
    this.gainLife({ playBonusSfx: false });
    this.updateUI();
    this.state.currentState = GameState.LEVEL_COMPLETE;
    this.uiManager.setState(GameState.LEVEL_COMPLETE, {
      game: this
    });
  }

  /**
   * Continue to next level after level complete screen
   */
  async continueToNextLevel() {
    if (this.isContinuingToNextLevel) {
      return;
    }

    this.isContinuingToNextLevel = true;
    this.inputManager.resetState();

    // Leave level-complete immediately so rapid Enter/Space cannot advance twice.
    this.state.currentState = GameState.PLAYING;
    this.uiManager.setState(GameState.PLAYING);
    this.state.levelReady = false;

    try {
      if (this.state.isCustomImportedLevel && this.importedCampaignLevels?.length) {
        const next = this.importedCampaignIndex + 1;
        if (next >= this.importedCampaignLevels.length) {
          this.showCustomWorldCompleteMenu();
          return;
        }
        this.importedCampaignIndex = next;
        this.bootstrapCurrentImportedStage();
        return;
      }

      this.state.level++;

      // Remove power-ups from current player before clearing
      if (this.player && this.player.hasPowerUp) {
        this.player.removePowerUp(this);
      }

      this.entityManager.clear();
      // Pass false to disable fallback level - if level doesn't exist, throw error
      await this.levelManager.loadLevel(this.state.level, false);

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
    } catch (error) {
      // No more levels, player wins!
      this.victory();
    } finally {
      this.isContinuingToNextLevel = false;
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
    devLog('Game Over! Final Score:', this.state.score);
  }

  /**
   * Victory (all levels complete)
   */
  victory() {
    devLog('[VICTORY] Entering victory state...');

    // Play ending music
    this.audioManager.playMusic('ending');

    this.state.currentState = GameState.VICTORY;
    devLog('[VICTORY] Game state set to:', this.state.currentState);

    this.uiManager.setState(GameState.VICTORY);

    devLog('[VICTORY] UIManager state set to:', this.uiManager.currentState);
    devLog('[VICTORY] Final Score:', this.state.score);
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
    devLog(`[DEV] God Mode: ${this.player.godMode ? 'ON' : 'OFF'}`);
  }

  /**
   * Load a specific level in dev mode
   */
  async loadDevLevel(levelNumber) {
    devLog(`[DEV] Loading level ${levelNumber}...`);

    // Remove power-ups from current player before clearing
    if (this.player && this.player.hasPowerUp) {
      this.player.removePowerUp(this);
    }

    this.clearCustomImportedLevel();
    this.setCustomLevelImportStatus('');

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
    this.state.isNewHighScore = false; // Reset high score flag
    this.lastLifeBonusThreshold = 0; // Reset life bonus tracking
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

      devLog(`[DEV] Level ${levelNumber} loaded successfully!`);
    } catch (error) {
      devError(`[DEV] Failed to load level ${levelNumber}:`, error);
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
