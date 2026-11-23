// Sunset Keys — vehicles. One job: every car that is not the player's.
// Traffic follows the roads, police chase and ram, and the helicopter
// circles overhead when the heat is highest.
import { nearestRoadPoint, onRoad, hitsBuilding } from './city.js';
import { mulberry32, pick, range, clamp, turnToward } from './random.js';
import { CAR, COP, HELI, TRAFFIC_COUNT, COLORS } from './config.js';

export function createTraffic(city, seed) {
  const rng = mulberry32(seed + 31);
  const cars = [];
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
    const road = city.roads[Math.floor(rng() * city.roads.length)];
    const along = range(rng, 0, 1);
    const x = road.vertical ? road.x1 + range(rng, -14, 14) : road.x1 + (road.x2 - road.x1) * along;
    const y = road.vertical ? road.y1 + (road.y2 - road.y1) * along : road.y1 + range(rng, -14, 14);
    cars.push({
      x, y,
      angle: road.vertical ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI),
      speed: range(rng, 90, 170),
      color: pick(rng, COLORS.car),
      kind: 'traffic',
      road,
      cruise: range(rng, 90, 170),
      stuck: 0,
    });
  }
  return cars;
}

export function updateTraffic(city, cars, player, dt) {
  for (const car of cars) {
    if (car.kind === 'cop') continue; // police are driven by updatePolice
    // Stay on the road: steer along it, turn at its ends onto the next road.
    const ahead = nearestRoadPoint(city, car.x + Math.cos(car.angle) * 60, car.y + Math.sin(car.angle) * 60);
    if (ahead) {
      const want = Math.atan2(ahead.y - car.y, ahead.x - car.x);
      car.angle = turnToward(car.angle, want, 1.6 * dt);
    }
    // Slow for the player or a car ahead.
    let target = car.cruise;
    if (player && Math.hypot(player.x - car.x, player.y - car.y) < 90) target = 40;
    car.speed += clamp(target - car.speed, -260 * dt, 160 * dt);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (hitsBuilding(city, nx, ny, 20) || !onRoad(city, nx, ny)) {
      car.angle += Math.PI * 0.9;
      car.speed *= 0.4;
    } else {
      car.x = nx;
      car.y = ny;
    }
  }
}

// Spawn a police car at a road point away from the player.
export function spawnCop(city, seed, player) {
  const rng = mulberry32(seed + Math.floor(Math.random() * 100000));
  for (let tries = 0; tries < 30; tries += 1) {
    const road = city.roads[Math.floor(rng() * city.roads.length)];
    const along = range(rng, 0, 1);
    const x = road.vertical ? road.x1 : road.x1 + (road.x2 - road.x1) * along;
    const y = road.vertical ? road.y1 + (road.y2 - road.y1) * along : road.y1;
    if (Math.hypot(x - player.x, y - player.y) > 700) {
      return {
        x, y, angle: 0, speed: 0, color: COLORS.copCar, kind: 'cop',
        siren: rng(), hp: 3, stuck: 0,
      };
    }
  }
  return null;
}

export function updatePolice(city, cops, player, dt) {
  for (const cop of cops) {
    const dist = Math.hypot(player.x - cop.x, player.y - cop.y);
    const want = Math.atan2(player.y - cop.y, player.x - cop.x);
    // Police take the racing line: full lock toward the player, faster when far.
    cop.angle = turnToward(cop.angle, want, 3.1 * dt);
    const target = dist > 500 ? COP.maxSpeed : COP.maxSpeed * 0.85;
    cop.speed += clamp(target - cop.speed, -COP.accel * dt, COP.accel * dt);
    const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt;
    const ny = cop.y + Math.sin(cop.angle) * cop.speed * dt;
    if (hitsBuilding(city, nx, ny, 20)) {
      cop.angle += Math.PI * 0.7;
      cop.speed *= 0.5;
    } else {
      cop.x = nx;
      cop.y = ny;
    }
    cop.siren += dt;
  }
}

export function createHelicopter() {
  return { x: 0, y: 0, angle: 0, active: false, rotor: 0 };
}

export function updateHelicopter(heli, player, wanted, dt) {
  heli.active = wanted >= 4;
  if (!heli.active) return;
  heli.rotor += dt * 30;
  const want = Math.atan2(player.y - heli.y, player.x - heli.x);
  const dist = Math.hypot(player.x - heli.x, player.y - heli.y);
  if (dist > HELI.radius) {
    heli.angle = turnToward(heli.angle, want, 1.2 * dt);
    heli.x += Math.cos(heli.angle) * HELI.speed * dt;
    heli.y += Math.sin(heli.angle) * HELI.speed * dt;
  } else {
    heli.angle += dt * 0.5;
    heli.x = player.x + Math.cos(heli.angle) * HELI.radius;
    heli.y = player.y + Math.sin(heli.angle) * HELI.radius;
  }
}

// Ram damage: a cop that hits the player's car hard dents it and slows it.
export function copRam(cop, playerCar, dt) {
  if (!playerCar) return 0;
  const d = Math.hypot(cop.x - playerCar.x, cop.y - playerCar.y);
  if (d < 46 && cop.speed > 200) {
    cop.speed *= 0.45;
    playerCar.speed *= 0.8;
    return 1;
  }
  return 0;
}
