// Sunset Keys — the city itself. One job: build the island chain from a
// seed (roads, bridges, buildings, marina, docks, palms, mission places)
// and answer the questions the rest of the game asks about it: is this
// point on a road, on land, in the water, inside a building?
import { WORLD, ROAD, ISLANDS, BRIDGES, COLORS } from './config.js';
import { mulberry32, pick, range, rangeInt } from './random.js';

export function buildCity(seed) {
  const rng = mulberry32(seed);
  const roads = [];
  const buildings = [];
  const palms = [];
  const docks = [];
  const boats = [];

  // Road grids on each island, aligned to a 360-unit lattice.
  for (const island of ISLANDS) {
    for (let x = island.x + 180; x < island.x + island.w - 60; x += ROAD.spacing) {
      roads.push({ x1: x, y1: island.y + 40, x2: x, y2: island.y + island.h - 40, vertical: true });
    }
    for (let y = island.y + 180; y < island.y + island.h - 60; y += ROAD.spacing) {
      roads.push({ x1: island.x + 40, y1: y, x2: island.x + island.w - 40, y2: y, vertical: false });
    }
  }
  // Bridge roads join the grids across the water.
  roads.push({ x1: 1500, y1: 1200, x2: 1680, y2: 1200, vertical: false, bridge: true });
  roads.push({ x1: 2400, y1: 1200, x2: 2580, y2: 1200, vertical: false, bridge: true });

  // Buildings fill the blocks between roads, never on a road.
  // Buildings sit INSIDE the blocks between roads, never on a road: the
  // road lattice is vertical lines at island.x + 180 + k*360 and
  // horizontal lines at island.y + 180 + k*360, so each block runs from
  // one road's edge (road half-width 32 + margin 18) to the next. They
  // also stay clear of the marina and of every mission place, so no
  // objective is ever inside a wall.
  const marinaRect = { x: ISLANDS[1].x + 60, y: ISLANDS[1].y + ISLANDS[1].h - 320, w: 600, h: 260 };
  const noBuild = [
    marinaRect,
    { x: 240, y: 600, w: 120, h: 120 },
    { x: 1980, y: 840, w: 120, h: 120 },
    { x: 3240, y: 1840, w: 120, h: 120 },
    { x: 2460, y: 1140, w: 120, h: 120 },
    { x: 2050, y: 2160, w: 120, h: 120 },
  ];
  for (const island of ISLANDS) {
    const tall = island.kind === 'downtown';
    const roadXs = [];
    for (let x = island.x + 180; x < island.x + island.w - 60; x += ROAD.spacing) roadXs.push(x);
    const roadYs = [];
    for (let y = island.y + 180; y < island.y + island.h - 60; y += ROAD.spacing) roadYs.push(y);
    const blockXs = [];
    for (let k = 0; k <= roadXs.length; k += 1) {
      blockXs.push([
        k === 0 ? island.x + 24 : roadXs[k - 1] + ROAD.width / 2 + 18,
        k === roadXs.length ? island.x + island.w - 24 : roadXs[k] - ROAD.width / 2 - 18,
      ]);
    }
    const blockYs = [];
    for (let k = 0; k <= roadYs.length; k += 1) {
      blockYs.push([
        k === 0 ? island.y + 24 : roadYs[k - 1] + ROAD.width / 2 + 18,
        k === roadYs.length ? island.y + island.h - 24 : roadYs[k] - ROAD.width / 2 - 18,
      ]);
    }
    for (const [bx0, bx1] of blockXs) {
      for (const [by0, by1] of blockYs) {
        if (bx1 - bx0 < 90 || by1 - by0 < 80) continue;
        if (rng() < 0.18) continue; // a plaza or parking lot instead
        const w = Math.min(range(rng, 120, 210), bx1 - bx0 - 16);
        const h = Math.min(range(rng, 110, 190), by1 - by0 - 16);
        const x = bx0 + range(rng, 0, Math.max(0, bx1 - bx0 - w));
        const y = by0 + range(rng, 0, Math.max(0, by1 - by0 - h));
        if (noBuild.some((r) => x < r.x + r.w + 20 && x + w > r.x - 20 && y < r.y + r.h + 20 && y + h > r.y - 20)) continue;
        buildings.push({
          x, y, w, h,
          roof: pick(rng, COLORS.buildingRoof),
          neon: rng() < 0.55 ? pick(rng, COLORS.neon) : null,
          height: tall ? rangeInt(rng, 3, 9) : rangeInt(rng, 1, 3),
          sign: rng() < 0.3,
        });
      }
    }
  }

  // Marina Key: docks and boats along its south shore.
  const marina = ISLANDS[1];
  for (let i = 0; i < 5; i += 1) {
    const dx = marina.x + 90 + i * 130;
    docks.push({ x: dx, y: marina.y + marina.h - 60, w: 26, h: 170 });
    boats.push({
      x: dx + 40, y: marina.y + marina.h + 30 + range(rng, -8, 8),
      w: 30, h: 86, color: pick(rng, ['#f2f2f2', '#ffd23a', '#3ae0ff', '#ff5ea8']),
      angle: Math.PI / 2 + range(rng, -0.08, 0.08),
    });
  }
  // The yacht for the finale heist, moored at the longest dock.
  boats.push({ x: marina.x + 430, y: marina.y + marina.h + 60, w: 44, h: 150, color: '#ffffff', angle: Math.PI / 2, yacht: true });

  // Palms line the beaches and the marina promenade.
  for (let i = 0; i < 90; i += 1) {
    const island = pick(rng, ISLANDS);
    palms.push({
      x: range(rng, island.x + 30, island.x + island.w - 30),
      y: range(rng, island.y + 30, island.y + island.h - 30),
      lean: range(rng, -0.3, 0.3),
      size: range(rng, 10, 16),
    });
  }

  // Named places the missions point at.
  const places = {
    depot: { x: 300, y: 660, label: 'Keys Courier Depot' },
    marinaDrop: { x: marina.x + 300, y: marina.y + marina.h - 90, label: 'Marina Dock 3' },
    bridgeEast: { x: 2520, y: 1200, label: 'East Bridge' },
    safehouse: { x: 3300, y: 1900, label: 'Sunset Safehouse' },
    yacht: { x: marina.x + 430, y: marina.y + marina.h - 40, label: 'Yacht Delia' },
    market: { x: marina.x + 360, y: 900, label: 'Marina Market' },
  };

  return { seed, islands: ISLANDS, roads, buildings, palms, docks, boats, places };
}

