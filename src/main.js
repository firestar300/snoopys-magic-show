import './style.css';
import './gameboy.css';
import './cartbridge.css';
import { initCartridgeDrag } from './cartridge-drag.js';
import { powerState } from './power-state.js';

// Get the canvas element
const canvas = document.getElementById('gameCanvas');
const hudStack = document.getElementById('hud-stack');

// Initialize power state (creates off screen)
powerState.init(canvas);

// Initialize cartridge drag interaction
const cartridgeDrag = initCartridgeDrag();

// Show/hide UI based on power state
powerState.onStateChange((state) => {
  if (state === 'on') {
    hudStack?.classList.add('visible');
  } else {
    hudStack?.classList.remove('visible');
  }
});

// Make power state accessible for debugging
window.powerState = powerState;
window.cartridgeDrag = cartridgeDrag;
