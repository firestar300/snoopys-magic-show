import { Ball } from '../entities/ball.js';
import { Woodstock } from '../entities/woodstock.js';
import { PowerUp } from '../entities/power-up.js';
import { TileType } from '../tiles/tile-types.js';

/**
 * Manages all game entities
 */
export class EntityManager {
  constructor() {
    this.entities = [];
  }

  /**
   * Add an entity
   */
  add(entity) {
    this.entities.push(entity);
  }

  /**
   * Remove an entity
   */
  remove(entity) {
    const index = this.entities.indexOf(entity);
    if (index > -1) {
      this.entities.splice(index, 1);
    }
  }

  /**
   * Get all entities
   */
  getAll() {
    return this.entities;
  }

  /**
   * Get entities by type
   */
  getByType(type) {
    return this.entities.filter(e => e.type === type);
  }

  /**
   * Clear all entities
   */
  clear() {
    this.entities = [];
  }

  /**
   * Spawn an entity from level data
   */
  spawnFromData(data, levelManager) {
    let entity = null;

    switch (data.type) {
      case 'ball':
        entity = new Ball(data.x, data.y, data.vx || 1, data.vy || 1);
        break;

      case 'woodstock':
        // Validate that Woodstock is not on a block
        if (levelManager) {
          const tile = levelManager.getTileAt(data.x, data.y);
          if (tile !== TileType.EMPTY &&
              tile !== TileType.ARROW_UP &&
              tile !== TileType.ARROW_DOWN &&
              tile !== TileType.ARROW_LEFT &&
              tile !== TileType.ARROW_RIGHT &&
              tile !== TileType.TELEPORT_A &&
              tile !== TileType.TELEPORT_B &&
              tile !== TileType.TOGGLE_BLOCK) {
            console.warn(`Woodstock at (${data.x}, ${data.y}) is on a blocking tile (type ${tile}). Skipping spawn.`);
            return; // Don't spawn Woodstock on solid blocks
          }
        }
        entity = new Woodstock(data.x, data.y);
        break;

      case 'powerup':
        const hidden = data.hidden || false;
        entity = new PowerUp(data.x, data.y, data.powerType || 'speed', hidden);

        // If power-up is hidden in a block, register it with the level manager
        if (hidden && data.blockX !== undefined && data.blockY !== undefined && levelManager) {
          levelManager.hidePowerUpInBlock(data.blockX, data.blockY, entity);
        }
        break;
    }

    if (entity) {
      this.add(entity);
    }
  }

  /**
   * Update all entities
   */
  update(dt, input, levelManager, game = null) {
    // Update entities and collect dead ones
    const deadEntities = [];

    for (const entity of this.entities) {
      entity.update(dt, input, levelManager, game);

      if (entity.isDead) {
        deadEntities.push(entity);
      }
    }

    // Remove dead entities
    for (const entity of deadEntities) {
      this.remove(entity);
    }
  }

  /**
   * Render all entities
   */
  render(renderer, spriteManager) {
    // Sort entities by type and y position for proper layering
    // Player is always rendered last (on top)
    const sorted = [...this.entities].sort((a, b) => {
      // Player always on top
      if (a.type === 'player') return 1;
      if (b.type === 'player') return -1;

      // Other entities sorted by y position
      return a.y - b.y;
    });

    for (const entity of sorted) {
      entity.render(renderer, spriteManager);
    }
  }
}
