import * as THREE from 'three';
import './style.css';

const $ = (selector) => document.querySelector(selector);
const mount = $('#game');
const statusLabel = $('#world-status');
const coordsLabel = $('#coordinates');
const movementLabel = $('#movement-label');
const intro = $('#intro');
const startButton = $('#start-button');
const hud = $('#hud');
const crosshair = $('#crosshair');
const controlsHint = $('#controls-hint');
const mobileControls = $('#mobile-controls');
const errorMessage = $('#error-message');
const pauseMenu = $('#pause-menu');
const resumeButton = $('#resume-button');

const isTouchDevice = matchMedia('(pointer: coarse)').matches;
const keys = new Set();
const floorMeshes = [];
const wallColliders = [];
const torches = [];
const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);
const up = new THREE.Vector3(0, 1, 0);
let scene, camera, renderer, clock, player, castle;
let started = false;
let paused = false;
let grounded = true;
let verticalVelocity = 0;
let cameraYaw = 0;
let cameraPitch = 0.02;
let walkTime = 0;
let draggingCamera = false;
let lastPointer = { x: 0, y: 0 };
let joystickPointer = null;
let joystickInput = { x: 0, y: 0 };
let runTouch = false;
let jumpRequested = false;
const PLAYER_RADIUS = 0.34;
const PLAYER_HEIGHT = 1.72;
const CASTLE_FLOOR = 0;

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#111722');
  scene.fog = new THREE.Fog('#111722', 58, 145);

  camera = new THREE.PerspectiveCamera(76, innerWidth / innerHeight, 0.1, 180);
  camera.position.set(0, 4, 27);

  renderer = new THREE.WebGLRenderer({ antialias: !isTouchDevice, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isTouchDevice ? 1.25 : 1.7));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = !isTouchDevice;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  mount.replaceChildren(renderer.domElement);

  clock = new THREE.Clock();
  addLighting();
  createCastle();
  createPlayer();
  bindControls();
  statusLabel.textContent = 'Castelo pronto';
  $('#intro h1').innerHTML = 'O castelo.<br><em>Além do silêncio.</em>';
  $('#intro p').textContent = 'Explore um castelo antigo, seus salões de pedra, muralhas e torres. Todo o mundo jogável é o próprio castelo.';
  $('.eyebrow').innerHTML = '<span></span> EXPLORAÇÃO 3D · CASTELO';
  $('.intro-note').innerHTML = 'UM CASTELO ISOLADO <i></i> EXPLORAÇÃO EM PRIMEIRA PESSOA';
  $('.bottom-bar span:last-child').textContent = 'SOMENTE O CASTELO';
  worldReady = true;
  animate();
}

let worldReady = false;

function addLighting() {
  scene.add(new THREE.HemisphereLight('#9aaec8', '#302a29', 1.35));
  const moon = new THREE.DirectionalLight('#b8cce9', 2.15);
  moon.position.set(-28, 48, -20);
  moon.castShadow = !isTouchDevice;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -48;
  moon.shadow.camera.right = 48;
  moon.shadow.camera.top = 48;
  moon.shadow.camera.bottom = -48;
  moon.shadow.bias = -0.0002;
  scene.add(moon);
  scene.add(moon.target);
}

function material(color, roughness = 0.92, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, ...extra });
}

