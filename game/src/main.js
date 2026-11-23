// Sunset Keys — the game itself. One job: own the state (player, cars,
// police, missions, wanted level, screens, save) and step it forward.
// Rendering lives in render.js, the HUD in hud.js, the missions in
// missions.js, the staged screenshots in shots.js.
import { VIEW, WORLD, STEP, PLAYER, CAR, WANTED, MISSIONS } from './config.js';
import { buildCity, hitsBuilding, onLand, onRoad } from './city.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createPedestrians, updatePedestrians } from './people.js';
import { createTraffic, updateTraffic, spawnCop, updatePolice, createHelicopter, updateHelicopter, copRam } from './vehicles.js';
import { createMissions, startMission, updateMission, advanceMission, retryMission } from './missions.js';
import { drawGame, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSE, SCREEN_WASTED, SCREEN_BUSTED, SCREEN_RESULT } from './render.js';
import { drawHUD } from './hud.js';
import { stageShot } from './shots.js';
import { mulberry32, clamp, distance } from './random.js';

const SAVE_KEY = 'sunset-keys-save-v1';

export function createGame(seed) {
  const game = {
    seed,
    city: null,
    player: null,
    playerCar: null,
    traffic: [],
    cops: [],
    heli: null,
    peds: [],
    bullets: [],
    particles: [],
    cash: 0,
    bestCash: 0,
    wanted: 0,
    wantedSeen: 0,
    missions: null,
    screen: SCREEN_TITLE,
    camera: { x: 0, y: 0 },
    time: 0,
    audio: createAudio(),
    input: createInput(),
    frozen: false,
    loud: 0,
  };
  game.resetWorld = () => resetWorld(game);
  game.stepWorld = (dt, input) => stepWorld(game, dt, input);
  game.spawnCops = (n) => spawnCops(game, n);
  resetWorld(game);
  return game;
}

function resetWorld(game) {
  game.city = buildCity(game.seed);
  game.player = {
    x: game.city.places.depot.x, y: game.city.places.depot.y,
    angle: 0, speed: 0, health: PLAYER.health, onFoot: true,
  };
  game.playerCar = null;
  game.traffic = createTraffic(game.city, game.seed);
  game.cops = [];
  game.heli = createHelicopter();
  game.peds = createPedestrians(game.city, game.seed);
  game.bullets = [];
  game.particles = [];
  game.cash = 0;
  game.wanted = 0;
  game.wantedSeen = 0;
  game.missions = createMissions(game.city, game.seed);
  game.camera = { x: game.player.x, y: game.player.y };
  game.time = 0;
  game.loud = 0;
  loadSave(game);
}

function loadSave(game) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const save = JSON.parse(raw);
    if (typeof save.cash === 'number') game.cash = save.cash;
    if (typeof save.bestCash === 'number') game.bestCash = save.bestCash;
    if (typeof save.mission === 'number' && save.mission > 0 && save.mission < MISSIONS.length) {
      game.missions.index = save.mission;
    }
  } catch { /* a broken save is just a fresh start */ }
}

function saveGame(game) {
  try {
    game.bestCash = Math.max(game.bestCash, game.cash);
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: game.cash, bestCash: game.bestCash, mission: game.missions.index,
    }));
  } catch { /* saving is a courtesy, never a crash */ }
}

function spawnCops(game, n) {
  for (let i = 0; i < n; i += 1) {
    const cop = spawnCop(game.city, game.seed + i * 13 + game.cops.length, game.player);
    if (cop) game.cops.push(cop);
  }
}

function addWanted(game, stars) {
  game.wanted = clamp(game.wanted + stars, 0, 5);
  game.wantedSeen = 0;
  const want = Math.min(2 + game.wanted, 6);
  while (game.cops.length < want) {
    const cop = spawnCop(game.city, game.seed + game.cops.length * 17 + 5, game.player);
    if (!cop) break;
    game.cops.push(cop);
  }
}

