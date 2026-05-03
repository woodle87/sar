import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CITY } from './config.js';
import { physicsWorld, groundMaterial } from './physics.js';

// Seeded random for reproducible city
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createCity(scene, models) {
  const group = new THREE.Group();
  const rand = seededRandom(42);
  const totalSize = CITY.gridSize * CITY.cellSize;
  const offset = totalSize / 2;

  // ── Ground plane (textured grass) ──
  const groundGeo = new THREE.PlaneGeometry(800, 800, 1, 1);
  const groundCanvas = createGrassTexture();
  const groundTex = new THREE.CanvasTexture(groundCanvas);
  groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(80, 80);
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    color: 0x4a7c59,
    roughness: 0.95,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  group.add(ground);

  // ── Road network (textured asphalt) ──
  const roadCanvas = createRoadTexture();
  const roadTex = new THREE.CanvasTexture(roadCanvas);
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    color: 0x444444,
    roughness: 0.9,
  });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.7 });
  const markingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

  // Horizontal roads
  for (let row = 0; row <= CITY.gridSize; row++) {
    const z = row * CITY.cellSize - offset;
    const roadGeo = new THREE.BoxGeometry(totalSize, 0.05, CITY.roadWidth);
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(0, 0.01, z);
    road.receiveShadow = true;
    group.add(road);

    for (let i = 0; i < totalSize / 6; i++) {
      const markGeo = new THREE.BoxGeometry(3, 0.02, 0.15);
      const mark = new THREE.Mesh(markGeo, markingMat);
      mark.position.set(-totalSize / 2 + i * 6 + 1.5, 0.06, z);
      group.add(mark);
    }
  }

  // Vertical roads
  for (let col = 0; col <= CITY.gridSize; col++) {
    const x = col * CITY.cellSize - offset;
    const roadGeo = new THREE.BoxGeometry(CITY.roadWidth, 0.05, totalSize);
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(x, 0.01, 0);
    road.receiveShadow = true;
    group.add(road);

    for (let i = 0; i < totalSize / 6; i++) {
      const markGeo = new THREE.BoxGeometry(0.15, 0.02, 3);
      const mark = new THREE.Mesh(markGeo, markingMat);
      mark.position.set(x, 0.06, -totalSize / 2 + i * 6 + 1.5);
      group.add(mark);
    }
  }

  // ── Buildings (3D models) ──
  const buildingModels = models?.buildings || [];
  const hasBuildings = buildingModels.length > 0;

  for (let row = 0; row < CITY.gridSize; row++) {
    for (let col = 0; col < CITY.gridSize; col++) {
      const blockX = col * CITY.cellSize - offset + CITY.roadWidth / 2;
      const blockZ = row * CITY.cellSize - offset + CITY.roadWidth / 2;

      const count = CITY.buildingsPerBlock.min +
        Math.floor(rand() * (CITY.buildingsPerBlock.max - CITY.buildingsPerBlock.min + 1));

      for (let b = 0; b < count; b++) {
        const w = CITY.buildingMinSize + rand() * (CITY.buildingMaxSize - CITY.buildingMinSize);
        const d = CITY.buildingMinSize + rand() * (CITY.buildingMaxSize - CITY.buildingMinSize);
        const h = CITY.buildingHeight.min + rand() * (CITY.buildingHeight.max - CITY.buildingHeight.min);

        // bx/bz = CENTER of building. Ensure building stays fully inside the block.
        const pad = 5; // extra margin from road edge
        const rangeX = Math.max(0, CITY.blockSize - w - pad * 2);
        const rangeZ = Math.max(0, CITY.blockSize - d - pad * 2);
        const bx = blockX + pad + w / 2 + rand() * rangeX;
        const bz = blockZ + pad + d / 2 + rand() * rangeZ;

        if (hasBuildings) {
          // Pick a random building model
          const modelIdx = Math.floor(rand() * buildingModels.length);
          const bModel = buildingModels[modelIdx];
          const clone = bModel.scene.clone();

          // Scale to desired dimensions
          const scaleX = w / bModel.size.x;
          const scaleY = h / bModel.size.y;
          const scaleZ = d / bModel.size.z;
          clone.scale.set(scaleX, scaleY, scaleZ);

          // Position at ground level
          clone.position.set(
            bx - bModel.center.x * scaleX,
            0 - (bModel.center.y - bModel.size.y / 2) * scaleY,
            bz - bModel.center.z * scaleZ
          );

          clone.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          group.add(clone);
        } else {
          // Fallback: box buildings with windows
          const geo = new THREE.BoxGeometry(w, h, d);
          const colors = [0x8899aa, 0x667788, 0x556677, 0xaab0b8, 0xc4b5a0, 0x7a8a9a];
          const mat = new THREE.MeshStandardMaterial({
            color: colors[Math.floor(rand() * colors.length)],
            roughness: 0.7,
            metalness: 0.1,
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(bx, h / 2, bz);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          group.add(mesh);
        }

        // Physics body for building
        const buildingBody = new CANNON.Body({
          type: CANNON.Body.STATIC,
          shape: new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)),
          position: new CANNON.Vec3(bx, h / 2, bz),
          material: groundMaterial,
        });
        physicsWorld.addBody(buildingBody);
      }
    }
  }

  // ── Trees (3D models) ──
  const roadXPositions = [];
  for (let col = 0; col <= CITY.gridSize; col++) {
    roadXPositions.push(col * CITY.cellSize - offset);
  }
  const roadZPositions = [];
  for (let row = 0; row <= CITY.gridSize; row++) {
    roadZPositions.push(row * CITY.cellSize - offset);
  }

  function isOnRoad(x, z) {
    const halfRoad = CITY.roadWidth / 2 + 2;
    for (const rx of roadXPositions) {
      if (Math.abs(x - rx) < halfRoad) return true;
    }
    for (const rz of roadZPositions) {
      if (Math.abs(z - rz) < halfRoad) return true;
    }
    return false;
  }

  const treePositions = [];
  for (let row = 0; row <= CITY.gridSize; row++) {
    for (let i = 0; i < totalSize; i += CITY.treeSpacing) {
      const z = row * CITY.cellSize - offset;
      const x = -totalSize / 2 + i + rand() * 3;
      const treeN = [x, z + CITY.roadWidth / 2 + 2.5];
      const treeS = [x, z - CITY.roadWidth / 2 - 2.5];
      if (!isOnRoad(treeN[0], treeN[1])) treePositions.push(treeN);
      if (!isOnRoad(treeS[0], treeS[1])) treePositions.push(treeS);
    }
  }
  for (let col = 0; col <= CITY.gridSize; col++) {
    for (let i = 0; i < totalSize; i += CITY.treeSpacing) {
      const x = col * CITY.cellSize - offset;
      const z = -totalSize / 2 + i + rand() * 3;
      const treeE = [x + CITY.roadWidth / 2 + 2.5, z];
      const treeW = [x - CITY.roadWidth / 2 - 2.5, z];
      if (!isOnRoad(treeE[0], treeE[1])) treePositions.push(treeE);
      if (!isOnRoad(treeW[0], treeW[1])) treePositions.push(treeW);
    }
  }

  const treeModels = models?.trees || [];
  const hasTrees = treeModels.length > 0;

  treePositions.forEach(([x, z], i) => {
    if (hasTrees) {
      const treeIdx = Math.floor(rand() * treeModels.length);
      const tModel = treeModels[treeIdx];
      const clone = tModel.scene.clone();

      // Scale trees to a nice sidewalk size (3-6 units tall)
      const targetHeight = 3 + rand() * 4;
      const treeScale = targetHeight / tModel.size.y;
      clone.scale.set(treeScale, treeScale, treeScale);

      // Position at ground level
      clone.position.set(
        x - tModel.center.x * treeScale,
        0 - (tModel.center.y - tModel.size.y / 2) * treeScale,
        z - tModel.center.z * treeScale
      );

      clone.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      group.add(clone);
    } else {
      // Fallback: primitive trees
      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.36, 2.5, 6);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B5E3C });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, 1.25, z);
      trunk.castShadow = true;
      group.add(trunk);

      const canopyGeo = new THREE.ConeGeometry(1.8, 3.0, 8);
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0x2d8a4e });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(x, 2.5 + 1.5, z);
      canopy.castShadow = true;
      group.add(canopy);
    }

    // Physics body for tree
    const treeBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Cylinder(0.6, 0.6, 5, 6),
      position: new CANNON.Vec3(x, 2.5, z),
      material: groundMaterial,
    });
    physicsWorld.addBody(treeBody);
  });

  // ── Sidewalks (segmented — skip intersections) ──
  // Horizontal road sidewalks: segments between vertical roads
  for (let row = 0; row <= CITY.gridSize; row++) {
    const z = row * CITY.cellSize - offset;
    for (let col = 0; col < CITY.gridSize; col++) {
      const xStart = col * CITY.cellSize - offset + CITY.roadWidth / 2;
      const xEnd = (col + 1) * CITY.cellSize - offset - CITY.roadWidth / 2;
      const segLen = xEnd - xStart;
      if (segLen <= 0) continue;
      const xCenter = (xStart + xEnd) / 2;

      const swGeo = new THREE.BoxGeometry(segLen, CITY.sidewalkHeight, CITY.sidewalkWidth);
      const swN = new THREE.Mesh(swGeo, sidewalkMat);
      swN.position.set(xCenter, CITY.sidewalkHeight / 2, z + CITY.roadWidth / 2 + CITY.sidewalkWidth / 2);
      swN.receiveShadow = true;
      group.add(swN);
      const swS = new THREE.Mesh(swGeo, sidewalkMat);
      swS.position.set(xCenter, CITY.sidewalkHeight / 2, z - CITY.roadWidth / 2 - CITY.sidewalkWidth / 2);
      swS.receiveShadow = true;
      group.add(swS);
    }
  }
  // Vertical road sidewalks: segments between horizontal roads
  for (let col = 0; col <= CITY.gridSize; col++) {
    const x = col * CITY.cellSize - offset;
    for (let row = 0; row < CITY.gridSize; row++) {
      const zStart = row * CITY.cellSize - offset + CITY.roadWidth / 2;
      const zEnd = (row + 1) * CITY.cellSize - offset - CITY.roadWidth / 2;
      const segLen = zEnd - zStart;
      if (segLen <= 0) continue;
      const zCenter = (zStart + zEnd) / 2;

      const swGeo = new THREE.BoxGeometry(CITY.sidewalkWidth, CITY.sidewalkHeight, segLen);
      const swE = new THREE.Mesh(swGeo, sidewalkMat);
      swE.position.set(x + CITY.roadWidth / 2 + CITY.sidewalkWidth / 2, CITY.sidewalkHeight / 2, zCenter);
      swE.receiveShadow = true;
      group.add(swE);
      const swW = new THREE.Mesh(swGeo, sidewalkMat);
      swW.position.set(x - CITY.roadWidth / 2 - CITY.sidewalkWidth / 2, CITY.sidewalkHeight / 2, zCenter);
      swW.receiveShadow = true;
      group.add(swW);
    }
  }

  // ── Street name signs at intersections ──
  const streetNamesH = ['1st St', '2nd St', '3rd St', '4th St', '5th St', '6th St', '7th St', '8th St', '9th St'];
  const streetNamesV = ['Main Ave', 'Park Ave', 'Oak Ave', 'Elm Ave', 'King Ave', 'Queen Ave', 'Lake Ave', 'Hill Ave', 'River Ave'];

  for (let row = 0; row <= CITY.gridSize; row++) {
    for (let col = 0; col <= CITY.gridSize; col++) {
      const ix = col * CITY.cellSize - offset;
      const iz = row * CITY.cellSize - offset;

      // Green street name sign on a pole
      const hName = streetNamesH[row] || `${row + 1}th St`;
      const vName = streetNamesV[col] || `${col + 1}th Ave`;
      const signText = `${vName} & ${hName}`;

      const sign = createTextSign(signText, {
        bgColor: '#f0c000', textColor: '#000000',
        width: 3.5, height: 0.8,
      });
      sign.position.set(ix + CITY.roadWidth / 2 + 1, 3.5, iz + CITY.roadWidth / 2 + 1);
      group.add(sign);

      // Sign pole
      const pole = createPole(3.5);
      pole.position.set(ix + CITY.roadWidth / 2 + 1, 0, iz + CITY.roadWidth / 2 + 1);
      group.add(pole);
    }
  }

  // ── Yellow road signs along roads ──
  const yellowSigns = [
    'SPEED LIMIT 50', 'SLOW', 'CURVE AHEAD', 'YIELD',
    'NO PARKING', 'ONE WAY', 'STOP AHEAD', 'SCHOOL ZONE',
    'SPEED LIMIT 30', 'CAUTION', 'MERGE', 'KEEP RIGHT',
  ];

  for (let row = 0; row <= CITY.gridSize; row++) {
    const z = row * CITY.cellSize - offset;
    for (let i = 1; i < CITY.gridSize; i++) {
      const x = i * CITY.cellSize - offset;
      // Place yellow sign on right side of horizontal road, between intersections
      const sx = x + CITY.cellSize * 0.4;
      const sz = z + CITY.roadWidth / 2 + 1.5;
      if (!isOnRoad(sx, sz)) {
        const signIdx = Math.floor(rand() * yellowSigns.length);
        const sign = createTextSign(yellowSigns[signIdx], {
          bgColor: '#f0c000', textColor: '#000000',
          width: 1.8, height: 1.8,
        });
        sign.position.set(sx, 2.8, sz);
        group.add(sign);
        const pole = createPole(2.8);
        pole.position.set(sx, 0, sz);
        group.add(pole);
      }
    }
  }

  for (let col = 0; col <= CITY.gridSize; col++) {
    const x = col * CITY.cellSize - offset;
    for (let i = 1; i < CITY.gridSize; i++) {
      const z = i * CITY.cellSize - offset;
      const sx = x + CITY.roadWidth / 2 + 1.5;
      const sz = z + CITY.cellSize * 0.4;
      if (!isOnRoad(sx, sz)) {
        const signIdx = Math.floor(rand() * yellowSigns.length);
        const sign = createTextSign(yellowSigns[signIdx], {
          bgColor: '#f0c000', textColor: '#000000',
          width: 1.8, height: 1.8,
        });
        sign.position.set(sx, 2.8, sz);
        sign.rotation.y = Math.PI / 2;
        group.add(sign);
        const pole = createPole(2.8);
        pole.position.set(sx, 0, sz);
        group.add(pole);
      }
    }
  }

  // ── Building name signs ──
  const buildingNames = [
    'City Hall', 'Grand Hotel', 'Central Mall', 'Tech Hub', 'Medical Center',
    'Plaza Tower', 'Bank of THB', 'Fire Station', 'Police HQ', 'Library',
    'Museum', 'Court House', 'Post Office', 'Gym & Fitness', 'Cinema',
    'Coffee House', 'Restaurant', 'Supermarket', 'Parking Garage', 'Apartments',
    'School', 'University', 'Office Block', 'Shopping Center', 'Gas Station',
    'Bakery', 'Book Store', 'Pharmacy', 'Pet Shop', 'Auto Repair',
    'Art Gallery', 'Music Hall', 'Dance Studio', 'Sports Arena', 'Swimming Pool',
    'TV Station', 'Law Firm', 'Dentist', 'Vet Clinic', 'Laundromat',
    'Flower Shop', 'Ice Rink', 'Bowling Alley', 'Arcade', 'Yoga Studio',
    'Car Wash', 'Nail Salon', 'Barber Shop', 'Sushi Bar', 'Pizza Place',
    'Donut Shop', 'Toy Store', 'Shoe Store', 'Jeweler', 'Tailor',
    'Travel Agent', 'Insurance Co', 'Daycare', 'Thrift Store', 'Wine Bar',
    'Bike Shop', 'Hardware Store', 'Aquarium', 'Skate Park', 'Food Court',
    'Radio Tower', 'Data Center', 'Warehouse', 'Convention Ctr', 'Observatory',
  ];
  const usedNames = new Set();

  for (let row = 0; row < CITY.gridSize; row++) {
    for (let col = 0; col < CITY.gridSize; col++) {
      const blockX = col * CITY.cellSize - offset + CITY.roadWidth / 2;
      const blockZ = row * CITY.cellSize - offset + CITY.roadWidth / 2;

      // One building name sign per block, on the road-facing side
      let name;
      do {
        name = buildingNames[Math.floor(rand() * buildingNames.length)];
      } while (usedNames.has(name) && usedNames.size < buildingNames.length);
      usedNames.add(name);

      const sign = createTextSign(name, {
        bgColor: '#f0c000', textColor: '#000000',
        width: 3.0, height: 0.8,
      });
      sign.position.set(blockX + CITY.blockSize / 2, 2.0, blockZ - 0.5);
      group.add(sign);

      const pole = createPole(2.0);
      pole.position.set(blockX + CITY.blockSize / 2, 0, blockZ - 0.5);
      group.add(pole);
    }
  }

  // ── Grass area signs (brown/green on grass patches) ──
  const grassSigns = [
    'City Park', 'Green Space', 'Rest Area', 'Picnic Zone',
    'Nature Walk', 'Dog Park', 'Garden', 'Playground',
  ];
  // Place a few signs on the grass outside the city grid
  const grassSignPositions = [
    [-offset - 20, -offset - 20], [-offset - 20, offset + 20],
    [offset + 20, -offset - 20], [offset + 20, offset + 20],
    [0, -offset - 30], [0, offset + 30],
    [-offset - 30, 0], [offset + 30, 0],
  ];
  grassSignPositions.forEach(([gx, gz], i) => {
    const sign = createTextSign(grassSigns[i % grassSigns.length], {
      bgColor: '#f0c000', textColor: '#000000',
      width: 2.5, height: 0.8,
    });
    sign.position.set(gx, 1.5, gz);
    group.add(sign);

    const pole = createPole(1.5);
    pole.position.set(gx, 0, gz);
    group.add(pole);
  });

  scene.add(group);
  return { group, totalSize, offset, getRoadWaypoints };
}