export function onRoad(city, x, y) {
  for (const road of city.roads) {
    const half = ROAD.width / 2;
    if (road.vertical) {
      if (Math.abs(x - road.x1) < half && y >= road.y1 - half && y <= road.y2 + half) return true;
    } else if (Math.abs(y - road.y1) < half && x >= road.x1 - half && x <= road.x2 + half) {
      return true;
    }
  }
  for (const bridge of BRIDGES) {
    if (x >= bridge.x && x <= bridge.x + bridge.w && y >= bridge.y && y <= bridge.y + bridge.h) return true;
  }
  return false;
}

export function onLand(city, x, y) {
  if (x < 0 || y < 0 || x > WORLD.width || y > WORLD.height) return false;
  for (const island of ISLANDS) {
    if (x >= island.x && x <= island.x + island.w && y >= island.y && y <= island.y + island.h) return true;
  }
  for (const bridge of BRIDGES) {
    if (x >= bridge.x && x <= bridge.x + bridge.w && y >= bridge.y && y <= bridge.y + bridge.h) return true;
  }
  return false;
}

export function hitsBuilding(city, x, y, radius) {
  for (const b of city.buildings) {
    if (x > b.x - radius && x < b.x + b.w + radius && y > b.y - radius && y < b.y + b.h + radius) return b;
  }
  return null;
}

// Nearest road point to (x, y): traffic and the autopilot snap to roads.
export function nearestRoadPoint(city, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const road of city.roads) {
    let px; let py;
    if (road.vertical) {
      px = road.x1;
      py = Math.max(road.y1, Math.min(road.y2, y));
    } else {
      px = Math.max(road.x1, Math.min(road.x2, x));
      py = road.y1;
    }
    const d = Math.hypot(px - x, py - y);
    if (d < bestDist) { bestDist = d; best = { x: px, y: py }; }
  }
  return best;
}
