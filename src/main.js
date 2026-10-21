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
const pauseMenu = document.querySelector('#pause-menu');
const resumeButton = document.querySelector('#resume-button');

let scene, camera, renderer, clock, player, characterRoot, characterParts;
let started = false;
let paused = false;
let worldReady = false;
let cameraYaw = 0;
let cameraPitch = 0.24;
let cameraDistance = 7.5;
let verticalVelocity = 0;
let grounded = true;
let walkTime = 0;
let terrainMaterial;
let castleFloorY = 0;
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

// Register the start action before building the world. If initialization fails,
// the button still responds and explains what happened instead of appearing dead.
startButton.addEventListener('click', () => {
  if (!worldReady) {
    showError('O mundo ainda não terminou de carregar. Se esta mensagem persistir, recarregue a página.');
    return;
  }
  started = true;
  paused = false;
  intro.classList.add('hidden');
  hud.classList.add('visible');
  crosshair.classList.add('visible');
  controlsHint.classList.add('visible');
  if (isTouchDevice) mobileControls.classList.add('visible');
  statusLabel.textContent = 'Exploração ativa';
  errorMessage.style.display = 'none';
  if (!isTouchDevice) renderer.domElement.requestPointerLock?.();
});

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
  createCastle();
  bindControls();
  statusLabel.textContent = 'Mundo pronto';
  worldReady = true;
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