// Create a sign with text using canvas texture
// Returns a Group with two faces so text reads correctly from both sides
function createTextSign(text, opts = {}) {
  const {
    bgColor = '#f0c000',
    textColor = '#000000',
    width = 2,
    height = 1,
  } = opts;

  const canvasW = 512;
  const canvasH = Math.round(512 * (height / width));
  const padding = 30;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');

  // Background with rounded corners
  ctx.fillStyle = bgColor;
  roundRect(ctx, 2, 2, canvasW - 4, canvasH - 4, 16);
  ctx.fill();

  // Border
  ctx.strokeStyle = textColor;
  ctx.lineWidth = 4;
  roundRect(ctx, 6, 6, canvasW - 12, canvasH - 12, 14);
  ctx.stroke();

  // Auto-fit text: shrink font until it fits
  let fontSize = 60;
  let lines;
  const maxTextWidth = canvasW - padding * 2;
  const maxTextHeight = canvasH - padding * 2;

  while (fontSize > 12) {
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    lines = wrapText(ctx, text, maxTextWidth);
    const totalHeight = lines.length * fontSize * 1.3;
    if (totalHeight <= maxTextHeight) break;
    fontSize -= 2;
  }

  // Check if single longest line still overflows and shrink more
  while (fontSize > 12) {
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    lines = wrapText(ctx, text, maxTextWidth);
    const longestLine = lines.reduce((max, l) => Math.max(max, ctx.measureText(l).width), 0);
    if (longestLine <= maxTextWidth) break;
    fontSize -= 2;
  }

  // Draw text centered
  ctx.fillStyle = textColor;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lineH = fontSize * 1.3;
  const totalH = lines.length * lineH;
  const startY = canvasH / 2 - totalH / 2 + lineH / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, canvasW / 2, startY + i * lineH);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const signGroup = new THREE.Group();
  const geo = new THREE.PlaneGeometry(width, height);

  // Front face
  const matFront = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.6,
    metalness: 0.1,
  });
  const front = new THREE.Mesh(geo, matFront);
  front.castShadow = true;
  signGroup.add(front);

  // Back face — rotated 180 so text reads correctly from behind too
  const matBack = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.6,
    metalness: 0.1,
  });
  const back = new THREE.Mesh(geo, matBack);
  back.rotation.y = Math.PI;
  back.castShadow = true;
  signGroup.add(back);

  return signGroup;
}

