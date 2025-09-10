// --- Save and Import Settings Functions (must be defined before GUI buttons) ---
const saveSettingsToClipboard = () => {
    const settings = {
        background: { ...params },
        ground: { ...groundParams },
        directionalLight: {
            ...dirLightParams,
            position: {
                x: directionalLight.position.x,
                y: directionalLight.position.y,
                z: directionalLight.position.z
            }
        },
        ambientLight: { ...ambLightParams },
        camera: {
            position: camera.position.toArray(),
            rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z],
            target: controls.target.toArray()
        }
    };
    if (window.model) {
        settings.model = {
            position: window.model.position.toArray(),
            rotation: [window.model.rotation.x, window.model.rotation.y, window.model.rotation.z],
            scale: window.model.scale.toArray()
        };
    }
    const settingsStr = JSON.stringify(settings, null, 2);
    navigator.clipboard.writeText(settingsStr).then(
        () => alert('Settings copied to clipboard!'),
        () => alert('Failed to copy settings to clipboard.')
    );
};

async function importSettingsFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        const settings = JSON.parse(text);

        if (settings.background) {
            if (settings.background.gradientTop) params.gradientTop = settings.background.gradientTop;
            if (settings.background.gradientBottom) params.gradientBottom = settings.background.gradientBottom;
            if (settings.background.gradientAlpha !== undefined) params.gradientAlpha = settings.background.gradientAlpha;
            updateGradientBackground();
        }
        if (settings.ground) {
            if (settings.ground.mode) {
                groundParams.mode = settings.ground.mode;
                if (gui && gui.__folders && gui.__folders['Ground Plane'] && gui.__folders['Ground Plane'].__controllers[0]) {
                    gui.__folders['Ground Plane'].__controllers[0].setValue(settings.ground.mode);
                }
                ground.geometry = circleGeometry;
                ground.material = solidGroundMaterial;
                ground.receiveShadow = true;
                ground.castShadow = false;
                ground.material.needsUpdate = true;
                ground.geometry.computeBoundingSphere();
            }
            if (settings.ground.color) {
                groundParams.color = settings.ground.color;
                solidGroundMaterial.color.set(settings.ground.color);
            }
            if (settings.ground.roughness !== undefined) { groundParams.roughness = settings.ground.roughness; solidGroundMaterial.roughness = settings.ground.roughness; }
            if (settings.ground.metalness !== undefined)  { groundParams.metalness = settings.ground.metalness; solidGroundMaterial.metalness = settings.ground.metalness; }
            if (settings.ground.shadowOpacity !== undefined) { groundParams.shadowOpacity = settings.ground.shadowOpacity; shadowGroundMaterial.opacity = settings.ground.shadowOpacity; }
            groundParams.receiveShadow = true; ground.receiveShadow = true;
            if (settings.ground.castShadow !== undefined)  { groundParams.castShadow = settings.ground.castShadow; ground.castShadow = settings.ground.castShadow; }
            if (settings.ground.visible !== undefined)     { groundParams.visible = settings.ground.visible; ground.visible = settings.ground.visible; }
        }
        if (settings.light) {
            if (settings.light.intensity !== undefined) directionalLight.intensity = settings.light.intensity;
            if (settings.light.color) directionalLight.color.set(settings.light.color);
            if (settings.light.position) directionalLight.position.set(settings.light.position.x, settings.light.position.y, settings.light.position.z);
            if (settings.light.castShadow !== undefined) directionalLight.castShadow = settings.light.castShadow;
            if (settings.light.shadowBias !== undefined) directionalLight.shadow.bias = settings.light.shadowBias;
            if (settings.light.shadowBlur !== undefined) directionalLight.shadow.radius = settings.light.shadowBlur;
            if (settings.light.shadowMapWidth !== undefined) directionalLight.shadow.mapSize.width = settings.light.shadowMapWidth;
            if (settings.light.shadowMapHeight !== undefined) directionalLight.shadow.mapSize.height = settings.light.shadowMapHeight;
        }
        if (settings.camera) {
            if (settings.camera.position) camera.position.fromArray(settings.camera.position);
            if (settings.camera.rotation) camera.rotation.set(settings.camera.rotation[0], settings.camera.rotation[1], settings.camera.rotation[2]);
            if (settings.camera.target) controls.target.fromArray(settings.camera.target);
            controls.update();
        }
        if (settings.model && typeof model !== 'undefined' && model) {
            if (settings.model.position) model.position.fromArray(settings.model.position);
            if (settings.model.rotation) model.rotation.set(settings.model.rotation[0], settings.model.rotation[1], settings.model.rotation[2]);
            if (settings.model.scale) model.scale.fromArray(settings.model.scale);
        }
        alert('Settings imported from clipboard!');
    } catch (e) {
        alert('Failed to import settings: ' + e.message);
    }
}

// ---------------------------------------------
// 1. Imports: Three.js core and extensions
// ---------------------------------------------
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import GUI from 'lil-gui';