function createCastle() {
  // Large, empty keep with multiple floors, divided rooms and walkable ramps.
  castleFloorY = terrainHeight(0, 0);
  const stone = new THREE.MeshStandardMaterial({ color: '#777b80', roughness: 0.96 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: '#555b62', roughness: 1 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: '#696d70', roughness: 1 });
  const castle = new THREE.Group();
  const addBox = (w, h, d, x, y, z, material = stone) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = !isTouchDevice;
    mesh.receiveShadow = !isTouchDevice;
    castle.add(mesh);
    return mesh;
  };
  const addWallX = (x, z, length, y, h = 6.2, thickness = 0.8) => addBox(thickness, h, length, x, y, z, stone);
  const addWallZ = (x, z, length, y, h = 6.2, thickness = 0.8) => addBox(length, h, thickness, x, y, z, stone);
  const baseY = castleFloorY;
  const wallCenterY = (level) => baseY + level + 3.1;

  // 64 x 64 footprint with a broad entrance at the south side.
  addBox(62, 0.65, 62, 0, baseY - 0.325, 0, floorMaterial);
  const outerY = baseY + 5.5;
  addWallZ(0, -31, 62, outerY, 11, 1.8);
  addWallX(-31, 0, 62, outerY, 11, 1.8);
  addWallX(31, 0, 62, outerY, 11, 1.8);
  addWallZ(-21, 31, 20, outerY, 11, 1.8);
  addWallZ(21, 31, 20, outerY, 11, 1.8);
  // Heavy parapet caps.
  addBox(63, 0.8, 2.2, 0, baseY + 11.2, -31, stoneDark);
  addBox(2.2, 0.8, 63, -31, baseY + 11.2, 0, stoneDark);
  addBox(2.2, 0.8, 63, 31, baseY + 11.2, 0, stoneDark);
  addBox(20.5, 0.8, 2.2, -21, baseY + 11.2, 31, stoneDark);
  addBox(20.5, 0.8, 2.2, 21, baseY + 11.2, 31, stoneDark);

  // Four tall round towers and crenellations.
  for (const [x, z] of [[-31, -31], [31, -31], [-31, 31], [31, 31]]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.2, 15, 12), stone);
    tower.position.set(x, baseY + 7.5, z);
    tower.castShadow = !isTouchDevice;
    tower.receiveShadow = !isTouchDevice;
    castle.add(tower);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(4.1, 3.8, 0.8, 12), stoneDark);
    rim.position.set(x, baseY + 15, z);
    castle.add(rim);
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI * 2 / 10;
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.85), stone);
      block.position.set(x + Math.cos(angle) * 3.75, baseY + 15.9, z + Math.sin(angle) * 3.75);
      block.lookAt(x, block.position.y, z);
      castle.add(block);
    }
  }

  // Main hall partitions on the ground floor, leaving door-sized passages.
  const roomY = baseY + 3.1;
  addWallX(-10, 0, 43, roomY); addWallX(10, 0, 43, roomY);
  addWallZ(0, -10, 20, roomY); addWallZ(-20, 10, 22, roomY);
  addWallZ(20, 10, 22, roomY);
  // Cross walls are split around openings so every room remains accessible.
  addWallZ(-10, -20, 15, roomY); addWallZ(10, -20, 15, roomY);
  addWallZ(-10, 20, 15, roomY); addWallZ(10, 20, 15, roomY);
  // Interior stone courses make the otherwise empty architecture readable.
  for (const level of [2.2, 4.5, 6.8, 9.1]) {
    addBox(62, 0.16, 1.95, 0, baseY + level, -31, stoneDark);
    addBox(1.95, 0.16, 62, -31, baseY + level, 0, stoneDark);
    addBox(1.95, 0.16, 62, 31, baseY + level, 0, stoneDark);
  }

  // Second and third floors: open central gallery plus separate side chambers.
  const secondY = baseY + 6.4;
  addBox(53, 0.55, 15, 0, secondY - 0.275, -22, floorMaterial);
  addBox(15, 0.55, 29, -22, secondY - 0.275, 0, floorMaterial);
  addBox(15, 0.55, 29, 22, secondY - 0.275, 0, floorMaterial);
  addBox(53, 0.55, 15, 0, secondY - 0.275, 22, floorMaterial);
  const thirdY = baseY + 12.8;
  addBox(19, 0.55, 19, -20, thirdY - 0.275, -20, floorMaterial);
  addBox(19, 0.55, 19, 20, thirdY - 0.275, -20, floorMaterial);
  addBox(19, 0.55, 19, -20, thirdY - 0.275, 20, floorMaterial);
  addBox(19, 0.55, 19, 20, thirdY - 0.275, 20, floorMaterial);

  // Upper-level room dividers.
  for (const levelY of [secondY, thirdY]) {
    addWallX(-22, 0, 28, levelY + 3.1, 6.2, 0.65);
    addWallX(22, 0, 28, levelY + 3.1, 6.2, 0.65);
    addWallZ(0, -22, 18, levelY + 3.1, 6.2, 0.65);
    addWallZ(0, 22, 18, levelY + 3.1, 6.2, 0.65);
  }

  // Broad sloped stone ramps connect the levels; they are deliberately bare.
  const addRamp = (x, z, bottomY, height, length, width, rotation = 0) => {
    const ramp = addBox(width, 0.7, length, x, bottomY + height / 2, z, floorMaterial);
    ramp.rotation.x = -Math.atan2(height, length);
    ramp.rotation.y = rotation;
    ramp.position.y = bottomY + height / 2;
  };
  addRamp(-5, -21, baseY + 0.2, 6.2, 18, 5);
  addRamp(5, 21, secondY + 0.2, 6.2, 18, 5, Math.PI);
  // Stair-step blocks alongside the ramps provide a clear visual cue.
  for (let i = 0; i < 12; i++) {
    const stepH = (i + 1) * 0.5;
    addBox(4.8, 0.18, 1.15, -5, baseY + stepH, -29 + i * 1.35, stoneDark);
  }

  // Entrance portal frame, left empty without a gate or props.
  addBox(1.4, 12, 2.2, -5.2, baseY + 6, 31, stoneDark);
  addBox(1.4, 12, 2.2, 5.2, baseY + 6, 31, stoneDark);
  addBox(12, 1.5, 2.4, 0, baseY + 11.8, 31, stoneDark);
  scene.add(castle);
}