function createCastle() {
  castle = new THREE.Group();
  const stone = material('#686b70');
  const cutStone = material('#85868a');
  const shadowStone = material('#41454d');
  const floorStone = material('#555960', 0.98);
  const trimStone = material('#99938a');
  const iron = material('#292d35', 0.7, { metalness: 0.35 });
  const emissive = new THREE.MeshStandardMaterial({ color: '#ffb65c', emissive: '#ff781c', emissiveIntensity: 2.2, roughness: 0.6 });

  const box = (w, h, d, x, y, z, mat = stone, options = {}) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = !isTouchDevice;
    mesh.receiveShadow = !isTouchDevice;
    castle.add(mesh);
    if (options.floor) floorMeshes.push(mesh);
    if (options.wall) wallColliders.push({ x, z, w, d, bottom: y - h / 2, top: y + h / 2 });
    return mesh;
  };
  const floor = (w, d, x, topY, z, mat = floorStone) => box(w, 0.48, d, x, topY - 0.24, z, mat, { floor: true });
  const wallX = (x, z, length, y, h = 6.4, thick = 0.9, mat = stone) => box(thick, h, length, x, y, z, mat, { wall: true });
  const wallZ = (x, z, length, y, h = 6.4, thick = 0.9, mat = stone) => box(length, h, thick, x, y, z, mat, { wall: true });

  // One sealed castle footprint; there is no procedural terrain or outside world.
  floor(62, 62, 0, CASTLE_FLOOR, 0, floorStone);
  const wallY = 5.6;
  wallZ(0, -31, 62, wallY, 11.2, 1.9);
  wallX(-31, 0, 62, wallY, 11.2, 1.9);
  wallX(31, 0, 62, wallY, 11.2, 1.9);
  // The outer wall is fully closed; the entrance is sealed with a heavy gate.
  wallZ(0, 31, 62, wallY, 11.2, 1.9);
  box(8.8, 7.4, 0.32, 0, 3.8, 29.92, iron);
  for (let i = 0; i < 13; i++) box(0.12, 7.2, 0.12, -4.1 + i * 0.68, 3.8, 29.72, trimStone);
  box(9.2, 0.3, 0.35, 0, 7.6, 29.72, trimStone);
  box(63, 0.8, 2.2, 0, 11.2, -31, shadowStone);
  box(2.2, 0.8, 63, -31, 11.2, 0, shadowStone);
  box(2.2, 0.8, 63, 31, 11.2, 0, shadowStone);
  // Continuous roof closes the keep against the sky and the outside world.
  box(62.5, 1.1, 62.5, 0, 18.05, 0, shadowStone);
  box(64, 0.45, 64, 0, 18.75, 0, cutStone);

  // Four thick watchtowers, ringed battlements and narrow arrow slits.
  for (const [tx, tz] of [[-31, -31], [31, -31], [-31, 31], [31, 31]]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(4.05, 4.45, 15.2, 14), cutStone);
    tower.position.set(tx, 7.6, tz);
    tower.castShadow = !isTouchDevice;
    tower.receiveShadow = !isTouchDevice;
    castle.add(tower);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(4.25, 4.05, 0.7, 14), shadowStone);
    crown.position.set(tx, 15.25, tz);
    castle.add(crown);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      const merlon = box(0.95, 1.25, 0.9, tx + Math.cos(a) * 3.85, 16.1, tz + Math.sin(a) * 3.85, cutStone);
      merlon.rotation.y = -a;
    }
    const slit = material('#252a32', 1);
    box(0.22, 2.5, 0.12, tx < 0 ? tx + 3.9 : tx - 3.9, 8.2, tz, slit);
  }

  // Exterior masonry courses and projecting stone cornices.
  for (const y of [2.1, 4.35, 6.6, 8.85]) {
    box(62, 0.15, 1.95, 0, y, -31, shadowStone);
    box(1.95, 0.15, 62, -31, y, 0, shadowStone);
    box(1.95, 0.15, 62, 31, y, 0, shadowStone);
  }
  box(12, 1.25, 2.5, 0, 11.1, 31, trimStone);
  box(1.4, 11.8, 2.1, -5.2, 5.9, 31, shadowStone);
  box(1.4, 11.8, 2.1, 5.2, 5.9, 31, shadowStone);
  // Decorative ironwork on the sealed main gate.
  for (let i = 0; i < 9; i++) box(0.16, 5.8, 0.18, -3.6 + i * 0.9, 3.7, 29.68, iron);
  box(9.0, 0.25, 0.22, 0, 6.8, 29.68, iron);

  // Ground-floor rooms and corridors; each wall includes a walk-through gap.
  wallX(-10, 0, 43, 3.2);
  wallX(10, 0, 43, 3.2);
  // Leave a broad central opening for the main staircase.
  wallZ(-7, -10, 6, 3.2);
  wallZ(7, -10, 6, 3.2);
  wallZ(-20, 10, 22, 3.2);
  wallZ(20, 10, 22, 3.2);
  wallZ(-10, -20, 15, 3.2);
  wallZ(10, -20, 15, 3.2);
  wallZ(-10, 20, 15, 3.2);
  wallZ(10, 20, 15, 3.2);

  // Repeating pillars and arch-like lintels give the hall scale.
  for (const x of [-25, -16, 16, 25]) {
    for (const z of [-24, -12, 0, 12, 24]) {
      box(0.9, 5.8, 0.9, x, 2.9, z, cutStone, { wall: true });
      box(1.5, 0.35, 1.5, x, 5.85, z, trimStone);
      box(1.25, 0.28, 1.25, x, 0.2, z, shadowStone);
    }
  }

  // Upper galleries are actual walkable slabs, not guessed collision heights.
  const secondY = 6.4;
  floor(53, 15, 0, secondY, -22);
  floor(15, 29, -22, secondY, 0);
  floor(15, 29, 22, secondY, 0);
  floor(53, 15, 0, secondY, 22);
  const thirdY = 12.8;
  floor(19, 19, -20, thirdY, -20);
  floor(19, 19, 20, thirdY, -20);
  floor(19, 19, -20, thirdY, 20);
  floor(19, 19, 20, thirdY, 20);

  // Upper partitions and low parapets, with wall collisions tied to the meshes.
  for (const levelY of [secondY + 3.15, thirdY + 3.15]) {
    wallX(-22, 0, 28, levelY, 6.1, 0.7);
    wallX(22, 0, 28, levelY, 6.1, 0.7);
    wallZ(0, -22, 18, levelY, 6.1, 0.7);
    wallZ(0, 22, 18, levelY, 6.1, 0.7);
  }

  // Staircases connect the ground hall to the galleries and the galleries to the towers.
  // Each flight has visible stone treads plus a matching low-profile collision ramp,
  // so movement remains continuous rather than snagging on individual risers.
  const stairFlight = (x, zStart, zEnd, yStart, yEnd, width, steps) => {
    const length = Math.abs(zEnd - zStart);
    const centerZ = (zStart + zEnd) / 2;
    const rise = yEnd - yStart;
    const rampMesh = box(width - 0.18, 0.18, length + 0.25, x, (yStart + yEnd) / 2 - 0.02, centerZ, floorStone, { floor: true });
    rampMesh.rotation.x = (zEnd < zStart ? 1 : -1) * Math.atan2(rise, length);
    // The ramp's top surface is the continuous walkable collision surface.
    const treadDepth = length / steps;
    for (let i = 0; i < steps; i++) {
      const progress = (i + 1) / steps;
      const treadY = yStart + rise * progress;
      const treadZ = zStart + (zEnd - zStart) * progress;
      box(width, 0.22, treadDepth + 0.08, x, treadY - 0.11, treadZ, cutStone, { floor: true });
      box(width + 0.12, 0.14, 0.16, x, treadY - 0.07, treadZ - Math.sign(zEnd - zStart) * treadDepth * 0.43, shadowStone);
    }
    box(width + 0.35, 0.28, 0.35, x, yStart - 0.14, zStart, trimStone);
    box(width + 0.35, 0.28, 0.35, x, yEnd - 0.14, zEnd, trimStone);
  };
  stairFlight(0, 9, -14.5, 0.08, secondY + 0.08, 5.2, 20);
  stairFlight(-20, -10, -19, secondY + 0.08, thirdY + 0.08, 4.8, 16);
  stairFlight(20, 10, 19, secondY + 0.08, thirdY + 0.08, 4.8, 16);

  // Stone windows, sconces and warm firelight are attached to the castle.
  for (const z of [-24, -15, -6, 6, 15, 24]) {
    for (const x of [-30.0, 30.0]) {
      box(0.16, 1.75, 0.75, x, 7.1, z, iron);
      box(0.2, 0.16, 0.82, x, 8.05, z, trimStone);
      box(0.2, 0.16, 0.82, x, 6.15, z, trimStone);
    }
  }
  for (const [x, z, ry] of [[-9, 29.7, 0], [9, 29.7, 0], [-29.7, 0, Math.PI / 2], [29.7, 0, -Math.PI / 2], [0, -29.7, Math.PI]]) {
    const holder = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 6), iron);
    holder.position.set(x, 3.6, z);
    holder.rotation.z = Math.PI;
    castle.add(holder);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), emissive);
    flame.position.set(x, 4.15, z);
    castle.add(flame);
    const light = new THREE.PointLight('#ff9b48', 2.2, 12, 2);
    light.position.set(x, 4.25, z);
    castle.add(light);
    torches.push({ flame, light, phase: Math.random() * 6.28 });
  }

  // Decorative floor seams and central hall medallion.
  for (let i = -28; i <= 28; i += 4) {
    box(0.045, 0.025, 60, i, 0.015, 0, shadowStone);
    box(60, 0.025, 0.045, 0, 0.016, i, shadowStone);
  }
  const medallion = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.45, 48), trimStone);
  medallion.rotation.x = -Math.PI / 2;
  medallion.position.set(0, 0.04, 0);
  castle.add(medallion);
  for (let i = 0; i < 8; i++) {
    const spoke = box(0.12, 0.04, 3.1, 0, 0.05, 0, trimStone);
    spoke.rotation.y = i * Math.PI / 4;
  }

  scene.add(castle);
}

