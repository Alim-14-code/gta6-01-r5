// Sunset Keys — the staged screenshots. One job: put the game into a
// named scene (start, drive, chase, mission) by playing the real rules
// forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot, so each frame is what real play looks like and the
// same seed always gives the same frame. The camera snaps to the player:
// headless browsers run requestAnimationFrame without vsync, so a
// lerped camera never settles in a short staged run. The autopilot
// follows road waypoints, never a straight line: a straight line between
// islands crosses the sea, and cars stay out of the water.
import { STEP } from './config.js';
import { autopilotInput } from './input.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

const DRIVE_SECONDS = 9;
const CHASE_SECONDS = 3;
const MISSION_SECONDS = 1.5;

// Drive the player through a list of waypoints for `seconds`, one fixed
// step at a time, moving to the next waypoint once close to this one.
// Once the route is done, keep cruising straight on the same heading:
// steering back toward a reached waypoint would make the car loop
// around it and stall.
function driveRoute(game, waypoints, seconds) {
  let wp = 0;
  let reversing = 0;
  let lastX = game.player.x;
  let lastY = game.player.y;
  for (let i = 0; i < seconds / STEP; i += 1) {
    let input;
    if (reversing > 0) {
      // Back straight out of whatever wedged the car, then retry.
      reversing -= 1;
      input = { up: false, down: true, left: false, right: false, handbrake: false, shoot: false, wasPressed: () => false };
    } else if (wp >= waypoints.length) {
      input = { up: true, down: false, left: false, right: false, handbrake: false, shoot: false, wasPressed: () => false };
    } else {
      const dx = waypoints[wp].x - game.player.x;
      const dy = waypoints[wp].y - game.player.y;
      if (Math.hypot(dx, dy) < 90) wp += 1;
      input = wp >= waypoints.length
        ? { up: true, down: false, left: false, right: false, handbrake: false, shoot: false, wasPressed: () => false }
        : autopilotInput(game.player, waypoints[wp], game.playerCar ? game.playerCar.speed : 0);
      // Brake for the corner ahead: when the leg after this waypoint
      // turns sharply, slow down while still 300 units out, so the car
      // arrives slow enough to make the turn instead of overshooting
      // into the buildings past the intersection. Only brake while the
      // car is actually fast: pressing down on a slow car reverses it.
      if (wp < waypoints.length - 1 && wp < waypoints.length) {
        const toWp = Math.atan2(waypoints[wp].y - game.player.y, waypoints[wp].x - game.player.x);
        const nextLeg = Math.atan2(waypoints[wp + 1].y - waypoints[wp].y, waypoints[wp + 1].x - waypoints[wp].x);
        let corner = nextLeg - toWp;
        while (corner > Math.PI) corner -= Math.PI * 2;
        while (corner < -Math.PI) corner += Math.PI * 2;
        const distToWp = Math.hypot(waypoints[wp].x - game.player.x, waypoints[wp].y - game.player.y);
        const speed = game.playerCar ? game.playerCar.speed : 0;
        // Only when the car is actually fast: a slow car near the corner
        // must be allowed to accelerate, or it coasts to a stop 200
        // units short of the turn and never gets there at all.
        if (Math.abs(corner) > 0.5 && distToWp < 300 && speed > 150) {
          input = { ...input, up: false, down: true };
        }
      }
    }
    game.stepWorld(STEP, input);
    // Unstuck: barely moved in 1.5 s while a waypoint remains, so the
    // car is wedged against a building — reverse out and retry.
    if (i % 90 === 89) {
      const moved = Math.hypot(game.player.x - lastX, game.player.y - lastY);
      if (moved < 12 && wp < waypoints.length) reversing = 30;
      lastX = game.player.x;
      lastY = game.player.y;
    }
  }
}

