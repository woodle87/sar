import * as CANNON from 'cannon-es';
import { PHYSICS } from './config.js';

export const physicsWorld = new CANNON.World();
physicsWorld.gravity.set(0, PHYSICS.gravity, 0);
physicsWorld.broadphase = new CANNON.SAPBroadphase(physicsWorld);
physicsWorld.defaultContactMaterial.friction = 0.3;

// Ground contact material for roads
export const groundMaterial = new CANNON.Material('ground');
export const wheelMaterial = new CANNON.Material('wheel');

const wheelGroundContact = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
  friction: 0.5,
  restitution: 0.1,
  contactEquationStiffness: 1e8,
  contactEquationRelaxation: 3,
});
physicsWorld.addContactMaterial(wheelGroundContact);

// Ground plane
const groundBody = new CANNON.Body({
  type: CANNON.Body.STATIC,
  shape: new CANNON.Plane(),
  material: groundMaterial,
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
physicsWorld.addBody(groundBody);

export function updatePhysics(dt) {
  physicsWorld.step(PHYSICS.fixedTimeStep, dt, PHYSICS.maxSubSteps);
}
