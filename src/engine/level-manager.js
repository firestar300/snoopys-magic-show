import { CONFIG } from '../config.js';
import { TileType } from '../tiles/tile-types.js';

/**
 * Manages levels, tiles, and level data
 */
export class LevelManager {
  constructor() {
    this.currentLevel = null;
    this.tiles = [];
    this.animatingBlocks = []; // Blocks currently being animated
    this.toggleBlocks = []; // Toggle blocks with their states
    this.toggleCycleDuration = 14; // Total cycle: 7s solid + 7s passable
    this.toggleTimer = -0.1; // Start with -0.5s (0.5 second delay before cycle starts)
    this.toggleTransitionDuration = 0.4; // Transition animation duration (slowed down)
    this.hiddenPowerUps = new Map(); // Power-ups hidden in blocks, keyed by "x,y"
    this.hiddenPortals = new Map(); // Portals hidden in blocks, keyed by "x,y"
  }

  /**
   * Load a level by its number
   */
  async loadLevel(levelNumber) {
    try {
      // Reset all temporary states before loading new level
      this.resetLevelState();

      // Import level data
      const levelData = await import(`../levels/level-${levelNumber}.json`);
      this.currentLevel = levelData.default || levelData;

      // Parse tiles
      this.parseTiles();
    } catch (error) {
      console.error(`Failed to load level ${levelNumber}:`, error);
      // Load fallback level if level file doesn't exist
      await this.loadFallbackLevel();
    }
  }

  /**
   * Reset all temporary level states
   */
  resetLevelState() {
    // Clear animating blocks
    this.animatingBlocks = [];

    // Reset toggle timer
    this.toggleTimer = -0.1; // Start with delay

    // Toggle blocks will be cleared and rebuilt by parseTiles
    this.toggleBlocks = [];

    // Clear hidden power-ups map
    this.hiddenPowerUps = new Map();

    // Clear hidden portals map
    this.hiddenPortals = new Map();
  }

  /**
   * Load the fallback level when requested level doesn't exist
   */
  async loadFallbackLevel() {
    try {
      console.warn('Loading fallback level...');

      // Reset all temporary states
      this.resetLevelState();

      // Import fallback level data
      const levelData = await import(`../levels/level-default.json`);
      this.currentLevel = levelData.default || levelData;

      // Parse tiles
      this.parseTiles();
    } catch (error) {
      // If even the fallback level fails, create a minimal emergency level
      console.error('Failed to load fallback level, creating emergency level:', error);
      this.createEmergencyLevel();
    }
  }

  /**
   * Create a minimal emergency level if all else fails
   */
  createEmergencyLevel() {
    // Reset all temporary states
    this.resetLevelState();

    this.currentLevel = {
      id: 0,
      name: 'Emergency Level',
      width: CONFIG.GRID_WIDTH,
      height: CONFIG.GRID_HEIGHT,
      startPosition: { x: 4, y: 4 },
      tiles: [
        '000000000',
        '000000000',
        '000000000',
        '000000000',
        '000000000',
        '000000000',
        '000000000',
        '000000000',
      ],
      entities: [
        { type: 'woodstock', x: 7, y: 6 },
      ],
    };

    this.parseTiles();
  }

  /**
   * Parse tile data from level
   */
  parseTiles() {
    this.tiles = [];
    this.toggleBlocks = [];

    const tileData = this.currentLevel.tiles;
    for (let y = 0; y < tileData.length; y++) {
      const row = [];
      const rowData = tileData[y];

      for (let x = 0; x < rowData.length; x++) {
        const tileChar = rowData[x];
        const tileType = this.getTileTypeFromChar(tileChar);
        row.push(tileType);

        // Register toggle blocks
        if (tileType === TileType.TOGGLE_BLOCK) {
          this.toggleBlocks.push({
            x: x,
            y: y,
            isSolid: false, // Start as non-solid (passable)
            isTransitioning: false, // No animation during initial delay
            transitionProgress: 0,
          });
        }
      }

      this.tiles.push(row);
    }
  }

