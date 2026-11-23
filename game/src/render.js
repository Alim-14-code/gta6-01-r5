// Sunset Keys — drawing. One job: turn the world state into a frame.
// Everything visible in the screenshots comes through here: the sunset
// water, the islands, the roads and bridges, the cars, the people, the
// police, the helicopter, the mission marker, and the menu screens.
import { VIEW, WORLD, ROAD, COLORS } from './config.js';
import { roundRect, drawStar } from './hud.js';
import { missionName } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_RESULT = 'result';

export function drawGame(ctx, game) {
  const cam = game.camera;
  ctx.save();
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);

  // Sunset sky-glow over the whole frame, drawn first so the world sits in it.
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  sky.addColorStop(0, '#ff9a5a');
  sky.addColorStop(0.55, '#c94b7a');
  sky.addColorStop(1, '#3a2a6e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  drawWater(ctx, game);
  drawIslands(ctx, game);
  drawRoads(ctx, game);
  drawMarina(ctx, game);
  drawBuildings(ctx, game);
  drawPalms(ctx, game);
  drawMissionMarker(ctx, game);
  drawCars(ctx, game);
  drawPedestrians(ctx, game);
  drawPlayer(ctx, game);
  drawBullets(ctx, game);
  drawParticles(ctx, game);
  drawHelicopter(ctx, game);
  drawSunsetTint(ctx, game);
  ctx.restore();

  if (game.screen === SCREEN_TITLE) drawTitle(ctx, game);
  else if (game.screen === SCREEN_PAUSE) drawPause(ctx, game);
  else if (game.screen === SCREEN_WASTED) drawEndScreen(ctx, game, 'WASTED', 'The Keys crew will remember you, Kai.');
  else if (game.screen === SCREEN_BUSTED) drawEndScreen(ctx, game, 'BUSTED', 'The law caught up with you this time.');
  else if (game.screen === SCREEN_RESULT) drawResult(ctx, game);
}

function toScreen(game, x, y) {
  return { x: x - game.camera.x + VIEW.width / 2, y: y - game.camera.y + VIEW.height / 2 };
}

function drawWater(ctx, game) {
  const cam = game.camera;
  const x0 = Math.max(0, cam.x - VIEW.width / 2 - 40);
  const y0 = Math.max(0, cam.y - VIEW.height / 2 - 40);
  const x1 = Math.min(WORLD.width, cam.x + VIEW.width / 2 + 40);
  const y1 = Math.min(WORLD.height, cam.y + VIEW.height / 2 + 40);
  const grad = ctx.createLinearGradient(0, y0 - cam.y + VIEW.height / 2, 0, y1 - cam.y + VIEW.height / 2);
  grad.addColorStop(0, COLORS.waterShallow);
  grad.addColorStop(1, COLORS.waterDeep);
  ctx.fillStyle = grad;
  const s0 = toScreen(game, x0, y0);
  ctx.fillRect(s0.x, s0.y, x1 - x0, y1 - y0);
  // Slow sunset shimmer on the water.
  ctx.strokeStyle = 'rgba(255, 190, 120, 0.18)';
  ctx.lineWidth = 2;
  const t = game.time * 0.6;
  for (let y = Math.floor(y0 / 90) * 90; y < y1; y += 90) {
    for (let x = Math.floor(x0 / 140) * 140; x < x1; x += 140) {
      const p = toScreen(game, x + ((t * 30 + x) % 90), y);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 46, p.y);
      ctx.stroke();
    }
  }
}

function drawIslands(ctx, game) {
  for (const island of game.city.islands) {
    const s = toScreen(game, island.x, island.y);
    ctx.fillStyle = COLORS.sand;
    roundRect(ctx, s.x - 14, s.y - 14, island.w + 28, island.h + 28, 26);
    ctx.fill();
    ctx.fillStyle = island.kind === 'marina' ? '#7a9a5e' : COLORS.grass;
    roundRect(ctx, s.x, s.y, island.w, island.h, 18);
    ctx.fill();
    if (island.kind === 'downtown') {
      ctx.fillStyle = COLORS.park;
      roundRect(ctx, s.x + island.w - 330, s.y + 120, 220, 200, 12);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255, 233, 176, 0.85)';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(island.name.toUpperCase(), s.x + 18, s.y + 30);
  }
}

