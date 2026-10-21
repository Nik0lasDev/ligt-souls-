import * as THREE from 'three';
import './style.css';

const mount = document.querySelector('#game');
const statusLabel = document.querySelector('#world-status');
const coordsLabel = document.querySelector('#coordinates');
const movementLabel = document.querySelector('#movement-label');
const intro = document.querySelector('#intro');
const startButton = document.querySelector('#start-button');
const hud = document.querySelector('#hud');
const crosshair = document.querySelector('#crosshair');
const controlsHint = document.querySelector('#controls-hint');
const mobileControls = document.querySelector('#mobile-controls');
const errorMessage = document.querySelector('#error-message');

let scene, camera, renderer, clock, player, characterRoot, characterParts;
let started = false;
let cameraYaw = 0;
let cameraPitch = 0.24;
let cameraDistance = 7.5;
let verticalVelocity = 0;
let grounded = true;
let walkTime = 0;
let terrainMaterial;
const keys = new Set();
const chunks = new Map();
const CHUNK_SIZE = 48;
const CHUNK_RESOLUTION = 24;
const isTouchDevice = matchMedia('(pointer: coarse)').matches;
const RENDER_DISTANCE = isTouchDevice ? 1 : 2;
const WORLD_SEED = 192837;
const tempVector = new THREE.Vector3();
const forwardVector = new THREE.Vector3();
const rightVector = new THREE.Vector3();
const moveVector = new THREE.Vector3();
let draggingCamera = false;
let lastPointer = { x: 0, y: 0 };
let joystickPointer = null;
let joystickInput = { x: 0, y: 0 };
let runTouch = false;

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#a9c9d0');
  scene.fog = new THREE.FogExp2('#a9c9d0', 0.0085);

  camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 500);
  camera.position.set(0, 5, 9);

  renderer = new THREE.WebGLRenderer({ antialias: !isTouchDevice, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isTouchDevice ? 1.35 : 1.8));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = !isTouchDevice;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  mount.appendChild(renderer.domElement);

  clock = new THREE.Clock();
  addLighting();
  addSkyDetails();
  createCharacter();
  updateChunks(true);
  bindControls();
  statusLabel.textContent = 'Mundo pronto';
  animate();
}

function addLighting() {
  const hemi = new THREE.HemisphereLight('#d9efff', '#53634a', 2.1);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight('#fff0d3', 3.2);
  sun.position.set(-45, 70, 25);
  sun.castShadow = !isTouchDevice;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35;
  sun.shadow.camera.bottom = -35;
  sun.shadow.bias = -0.00015;
  scene.add(sun);
  scene.add(sun.target);
}

function addSkyDetails() {
  const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(5, 16, 12),
    new THREE.MeshBasicMaterial({ color: '#fff0bf' })
  );
  sunGlow.position.set(-85, 95, -150);
  scene.add(sunGlow);

  const ambientClouds = new THREE.Group();
  const cloudMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, depthWrite: false });
  for (let i = 0; i < 12; i++) {
    const cloud = new THREE.Group();
    const pieces = 3 + (i % 4);
    for (let j = 0; j < pieces; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), cloudMaterial);
      puff.scale.set(2.8 + ((i + j) % 3), 0.65 + (j % 2) * 0.25, 1.5 + (j % 3) * 0.25);
      puff.position.set(j * 2.1, (j % 2) * 0.35, Math.sin(j) * 0.6);
      cloud.add(puff);
    }
    cloud.position.set((i % 4) * 45 - 70, 25 + (i % 3) * 7, -90 - Math.floor(i / 4) * 60);
    ambientClouds.add(cloud);
  }
  scene.add(ambientClouds);
}