// Word-wrap text to fit maxWidth
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const test = currentLine ? currentLine + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// Create a sign pole
function createPole(height, color = 0x888888) {
  const geo = new THREE.CylinderGeometry(0.05, 0.05, height, 6);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.6 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = height / 2;
  mesh.castShadow = true;
  return mesh;
}

// Rounded rectangle helper for canvas
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Procedural grass texture
function createGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4a7c59';
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 64;
    const y = Math.random() * 64;
    const brightness = 0.85 + Math.random() * 0.3;
    ctx.fillStyle = `rgba(${Math.floor(74 * brightness)}, ${Math.floor(124 * brightness)}, ${Math.floor(89 * brightness)}, 0.6)`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1);
  }
  return canvas;
}

// Procedural road texture
function createRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#333333';
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * 64;
    const y = Math.random() * 64;
    const v = 40 + Math.random() * 30;
    ctx.fillStyle = `rgba(${v}, ${v}, ${v}, 0.3)`;
    ctx.fillRect(x, y, 1 + Math.random(), 1 + Math.random());
  }
  return canvas;
}

// Generate waypoints along roads for AI traffic
export function getRoadWaypoints() {
  const totalSize = CITY.gridSize * CITY.cellSize;
  const off = totalSize / 2;
  const routes = [];
  const laneOffset = 2.5;

  const r1row0_z = 0 * CITY.cellSize - off + laneOffset;
  const r1rowN_z = CITY.gridSize * CITY.cellSize - off - laneOffset;
  const r1col0_x = 0 * CITY.cellSize - off + laneOffset;
  const r1colN_x = CITY.gridSize * CITY.cellSize - off - laneOffset;

  routes.push([
    { x: r1col0_x, z: r1row0_z },
    { x: r1colN_x, z: r1row0_z },
    { x: r1colN_x, z: r1rowN_z },
    { x: r1col0_x, z: r1rowN_z },
  ]);

  const midRow = Math.floor(CITY.gridSize / 2);
  const midZ_fwd = midRow * CITY.cellSize - off + laneOffset;
  const midZ_rev = midRow * CITY.cellSize - off - laneOffset;
  routes.push([
    { x: r1col0_x, z: midZ_fwd },
    { x: r1colN_x, z: midZ_fwd },
    { x: r1colN_x, z: midZ_rev },
    { x: r1col0_x, z: midZ_rev },
  ]);

  const midCol = Math.floor(CITY.gridSize / 2);
  const midX_fwd = midCol * CITY.cellSize - off + laneOffset;
  const midX_rev = midCol * CITY.cellSize - off - laneOffset;
  routes.push([
    { x: midX_fwd, z: r1row0_z },
    { x: midX_fwd, z: r1rowN_z },
    { x: midX_rev, z: r1rowN_z },
    { x: midX_rev, z: r1row0_z },
  ]);

  const innerRow1_z = 2 * CITY.cellSize - off + laneOffset;
  const innerRow2_z = (CITY.gridSize - 2) * CITY.cellSize - off - laneOffset;
  const innerCol1_x = 2 * CITY.cellSize - off + laneOffset;
  const innerCol2_x = (CITY.gridSize - 2) * CITY.cellSize - off - laneOffset;
  routes.push([
    { x: innerCol1_x, z: innerRow1_z },
    { x: innerCol2_x, z: innerRow1_z },
    { x: innerCol2_x, z: innerRow2_z },
    { x: innerCol1_x, z: innerRow2_z },
  ]);

  return routes;
}
