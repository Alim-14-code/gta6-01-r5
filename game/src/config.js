// Sunset Keys — tuning and world constants. One job: every number the game
// balances on, in one place, so the rest of the code reads as intent.
export const VIEW = { width: 1280, height: 720 };
export const WORLD = { width: 3840, height: 2560 };
export const STEP = 1 / 60;

export const ROAD = { width: 64, spacing: 360, dash: 28, gap: 24 };

// The three islands of the Keys, west to east, with the bridges between them.
export const ISLANDS = [
  { name: 'Palmetto Cay', x: 120, y: 300, w: 1380, h: 1960, kind: 'downtown' },
  { name: 'Marina Key', x: 1680, y: 300, w: 720, h: 1960, kind: 'marina' },
  { name: 'Sunset Isle', x: 2580, y: 300, w: 1140, h: 1960, kind: 'residential' },
];
export const BRIDGES = [
  { x: 1500, y: 1140, w: 180, h: 120 },
  { x: 2400, y: 1140, w: 180, h: 120 },
];

export const PLAYER = {
  walkSpeed: 170,
  sprintSpeed: 260,
  radius: 13,
  health: 100,
  enterRange: 70,
};

export const CAR = {
  accel: 420,
  brake: 620,
  maxSpeed: 520,
  maxReverse: 160,
  turn: 2.6,
  grip: 0.94,
  length: 44,
  width: 22,
};

export const TRAFFIC_COUNT = 24;
export const PED_COUNT = 40;
export const COP = { maxSpeed: 540, accel: 470, ram: 260, bustRange: 46 };
export const HELI = { altitude: 260, radius: 90, speed: 200 };

export const WANTED = {
  steal: 1,
  shoot: 2,
  killCop: 2,
  decaySeconds: 14,
  decayHiddenSeconds: 7,
};

export const MISSION_CASH = [400, 900, 1200, 1500, 2200, 5000];

export const COLORS = {
  waterDeep: '#2b1d5e',
  waterShallow: '#4a2f8a',
  sand: '#e8c98a',
  grass: '#3f7d4e',
  park: '#2f6b3f',
  road: '#2e2a33',
  roadEdge: '#f2c14e',
  sidewalk: '#8a7f72',
  bridge: '#5a5148',
  buildingRoof: ['#7a4a6e', '#4a6e7a', '#8a5a3a', '#5e4a8a', '#3a6e5a', '#a05a4a'],
  neon: ['#ff5ea8', '#3ae0ff', '#ffd23a', '#7dff5e', '#ff8a3a'],
  car: ['#e84a4a', '#4a8ae8', '#f2c14e', '#7ddc5e', '#c9c9c9', '#8a5ee8', '#ff8a3a'],
  copCar: '#2f6fd6',
  copLight: ['#ff2a2a', '#2a6bff'],
  player: '#ffd23a',
  playerCar: '#ff5ea8',
  marker: '#ffd23a',
  hudBg: 'rgba(12, 8, 28, 0.72)',
  hudText: '#ffe9b0',
};

// Mission roster: id, name, briefing, cash. Logic lives in missions.js.
export const MISSIONS = [
  { id: 0, name: 'First Drop', brief: 'Take the package to the marina dock. Drive — do not scratch the paint.', cash: 400 },
  { id: 1, name: 'Bridge Burners', brief: 'A rival runner is crossing the east bridge. Ram his car until it stalls.', cash: 900 },
  { id: 2, name: 'Sunset Run', brief: 'Three pickups, ninety seconds. The clock is already running.', cash: 1200 },
  { id: 3, name: 'Quiet Tail', brief: 'Follow the black sedan. Stay close enough to see it, far enough it never sees you.', cash: 1500 },
  { id: 4, name: 'Heat Wave', brief: 'The law is on you. Reach the Sunset Isle safehouse and shake them off.', cash: 2200 },
  { id: 5, name: 'The Marina Job', brief: 'Lift the cargo off the yacht at Marina Key, then vanish. Wanted will be four stars.', cash: 5000 },
];
