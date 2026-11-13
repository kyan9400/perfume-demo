// Photorealistic 3D perfume bottles for the hero (three.js r170, bundled in ./vendor).
import * as THREE from "three";
import { RoomEnvironment } from "./vendor/addons/RoomEnvironment.js";
import { RoundedBoxGeometry } from "./vendor/addons/RoundedBoxGeometry.js";

const canvas = document.getElementById("bottle3d");
const wrap = canvas.parentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
} catch {
  throw new Error("WebGL unavailable: the SVG bottle stays visible");
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
// Glass refracts what is behind it, so the scene needs a real (page-coloured) background.
scene.background = new THREE.Color(0x0d0907);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
camera.position.set(0, 0.35, 8.2);

// Studio reflections, warmed up a little
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
scene.environmentIntensity = 0.75;

const key = new THREE.DirectionalLight(0xffe2b0, 2.6);
key.position.set(3, 5, 4);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.radius = 6;
key.shadow.camera.left = -3; key.shadow.camera.right = 3;
key.shadow.camera.top = 3; key.shadow.camera.bottom = -3;
scene.add(key);
const rim = new THREE.DirectionalLight(0xffb36b, 3.2);
rim.position.set(-4, 2.5, -3);
scene.add(rim);
scene.add(new THREE.AmbientLight(0x2a1a0c, 0.6));

// ---------- materials ----------
const glass = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.35, ior: 1.5,
  clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 1, envMapIntensity: 1.1,
  attenuationColor: new THREE.Color(0xfff4dd), attenuationDistance: 4,
});
const gold = new THREE.MeshPhysicalMaterial({ color: 0xe0b45c, metalness: 1, roughness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.1, envMapIntensity: 1.6 });
const goldDark = new THREE.MeshPhysicalMaterial({ color: 0xa8772e, metalness: 1, roughness: 0.32, envMapIntensity: 1.3 });
const oil = (hex, glow) => new THREE.MeshPhysicalMaterial({
  color: hex, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05,
  emissive: glow, emissiveIntensity: 0.35, envMapIntensity: 0.8,
});

// Label texture (drawn after fonts load so the Arabic is crisp)
function makeLabel(ar, latin) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 360;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(14,9,5,0.94)";
  g.beginPath(); g.roundRect(8, 8, 496, 344, 28); g.fill();
  g.strokeStyle = "#e8c478"; g.lineWidth = 5; g.stroke();
  g.strokeStyle = "rgba(232,196,120,.45)"; g.lineWidth = 2;
  g.beginPath(); g.roundRect(26, 26, 460, 308, 20); g.stroke();
  const grad = g.createLinearGradient(0, 80, 0, 240);
  grad.addColorStop(0, "#fff0c4"); grad.addColorStop(1, "#c79443");
  g.fillStyle = grad; g.textAlign = "center";
  g.font = "700 150px Amiri, serif"; g.fillText(ar, 256, 215);
  g.fillStyle = "#b9a88d"; g.font = "600 30px Manrope, sans-serif";
  g.letterSpacing = "10px"; g.fillText(latin, 256, 300);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// ---------- a bottle ----------
function bottle({ oilColor, glow, ar, latin, scale = 1 }) {
  const group = new THREE.Group();
  const W = 1.5, H = 1.9, D = 0.78;

  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 8, 0.2), glass);
  body.castShadow = true;
  group.add(body);

  // thick glass base, like real perfume bottles
  const base = new THREE.Mesh(new RoundedBoxGeometry(W * 0.96, 0.32, D * 0.94, 6, 0.14), glass);
  base.position.y = -H / 2 + 0.17;
  group.add(base);

  // perfume oil (filled to ~70%)
  const fill = 0.66;
  const liquid = new THREE.Mesh(new RoundedBoxGeometry(W * 0.86, H * fill, D * 0.72, 6, 0.14), oil(oilColor, glow));
  liquid.position.y = -H / 2 + 0.32 + (H * fill) / 2;
  group.add(liquid);

  // gold neck + collar
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.26, 48), gold);
  neck.position.y = H / 2 + 0.12;
  group.add(neck);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.045, 16, 64), goldDark);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = H / 2 + 0.25;
  group.add(collar);

  // faceted dome cap (8 facets catch the light like cut metal)
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const r = 0.42 * Math.sin(Math.PI * Math.min(1, t * 1.05)) * (1 - t * 0.55) + (t < 0.05 ? 0.3 : 0);
    pts.push(new THREE.Vector2(Math.max(0.001, r), t * 1.05));
  }
  pts.push(new THREE.Vector2(0.001, 1.12));
  const cap = new THREE.Mesh(new THREE.LatheGeometry(pts, 8), gold);
  cap.position.y = H / 2 + 0.28;
  cap.castShadow = true;
  group.add(cap);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 16), gold);
  finial.position.y = H / 2 + 0.28 + 1.14;
  group.add(finial);

  // label on the front face
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.86, 0.6),
    new THREE.MeshPhysicalMaterial({ map: makeLabel(ar, latin), roughness: 0.45, metalness: 0.1, clearcoat: 0.4, transparent: true }),
  );
  label.position.set(0, -0.12, D / 2 + 0.003);
  group.add(label);

  group.scale.setScalar(scale);
  return group;
}

