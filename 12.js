import * as THREE from "three";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/controls/OrbitControls.js?module";
import { STLExporter } from "https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/exporters/STLExporter.js?module";
import * as BufferGeometryUtils from "https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/utils/BufferGeometryUtils.js?module";

// DOM
const canvas = document.getElementById("viewer");
const viewerBox = document.querySelector(".viewer-box");
const uploadInput = document.getElementById("upload");
const contrastInput = document.getElementById("contrast");
const thresholdInput = document.getElementById("threshold");
const unitSelect = document.getElementById("units");
const plateWidthInput = document.getElementById("plate-width");
const plateHeightInput = document.getElementById("plate-height");
const depthInput = document.getElementById("depth");
const pixelSizeInput = document.getElementById("pixel-size");
const invertCheckbox = document.getElementById("invert");
const frameCheckbox = document.getElementById("add-frame");
const hBridgeCheckbox = document.getElementById("h-bridge");
const vBridgeCheckbox = document.getElementById("v-bridge");
const hSpacingInput = document.getElementById("h-spacing");
const vSpacingInput = document.getElementById("v-spacing");
const downloadButton = document.getElementById("download");
const sizeLabel = document.getElementById("size-label");

// Three.js setup
const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
scene.add(new THREE.DirectionalLight(0xffffff, 0.9));

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
camera.position.set(150, 120, 150);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setClearColor(0x222426);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

function resizeRenderer() {
  const width = viewerBox.clientWidth;
  renderer.setSize(width, width, false);
  camera.aspect = 1;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resizeRenderer);
resizeRenderer();

function getUnitScale() {
  return { mm: 1, cm: 10, in: 25.4 }[unitSelect.value];
}

let mesh = null;
let currentImage = null;
let imageName = "stencil";

function processImage(image) {
  const maxDim = parseInt(pixelSizeInput.value);
  const scale = Math.min(maxDim / image.width, maxDim / image.height, 1);
  const width = Math.floor(image.width * scale);
  const height = Math.floor(image.height * scale);

  const canvas2D = document.createElement("canvas");
  canvas2D.width = width;
  canvas2D.height = height;
  const ctx = canvas2D.getContext("2d");
  ctx.drawImage(image, 0, 0, width, height);

  let imageData = ctx.getImageData(0, 0, width, height);
  let data = imageData.data;

  const contrast = parseFloat(contrastInput.value) / 100;
  const threshold = parseInt(thresholdInput.value);

  for (let i = 0; i < data.length; i += 4) {
    let avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    avg = (avg - 128) * contrast + 128;
    avg = Math.max(0, Math.min(255, avg));
    const binary = avg > threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = binary;
  }
  ctx.putImageData(imageData, 0, 0);
  generateGeometry(ctx.getImageData(0, 0, width, height));
}

function generateGeometry(imageData) {
  const depth = parseFloat(depthInput.value) * getUnitScale();
  const widthMM = parseFloat(plateWidthInput.value) * getUnitScale();
  const heightMM = parseFloat(plateHeightInput.value) * getUnitScale();
  const invert = invertCheckbox.checked;
  const addFrame = frameCheckbox.checked;
  const addHBridges = hBridgeCheckbox.checked;
  const addVBridges = vBridgeCheckbox.checked;
  const hSpacing = parseInt(hSpacingInput.value);
  const vSpacing = parseInt(vSpacingInput.value);

  const pixels = imageData.data;
  const pxWidth = imageData.width;
  const pxHeight = imageData.height;
  const cellW = widthMM / pxWidth;
  const cellH = heightMM / pxHeight;

  const geometries = [];

  for (let y = 0; y < pxHeight; y++) {
    for (let x = 0; x < pxWidth; x++) {
      const i = (y * pxWidth + x) * 4;
      const isDark = pixels[i] === 0;
      if ((isDark && !invert) || (!isDark && invert)) {
        const box = new THREE.BoxGeometry(cellW, depth, cellH).translate(
          (x - pxWidth / 2 + 0.5) * cellW,
          depth / 2,
          (pxHeight / 2 - y - 0.5) * cellH
        );
        geometries.push(box);
      }
    }
  }

  if (addHBridges) {
    for (let y = hSpacing; y < pxHeight; y += hSpacing) {
      const bridge = new THREE.BoxGeometry(
        widthMM,
        depth,
        0.2 * cellH
      ).translate(0, depth / 2, (pxHeight / 2 - y) * cellH);
      geometries.push(bridge);
    }
  }

  if (addVBridges) {
    for (let x = vSpacing; x < pxWidth; x += vSpacing) {
      const bridge = new THREE.BoxGeometry(
        0.2 * cellW,
        depth,
        heightMM
      ).translate((x - pxWidth / 2) * cellW, depth / 2, 0);
      geometries.push(bridge);
    }
  }

  if (addFrame) {
    const base = new THREE.BoxGeometry(
      widthMM,
      0.5 * getUnitScale(),
      heightMM
    ).translate(0, 0.25 * getUnitScale(), 0);
    geometries.push(base);
  }

  const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, false);

  if (mesh) scene.remove(mesh);
  mesh = new THREE.Mesh(
    mergedGeometry,
    new THREE.MeshStandardMaterial({ color: 0x2194f3, roughness: 0.5 })
  );
  scene.add(mesh);

  sizeLabel.textContent = `Size: ${widthMM.toFixed(1)} × ${heightMM.toFixed(
    1
  )} × ${depth.toFixed(1)} ${unitSelect.value}`;
}

function loadImage(file) {
  const img = new Image();
  const reader = new FileReader();
  reader.onload = (e) => (img.src = e.target.result);
  img.onload = () => {
    currentImage = img;
    imageName = file.name.replace(/\.[^.]+$/, "");
    processImage(img);
  };
  reader.readAsDataURL(file);
}

uploadInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) loadImage(file);
});

downloadButton.addEventListener("click", () => {
  if (!mesh) return;
  const exporter = new STLExporter();
  const stl = exporter.parse(mesh, { binary: false });
  const blob = new Blob([stl], { type: "model/stl" });

  const fname = `${imageName}_stencil_${unitSelect.value}_${plateWidthInput.value}x${plateHeightInput.value}_d${depthInput.value}.stl`;
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: fname,
  });
  a.click();
  URL.revokeObjectURL(a.href);
});

[
  contrastInput,
  thresholdInput,
  unitSelect,
  plateWidthInput,
  plateHeightInput,
  depthInput,
  pixelSizeInput,
  invertCheckbox,
  frameCheckbox,
  hBridgeCheckbox,
  vBridgeCheckbox,
  hSpacingInput,
  vSpacingInput,
].forEach((el) =>
  el.addEventListener("input", () => currentImage && processImage(currentImage))
);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
