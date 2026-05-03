import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { TRAFFIC } from './config.js';
import { physicsWorld, groundMaterial } from './physics.js';
import { getRoadWaypoints } from './city.js';

class AIVehicle {
  constructor(scene, route, routeIndex, carModel, speed) {
    this.route = route;
    this.currentWaypoint = routeIndex % route.length;
    this.speed = speed;

    const group = new THREE.Group();

    if (carModel) {
      const model = carModel.scene.clone();
      // Scale to AI car size (~1.6 wide, ~3.5 long)
      const targetWidth = 1.6;
      const targetLength = 3.5;
      const scaleX = targetWidth / carModel.size.x;
      const scaleZ = targetLength / carModel.size.z;
      const scale = Math.min(scaleX, scaleZ);
      model.scale.set(scale, scale, scale);
      model.position.set(
        -carModel.center.x * scale,
        -carModel.center.y * scale + (carModel.size.y * scale) / 2,
        -carModel.center.z * scale
      );
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      group.add(model);
    } else {
      // Fallback box car
      const bodyGeo = new THREE.BoxGeometry(1.6, 0.5, 3.5);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: TRAFFIC.carColors[routeIndex % TRAFFIC.carColors.length],
        metalness: 0.5, roughness: 0.4,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.castShadow = true;
      group.add(body);
    }

    const wp = route[this.currentWaypoint];
    group.position.set(wp.x, 0.4, wp.z);
    scene.add(group);
    this.mesh = group;

    this.body = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.KINEMATIC,
      shape: new CANNON.Box(new CANNON.Vec3(0.8, 0.4, 1.75)),
      position: new CANNON.Vec3(wp.x, 0.4, wp.z),
      material: groundMaterial,
    });
    physicsWorld.addBody(this.body);
  }

  update(dt) {
    const target = this.route[this.currentWaypoint];
    const pos = this.mesh.position;

    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < TRAFFIC.waypointTolerance) {
      this.currentWaypoint = (this.currentWaypoint + 1) % this.route.length;
      return;
    }

    const nx = dx / dist;
    const nz = dz / dist;
    const step = this.speed * dt;

    pos.x += nx * step;
    pos.z += nz * step;

    const angle = Math.atan2(nx, nz);
    this.mesh.rotation.y = angle;

    this.body.position.set(pos.x, pos.y, pos.z);
    this.body.quaternion.setFromEuler(0, angle, 0);
  }

  getPosition() {
    return this.mesh.position;
  }
}

let aiVehicles = [];

export function createTraffic(scene, models) {
  const routes = getRoadWaypoints();
  const trafficModels = models?.trafficCars || [];

  for (let i = 0; i < TRAFFIC.count; i++) {
    const route = routes[i % routes.length];
    const speed = TRAFFIC.speed.min + Math.random() * (TRAFFIC.speed.max - TRAFFIC.speed.min);
    const startIndex = Math.floor(Math.random() * route.length);

    // Pick a different model for each AI car
    const carModel = trafficModels.length > 0
      ? trafficModels[i % trafficModels.length]
      : null;

    const ai = new AIVehicle(scene, route, startIndex, carModel, speed);
    aiVehicles.push(ai);
  }
}

export function updateTraffic(dt) {
  for (const ai of aiVehicles) {
    ai.update(dt);
  }
}

export function getAIPositions() {
  return aiVehicles.map(ai => ai.getPosition());
}