function createCharacter() {
  characterRoot = new THREE.Group();
  characterParts = new THREE.Group();
  characterRoot.add(characterParts);

  const coat = new THREE.MeshStandardMaterial({ color: '#344c48', roughness: 0.88 });
  const coatLight = new THREE.MeshStandardMaterial({ color: '#526e64', roughness: 0.9 });
  const trousers = new THREE.MeshStandardMaterial({ color: '#293331', roughness: 0.92 });
  const skin = new THREE.MeshStandardMaterial({ color: '#d4b49a', roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: '#202b29', roughness: 0.7 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.66, 4, 8), coat);
  torso.position.y = 1.32;
  torso.castShadow = true;
  characterParts.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.255, 12, 10), skin);
  head.position.y = 2.13;
  head.scale.set(0.88, 1.08, 0.92);
  head.castShadow = true;
  characterParts.add(head);

  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.285, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), dark);
  hood.position.set(0, 2.18, -0.035);
  hood.rotation.x = -0.12;
  hood.castShadow = true;
  characterParts.add(hood);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.39, 1.63, 0);
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.49, 3, 7), coatLight);
  armL.position.y = -0.28;
  armL.rotation.z = -0.12;
  armL.castShadow = true;
  leftArm.add(armL);
  characterParts.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.39, 1.63, 0);
  const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.49, 3, 7), coatLight);
  armR.position.y = -0.28;
  armR.rotation.z = 0.12;
  armR.castShadow = true;
  rightArm.add(armR);
  characterParts.add(rightArm);

  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.17, 0.79, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.48, 3, 7), trousers);
    thigh.position.y = -0.27;
    thigh.castShadow = true;
    leg.add(thigh);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.13, 0.38), dark);
    boot.position.set(0, -0.57, 0.07);
    boot.castShadow = true;
    leg.add(boot);
    characterParts.add(leg);
    legs.push(leg);
  }

  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.56, 0.2), dark);
  pack.position.set(0, 1.47, -0.31);
  pack.castShadow = true;
  characterParts.add(pack);

  player = { group: characterRoot, leftArm, rightArm, legs, speed: 0 };
  scene.add(characterRoot);
  characterRoot.position.set(0, terrainHeight(0, 0), 0);
}

function hash2(x, z) {
  let h = Math.imul(x, 374761393) + Math.imul(z, 668265263) + WORLD_SEED;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function smoothNoise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, sx), THREE.MathUtils.lerp(c, d, sx), sz);
}

function terrainHeight(x, z) {
  const broad = (smoothNoise(x * 0.012, z * 0.012) - 0.5) * 9;
  const hills = (smoothNoise(x * 0.038 + 21, z * 0.038 - 8) - 0.5) * 2.4;
  const detail = (smoothNoise(x * 0.12 - 5, z * 0.12 + 18) - 0.5) * 0.45;
  return broad + hills + detail;
}

function makeTerrainChunk(cx, cz) {
  const geometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, CHUNK_RESOLUTION, CHUNK_RESOLUTION);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const colors = [];
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) + cx * CHUNK_SIZE;
    const z = positions.getZ(i) + cz * CHUNK_SIZE;
    const y = terrainHeight(x, z);
    positions.setY(i, y);
    const variation = hash2(Math.floor(x * 1.8), Math.floor(z * 1.8));
    if (y > 3.3) color.set('#7e8875');
    else if (y > 1.6) color.set('#879276');
    else color.set('#607b57');
    color.offsetHSL(0, 0, (variation - 0.5) * 0.13);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    flatShading: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
  mesh.receiveShadow = !isTouchDevice;
  mesh.userData.chunkKey = cx + ',' + cz;
  const group = new THREE.Group();
  group.add(mesh);
  addVegetation(group, cx, cz);
  scene.add(group);
  return group;
}

