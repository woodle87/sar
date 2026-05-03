import { CITY, VEHICLE } from './config.js';

const speedoValue = document.getElementById('speedo-value');
const gearValue = document.getElementById('gear-value');
const rpmBar = document.getElementById('rpm-bar');
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');

const totalSize = CITY.gridSize * CITY.cellSize;
const mapOffset = totalSize / 2;

export function updateHUD(speed, rpm, gear, playerPos, playerForward, aiPositions) {
  // Speedometer
  speedoValue.textContent = Math.round(speed);

  // Gear
  gearValue.textContent = gear;

  // RPM bar
  const rpmPct = Math.min(100, Math.max(0, ((rpm - VEHICLE.idleRPM) / (VEHICLE.maxRPM - VEHICLE.idleRPM)) * 100));
  rpmBar.style.width = rpmPct + '%';

  // Minimap
  drawMinimap(playerPos, playerForward, aiPositions);
}

function drawMinimap(playerPos, playerForward, aiPositions) {
  const w = minimapCanvas.width;
  const h = minimapCanvas.height;
  const scale = w / totalSize;

  minimapCtx.clearRect(0, 0, w, h);

  // Background
  minimapCtx.fillStyle = '#1a2a1a';
  minimapCtx.fillRect(0, 0, w, h);

  // Roads
  minimapCtx.strokeStyle = '#555';
  minimapCtx.lineWidth = CITY.roadWidth * scale;

  // Horizontal roads
  for (let row = 0; row <= CITY.gridSize; row++) {
    const z = row * CITY.cellSize;
    const y = z * scale;
    minimapCtx.beginPath();
    minimapCtx.moveTo(0, y);
    minimapCtx.lineTo(w, y);
    minimapCtx.stroke();
  }

  // Vertical roads
  for (let col = 0; col <= CITY.gridSize; col++) {
    const x = col * CITY.cellSize;
    const px = x * scale;
    minimapCtx.beginPath();
    minimapCtx.moveTo(px, 0);
    minimapCtx.lineTo(px, h);
    minimapCtx.stroke();
  }

  // City blocks (buildings)
  minimapCtx.fillStyle = '#445';
  for (let row = 0; row < CITY.gridSize; row++) {
    for (let col = 0; col < CITY.gridSize; col++) {
      const bx = (col * CITY.cellSize + CITY.roadWidth / 2) * scale;
      const bz = (row * CITY.cellSize + CITY.roadWidth / 2) * scale;
      const bw = CITY.blockSize * scale;
      minimapCtx.fillRect(bx, bz, bw, bw);
    }
  }

  // AI cars
  if (aiPositions) {
    minimapCtx.fillStyle = '#facc15';
    for (const pos of aiPositions) {
      const px = (pos.x + mapOffset) * scale;
      const py = (pos.z + mapOffset) * scale;
      minimapCtx.beginPath();
      minimapCtx.arc(px, py, 3, 0, Math.PI * 2);
      minimapCtx.fill();
    }
  }

  // Player
  const px = (playerPos.x + mapOffset) * scale;
  const py = (playerPos.z + mapOffset) * scale;

  // Direction indicator
  minimapCtx.save();
  minimapCtx.translate(px, py);
  const angle = Math.atan2(playerForward.x, playerForward.z);
  minimapCtx.rotate(-angle);

  minimapCtx.fillStyle = '#e63946';
  minimapCtx.beginPath();
  minimapCtx.moveTo(0, -6);
  minimapCtx.lineTo(-4, 4);
  minimapCtx.lineTo(4, 4);
  minimapCtx.closePath();
  minimapCtx.fill();

  minimapCtx.restore();
}