function drawRoads(ctx, game) {
  for (const road of game.city.roads) {
    const a = toScreen(game, road.x1, road.y1);
    const b = toScreen(game, road.x2, road.y2);
    ctx.strokeStyle = road.bridge ? COLORS.bridge : COLORS.road;
    ctx.lineWidth = ROAD.width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    // Centre dashes.
    ctx.strokeStyle = COLORS.roadEdge;
    ctx.lineWidth = 3;
    ctx.setLineDash([ROAD.dash, ROAD.gap]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawMarina(ctx, game) {
  for (const dock of game.city.docks) {
    const s = toScreen(game, dock.x, dock.y);
    ctx.fillStyle = '#6e5a44';
    ctx.fillRect(s.x, s.y, dock.w, dock.h);
    ctx.fillStyle = '#8a7355';
    for (let y = 0; y < dock.h; y += 22) ctx.fillRect(s.x, s.y + y, dock.w, 4);
  }
  for (const boat of game.city.boats) {
    const s = toScreen(game, boat.x, boat.y);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(boat.angle);
    ctx.fillStyle = boat.color;
    roundRect(ctx, -boat.w / 2, -boat.h / 2, boat.w, boat.h, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(20, 30, 60, 0.55)';
    ctx.fillRect(-boat.w / 2 + 5, -boat.h / 2 + 12, boat.w - 10, 18);
    ctx.restore();
  }
}

function drawBuildings(ctx, game) {
  for (const b of game.city.buildings) {
    const s = toScreen(game, b.x, b.y);
    // Long sunset shadow, cast east.
    ctx.fillStyle = 'rgba(20, 8, 40, 0.28)';
    ctx.fillRect(s.x + 14, s.y + 10, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(s.x, s.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.fillRect(s.x, s.y, b.w, 8);
    // Lit windows.
    ctx.fillStyle = 'rgba(255, 220, 120, 0.75)';
    for (let wy = s.y + 18; wy < s.y + b.h - 12; wy += 26) {
      for (let wx = s.x + 14; wx < s.x + b.w - 12; wx += 30) {
        if ((wx * 7 + wy * 13) % 5 < 2) ctx.fillRect(wx, wy, 12, 9);
      }
    }
    if (b.neon) {
      ctx.strokeStyle = b.neon;
      ctx.lineWidth = 3;
      ctx.shadowColor = b.neon;
      ctx.shadowBlur = 12;
      ctx.strokeRect(s.x + 2, s.y + 2, b.w - 4, b.h - 4);
      ctx.shadowBlur = 0;
    }
  }
}

function drawPalms(ctx, game) {
  for (const palm of game.city.palms) {
    const s = toScreen(game, palm.x, palm.y);
    if (s.x < -30 || s.x > VIEW.width + 30 || s.y < -30 || s.y > VIEW.height + 30) continue;
    ctx.strokeStyle = '#5a3a22';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + palm.lean * 14, s.y - palm.size);
    ctx.stroke();
    ctx.fillStyle = '#2f7a3f';
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 + palm.lean;
      ctx.beginPath();
      ctx.ellipse(s.x + palm.lean * 14 + Math.cos(a) * 9, s.y - palm.size + Math.sin(a) * 5, 11, 4, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawMissionMarker(ctx, game) {
  const marker = game.missions.target;
  if (!marker || game.missions.state !== 'active') return;
  const s = toScreen(game, marker.x, marker.y);
  const pulse = 1 + Math.sin(game.time * 4) * 0.15;
  ctx.strokeStyle = '#ffd23a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(s.x, s.y, 34 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.moveTo(s.x, s.y - 52);
  ctx.lineTo(s.x - 12, s.y - 28);
  ctx.lineTo(s.x + 12, s.y - 28);
  ctx.closePath();
  ctx.fill();
  // Off-screen arrow pointing at the marker.
  const dx = marker.x - game.camera.x;
  const dy = marker.y - game.camera.y;
  if (Math.abs(dx) > VIEW.width / 2 - 40 || Math.abs(dy) > VIEW.height / 2 - 40) {
    const angle = Math.atan2(dy, dx);
    const ax = VIEW.width / 2 + Math.cos(angle) * (VIEW.width / 2 - 70);
    const ay = VIEW.height / 2 + Math.sin(angle) * (VIEW.height / 2 - 70);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(angle);
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-10, -12);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawCar(ctx, game, car) {
  const s = toScreen(game, car.x, car.y);
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(20, 8, 40, 0.3)';
  roundRect(ctx, -20, -8, 46, 26, 8);
  ctx.fill();
  ctx.fillStyle = car.color;
  roundRect(ctx, -22, -11, 44, 22, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(180, 220, 255, 0.85)';
  roundRect(ctx, -6, -9, 14, 18, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillRect(18, -9, 3, 18);
  if (car.kind === 'cop') {
    ctx.fillStyle = (Math.floor(game.time * 4 + car.siren) % 2 === 0) ? '#ff2a2a' : '#2a6bff';
    ctx.fillRect(-14, -13, 12, 4);
    ctx.fillRect(2, -13, 12, 4);
  }
  ctx.restore();
}

function drawCars(ctx, game) {
  for (const car of game.traffic) drawCar(ctx, game, car);
  for (const cop of game.cops) drawCar(ctx, game, cop);
  if (game.missions.targetCar) drawCar(ctx, game, game.missions.targetCar);
  if (game.playerCar) drawCar(ctx, game, game.playerCar);
}

function drawPedestrians(ctx, game) {
  for (const ped of game.peds) {
    const s = toScreen(game, ped.x, ped.y);
    if (s.x < -20 || s.x > VIEW.width + 20 || s.y < -20 || s.y > VIEW.height + 20) continue;
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(s.x, s.y - 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.arc(s.x, s.y + 4, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx, game) {
  const player = game.player;
  if (game.playerCar) return; // the car drawing shows the player
  const s = toScreen(game, player.x, player.y);
  ctx.fillStyle = 'rgba(20, 8, 40, 0.35)';
  ctx.beginPath();
  ctx.ellipse(s.x + 4, s.y + 6, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(player.angle);
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(4, -3, 10, 6);
  ctx.restore();
  // Health ring.
  ctx.strokeStyle = '#7ddc5e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(s.x, s.y, 17, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.max(0, player.health)) / 100);
  ctx.stroke();
}

function drawBullets(ctx, game) {
  ctx.fillStyle = '#ffe9b0';
  for (const bullet of game.bullets) {
    const s = toScreen(game, bullet.x, bullet.y);
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(ctx, game) {
  for (const p of game.particles) {
    const s = toScreen(game, p.x, p.y);
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHelicopter(ctx, game) {
  const heli = game.heli;
  if (!heli.active) return;
  const s = toScreen(game, heli.x, heli.y);
  // Searchlight cone on the ground.
  const grad = ctx.createRadialGradient(s.x, s.y, 10, s.x, s.y, 150);
  grad.addColorStop(0, 'rgba(255, 240, 180, 0.35)');
  grad.addColorStop(1, 'rgba(255, 240, 180, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(s.x, s.y, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.fillStyle = '#20242e';
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.lineTo(30, 0);
  ctx.moveTo(0, -30);
  ctx.lineTo(0, 30);
  ctx.stroke();
  ctx.restore();
}

function drawSunsetTint(ctx, game) {
  const grad = ctx.createLinearGradient(0, 0, VIEW.width, VIEW.height);
  grad.addColorStop(0, 'rgba(255, 140, 80, 0.05)');
  grad.addColorStop(1, 'rgba(90, 30, 120, 0.10)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function drawTitle(ctx, game) {
  ctx.fillStyle = 'rgba(10, 6, 26, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23a';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.shadowColor = '#ff5ea8';
  ctx.shadowBlur = 28;
  ctx.fillText('SUNSET KEYS', VIEW.width / 2, 240);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffe9b0';
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillText('An open-world crime story across three islands', VIEW.width / 2, 288);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = '#d8c9a8';
  ctx.fillText('Kai Marlin. The Keys Crew. Six jobs. One sunset.', VIEW.width / 2, 322);
  ctx.fillStyle = '#ff5ea8';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('Press ENTER to play', VIEW.width / 2, 420);
  ctx.fillStyle = '#d8c9a8';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('WASD drive and walk · E enter a car · Space shoot · P pause', VIEW.width / 2, 462);
  ctx.fillText(`Best: $${game.bestCash.toLocaleString('en-US')} earned · Mission ${Math.min(game.missions.index + 1, 6)} of 6`, VIEW.width / 2, 492);
  ctx.textAlign = 'left';
}

function drawPause(ctx, game) {
  ctx.fillStyle = 'rgba(10, 6, 26, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9b0';
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText('PAUSED', VIEW.width / 2, 330);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Press P to keep driving', VIEW.width / 2, 380);
  ctx.textAlign = 'left';
}

function drawEndScreen(ctx, game, title, line) {
  ctx.fillStyle = 'rgba(20, 4, 12, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5e5e';
  ctx.font = 'bold 76px system-ui, sans-serif';
  ctx.fillText(title, VIEW.width / 2, 320);
  ctx.fillStyle = '#ffe9b0';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText(line, VIEW.width / 2, 370);
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('Press ENTER to try again', VIEW.width / 2, 440);
  ctx.textAlign = 'left';
}

function drawResult(ctx, game) {
  ctx.fillStyle = 'rgba(10, 6, 26, 0.68)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7ddc5e';
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText('MISSION COMPLETE', VIEW.width / 2, 300);
  ctx.fillStyle = '#ffe9b0';
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillText(game.missions.message, VIEW.width / 2, 350);
  ctx.fillText(`Total earned: $${game.cash.toLocaleString('en-US')}`, VIEW.width / 2, 392);
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(game.missions.index >= 6 ? 'You finished the story — free roam!' : 'Press ENTER for the next job', VIEW.width / 2, 452);
  ctx.textAlign = 'left';
}