// ---------------------------------------------
// 2. Canvas & Scene Setup
// ---------------------------------------------
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();

/** GUI */
const gui = new GUI();

// GUI parameters for gradient background
const params = { gradientTop: '#ff0000', gradientBottom: '#0000ff', gradientAlpha: 1.0 };

let bgTexture = null;
function updateGradientBackground() {
    const width = 512, height = 512;
    const canvasBg = document.createElement('canvas');
    canvasBg.width = width; canvasBg.height = height;
    const ctx = canvasBg.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, params.gradientTop);
    gradient.addColorStop(1, params.gradientBottom);
    ctx.fillStyle = gradient;
    ctx.globalAlpha = params.gradientAlpha;
    ctx.fillRect(0, 0, width, height);
    bgTexture = new THREE.CanvasTexture(canvasBg);
    scene.background = bgTexture;
    scene._originalBackgroundTexture = bgTexture;
}

gui.add({ saveSettingsToClipboard }, 'saveSettingsToClipboard').name('Save Settings to Clipboard');
gui.add({ importSettingsFromClipboard }, 'importSettingsFromClipboard').name('Import Settings from Clipboard');
gui.addColor(params, 'gradientTop').name('Gradient Top').onChange(updateGradientBackground);
gui.addColor(params, 'gradientBottom').name('Gradient Bottom').onChange(updateGradientBackground);
gui.add(params, 'gradientAlpha', 0, 1, 0.01).name('Gradient Alpha').onChange(updateGradientBackground);

updateGradientBackground();

// ---------------------------------------------
// 3. Loaders
// ---------------------------------------------
const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous'); // UPDATED: ensure CORS-safe loads

const rgbeLoader = new RGBELoader();
const gltfLoader = new GLTFLoader();

// ---------------------------------------------
// 4. Environment Map (HDRI lighting only)
// ---------------------------------------------
rgbeLoader.load('./textures/environmentMap/2k.hdr', (environmentMap) => {
    environmentMap.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = environmentMap;
});

// ---------------------------------------------
// 5. Lighting
// ---------------------------------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.43);
directionalLight.position.set(1.35, 1.57, 0.9);
directionalLight.castShadow = true;
directionalLight.shadow.bias = 0;
directionalLight.shadow.radius = 1;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
scene.add(directionalLight);

const dirLightHelper = new THREE.DirectionalLightHelper(directionalLight, 1.5, 0xff0000);
dirLightHelper.visible = false;
scene.add(dirLightHelper);

// ---------------------------------------------
// 6. Materials (default)
// ---------------------------------------------
const defaultMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.4, metalness: 0.1 });

// ---------------------------------------------
// 8. Load & Animate GLB Model
// ---------------------------------------------
let mixer = null;
const clock = new THREE.Clock();
let button7Mesh = null;
let button7OriginalMaterial = null;
let button7Action = null;
let sceneAction = null;
let allClickableMeshes = [];
let modelFolder;
let loose20kgMesh = null;
let loose20kgOriginalMaterial = null;
let loose20kgGlowActive = true;

// --- Fetch WP settings (premium status, color, material) ---
let wpSettings = { premium: false, object244Color: '#0b3b7a', materialImage: null };

// UPDATED: centralized texture applier that neutralizes material tint
function applyTextureToMeshByName(textureUrl, meshName = 'Bumper_Plate001_COLOR_1001_0') {
    if (!window.model || !textureUrl) return;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous'); // UPDATED

    loader.load(
        textureUrl,
        (texture) => {
            if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace; // UPDATED
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();       // UPDATED
            texture.generateMipmaps = true;                                      // UPDATED
            texture.needsUpdate = true;

            let applied = false;
            window.model.traverse((child) => {
                if (child.isMesh && child.name === meshName) {
                    child.material.map = texture;

                    // UPDATED: neutralize any tinting so the texture shows true colors
                    if (child.material.color) child.material.color.set(0xffffff);
                    if (child.material.emissive) child.material.emissive.set(0x000000);
                    if ('vertexColors' in child.material) child.material.vertexColors = false;

                    child.material.needsUpdate = true;
                    applied = true;
                }
            });
            if (!applied) console.warn(`[WP3D] Mesh "${meshName}" not found to apply texture.`);
        },
        undefined,
        (err) => console.error('[WP3D] Texture load failed:', err)
    );
}

async function fetchWPSettingsAndApply() {
    try {
        const response = await fetch('https://michaels1255.sg-host.com/wp-json/wp3d/v1/settings', { credentials: 'omit' });
        const data = await response.json();
        wpSettings = data || {};
        console.log('WP Settings:', wpSettings);

        // UPDATED: if we already have the model, apply immediately
        if (wpSettings.materialImage) {
            applyTextureToMeshByName(wpSettings.materialImage, 'Bumper_Plate001_COLOR_1001_0');
        }
    } catch (err) {
        console.error('Error fetching WP settings:', err);
    }
}
window.addEventListener('DOMContentLoaded', fetchWPSettingsAndApply);

