import { CONFIG } from '../config.js';
import { GameState } from './game-states.js';

/**
 * Manages UI overlays and screens
 */
export class UIManager {
  constructor(game) {
    this.game = game;
    this.renderer = game.renderer;
    this.currentState = GameState.MENU;

    // Title screen Snoopy animation
    this.titleSnoopyFrame = 0;
    this.titleSnoopyAnimationTimer = 0;
    this.titleSnoopyAnimationSpeed = 0.2; // Speed of animation (50% faster)
    this.titleSnoopyFrameCount = 3; // Number of frames in the sprite

    // Level complete time bonus animation
    this.timeBonusAnimation = {
      active: false,
      timer: 0,
      segmentSpeed: 0.05, // Time per segment (50ms - 2x faster)
      gameInstance: null
    };
  }

  /**
   * Set the current UI state
   */
  setState(state, data = null) {
    const previousState = this.currentState;
    this.currentState = state;

    // Handle music based on state changes
    const audioManager = this.game.audioManager;

    // Start title screen music when entering MENU
    if (state === GameState.MENU && previousState !== GameState.MENU) {
      audioManager.playMusic('title');
    }

    // Stop title screen music when leaving MENU
    if (previousState === GameState.MENU && state !== GameState.MENU) {
      audioManager.stopMusic();
    }

    // Initialize time bonus animation when entering LEVEL_COMPLETE
    if (state === GameState.LEVEL_COMPLETE && data) {
      // Play stage clear music
      audioManager.playMusic('stage-clear');

      this.timeBonusAnimation.active = true;
      this.timeBonusAnimation.timer = 0;
      this.timeBonusAnimation.gameInstance = data.game;
    }
  }

  /**
   * Render the appropriate UI based on current state
   */
  render() {
    // Update title screen animation
    if (this.currentState === GameState.MENU) {
      this.titleSnoopyAnimationTimer += 1 / 60; // Approximate frame time
      if (this.titleSnoopyAnimationTimer >= this.titleSnoopyAnimationSpeed) {
        this.titleSnoopyFrame = (this.titleSnoopyFrame + 1) % this.titleSnoopyFrameCount;
        this.titleSnoopyAnimationTimer = 0;
      }
    }

    // Update time bonus animation during level complete
    if (this.currentState === GameState.LEVEL_COMPLETE && this.timeBonusAnimation.active) {
      this.timeBonusAnimation.timer += 1 / 60; // Approximate frame time

      if (this.timeBonusAnimation.timer >= this.timeBonusAnimation.segmentSpeed) {
        const gameInstance = this.timeBonusAnimation.gameInstance;
        if (gameInstance && gameInstance.timer.filledSegments < gameInstance.timer.totalSegments) {
          // Fill one segment and add 100 points
          gameInstance.timer.filledSegments++;
          gameInstance.addScore(100);
          // Play timer sound for each segment
          if (gameInstance.audioManager) {
            gameInstance.audioManager.playSfx('timer');
          }
          this.timeBonusAnimation.timer = 0;
        } else {
          // Animation finished
          this.timeBonusAnimation.active = false;
        }
      }
    }

    switch (this.currentState) {
      case GameState.MENU:
        this.renderMenu();
        break;
      case GameState.GAME_OVER:
        this.renderGameOver();
        break;
      case GameState.VICTORY:
        this.renderVictory();
        break;
      case GameState.LEVEL_COMPLETE:
        this.renderLevelComplete();
        break;
      case GameState.PAUSED:
        this.renderPaused();
        break;
    }
  }

  /**
   * Render the main menu
   */
  renderMenu() {
    const ctx = this.renderer.ctx;
    const centerX = CONFIG.CANVAS_WIDTH / 2;
    const centerY = CONFIG.CANVAS_HEIGHT / 2;

    // Semi-transparent background
    ctx.fillStyle = 'rgba(15, 56, 15, 0.9)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Title
    ctx.fillStyle = CONFIG.COLORS.LIGHT;
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText("SNOOPY'S", centerX, centerY - 90);
    ctx.fillText('MAGIC SHOW', centerX, centerY - 60);

    // Animated Snoopy sprite from title screen
    const spriteManager = this.game.spriteManager;

    if (spriteManager && spriteManager.isLoaded()) {
      // Sprite is 48x64, scale 2x for better visibility
      const spriteWidth = 48 * 2;
      const spriteHeight = 64 * 2;
      const spriteX = centerX - spriteWidth / 2;
      const spriteY = centerY - spriteHeight / 2 + 20;

      spriteManager.drawTitleScreenSnoopy(
        this.renderer,
        this.titleSnoopyFrame,
        spriteX,
        spriteY,
        spriteWidth,
        spriteHeight
      );
    } else {
      // Fallback to simple Snoopy if sprites not loaded
      this.drawMenuSnoopy(centerX, centerY + 10);
    }

    // Instructions with blink effect
    ctx.font = '14px "Courier New", monospace';
    const blinkOpacity = Math.abs(Math.sin(Date.now() / 500));
    ctx.fillStyle = `rgba(155, 188, 15, ${blinkOpacity})`;
    ctx.fillText('PRESS SPACE TO START', centerX, centerY + 100);

    // Credits
    ctx.font = '8px "Courier New", monospace';
    ctx.fillStyle = CONFIG.COLORS.MID_DARK;
    ctx.fillText('Game Boy Style Recreation', centerX, CONFIG.CANVAS_HEIGHT - 10);

    ctx.textAlign = 'left';
  }

