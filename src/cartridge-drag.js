/**
 * Cartridge drag interaction
 * Allows dragging the cartridge down on Y axis
 * Simultaneously moves the gameboy up
 */

export function initCartridgeDrag() {
  const cartridge = document.querySelector('.cartbridge');
  const gameboy = document.querySelector('.gameboy');

  if (!cartridge || !gameboy) {
    console.warn('Cartridge or Gameboy element not found');
    return;
  }

  // Initial and final Y positions (in percentage)
  const cartridgeStart = -120;
  const cartridgeEnd = 10;
  const gameboyStart = 80;
  const gameboyEnd = 50;

  // Current progress (0 = start, 1 = end)
  let progress = 0;
  let isDragging = false;
  let startY = 0;
  let currentY = 0;

  // Calculate the drag range in pixels (based on viewport height)
  const getDragRange = () => window.innerHeight * 0.5;

  const updateTransforms = () => {
    const cartridgeY = cartridgeStart + (cartridgeEnd - cartridgeStart) * progress;
    const gameboyY = gameboyStart + (gameboyEnd - gameboyStart) * progress;

    cartridge.style.transform = `translate3d(-50%, ${cartridgeY}%, 0)`;
    gameboy.style.transform = `translate3d(-50%, ${gameboyY}%, 0)`;
  };

  const onPointerDown = (e) => {
    isDragging = true;
    startY = e.clientY || e.touches?.[0]?.clientY || 0;
    currentY = startY;

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
    } else {
      progress = 0;
    }

    updateTransforms();
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

  // Return cleanup function
  return () => {
    cartridge.removeEventListener('mousedown', onPointerDown);
    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    cartridge.removeEventListener('touchstart', onPointerDown);
    document.removeEventListener('touchmove', onPointerMove);
    document.removeEventListener('touchend', onPointerUp);
  };
}
