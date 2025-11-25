/**
 * Virtual touch controls for mobile devices using HTML elements
 */
export class TouchControls {
  constructor(canvas) {
    this.canvas = canvas;
    this.isVisible = this.isMobileDevice();

    // Touch state
    this.touchState = {
      up: false,
      down: false,
      left: false,
      right: false,
      action: false,
    };

    // Get control elements
    this.controlsContainer = document.getElementById('touch-controls');
    this.buttons = {
      up: document.querySelector('.touch-up'),
      down: document.querySelector('.touch-down'),
      left: document.querySelector('.touch-left'),
      right: document.querySelector('.touch-right'),
      action: document.querySelector('.touch-action'),
    };

    if (this.isVisible && this.controlsContainer) {
      this.showControls();
      this.setupTouchEvents();
    }
  }

  /**
   * Detect if device is mobile
   */
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768;
  }

  /**
   * Show controls
   */
  showControls() {
    if (this.controlsContainer) {
      this.controlsContainer.classList.remove('hidden');
    }
  }

  /**
   * Setup touch event listeners on buttons
   */
  setupTouchEvents() {
    for (const [direction, button] of Object.entries(this.buttons)) {
      if (!button) continue;

      // Touch events
      button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.touchState[direction] = true;
      }, { passive: false });

      button.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.touchState[direction] = false;
      }, { passive: false });

      button.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        this.touchState[direction] = false;
      }, { passive: false });

      // Mouse events for testing on desktop
      button.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.touchState[direction] = true;
      });

      button.addEventListener('mouseup', (e) => {
        e.preventDefault();
        this.touchState[direction] = false;
      });

      button.addEventListener('mouseleave', (e) => {
        this.touchState[direction] = false;
      });
    }
  }

  /**
   * Get current touch state
   */
  getState() {
    return { ...this.touchState };
  }

  /**
   * Reset touch state
   */
  reset() {
    this.touchState = {
      up: false,
      down: false,
      left: false,
      right: false,
      action: false,
    };
  }

  /**
   * Render touch controls (no longer needed with HTML controls)
   */
  render(renderer) {
    // Controls are now HTML elements, nothing to render on canvas
  }
}
