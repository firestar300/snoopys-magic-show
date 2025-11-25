/**
 * Manages sprite loading and rendering
 */
export class SpriteManager {
  constructor() {
    this.sprites = {};
    this.loaded = false;
    this.loadingPromises = [];

    // Game Boy color palette (from darkest to lightest)
    this.gameBoyPalette = [
      { r: 15, g: 56, b: 15 },    // DARK
      { r: 48, g: 98, b: 48 },    // MID_DARK
      { r: 139, g: 172, b: 15 },  // MID_LIGHT
      { r: 155, g: 188, b: 15 },  // LIGHT
    ];
  }

  /**
   * Load all game sprites
   */
  async loadAll() {
    const spriteFiles = [
      { name: 'snoopy', path: '/sprites/snoopy.png' },
      { name: 'snoopy_victory', path: '/sprites/snoopy_victory.png' },
      { name: 'title_screen_snoopy', path: '/title-screen-snoopy.png' },
      { name: 'woodstock', path: '/sprites/woodstock.png' },
      { name: 'ball', path: '/sprites/ball.png' },
      { name: 'blocks', path: '/sprites/blocks.png' },
      { name: 'powerups', path: '/sprites/powerups.png' },
      { name: 'timer', path: '/sprites/timer.png' },
      { name: 'ready_go', path: '/sprites/ready-go.png' },
    ];

    this.loadingPromises = spriteFiles.map(sprite => this.loadSprite(sprite.name, sprite.path));

    try {
      await Promise.all(this.loadingPromises);
      this.loaded = true;
      console.log('✅ All sprites loaded successfully');
    } catch (error) {
      console.error('❌ Error loading sprites:', error);
    }
  }

