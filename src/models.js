import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

function load(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}

// Measure a model and return { scene, size, center }
function measure(scene) {
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  return { scene, size, center };
}

export async function loadAllModels(onProgress) {
  const models = {};

  // ── Player car ──
  const playerRaw = await load('/models/cars/sedan-sports.glb');
  models.playerCar = measure(playerRaw);

  // ── Traffic car variants ──
  const trafficFiles = [
    'sedan.glb', 'suv.glb', 'taxi.glb', 'police.glb',
    'truck.glb', 'suv-luxury.glb', 'hatchback-sports.glb',
  ];
  models.trafficCars = [];
  for (const file of trafficFiles) {
    const raw = await load(`/models/cars/${file}`);
    models.trafficCars.push(measure(raw));
  }

  // ── Buildings ──
  const buildingFiles = [
    'building-a.glb', 'building-b.glb', 'building-c.glb', 'building-d.glb',
    'building-e.glb', 'building-f.glb', 'building-g.glb', 'building-h.glb',
    'building-skyscraper-a.glb', 'building-skyscraper-b.glb',
    'building-skyscraper-c.glb', 'building-skyscraper-d.glb', 'building-skyscraper-e.glb',
  ];
  models.buildings = [];
  for (const file of buildingFiles) {
    const raw = await load(`/models/buildings/${file}`);
    models.buildings.push(measure(raw));
  }

  // ── Trees ──
  const treeFiles = [
    'tree_oak.glb', 'tree_detailed.glb', 'tree_default.glb',
    'tree_fat.glb', 'tree_pineRoundA.glb', 'tree_pineRoundB.glb', 'tree_tall.glb',
  ];
  models.trees = [];
  for (const file of treeFiles) {
    const raw = await load(`/models/trees/${file}`);
    models.trees.push(measure(raw));
  }

  return models;
}