function createPlayer() {
  const group = new THREE.Group();
  const parts = new THREE.Group();
  group.add(parts);
  const coat = material('#34464b');
  const leather = material('#222a30');
  const skin = material('#c6a58c');
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.31, 0.62, 4, 8), coat);
  torso.position.y = 1.22;
  parts.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10), skin);
  head.position.y = 1.96;
  parts.add(head);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), leather);
  hood.position.set(0, 2.02, -0.035);
  parts.add(hood);
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.16, 0.72, 0);
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.48, 3, 7), leather);
    limb.position.y = -0.26;
    leg.add(limb);
    parts.add(leg);
    legs.push(leg);
  }
  group.position.set(0, CASTLE_FLOOR, 17);
  scene.add(group);
  player = { group, parts, legs, speed: 0 };
}

function setPaused(value) {
  if (!started) return;
  paused = value;
  pauseMenu.classList.toggle('visible', paused);
  pauseMenu.setAttribute('aria-hidden', String(!paused));
  statusLabel.textContent = paused ? 'Jogo pausado' : 'Explorando o castelo';
  if (paused) {
    if (document.pointerLockElement) document.exitPointerLock();
    keys.clear();
    joystickInput = { x: 0, y: 0 };
    runTouch = false;
  } else if (!isTouchDevice) renderer.domElement.requestPointerLock?.();
}