  /**
   * Load a single sprite
   */
  loadSprite(name, path) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          // Apply Game Boy palette to the sprite
          const processedImg = await this.applyGameBoyPalette(img);
          this.sprites[name] = processedImg;
          resolve(processedImg);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => {
        reject(new Error(`Failed to load sprite: ${path}`));
      };
      img.src = path;
    });
  }

  /**
   * Apply Game Boy color palette to a sprite
   */
  applyGameBoyPalette(img) {
    return new Promise((resolve, reject) => {
      // Create an off-screen canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      // Draw the original image
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Process each pixel
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Skip fully transparent pixels
        if (a === 0) continue;

        // Convert to grayscale
        const gray = (r + g + b) / 3;

        // Map grayscale to Game Boy palette (4 colors)
        let paletteIndex;
        if (gray < 64) {
          paletteIndex = 0; // Darkest
        } else if (gray < 128) {
          paletteIndex = 1;
        } else if (gray < 192) {
          paletteIndex = 2;
        } else {
          paletteIndex = 3; // Lightest
        }

        const color = this.gameBoyPalette[paletteIndex];
        data[i] = color.r;
        data[i + 1] = color.g;
        data[i + 2] = color.b;
        // Keep original alpha
      }

      // Put the modified data back
      ctx.putImageData(imageData, 0, 0);

      // Create a new image from the canvas
      const newImg = new Image();
      newImg.onload = () => resolve(newImg);
      newImg.onerror = () => reject(new Error('Failed to create processed image'));
      newImg.src = canvas.toDataURL();
    });
  }

  /**
   * Get a sprite by name
   */
  getSprite(name) {
    return this.sprites[name];
  }

  /**
   * Check if all sprites are loaded
   */
  isLoaded() {
    return this.loaded;
  }

  /**
   * Draw a sprite frame
   */
  drawSprite(renderer, spriteName, sx, sy, sw, sh, dx, dy, dw, dh) {
    const sprite = this.sprites[spriteName];
    if (sprite) {
      renderer.drawSprite(sprite, sx, sy, sw, sh, dx, dy, dw, dh);
    }
  }

  /**
   * Draw Snoopy sprite
   * Direction: 0=up, 1=down, 2=left, 3=right
   * Frame: 0-2 (animation frame)
   * hurt: true for hurt animation
   */
  drawSnoopy(renderer, direction, frame, x, y, width, height, hurt = false) {
    const sprite = this.sprites.snoopy;
    if (!sprite) return;

    const frameSize = 16;
    let sx, sy;

    if (hurt) {
      // Hurt animation: ligne 2, positions 0-2
      sx = frame * frameSize;
      sy = frameSize; // Line 2 at y=16
    } else {
      // Sprite organization (all 16x16):
      // Line 1 (y=0): down (0-2), up (3-5), left (6-8)
      // Line 2 (y=16): hurt (0-2), ... right (7-9)

      const framePositions = {
        // down (line 1)
        '1-0': { x: 0, y: 0 },
        '1-1': { x: 16, y: 0 },
        '1-2': { x: 32, y: 0 },
        // up (line 1)
        '0-0': { x: 48, y: 0 },
        '0-1': { x: 64, y: 0 },
        '0-2': { x: 80, y: 0 },
        // left (line 1)
        '2-0': { x: 96, y: 0 },
        '2-1': { x: 112, y: 0 },
        '2-2': { x: 128, y: 0 },
        // right (line 2, positions 7-9)
        '3-0': { x: 112, y: 16 },
        '3-1': { x: 128, y: 16 },
        '3-2': { x: 144, y: 16 },
      };

      const key = `${direction}-${frame}`;
      const pos = framePositions[key] || { x: 0, y: 0 };
      sx = pos.x;
      sy = pos.y;
    }

    renderer.drawSprite(sprite, sx, sy, frameSize, frameSize, x, y, width, height);
  }

  /**
   * Draw Snoopy victory sprite
   * Frame: 0-1 (alternating animation)
   * Sprite: 16x24px frames
   */
  drawSnoopyVictory(renderer, frame, x, y, width, height) {
    const sprite = this.sprites.snoopy_victory;
    if (!sprite) return;

    const frameWidth = 16;
    const frameHeight = 24;
    const sx = frame * frameWidth;
    const sy = 0;

    renderer.drawSprite(sprite, sx, sy, frameWidth, frameHeight, x, y, width, height);
  }

  /**
   * Draw Snoopy defeated sprite
   * Uses specific column and row from snoopy.png
   */
  drawSnoopyDefeated(renderer, col, row, x, y, width, height) {
    const sprite = this.sprites.snoopy;
    if (!sprite) return;

    const frameSize = 16;
    const sx = col * frameSize;
    const sy = row * frameSize;

    renderer.drawSprite(sprite, sx, sy, frameSize, frameSize, x, y, width, height);
  }

  /**
   * Draw title screen Snoopy sprite
   * Frame: 0-N (animation frames)
   * Sprite: 48x64px frames
   */
  drawTitleScreenSnoopy(renderer, frame, x, y, width, height) {
    const sprite = this.sprites.title_screen_snoopy;
    if (!sprite) return;

    const frameWidth = 48;
    const frameHeight = 64;
    const sx = frame * frameWidth;
    const sy = 0;

    renderer.drawSprite(sprite, sx, sy, frameWidth, frameHeight, x, y, width, height);
  }

  /**
   * Draw Woodstock sprite
   */
  drawWoodstock(renderer, x, y, width, height) {
    const sprite = this.sprites.woodstock;
    if (!sprite) return;

    renderer.drawSprite(sprite, 0, 0, 16, 16, x, y, width, height);
  }

  /**
   * Draw ball sprite with animation
   * Sprite: L1C1, 8x8px frames
   */
  drawBall(renderer, frame, x, y, width, height) {
    const sprite = this.sprites.ball;
    if (!sprite) return;

    const frameWidth = 8;
    const frameHeight = 8;
    const sx = frame * frameWidth;
    const sy = 0; // Line 1

    renderer.drawSprite(sprite, sx, sy, frameWidth, frameHeight, x, y, width, height);
  }

  /**
   * Draw ball particle (explosion)
   * Sprite: L1C2, 8x8px
   */
  drawBallParticle(renderer, x, y, width, height) {
    const sprite = this.sprites.ball;
    if (!sprite) return;

    const frameWidth = 8;
    const frameHeight = 8;
    const sx = 8; // Column 2 (L1C2)
    const sy = 0; // Line 1

    renderer.drawSprite(sprite, sx, sy, frameWidth, frameHeight, x, y, width, height);
  }

  /**
   * Draw block sprite
   * Type: 0=empty, 1=wall, 2=pushable, 3=breakable, 4=teleportA, 5=teleportB
   *       6=arrowUp, 7=arrowRight, 8=arrowDown, 9=arrowLeft, 10=broken
   *       11=pushableUp, 12=pushableDown, 13=pushableLeft, 14=pushableRight
   */
  drawBlock(renderer, type, x, y, width, height) {
    const sprite = this.sprites.blocks;
    if (!sprite || type === 0) return;

    const frameWidth = 16;
    const frameHeight = 16;

    // Map types to sprite positions in the blocks spritesheet
    // Line 1 (y=0): 1-6=various, 7=wall/pushable, 8=breakable
    // Line 2 (y=16): 2=arrowUp, 3=arrowDown, 4=arrowRight, 5=arrowLeft, 6=teleport
    const positions = {
      1: { x: 6 * 16, y: 0 },    // Wall (block #7 of line 1, x=96)
      2: { x: 6 * 16, y: 0 },    // Pushable (same as wall, block #7 of line 1, x=96)
      3: { x: 7 * 16, y: 0 },    // Breakable (block #8 of line 1, x=112)
      4: { x: 5 * 16, y: 16 },   // Teleport A (block #6 of line 2, x=80)
      5: { x: 5 * 16, y: 16 },   // Teleport B (same sprite, block #6 of line 2)
      6: { x: 1 * 16, y: 16 },   // Arrow Up (L2 C2, x=16)
      7: { x: 3 * 16, y: 16 },   // Arrow Right (L2 C4, x=48)
      8: { x: 2 * 16, y: 16 },   // Arrow Down (L2 C3, x=32)
      9: { x: 4 * 16, y: 16 },   // Arrow Left (L2 C5, x=64)
      10: { x: 5 * 16, y: 0 },   // Broken (block #6 of line 1, x=80)
      11: { x: 6 * 16, y: 0 },   // Pushable Up (same sprite as wall for now)
      12: { x: 6 * 16, y: 0 },   // Pushable Down (same sprite as wall for now)
      13: { x: 6 * 16, y: 0 },   // Pushable Left (same sprite as wall for now)
      14: { x: 6 * 16, y: 0 },   // Pushable Right (same sprite as wall for now)
    };

    const pos = positions[type];
    if (pos) {
      renderer.drawSprite(sprite, pos.x, pos.y, frameWidth, frameHeight, x, y, width, height);
    }
  }

  /**
   * Draw toggle block sprite
   * State: 'solid', 'passable', or 'transitioning'
   * transitionFrame: 0 or 1 (for alternating animation during transition)
   */
  drawToggleBlock(renderer, state, x, y, width, height, transitionFrame = 0) {
    const sprite = this.sprites.blocks;
    if (!sprite) return;

    const frameWidth = 16;
    const frameHeight = 16;

    let pos;

    if (state === 'transitioning') {
      // Alternate between L1C1 and L2C1 during transition
      if (transitionFrame === 0) {
        pos = { x: 0, y: 0 };  // L1C1 (Line 1, Column 1)
      } else {
        pos = { x: 0, y: 16 }; // L2C1 (Line 2, Column 1)
      }
    } else {
      // Fixed sprites for stable states
      const positions = {
        solid: { x: 0, y: 16 },        // L2C1: bloc non traversable
        passable: { x: 8 * 16, y: 0 }, // L1C9: bloc traversable (x=128)
      };
      pos = positions[state];
    }

    if (pos) {
      renderer.drawSprite(sprite, pos.x, pos.y, frameWidth, frameHeight, x, y, width, height);
    }
  }

  /**
   * Draw power-up sprite
   * Type: 'invincible', 'time', or 'speed'
   */
  drawPowerUp(renderer, type, x, y, width, height, frame = 0) {
    const sprite = this.sprites.powerups;
    if (!sprite) return;

    const frameWidth = 16;
    let sx;

    if (type === 'invincible') {
      sx = 0; // L1C1
    } else if (type === 'time') {
      sx = 16; // L1C2
    } else if (type === 'speed') {
      // L1C3 (sx=32) or L1C4 (sx=48) based on frame
      sx = frame === 0 ? 32 : 48;
    } else {
      sx = 0; // Default
    }

    renderer.drawSprite(sprite, sx, 0, frameWidth, 16, x, y, width, height);
  }

  /**
   * Draw timer corner sprite
   * Corner: 'top-left', 'top-right', 'bottom-left', 'bottom-right'
   */
  drawTimerCorner(renderer, corner, x, y) {
    const sprite = this.sprites.timer;
    if (!sprite) return;

    const positions = {
      'top-left': { x: 16, y: 0 },      // L1C3
      'top-right': { x: 24, y: 0 },     // L1C4
      'bottom-left': { x: 16, y: 8 },   // L2C3
      'bottom-right': { x: 24, y: 8 },  // L2C4
    };

    const pos = positions[corner];
    if (pos) {
      renderer.drawSprite(sprite, pos.x, pos.y, 8, 8, x, y, 16, 16);
    }
  }

  /**
   * Draw timer top center segment
   * Draws L2C1 + L2C2 + L1C1 + L1C2 (64px total at 2x scale)
   */
  drawTimerTopCenter(renderer, x, y) {
    const sprite = this.sprites.timer;
    if (!sprite) return;

    const segments = [
      { sx: 0, sy: 8 },   // L2C1
      { sx: 8, sy: 8 },   // L2C2
      { sx: 0, sy: 0 },   // L1C1
      { sx: 8, sy: 0 },   // L1C2
    ];

    segments.forEach((seg, index) => {
      renderer.drawSprite(sprite, seg.sx, seg.sy, 8, 8, x + (index * 16), y, 16, 16);
    });
  }

  /**
   * Draw timer horizontal border segment (top or bottom)
   * Uses L1C5 for empty, L1C6 for filled
   */
  drawTimerHorizontalBorder(renderer, x, y, width, startIndex, filledCount, reverse = false) {
    const sprite = this.sprites.timer;
    if (!sprite) return;

    const numSegments = Math.floor(width / 16);

    for (let i = 0; i < numSegments; i++) {
      const segmentIndex = reverse ? (startIndex + numSegments - 1 - i) : (startIndex + i);
      const isFilled = segmentIndex < filledCount;

      // L1C6 (filled) or L1C5 (empty) - inverted
      const sx = isFilled ? 40 : 32;
      const sy = 0;

      renderer.drawSprite(sprite, sx, sy, 8, 8, x + (i * 16), y, 16, 16);
    }
  }

  /**
   * Draw timer vertical border segment (left or right)
   * Uses L2C5 for empty, L2C6 for filled
   */
  drawTimerVerticalBorder(renderer, x, y, height, startIndex, filledCount, reverse = false) {
    const sprite = this.sprites.timer;
    if (!sprite) return;

    const numSegments = Math.floor(height / 16);

    for (let i = 0; i < numSegments; i++) {
      const segmentIndex = reverse ? (startIndex + numSegments - 1 - i) : (startIndex + i);
      const isFilled = segmentIndex < filledCount;

      // L2C6 (filled) or L2C5 (empty) - inverted
      const sx = isFilled ? 40 : 32;
      const sy = 8;

      renderer.drawSprite(sprite, sx, sy, 8, 8, x, y + (i * 16), 16, 16);
    }
  }

  /**
   * Draw score popup (1000pts sprite)
   * From blocks.png L2C8
   */
  drawScorePopup(renderer, x, y, width, height) {
    const sprite = this.sprites.blocks;
    if (!sprite) return;

    // L2C8: sx = 7 * 16 = 112, sy = 1 * 16 = 16
    const sx = 112;
    const sy = 16;

    renderer.drawSprite(sprite, sx, sy, 16, 16, x, y, width, height);
  }

  /**
   * Draw "Ready? Go!" sprite
   */
  drawReadyGo(renderer, x, y, width, height) {
    const sprite = this.sprites.ready_go;
    if (!sprite) return;

    renderer.drawSprite(sprite, 0, 0, sprite.width, sprite.height, x, y, width, height);
  }
}