function stepWorld(game, dt, input) {
  game.time += dt;
  game.loud = Math.max(0, game.loud - dt);
  const player = game.player;

  if (game.playerCar) stepCar(game, dt, input);
  else stepOnFoot(game, dt, input);

  updateTraffic(game.city, game.traffic, player, dt);
  updatePolice(game.city, game.cops, player, dt);
  updateHelicopter(game.heli, player, game.wanted, dt);
  updatePedestrians(game.city, game.peds, player, [...game.traffic, ...game.cops], dt, game.loud > 0);
  updateMissionCars(game, dt);
  updateBullets(game, dt);
  updateParticles(game, dt);

  // Wanted: seen by a cop keeps the heat on; unseen, it cools off.
  let seen = false;
  for (const cop of game.cops) {
    if (distance(cop.x, cop.y, player.x, player.y) < 520) { seen = true; break; }
  }
  if (game.wanted > 0) {
    if (seen) game.wantedSeen = 0;
    else {
      game.wantedSeen += dt;
      if (game.wantedSeen > WANTED.decaySeconds) {
        game.wanted -= 1;
        game.wantedSeen = 0;
        if (game.wanted === 0) game.cops = [];
      }
    }
  }
  // Trim the cop pack to the wanted level.
  const want = game.wanted === 0 ? 0 : Math.min(2 + game.wanted, 6);
  if (game.cops.length > want) game.cops.length = want;

  // Busted: a cop catches the player on foot.
  if (game.wanted > 0 && !game.playerCar) {
    for (const cop of game.cops) {
      if (distance(cop.x, cop.y, player.x, player.y) < 42) {
        game.screen = SCREEN_BUSTED;
        game.audio.busted();
        saveGame(game);
        return;
      }
    }
  }
  if (player.health <= 0) {
    game.screen = SCREEN_WASTED;
    saveGame(game);
    return;
  }

  // Mission progress.
  const result = updateMission(game.missions, game, dt);
  if (result === 'done') {
    game.screen = SCREEN_RESULT;
    saveGame(game);
  } else if (result === 'failed') {
    game.screen = SCREEN_RESULT;
    saveGame(game);
  }

  // Camera follows the player, eased.
  const tx = player.x;
  const ty = player.y;
  game.camera.x += (tx - game.camera.x) * Math.min(1, dt * 5);
  game.camera.y += (ty - game.camera.y) * Math.min(1, dt * 5);

  game.audio.engine(game.playerCar ? Math.abs(game.playerCar.speed) / CAR.maxSpeed : 0, !!game.playerCar);
  game.audio.siren(game.wanted > 0 && game.cops.length > 0, dt);
}

function stepOnFoot(game, dt, input) {
  const player = game.player;
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(mx, my);
  if (len > 0) {
    mx /= len;
    my /= len;
    player.angle = Math.atan2(my, mx);
    const speed = input.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    const nx = player.x + mx * speed * dt;
    const ny = player.y + my * speed * dt;
    if (onLand(game.city, nx, player.y) && !hitsBuilding(game.city, nx, player.y, PLAYER.radius)) player.x = nx;
    if (onLand(game.city, player.x, ny) && !hitsBuilding(game.city, player.x, ny, PLAYER.radius)) player.y = ny;
  }
  // Shooting: Space fires toward the facing direction.
  if (input.shoot && game.bullets.length < 12) {
    game.bullets.push({
      x: player.x + Math.cos(player.angle) * 18,
      y: player.y + Math.sin(player.angle) * 18,
      angle: player.angle, speed: 780, life: 0.7,
    });
    game.audio.shoot();
    game.loud = 1.2;
    addWanted(game, 0); // firing alone is loud; the hit adds the star
  }
  // Enter a car.
  if (input.wasPressed && input.wasPressed('KeyE')) {
    let best = null;
    let bestDist = PLAYER.enterRange;
    for (const car of game.traffic) {
      const d = distance(car.x, car.y, player.x, player.y);
      if (d < bestDist) { bestDist = d; best = car; }
    }
    if (best) {
      game.traffic = game.traffic.filter((c) => c !== best);
      best.kind = 'player';
      best.speed = 0;
      game.playerCar = best;
      player.onFoot = false;
      addWanted(game, WANTED.steal);
      game.audio.pickup();
    }
  }
}

