import './style.css';
import './gameboy.css';
import './cartbridge.css';
import { initCartridgeDrag } from './cartridge-drag.js';
import { powerState } from './power-state.js';
import { takeQueuedWorldJsonString } from './level/editor-launch-bridge.js';

// Get the canvas element
const canvas = document.getElementById('gameCanvas');
const hudStack = document.getElementById('hud-stack');

// Capture editor payload before Game boots (same-origin localStorage from level editor)
const queuedEditorWorld = takeQueuedWorldJsonString();
if (queuedEditorWorld) {
  powerState.setPendingEditorWorldJson(queuedEditorWorld);
}

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