function addVegetation(group, cx, cz) {
  const treeTrunk = new THREE.MeshStandardMaterial({ color: '#65503a', roughness: 1 });
  const leaves = [
    new THREE.MeshStandardMaterial({ color: '#355b42', roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: '#496c48', roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: '#2e4c39', roughness: 1 })
  ];
  const grassMaterial = new THREE.MeshStandardMaterial({ color: '#879b62', roughness: 1, side: THREE.DoubleSide });
  const random = (index) => hash2(cx * 101 + index * 17, cz * 89 - index * 31);
  const treeCount = 3 + Math.floor(random(3) * 5);
  for (let i = 0; i < treeCount; i++) {
    const rx = (random(i + 1) * 0.88 + 0.06) * CHUNK_SIZE;
    const rz = (random(i + 21) * 0.88 + 0.06) * CHUNK_SIZE;
    const worldX = cx * CHUNK_SIZE - CHUNK_SIZE / 2 + rx;
    const worldZ = cz * CHUNK_SIZE - CHUNK_SIZE / 2 + rz;
    if (Math.hypot(worldX, worldZ) < 9) continue;
    const h = terrainHeight(worldX, worldZ);
    if (h > 4.2) continue;
    const scale = 0.72 + random(i + 40) * 0.75;
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.2 * scale, 1.8 * scale, 6), treeTrunk);
    trunk.position.y = 0.9 * scale;
    trunk.castShadow = !isTouchDevice;
    tree.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.9 * scale, 2.5 * scale, 7), leaves[Math.floor(random(i + 70) * leaves.length)]);
    crown.position.y = 2.25 * scale;
    crown.castShadow = !isTouchDevice;
    tree.add(crown);
    const crown2 = new THREE.Mesh(new THREE.ConeGeometry(0.68 * scale, 1.7 * scale, 7), leaves[Math.floor(random(i + 90) * leaves.length)]);
    crown2.position.y = 3.05 * scale;
    tree.add(crown2);
    tree.position.set(worldX, h, worldZ);
    tree.rotation.y = random(i + 110) * Math.PI * 2;
    group.add(tree);
  }

  for (let i = 0; i < 12; i++) {
    const rx = random(i + 150) * CHUNK_SIZE;
    const rz = random(i + 190) * CHUNK_SIZE;
    const worldX = cx * CHUNK_SIZE - CHUNK_SIZE / 2 + rx;
    const worldZ = cz * CHUNK_SIZE - CHUNK_SIZE / 2 + rz;
    if (Math.hypot(worldX, worldZ) < 7) continue;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.38, 3), grassMaterial);
    blade.position.set(worldX, terrainHeight(worldX, worldZ) + 0.13, worldZ);
    blade.rotation.z = (random(i + 220) - 0.5) * 0.35;
    group.add(blade);
  }
}

function updateChunks(force = false) {
  const centerX = Math.floor(player.group.position.x / CHUNK_SIZE);
  const centerZ = Math.floor(player.group.position.z / CHUNK_SIZE);
  const needed = new Set();
  for (let x = centerX - RENDER_DISTANCE; x <= centerX + RENDER_DISTANCE; x++) {
    for (let z = centerZ - RENDER_DISTANCE; z <= centerZ + RENDER_DISTANCE; z++) {
      const key = x + ',' + z;
      needed.add(key);
      if (!chunks.has(key)) chunks.set(key, makeTerrainChunk(x, z));
    }
  }
  for (const [key, group] of chunks) {
    if (!needed.has(key)) {
      scene.remove(group);
      group.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) object.material.forEach((m) => m.dispose());
          else object.material.dispose();
        }
      });
      chunks.delete(key);
    }
  }
  if (force) statusLabel.textContent = 'Mundo pronto';
}