// ---------- scene ----------
await document.fonts.ready.catch(() => {});

const hero = bottle({ oilColor: 0xd98a1f, glow: 0x6b2a00, ar: "عود", latin: "OUD · 5 ML" });
hero.position.y = 0.05;
scene.add(hero);

const rose = bottle({ oilColor: 0xc4505a, glow: 0x4a0812, ar: "ورد", latin: "ROSE", scale: 0.62 });
rose.position.set(-1.85, -0.42, -1.6);
rose.rotation.y = 0.5;
scene.add(rose);

const musk = bottle({ oilColor: 0xead9b8, glow: 0x3a2c18, ar: "مسك", latin: "MUSK", scale: 0.55 });
musk.position.set(1.8, -0.5, -1.9);
musk.rotation.y = -0.55;
scene.add(musk);

// floor that only shows shadows
const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.ShadowMaterial({ opacity: 0.38 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.08;
floor.receiveShadow = true;
scene.add(floor);
[hero, rose, musk].forEach((b) => b.traverse((o) => o.isMesh && (o.castShadow = true)));

// golden dust
const N = 260;
const pos = new Float32Array(N * 3);
for (let i = 0; i < N; i++) {
  pos[i * 3] = (Math.random() - 0.5) * 7;
  pos[i * 3 + 1] = Math.random() * 5 - 1.5;
  pos[i * 3 + 2] = (Math.random() - 0.5) * 4;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
const dot = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,226,160,1)"); gr.addColorStop(1, "rgba(255,226,160,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.05, map: dot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
scene.add(dust);

// ---------- sizing, input, loop ----------
function resize() {
  const w = wrap.clientWidth, h = wrap.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.position.z = w / h < 0.9 ? 10.2 : 8.2;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(wrap);
resize();

const target = { x: 0, y: 0 };
addEventListener("pointermove", (e) => {
  target.x = (e.clientX / innerWidth - 0.5) * 2;
  target.y = (e.clientY / innerHeight - 0.5) * 2;
}, { passive: true });
addEventListener("deviceorientation", (e) => {
  if (e.gamma == null) return;
  target.x = Math.max(-1, Math.min(1, e.gamma / 30));
  target.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
}, { passive: true });

let visible = true;
new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(wrap);

const clock = new THREE.Clock();
const look = new THREE.Vector3(0, 0.2, 0);
function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  const t = clock.getElapsedTime();
  if (!reduce) {
    hero.rotation.y = Math.sin(t * 0.35) * 0.55 + target.x * 0.35;
    hero.rotation.x = target.y * 0.08;
    hero.position.y = 0.05 + Math.sin(t * 1.1) * 0.06;
    rose.position.y = -0.42 + Math.sin(t * 0.9 + 1) * 0.04;
    musk.position.y = -0.5 + Math.sin(t * 0.8 + 2) * 0.04;
    camera.position.x += (target.x * 0.35 - camera.position.x) * 0.04;
    camera.position.y += (0.35 - target.y * 0.2 - camera.position.y) * 0.04;
    const p = dustGeo.attributes.position;
    for (let i = 0; i < N; i++) {
      let y = p.getY(i) + 0.0025;
      if (y > 3.5) y = -1.5;
      p.setY(i, y);
      p.setX(i, p.getX(i) + Math.sin(t * 0.5 + i) * 0.0008);
    }
    p.needsUpdate = true;
  }
  camera.lookAt(look);
  renderer.render(scene, camera);
}
frame();
document.documentElement.classList.add("webgl");