// Put the player in a car at (x, y) facing `angle`.
function putPlayerInCar(game, x, y, angle) {
  game.player.x = x;
  game.player.y = y;
  game.playerCar = {
    x, y, angle, speed: 0, color: '#ff5ea8', kind: 'player', hp: 10,
  };
  game.player.onFoot = false;
  game.player.angle = angle;
}

/**
 * Set the game to the named scene and return the screen to draw over it.
 * start: the title over the depot at sunset.
 * drive: Kai cruising the marina road, minimap and HUD live.
 * chase: three stars, three police cars closing in on the bridge.
 * mission: the Sunset Run in progress, timer and pickups on the HUD.
 */
export function stageShot(name, game) {
  game.resetWorld();
  if (name === 'drive') {
    game.screen = SCREEN_PLAY;
    game.missions.state = 'active';
    game.missions.index = 0;
    game.missions.target = { x: game.city.places.market.x, y: game.city.places.market.y, label: 'Marina Market' };
    putPlayerInCar(game, 300, 660, Math.PI / 2);
    // Depot road south to the bridge road, across to Marina Key, then up
    // the market road and west along it, ending by the Marina Market.
    // The car starts facing south, down the depot road: no opening turn.
    driveRoute(game, [
      { x: 300, y: 1200 },
      { x: 1680, y: 1200 },
      { x: 2220, y: 1200 },
      { x: 2220, y: 840 },
      { x: 2040, y: 840 },
    ], DRIVE_SECONDS);
    snapCamera(game);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    game.screen = SCREEN_PLAY;
    game.wanted = 3;
    // The player is on the west bridge, cops behind, driving east.
    putPlayerInCar(game, 1560, 1200, 0);
    game.playerCar.speed = 380;
    // Cops in pursuit behind the player on the bridge road, not yet on
    // top of it: a chase, not a pile-up. (The random spawn puts them
    // anywhere around the player, which reads as a swarm, not a chase.)
    game.cops = [
      { x: 1160, y: 1200, angle: 0, speed: 420, color: '#2a6bff', kind: 'cop', siren: 0, hp: 3, stuck: 0 },
      { x: 980, y: 1200, angle: 0, speed: 400, color: '#2a6bff', kind: 'cop', siren: 0.5, hp: 3, stuck: 0 },
      { x: 1300, y: 1260, angle: 0, speed: 410, color: '#2a6bff', kind: 'cop', siren: 1, hp: 3, stuck: 0 },
    ];
    driveRoute(game, [{ x: 2400, y: 1200 }], CHASE_SECONDS);
    snapCamera(game);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    game.screen = SCREEN_PLAY;
    game.missions.index = 2;
    game.missions.state = 'active';
    game.missions.timer = 74;
    game.missions.pickups = [
      { x: game.city.places.market.x, y: game.city.places.market.y, taken: true, label: 'Pickup 1' },
      { x: 3120, y: 700, taken: false, label: 'Pickup 2' },
      { x: 700, y: 1900, taken: false, label: 'Pickup 3' },
    ];
    game.missions.pickupIndex = 1;
    game.missions.target = game.missions.pickups[1];
    putPlayerInCar(game, 2760, 840, 0);
    game.playerCar.speed = 300;
    // East along the y=840 road, then north up the x=3120 road toward
    // the second pickup, ending just short of it with the marker in view.
    driveRoute(game, [
      { x: 3120, y: 840 },
      { x: 3120, y: 700 },
    ], MISSION_SECONDS);
    snapCamera(game);
    return { screen: SCREEN_PLAY };
  }
  // Default: the title screen over downtown Palmetto Cay at sunset.
  game.screen = SCREEN_TITLE;
  game.player.x = game.city.places.depot.x;
  game.player.y = game.city.places.depot.y;
  game.camera.x = 900;
  game.camera.y = 1200;
  return { screen: SCREEN_TITLE };
}

function snapCamera(game) {
  game.camera.x = game.player.x;
  game.camera.y = game.player.y;
}
