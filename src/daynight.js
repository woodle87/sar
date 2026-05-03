import * as THREE from 'three';
import { DAYNIGHT } from './config.js';

let sunLight, ambientLight, hemiLight;
let timeOfDay = 0.4; // fixed daytime
let timeSpeed = 0;  // paused by default
let renderer;

export function createLighting(scene, _renderer) {
  renderer = _renderer;

  // Sun (directional)
  sunLight = new THREE.DirectionalLight(0xffffff, DAYNIGHT.sunIntensityDay);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 500;
  sunLight.shadow.camera.left = -100;
  sunLight.shadow.camera.right = 100;
  sunLight.shadow.camera.top = 100;
  sunLight.shadow.camera.bottom = -100;
  scene.add(sunLight);

  // Ambient
  ambientLight = new THREE.AmbientLight(0x8899bb, DAYNIGHT.ambientIntensityDay);
  scene.add(ambientLight);

  // Hemisphere (sky/ground)
  hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a7c59, 0.4);
  scene.add(hemiLight);

  // Fog
  scene.fog = new THREE.Fog(0x87ceeb, 50, 400);

  updateLighting();
}

export function toggleTimeSpeed() {
  timeSpeed = timeSpeed === 1 ? 10 : 1;
}

export function updateDayNight(dt) {
  timeOfDay += (dt / DAYNIGHT.cycleDuration) * timeSpeed;
  if (timeOfDay > 1) timeOfDay -= 1;

  updateLighting();
}

function updateLighting() {
  const t = timeOfDay;

  // Sun position (circular orbit)
  const sunAngle = t * Math.PI * 2 - Math.PI / 2; // start at sunrise
  const sunX = Math.cos(sunAngle) * DAYNIGHT.sunOrbitRadius;
  const sunY = Math.sin(sunAngle) * DAYNIGHT.sunOrbitRadius;
  const sunZ = 50;
  sunLight.position.set(sunX, Math.max(sunY, -20), sunZ);

  // Sun intensity based on height
  const sunHeight = Math.sin(sunAngle);
  const sunIntensity = Math.max(0, sunHeight) * DAYNIGHT.sunIntensityDay;
  sunLight.intensity = sunIntensity;

  // Sun color (warm at horizon, white at noon)
  const warmth = 1 - Math.abs(sunHeight);
  sunLight.color.setRGB(1, 1 - warmth * 0.3, 1 - warmth * 0.5);

  // Ambient intensity
  const ambientIntensity = DAYNIGHT.ambientIntensityNight +
    (DAYNIGHT.ambientIntensityDay - DAYNIGHT.ambientIntensityNight) * Math.max(0, sunHeight);
  ambientLight.intensity = ambientIntensity;

  // Sky color from gradient stops
  const skyColor = getSkyColor(t);
  const skyThreeColor = new THREE.Color(skyColor[0], skyColor[1], skyColor[2]);

  // Update fog and background
  if (renderer) {
    renderer.setClearColor(skyThreeColor);
  }
  if (sunLight.parent && sunLight.parent.fog) {
    sunLight.parent.fog.color.copy(skyThreeColor);
  }

  // Hemisphere light
  hemiLight.color.copy(skyThreeColor);
  const groundBrightness = Math.max(0.1, sunHeight * 0.5 + 0.3);
  hemiLight.groundColor.setRGB(0.2 * groundBrightness, 0.3 * groundBrightness, 0.15 * groundBrightness);
  hemiLight.intensity = 0.2 + Math.max(0, sunHeight) * 0.4;

  // Ambient color shift
  ambientLight.color.lerpColors(
    new THREE.Color(0x1a1a3a), // night
    new THREE.Color(0x8899bb), // day
    Math.max(0, sunHeight)
  );
}

function getSkyColor(t) {
  const stops = DAYNIGHT.skyColors;

  // Find surrounding stops
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      const frac = (t - stops[i].t) / (stops[i + 1].t - stops[i].t);
      return [
        stops[i].color[0] + (stops[i + 1].color[0] - stops[i].color[0]) * frac,
        stops[i].color[1] + (stops[i + 1].color[1] - stops[i].color[1]) * frac,
        stops[i].color[2] + (stops[i + 1].color[2] - stops[i].color[2]) * frac,
      ];
    }
  }
  return stops[0].color;
}

export function getTimeOfDay() {
  return timeOfDay;
}
