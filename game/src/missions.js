// Sunset Keys — the story. One job: the six missions, each a small state
// machine with an objective, a marker, a timer where one fits, and a
// success or fail. The game loop asks it where the player should go and
// what counts as done; it never touches rendering or input itself.
import { MISSIONS, MISSION_CASH } from './config.js';
import { distance } from './random.js';

export function createMissions(city, seed) {
  const places = city.places;
  const rngTargets = [
    { x: places.marinaDrop.x, y: places.marinaDrop.y },
    { x: 2500, y: 900 },
    { x: places.market.x, y: places.market.y },
  ];
  return {
    index: 0,
    state: 'brief', // brief | active | done | failed
    timer: 0,
    target: null,
    targetCar: null,
    tail: { seen: 0, lost: 0 },
    pickups: [],
    pickupIndex: 0,
    message: '',
    cashEarned: 0,
    _targets: rngTargets,
  };
}

export function missionName(missions) {
  return MISSIONS[missions.index] ? MISSIONS[missions.index].name : 'Free Roam';
}

export function missionBrief(missions) {
  return MISSIONS[missions.index] ? MISSIONS[missions.index].brief : 'The Keys are yours. Cruise, earn, stay out of trouble.';
}

// Start (or restart) the current mission, placing its target and timer.
export function startMission(missions, game) {
  const city = game.city;
  const places = city.places;
  missions.state = 'active';
  missions.message = '';
  const i = missions.index;
  if (i === 0) {
    missions.target = { x: places.marinaDrop.x, y: places.marinaDrop.y, label: 'Marina Dock 3' };
  } else if (i === 1) {
    // The rival runner spawns on the west bridge road, heading east.
    missions.targetCar = {
      x: 900, y: 1200, angle: 0, speed: 200, color: '#1a1a1a', kind: 'rival',
      hp: 4, cruise: 230,
    };
    missions.target = { x: missions.targetCar.x, y: missions.targetCar.y, label: 'Rival runner' };
  } else if (i === 2) {
    missions.pickups = [
      { x: places.market.x, y: places.market.y, taken: false, label: 'Pickup 1' },
      { x: 3120, y: 700, taken: false, label: 'Pickup 2' },
      { x: 700, y: 1900, taken: false, label: 'Pickup 3' },
    ];
    missions.pickupIndex = 0;
    missions.timer = 90;
    missions.target = missions.pickups[0];
  } else if (i === 3) {
    missions.targetCar = {
      x: game.player.x + 420, y: game.player.y + 60, angle: 0, speed: 150,
      color: '#111111', kind: 'tail', hp: 99, cruise: 150,
    };
    missions.tail = { seen: 0, lost: 0 };
    missions.timer = 75;
    missions.target = { x: missions.targetCar.x, y: missions.targetCar.y, label: 'Black sedan' };
  } else if (i === 4) {
    missions.target = { x: places.safehouse.x, y: places.safehouse.y, label: 'Sunset Safehouse' };
    game.wanted = Math.max(game.wanted, 3);
  } else if (i === 5) {
    missions.target = { x: places.yacht.x, y: places.yacht.y, label: 'Yacht Delia' };
    missions.pickups = [{ x: places.yacht.x, y: places.yacht.y, taken: false, label: 'Cargo' }];
    missions.pickupIndex = 0;
  }
}

// Advance the mission one step. Returns 'done' | 'failed' | null.
export function updateMission(missions, game, dt) {
  if (missions.state !== 'active') return null;
  const player = game.player;
  const i = missions.index;

  if (i === 0) {
    if (distance(player.x, player.y, missions.target.x, missions.target.y) < 80) return completeMission(missions, game);
  } else if (i === 1) {
    const rival = missions.targetCar;
    if (rival) {
      missions.target = { x: rival.x, y: rival.y, label: 'Rival runner' };
      if (rival.hp <= 0) return completeMission(missions, game);
      if (distance(player.x, player.y, rival.x, rival.y) > 1400) {
        missions.message = 'You lost him.';
        return failMission(missions, game);
      }
    }
  } else if (i === 2) {
    missions.timer -= dt;
    const pickup = missions.pickups[missions.pickupIndex];
    if (pickup && distance(player.x, player.y, pickup.x, pickup.y) < 90) {
      pickup.taken = true;
      game.cash += 150;
      game.audio.pickup();
      missions.pickupIndex += 1;
      if (missions.pickupIndex >= missions.pickups.length) return completeMission(missions, game);
      missions.target = missions.pickups[missions.pickupIndex];
    }
    if (missions.timer <= 0) {
      missions.message = 'Out of time.';
      return failMission(missions, game);
    }
  } else if (i === 3) {
    missions.timer -= dt;
    const sedan = missions.targetCar;
    if (sedan) {
      missions.target = { x: sedan.x, y: sedan.y, label: 'Black sedan' };
      const d = distance(player.x, player.y, sedan.x, sedan.y);
      if (d < 130) missions.tail.seen += dt;
      else missions.tail.seen = Math.max(0, missions.tail.seen - dt);
      if (d > 900) missions.tail.lost += dt;
      else missions.tail.lost = Math.max(0, missions.tail.lost - dt * 2);
      if (missions.tail.seen > 3) {
        missions.message = 'He spotted you.';
        return failMission(missions, game);
      }
      if (missions.tail.lost > 6) {
        missions.message = 'You lost the sedan.';
        return failMission(missions, game);
      }
      if (missions.timer <= 0) return completeMission(missions, game);
    }
  } else if (i === 4) {
    if (distance(player.x, player.y, missions.target.x, missions.target.y) < 100) {
      if (game.wanted === 0) return completeMission(missions, game);
      missions.message = 'Lose the cops first — stay out of sight.';
    }
  } else if (i === 5) {
    const cargo = missions.pickups[0];
    if (!cargo.taken) {
      if (distance(player.x, player.y, cargo.x, cargo.y) < 90) {
        cargo.taken = true;
        game.wanted = Math.max(game.wanted, 4);
        missions.target = { x: citySafehouse(game).x, y: citySafehouse(game).y, label: 'Escape to the safehouse' };
        missions.message = 'Cargo grabbed — now disappear.';
      }
    } else if (distance(player.x, player.y, missions.target.x, missions.target.y) < 100) {
      return completeMission(missions, game);
    }
  }
  return null;
}

function citySafehouse(game) {
  return game.city.places.safehouse;
}

function completeMission(missions, game) {
  const cash = MISSION_CASH[missions.index] || 0;
  game.cash += cash;
  missions.cashEarned += cash;
  missions.state = 'done';
  missions.message = `Mission complete — $${cash}`;
  game.audio.stinger();
  return 'done';
}

function failMission(missions, game) {
  missions.state = 'failed';
  return 'failed';
}

// After a done mission, advance to the next one (or free roam at the end).
export function advanceMission(missions, game) {
  if (missions.index < MISSIONS.length - 1) {
    missions.index += 1;
    missions.state = 'brief';
    startMission(missions, game);
  } else {
    missions.index = MISSIONS.length; // free roam
    missions.state = 'brief';
    missions.target = null;
  }
}

export function retryMission(missions, game) {
  missions.state = 'brief';
  startMission(missions, game);
}
