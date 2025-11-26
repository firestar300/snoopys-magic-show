import { CONFIG } from '../config.js';
import { TouchControls } from '../ui/touch-controls.js';

/**
 * Manages keyboard, touch, and gamepad input for the game
 */
export class InputManager {
  constructor(canvas) {
    this.keys = {};
    this.previousKeys = {};
    this.previousTouchAction = false;

    // Touch controls
    this.touchControls = new TouchControls(canvas);

    // Gamepad state
    this.gamepadConnected = false;
    this.previousGamepadButtons = {};
    this.gamepadDeadzone = 0.3; // Deadzone for analog sticks
    this.gamepadDebugLogged = false; // Flag to log debug info once
    this.previousPause = false; // Track previous pause button state

    // Bind event listeners
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    // Gamepad events
    window.addEventListener('gamepadconnected', (e) => this.onGamepadConnected(e));
    window.addEventListener('gamepaddisconnected', (e) => this.onGamepadDisconnected(e));

    // Dev mode: Log gamepad API availability
    if (CONFIG.DEV_MODE) {
      console.log('🎮 Gamepad API available:', 'getGamepads' in navigator);
      console.log('💡 TIP: Click on the page and press a button on your controller to activate it');

      let pollCount = 0;
      // Poll for gamepads every 2 seconds in dev mode
      setInterval(() => {
        pollCount++;
        const gamepads = navigator.getGamepads();
        const connected = [];
        for (let i = 0; i < gamepads.length; i++) {
          if (gamepads[i]) {
            connected.push({ index: i, id: gamepads[i].id, buttons: gamepads[i].buttons.length });
          }
        }

        if (connected.length > 0) {
          if (!this.gamepadConnected) {
            console.log('🎮 Gamepads detected:', connected);
          }
        } else {
          // Show periodic reminder
          if (pollCount % 5 === 0) {
            console.log('🎮 No gamepads detected. Make sure to:');
            console.log('   1. Click on the page');
            console.log('   2. Press a button on your controller');
            console.log('   3. Or type /gamepad in dev console while holding a button');
          }
        }
      }, 2000);
    }
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
   * Handle gamepad connected event
   */
  onGamepadConnected(event) {
    console.log('🎮 Gamepad connected:', event.gamepad.id);
    this.gamepadConnected = true;
  }

  /**
   * Handle gamepad disconnected event
   */
  onGamepadDisconnected(event) {
    console.log('🎮 Gamepad disconnected:', event.gamepad.id);
    this.gamepadConnected = false;
  }

  /**
   * Get gamepad state
   */
  getGamepadState() {
    const gamepads = navigator.getGamepads();

    // Find first connected gamepad
    let gamepad = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        gamepad = gamepads[i];

        // Auto-detect connection if not already flagged
        if (!this.gamepadConnected) {
          console.log('🎮 Gamepad detected:', gamepad.id);
          this.gamepadConnected = true;
        }
        break;
      }
    }

    if (!gamepad) {
      // Auto-detect disconnection
      if (this.gamepadConnected) {
        console.log('🎮 Gamepad disconnected');
        this.gamepadConnected = false;
      }

      return {
        up: false,
        down: false,
        left: false,
        right: false,
        action: false,
        pause: false,
      };
    }

    // Read axes (left stick or D-pad on some controllers)
    const leftStickX = gamepad.axes[0] || 0;
    const leftStickY = gamepad.axes[1] || 0;

    // Debug: Log gamepad info on first button press
    if (CONFIG.DEV_MODE && !this.gamepadDebugLogged) {
      for (let i = 0; i < gamepad.buttons.length; i++) {
        if (gamepad.buttons[i].pressed) {
          console.log('🎮 Gamepad Debug:');
          console.log('  ID:', gamepad.id);
          console.log('  Buttons:', gamepad.buttons.length);
          console.log('  Axes:', gamepad.axes.length);
          console.log('  Button pressed:', i);
          this.gamepadDebugLogged = true;
          break;
        }
      }
    }

