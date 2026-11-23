// Sunset Keys — keyboard and mouse input. One job: turn raw key events
// into a small, stable input state the game loop reads once a step.
export function createInput() {
  const keys = new Set();
  const state = {
    up: false, down: false, left: false, right: false,
    sprint: false, shoot: false, handbrake: false,
    pressed: new Set(),
  };

  function update() {
    state.up = keys.has('KeyW') || keys.has('ArrowUp');
    state.down = keys.has('KeyS') || keys.has('ArrowDown');
    state.left = keys.has('KeyA') || keys.has('ArrowLeft');
    state.right = keys.has('KeyD') || keys.has('ArrowRight');
    state.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
    state.shoot = keys.has('Space');
    state.handbrake = keys.has('KeyF');
  }

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (!event.repeat) state.pressed.add(event.code);
    keys.add(event.code);
    update();
  }

  function onKeyUp(event) {
    keys.delete(event.code);
    update();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  // A key pressed since the last step; consumed by the caller.
  state.wasPressed = (code) => {
    if (state.pressed.has(code)) { state.pressed.delete(code); return true; }
    return false;
  };
  state.endStep = () => { state.pressed.clear(); };
  return state;
}

// Scripted input for the staged screenshots: drive toward a target point.
// A fast car turns wide (radius = speed / turn rate), so on a sharp turn
// it brakes first: a slow car makes the 90-degree street corners, a car
// at full speed overshoots them into the buildings.
export function autopilotInput(player, target, speed = 0) {
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const dist = Math.hypot(dx, dy);
  const want = Math.atan2(dy, dx);
  let turn = want - player.angle;
  while (turn > Math.PI) turn -= Math.PI * 2;
  while (turn < -Math.PI) turn += Math.PI * 2;
  const sharp = Math.abs(turn) > 0.5 && speed > 150;
  // A near-reversal (the target is behind the car) is a U-turn: brake
  // to a crawl first, then creep around it. A fast U-turn swings wide
  // into the buildings beside the road and wedges the car there.
  const reversal = Math.abs(turn) > 2.2;
  return {
    up: dist > 60 && !sharp && !(reversal && speed > 60),
    down: sharp || (reversal && speed > 60),
    left: turn < -0.15,
    right: turn > 0.15,
    sprint: false,
    shoot: false,
    handbrake: false,
    wasPressed: () => false,
    endStep: () => {},
  };
}