  /**
   * Convert a character to a tile type
   */
  getTileTypeFromChar(char) {
    const mapping = {
      '0': TileType.EMPTY,
      '1': TileType.WALL,
      '2': TileType.PUSHABLE,
      '3': TileType.BREAKABLE,
      '4': TileType.TELEPORT_A,
      '5': TileType.TELEPORT_B,
      '6': TileType.ARROW_UP,
      '7': TileType.ARROW_RIGHT,
      '8': TileType.ARROW_DOWN,
      '9': TileType.ARROW_LEFT,
      'A': TileType.PUSHABLE_UP,
      'B': TileType.PUSHABLE_DOWN,
      'C': TileType.PUSHABLE_LEFT,
      'D': TileType.PUSHABLE_RIGHT,
      'E': TileType.TOGGLE_BLOCK,
    };

    return mapping[char] || TileType.EMPTY;
  }

  /**
   * Get tile at grid position
   */
  getTileAt(gridX, gridY) {
    if (gridY < 0 || gridY >= this.tiles.length) return TileType.WALL;
    if (gridX < 0 || gridX >= this.tiles[gridY].length) return TileType.WALL;

    return this.tiles[gridY][gridX];
  }

  /**
   * Set tile at grid position
   */
  setTileAt(gridX, gridY, tileType) {
    if (gridY < 0 || gridY >= this.tiles.length) return;
    if (gridX < 0 || gridX >= this.tiles[gridY].length) return;

    this.tiles[gridY][gridX] = tileType;
  }

  /**
   * Check if tile is solid (blocks movement)
   */
  isSolid(gridX, gridY) {
    // Check canvas bounds first
    if (gridX < 0 || gridX >= CONFIG.GRID_WIDTH || gridY < 0 || gridY >= CONFIG.GRID_HEIGHT) {
      return true;
    }

    // Check if position is occupied by an animating block's destination
    for (const block of this.animatingBlocks) {
      if (block.destX === gridX && block.destY === gridY) {
        return true; // Destination is reserved for the animating block
      }
    }

    const tile = this.getTileAt(gridX, gridY);

    // Check toggle blocks
    if (tile === TileType.TOGGLE_BLOCK) {
      const toggleBlock = this.getToggleBlockAt(gridX, gridY);
      if (!toggleBlock) return true;

      // Always use the current solid state (it's updated at the start of transition now)
      return toggleBlock.isSolid;
    }

    // WALL, PUSHABLE blocks, and BREAKABLE block movement
    // BROKEN (10) is traversable
    return (
      tile === TileType.WALL ||
      tile === TileType.PUSHABLE ||
      tile === TileType.BREAKABLE ||
      tile === TileType.PUSHABLE_UP ||
      tile === TileType.PUSHABLE_DOWN ||
      tile === TileType.PUSHABLE_LEFT ||
      tile === TileType.PUSHABLE_RIGHT
    );
  }

  /**
   * Get toggle block state at position
   */
  getToggleBlockAt(gridX, gridY) {
    return this.toggleBlocks.find(block => block.x === gridX && block.y === gridY);
  }

  /**
   * Check if player is trapped on a toggle block
   */
  isPlayerTrappedOnToggleBlock(gridX, gridY) {
    const tile = this.getTileAt(gridX, gridY);

    // Check if player is standing on a toggle block
    if (tile === TileType.TOGGLE_BLOCK) {
      const toggleBlock = this.getToggleBlockAt(gridX, gridY);
      if (!toggleBlock) return false;

      // Player is trapped if the block is solid
      return toggleBlock.isSolid;
    }

    return false;
  }

  /**
   * Check if a tile is a pushable block
   */
  isPushable(gridX, gridY) {
    const tile = this.getTileAt(gridX, gridY);
    return (
      tile === TileType.PUSHABLE ||
      tile === TileType.PUSHABLE_UP ||
      tile === TileType.PUSHABLE_DOWN ||
      tile === TileType.PUSHABLE_LEFT ||
      tile === TileType.PUSHABLE_RIGHT
    );
  }