  /**
   * Draw a simple Snoopy for the menu
   */
  drawMenuSnoopy(x, y) {
    const ctx = this.renderer.ctx;

    // Body
    ctx.fillStyle = CONFIG.COLORS.LIGHT;
    ctx.fillRect(x - 20, y, 40, 35);

    // Outline
    ctx.strokeStyle = CONFIG.COLORS.DARK;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 20, y, 40, 35);

    // Ears
    ctx.fillStyle = CONFIG.COLORS.DARK;
    ctx.beginPath();
    ctx.arc(x - 12, y + 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 12, y + 8, 8, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = CONFIG.COLORS.DARK;
    ctx.fillRect(x - 10, y + 15, 4, 4);
    ctx.fillRect(x + 6, y + 15, 4, 4);

    // Nose
    ctx.fillRect(x - 2, y + 22, 4, 6);
  }

  /**
   * Render game over screen
   */
  renderGameOver() {
    const ctx = this.renderer.ctx;
    const centerX = CONFIG.CANVAS_WIDTH / 2;
    const centerY = CONFIG.CANVAS_HEIGHT / 2;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(15, 56, 15, 0.85)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Game Over text
    ctx.fillStyle = CONFIG.COLORS.DARK;
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', centerX, centerY - 30);

    // Score
    ctx.font = '16px "Courier New", monospace';
    ctx.fillStyle = CONFIG.COLORS.MID_LIGHT;
    ctx.fillText(`Final Score: ${this.game.state.score}`, centerX, centerY + 10);
    ctx.fillText(`Level Reached: ${this.game.state.level}`, centerX, centerY + 35);

    // Restart instruction
    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = CONFIG.COLORS.LIGHT;
    ctx.fillText('PRESS SPACE TO RESTART', centerX, centerY + 70);

    ctx.textAlign = 'left';
  }

  /**
   * Render victory screen (all levels complete)
   */
  renderVictory() {
    const ctx = this.renderer.ctx;
    const centerX = CONFIG.CANVAS_WIDTH / 2;
    const centerY = CONFIG.CANVAS_HEIGHT / 2;

    // Background
    ctx.fillStyle = 'rgba(139, 172, 15, 0.95)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Victory text with animation
    const pulse = Math.sin(Date.now() / 200) * 3;
    ctx.fillStyle = CONFIG.COLORS.DARK;
    ctx.font = `bold ${24 + pulse}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('CONGRATULATIONS!', centerX, centerY - 40);

    ctx.font = '16px "Courier New", monospace';
    ctx.fillText('You completed the show!', centerX, centerY - 10);

    // Score
    ctx.font = '18px "Courier New", monospace';
    ctx.fillStyle = CONFIG.COLORS.MID_DARK;
    ctx.fillText(`Final Score: ${this.game.state.score}`, centerX, centerY + 25);

    // Stars
    this.drawStars(centerX, centerY + 55);

    // Restart
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = CONFIG.COLORS.DARK;
    ctx.fillText('PRESS SPACE TO PLAY AGAIN', centerX, centerY + 90);

    ctx.textAlign = 'left';
  }

  /**
   * Draw victory stars
   */
  drawStars(x, y) {
    const ctx = this.renderer.ctx;
    ctx.fillStyle = '#FFD700';

    for (let i = 0; i < 3; i++) {
      const starX = x - 30 + i * 30;
      const rotation = Date.now() / 500 + i;

      ctx.save();
      ctx.translate(starX, y);
      ctx.rotate(rotation);

      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        const angle = (j * 4 * Math.PI) / 5 - Math.PI / 2;
        const px = Math.cos(angle) * 8;
        const py = Math.sin(angle) * 8;
        if (j === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  /**
   * Render level complete screen
   */
  renderLevelComplete() {
    const ctx = this.renderer.ctx;
    const centerX = CONFIG.CANVAS_WIDTH / 2;
    const centerY = CONFIG.CANVAS_HEIGHT / 2;

    // Semi-transparent overlay (lighter to see the timer)
    ctx.fillStyle = 'rgba(15, 56, 15, 0.5)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Level complete text
    ctx.fillStyle = CONFIG.COLORS.LIGHT;
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL COMPLETE!', centerX, centerY - 50);

    // Current score display - larger and more visible
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = CONFIG.COLORS.LIGHT;
    ctx.fillText(`SCORE: ${this.game.state.score}`, centerX, centerY - 10);

    // Show continue instruction only when animation is finished
    if (!this.timeBonusAnimation.active || this.game.timer.filledSegments >= this.game.timer.totalSegments) {
      ctx.font = 'bold 16px "Courier New", monospace';
      const blinkOpacity = 0.5 + Math.abs(Math.sin(Date.now() / 400)) * 0.5;
      ctx.fillStyle = `rgba(155, 188, 15, ${blinkOpacity})`;
      ctx.fillText('PRESS SPACE TO CONTINUE', centerX, centerY + 35);
    }

    ctx.textAlign = 'left';
  }

  /**
   * Render paused screen
   */
  renderPaused() {
    const ctx = this.renderer.ctx;
    const centerX = CONFIG.CANVAS_WIDTH / 2;
    const centerY = CONFIG.CANVAS_HEIGHT / 2;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(15, 56, 15, 0.7)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Paused text
    ctx.fillStyle = CONFIG.COLORS.LIGHT;
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', centerX, centerY);

    // Resume instruction
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = CONFIG.COLORS.MID_LIGHT;
    ctx.fillText('PRESS P TO RESUME', centerX, centerY + 30);

    ctx.textAlign = 'left';
  }
}
