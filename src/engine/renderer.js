import { CONFIG } from '../config.js';

/**
 * Handles rendering to the canvas
 */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Disable image smoothing for pixel art
    this.ctx.imageSmoothingEnabled = false;
  }

  /**
   * Clear the canvas
   */
  clear() {
    this.ctx.fillStyle = CONFIG.COLORS.LIGHT;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw a rectangle
   */
  drawRect(x, y, width, height, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  /**
   * Draw a rectangle outline
   */
  drawRectOutline(x, y, width, height, color, lineWidth = 1) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(x, y, width, height);
  }

  /**
   * Draw a circle
   */
  drawCircle(x, y, radius, color) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draw text
   */
  drawText(text, x, y, color = CONFIG.COLORS.DARK, size = 12) {
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px 'Courier New', monospace`;
    this.ctx.fillText(text, x, y);
  }

  /**
   * Draw an image
   */
  drawImage(image, x, y, width, height) {
    if (image) {
      this.ctx.drawImage(image, x, y, width, height);
    }
  }

  /**
   * Draw a sprite from a spritesheet
   */
  drawSprite(spritesheet, sx, sy, sw, sh, dx, dy, dw, dh) {
    if (spritesheet) {
      this.ctx.drawImage(spritesheet, sx, sy, sw, sh, dx, dy, dw, dh);
    }
  }

  /**
   * Draw a grid overlay to show tile boundaries
   * Note: This assumes the context is already translated by TIMER_BORDER
   */
  drawGrid() {
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'; // Semi-transparent black
    this.ctx.lineWidth = 1;

    // Draw vertical lines
    for (let x = 0; x <= CONFIG.GRID_WIDTH; x++) {
      const xPos = x * CONFIG.TILE_SIZE;
      this.ctx.beginPath();
      this.ctx.moveTo(xPos, 0);
      this.ctx.lineTo(xPos, CONFIG.GAME_AREA_HEIGHT);
      this.ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= CONFIG.GRID_HEIGHT; y++) {
      const yPos = y * CONFIG.TILE_SIZE;
      this.ctx.beginPath();
      this.ctx.moveTo(0, yPos);
      this.ctx.lineTo(CONFIG.GAME_AREA_WIDTH, yPos);
      this.ctx.stroke();
    }
  }

  /**
   * Draw timer border around the game area
   * @param {SpriteManager} spriteManager - The sprite manager
   * @param {number} filledSegments - Number of segments filled (starts from top-right)
   */
  drawTimerBorder(spriteManager, filledSegments = 0) {
    const border = CONFIG.TIMER_BORDER;
    const width = CONFIG.CANVAS_WIDTH;
    const height = CONFIG.CANVAS_HEIGHT;

    // Draw corners
    spriteManager.drawTimerCorner(this, 'top-left', 0, 0);
    spriteManager.drawTimerCorner(this, 'top-right', width - border, 0);
    spriteManager.drawTimerCorner(this, 'bottom-left', 0, height - border);
    spriteManager.drawTimerCorner(this, 'bottom-right', width - border, height - border);

    // Draw top center (L2C1 + L2C2 + L1C1 + L1C2 = 64px at 2x scale)
    const centerX = (width - 64) / 2;
    spriteManager.drawTimerTopCenter(this, centerX, 0);

    // Calculate segment counts for each section
    const topRightWidth = width - border - (centerX + 64);
    const topRightSegments = Math.floor(topRightWidth / border);
    const verticalHeight = height - (border * 2);
    const rightSegments = Math.floor(verticalHeight / border);
    const bottomWidth = width - (border * 2);
    const bottomSegments = Math.floor(bottomWidth / border);
    const leftSegments = Math.floor(verticalHeight / border);
    const topLeftWidth = centerX - border;
    const topLeftSegments = Math.floor(topLeftWidth / border);

    // Calculate starting index for each section (filling order):
    // 1. Top right (from center to right corner)
    // 2. Right side (top to bottom)
    // 3. Bottom (right to left)
    // 4. Left side (bottom to top)
    // 5. Top left (left corner to center)

    let currentIndex = 0;

    // 1. Top right border
    const topRightStart = centerX + 64;
    spriteManager.drawTimerHorizontalBorder(this, topRightStart, 0, topRightWidth, currentIndex, filledSegments);
    currentIndex += topRightSegments;

    // 2. Right border
    spriteManager.drawTimerVerticalBorder(this, width - border, border, verticalHeight, currentIndex, filledSegments);
    currentIndex += rightSegments;

    // 3. Bottom border (right to left - reversed)
    spriteManager.drawTimerHorizontalBorder(this, border, height - border, bottomWidth, currentIndex, filledSegments, true);
    currentIndex += bottomSegments;

    // 4. Left border (bottom to top - reversed)
    spriteManager.drawTimerVerticalBorder(this, 0, border, verticalHeight, currentIndex, filledSegments, true);
    currentIndex += leftSegments;

    // 5. Top left border (left to center)
    spriteManager.drawTimerHorizontalBorder(this, border, 0, topLeftWidth, currentIndex, filledSegments);
  }
}
