import * as THREE from "three";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/controls/OrbitControls.js?module";
import { STLExporter } from "https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/exporters/STLExporter.js?module";
import * as BufferGeometryUtils from "https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/utils/BufferGeometryUtils.js?module";

/* ---------- DOM ---------- */
const cvs = document.getElementById("viewer");
const viewerBox = document.querySelector(".viewer-box");
const up = document.getElementById("upload");
const contrast = document.getElementById("contrast");
const thr = document.getElementById("threshold");
const unitSel = document.getElementById("units");
const wInput = document.getElementById("plate-width");
const pxInput = document.getElementById("pixel-size");
const depthIn = document.getElementById("depth");
const invert = document.getElementById("invert");
const frameChk = document.getElementById("add-frame");
const hChk = document.getElementById("h-bridge"),
  hStep = document.getElementById("h-spacing");
const vChk = document.getElementById("v-bridge"),
  vStep = document.getElementById("v-spacing");
const dlBtn = document.getElementById("download");
const sizeLbl = document.getElementById("size-label");

/* ---------- Three ---------- */
const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
scene.add(new THREE.DirectionalLight(0xffffff, 0.9));
const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
cam.position.set(120, 120, 120);
cam.lookAt(0, 0, 0);
const ren = new THREE.WebGLRenderer({ canvas: cvs, antialias: true });
ren.setClearColor(0x222426);
const ctrl = new OrbitControls(cam, ren.domElement);
ctrl.enableDamping = true;
function resize() {
  const w = Math.min(viewerBox.clientWidth, 400);
  ren.setSize(w, w, false);
  cam.aspect = 1;
  cam.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

/* ---------- helpers ---------- */
const mm = () => ({ mm: 1, cm: 10, in: 25.4 }[unitSel.value]);
let imgAspect = 1,
  currentImg = null,
  imageName = "stencil",
  mesh = null;

const REACTIVE = [
  contrast,
  thr,
  unitSel,
  wInput,
  pxInput,
  depthIn,
  invert,
  frameChk,
  hChk,
  vChk,
  hStep,
  vStep,
];

/* ---------- load image ---------- */
up.onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  imageName = f.name.replace(/\.[^.]+$/, "");
  const img = new Image();
  img.onload = () => {
    currentImg = img;
    imgAspect = img.height / img.width;
    build();
  };
  const r = new FileReader();
  r.onload = (ev) => (img.src = ev.target.result);
  r.readAsDataURL(f);
};

/* ---------- build geometry ---------- */
function build() {
  if (!currentImg) return;
  /* detail control */
  const plateWmm = +wInput.value * mm();
  const cellMM = +pxInput.value; // mm per pixel square
  const cols = Math.max(4, Math.round(plateWmm / cellMM));
  const plateHmm = cols * imgAspect * cellMM;
  const rows = Math.round(cols * imgAspect);

  /* draw mask bitmap */
  const ctx = Object.assign(document.createElement("canvas"), {
    width: cols,
    height: rows,
  }).getContext("2d");
  ctx.drawImage(currentImg, 0, 0, cols, rows);
  const d = ctx.getImageData(0, 0, cols, rows);
  const con = parseFloat(contrast.value) / 100,
    T = parseInt(thr.value);
  for (let i = 0; i < d.data.length; i += 4) {
    let v = (d.data[i] + d.data[i + 1] + d.data[i + 2]) / 3;
    d.data[i] =
      d.data[i + 1] =
      d.data[i + 2] =
        (v - 128) * con + 128 > T ? 255 : 0;
  }
  ctx.putImageData(d, 0, 0);

  /* generate voxels / webs */
  const depth = +depthIn.value * mm();
  const g = [],
    inv = invert.checked;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dark = d.data[(y * cols + x) * 4] === 0;
      if ((dark && !inv) || (!dark && inv)) {
        g.push(
          new THREE.BoxGeometry(cellMM, depth, cellMM).translate(
            (x - cols / 2 + 0.5) * cellMM,
            depth / 2,
            (rows / 2 - y - 0.5) * cellMM
          )
        );
      }
    }
  }
  const addWeb = (x, z, len, h) =>
    g.push(
      (h
        ? new THREE.BoxGeometry(len, 0.3 * mm(), 0.3 * mm())
        : new THREE.BoxGeometry(0.3 * mm(), 0.3 * mm(), len)
      ).translate(x, 0.15 * mm(), z)
    );

  if (hChk.checked) {
    const step = Math.max(1, parseInt(hStep.value));
    for (let y = step; y < rows; y += step)
      addWeb(0, (rows / 2 - y - 0.5) * cellMM, cols * cellMM, true);
  }
  if (vChk.checked) {
    const step = Math.max(1, parseInt(vStep.value));
    for (let x = step; x < cols; x += step)
      addWeb((x - cols / 2 + 0.5) * cellMM, 0, rows * cellMM, false);
  }
  if (frameChk.checked) {
    const baseTh = 0.5 * mm();
    g.forEach((b) => b.translate(0, baseTh, 0));
    g.push(
      new THREE.BoxGeometry(plateWmm, baseTh, plateHmm).translate(
        0,
        baseTh / 2,
        0
      )
    );
  }

  /* merge & render */
  mesh && scene.remove(mesh);
  mesh = new THREE.Mesh(
    BufferGeometryUtils.mergeGeometries(g, false),
    new THREE.MeshStandardMaterial({ color: 0x2194f3 })
  );
  scene.add(mesh);

  sizeLbl.textContent = `Size: ${plateWmm.toFixed(1)} × ${depth.toFixed(
    1
  )} × ${plateHmm.toFixed(1)} ${unitSel.value}`;
}

/* ---------- reactive inputs ---------- */
REACTIVE.forEach((el) => el.addEventListener("input", build));

/* ---------- download ---------- */
dlBtn.onclick = () => {
  if (!mesh) return;
  const stl = new STLExporter().parse(mesh, { binary: false });
  const name = `${imageName}_${unitSel.value}_${wInput.value}x${(
    wInput.value * imgAspect
  ).toFixed(1)}_d${depthIn.value}${frameChk.checked ? "_stamp" : ""}.stl`;
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([stl], { type: "model/stl" })),
    download: name,
  });
  a.click();
  URL.revokeObjectURL(a.href);
};

/* ---------- render loop ---------- */
(function anim() {
  requestAnimationFrame(anim);
  ctrl.update();
  ren.render(scene, cam);
})();