function bindControls() {
  addEventListener('resize', onResize);
  resumeButton.addEventListener('click', () => setPaused(false));
  startButton.addEventListener('click', () => {
    if (!worldReady) return showError('O castelo ainda está carregando. Recarregue a página se o problema persistir.');
    started = true;
    paused = false;
    intro.classList.add('hidden');
    hud.classList.add('visible');
    crosshair.classList.add('visible');
    controlsHint.classList.add('visible');
    if (isTouchDevice) mobileControls.classList.add('visible');
    statusLabel.textContent = 'Explorando o castelo';
    errorMessage.style.display = 'none';
    if (!isTouchDevice) renderer.domElement.requestPointerLock?.();
  });
  document.addEventListener('pointerlockchange', () => {
    if (started && !isTouchDevice && document.pointerLockElement !== renderer.domElement && !paused) setPaused(true);
  });
  document.addEventListener('pointerlockerror', () => { statusLabel.textContent = 'Clique para capturar o mouse'; });
  addEventListener('keydown', (event) => {
    if (event.code === 'Escape' && started) {
      event.preventDefault();
      setPaused(!paused);
      return;
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    keys.add(event.code);
    if (event.code === 'Space' && started && !paused) jumpRequested = true;
  });
  addEventListener('keyup', (event) => keys.delete(event.code));
  addEventListener('blur', () => { keys.clear(); joystickInput = { x: 0, y: 0 }; runTouch = false; });
  renderer.domElement.addEventListener('click', () => {
    if (started && !paused && !isTouchDevice && document.pointerLockElement !== renderer.domElement) renderer.domElement.requestPointerLock?.();
  });
  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (!started || paused || isTouchDevice) return;
    draggingCamera = true;
    lastPointer = { x: event.clientX, y: event.clientY };
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (!started || paused) return;
    const locked = !isTouchDevice && document.pointerLockElement === renderer.domElement;
    if (!locked && !draggingCamera) return;
    const dx = locked ? event.movementX : event.clientX - lastPointer.x;
    const dy = locked ? event.movementY : event.clientY - lastPointer.y;
    cameraYaw -= dx * 0.0034;
    cameraPitch = THREE.MathUtils.clamp(cameraPitch - dy * 0.0028, -1.35, 1.0);
    lastPointer = { x: event.clientX, y: event.clientY };
  });
  renderer.domElement.addEventListener('pointerup', () => { draggingCamera = false; });
  renderer.domElement.addEventListener('pointercancel', () => { draggingCamera = false; });

  const joystick = $('#joystick');
  const knob = $('#joystick-knob');
  joystick.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    joystickPointer = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    updateJoystick(event, joystick, knob);
  });
  joystick.addEventListener('pointermove', (event) => {
    if (event.pointerId === joystickPointer) updateJoystick(event, joystick, knob);
  });
  const releaseJoystick = (event) => {
    if (event.pointerId !== joystickPointer) return;
    joystickPointer = null;
    joystickInput = { x: 0, y: 0 };
    knob.style.transform = 'translate(0, 0)';
  };
  joystick.addEventListener('pointerup', releaseJoystick);
  joystick.addEventListener('pointercancel', releaseJoystick);
  $('#run-touch').addEventListener('pointerdown', (event) => { event.preventDefault(); runTouch = true; });
  $('#run-touch').addEventListener('pointerup', () => { runTouch = false; });
  $('#run-touch').addEventListener('pointercancel', () => { runTouch = false; });
  $('#jump-touch').addEventListener('pointerdown', (event) => { event.preventDefault(); jumpRequested = true; });
}