function castleFloorHeightAt(x, z, playerY = Infinity) {
  const ax = Math.abs(x), az = Math.abs(z);
  if (ax >= 30.2 || az >= 30.2) return terrainHeight(x, z);

  // The keep has a continuous ground slab. Higher surfaces are only considered
  // where matching platform meshes actually exist, preventing invisible floors
  // across gaps between rooms and galleries.
  const floors = [castleFloorY];
  const onSecondFloor =
    (ax >= 14.5 && ax <= 29.5 && az <= 14.5) ||
    (az >= 14.5 && az <= 29.5 && ax <= 26.5);
  const onThirdFloor = ax >= 10.5 && ax <= 29.5 && az >= 10.5 && az <= 29.5;
  if (onSecondFloor) floors.push(castleFloorY + 6.4);
  if (onThirdFloor) floors.push(castleFloorY + 12.8);

  // Ramp surfaces follow the actual ramp direction and connect the ground to
  // the second gallery. Only use a ramp height while inside its narrow footprint.
  if (x > -7.5 && x < -2.5 && z >= -30 && z <= -12) {
    floors.push(castleFloorY + 0.2 + ((z + 30) / 18) * 6.2);
  }
  if (x > 2.5 && x < 7.5 && z >= 12 && z <= 30) {
    floors.push(castleFloorY + 6.6 + ((30 - z) / 18) * 6.2);
  }

  // Pick the highest physical surface at or below the player's feet. This
  // avoids snapping a player standing below an upper gallery onto that floor.
  let floor = castleFloorY;
  for (const height of floors) {
    if (height <= playerY + 0.12 && height > floor) floor = height;
  }
  return floor;
}

