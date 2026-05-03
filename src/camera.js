import * as THREE from 'three';
import { CAMERA } from './config.js';

export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'chase'; // 'chase' or 'cockpit'
    this._idealPosition = new THREE.Vector3();
    this._idealLookAt = new THREE.Vector3();
    this._currentPosition = new THREE.Vector3();
    this._currentLookAt = new THREE.Vector3();
    this._initialized = false;
  }

  toggle() {
    this.mode = this.mode === 'chase' ? 'cockpit' : 'chase';
    // Switch FOV for cockpit (wider peripheral vision)
    const targetFov = this.mode === 'cockpit' ? CAMERA.cockpitFov : CAMERA.fov;
    this.camera.fov = targetFov;
    this.camera.updateProjectionMatrix();
  }

  update(vehicle) {
    const carPos = vehicle.getPosition();
    const carQuat = vehicle.getQuaternion();
    const forward = vehicle.getForwardDirection();

    if (this.mode === 'chase') {
      this._updateChase(carPos, carQuat, forward);
    } else {
      this._updateCockpit(carPos, carQuat, forward);
    }
  }

  _updateChase(carPos, carQuat, forward) {
    const cfg = CAMERA.chase;

    // Desired position: behind and above car
    const back = forward.clone().multiplyScalar(-cfg.distance);
    this._idealPosition.copy(carPos).add(back);
    this._idealPosition.y = carPos.y + cfg.height;

    // Look ahead of car
    this._idealLookAt.copy(carPos).add(forward.clone().multiplyScalar(cfg.lookAheadDistance));
    this._idealLookAt.y = carPos.y + 1;

    if (!this._initialized) {
      this._currentPosition.copy(this._idealPosition);
      this._currentLookAt.copy(this._idealLookAt);
      this._initialized = true;
    }

    // Smooth follow
    this._currentPosition.lerp(this._idealPosition, cfg.smoothFactor);
    this._currentLookAt.lerp(this._idealLookAt, cfg.smoothFactor);

    this.camera.position.copy(this._currentPosition);
    this.camera.lookAt(this._currentLookAt);
  }

  _updateCockpit(carPos, carQuat, forward) {
    const cfg = CAMERA.cockpit;

    // Position inside the cabin — driver's seat (left of center)
    const up = new THREE.Vector3(0, cfg.offsetY, 0);
    const fwd = forward.clone().multiplyScalar(cfg.offsetZ);
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(carQuat);
    right.multiplyScalar(cfg.offsetX);

    this._idealPosition.copy(carPos).add(up).add(fwd).add(right);
    this._idealLookAt.copy(carPos).add(forward.clone().multiplyScalar(20));
    this._idealLookAt.y = carPos.y + 0.4;

    if (!this._initialized) {
      this._currentPosition.copy(this._idealPosition);
      this._currentLookAt.copy(this._idealLookAt);
      this._initialized = true;
    }

    this._currentPosition.lerp(this._idealPosition, cfg.smoothFactor);
    this._currentLookAt.lerp(this._idealLookAt, cfg.smoothFactor);

    this.camera.position.copy(this._currentPosition);
    this.camera.lookAt(this._currentLookAt);
  }
}
