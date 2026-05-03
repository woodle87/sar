const keys = {};
let metaHeld = false;
let altHeld = false;

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.key === 'Meta') metaHeld = true;
  if (e.key === 'Alt') altHeld = true;

  // Prevent browser defaults for our game combos
  if (metaHeld && e.code === 'KeyA') e.preventDefault();
  if (altHeld && (e.code === 'Digit7' || e.code === 'Digit8')) e.preventDefault();
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  if (e.key === 'Meta') metaHeld = false;
  if (e.key === 'Alt') altHeld = false;
});

// When window loses focus, reset all keys (prevents stuck keys)
window.addEventListener('blur', () => {
  for (const key in keys) keys[key] = false;
  metaHeld = false;
  altHeld = false;
});

// Track camera toggle as a one-shot (press, not hold)
let cameraTogglePressed = false;
let timeTogglePressed = false;

export const input = {
  get forward() {
    // Command+A to go straight/forward
    return (metaHeld && keys['KeyA']) || keys['KeyW'] || keys['ArrowUp'] || false;
  },
  get backward() {
    return keys['KeyS'] || keys['ArrowDown'] || false;
  },
  get left() {
    // Option+8 to turn left
    return (altHeld && keys['Digit8']) || keys['ArrowLeft'] || false;
  },
  get right() {
    // Option+7 to turn right
    return (altHeld && keys['Digit7']) || keys['ArrowRight'] || false;
  },
  get brake() {
    return keys['Space'] || false;
  },
  get cameraToggle() {
    const pressed = keys['KeyC'] || false;
    if (pressed && !cameraTogglePressed) {
      cameraTogglePressed = true;
      return true;
    }
    if (!pressed) cameraTogglePressed = false;
    return false;
  },
  get timeToggle() {
    const pressed = keys['KeyT'] || false;
    if (pressed && !timeTogglePressed) {
      timeTogglePressed = true;
      return true;
    }
    if (!pressed) timeTogglePressed = false;
    return false;
  },
  get reset() {
    return keys['KeyR'] || false;
  },
};
