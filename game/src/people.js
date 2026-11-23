// Sunset Keys — pedestrians. One job: the people on the sidewalks. They
// walk their block, cross at corners, scatter when a car or a gunshot
// comes close, and wander back when the street is calm again.
import { onLand, onRoad, hitsBuilding } from './city.js';
import { mulberry32, range, clamp } from './random.js';
import { PED_COUNT } from './config.js';

const SHIRTS = ['#e8e8e8', '#ff8a3a', '#3ae0ff', '#ff5ea8', '#7ddc5e', '#ffd23a', '#c9a0ff'];

export function createPedestrians(city, seed) {
  const rng = mulberry32(seed + 77);
  const peds = [];
  for (let i = 0; i < PED_COUNT; i += 1) {
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 40; tries += 1) {
      x = range(rng, 200, 3640);
      y = range(rng, 400, 2160);
      if (onLand(city, x, y) && !onRoad(city, x, y) && !hitsBuilding(city, x, y, 20)) break;
    }
    peds.push({
      x, y,
      angle: range(rng, 0, Math.PI * 2),
      speed: range(rng, 28, 55),
      shirt: SHIRTS[i % SHIRTS.length],
      skin: ['#f2c9a0', '#d9a06b', '#8a5a3a', '#f7d7b0'][i % 4],
      panic: 0,
      homeX: x, homeY: y,
      wander: range(rng, 0, Math.PI * 2),
    });
  }
  return peds;
}

export function updatePedestrians(city, peds, player, cars, dt, loud) {
  for (const ped of peds) {
    // A nearby car, a shot, or the player sprinting through sets them running.
    let danger = loud;
    if (player && Math.hypot(player.x - ped.x, player.y - ped.y) < 90) danger = true;
    for (const car of cars) {
      if (Math.hypot(car.x - ped.x, car.y - ped.y) < 80) { danger = true; break; }
    }
    if (danger) ped.panic = Math.min(3, ped.panic + dt * 2);
    else ped.panic = Math.max(0, ped.panic - dt * 0.5);

    if (ped.panic > 0.4) {
      // Flee away from the player and the nearest car.
      const fx = ped.x - (player ? player.x : ped.x);
      const fy = ped.y - (player ? player.y : ped.y);
      ped.angle = Math.atan2(fy, fx) + Math.sin(ped.wander) * 0.4;
      ped.wander += dt * 2;
      movePed(city, ped, ped.speed * 3.2, dt);
    } else {
      // Wander around home, turning at block edges.
      ped.wander += dt * 0.4;
      if (Math.random() < dt * 0.15) ped.angle += (Math.random() - 0.5) * 2.4;
      const home = Math.hypot(ped.x - ped.homeX, ped.y - ped.homeY);
      if (home > 260) ped.angle = Math.atan2(ped.homeY - ped.y, ped.homeX - ped.x);
      movePed(city, ped, ped.speed, dt);
    }
  }
}

function movePed(city, ped, speed, dt) {
  const nx = ped.x + Math.cos(ped.angle) * speed * dt;
  const ny = ped.y + Math.sin(ped.angle) * speed * dt;
  if (!onLand(city, nx, ny)) { ped.angle += Math.PI / 2; return; }
  if (hitsBuilding(city, nx, ny, 12)) { ped.angle += Math.PI / 2; return; }
  ped.x = clamp(nx, 60, 3780);
  ped.y = clamp(ny, 60, 2500);
}