function updateJoystick(event, joystick, knob) {
  const rect = joystick.getBoundingClientRect();
  const dx = event.clientX - (rect.left + rect.width / 2);
  const dy = event.clientY - (rect.top + rect.height / 2);
  const max = rect.width * 0.31;
  const length = Math.hypot(dx, dy) || 1;
  const scale = Math.min(1, max / length);
  const x = dx * scale, y = dy * scale;
  joystickInput = { x: x / max, y: y / max };
  knob.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
}

function collidesWall(x, z, feetY) {
  const headY = feetY + PLAYER_HEIGHT;
  for (const wall of wallColliders) {
    if (headY <= wall.bottom + 0.04 || feetY >= wall.top - 0.04) continue;
    const closestX = THREE.MathUtils.clamp(x, wall.x - wall.w / 2, wall.x + wall.w / 2);
    const closestZ = THREE.MathUtils.clamp(z, wall.z - wall.d / 2, wall.z + wall.d / 2);
    const dx = x - closestX, dz = z - closestZ;
    if (dx * dx + dz * dz < PLAYER_RADIUS * PLAYER_RADIUS) return true;
  }
  return false;
}

function floorAt(x, z, previousY, nextY) {
  raycaster.set(new THREE.Vector3(x, previousY + 0.18, z), down);
  raycaster.far = Math.max(2, previousY - nextY + 0.5);
  const hits = raycaster.intersectObjects(floorMeshes, false);
  for (const hit of hits) {
    const y = hit.point.y;
    if (y <= previousY + 0.12 && y >= nextY - 0.12) return y;
  }
  return null;
}

