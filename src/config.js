// ── Vehicle ──
export const VEHICLE = {
  chassisMass: 150,
  chassisWidth: 1.8,
  chassisHeight: 0.6,
  chassisLength: 4.0,
  cabinWidth: 1.6,
  cabinHeight: 0.55,
  cabinLength: 2.0,
  cabinOffsetY: 0.55,
  cabinOffsetZ: -0.3,

  maxEngineForce: 1500,
  maxBrakeForce: 100,
  maxSteerAngle: Math.PI / 4,
  steerSpeed: 0.05,
  steerReturnSpeed: 0.08,

  // Suspension
  suspensionStiffness: 5000,
  suspensionDamping: 300,
  suspensionCompression: 200,
  suspensionRestLength: 0.4,
  rollInfluence: 0.05,
  frictionSlip: 2.5,

  // Wheel geometry
  wheelRadius: 0.35,
  wheelWidth: 0.25,
  wheelFrontZ: 1.3,
  wheelRearZ: -1.2,
  wheelSideX: 0.85,
  wheelConnectionHeight: -0.3,

  // Gears
  gearRatios: [0, 3.5, 2.5, 1.8, 1.3, 1.0],
  reverseRatio: -3.5,
  maxRPM: 7000,
  idleRPM: 800,
  shiftUpRPM: 6200,
  shiftDownRPM: 2000,

  // Starting position (on road intersection at grid center)
  startX: 5,
  startY: 2,
  startZ: 5,
};

// ── City ──
export const CITY = {
  gridSize: 8,
  blockSize: 40,
  roadWidth: 12,
  cellSize: 52,        // blockSize + roadWidth
  buildingsPerBlock: { min: 2, max: 5 },
  buildingHeight: { min: 8, max: 60 },
  buildingMinSize: 6,
  buildingMaxSize: 16,
  buildingPadding: 2,
  treeSpacing: 15,
  treeTrunkRadius: 0.3,
  treeTrunkHeight: 2.5,
  treeCanopyRadius: 1.8,
  treeCanopyHeight: 3.0,
  sidewalkWidth: 2,
  sidewalkHeight: 0.15,
};

// ── Camera ──
export const CAMERA = {
  chase: {
    distance: 8,
    height: 3.5,
    lookAheadDistance: 5,
    smoothFactor: 0.08,
  },
  cockpit: {
    offsetX: -0.30,
    offsetY: 0.75,
    offsetZ: 0.5,
    smoothFactor: 0.7,
  },
  fov: 65,
  cockpitFov: 85,
  near: 0.1,
  far: 1000,
};

// ── Traffic ──
export const TRAFFIC = {
  count: 8,
  speed: { min: 8, max: 15 },
  waypointTolerance: 3,
  carColors: [0x3b82f6, 0xef4444, 0x22c55e, 0xf59e0b, 0x8b5cf6, 0xec4899, 0x06b6d4, 0xf97316],
};

// ── Day/Night ──
export const DAYNIGHT = {
  cycleDuration: 120,   // seconds for full cycle
  sunOrbitRadius: 200,
  sunIntensityDay: 1.5,
  sunIntensityNight: 0.0,
  ambientIntensityDay: 0.6,
  ambientIntensityNight: 0.15,
  // Color stops: [timeNormalized, skyR, skyG, skyB]
  skyColors: [
    { t: 0.0,  color: [0.05, 0.05, 0.15] },  // midnight
    { t: 0.2,  color: [0.05, 0.05, 0.15] },  // late night
    { t: 0.25, color: [0.9, 0.5, 0.3] },     // sunrise
    { t: 0.3,  color: [0.53, 0.81, 0.98] },  // morning
    { t: 0.5,  color: [0.53, 0.81, 0.98] },  // noon
    { t: 0.7,  color: [0.53, 0.81, 0.98] },  // afternoon
    { t: 0.75, color: [0.95, 0.55, 0.25] },  // sunset
    { t: 0.8,  color: [0.15, 0.1, 0.25] },   // dusk
    { t: 1.0,  color: [0.05, 0.05, 0.15] },  // midnight
  ],
};

// ── Physics ──
export const PHYSICS = {
  gravity: -9.82,
  fixedTimeStep: 1 / 60,
  maxSubSteps: 3,
};