    // Read buttons
    const buttons = gamepad.buttons;

    // Try multiple D-pad mappings (varies by controller)
    // Standard mapping: buttons 12-15
    // Some controllers use axes for D-pad
    const dpadUp = buttons[12]?.pressed || leftStickY < -0.5 || false;
    const dpadDown = buttons[13]?.pressed || leftStickY > 0.5 || false;
    const dpadLeft = buttons[14]?.pressed || leftStickX < -0.5 || false;
    const dpadRight = buttons[15]?.pressed || leftStickX > 0.5 || false;

    // Apply deadzone to analog stick (if separate from D-pad)
    const stickUp = leftStickY < -this.gamepadDeadzone;
    const stickDown = leftStickY > this.gamepadDeadzone;
    const stickLeft = leftStickX < -this.gamepadDeadzone;
    const stickRight = leftStickX > this.gamepadDeadzone;

    return {
      up: dpadUp || stickUp,
      down: dpadDown || stickDown,
      left: dpadLeft || stickLeft,
      right: dpadRight || stickRight,
      action: buttons[0]?.pressed || buttons[1]?.pressed || false, // B or A button
      pause: buttons[9]?.pressed || buttons[8]?.pressed || buttons[16]?.pressed || buttons[17]?.pressed || false,  // Start, Select, Share, PS button
    };
  }

  /**
   * Check if gamepad button was just pressed
   */
  isGamepadButtonJustPressed(buttonIndex) {
    const gamepads = navigator.getGamepads();

    // Find first connected gamepad
    let gamepad = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        gamepad = gamepads[i];
        break;
      }
    }

    if (!gamepad || !gamepad.buttons[buttonIndex]) {
      return false;
    }

    const currentlyPressed = gamepad.buttons[buttonIndex].pressed;
    const previouslyPressed = this.previousGamepadButtons[buttonIndex] || false;

    return currentlyPressed && !previouslyPressed;
  }

  /**
   * Check if any of the pause buttons was just pressed
   */
  isPauseButtonJustPressed() {
    const pauseButtons = [8, 9, 16, 17]; // Select, Start, Share, PS button
    return pauseButtons.some(btn => this.isGamepadButtonJustPressed(btn));
  }

  /**
   * Update previous gamepad button states
   */
  updatePreviousGamepadState() {
    const gamepads = navigator.getGamepads();

    // Find first connected gamepad
    let gamepad = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        gamepad = gamepads[i];
        break;
      }
    }

    if (gamepad) {
      this.previousGamepadButtons = {};
      gamepad.buttons.forEach((button, index) => {
        this.previousGamepadButtons[index] = button.pressed;
      });
    }
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

    // Get gamepad state
    const gamepadState = this.getGamepadState();

    const state = {
      up: this.isPressed('UP') || touchState.up || gamepadState.up,
      down: this.isPressed('DOWN') || touchState.down || gamepadState.down,
      left: this.isPressed('LEFT') || touchState.left || gamepadState.left,
      right: this.isPressed('RIGHT') || touchState.right || gamepadState.right,
      action: this.isPressed('ACTION') || touchState.action || gamepadState.action,
      actionJustPressed: this.isJustPressed('ACTION') || (touchState.action && !this.previousTouchAction) || this.isGamepadButtonJustPressed(0) || this.isGamepadButtonJustPressed(1),
      pause: gamepadState.pause, // Start button on gamepad (held)
      pauseJustPressed: this.isPauseButtonJustPressed(), // Any pause button just pressed
    };

    // Store previous state for next frame
    this.previousKeys = { ...this.keys };
    this.previousTouchAction = touchState.action;
    this.previousPause = gamepadState.pause;
    this.updatePreviousGamepadState();

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

  /**
   * Check if a gamepad is currently connected
   */
  isGamepadConnected() {
    const gamepads = navigator.getGamepads();
    if (!gamepads) return false;

    // Check all gamepad slots
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] !== null) {
        return true;
      }
    }

    return false;
  }
}