  /**
   * Try to push a block in a direction
   * Returns true if push was successful
   */
  tryPushBlock(gridX, gridY, direction, entityManager = null) {
    const tile = this.getTileAt(gridX, gridY);

    // Check if tile is pushable
    if (!this.isPushable(gridX, gridY)) {
      return false;
    }

    // Check if direction matches the block's allowed direction
    const allowedDirection = this.getPushDirection(tile);
    if (allowedDirection !== 'any' && allowedDirection !== direction) {
      return false; // Can't push in this direction
    }

    // Calculate destination
    let destX = gridX;
    let destY = gridY;

    switch (direction) {
      case 'up':
        destY--;
        break;
      case 'down':
        destY++;
        break;
      case 'left':
        destX--;
        break;
      case 'right':
        destX++;
        break;
    }

    // Check if destination is empty
    if (this.isSolid(destX, destY) || !this.isInBounds(destX, destY)) {
      return false; // Can't push into solid tile or out of bounds
    }

    // Clear the source position
    this.setTileAt(gridX, gridY, TileType.EMPTY);

    // Reveal power-up if there was one hidden in this block
    const powerUp = this.revealPowerUpFromBlock(gridX, gridY);
    if (powerUp) {
      powerUp.reveal(gridX, gridY, direction, this, entityManager);
    }

    // Reveal portal if there was one hidden in this block
    const portal = this.revealPortalFromBlock(gridX, gridY);
    if (portal) {
      portal.reveal();
    }

    // Create animation for the block
    this.animatingBlocks.push({
      tileType: tile,
      fromX: gridX,
      fromY: gridY,
      toX: destX,
      toY: destY,
      destX: destX,
      destY: destY,
      progress: 0,
      duration: 0.2, // 200ms animation
    });

    return true;
  }

  /**
   * Get the allowed push direction for a pushable block
   */
  getPushDirection(tileType) {
    switch (tileType) {
      case TileType.PUSHABLE_UP:
        return 'up';
      case TileType.PUSHABLE_DOWN:
        return 'down';
      case TileType.PUSHABLE_LEFT:
        return 'left';
      case TileType.PUSHABLE_RIGHT:
        return 'right';
      case TileType.PUSHABLE:
        return 'any'; // Old generic pushable (for backward compatibility)
      default:
        return null;
    }
  }

  /**
   * Update block animations and toggle blocks
   */
  update(dt, player = null) {
    // Update all animating blocks (pushable blocks)
    for (let i = this.animatingBlocks.length - 1; i >= 0; i--) {
      const block = this.animatingBlocks[i];
      block.progress += dt / block.duration;

      if (block.progress >= 1) {
        // Animation complete
        block.progress = 1;

        // Set the final tile at destination (convert to wall)
        this.setTileAt(block.destX, block.destY, TileType.WALL);

        // Remove from animation array
        this.animatingBlocks.splice(i, 1);
      }
    }

    // Update toggle blocks cycle
    this.toggleTimer += dt;

    // Skip toggle block logic during initial delay (first second)
    if (this.toggleTimer < 0) {
      return;
    }

    const cyclePosition = this.toggleTimer % this.toggleCycleDuration;
    const halfCycle = this.toggleCycleDuration / 2;

    // Get player grid position if available
    let playerGridX = -1;
    let playerGridY = -1;
    if (player && !player.isMoving) {
      playerGridX = player.getGridX();
      playerGridY = player.getGridY();
    }

    for (const toggleBlock of this.toggleBlocks) {
      const shouldBeSolid = cyclePosition < halfCycle; // First half: solid (7s), second half: passable (7s)

      // Check if player is standing on this toggle block
      const playerOnBlock = (playerGridX === toggleBlock.x && playerGridY === toggleBlock.y);

      // If player is on block and it should become solid, prevent the transition
      if (playerOnBlock && shouldBeSolid && !toggleBlock.isSolid) {
        // Keep block non-solid, cancel any ongoing transition
        toggleBlock.isTransitioning = false;
        toggleBlock.transitionProgress = 0;
        continue; // Skip this block's update
      }

      // Check if state should change
      if (shouldBeSolid !== toggleBlock.isSolid && !toggleBlock.isTransitioning) {
        // Start transition and immediately change solid state
        toggleBlock.isTransitioning = true;
        toggleBlock.transitionProgress = 0;
        toggleBlock.isSolid = shouldBeSolid; // Change state immediately at start of transition
      }

      // Update transition
      if (toggleBlock.isTransitioning) {
        toggleBlock.transitionProgress += dt / this.toggleTransitionDuration;

        if (toggleBlock.transitionProgress >= 1) {
          // Transition animation complete
          toggleBlock.isTransitioning = false;
          toggleBlock.transitionProgress = 0;
        }
      }
    }
  }