// Apply color to Object_244 if premium
function applyObject244ColorIfPremium(child) {
    if (child.name === 'Object_244' && wpSettings.premium && wpSettings.object244Color) {
        child.material.color.set(wpSettings.object244Color);
        child.material.needsUpdate = true;
    }
}

// (Removed the old applyBumperPlateMaterialImage; now handled centrally)

// Load the model
function loadOverheadPressModel() {
    const modelPath = 'https://FlexFrame.b-cdn.net/03.%20Overhead%20press%20GLB.glb';
    if (window.model && scene.children.includes(window.model)) {
        scene.remove(window.model);
    }
    allClickableMeshes = [];
    mixer = null;

    gltfLoader.load(
        modelPath,
        (gltf) => {
            window.model = gltf.scene;
            model = window.model;

            model.traverse((child) => {
                if (child.isMesh) {
                    allClickableMeshes.push(child);

                    // UPDATED: upgrade to MeshPhysicalMaterial and force neutral color to avoid tint
                    const oldMat = child.material;
                    child.material = new THREE.MeshPhysicalMaterial({
                        color: 0xffffff, // UPDATED: neutral base color
                        roughness: ('roughness' in oldMat) ? oldMat.roughness : 0.5,
                        metalness: ('metalness' in oldMat) ? oldMat.metalness : 0.0,
                        map: oldMat.map || null,
                        normalMap: oldMat.normalMap || null,
                        roughnessMap: oldMat.roughnessMap || null,
                        metalnessMap: oldMat.metalnessMap || null,
                        aoMap: oldMat.aoMap || null,
                        transmission: ('transmission' in oldMat) ? oldMat.transmission : 0.0,
                        ior: ('ior' in oldMat) ? oldMat.ior : 1.5,
                        clearcoat: 1.0,
                        clearcoatRoughness: 0.1,
                        envMap: scene.environment || null,
                        envMapIntensity: 1.0,
                        opacity: ('opacity' in oldMat) ? oldMat.opacity : 1.0,
                        transparent: oldMat.transparent || false,
                        side: ('side' in oldMat) ? oldMat.side : THREE.FrontSide,
                    });
                    if (child.material.emissive) child.material.emissive.set(0x000000); // UPDATED
                    if ('vertexColors' in child.material) child.material.vertexColors = false; // UPDATED
                    child.material.needsUpdate = true;

                    // Apply default material settings to Object_244
                    if (child.name === 'Object_244') {
                        child.material.metalness = 0;
                        child.material.roughness = 0.78;
                        child.material.clearcoat = 1;
                        child.material.clearcoatRoughness = 0.91;
                        child.material.opacity = 0.25;
                        child.material.transparent = true;
                        child.material.depthWrite = false;
                        child.material.alphaTest = 0.21;
                        child.material.premultipliedAlpha = false;
                        child.material.ior = 2.5;
                        child.material.transmission = 1;
                        child.material.side = THREE.FrontSide;
                        applyObject244ColorIfPremium(child);
                    }
                    if (child.name === 'button-7') {
                        button7Mesh = child;
                        button7OriginalMaterial = child.material.clone();
                    }
                    if (child.name === 'Loose_20kg013_COLOR_1_0') {
                        loose20kgMesh = child;
                        loose20kgOriginalMaterial = child.material.clone();
                    }
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // If settings already loaded and we have a material image, apply now
            if (wpSettings && wpSettings.materialImage) {
                applyTextureToMeshByName(wpSettings.materialImage, 'Bumper_Plate001_COLOR_1001_0');
            }

            // Apply default model transform if present
            if (defaultSettings.model) {
                if (defaultSettings.model.position) model.position.fromArray(defaultSettings.model.position);
                if (defaultSettings.model.rotation) model.rotation.set(defaultSettings.model.rotation[0], defaultSettings.model.rotation[1], defaultSettings.model.rotation[2]);
                if (defaultSettings.model.scale) model.scale.fromArray(defaultSettings.model.scale);
            } else {
                model.position.set(0, 0, 0);
            }
            scene.add(model);

            // lil-gui controls for model transform
            if (modelFolder) gui.removeFolder(modelFolder);
            modelFolder = gui.addFolder('Model Transform');
            const pos = model.position, rot = model.rotation, scl = model.scale;
            modelFolder.add(pos, 'x', -1, 1, 0.002).name('Position X');
            modelFolder.add(pos, 'y', -1, 1, 0.002).name('Position Y');
            modelFolder.add(pos, 'z', -1, 1, 0.002).name('Position Z');
            modelFolder.add(rot, 'x', -1, 1, 0.002).name('Rotation X');
            modelFolder.add(rot, 'y', -1, 1, 0.002).name('Rotation Y');
            modelFolder.add(rot, 'z', -1, 1, 0.002).name('Rotation Z');
            modelFolder.add(scl, 'x', 0.01, 1, 0.001).name('Scale X');
            modelFolder.add(scl, 'y', 0.01, 1, 0.001).name('Scale Y');
            modelFolder.add(scl, 'z', 0.01, 1, 0.001).name('Scale Z');
            modelFolder.open();

            // Smooth, continuous pulse for Loose_20kg013_COLOR_1_0 until clicked
            if (loose20kgMesh) {
                const originalEmissive = loose20kgMesh.material.emissive ? loose20kgMesh.material.emissive.clone() : new THREE.Color(0x000000);
                const originalEmissiveIntensity = loose20kgMesh.material.emissiveIntensity !== undefined ? loose20kgMesh.material.emissiveIntensity : 1;
                const flashColor = new THREE.Color(0xff0000);
                let startTime = null;
                const pulseDuration = (2000 / 3) * 1.5;
                function animatePulse(time) {
                    if (!loose20kgGlowActive) {
                        loose20kgMesh.material.emissive = originalEmissive;
                        loose20kgMesh.material.emissiveIntensity = originalEmissiveIntensity;
                        loose20kgMesh.material.needsUpdate = true;
                        return;
                    }
                    if (!startTime) startTime = time;
                    const elapsed = (time - startTime) % pulseDuration;
                    const t = elapsed / pulseDuration;
                    const ease = 0.2 * (0.5 - 0.5 * Math.cos(Math.PI * 2 * t));
                    loose20kgMesh.material.emissive = flashColor;
                    loose20kgMesh.material.emissiveIntensity = ease;
                    loose20kgMesh.material.needsUpdate = true;
                    requestAnimationFrame(animatePulse);
                }
                requestAnimationFrame(animatePulse);
            }

            if (Array.isArray(gltf.animations) && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                const mainClip = gltf.animations[0];
                let mainAction = mixer.clipAction(mainClip);
                mainAction.play();

                const animFolder = gui.addFolder('Animation');
                let isPlaying = true;
                let animTime = 0;
                const duration = mainClip.duration;

                animFolder.add({Play_Pause: () => {
                    isPlaying = !isPlaying;
                    mainAction.paused = !isPlaying;
                }}, 'Play_Pause').name('Play/Pause');
                animFolder.add({Scrub: 0}, 'Scrub', 0, duration, 0.01).name('Scrub').onChange(val => {
                    animTime = val;
                    mainAction.time = animTime;
                    mixer.update(0);
                    mainAction.paused = true;
                    isPlaying = false;
                });
                animFolder.open();

                const origTick = tick;
                tick = function() {
                    if (mixer && isPlaying) {
                        const delta = clock.getDelta();
                        mixer.update(delta);
                    }
                    controls.update();
                    renderer.render(scene, camera);
                    requestAnimationFrame(tick);
                };
            }
        },
        undefined,
        (error) => console.error('An error happened while loading the GLB model:', error)
    );
}

// Load model on startup
loadOverheadPressModel();

// ---------------------------------------------
// 9. Responsive Sizing
// ---------------------------------------------
const sizes = { width: window.innerWidth, height: window.innerHeight };
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ---------------------------------------------
// 10. Camera
// ---------------------------------------------
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.set(0.6497189477206843, 0.6200658000436491, -0.3267521547833198);
camera.rotation.set(-2.4803932140328504, 1.062666120524773, 2.544601201517163, 'XYZ');
scene.add(camera);

// ---------------------------------------------
// 11. Controls
// ---------------------------------------------
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(-0.040782704096354615, 0.38393067967272315, -0.02324773811580094);
controls.update();

let cameraLogTimeout = null;
controls.addEventListener('change', () => {
    if (cameraLogTimeout) clearTimeout(cameraLogTimeout);
    cameraLogTimeout = setTimeout(() => {
        console.log('Camera position:', camera.position);
        console.log('Camera rotation (radians):', camera.rotation);
        console.log('Controls target:', controls.target);
    }, 2000);
});

// Double-click focus
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
canvas.addEventListener('dblclick', (event) => {
    mouse.x = (event.clientX / sizes.width) * 2 - 1;
    mouse.y = -(event.clientY / sizes.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
        const target = intersects[0].point;
        controls.target.copy(target);
        controls.update();
    }
});

// Smooth target lerp on double-click
let targetLerpActive = false;
let targetLerpStart = null;
let targetLerpFrom = new THREE.Vector3();
let targetLerpTo = new THREE.Vector3();
let targetLerpDuration = 1.0;

canvas.addEventListener('dblclick', (event) => {
    mouse.x = (event.clientX / sizes.width) * 2 - 1;
    mouse.y = -(event.clientY / sizes.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
        const target = intersects[0].point;
        targetLerpFrom.copy(controls.target);
        targetLerpTo.copy(target);
        targetLerpStart = performance.now();
        targetLerpActive = true;
    }
});

function updateTargetLerp() {
    if (!targetLerpActive) return;
    const now = performance.now();
    const elapsed = (now - targetLerpStart) / 1000;
    let t = Math.min(elapsed / targetLerpDuration, 1);
    t = t * t * (3 - 2 * t);
    controls.target.lerpVectors(targetLerpFrom, targetLerpTo, t);
    controls.update();
    if (t >= 1) {
        controls.target.copy(targetLerpTo);
        controls.update();
        targetLerpActive = false;
    }
}

// ---------------------------------------------
// 12. Renderer
// ---------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// ---------------------------------------------
// 13. Animation Loop
// ---------------------------------------------
let tick = () => {
    updateTargetLerp();
    controls.update();
    if (mixer) {
        const delta = clock.getDelta();
        mixer.update(delta);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
};
tick();

// ---------------------------------------------
// Ground (Infinite Canvas & Solid)
// ---------------------------------------------
const fadeTexture = textureLoader.load('./textures/gradients/3.jpg');
fadeTexture.wrapS = THREE.ClampToEdgeWrapping;
fadeTexture.wrapT = THREE.ClampToEdgeWrapping;
fadeTexture.needsUpdate = true;

const circleRadius = 5;
const circleSegments = 64;
const circleGeometry = new THREE.CircleGeometry(circleRadius, circleSegments);
const planeGeometry = new THREE.PlaneGeometry(30, 30);

const solidGroundMaterial = new THREE.MeshStandardMaterial({ color: '#222222', roughness: 1, metalness: 0 });
const shadowGroundMaterial = new THREE.ShadowMaterial({ opacity: 0.4 });

const ground = new THREE.Mesh(circleGeometry, shadowGroundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
ground.receiveShadow = true;
ground.castShadow = false;
ground.visible = true;
scene.add(ground);

let useShadowMaterial = false;

let guiVisible = true;
const groundFolder = gui.addFolder('Ground Plane');
const groundParams = {
    mode: 'Solid',
    color: '#222222',
    roughness: 1,
    metalness: 0,
    shadowOpacity: 0.4,
    receiveShadow: true,
    castShadow: false,
    visible: true
};

groundFolder.add(groundParams, 'mode', ['Solid', 'Infinite Canvas']).name('Type').onChange((val) => {
    useShadowMaterial = (val === 'Infinite Canvas');
    if (useShadowMaterial) {
        ground.geometry = planeGeometry;
        ground.material = shadowGroundMaterial;
        ground.receiveShadow = true;
        ground.castShadow = false;
    } else {
        ground.geometry = circleGeometry;
        ground.material = solidGroundMaterial;
        ground.receiveShadow = groundParams.receiveShadow;
        ground.castShadow = groundParams.castShadow;
    }
    ground.material.needsUpdate = true;
    ground.geometry.computeBoundingSphere();
});
groundFolder.addColor(groundParams, 'color').name('Color').onChange((value) => {
    solidGroundMaterial.color.set(value);
    groundParams.color = value;
});
groundFolder.add(groundParams, 'roughness', 0, 1, 0.01).name('Roughness').onChange((v) => { solidGroundMaterial.roughness = v; });
groundFolder.add(groundParams, 'metalness', 0, 1, 0.01).name('Metalness').onChange((v) => { solidGroundMaterial.metalness = v; });
groundFolder.add(groundParams, 'shadowOpacity', 0, 1, 0.01).name('Shadow Opacity').onChange((v) => { shadowGroundMaterial.opacity = v; });
groundFolder.add(groundParams, 'receiveShadow').name('Receive Shadow').onChange((v) => { ground.receiveShadow = v; groundParams.receiveShadow = v; });
groundFolder.add(groundParams, 'castShadow').name('Cast Shadow').onChange((v) => { ground.castShadow = v; groundParams.castShadow = v; });
groundFolder.add(groundParams, 'visible').name('Visible').onChange((v) => { ground.visible = v; });
groundFolder.open();

// -----------------------------
// Lights GUI Controls
// -----------------------------
const lightsFolder = gui.addFolder('Lights');
const dirLightParams = {
    intensity: directionalLight.intensity,
    color: '#' + directionalLight.color.getHexString(),
    castShadow: directionalLight.castShadow,
    shadowBias: directionalLight.shadow.bias,
    shadowBlur: directionalLight.shadow.radius,
    shadowMapWidth: directionalLight.shadow.mapSize.width,
    shadowMapHeight: directionalLight.shadow.mapSize.height,
    posX: directionalLight.position.x,
    posY: directionalLight.position.y,
    posZ: directionalLight.position.z,
    showHelper: false
};
const dirFolder = lightsFolder.addFolder('Directional Light');
dirFolder.add(dirLightParams, 'intensity', 0, 5, 0.01).name('Intensity').onChange(v => { directionalLight.intensity = v; });
dirFolder.addColor(dirLightParams, 'color').name('Color').onChange(v => { directionalLight.color.set(v); });
dirFolder.add(dirLightParams, 'castShadow').name('Cast Shadow').onChange(v => { directionalLight.castShadow = v; });
dirFolder.add(dirLightParams, 'shadowBias', -0.05, 0.05, 0.0001).name('Shadow Bias').onChange(v => { directionalLight.shadow.bias = v; });
dirFolder.add(dirLightParams, 'shadowBlur', 0, 10, 0.1).name('Shadow Blur').onChange(v => { directionalLight.shadow.radius = v; });
dirFolder.add(dirLightParams, 'shadowMapWidth', 256, 4096, 1).name('Shadow Map Width').onChange(v => {
    directionalLight.shadow.mapSize.width = v; if (directionalLight.shadow.map) directionalLight.shadow.map.dispose();
});
dirFolder.add(dirLightParams, 'shadowMapHeight', 256, 4096, 1).name('Shadow Map Height').onChange(v => {
    directionalLight.shadow.mapSize.height = v; if (directionalLight.shadow.map) directionalLight.shadow.map.dispose();
});
dirFolder.add(dirLightParams, 'posX', -10, 10, 0.01).name('Position X').onChange(v => { directionalLight.position.x = v; });
dirFolder.add(dirLightParams, 'posY', -10, 10, 0.01).name('Position Y').onChange(v => { directionalLight.position.y = v; });
dirFolder.add(dirLightParams, 'posZ', -10, 10, 0.01).name('Position Z').onChange(v => { directionalLight.position.z = v; });
dirFolder.add(dirLightParams, 'showHelper').name('Show Helper').onChange(v => { dirLightHelper.visible = v; });
dirFolder.open();

const ambLightParams = { intensity: ambientLight.intensity, color: '#' + ambientLight.color.getHexString() };
const ambFolder = lightsFolder.addFolder('Ambient Light');
ambFolder.add(ambLightParams, 'intensity', 0, 2, 0.01).name('Intensity').onChange(v => { ambientLight.intensity = v; });
ambFolder.addColor(ambLightParams, 'color').name('Color').onChange(v => { ambientLight.color.set(v); });
ambFolder.open();

lightsFolder.open();

// Keyboard toggles & camera print
window.addEventListener('keydown', (event) => {
    if (event.key === 'h' || event.key === 'H') {
        guiVisible = !guiVisible;
        gui.domElement.style.display = guiVisible ? 'block' : 'none';
    }
    if (event.key === 'c' || event.key === 'C') {
        console.log('Camera position:', camera.position.toArray());
        console.log('Camera rotation (radians):', [camera.rotation.x, camera.rotation.y, camera.rotation.z]);
        console.log('Controls target:', controls.target.toArray());
    }
});

// Ensure GUI sits on top
const guiStyle = document.createElement('style');
guiStyle.innerHTML = `.dg.ac{z-index:9999!important;top:10px!important;right:10px!important;left:auto!important;display:block!important;}`;
document.head.appendChild(guiStyle);

// Helpers
function enableAllMeshShadows(model) {
    model.traverse((child) => {
        if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });
}

// Default scene settings
const defaultSettings = {
    "background": { "gradientTop": "#3865ad", "gradientBottom": "#6262cb", "gradientAlpha": 1 },
    "ground": { "mode": "Infinite Canvas", "color": "#222222", "roughness": 1, "metalness": 0, "shadowOpacity": 0.4, "receiveShadow": true, "castShadow": false, "visible": true },
    "directionalLight": { "intensity": 1.43, "color": "#ffffff", "castShadow": true, "shadowBias": 0, "shadowBlur": 1, "shadowMapWidth": 1024, "shadowMapHeight": 1024, "posX": 1.35, "posY": 1.57, "posZ": 0.9, "showHelper": false, "position": {"x":1.35,"y":1.57,"z":0.9} },
    "ambientLight": { "intensity": 0.4, "color": "#ffffff" },
    "camera": { "position": [0.7788427366535067,1.2796037689779762,1.203285858394318], "rotation": [-0.2879971241739497,0.44040948503657873,0.1256219950639305], "target": [0.1432008954563797,0.8965139871775103,-0.08991905215865692] },
    "model": { "position": [0,-0.02,0], "rotation": [0,0,0], "scale": [1,1,1] }
};

// Apply defaults
if (defaultSettings.background) {
    params.gradientTop = defaultSettings.background.gradientTop;
    params.gradientBottom = defaultSettings.background.gradientBottom;
    params.gradientAlpha = defaultSettings.background.gradientAlpha;
    updateGradientBackground();
}
if (defaultSettings.ground) {
    groundParams.mode = defaultSettings.ground.mode || 'Solid';
    if (gui && gui.__folders && gui.__folders['Ground Plane'] && gui.__folders['Ground Plane'].__controllers[0]) {
        gui.__folders['Ground Plane'].__controllers[0].setValue(defaultSettings.ground.mode || 'Solid');
    }
    solidGroundMaterial.color.set(defaultSettings.ground.color);
    groundParams.color = defaultSettings.ground.color;
    if (defaultSettings.ground.roughness !== undefined) solidGroundMaterial.roughness = defaultSettings.ground.roughness;
    if (defaultSettings.ground.metalness !== undefined) solidGroundMaterial.metalness = defaultSettings.ground.metalness;
    if (defaultSettings.ground.shadowOpacity !== undefined) shadowGroundMaterial.opacity = defaultSettings.ground.shadowOpacity;
    ground.receiveShadow = defaultSettings.ground.receiveShadow;
    ground.castShadow = defaultSettings.ground.castShadow;
    ground.visible = defaultSettings.ground.visible;
    groundParams.receiveShadow = defaultSettings.ground.receiveShadow;
    groundParams.castShadow = defaultSettings.ground.castShadow;
    groundParams.visible = defaultSettings.ground.visible;
    groundParams.shadowOpacity = defaultSettings.ground.shadowOpacity;
    if (defaultSettings.ground.mode === 'Infinite Canvas') {
        ground.geometry = planeGeometry;
        ground.material = shadowGroundMaterial;
        ground.receiveShadow = true;
        ground.castShadow = false;
        ground.visible = true;
    } else {
        ground.geometry = circleGeometry;
        ground.material = solidGroundMaterial;
        ground.visible = defaultSettings.ground.visible;
    }
    ground.material.needsUpdate = true;
    ground.geometry.computeBoundingSphere();
}
if (defaultSettings.light) {
    directionalLight.intensity = defaultSettings.light.intensity;
    directionalLight.color.set(defaultSettings.light.color);
    directionalLight.position.set(defaultSettings.light.position.x, defaultSettings.light.position.y, defaultSettings.light.position.z);
    directionalLight.castShadow = defaultSettings.light.castShadow;
    directionalLight.shadow.bias = defaultSettings.light.shadowBias;
    directionalLight.shadow.radius = defaultSettings.light.shadowBlur;
    directionalLight.shadow.mapSize.width = defaultSettings.light.shadowMapWidth;
    directionalLight.shadow.mapSize.height = defaultSettings.light.shadowMapHeight;
}
if (defaultSettings.camera) {
    camera.position.set(defaultSettings.camera.position[0], defaultSettings.camera.position[1], defaultSettings.camera.position[2]);
    camera.rotation.set(defaultSettings.camera.rotation[0], defaultSettings.camera.rotation[1], defaultSettings.camera.rotation[2]);
    controls.target.set(defaultSettings.camera.target[0], defaultSettings.camera.target[1], defaultSettings.camera.target[2]);
    controls.update();
}

// ---------------------------------------------
// Material Test GUI (for last clicked mesh)
// ---------------------------------------------
let lastClickedMesh = null;

function updateMeshTestParams(mesh) {
    lastClickedMesh = mesh;
    if (mesh && mesh.material) {
        meshTestParams.color = '#' + mesh.material.color.getHexString();
        meshTestParams.metalness = mesh.material.metalness !== undefined ? mesh.material.metalness : 0.5;
        meshTestParams.roughness = mesh.material.roughness !== undefined ? mesh.material.roughness : 0.5;
        meshTestParams.opacity = mesh.material.opacity !== undefined ? mesh.material.opacity : 1;
        meshTestParams.depthWrite = mesh.material.depthWrite !== undefined ? mesh.material.depthWrite : true;
        meshTestParams.alphaTest = mesh.material.alphaTest !== undefined ? mesh.material.alphaTest : 0;
        meshTestParams.premultipliedAlpha = mesh.material.premultipliedAlpha !== undefined ? mesh.material.premultipliedAlpha : false;
        mesh.renderOrder = 1;
    } else {
        meshTestParams.color = '#ffffff';
        meshTestParams.metalness = 0.5;
        meshTestParams.roughness = 0.5;
        meshTestParams.opacity = 1;
        meshTestParams.depthWrite = true;
        meshTestParams.alphaTest = 0;
        meshTestParams.premultipliedAlpha = false;
    }
}

const meshTestParams = {
    color: '#ffffff', metalness: 0.5, roughness: 0.5, opacity: 0.5, depthWrite: true,
    alphaTest: 0, premultipliedAlpha: false, ior: 1.0, transmission: 0.0,
    side: 'Front', clearcoat: 1.0, clearcoatRoughness: 0.1,
};
const meshTestFolder = gui.addFolder('Material Test');
meshTestFolder.addColor(meshTestParams, 'color').name('Color').onChange(val => { if (lastClickedMesh?.material) { lastClickedMesh.material.color.set(val); lastClickedMesh.material.needsUpdate = true; } });
meshTestFolder.add(meshTestParams, 'metalness', 0, 1, 0.01).name('Metalness').onChange(val => { if (lastClickedMesh?.material && 'metalness' in lastClickedMesh.material) { lastClickedMesh.material.metalness = val; lastClickedMesh.material.needsUpdate = true; } });
meshTestFolder.add(meshTestParams, 'roughness', 0, 1, 0.01).name('Roughness').onChange(val => { if (lastClickedMesh?.material && 'roughness' in lastClickedMesh.material) { lastClickedMesh.material.roughness = val; lastClickedMesh.material.needsUpdate = true; } });
meshTestFolder.add(meshTestParams, 'clearcoat', 0, 1, 0.01).name('Clearcoat').onChange(val => { if (lastClickedMesh?.material && 'clearcoat' in lastClickedMesh.material) { lastClickedMesh.material.clearcoat = val; lastClickedMesh.material.needsUpdate = true; } });
meshTestFolder.add(meshTestParams, 'clearcoatRoughness', 0, 1, 0.01).name('Clearcoat Roughness').onChange(val => { if (lastClickedMesh?.material && 'clearcoatRoughness' in lastClickedMesh.material) { lastClickedMesh.material.clearcoatRoughness = val; lastClickedMesh.material.needsUpdate = true; } });
meshTestFolder.add(meshTestParams, 'opacity', 0, 1, 0.01).name('Opacity').onChange(val => { if (lastClickedMesh?.material) { lastClickedMesh.material.opacity = val; lastClickedMesh.material.transparent = true; lastClickedMesh.material.needsUpdate = true; } });
meshTestFolder.add(meshTestParams, 'depthWrite').name('Depth Write').onChange(val => { if (lastClickedMesh?.material) { lastClickedMesh.material.depthWrite = val; lastClickedMesh.material.needsUpdate = true; } });
meshTestFolder.add(meshTestParams, 'alphaTest', 0, 0.5, 0.01).name('Alpha Test').onChange(val => { if (lastClickedMesh?.material) { lastClickedMesh.material.alphaTest = val; lastClickedMesh.material.needsUpdate = true; } });
meshTestFolder.add(meshTestParams, 'premultipliedAlpha').name('Premultiplied Alpha').onChange(val => { if (lastClickedMesh?.material) { lastClickedMesh.material.premultipliedAlpha = val; lastClickedMesh.material.needsUpdate = true; } });
meshTestFolder.add(meshTestParams, 'ior', 1.0, 2.5, 0.01).name('Refraction (IOR)').onChange(val => { if (lastClickedMesh?.material && 'ior' in lastClickedMesh.material) { lastClickedMesh.material.ior = val; lastClickedMesh.material.needsUpdate = true; } });
meshTestFolder.add(meshTestParams, 'transmission', 0, 1, 0.01).name('Transmission').onChange(val => { if (lastClickedMesh?.material && 'transmission' in lastClickedMesh.material) { lastClickedMesh.material.transmission = val; lastClickedMesh.material.transparent = true; lastClickedMesh.material.needsUpdate = true; } });
meshTestFolder.add(meshTestParams, 'side', ['Front','Back','Double']).name('Face Culling').onChange(val => {
    if (lastClickedMesh?.material) {
        lastClickedMesh.material.side = (val === 'Front') ? THREE.FrontSide : (val === 'Back') ? THREE.BackSide : THREE.DoubleSide;
        lastClickedMesh.material.needsUpdate = true;
    }
});
meshTestFolder.close();

canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(allClickableMeshes, true);
    if (intersects.length > 0) {
        const mesh = intersects[0].object;
        console.log('Clicked mesh properties:', mesh);
        if (mesh.name === 'Loose_20kg013_COLOR_1_0') loose20kgGlowActive = false;
        if (mesh.name === 'Loose_20kg013_COLOR_1_0' && sceneAction) { sceneAction.reset(); sceneAction.paused = false; sceneAction.play(); }
        updateMeshTestParams(mesh);
    }
});

// --- Test: Premium status banner (unchanged) ---
async function testPremiumStatus() {
    try {
        const response = await fetch('https://michaels1255.sg-host.com/wp-json/wp3d/v1/premium');
        const data = await response.json();
        console.log('WP Premium Status:', data);
        const statusDiv = document.createElement('div');
        statusDiv.textContent = 'WP Premium Status: ' + (data.premium ? 'Premium' : 'Free');
        statusDiv.style.position = 'fixed';
        statusDiv.style.top = '10px';
        statusDiv.style.right = '10px';
        statusDiv.style.background = '#fff';
        statusDiv.style.color = data.premium ? 'green' : 'red';
        statusDiv.style.padding = '8px 16px';
        statusDiv.style.zIndex = 9999;
        statusDiv.style.border = '2px solid ' + (data.premium ? 'green' : 'red');
        document.body.appendChild(statusDiv);
    } catch (err) {
        console.error('Error fetching WP premium status:', err);
    }
}
window.addEventListener('DOMContentLoaded', testPremiumStatus);
