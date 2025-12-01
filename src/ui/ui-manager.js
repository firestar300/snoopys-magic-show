import { CONFIG } from '../config.js';
import { GameState } from './game-states.js';
import { devLog } from '../utils/dev-logger.js';

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
      segmentSpeed: 0.08, // Time per segment (50ms - 2x faster)
      gameInstance: null
    };

    // End screen background image
    this.endBackground = new Image();
    this.endBackground.src = '/sprites/end-background.png';
    this.endBackgroundLoaded = false;
    this.endBackgroundProcessed = null; // Will hold the Game Boy palette version

    this.endBackground.onload = () => {
      // Apply Game Boy palette to the image
      this.endBackgroundProcessed = this.applyGameBoyPalette(this.endBackground);
      this.endBackgroundLoaded = true;
    };

    // End screen background scrolling
    this.endBackgroundScroll = {
      offsetY: 144, // Current Y offset - start from bottom half
      targetOffsetY: 0, // Target offset - scroll up to show top half
      scrolling: false,
      scrollDuration: 4, // 4 seconds scroll animation (x4 slower)
      scrollTimer: 0,
      scrollComplete: false // Flag to show score after scroll
    };

    // End screen Snoopy animation
    this.endingSnoopy = {
      frame: 0,
      frameTimer: 0,
      frameSpeed: 0.4, // 2x slower (was 0.2)
      frameCount: 3,
      x: 0,
      y: 0,
      width: 48,
      height: 64,
      displayWidth: 48 * 2, // 2x scale (same as title screen)
      displayHeight: 64 * 2, // 2x scale (same as title screen)
      movementTimer: 0,
      movementDuration: 21, // 21 seconds total
      tripDuration: 4.2, // Each trip (left->right or right->left) takes 4.2 seconds (21s / 5 trips)
      currentTrip: 0, // 0 to 4 (5 trips total = 2.5 round trips)
      facingRight: true,
      active: false
    };

    // End screen Woodstock animations (2 Woodstocks)
    this.endingWoodstocks = [
      {
        // Woodstock 1: left to right, stops at 1/3 (centered)
        id: 0,
        frame: 0,
        frameTimer: 0,
        frameSpeed: 0.3, // 2x slower (was 0.15)
        x: 0,
        y: 0,
        width: 32,
        height: 40,
        displayWidth: 32 * 2,
        displayHeight: 40 * 2,
        startX: 0, // Will be set on init
        targetX: (CONFIG.CANVAS_WIDTH / 3) - (32 * 2 / 2), // Center sprite at 1/3
        walkInDuration: 2, // Will be set on init
        walkOutDuration: 0, // Will be calculated on init
        facingRight: true,
        flipX: true, // INVERTED
        phase: 'walkIn', // walkIn, dance, walkOut
        phaseTimer: 0,
        totalTimer: 0,
        active: false
      },
      {
        // Woodstock 2: right to left (mirrored), stops at 2/3 (centered)
        id: 1,
        frame: 0,
        frameTimer: 0,
        frameSpeed: 0.3, // 2x slower (was 0.15)
        x: 0,
        y: 0,
        width: 32,
        height: 40,
        displayWidth: 32 * 2,
        displayHeight: 40 * 2,
        startX: 0, // Will be set on init
        targetX: ((CONFIG.CANVAS_WIDTH * 2) / 3) - (32 * 2 / 2), // Center sprite at 2/3
        walkInDuration: 0, // Will be calculated on init
        walkOutDuration: 0, // Will be calculated on init
        facingRight: false,
        flipX: false, // INVERTED // Mirrored
        phase: 'walkIn',
        phaseTimer: 0,
        totalTimer: 0,
        active: false
      }
    ];

    // End screen Spike animation
    this.endingSpike = {
      frame: 2, // Start with walk animation (frames 2-4)
      frameTimer: 0,
      frameSpeed: 0.3, // 2x slower (was 0.15)
      x: 0,
      y: 0,
      width: 56,
      height: 56,
      displayWidth: 56 * 2,
      displayHeight: 56 * 2,
      startX: 0, // Will be set on init
      targetX: (CONFIG.CANVAS_WIDTH / 2) - (56 * 2 / 2), // Center sprite at screen center
      walkInDuration: 2, // 2 seconds
      danceDuration: 4, // 4 seconds
      walkOutDuration: 2, // 2 seconds
      flipX: false,
      phase: 'walkIn', // walkIn, dance, walkOut
      phaseTimer: 0,
      totalTimer: 0,
      active: false
    };
  }

  /**
   * Apply Game Boy palette to an image
   * @param {Image} image - The source image
   * @returns {Canvas} - A canvas with the Game Boy palette applied
   */
  applyGameBoyPalette(image) {
    // Create a temporary canvas
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');

    // Draw the original image
    ctx.drawImage(image, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Game Boy palette colors (from darkest to lightest)
    const gbPalette = [
      { r: 15, g: 56, b: 15 },   // #0f380f - DARK
      { r: 48, g: 98, b: 48 },   // #306230 - MID_DARK
      { r: 139, g: 172, b: 15 }, // #8bac0f - MID_LIGHT
      { r: 155, g: 188, b: 15 }, // #9bbc0f - LIGHT
    ];

    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale (luminosity method)
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

      // Map grayscale to one of 4 Game Boy colors
      let colorIndex;
      if (gray < 64) {
        colorIndex = 0; // DARK
      } else if (gray < 128) {
        colorIndex = 1; // MID_DARK
      } else if (gray < 192) {
        colorIndex = 2; // MID_LIGHT
      } else {
        colorIndex = 3; // LIGHT
      }

      // Apply Game Boy color
      data[i] = gbPalette[colorIndex].r;
      data[i + 1] = gbPalette[colorIndex].g;
      data[i + 2] = gbPalette[colorIndex].b;
      // Keep alpha channel unchanged (data[i + 3])
    }

    // Put the modified data back
    ctx.putImageData(imageData, 0, 0);

    return canvas;
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

    // Initialize ending Snoopy animation when entering VICTORY
    if (state === GameState.VICTORY && previousState !== GameState.VICTORY) {
      // Reset background scroll - start from bottom half (144)
      this.endBackgroundScroll.offsetY = 144;
      this.endBackgroundScroll.scrolling = false;
      this.endBackgroundScroll.scrollTimer = 0;
      this.endBackgroundScroll.scrollComplete = false;

      this.endingSnoopy.active = true;
      this.endingSnoopy.movementTimer = 0;
      this.endingSnoopy.currentTrip = 0;
      this.endingSnoopy.facingRight = true;
      this.endingSnoopy.frame = 0;
      this.endingSnoopy.frameTimer = 0;
      // Start position (half visible on left edge)
      this.endingSnoopy.x = -this.endingSnoopy.displayWidth / 2;
      this.endingSnoopy.y = CONFIG.CANVAS_HEIGHT - this.endingSnoopy.displayHeight - 20; // Near bottom

      // Initialize ending Woodstocks (but don't start them yet)
      const woodstockY = CONFIG.CANVAS_HEIGHT - this.endingWoodstocks[0].displayHeight - 30;

      // Calculate durations based on same speed for both Woodstocks
      const w1StartX = -this.endingWoodstocks[0].displayWidth;
      const w1TargetX = this.endingWoodstocks[0].targetX;
      const w1WalkInDistance = Math.abs(w1TargetX - w1StartX);
      const w1WalkOutDistance = Math.abs(CONFIG.CANVAS_WIDTH - w1TargetX);

      const w2StartX = CONFIG.CANVAS_WIDTH;
      const w2TargetX = this.endingWoodstocks[1].targetX;
      const w2WalkInDistance = Math.abs(w2TargetX - w2StartX);
      const w2WalkOutDistance = Math.abs(CONFIG.CANVAS_WIDTH - w2TargetX);

      // Speed based on Woodstock 1 taking 2 seconds for walk in
      const speed = w1WalkInDistance / 2;

      // Calculate durations for same speed
      const w1WalkInDuration = 2; // Reference: 2 seconds
      const w2WalkInDuration = w2WalkInDistance / speed;
      const w1WalkOutDuration = w1WalkOutDistance / speed;
      const w2WalkOutDuration = w2WalkOutDistance / speed;

      // Woodstock 1 (left to right)
      this.endingWoodstocks[0].active = false; // Will activate after Snoopy's animation
      this.endingWoodstocks[0].startX = w1StartX;
      this.endingWoodstocks[0].x = this.endingWoodstocks[0].startX;
      this.endingWoodstocks[0].y = woodstockY;
      this.endingWoodstocks[0].walkInDuration = w1WalkInDuration;
      this.endingWoodstocks[0].walkOutDuration = w1WalkOutDuration;
      this.endingWoodstocks[0].phase = 'walkIn';
      this.endingWoodstocks[0].phaseTimer = 0;
      this.endingWoodstocks[0].totalTimer = 0;
      this.endingWoodstocks[0].frame = 2; // Start with walk animation (frames 2-3)
      this.endingWoodstocks[0].frameTimer = 0;
      this.endingWoodstocks[0].flipX = true; // INVERTED

      // Woodstock 2 (right to left, mirrored) - same speed as Woodstock 1
      this.endingWoodstocks[1].active = false; // Will activate after Snoopy's animation
      this.endingWoodstocks[1].startX = w2StartX;
      this.endingWoodstocks[1].x = this.endingWoodstocks[1].startX;
      this.endingWoodstocks[1].y = woodstockY;
      this.endingWoodstocks[1].walkInDuration = w2WalkInDuration;
      this.endingWoodstocks[1].walkOutDuration = w2WalkOutDuration;
      this.endingWoodstocks[1].phase = 'walkIn';
      this.endingWoodstocks[1].phaseTimer = 0;
      this.endingWoodstocks[1].totalTimer = 0;
      this.endingWoodstocks[1].frame = 2; // Start with walk animation (frames 2-3)
      this.endingWoodstocks[1].frameTimer = 0;
      this.endingWoodstocks[1].flipX = false; // INVERTED

      // Initialize ending Spike (will activate after Snoopy's animation)
      const spikeY = CONFIG.CANVAS_HEIGHT - this.endingSpike.displayHeight - 30;
      this.endingSpike.active = false; // Will activate after Snoopy's animation
      this.endingSpike.startX = -this.endingSpike.displayWidth;
      this.endingSpike.x = this.endingSpike.startX;
      this.endingSpike.y = spikeY;
      this.endingSpike.phase = 'walkIn';
      this.endingSpike.phaseTimer = 0;
      this.endingSpike.totalTimer = 0;
      this.endingSpike.frame = 2; // Start with walk animation (frames 2-4)
      this.endingSpike.frameTimer = 0;
      this.endingSpike.flipX = false;
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

    // Update ending Snoopy animation during victory screen
    if (this.currentState === GameState.VICTORY && this.endingSnoopy.active) {
      const deltaTime = 1 / 60; // Approximate frame time

      // Update frame animation
      this.endingSnoopy.frameTimer += deltaTime;
      if (this.endingSnoopy.frameTimer >= this.endingSnoopy.frameSpeed) {
        this.endingSnoopy.frame = (this.endingSnoopy.frame + 1) % this.endingSnoopy.frameCount;
        this.endingSnoopy.frameTimer = 0;
      }

      // Update movement
      this.endingSnoopy.movementTimer += deltaTime;

      // Calculate progress within current trip (0 to 1)
      const tripProgress = (this.endingSnoopy.movementTimer % this.endingSnoopy.tripDuration) / this.endingSnoopy.tripDuration;

      // Determine current trip number (0 to 4)
      this.endingSnoopy.currentTrip = Math.floor(this.endingSnoopy.movementTimer / this.endingSnoopy.tripDuration);

      // Determine direction (even trips = left to right, odd trips = right to left)
      const isGoingRight = (this.endingSnoopy.currentTrip % 2) === 0;
      this.endingSnoopy.facingRight = isGoingRight;

      // Calculate x position
      if (isGoingRight) {
        // Going left to right
        if (this.endingSnoopy.currentTrip === 0) {
          // First trip: start half visible on left edge
          const startX = -this.endingSnoopy.displayWidth / 2;
          const endX = CONFIG.CANVAS_WIDTH;
          const travelDistance = endX - startX;
          this.endingSnoopy.x = startX + (travelDistance * tripProgress);
        } else {
          // Subsequent trips: start completely off-screen
          const startX = -this.endingSnoopy.displayWidth;
          const endX = CONFIG.CANVAS_WIDTH;
          const travelDistance = endX - startX;
          this.endingSnoopy.x = startX + (travelDistance * tripProgress);
        }
      } else {
        // Going right to left (always goes completely off-screen)
        const startX = CONFIG.CANVAS_WIDTH;
        const endX = -this.endingSnoopy.displayWidth;
        const travelDistance = endX - startX;
        this.endingSnoopy.x = startX + (travelDistance * tripProgress);
      }

      // Stop animation after 2.5 round trips (5 trips total)
      if (this.endingSnoopy.movementTimer >= this.endingSnoopy.movementDuration) {
        this.endingSnoopy.active = false;
        // End at right edge
        this.endingSnoopy.x = CONFIG.CANVAS_WIDTH;
      }
    }

    // Update ending Woodstocks animation during victory screen
    if (this.currentState === GameState.VICTORY) {
      const deltaTime = 1 / 60;
      const DANCE_DURATION = 10; // 10 seconds

      // Check if Snoopy's animation is finished, then activate Woodstocks
      if (!this.endingSnoopy.active && !this.endingWoodstocks[0].active && !this.endingWoodstocks[1].active) {
        // Activate both Woodstocks
        this.endingWoodstocks[0].active = true;
        this.endingWoodstocks[1].active = true;
      }

      this.endingWoodstocks.forEach((woodstock, index) => {
        if (!woodstock.active) return;

        woodstock.totalTimer += deltaTime;
        woodstock.phaseTimer += deltaTime;

        // Update frame animation
        woodstock.frameTimer += deltaTime;
        if (woodstock.frameTimer >= woodstock.frameSpeed) {
          // Determine frame range based on phase (INVERTED)
          if (woodstock.phase === 'walkIn' || woodstock.phase === 'walkOut') {
            // Walk animation: frames 2-3 (INVERTED)
            woodstock.frame = woodstock.frame === 2 ? 3 : 2;
          } else if (woodstock.phase === 'dance') {
            // Dance animation: frames 0-1 (INVERTED)
            woodstock.frame = woodstock.frame === 0 ? 1 : 0;
          }
          woodstock.frameTimer = 0;
        }

        // Phase management
        if (woodstock.phase === 'walkIn') {
          // Walking in (using individual walkInDuration for same speed)
          const progress = Math.min(woodstock.phaseTimer / woodstock.walkInDuration, 1);
          woodstock.x = woodstock.startX + (woodstock.targetX - woodstock.startX) * progress;

          // Transition to dance phase
          if (woodstock.phaseTimer >= woodstock.walkInDuration) {
            woodstock.phase = 'dance';
            woodstock.phaseTimer = 0;
            woodstock.frame = 0; // Start dance animation (frames 0-1)
            woodstock.x = woodstock.targetX; // Ensure exact position
          }
        } else if (woodstock.phase === 'dance') {
          // Dancing (10 seconds)
          // Flip every 2 seconds during dance (INVERTED)
          const flipInterval = 2;
          const flipCount = Math.floor(woodstock.phaseTimer / flipInterval);
          woodstock.flipX = woodstock.id === 0 ? (flipCount % 2 === 0 ? true : false) : (flipCount % 2 === 0 ? false : true);

          // Transition to walk out phase
          if (woodstock.phaseTimer >= DANCE_DURATION) {
            woodstock.phase = 'walkOut';
            woodstock.phaseTimer = 0;
            woodstock.frame = 2; // Start walk animation (frames 2-3)
            // Reset flip to original direction (both going right) - INVERTED
            woodstock.flipX = true;
          }
        } else if (woodstock.phase === 'walkOut') {
          // Walking out to the right (using individual walkOutDuration for same speed)
          const progress = Math.min(woodstock.phaseTimer / woodstock.walkOutDuration, 1);
          const endX = CONFIG.CANVAS_WIDTH;
          woodstock.x = woodstock.targetX + (endX - woodstock.targetX) * progress;

          // Stop animation
          if (woodstock.phaseTimer >= woodstock.walkOutDuration) {
            woodstock.active = false;
          }
        }
      });

      // Update ending Spike animation
      // Activate Spike 1 second before Woodstocks finish their animation
      if (!this.endingSpike.active && this.endingWoodstocks[0].active) {
        // Calculate total duration of Woodstocks animation
        const woodstockTotalDuration =
          this.endingWoodstocks[0].walkInDuration +
          DANCE_DURATION +
          this.endingWoodstocks[0].walkOutDuration;

        // Activate Spike 1 second before Woodstocks finish
        if (this.endingWoodstocks[0].totalTimer >= woodstockTotalDuration - 1) {
          this.endingSpike.active = true;
        }
      }

      if (this.endingSpike.active) {
        this.endingSpike.totalTimer += deltaTime;
        this.endingSpike.phaseTimer += deltaTime;

        // Update frame animation
        this.endingSpike.frameTimer += deltaTime;
        if (this.endingSpike.frameTimer >= this.endingSpike.frameSpeed) {
          // Determine frame range based on phase
          if (this.endingSpike.phase === 'walkIn' || this.endingSpike.phase === 'walkOut') {
            // Walk animation: frames 2-4 (cycle through 2, 3, 4)
            if (this.endingSpike.frame === 2) {
              this.endingSpike.frame = 3;
            } else if (this.endingSpike.frame === 3) {
              this.endingSpike.frame = 4;
            } else {
              this.endingSpike.frame = 2;
            }
          } else if (this.endingSpike.phase === 'dance') {
            // Dance animation: frames 0-1
            this.endingSpike.frame = this.endingSpike.frame === 0 ? 1 : 0;
          }
          this.endingSpike.frameTimer = 0;
        }

        // Phase management
        if (this.endingSpike.phase === 'walkIn') {
          // Walking in (2 seconds)
          const progress = Math.min(this.endingSpike.phaseTimer / this.endingSpike.walkInDuration, 1);
          this.endingSpike.x = this.endingSpike.startX + (this.endingSpike.targetX - this.endingSpike.startX) * progress;

          // Transition to dance phase
          if (this.endingSpike.phaseTimer >= this.endingSpike.walkInDuration) {
            this.endingSpike.phase = 'dance';
            this.endingSpike.phaseTimer = 0;
            this.endingSpike.frame = 0; // Start dance animation (frames 0-1)
            this.endingSpike.x = this.endingSpike.targetX; // Ensure exact position
          }
        } else if (this.endingSpike.phase === 'dance') {
          // Dancing (4 seconds)
          // Flip every 1 second during dance
          const flipInterval = 1;
          const flipCount = Math.floor(this.endingSpike.phaseTimer / flipInterval);
          this.endingSpike.flipX = (flipCount % 2 === 1);

          // Transition to walk out phase
          if (this.endingSpike.phaseTimer >= this.endingSpike.danceDuration) {
            this.endingSpike.phase = 'walkOut';
            this.endingSpike.phaseTimer = 0;
            this.endingSpike.frame = 2; // Start walk animation (frames 2-4)
            // Reset flip to normal direction
            this.endingSpike.flipX = false;
          }
        } else if (this.endingSpike.phase === 'walkOut') {
          // Walking out to the right (2 seconds)
          const progress = Math.min(this.endingSpike.phaseTimer / this.endingSpike.walkOutDuration, 1);
          const endX = CONFIG.CANVAS_WIDTH;
          this.endingSpike.x = this.endingSpike.targetX + (endX - this.endingSpike.targetX) * progress;

          // Stop animation and trigger background scroll
          if (this.endingSpike.phaseTimer >= this.endingSpike.walkOutDuration) {
            this.endingSpike.active = false;
            // Start background scrolling
            if (!this.endBackgroundScroll.scrolling) {
              this.endBackgroundScroll.scrolling = true;
              this.endBackgroundScroll.scrollTimer = 0;
            }
          }
        }
      }

      // Update background scroll animation
      if (this.endBackgroundScroll.scrolling) {
        this.endBackgroundScroll.scrollTimer += deltaTime;
        const progress = Math.min(this.endBackgroundScroll.scrollTimer / this.endBackgroundScroll.scrollDuration, 1);

        // Smooth easing (ease-in-out)
        const easeProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        // Interpolate from 144 to 0 (scroll up)
        this.endBackgroundScroll.offsetY = 144 * (1 - easeProgress);

        // Stop scrolling when complete
        if (progress >= 1) {
          this.endBackgroundScroll.scrolling = false;
          this.endBackgroundScroll.offsetY = this.endBackgroundScroll.targetOffsetY;
          this.endBackgroundScroll.scrollComplete = true; // Show score now
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
        devLog('[UI MANAGER] Rendering VICTORY screen, state:', this.currentState);
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
    ctx.fillText('GAME OVER', centerX, centerY - 50);

    // New Record message (if applicable)
    if (this.game.state.isNewHighScore) {
      ctx.font = 'bold 18px "Courier New", monospace';
      const pulse = Math.abs(Math.sin(Date.now() / 300));
      ctx.fillStyle = `rgba(155, 188, 15, ${0.5 + pulse * 0.5})`;
      ctx.fillText('★ NEW RECORD! ★', centerX, centerY - 20);
    }

    // Score
    ctx.font = '16px "Courier New", monospace';
    ctx.fillStyle = CONFIG.COLORS.MID_LIGHT;
    ctx.fillText(`Final Score: ${this.game.state.score}`, centerX, centerY + 10);
    ctx.fillText(`High Score: ${this.game.state.highScore}`, centerX, centerY + 35);
    ctx.fillText(`Level Reached: ${this.game.state.level}`, centerX, centerY + 60);

    // Restart instruction
    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = CONFIG.COLORS.LIGHT;
    ctx.fillText('PRESS SPACE TO RESTART', centerX, centerY + 95);

    ctx.textAlign = 'left';
  }

  /**
   * Render victory screen (all levels complete)
   */
  renderVictory() {
    const ctx = this.renderer.ctx;

    devLog('[RENDER VICTORY] Background loaded:', this.endBackgroundLoaded);

    // Background - Use end-background image with Game Boy palette if loaded, otherwise fallback
    // The background is 160x288px, we display 160x144px at a time
    // Start with bottom half (offsetY=144), scroll up to top half (offsetY=0)
    if (this.endBackgroundLoaded && this.endBackgroundProcessed) {
      // Draw the Game Boy palette version of the background
      // Draw only a 160x144px portion based on offsetY (starts at 144, scrolls to 0)
      devLog('[RENDER VICTORY] Drawing end background image with Game Boy palette, offsetY:', this.endBackgroundScroll.offsetY);
      ctx.drawImage(
        this.endBackgroundProcessed,
        0, this.endBackgroundScroll.offsetY, // Source position (x, y)
        160, 144, // Source size (width, height) - display 144px of the 288px total
        0, 0, // Destination position
        CONFIG.CANVAS_WIDTH, // 160px
        CONFIG.CANVAS_HEIGHT // 144px
      );
    } else {
      // Fallback background
      devLog('[RENDER VICTORY] Using fallback background');
      ctx.fillStyle = 'rgba(139, 172, 15, 0.95)';
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    }

    // Draw animated Snoopy
    if (this.endingSnoopy.active) {
      const spriteManager = this.game.spriteManager;
      if (spriteManager && spriteManager.isLoaded()) {
        spriteManager.drawTitleScreenSnoopy(
          this.renderer,
          this.endingSnoopy.frame,
          this.endingSnoopy.x,
          this.endingSnoopy.y,
          this.endingSnoopy.displayWidth,
          this.endingSnoopy.displayHeight,
          !this.endingSnoopy.facingRight // flip if going left
        );
      }
    }

    // Draw animated Woodstocks
    const spriteManager = this.game.spriteManager;
    if (spriteManager && spriteManager.isLoaded()) {
      this.endingWoodstocks.forEach(woodstock => {
        if (woodstock.active) {
          spriteManager.drawEndWoodstock(
            this.renderer,
            woodstock.frame,
            woodstock.x,
            woodstock.y,
            woodstock.displayWidth,
            woodstock.displayHeight,
            woodstock.flipX
          );
        }
      });

      // Draw animated Spike
      if (this.endingSpike.active) {
        spriteManager.drawEndSpike(
          this.renderer,
          this.endingSpike.frame,
          this.endingSpike.x,
          this.endingSpike.y,
          this.endingSpike.displayWidth,
          this.endingSpike.displayHeight,
          this.endingSpike.flipX
        );
      }
    }

    // Display score after background scroll is complete
    if (this.endBackgroundScroll.scrollComplete) {
      const ctx = this.renderer.ctx;
      const centerX = CONFIG.CANVAS_WIDTH / 2;
      const bottomY = CONFIG.CANVAS_HEIGHT - 10; // 10px from bottom

      // Score text - all on one line
      ctx.font = 'bold 20px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = CONFIG.COLORS.DARK;
      ctx.fillText(`FINAL SCORE: ${this.game.state.score}`, centerX, bottomY);

      // High score if applicable (on line above score)
      if (this.game.state.isNewHighScore) {
        ctx.font = 'bold 16px "Courier New", monospace';
        const pulse = Math.abs(Math.sin(Date.now() / 300));
        ctx.fillStyle = `rgba(15, 56, 15, ${0.5 + pulse * 0.5})`;
        ctx.fillText('★ NEW RECORD! ★', centerX, bottomY - 25);
      }

      // "Press Space to continue" message (above score/record)
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = CONFIG.COLORS.LIGHT;
      const messageY = this.game.state.isNewHighScore ? bottomY - 50 : bottomY - 25;
      ctx.fillText('PRESS SPACE TO CONTINUE', centerX, messageY);

      ctx.textAlign = 'left';
    }
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