function updatePlayer(delta) {
  if (!started || paused) return;
  const forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - joystickInput.y;
  const strafe = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + joystickInput.x;
  const forwardDir = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
  const rightDir = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
  const movement = forwardDir.multiplyScalar(forward).add(rightDir.multiplyScalar(strafe));
  if (movement.lengthSq() > 1) movement.normalize();
  const running = keys.has('ShiftLeft') || keys.has('ShiftRight') || runTouch;
  const targetSpeed = movement.lengthSq() > 0.001 ? (running ? 7.3 : 4.1) : 0;
  player.speed = THREE.MathUtils.damp(player.speed, targetSpeed, 12, delta);

  if (targetSpeed > 0) {
    const dx = movement.x * player.speed * delta;
    const dz = movement.z * player.speed * delta;
    const px = player.group.position.x, pz = player.group.position.z, py = player.group.position.y;
    if (!collidesWall(px + dx, pz, py)) player.group.position.x += dx;
    if (!collidesWall(player.group.position.x, pz + dz, py)) player.group.position.z += dz;
  }

  const previousY = player.group.position.y;
  if (jumpRequested && grounded) {
    verticalVelocity = 6.4;
    grounded = false;
  }
  jumpRequested = false;
  verticalVelocity -= 18 * delta;
  const nextY = previousY + verticalVelocity * delta;
  const landing = verticalVelocity <= 0
    ? floorAt(player.group.position.x, player.group.position.z, previousY, nextY)
    : null;

  if (landing !== null) {
    player.group.position.y = landing;
    verticalVelocity = 0;
    grounded = true;
  } else {
    player.group.position.y = nextY;
    grounded = false;
  }

  // Safety recovery only triggers if a floor ray was genuinely lost for a long fall.
  if (player.group.position.y < -8) {
    player.group.position.set(0, CASTLE_FLOOR, 17);
    verticalVelocity = 0;
    grounded = true;
    cameraYaw = 0;
  }

  if (movement.lengthSq() > 0.001) {
    player.group.rotation.y = Math.atan2(-movement.x, -movement.z);
  }
  walkTime += delta * (running ? 13 : 8);
  const stride = Math.sin(walkTime) * Math.min(0.5, player.speed / 7) * (grounded ? 1 : 0.2);
  player.legs[0].rotation.x = stride;
  player.legs[1].rotation.x = -stride;
  player.parts.position.y = grounded ? Math.abs(Math.sin(walkTime * 2)) * Math.min(0.035, player.speed * 0.005) : 0;
  movementLabel.textContent = player.speed > 5 ? 'CORRENDO' : player.speed > 0.25 ? 'CAMINHANDO' : 'PARADO';
  coordsLabel.textContent = 'X ' + Math.round(player.group.position.x) + ' · Y ' + player.group.position.y.toFixed(1) + ' · Z ' + Math.round(player.group.position.z);
}

function updateCamera(delta) {
  if (started) {
    camera.position.set(player.group.position.x, player.group.position.y + 1.62, player.group.position.z);
    const direction = new THREE.Vector3(
      -Math.sin(cameraYaw) * Math.cos(cameraPitch),
      Math.sin(cameraPitch),
      -Math.cos(cameraYaw) * Math.cos(cameraPitch)
    );
    camera.lookAt(camera.position.clone().add(direction));
    player.parts.visible = false;
    return;
  }
  player.parts.visible = true;
  const target = player.group.position.clone().add(new THREE.Vector3(0, 1.3, 0));
  const desired = target.clone().add(new THREE.Vector3(0, 5.2, 12.5));
  camera.position.lerp(desired, 1 - Math.exp(-delta * 2.5));
  camera.lookAt(target);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, isTouchDevice ? 1.25 : 1.7));
  renderer.setSize(innerWidth, innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.04);
  updatePlayer(delta);
  updateCamera(delta);
  const t = clock.elapsedTime;
  for (const torch of torches) {
    const flicker = 0.88 + Math.sin(t * 9 + torch.phase) * 0.08 + Math.sin(t * 17 + torch.phase) * 0.04;
    torch.light.intensity = 2.2 * flicker;
    torch.flame.scale.setScalar(0.92 + Math.sin(t * 12 + torch.phase) * 0.12);
  }
  renderer.render(scene, camera);
}

try {
  init();
} catch (error) {
  console.error('Falha ao inicializar LSLIGHT SOULS:', error);
  showError('Falha ao iniciar o castelo 3D: ' + (error?.message || 'erro desconhecido') + '. Recarregue a página e tente novamente.');
}
