/**
 * Cartridge drag interaction
 * Allows dragging the cartridge down on Y axis
 * Simultaneously moves the gameboy up
 * Triggers game power ON when cartridge is fully inserted
 */

import { powerState } from './power-state.js';

/**
 * Create the drag hint element
 */
function createDragHint(cartridge) {
  const hint = document.createElement('div');
  hint.className = 'cartridge-drag-hint';
  hint.innerHTML = `
    <span class="hint-arrow">↓</span>
    <span class="hint-text">Drag down to insert</span>
  `;

  // Insert hint inside the cartridge element
  cartridge.appendChild(hint);

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .cartridge-drag-hint {
      position: absolute;
      bottom: -80px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: #fff;
      font-family: 'Press Start 2P', 'Courier New', monospace;
      font-size: 14px;
      text-shadow: 2px 2px 6px rgba(0, 0, 0, 0.9);
      pointer-events: none;
      z-index: 100;
      animation: hintPulse 2s ease-in-out infinite;
    }

    .hint-arrow {
      font-size: 32px;
      animation: hintBounce 1s ease-in-out infinite;
    }

    .hint-text {
      white-space: nowrap;
      text-align: center;
    }

    @keyframes hintPulse {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }

    @keyframes hintBounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(10px); }
    }

    .cartridge-drag-hint.hiding {
      opacity: 0;
      transition: opacity 0.3s ease-out;
    }

    .cartridge-drag-hint.hidden {
      display: none;
    }
  `;
  document.head.appendChild(style);

  return hint;
}

export function initCartridgeDrag() {
  const cartridge = document.querySelector('.cartbridge');
  const gameboy = document.querySelector('.gameboy');

  if (!cartridge || !gameboy) {
    console.warn('Cartridge or Gameboy element not found');
    return;
  }

  // Create drag hint
  const dragHint = createDragHint(cartridge);

  // Initial and final Y positions (in percentage)
  const cartridgeStart = -120;
  const cartridgeEnd = 10;
  const gameboyStart = 80;
  const gameboyEnd = 46;

  // Gameboy dimensions for centering calculation
  const GAMEBOY_HEIGHT = 1101;
  // Screen center is ~303px from top of gameboy (display at 92px + half of inner display)
  const SCREEN_CENTER_FROM_BOTTOM = GAMEBOY_HEIGHT - 303;

  /**
   * Calculate the gameboyY value to center the screen on viewport
   */
  const getGameboyCentered = () => {
    const viewportHeight = window.innerHeight;
    return ((SCREEN_CENTER_FROM_BOTTOM - viewportHeight / 2) * 100) / GAMEBOY_HEIGHT;
  };

  // Current progress (0 = start, 1 = end)
  let progress = 0;
  let isDragging = false;
  let startY = 0;
  let isInserted = false; // Track if cartridge has been fully inserted

  // Calculate the drag range in pixels (based on viewport height)
  const getDragRange = () => window.innerHeight * 0.5;

  const updateTransforms = () => {
    const cartridgeY = cartridgeStart + (cartridgeEnd - cartridgeStart) * progress;
    const gameboyY = gameboyStart + (gameboyEnd - gameboyStart) * progress;

    cartridge.style.transform = `translate3d(-50%, ${cartridgeY}%, 0)`;
    gameboy.style.transform = `translate3d(-50%, ${gameboyY}%, 0)`;
  };

  /**
   * Animate gameboy up to center the screen on viewport (step 2)
   */
  const centerGameboy = () => {
    const centeredY = getGameboyCentered();
    gameboy.style.transition = 'transform 0.6s ease-out';
    gameboy.style.transform = `translate3d(-50%, ${centeredY}%, 0)`;
  };

  const hideHint = () => {
    if (dragHint && !dragHint.classList.contains('hiding')) {
      dragHint.classList.add('hiding');
      setTimeout(() => {
        dragHint.classList.add('hidden');
      }, 300);
    }
  };

  const onPointerDown = (e) => {
    // Don't allow dragging if cartridge is already inserted
    if (isInserted) return;

    isDragging = true;
    startY = e.clientY || e.touches?.[0]?.clientY || 0;

    // Hide the hint when user starts dragging
    hideHint();

    cartridge.style.cursor = 'grabbing';
    cartridge.style.transition = 'none';
    gameboy.style.transition = 'none';

    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;

    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    const deltaY = clientY - startY;
    const dragRange = getDragRange();

    // Calculate new progress based on drag distance
    const dragProgress = deltaY / dragRange;
    progress = Math.max(0, Math.min(1, dragProgress));

    updateTransforms();
    e.preventDefault();
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    isDragging = false;

    cartridge.style.cursor = 'grab';
    cartridge.style.transition = 'transform 0.3s ease-out';
    gameboy.style.transition = 'transform 0.3s ease-out';

    // Snap to end if past 50%, otherwise snap back to start
    if (progress > 0.5) {
      progress = 1;
      isInserted = true;

      // Disable further dragging
      cartridge.style.cursor = 'default';
      cartridge.style.pointerEvents = 'none';

      updateTransforms();

      // Step 2: After cartridge insertion, animate gameboy up to center screen
      setTimeout(() => {
        centerGameboy();

        // Turn on the Game Boy after centering animation completes
        setTimeout(() => {
          powerState.turnOn();
        }, 650); // Wait for centering animation to complete
      }, 350); // Wait for snap animation to complete
    } else {
      progress = 0;
      updateTransforms();
    }
  };

  // Mouse events
  cartridge.addEventListener('mousedown', onPointerDown);
  document.addEventListener('mousemove', onPointerMove);
  document.addEventListener('mouseup', onPointerUp);

  // Touch events
  cartridge.addEventListener('touchstart', onPointerDown, { passive: false });
  document.addEventListener('touchmove', onPointerMove, { passive: false });
  document.addEventListener('touchend', onPointerUp);

  // Set initial cursor
  cartridge.style.cursor = 'grab';

  // Initialize transforms
  updateTransforms();

  // Update position on window resize to keep screen centered
  const onResize = () => {
    if (isInserted) {
      // Recalculate centered position without animation
      const centeredY = getGameboyCentered();
      gameboy.style.transition = 'none';
      gameboy.style.transform = `translate3d(-50%, ${centeredY}%, 0)`;
    }
  };
  window.addEventListener('resize', onResize);

  // Return cleanup function and control methods
  return {
    cleanup: () => {
      cartridge.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('mouseup', onPointerUp);
      cartridge.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('touchmove', onPointerMove);
      document.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('resize', onResize);
    },
    reset: () => {
      isInserted = false;
      progress = 0;
      cartridge.style.cursor = 'grab';
      cartridge.style.pointerEvents = 'auto';
      cartridge.style.transition = 'transform 0.5s ease-out';
      gameboy.style.transition = 'transform 0.5s ease-out';
      updateTransforms();
    },
    isInserted: () => isInserted,
  };
}
