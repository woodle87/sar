import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { VEHICLE } from './config.js';
import { physicsWorld, groundMaterial } from './physics.js';

export class Vehicle {
  constructor(scene, carModel) {
    this.scene = scene;
    this.currentSteer = 0;
    this.currentGear = 1;
    this.rpm = VEHICLE.idleRPM;
    this.speed = 0;
    this.wheelSpin = 0;
    this.flippedTime = 0;

    this._createChassisMesh(carModel);
    this._createPhysics();
  }

  _createChassisMesh(carModel) {
    this.chassisGroup = new THREE.Group();

    if (carModel) {
      // Use loaded 3D model
      const model = carModel.scene.clone();
      const { size, center } = carModel;

      // Scale model to match our physics dimensions
      // Kenney cars are ~2 wide, ~1 tall, ~4 long — scale to match VEHICLE dimensions
      const scaleX = VEHICLE.chassisWidth / size.x;
      const scaleY = (VEHICLE.chassisHeight + 0.6) / size.y; // taller to include cabin
      const scaleZ = VEHICLE.chassisLength / size.z;
      const scale = Math.min(scaleX, scaleZ); // uniform scale based on length/width
      model.scale.set(scale, scale, scale);

      // Center the model on the group origin
      model.position.set(
        -center.x * scale,
        -center.y * scale + (size.y * scale) / 2 - VEHICLE.chassisHeight / 2,
        -center.z * scale
      );

      // Enable shadows on all meshes
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.chassisGroup.add(model);
    } else {
      // Fallback: box geometry
      const bodyGeo = new THREE.BoxGeometry(
        VEHICLE.chassisWidth, VEHICLE.chassisHeight, VEHICLE.chassisLength
      );
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe63946, metalness: 0.6, roughness: 0.3 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.castShadow = true;
      this.chassisGroup.add(body);
    }

    this.scene.add(this.chassisGroup);
  }

  _createPhysics() {
    const chassisShape = new CANNON.Box(new CANNON.Vec3(
      VEHICLE.chassisWidth / 2,
      VEHICLE.chassisHeight / 2,
      VEHICLE.chassisLength / 2
    ));

    this.chassisBody = new CANNON.Body({
      mass: VEHICLE.chassisMass,
      position: new CANNON.Vec3(VEHICLE.startX, VEHICLE.startY, VEHICLE.startZ),
      material: groundMaterial,
      linearDamping: 0.3,
      angularDamping: 0.99,
    });
    this.chassisBody.addShape(chassisShape);
    physicsWorld.addBody(this.chassisBody);

    // On collision: reduce speed on impact
    this.chassisBody.addEventListener('collide', () => {
      if (this.chassisBody.velocity.y > 1) this.chassisBody.velocity.y = 1;
    });
  }

  applyInput(inputState) {
    const velocity = this.chassisBody.velocity;

    const worldForward = new CANNON.Vec3(0, 0, 1);
    this.chassisBody.quaternion.vmult(worldForward, worldForward);
    const worldRight = new CANNON.Vec3(1, 0, 0);
    this.chassisBody.quaternion.vmult(worldRight, worldRight);

    const forwardSpeed = velocity.dot(worldForward);
    const lateralSpeed = velocity.dot(worldRight);
    this.speed = Math.abs(forwardSpeed) * 3.6;

    // Lateral friction
    const lateralCancel = worldRight.clone();
    lateralCancel.scale(-lateralSpeed * 0.95, lateralCancel);
    velocity.vadd(lateralCancel, velocity);

    // Rolling resistance
    if (!inputState.forward && !inputState.backward) {
      const forwardCancel = worldForward.clone();
      forwardCancel.scale(-forwardSpeed * 0.03, forwardCancel);
      velocity.vadd(forwardCancel, velocity);
    }

    // Steering
    let targetSteer = 0;
    if (inputState.left) targetSteer = VEHICLE.maxSteerAngle;
    if (inputState.right) targetSteer = -VEHICLE.maxSteerAngle;

    if (targetSteer !== 0) {
      this.currentSteer += (targetSteer - this.currentSteer) * 0.25;
    } else {
      this.currentSteer *= 0.8;
      if (Math.abs(this.currentSteer) < 0.001) this.currentSteer = 0;
    }

    if (Math.abs(forwardSpeed) > 0.5) {
      const speedFactor = 1.0 / (1.0 + this.speed * 0.008);
      const steerRate = this.currentSteer * 3.5 * speedFactor;
      const steerSign = forwardSpeed > 0 ? 1 : -1;
      this.chassisBody.angularVelocity.y = steerRate * steerSign;
    } else {
      this.chassisBody.angularVelocity.y *= 0.9;
    }

    // Engine force
    const centerOfMass = new CANNON.Vec3(0, 0, 0);
    this.chassisBody.wakeUp();
    if (inputState.forward) {
      const fwd = worldForward.clone();
      fwd.scale(VEHICLE.maxEngineForce, fwd);
      this.chassisBody.applyForce(fwd, centerOfMass);
    }
    if (inputState.backward) {
      if (forwardSpeed > 1) {
        this.chassisBody.velocity.scale(0.95, this.chassisBody.velocity);
      } else {
        const rev = worldForward.clone();
        rev.scale(-VEHICLE.maxEngineForce * 0.6, rev);
        this.chassisBody.applyForce(rev, centerOfMass);
      }
    }

    // Braking
    if (inputState.brake) {
      this.chassisBody.velocity.scale(0.92, this.chassisBody.velocity);
    }

    // Reset
    if (inputState.reset) {
      this.resetCar();
      return;
    }

    // Kill all roll/pitch — only allow yaw
    this.chassisBody.angularVelocity.x = 0;
    this.chassisBody.angularVelocity.z = 0;
  }

