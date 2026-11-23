// Sunset Keys — the HUD and the minimap. One job: everything the player
// reads while playing (cash, health, wanted stars, speed, mission text,
// the map), drawn on the canvas so the screenshots show the game complete.
import { VIEW, WORLD, COLORS } from './config.js';
import { missionName, missionBrief } from './missions.js';

export function drawHUD(ctx, game) {
  const player = game.player;
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // Top-left panel: cash, health, mission.
  ctx.fillStyle = COLORS.hudBg;
  roundRect(ctx, 14, 12, 330, 108, 10);
  ctx.fill();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(`$${game.cash.toLocaleString('en-US')}`, 28, 44);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = '#ffb0b0';
  ctx.fillText(`Health ${Math.max(0, Math.round(player.health))}`, 28, 68);
  ctx.fillStyle = '#7ddc5e';
  ctx.fillRect(150, 56, 170 * Math.max(0, player.health) / 100, 10);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(150, 56, 170, 10);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(missionName(game.missions), 28, 96);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#d8c9a8';
  ctx.fillText(truncate(missionBrief(game.missions), 52), 28, 112);

  // Wanted stars, top centre.
  const cx = VIEW.width / 2;
  ctx.fillStyle = COLORS.hudBg;
  roundRect(ctx, cx - 110, 12, 220, 44, 10);
  ctx.fill();
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < game.wanted ? '#ffd23a' : 'rgba(255,255,255,0.22)';
    drawStar(ctx, cx - 88 + i * 40, 34, i < game.wanted ? 13 : 11);
  }
  if (game.wanted > 0) {
    ctx.fillStyle = '#ff5e5e';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.wanted >= 4 ? 'HELICOPTER OVERHEAD' : 'POLICE ON YOU', cx, 72);
    ctx.textAlign = 'left';
  }

  // Mission timer, when one is running.
  if (game.missions.state === 'active' && game.missions.timer > 0) {
    ctx.fillStyle = game.missions.timer < 15 ? '#ff5e5e' : COLORS.hudText;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(game.missions.timer)}s`, cx, 108);
    ctx.textAlign = 'left';
  }

  // Speed, bottom right.
  const speed = game.playerCar ? Math.abs(Math.round(game.playerCar.speed * 0.12)) : 0;
  ctx.fillStyle = COLORS.hudBg;
  roundRect(ctx, VIEW.width - 150, VIEW.height - 64, 136, 50, 10);
  ctx.fill();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${speed}`, VIEW.width - 52, VIEW.height - 28);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('mph', VIEW.width - 24, VIEW.height - 28);
  ctx.textAlign = 'left';

  // Controls hint, bottom left.
  ctx.fillStyle = 'rgba(12, 8, 28, 0.55)';
  roundRect(ctx, 14, VIEW.height - 40, 430, 26, 8);
  ctx.fill();
  ctx.fillStyle = '#d8c9a8';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('WASD drive / walk   E enter car   Space shoot   P pause   M mission', 24, VIEW.height - 22);

  drawMinimap(ctx, game);
  ctx.restore();
}

function drawMinimap(ctx, game) {
  const size = 190;
  const x0 = VIEW.width - size - 14;
  const y0 = 84;
  const scale = size / WORLD.width;
  ctx.fillStyle = 'rgba(12, 8, 28, 0.72)';
  roundRect(ctx, x0 - 6, y0 - 6, size + 12, (size * WORLD.height) / WORLD.width + 12, 8);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, size, (size * WORLD.height) / WORLD.width);
  ctx.clip();
  ctx.fillStyle = '#3a2a7a';
  ctx.fillRect(x0, y0, size, (size * WORLD.height) / WORLD.width);
  for (const island of game.city.islands || []) {
    ctx.fillStyle = '#2e7d4f';
    ctx.fillRect(x0 + island.x * scale, y0 + island.y * scale, island.w * scale, island.h * scale);
  }
  ctx.strokeStyle = '#2e2a33';
  ctx.lineWidth = 2;
  for (const road of game.city.roads) {
    ctx.beginPath();
    ctx.moveTo(x0 + road.x1 * scale, y0 + road.y1 * scale);
    ctx.lineTo(x0 + road.x2 * scale, y0 + road.y2 * scale);
    ctx.stroke();
  }
  const marker = game.missions.target;
  if (marker) {
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath();
    ctx.arc(x0 + marker.x * scale, y0 + marker.y * scale, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cop of game.cops) {
    ctx.fillStyle = '#2a6bff';
    ctx.fillRect(x0 + cop.x * scale - 2, y0 + cop.y * scale - 2, 4, 4);
  }
  ctx.fillStyle = '#ff5ea8';
  ctx.beginPath();
  ctx.arc(x0 + game.player.x * scale, y0 + game.player.y * scale, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(angle) * rad;
    const py = y + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function truncate(text, max) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}