  /**
   * Check if any blocks are currently animating
   */
  isAnimating() {
    return this.animatingBlocks.length > 0;
  }

  /**
   * Check if position is within bounds
   */
  isInBounds(gridX, gridY) {
    return (
      gridX >= 0 &&
      gridX < CONFIG.GRID_WIDTH &&
      gridY >= 0 &&
      gridY < CONFIG.GRID_HEIGHT
    );
  }

  /**
   * Get player start position
   */
  getStartPosition() {
    const start = this.currentLevel.startPosition || { x: 1, y: 1 };
    return {
      x: start.x * CONFIG.TILE_SIZE,
      y: start.y * CONFIG.TILE_SIZE,
    };
  }

  /**
   * Get entities to spawn from level data
   */
  getEntities() {
    return this.currentLevel.entities || [];
  }

  /**
   * Register a power-up as hidden in a block
   */
  hidePowerUpInBlock(gridX, gridY, powerUp) {
    const key = `${gridX},${gridY}`;
    this.hiddenPowerUps.set(key, powerUp);
  }

  /**
   * Reveal power-up from a block (if any)
   */
  revealPowerUpFromBlock(gridX, gridY) {
    const key = `${gridX},${gridY}`;
    const powerUp = this.hiddenPowerUps.get(key);

    if (powerUp) {
      this.hiddenPowerUps.delete(key);
      return powerUp;
    }

    return null;
  }

  /**
   * Register a portal as hidden in a block
   */
  hidePortalInBlock(gridX, gridY, portal) {
    const key = `${gridX},${gridY}`;
    this.hiddenPortals.set(key, portal);
  }

  /**
   * Reveal portal from a block (if any)
   */
  revealPortalFromBlock(gridX, gridY) {
    const key = `${gridX},${gridY}`;
    const portal = this.hiddenPortals.get(key);

    if (portal) {
      this.hiddenPortals.delete(key);
      return portal;
    }

    return null;
  }

  /**
   * Find the destination for a teleport tile
   */
  findTeleportDestination(fromX, fromY, tileType) {
    // Find the other teleport of the same type
    for (let y = 0; y < this.tiles.length; y++) {
      for (let x = 0; x < this.tiles[y].length; x++) {
        // Skip the current position
        if (x === fromX && y === fromY) continue;

        // Found the matching teleport
        if (this.tiles[y][x] === tileType) {
          return { x, y };
        }
      }
    }

    return null;
  }

  /**
   * Render the level
   */
  render(renderer, spriteManager) {
    // Render static tiles
    for (let y = 0; y < this.tiles.length; y++) {
      for (let x = 0; x < this.tiles[y].length; x++) {
        const tile = this.tiles[y][x];
        this.renderTile(renderer, tile, x, y, spriteManager);
      }
    }

    // Render animating blocks on top
    for (const block of this.animatingBlocks) {
      // Interpolate position using easeInOutQuad for smooth animation
      const t = this.easeInOutQuad(block.progress);
      const currentX = block.fromX + (block.toX - block.fromX) * t;
      const currentY = block.fromY + (block.toY - block.fromY) * t;

      const pixelX = currentX * CONFIG.TILE_SIZE;
      const pixelY = currentY * CONFIG.TILE_SIZE;
      const size = CONFIG.TILE_SIZE;

      // Draw the moving block
      if (spriteManager && spriteManager.isLoaded()) {
        spriteManager.drawBlock(renderer, block.tileType, pixelX, pixelY, size, size);
      } else {
        // Fallback rendering
        renderer.drawRect(pixelX, pixelY, size, size, CONFIG.COLORS.DARK);
        renderer.drawRectOutline(pixelX, pixelY, size, size, CONFIG.COLORS.MID_DARK, 2);
      }
    }
  }