function stepCar(game, dt, input) {
  const car = game.playerCar;
  const player = game.player;
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const forward = Math.cos(car.angle);
  const side = Math.sin(car.angle);
  const moving = Math.abs(car.speed) > 20;
  if (moving) car.angle += steer * CAR.turn * dt * (car.speed > 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 200 + 0.35);
  if (input.up) car.speed += CAR.accel * dt;
  if (input.down) car.speed -= (car.speed > 0 ? CAR.brake : CAR.accel * 0.6) * dt;
  if (input.handbrake) car.speed *= Math.max(0, 1 - 3 * dt);
  car.speed = clamp(car.speed, -CAR.maxReverse, CAR.maxSpeed);
  // Gentle rolling resistance when coasting.
  if (!input.up && !input.down) car.speed *= Math.pow(0.985, dt * 60);
  const nx = car.x + forward * car.speed * dt;
  const ny = car.y + side * car.speed * dt;
  if (hitsBuilding(game.city, nx, ny, 18)) {
    car.speed *= -0.3;
    game.audio.crash();
    burst(game, car.x, car.y, '#ffb0b0', 10);
  } else if (!onLand(game.city, nx, ny)) {
    // Cars stay on the islands and bridges: the sea stops them cold.
    car.speed *= 0.4;
  } else {
    car.x = nx;
    car.y = ny;
  }
  // Skid marks when turning hard at speed.
  if (Math.abs(steer) > 0 && Math.abs(car.speed) > 300 && Math.random() < dt * 20) {
    burst(game, car.x - forward * 20, car.y - side * 20, 'rgba(20,20,30,0.5)', 1);
  }
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  // Ram the rival or the tail sedan.
  const target = game.missions.targetCar;
  if (target && distance(car.x, car.y, target.x, target.y) < 52 && Math.abs(car.speed) > 120) {
    target.hp -= 1;
    car.speed *= 0.55;
    game.audio.crash();
    burst(game, target.x, target.y, '#ffd23a', 14);
    if (target.hp <= 0) burst(game, target.x, target.y, '#ff5e5e', 30);
  }
  // Ram traffic: a bump shoves the other car up to the player's speed
  // and costs the player almost nothing. A per-step 10% drain turned
  // a bump into a wall: the player ground to a halt pressed against a
  // slow car's bumper while the cops caught up.
  for (const other of game.traffic) {
    if (distance(car.x, car.y, other.x, other.y) < 44) {
      if (Math.abs(car.speed) > other.speed) other.speed = Math.abs(car.speed) * 0.95;
      car.speed *= 0.995;
    }
  }
  for (const cop of game.cops) {
    if (copRam(cop, car, dt)) {
      game.audio.crash();
      burst(game, car.x, car.y, '#ffb0b0', 8);
    }
  }
  // Exit the car.
  if (input.wasPressed && input.wasPressed('KeyE')) {
    const parked = game.playerCar;
    parked.speed = 0;
    parked.kind = 'traffic';
    game.traffic.push(parked);
    game.playerCar = null;
    player.onFoot = true;
    player.x += Math.cos(player.angle + Math.PI / 2) * 34;
    player.y += Math.sin(player.angle + Math.PI / 2) * 34;
  }
}

function updateMissionCars(game, dt) {
  const rival = game.missions.targetCar;
  if (!rival || rival.hp <= 0) return;
  if (rival.kind === 'rival') {
    // The rival flees east along the bridge road, weaving.
    rival.angle = 0;
    rival.x += rival.cruise * dt;
    rival.y = 1200 + Math.sin(game.time * 0.7) * 26;
    if (rival.x > 3700) rival.x = 3700;
  } else if (rival.kind === 'tail') {
    // The black sedan cruises a loop around Marina Key.
    const route = [
      { x: 1900, y: 700 }, { x: 2200, y: 700 }, { x: 2200, y: 1800 }, { x: 1900, y: 1800 },
    ];
    rival._wp = rival._wp || 0;
    const wp = route[rival._wp];
    const d = distance(rival.x, rival.y, wp.x, wp.y);
    if (d < 60) rival._wp = (rival._wp + 1) % route.length;
    const want = Math.atan2(wp.y - rival.y, wp.x - rival.x);
    let diff = want - rival.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    rival.angle += clamp(diff, -1.8 * dt, 1.8 * dt);
    rival.x += Math.cos(rival.angle) * rival.cruise * dt;
    rival.y += Math.sin(rival.angle) * rival.cruise * dt;
  }
}

