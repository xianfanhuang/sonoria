# Sonoria Chaos V2 🎵🌪️

## Project Overview

**Sonoria Chaos V2** is a high-performance, 3D music visualizer built with **React 19**, **Three.js**, and **TypeScript**. It visualizes audio frequencies using the **Lorenz Attractor** mathematical model—a system of ordinary differential equations known for generating chaotic, butterfly-shaped fractal patterns.

This project focuses on aesthetic fidelity and performance, utilizing **Web Workers** to offload heavy mathematical computations from the main thread, ensuring the UI remains responsive even when rendering up to 50,000 particles.

---

## 🛠 Tech Stack

- **Core:** React 19, TypeScript
- **3D Graphics:** Three.js, @react-three/fiber (R3F)
- **Post-Processing:** @react-three/postprocessing (Bloom effects)
- **Styling:** Tailwind CSS (configured via CDN/JS object for portability)
- **Audio:** Native Web Audio API (`AudioContext`, `AnalyserNode`)
- **Concurrency:** Native Web Workers (Blob-based)
- **Icons:** Lucide React

---

## 📂 Project Structure

```text
/
├── index.html              # Entry point (contains ImportMap & Tailwind Config)
├── index.tsx               # React Root mounting
├── App.tsx                 # Main application state & layout
├── constants.ts            # Global configuration (Lorenz params, Colors)
├── types.ts                # TypeScript interfaces
├── metadata.json           # Application metadata & permissions
│
├── components/
│   ├── Visualizer.tsx      # R3F component rendering the point cloud
│   └── UI/
│       ├── ControlBar.tsx  # Playback controls & File input
│       ├── SidePanel.tsx   # "Chaos Lab" settings panel
│       └── Playlist.tsx    # Queue management drawer
│
└── services/
    ├── audioEngine.ts      # Singleton class managing AudioContext & Frequency data
    └── workerBuilder.ts    # Blob-based Web Worker for math calculations
```

---

## 🚀 Architecture & Logic

### 1. The Lorenz Attractor (Math)
The visualizer calculates the next position of a point $(x, y, z)$ based on:
- $\frac{dx}{dt} = \sigma (y - x)$
- $\frac{dy}{dt} = x (\rho - z) - y$
- $\frac{dz}{dt} = xy - \beta z$

**Key Parameters (`constants.ts`):**
- **Rho ($\rho$):** Controls the complexity/symmetry.
- **Sigma ($\sigma$):** Controls the chaos/spread.
- **Beta ($\beta$):** Controls the height of the attractor.

### 2. The Worker Pattern (`workerBuilder.ts`)
Calculating these positions for 50,000 points *every frame* is too heavy for the JavaScript main thread.
- **Implementation:** We create a Web Worker from a stringified function (Blob URL).
- **Cycle:**
    1.  `Visualizer.tsx` sends Audio Data (Bass, Mid, High) + Config to Worker.
    2.  Worker calculates new coordinates for the trail.
    3.  Worker returns a `Float32Array` of positions.
    4.  `Visualizer.tsx` updates the BufferGeometry attributes.

### 3. Audio Reactivity
Audio reactivity is achieved by modulating math parameters dynamically in the Worker:
- **Bass:** Increases the time step (`dt`), making the simulation run "faster".
- **Mid:** Modifies Rho, expanding the attractor.
- **High:** Adds "turbulence" (jitter) to the points.
- **Visuals:** The particle cloud scales/pulses based on Bass energy in the main thread.

---

## 💻 Development Setup

### Prerequisites
- Node.js (v18+)
- A modern browser (Chrome/Edge/Safari/Firefox) with WebGL support.

### Installation
*(Assuming migration to a standard Vite environment)*

1.  **Clone the repository**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run Development Server:**
    ```bash
    npm run dev
    ```

### Browser-Native (Current Setup)
The project currently uses `esm.sh` imports defined in `index.html`. You can run this directly using a static file server:
```bash
npx serve .
```

---

## 🔧 Configuration

You can tweak the core experience in `constants.ts`:

- `MAX_POINTS`: Total particles (Default: 50,000). Reduce for mobile performance.
- `LORENZ.STEPS`: How many calculation steps per frame. Higher = longer trails, more CPU usage.
- `SMOOTHING`: FFT smoothing (0.0 - 1.0). Lower = snappier, Higher = smoother.

---

## ⚠️ Known Issues & Constraints

1.  **iOS Audio Policy:**
    - iOS requires a user interaction (tap) to unlock the `AudioContext`. The `AudioEngine` handles this, but autoplay on load is often blocked by Safari.
2.  **File Permissions:**
    - The file input is configured to accept `.mp3, .wav, .m4a, .flac`. iOS Files app can be strict; `audio/*` is not always sufficient.
3.  **High-DPI Screens:**
    - Bloom effects can be expensive on 4K/Retina screens.

---

## 🤝 Contribution Guidelines

1.  **Performance First:** Avoid complex calculations in `useFrame` on the main thread. Move math to the Worker.
2.  **State Management:** Keep `App.tsx` clean. Use refs for mutable data that doesn't trigger re-renders (like Audio Analysis data).
3.  **Styling:** Use Tailwind utility classes. For glassmorphism, use the custom `bg-glass-bg` utilities defined in `index.html`.

---

## 📜 License

Internal / Proprietary.