function isCastleWallAt(x, z) {
  const ax = Math.abs(x), az = Math.abs(z);
  // Collision bands match the actual thickness and extents of the outer walls.
  const outer = (Math.abs(ax - 31) < 1.05 && az < 30.1)
    || (Math.abs(z + 31) < 1.05 && ax < 30.1)
    || (Math.abs(z - 31) < 1.05 && ax < 30.1 && ax > 6.0);
  if (outer) return true;

  // Ground-floor partitions: keep the doorway gaps aligned with their meshes.
  if (Math.abs(ax - 10) < 0.62 && az < 21.7
      && !(az > 2.5 && az < 5.9) && !(az > 16.3 && az < 19.7)) return true;
  if (Math.abs(z + 10) < 0.62 && ax < 10.2
      && !(ax > 2.5 && ax < 5.9) && !(ax > 14.5 && ax < 17.5)) return true;
  if (Math.abs(z - 10) < 0.62 && ax > 9.2 && ax < 31.2
      && !(ax > 14.5 && ax < 19.5)) return true;

  // Upper galleries have their own partitions. Apply them only while the
  // player is on an upper level, so they do not block the ground floor.
  const level = player?.group?.position?.y ?? castleFloorY;
  if (level > castleFloorY + 5.7) {
    const onUpper = level < castleFloorY + 10;
    const wallX = onUpper ? 22 : 20;
    const wallZ = onUpper ? 22 : 20;
    if (Math.abs(ax - wallX) < 0.52 && az < 14.2) return true;
    if (Math.abs(z + wallZ) < 0.52 && ax < 9.2) return true;
    if (Math.abs(z - wallZ) < 0.52 && ax < 9.2) return true;
  }
  return false;
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
    if (Math.abs(worldX) < 34 && Math.abs(worldZ) < 34) continue;
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
    if (Math.abs(worldX) < 34 && Math.abs(worldZ) < 34) continue;
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

function setPaused(value) {
  if (!started) return;
  paused = value;
  pauseMenu.classList.toggle('visible', paused);
  pauseMenu.setAttribute('aria-hidden', String(!paused));
  statusLabel.textContent = paused ? 'Jogo pausado' : 'Exploração ativa';
  if (paused) {
    if (document.pointerLockElement) document.exitPointerLock();
    keys.clear();
    player.speed = 0;
    joystickInput = { x: 0, y: 0 };
    runTouch = false;
  } else if (!isTouchDevice) {
    renderer.domElement.requestPointerLock?.();
  }
}

function bindControls() {
  addEventListener('resize', onResize);
  resumeButton.addEventListener('click', () => setPaused(false));
  document.addEventListener('pointerlockchange', () => {
    if (started && !isTouchDevice && document.pointerLockElement !== renderer.domElement && !paused) {
      setPaused(true);
    }
  });
  document.addEventListener('pointerlockerror', () => {
    statusLabel.textContent = 'Clique no jogo para capturar o mouse';
  });
  addEventListener('keydown', (event) => {
    if (event.code === 'Escape' && started) {
      event.preventDefault();
      if (!paused) setPaused(true);
      return;
    }
  });
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

  renderer.domElement.addEventListener('click', () => {
    if (started && paused) return;
    if (started && !isTouchDevice && document.pointerLockElement !== renderer.domElement) {
      renderer.domElement.requestPointerLock?.();
    }
  });
  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (!started || paused || isTouchDevice) return;
    draggingCamera = true;
    lastPointer = { x: event.clientX, y: event.clientY };
    // Pointer lock provides continuous mouse deltas; pointer capture is only useful for touch dragging.
    if (isTouchDevice) renderer.domElement.setPointerCapture?.(event.pointerId);
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (!started || paused) return;
    const mouseLocked = !isTouchDevice && document.pointerLockElement === renderer.domElement;
    if (!mouseLocked && !draggingCamera) return;
    const dx = mouseLocked ? event.movementX : event.clientX - lastPointer.x;
    const dy = mouseLocked ? event.movementY : event.clientY - lastPointer.y;
    cameraYaw -= dx * 0.004;
    cameraPitch = THREE.MathUtils.clamp(cameraPitch - dy * 0.003, -1.35, 0.78);
    lastPointer = { x: event.clientX, y: event.clientY };
  });
  renderer.domElement.addEventListener('pointerup', () => { draggingCamera = false; });
  renderer.domElement.addEventListener('pointercancel', () => { draggingCamera = false; });

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
    cameraPitch = THREE.MathUtils.clamp(cameraPitch + (touch.clientY - cameraTouch.y) * 0.004, -1.35, 0.78);
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
  if (!started || paused) return;
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
    const stepX = moveVector.x * player.speed * delta;
    const stepZ = moveVector.z * player.speed * delta;
    const nextX = player.group.position.x + stepX;
    const nextZ = player.group.position.z + stepZ;
    if (!isCastleWallAt(nextX, player.group.position.z)) player.group.position.x = nextX;
    if (!isCastleWallAt(player.group.position.x, nextZ)) player.group.position.z = nextZ;
    const targetRotation = Math.atan2(-moveVector.x, -moveVector.z);
    let difference = targetRotation - characterRoot.rotation.y;
    difference = Math.atan2(Math.sin(difference), Math.cos(difference));
    characterRoot.rotation.y += difference * Math.min(1, delta * 10);
  }

  const previousY = player.group.position.y;
  verticalVelocity -= 19 * delta;
  player.group.position.y += verticalVelocity * delta;
  const floor = castleFloorHeightAt(player.group.position.x, player.group.position.z, previousY);
  if (verticalVelocity <= 0 && previousY >= floor - 0.12 && player.group.position.y <= floor) {
    player.group.position.y = floor;
    verticalVelocity = 0;
    grounded = true;
  } else if (player.group.position.y > floor + 0.12) {
    grounded = false;
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
  // First-person view: place the camera at the player's eye height and aim
  // from the current yaw/pitch. Keep the third-person view only on the intro.
  if (started) {
    const eye = player.group.position.clone().add(new THREE.Vector3(0, 1.62, 0));
    camera.position.copy(eye);
    const lookDirection = new THREE.Vector3(
      -Math.sin(cameraYaw) * Math.cos(cameraPitch),
      Math.sin(cameraPitch),
      -Math.cos(cameraYaw) * Math.cos(cameraPitch)
    );
    camera.lookAt(eye.clone().add(lookDirection));
    // Prevent the third-person avatar from appearing in front of the camera.
    characterParts.visible = false;
    if (camera.fov !== 78) {
      camera.fov = 78;
      camera.updateProjectionMatrix();
    }
    return;
  }

  characterParts.visible = true;
  if (camera.fov !== 65) {
    camera.fov = 65;
    camera.updateProjectionMatrix();
  }
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
  console.error('Falha ao inicializar o LSLIGHT SOULS:', error);
  showError('Falha ao iniciar o mundo 3D: ' + (error?.message || 'erro desconhecido') + '. Recarregue a página; se persistir, envie esta mensagem de erro.');
}