  resetCar() {
    this.chassisBody.position.set(VEHICLE.startX, VEHICLE.startY, VEHICLE.startZ);
    this.chassisBody.quaternion.set(0, 0, 0, 1);
    this.chassisBody.velocity.set(0, 0, 0);
    this.chassisBody.angularVelocity.set(0, 0, 0);
    this.currentSteer = 0;
    this.flippedTime = 0;
    this.speed = 0;
  }

  update() {
    // Force upright — extract yaw only
    const q = this.chassisBody.quaternion;
    const yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.x * q.x));
    this.chassisBody.quaternion.setFromEuler(0, yaw, 0);
    this.chassisBody.angularVelocity.x = 0;
    this.chassisBody.angularVelocity.z = 0;

    if (this.chassisBody.velocity.y > 2) this.chassisBody.velocity.y = 2;
    if (this.chassisBody.velocity.y < -5) this.chassisBody.velocity.y = -5;

    const groundY = VEHICLE.chassisHeight / 2 + VEHICLE.wheelRadius;
    if (this.chassisBody.position.y < groundY) {
      this.chassisBody.position.y = groundY;
      if (this.chassisBody.velocity.y < 0) this.chassisBody.velocity.y = 0;
    }
    if (this.chassisBody.position.y > groundY + 1.0) {
      this.chassisBody.position.y = groundY + 1.0;
      this.chassisBody.velocity.y = 0;
    }

    // Sync mesh
    this.chassisGroup.position.copy(this.chassisBody.position);
    this.chassisGroup.quaternion.copy(this.chassisBody.quaternion);

    // Speed for HUD
    const velocity = this.chassisBody.velocity;
    const worldForward = new CANNON.Vec3(0, 0, 1);
    this.chassisBody.quaternion.vmult(worldForward, worldForward);
    const forwardSpeed = velocity.dot(worldForward);
    this.speed = Math.abs(forwardSpeed) * 3.6;

    this._updateGearRPM();
  }

  _updateGearRPM() {
    const gearCount = VEHICLE.gearRatios.length - 1;
    const idealGear = Math.max(1, Math.min(gearCount, Math.ceil(this.speed / 35) || 1));

    if (idealGear > this.currentGear && this.rpm > VEHICLE.shiftUpRPM) {
      this.currentGear = Math.min(gearCount, this.currentGear + 1);
    } else if (idealGear < this.currentGear && this.rpm < VEHICLE.shiftDownRPM && this.currentGear > 1) {
      this.currentGear = Math.max(1, this.currentGear - 1);
    }

    const gearMin = (this.currentGear - 1) * 35;
    const gearMax = this.currentGear * 35;
    const gearFraction = Math.min(1, Math.max(0, (this.speed - gearMin) / (gearMax - gearMin)));
    this.rpm = VEHICLE.idleRPM + gearFraction * (VEHICLE.maxRPM - VEHICLE.idleRPM);
  }

  getPosition() { return this.chassisGroup.position; }
  getQuaternion() { return this.chassisGroup.quaternion; }
  getForwardDirection() {
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(this.chassisGroup.quaternion);
    return forward;
  }
}
