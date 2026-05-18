/**
 * Power State Manager
 * Manages the ON/OFF state of the Game Boy
 */

// Game Boy palette colors
export const GB_PALETTE = {
  darkest: '#0f380f',
  dark: '#306230',
  light: '#8bac0f',
  lightest: '#9bbc0f',
  screen: '#606d01', // innerdisplay background
};

class PowerState {
  constructor() {
    this.isOn = false;
    this.game = null;
    this.canvas = null;
    this.offScreen = null;
    this.listeners = [];
    /** @type {string | null} World JSON from editor "Play now", held until Game boots */
    this.pendingEditorWorldJson = null;
    this._creatingGame = false;
  }

  /**
   * @param {string} jsonString
   */
  setPendingEditorWorldJson(jsonString) {
    this.pendingEditorWorldJson = jsonString;
  }

  /**
   * @returns {string | null}
   */
  takePendingEditorWorldJson() {
    const raw = this.pendingEditorWorldJson;
    this.pendingEditorWorldJson = null;
    return raw;
  }

  /**
   * @returns {boolean}
   */
  hasPendingEditorWorld() {
    return this.pendingEditorWorldJson != null;
  }

  /**
   * Initialize the power state manager
   * @param {HTMLCanvasElement} canvas - The game canvas
   */
  init(canvas) {
    this.canvas = canvas;
    this.offScreen = this.createOffScreen();
    this.renderOffScreen();
  }

  /**
   * Create the OFF screen overlay element
   */
  createOffScreen() {
    const offScreen = document.createElement('div');
    offScreen.className = 'gameboy-off-screen';
    offScreen.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: ${GB_PALETTE.screen};
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: opacity 0.5s ease-out;
    `;

    // Insert before the canvas in the innerdisplay
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.insertBefore(offScreen, this.canvas);
    }

    return offScreen;
  }

  /**
   * Render the OFF screen content
   */
  renderOffScreen() {
    if (!this.offScreen) return;

    // Simple powered off state - just the green screen
    this.offScreen.innerHTML = '';
  }

  /**
   * Turn ON the Game Boy
   */
  turnOn() {
    if (this.isOn) return;

    this.isOn = true;

    // Hide the off screen
    if (this.offScreen) {
      this.offScreen.style.opacity = '0';
      setTimeout(() => {
        this.offScreen.style.display = 'none';
      }, 500);
    }

    // Initialize and start the game
    if (this.game) {
      // Game already created, just start it
      this.game.start();
    } else {
      // Create new game instance
      this.createGame();
    }

    // Notify listeners
    this.listeners.forEach(listener => listener('on'));
  }

  /**
   * Turn OFF the Game Boy
   */
  turnOff() {
    if (!this.isOn) return;

    this.isOn = false;

    // Show the off screen
    if (this.offScreen) {
      this.offScreen.style.display = 'flex';
      // Force reflow for transition
      this.offScreen.offsetHeight;
      this.offScreen.style.opacity = '1';
    }

    // Stop the game
    if (this.game) {
      this.game.stop();
      this.game.audioManager?.stopMusic();
    }

    // Notify listeners
    this.listeners.forEach(listener => listener('off'));
  }

  /**
   * Create the game instance
   */
  createGame() {
    if (this.game || this._creatingGame) {
      return;
    }

    this._creatingGame = true;

    // Import Game dynamically to avoid circular dependencies
    import('./engine/game.js')
      .then(({ Game }) => {
        if (!this.game) {
          this.game = new Game(this.canvas);
          window.game = this.game; // For debugging
        }
      })
      .finally(() => {
        this._creatingGame = false;
      });
  }

  /**
   * Set the game instance (called from main.js)
   */
  setGame(game) {
    this.game = game;
  }

  /**
   * Add a state change listener
   */
  onStateChange(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove a state change listener
   */
  offStateChange(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  /**
   * Get current state
   */
  getState() {
    return this.isOn ? 'on' : 'off';
  }
}

// Export singleton instance
export const powerState = new PowerState();