  /**
   * Easing function for smooth animation
   */
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Render a single tile with sprites
   */
  renderTile(renderer, tile, gridX, gridY, spriteManager) {
    const x = gridX * CONFIG.TILE_SIZE;
    const y = gridY * CONFIG.TILE_SIZE;
    const size = CONFIG.TILE_SIZE;

    // Empty tile
    if (tile === TileType.EMPTY) return;

    // Handle toggle blocks separately
    if (tile === TileType.TOGGLE_BLOCK) {
      const toggleBlock = this.getToggleBlockAt(gridX, gridY);
      if (toggleBlock && spriteManager && spriteManager.isLoaded()) {
        let state = toggleBlock.isSolid ? 'solid' : 'passable';
        let transitionFrame = 0;

        if (toggleBlock.isTransitioning) {
          state = 'transitioning';
          // Alternate between frame 0 and 1 based on transition progress
          // 4 alternations during the transition (2 times each sprite)
          transitionFrame = Math.floor(toggleBlock.transitionProgress * 6) % 2;
        }

        spriteManager.drawToggleBlock(renderer, state, x, y, size, size, transitionFrame);
      } else {
        // Fallback rendering
        const color = toggleBlock && !toggleBlock.isSolid ? CONFIG.COLORS.MID_LIGHT : CONFIG.COLORS.DARK;
        renderer.drawRect(x, y, size, size, color);
      }
      return;
    }

    // Use sprites if loaded
    if (spriteManager && spriteManager.isLoaded()) {
      spriteManager.drawBlock(renderer, tile, x, y, size, size);
    } else {
      // Fallback rendering
      switch (tile) {
        case TileType.WALL:
          renderer.drawRect(x, y, size, size, CONFIG.COLORS.DARK);
          renderer.drawRectOutline(x, y, size, size, CONFIG.COLORS.MID_DARK, 2);
          break;

        case TileType.PUSHABLE:
          renderer.drawRect(x + 4, y + 4, size - 8, size - 8, CONFIG.COLORS.MID_DARK);
          renderer.drawRectOutline(x + 4, y + 4, size - 8, size - 8, CONFIG.COLORS.DARK, 2);
          break;

        case TileType.BREAKABLE:
          renderer.drawRect(x + 2, y + 2, size - 4, size - 4, CONFIG.COLORS.MID_LIGHT);
          break;

        case TileType.TELEPORT_A:
        case TileType.TELEPORT_B:
          renderer.drawCircle(x + size / 2, y + size / 2, size / 3, CONFIG.COLORS.MID_DARK);
          break;

        case TileType.ARROW_UP:
        case TileType.ARROW_RIGHT:
        case TileType.ARROW_DOWN:
        case TileType.ARROW_LEFT:
          this.drawArrow(renderer, x, y, size, tile - 6);
          break;
      }
    }
  }

  /**
   * Draw an arrow tile
   */
  drawArrow(renderer, x, y, size, direction) {
    const ctx = renderer.ctx;
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const arrowSize = size / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((direction * Math.PI) / 2);

    ctx.fillStyle = CONFIG.COLORS.MID_DARK;
    ctx.beginPath();
    ctx.moveTo(0, -arrowSize / 2);
    ctx.lineTo(arrowSize / 3, arrowSize / 2);
    ctx.lineTo(-arrowSize / 3, arrowSize / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
