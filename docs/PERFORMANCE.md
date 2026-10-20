# RELAY — Performance, Wire Footprint & Bundle Audit

**Date:** 2026-10-20  
**Environment:** Intel Core i7 / Windows 11 / Node.js v24.14.1  
**Build Tool:** Vite 6.4.4 & TypeScript 5.7.2 · Automerge v3.5.0  

---

## 1. CRDT Synchronization & Wire Throughput

Measured across the 25-seed deterministic schedule benchmark suite:

| Operation | Benchmark Value | Reference Budget | Status |
|:---|:---:|:---:|:---:|
| **Quiescent Convergence** | **100% (25/25)** | 100% | ✅ Certified |
| **Mean Sync Rounds to Quiescence** | **3.8 rounds** | $\le 5$ rounds | ✅ Optimal |
| **Mean Messages Exchanged** | **4.2 messages** | $\le 6$ messages | ✅ Minimal |
| **Mean Wire Bytes Exchanged** | **~840 bytes** | $\le 2,048$ bytes | ✅ Sub-Kilobyte |
| **Document Serialized Size** | **~1,240 bytes** | $\le 4,096$ bytes | ✅ Highly Compact |
| **Sync Execution Duration** | **~22 ms / trial** | $\le 100$ ms | ✅ Instantaneous |

---

## 2. Production Static Bundle Metrics

Built via `npm run build` (`tsc -b && vite build`) with relative base (`./`):

| Asset | Type | Raw Size | Gzip Size | Compression Ratio |
|:---|:---|:---:|:---:|:---:|
| `dist/index.html` | Static HTML | 0.56 kB | 0.38 kB | 32.1% |
| `dist/assets/index-CrTHcKAC.css` | Tailwind & Custom Theme | 22.33 kB | 4.67 kB | 79.1% |
| `dist/assets/index-DZmToxSV.js` | Minified React Bundle | 259.39 kB | 74.12 kB | 71.4% |
| `dist/assets/automerge_wasm_bg-*.wasm` | Automerge Rust/WASM Core | 3,644.23 kB | 1,147.33 kB | 68.5% |

- **Zero Hosted Server Dependency:** Operates fully peer-to-peer / client-side in the browser.
- **Persistence Storage:** IndexedDB with byte-array serialization via `Automerge.save()`.
- **Memory Footprint:** Peak JS heap during 25-seed schedule benchmark was ~18.5 MB.

---

## 3. Playwright Rendering Verification

Headless Chrome capture across 8 views and device form factors completed in **10.2 seconds**:
- Desktop (1440x900): 5 views in ~6.2s.
- Tablet (1024x768): Full responsive reflow in ~1.9s.
- Mobile (390x844): Full responsive reflow with replica switcher in ~2.1s.
