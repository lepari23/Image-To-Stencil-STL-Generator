# Image-to-Stencil (STL) Generator

**Live site:** [Image-to-Stencil Generator](https://lepari23.github.io/Image-To-Stencil-STL-Generator)

An entirely front-end tool that turns a transparent images into a 3D printable stencil, stamp or t-shirt graphic (for the industrious/patient).

## ✨ Features
| What you can do | Details |
|-----------------|---------|
| **Upload image** | Any raster up to ~4 K × 4 K – auto-downsized for speed |
| **Auto aspect-ratio** | Width is user-defined; height auto-follows the image ratio |
| **Units** | mm · cm · inches – STL is scaled accordingly |
| **Pixel size control** | Choose mm / pixel for finer or chunkier detail |
| **Invert mode** | Cut-out (true stencil) or raised (emboss) |
| **Bridging grid** | Independent vertical / horizontal webs with custom spacing |
| **Add solid base** | Toggles “stamp mode” (plate underneath, adjustable depth) |
| **Live 3-D preview** | Drag-orbit, zoom, pan (Three.js) |
| **Export STL** | Filenames include image name, units, size & stamp flag |

## 🖨️ Typical workflow
1. **Upload** a transparent PNG logo.  
2. Set *Target width* (e.g. 60 mm) → height updates automatically.  
3. Pick a **pixel size** – `1 mm` = fine detail, `2 mm` = chunkier.  
4. Enable **bridges** if your design has floating islands.  
5. *(Optional)* tick **Add solid base** for a rubber-stamp style plate.  
6. Click **Download STL** → slice & print.

## 🛠 Tech stack
* **three.js** for realtime mesh + STL export  
* Pure browser ES-modules from CDN – no build step  
* Vanilla JS, HTML, and CSS (Flexbox layout)

## 🤝 Contributing
Bug reports, ideas, or PRs are welcome – open an Issue first so we can discuss.

---

© 2025 lepari23 – MIT License  
*Use freely. Attribution appreciated but not required.*