function bindControls() {
  addEventListener('resize', onResize);
  addEventListener('keydown', (event) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    keys.add(event.code);
    if (event.code === 'Space' && grounded && started) {
      verticalVelocity = 7.1;
      grounded = false;
    }
  });
  addEventListener('keyup', (event) => keys.delete(event.code));
  addEventListener('blur', () => keys.clear());

  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (!started) return;
    draggingCamera = true;
    lastPointer = { x: event.clientX, y: event.clientY };
    renderer.domElement.setPointerCapture?.(event.pointerId);
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (!draggingCamera || !started) return;
    const dx = event.clientX - lastPointer.x;
    const dy = event.clientY - lastPointer.y;
    cameraYaw -= dx * 0.004;
    cameraPitch = THREE.MathUtils.clamp(cameraPitch + dy * 0.003, -0.12, 0.78);
    lastPointer = { x: event.clientX, y: event.clientY };
  });
  renderer.domElement.addEventListener('pointerup', () => { draggingCamera = false; });
  renderer.domElement.addEventListener('pointercancel', () => { draggingCamera = false; });

  startButton.addEventListener('click', () => {
    started = true;
    intro.classList.add('hidden');
    hud.classList.add('visible');
    crosshair.classList.add('visible');
    controlsHint.classList.add('visible');
    if (isTouchDevice) mobileControls.classList.add('visible');
    statusLabel.textContent = 'Exploração ativa';
  });

  const joystick = document.querySelector('#joystick');
  const knob = document.querySelector('#joystick-knob');
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

  document.querySelector('#run-touch').addEventListener('pointerdown', (e) => { e.preventDefault(); runTouch = true; });
  document.querySelector('#run-touch').addEventListener('pointerup', () => { runTouch = false; });
  document.querySelector('#run-touch').addEventListener('pointercancel', () => { runTouch = false; });
  document.querySelector('#jump-touch').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (grounded && started) { verticalVelocity = 7.1; grounded = false; }
  });
  let cameraTouch = null;
  renderer.domElement.addEventListener('touchstart', (event) => {
    if (event.touches.length > 1) cameraTouch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  renderer.domElement.addEventListener('touchmove', (event) => {
    if (!cameraTouch || event.touches.length < 2) return;
    const touch = event.touches[0];
    cameraYaw -= (touch.clientX - cameraTouch.x) * 0.006;
    cameraPitch = THREE.MathUtils.clamp(cameraPitch + (touch.clientY - cameraTouch.y) * 0.004, -0.12, 0.78);
    cameraTouch = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  renderer.domElement.addEventListener('touchend', () => { cameraTouch = null; }, { passive: true });
}

function updateJoystick(event, joystick, knob) {
  const rect = joystick.getBoundingClientRect();
  const dx = event.clientX - (rect.left + rect.width / 2);
  const dy = event.clientY - (rect.top + rect.height / 2);
  const max = rect.width * 0.31;
  const length = Math.hypot(dx, dy) || 1;
  const scale = Math.min(1, max / length);
  const x = dx * scale;
  const y = dy * scale;
  joystickInput = { x: x / max, y: y / max };
  knob.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
}

function updatePlayer(delta) {
  if (!started) return;
  const forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - joystickInput.y;
  const strafe = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + joystickInput.x;
  forwardVector.set(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
  rightVector.set(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
  moveVector.set(0, 0, 0).addScaledVector(forwardVector, forward).addScaledVector(rightVector, strafe);
  if (moveVector.lengthSq() > 1) moveVector.normalize();

  const running = keys.has('ShiftLeft') || keys.has('ShiftRight') || runTouch;
  const targetSpeed = moveVector.lengthSq() > 0.001 ? (running ? 8.2 : 4.5) : 0;
  player.speed = THREE.MathUtils.damp(player.speed, targetSpeed, 10, delta);
  if (targetSpeed > 0) {
    player.group.position.addScaledVector(moveVector, player.speed * delta);
    const targetRotation = Math.atan2(-moveVector.x, -moveVector.z);
    let difference = targetRotation - characterRoot.rotation.y;
    difference = Math.atan2(Math.sin(difference), Math.cos(difference));
    characterRoot.rotation.y += difference * Math.min(1, delta * 10);
  }

  verticalVelocity -= 19 * delta;
  player.group.position.y += verticalVelocity * delta;
  const floor = terrainHeight(player.group.position.x, player.group.position.z);
  if (player.group.position.y <= floor) {
    player.group.position.y = floor;
    verticalVelocity = 0;
    grounded = true;
  }

  walkTime += delta * (running ? 13 : 8) * (player.speed > 0.1 ? 1 : 0.12);
  const stride = Math.sin(walkTime) * Math.min(0.58, player.speed / 7) * (grounded ? 1 : 0.25);
  player.legs[0].rotation.x = stride;
  player.legs[1].rotation.x = -stride;
  player.leftArm.rotation.x = -stride * 0.72;
  player.rightArm.rotation.x = stride * 0.72;
  characterParts.position.y = grounded ? Math.abs(Math.sin(walkTime * 2)) * Math.min(0.045, player.speed * 0.006) : 0;
  movementLabel.textContent = player.speed > 5.5 ? 'CORRENDO' : player.speed > 0.3 ? 'CAMINHANDO' : 'PARADO';
  coordsLabel.textContent = 'X ' + Math.round(player.group.position.x) + ' · Z ' + Math.round(player.group.position.z);
  updateChunks();
}

function updateCamera(delta) {
  const target = player.group.position.clone().add(new THREE.Vector3(0, 1.55, 0));
  const horizontal = Math.cos(cameraPitch) * cameraDistance;
  const offset = new THREE.Vector3(
    Math.sin(cameraYaw) * horizontal,
    Math.sin(cameraPitch) * cameraDistance + 1.1,
    Math.cos(cameraYaw) * horizontal
  );
  const desired = target.clone().add(offset);
  desired.y = Math.max(desired.y, terrainHeight(desired.x, desired.z) + 1.1);
  camera.position.lerp(desired, 1 - Math.exp(-delta * 7));
  camera.lookAt(target);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, isTouchDevice ? 1.35 : 1.8));
  renderer.setSize(innerWidth, innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  updatePlayer(delta);
  updateCamera(delta);
  renderer.render(scene, camera);
}

try {
  init();
} catch (error) {
  console.error(error);
  showError('Não foi possível iniciar o mundo 3D. Atualize o navegador e tente novamente.');
}