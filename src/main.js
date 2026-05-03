import * as THREE from 'three';
import { CAMERA, VEHICLE } from './config.js';
import { input } from './input.js';
import { updatePhysics } from './physics.js';
import { Vehicle } from './vehicle.js';
import { createCity } from './city.js';
import { CameraController } from './camera.js';
import { createTraffic, updateTraffic, getAIPositions } from './traffic.js';
import { updateHUD } from './hud.js';
import { createLighting, updateDayNight, toggleTimeSpeed } from './daynight.js';
import { loadAllModels } from './models.js';
import { CockpitInterior } from './cockpitInterior.js';

// ── Login ──
const PASSWORD = 'THB';
const loginScreen = document.getElementById('login-screen');
const loginInput = document.getElementById('login-input');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

function attemptLogin() {
  if (loginInput.value.toUpperCase() === PASSWORD) {
    loginScreen.style.display = 'none';
    document.getElementById('loading-screen').style.display = 'flex';
    startGame();
  } else {
    loginError.textContent = 'Incorrect password';
    loginInput.value = '';
    loginInput.focus();
  }
}

loginBtn.addEventListener('click', attemptLogin);
loginInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') attemptLogin();
});
loginInput.focus();

// ── Game init (runs after login) ──
async function startGame() {
  // ── Renderer ──
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById('game-container').appendChild(renderer.domElement);

  // ── Scene ──
  const scene = new THREE.Scene();

  // ── Camera ──
  const camera = new THREE.PerspectiveCamera(
    CAMERA.fov,
    window.innerWidth / window.innerHeight,
    CAMERA.near,
    CAMERA.far
  );

  // ── Load 3D models ──
  let models = null;
  try {
    models = await loadAllModels();
  } catch (err) {
    console.warn('Failed to load 3D models, using fallback geometry:', err);
  }

  // Hide loading, show game
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'block';
  document.getElementById('hud').style.display = 'block';

  // ── Initialize world ──
  createLighting(scene, renderer);
  const city = createCity(scene, models);
  const vehicle = new Vehicle(scene, models?.playerCar);
  const cameraController = new CameraController(camera);
  const cockpitInterior = new CockpitInterior(vehicle.chassisGroup);
  createTraffic(scene, models);

  // ── Clock ──
  const clock = new THREE.Clock();

  // ── Game loop ──
  function animate() {
    requestAnimationFrame(animate);

    let dt = clock.getDelta();
    if (dt > 1 / 30) dt = 1 / 30;

    if (input.cameraToggle) {
      cameraController.toggle();
    }
    if (input.timeToggle) {
      toggleTimeSpeed();
    }

    vehicle.applyInput(input);
    updatePhysics(dt);
    vehicle.update();
    updateTraffic(dt);
    cameraController.update(vehicle);
    cockpitInterior.update(vehicle, cameraController.mode);
    updateDayNight(dt);

    updateHUD(
      vehicle.speed,
      vehicle.rpm,
      vehicle.currentGear,
      vehicle.getPosition(),
      vehicle.getForwardDirection(),
      getAIPositions()
    );

    renderer.render(scene, camera);
  }

  animate();

  // ── Resize handler ──
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