function updateBullets(game, dt) {
  for (const bullet of game.bullets) {
    bullet.x += Math.cos(bullet.angle) * bullet.speed * dt;
    bullet.y += Math.sin(bullet.angle) * bullet.speed * dt;
    bullet.life -= dt;
    // A hit on a cop or the mission car counts.
    for (const cop of game.cops) {
      if (distance(bullet.x, bullet.y, cop.x, cop.y) < 26) {
        cop.hp -= 1;
        bullet.life = 0;
        burst(game, bullet.x, bullet.y, '#ffd23a', 8);
        if (cop.hp <= 0) {
          game.cops = game.cops.filter((c) => c !== cop);
          addWanted(game, WANTED.killCop);
          burst(game, cop.x, cop.y, '#ff5e5e', 24);
        }
        break;
      }
    }
    const target = game.missions.targetCar;
    if (target && bullet.life > 0 && distance(bullet.x, bullet.y, target.x, target.y) < 28) {
      target.hp -= 1;
      bullet.life = 0;
      burst(game, bullet.x, bullet.y, '#ffd23a', 8);
    }
    if (hitsBuilding(game.city, bullet.x, bullet.y, 2)) bullet.life = 0;
  }
  game.bullets = game.bullets.filter((b) => b.life > 0 && onLand(game.city, b.x, b.y));
}

function burst(game, x, y, color, n) {
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = 40 + Math.random() * 140;
    game.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0.5 + Math.random() * 0.4, maxLife: 0.9,
      size: 2 + Math.random() * 4, color,
    });
  }
}

function updateParticles(game, dt) {
  for (const p of game.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
    p.life -= dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);
}

// ---- boot ----
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed')) || 1;
const shotName = params.get('shot');
const game = createGame(seed);

// The canvas backing store must match the layout size: the default
// 300x150 store stretched to the window makes every drawing huge and
// blurry, and the title text falls off the bottom of the frame.
const canvas = document.getElementById('game');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

if (shotName) {
  // Staged screenshot: run the scene once, freeze it, draw it every frame.
  stageShot(shotName, game);
  game.frozen = true;
  const ctx = canvas.getContext('2d');
  const draw = () => {
    drawGame(ctx, game);
    if (game.screen === SCREEN_PLAY) drawHUD(ctx, game);
    requestAnimationFrame(draw);
  };
  draw();
} else {
  const ctx = canvas.getContext('2d');
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    const input = game.input;
    if (game.screen === SCREEN_TITLE) {
      if (input.wasPressed('Enter')) {
        game.audio.unlock();
        game.screen = SCREEN_PLAY;
        startMission(game.missions, game);
      }
      game.time += dt;
    } else if (game.screen === SCREEN_PLAY) {
      if (input.wasPressed('KeyP')) game.screen = SCREEN_PAUSE;
      else if (input.wasPressed('KeyM')) {
        // Restart the current mission from its briefing.
        game.missions.state = 'brief';
        startMission(game.missions, game);
      } else {
        stepWorld(game, dt, input);
      }
    } else if (game.screen === SCREEN_PAUSE) {
      if (input.wasPressed('KeyP')) game.screen = SCREEN_PLAY;
    } else if (game.screen === SCREEN_RESULT) {
      if (input.wasPressed('Enter')) {
        if (game.missions.state === 'done') {
          advanceMission(game.missions, game);
          game.screen = SCREEN_PLAY;
        } else {
          retryMission(game.missions, game);
          game.screen = SCREEN_PLAY;
        }
      }
    } else if (game.screen === SCREEN_WASTED || game.screen === SCREEN_BUSTED) {
      if (input.wasPressed('Enter')) {
        game.player.health = PLAYER.health;
        game.wanted = 0;
        game.cops = [];
        game.screen = SCREEN_PLAY;
        startMission(game.missions, game);
      }
    }
    input.endStep();
    drawGame(ctx, game);
    if (game.screen === SCREEN_PLAY) drawHUD(ctx, game);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
