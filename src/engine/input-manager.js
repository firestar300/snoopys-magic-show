import { CONFIG } from '../config.js';
import { TouchControls } from '../ui/touch-controls.js';

/**
 * Manages keyboard and touch input for the game
 */
export class InputManager {
  constructor(canvas) {
    this.keys = {};
    this.previousKeys = {};
    this.previousTouchAction = false;

    // Touch controls
    this.touchControls = new TouchControls(canvas);

    // Bind event listeners
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  /**
   * Handle key down event
   */
  onKeyDown(event) {
    this.keys[event.key] = true;

    // Prevent default for game keys
    if (this.isGameKey(event.key)) {
      event.preventDefault();
    }
  }

  /**
   * Handle key up event
   */
  onKeyUp(event) {
    this.keys[event.key] = false;
  }

  /**
   * Check if a key is a game key
   */
  isGameKey(key) {
    for (const keys of Object.values(CONFIG.KEYS)) {
      if (keys.includes(key)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get current input state
   */
  getState() {
    // Get touch state
    const touchState = this.touchControls.getState();

    const state = {
      up: this.isPressed('UP') || touchState.up,
      down: this.isPressed('DOWN') || touchState.down,
      left: this.isPressed('LEFT') || touchState.left,
      right: this.isPressed('RIGHT') || touchState.right,
      action: this.isPressed('ACTION') || touchState.action,
      actionJustPressed: this.isJustPressed('ACTION') || (touchState.action && !this.previousTouchAction),
    };

    // Store previous state for next frame
    this.previousKeys = { ...this.keys };
    this.previousTouchAction = touchState.action;

    return state;
  }

  /**
   * Check if a direction key is currently pressed
   */
  isPressed(direction) {
    const keys = CONFIG.KEYS[direction];
    return keys.some(key => this.keys[key]);
  }

  /**
   * Check if a key was just pressed (not held)
   */
  isJustPressed(direction) {
    const keys = CONFIG.KEYS[direction];
    return keys.some(key => this.keys[key] && !this.previousKeys[key]);
  }
}
