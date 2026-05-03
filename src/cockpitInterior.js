import * as THREE from 'three';

export class CockpitInterior {
  constructor(chassisGroup) {
    this.chassisGroup = chassisGroup;
    this.cockpitGroup = new THREE.Group();

    this._createInteriorLight();
    this._createDashboard();
    this._createInstrumentCluster();
    this._createWindscreenFrame();
    this._createSteeringWheel();
    this._createCenterConsole();
    this._createGearLever();
    this._createSidePanels();

    this.cockpitGroup.visible = false;
    chassisGroup.add(this.cockpitGroup);
  }

  _mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.15,
      roughness: opts.roughness ?? 0.85,
      metalness: opts.metalness ?? 0.1,
    });
  }

  _createInteriorLight() {
    const light = new THREE.PointLight(0xfff5e0, 0.8, 3);
    light.position.set(0, 0.85, 0.5);
    this.cockpitGroup.add(light);
  }

  // ── Dashboard ──
  _createDashboard() {
    const mat = this._mat(0x3a3a3a);

    // Main dashboard body
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.5), mat);
    dash.position.set(0, 0.33, 1.0);
    this.cockpitGroup.add(dash);

    // Dashboard top surface (angled slightly)
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.55), mat);
    top.position.set(0, 0.43, 0.97);
    top.rotation.x = -0.1;
    this.cockpitGroup.add(top);

    // Instrument binnacle hood — raised section behind steering wheel
    const binnacle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.18), mat);
    binnacle.position.set(-0.30, 0.47, 0.84);
    this.cockpitGroup.add(binnacle);

    // Binnacle visor (top lip overhanging instruments)
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.02, 0.10), mat);
    visor.position.set(-0.30, 0.52, 0.80);
    visor.rotation.x = -0.3;
    this.cockpitGroup.add(visor);

    // Center stack (radio / AC area)
    const centerStack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.05), mat);
    centerStack.position.set(0.10, 0.40, 0.78);
    this.cockpitGroup.add(centerStack);

    // Glove box area (right side)
    const glovebox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.04), mat);
    glovebox.position.set(0.50, 0.36, 0.78);
    this.cockpitGroup.add(glovebox);
  }

  // ── Instrument cluster (static gauge texture behind steering wheel) ──
  _createInstrumentCluster() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');

    // Dark panel background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 512, 192);

    // Speedometer (left gauge)
    this._drawGauge(ctx, 140, 96, 65, 'km/h', [0, 40, 80, 120, 160, 200, 240]);
    // Tachometer (right gauge)
    this._drawGauge(ctx, 372, 96, 65, 'RPM x1000', [0, 1, 2, 3, 4, 5, 6, 7]);

    // Small fuel gauge indicator
    ctx.fillStyle = '#4a4';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FUEL ████', 256, 170);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      emissive: 0xffffff,
      emissiveIntensity: 0.25,
      roughness: 0.4,
    });

    // Panel face — positioned inside the binnacle, angled toward driver
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.16), mat);
    panel.position.set(-0.30, 0.48, 0.76);
    panel.rotation.x = -0.6;
    this.cockpitGroup.add(panel);
  }

  _drawGauge(ctx, cx, cy, r, label, marks) {
    const arcStart = Math.PI * 0.75;
    const arcEnd = Math.PI * 2.25;

    // Outer ring
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, arcStart, arcEnd);
    ctx.stroke();

    // Tick marks and numbers
    ctx.fillStyle = '#bbb';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    marks.forEach((val, i) => {
      const angle = arcStart + (i / (marks.length - 1)) * (arcEnd - arcStart);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Tick line
      ctx.strokeStyle = i >= marks.length - 2 ? '#e44' : '#888';
      ctx.lineWidth = i % 2 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + cos * (r - 8), cy + sin * (r - 8));
      ctx.lineTo(cx + cos * r, cy + sin * r);
      ctx.stroke();

      // Number
      if (i % 2 === 0) {
        ctx.fillStyle = i >= marks.length - 2 ? '#e44' : '#bbb';
        ctx.fillText(String(val), cx + cos * (r - 18), cy + sin * (r - 18));
      }
    });

    // Center dot
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    ctx.fillText(label, cx, cy + 28);
  }

  // ── Windscreen frame ──
  _createWindscreenFrame() {
    const mat = this._mat(0x4a4a4a);

    // Left A-pillar
    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), mat);
    leftPillar.position.set(-0.78, 0.75, 1.2);
    leftPillar.rotation.x = -0.15;
    this.cockpitGroup.add(leftPillar);

    // Right A-pillar
    const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), mat);
    rightPillar.position.set(0.78, 0.75, 1.2);
    rightPillar.rotation.x = -0.15;
    this.cockpitGroup.add(rightPillar);

    // Top crossbar (roof edge)
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.08, 0.08), mat);
    topBar.position.set(0, 1.1, 1.2);
    this.cockpitGroup.add(topBar);

    // Bottom windscreen edge
    const bottomBar = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.05, 0.10), mat);
    bottomBar.position.set(0, 0.46, 1.25);
    this.cockpitGroup.add(bottomBar);
  }

  // ── Steering wheel ──
  _createSteeringWheel() {
    const wheelMat = this._mat(0x2a2a2a, { roughness: 0.6, metalness: 0.3 });

    // Position: in front of driver, below eye level
    this.steeringWheelGroup = new THREE.Group();
    this.steeringWheelGroup.position.set(-0.30, 0.60, 0.65);

    // Tilt group — rotation.x = -2.4 makes the wheel face the driver nearly head-on
    // Face normal after tilt: (0, 0.68, -0.74) → points up-and-back at driver's eyes
    const tiltGroup = new THREE.Group();
    tiltGroup.rotation.x = -2.4;

    // Spin group — animated rotation.z for steering
    this.steeringRotationGroup = new THREE.Group();

    // Torus ring (32cm diameter wheel)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.013, 12, 32), wheelMat);
    this.steeringRotationGroup.add(ring);

    // Three spokes at 120° (sporty design)
    for (let i = 0; i < 3; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.014, 0.014), wheelMat);
      spoke.rotation.z = (i * Math.PI * 2) / 3;
      this.steeringRotationGroup.add(spoke);
    }

    // Center hub with flat face
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 16), wheelMat);
    hub.rotation.x = Math.PI / 2;
    this.steeringRotationGroup.add(hub);

    tiltGroup.add(this.steeringRotationGroup);
    this.steeringWheelGroup.add(tiltGroup);
    this.cockpitGroup.add(this.steeringWheelGroup);
  }

  // ── Center console (between seats) ──
  _createCenterConsole() {
    const mat = this._mat(0x3a3a3a);

    // Main console body
    const console = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.10, 0.6), mat);
    console.position.set(-0.02, 0.33, 0.4);
    this.cockpitGroup.add(console);

    // Console top surface
    const consoleTop = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.55), mat);
    consoleTop.position.set(-0.02, 0.39, 0.42);
    this.cockpitGroup.add(consoleTop);

    // Armrest (behind gear lever)
    const armrest = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.04, 0.22), mat);
    armrest.position.set(-0.02, 0.42, 0.18);
    this.cockpitGroup.add(armrest);

    // Gear gate plate
    const gateMat = this._mat(0x555555, { roughness: 0.4, metalness: 0.5 });
    const gate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.005, 0.10), gateMat);
    gate.position.set(-0.02, 0.405, 0.50);
    this.cockpitGroup.add(gate);
  }

  // ── Gear lever ──
  _createGearLever() {
    const stickMat = this._mat(0x3a3a3a);
    const knobMat = this._mat(0x555555, { roughness: 0.4, metalness: 0.5 });

    this.gearLeverGroup = new THREE.Group();
    this.gearLeverGroup.position.set(-0.02, 0.40, 0.50);

    // Stick
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.14, 8), stickMat);
    this.gearLeverGroup.add(stick);

    // Knob (larger, more visible)
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), knobMat);
    knob.position.y = 0.07;
    this.gearLeverGroup.add(knob);

    this.cockpitGroup.add(this.gearLeverGroup);
  }

  // ── Side panels (doors) ──
  _createSidePanels() {
    const mat = this._mat(0x4a4a4a);

    // Left door panel
    const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 1.0), mat);
    leftPanel.position.set(-0.88, 0.55, 0.3);
    this.cockpitGroup.add(leftPanel);

    // Left door armrest
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.3), mat);
    leftArm.position.set(-0.84, 0.50, 0.2);
    this.cockpitGroup.add(leftArm);

    // Right door panel
    const rightPanel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 1.0), mat);
    rightPanel.position.set(0.88, 0.55, 0.3);
    this.cockpitGroup.add(rightPanel);
  }

  // ── Per-frame update ──
  update(vehicle, cameraMode) {
    const isCockpit = cameraMode === 'cockpit';
    this.cockpitGroup.visible = isCockpit;

    // Hide the 3D car model in cockpit mode
    for (const child of this.chassisGroup.children) {
      if (child !== this.cockpitGroup) {
        child.visible = !isCockpit;
      }
    }

    if (!isCockpit) return;

    // Steering wheel spin (clockwise / anticlockwise)
    this.steeringRotationGroup.rotation.z = vehicle.currentSteer * 3.0;

    // Gear lever H-pattern
    const gearTiltX = { 1: -0.25, 2: 0.25, 3: -0.15, 4: 0.15, 5: -0.25 };
    const gearTiltZ = { 1: -0.15, 2: -0.15, 3: 0, 4: 0, 5: 0.15 };
    const gear = vehicle.currentGear;
    this.gearLeverGroup.rotation.x = gearTiltX[gear] || 0;
    this.gearLeverGroup.rotation.z = gearTiltZ[gear] || 0;
  }
}
