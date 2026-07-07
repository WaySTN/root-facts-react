# Root Fact App — Submission Requirements
> Dicoding — "Belajar Penerapan AI di Aplikasi Web"
> Jalur: **React** (wajib untuk kriteria Advance)

## 1. Deskripsi Aplikasi

Root Fact App adalah aplikasi web asisten yang:
- **Si Mata (Computer Vision)** — menggunakan kamera untuk mengenali jenis sayuran secara real-time via **TensorFlow.js** + model Teachable Machine yang sudah disediakan (`public/model/model.json`, `metadata.json`).
- **Si Otak (Generative AI)** — setelah sayuran dikenali, menghasilkan *fun fact* unik tentang sayuran tersebut menggunakan **Transformers.js** (text2text-generation, lokal/on-device).

Model sudah disediakan (18 label: Beetroot, Paprika, Cabbage, Carrot, Cauliflower, Chilli, Corn, Cucumber, eggplant, Garlic, Ginger, Lettuce, Onion, Peas, Potato, Turnip, Soybean, Spinach). Hasil deteksi tidak harus selalu akurat — fokus penilaian ada pada **alur kode**, bukan akurasi model.

## 2. Struktur Proyek (starter — React)

```
src/
  components/
    Header.jsx
    CameraSection.jsx
    InfoPanel.jsx
  hooks/
    useAppState.js        # sudah lengkap (reducer state global)
  services/
    CameraService.js      # TODO
    DetectionService.js   # TODO
    RootFactsService.js   # TODO
  utils/
    config.js             # sudah lengkap (APP_CONFIG, TONE_CONFIG)
    common.js
    ui.js
  App.jsx                  # TODO (wiring/orkestrasi)
  main.jsx
public/
  model/{model.json,metadata.json,weights.bin}
STUDENT.txt                # wajib diisi URL deployment
```

Semua bagian yang perlu dikerjakan sudah ditandai komentar `// TODO [Level] ...` di kode. Level menunjukkan tingkat pengerjaan minimal: `Basic`, `Skilled`, `Advance`.

## 3. Daftar TODO yang Harus Diselesaikan

### `services/CameraService.js`
- [ ] `loadCameras()` — enumerasi device kamera + tentukan constraints (Basic)
- [ ] `startCamera(selectedCameraId)` — mulai stream & pasang ke elemen `<video>` (Basic)
- [ ] `stopCamera()` — hentikan stream & bersihkan resource (Basic)
- [ ] `setFPS(fps)` — batasi frekuensi deteksi (Skilled)
- [ ] `isActive()`, `isReady()` — status check (Basic)

### `services/DetectionService.js`
- [ ] `loadModel()` — load model TF.js + metadata bersamaan (Basic); tambahkan **Backend Adaptif**: cek `navigator.gpu` → pakai WebGPU, fallback ke WebGL (Advance)
- [ ] `predict(imageElement)` — jalankan prediksi, kembalikan `{ label, confidence, isValid }`; gunakan `tf.tidy()`/`.dispose()` di setiap siklus prediksi (Advance — manajemen memori)
- [ ] `isLoaded()` — status check (Basic)

### `services/RootFactsService.js`
- [ ] `loadModel()` — inisialisasi pipeline `text2text-generation` dari Transformers.js; tambahkan Backend Adaptif WebGPU/WebGL (Advance)
- [ ] `setTone(tone)` — atur gaya bahasa (Advance — Persona Dinamis: Normal/Lucu/Profesional/Santai, sudah tersedia di `TONE_CONFIG`)
- [ ] `generateFacts(vegetableName)` — bangun prompt **berbahasa Inggris**, generate fun fact; atur parameter `temperature`, `max_new_tokens` (maks 150), `top_p`, `do_sample` (Skilled); terapkan tone ke prompt (Advance)
- [ ] `isReady()` — status check (Basic)

### `App.jsx`
- [ ] Inisialisasi ketiga service (`DetectionService`, `CameraService`, `RootFactsService`) saat mount, simpan ke state via `actions.setServices`
- [ ] Cleanup semua resource saat unmount
- [ ] Loop deteksi (interval sesuai `detectionRetryInterval`), update `appState`/`detectionResult`, lalu trigger `generateFacts` saat deteksi valid (pakai `analyzingDelay`/`factsGenerationDelay` dari `config.js`)
- [ ] Fungsi start/stop kamera dihubungkan ke `CameraSection`
- [ ] Fungsi ganti tone (`setCurrentTone` + `generator.setTone`) — Advance
- [ ] Fungsi copy-to-clipboard untuk fun fact — Skilled (`navigator.clipboard.writeText(...)`)
- [ ] Tampilkan status loading model (contoh: "Menunggu Model... 42%") — Skilled

> `components/Header.jsx`, `CameraSection.jsx`, `InfoPanel.jsx` sudah menerima props yang relevan — cek apakah perlu tambahan UI (dropdown tone, tombol copy, indikator FPS/loading) sesuai level yang ditarget.

## 4. Kriteria Penilaian (0–4 poin per kriteria, minimal 2 poin, tidak boleh ada 0)

### Kriteria 1 — Deteksi Sayuran (Computer Vision)
| Level | Syarat |
|---|---|
| Rejected (0) | Gagal akses kamera / model gagal dimuat / label tidak tampil |
| Basic (2) | Kamera streaming aktif, model TF.js dimuat, label sayuran tampil otomatis |
| Skilled (3) | + FPS limit yang bisa dikonfigurasi + indikator loading/persentase saat init |
| Advance (4) | + Backend Adaptif (`navigator.gpu` → WebGPU, fallback WebGL) + `tf.tidy()`/`.dispose()` konsisten + arsitektur React/MVP |

### Kriteria 2 — Generative AI Fun Fact
| Level | Syarat |
|---|---|
| Rejected (0) | Fun fact statis / tidak pakai Transformers.js / tidak tampil di UI |
| Basic (2) | Label dikirim dinamis ke prompt AI, fun fact unik tampil sesuai sayuran |
| Skilled (3) | + Copy to Clipboard + parameter `temperature`, `max_new_tokens`, `top_p`, `do_sample` diatur |
| Advance (4) | + Persona Dinamis (pilihan gaya bahasa via dropdown/radio) + Backend Adaptif WebGPU/WebGL |

### Kriteria 3 — Offline Capability & Deployment
| Level | Syarat |
|---|---|
| Rejected (0) | Tidak bisa diakses di Netlify / manifest tidak valid / blank/404 saat offline / URL tidak ada di STUDENT.txt |
| Basic (2) | Deploy ke Netlify + Web App Manifest & Service Worker (Workbox) + precaching aset inti (HTML/CSS/JS) + URL di STUDENT.txt |
| Skilled (3) | + konfigurasi linter (ESLint) + app dapat diinstal (tombol Install/Add to Home Screen muncul) |
| Advance (4) | + Precaching berkas model AI (`.json`, `.bin`) di `sw.js` sehingga deteksi tetap jalan tanpa internet |

**Nilai Akhir = Total Poin / 3 Kriteria** → skala: <1 Rejected, 1–<2 Bintang 2 (D), 2–<3 Bintang 3 (C), 3–<4 Bintang 4 (B), 4 Bintang 5 (A/Advanced).

## 5. Catatan Teknis Penting
- Gunakan versi TF.js yang sama dengan modul; jika update, pin ke `@tensorflow/tfjs@4.22.0` (CDN: `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js`) — di proyek ini sudah via npm (`@tensorflow/tfjs`, `@tensorflow/tfjs-backend-webgpu` sudah ada di `package.json`).
- Backend Adaptif butuh import eksplisit `@tensorflow/tfjs-backend-webgpu`, kalau tidak akan error saat `tf.setBackend('webgpu')`.
- Prompt untuk Transformers.js **wajib berbahasa Inggris** (keterbatasan konteks model).
- `max_new_tokens` maksimal **150** agar tidak freeze di sisi klien.
- Untuk model ringan, gunakan opsi `{ dtype: "q4" }` saat load pipeline agar tidak mengunduh model versi full.
- Copy to clipboard: `await navigator.clipboard.writeText(funFactText)`.
- Pastikan Service Worker terdaftar & aktif (cek tab Application → Service Workers di DevTools) serta cache tersimpan di Cache Storage sebelum submit.
- Deploy ke **Netlify**, isi URL hasil deploy ke `STUDENT.txt`.
- Uji deteksi di tempat terang dengan latar polos agar hasil lebih stabil.

## 6. Referensi Aplikasi Contoh
- Basic: https://root-facts-basic.netlify.app/
- Skilled: https://root-facts-skilled.netlify.app/
- Advanced: https://root-facts-advance.netlify.app/

## 7. Target Pengerjaan Saya
> (isi sesuai target — contoh default di bawah, sesuaikan sebelum dipakai AI agent)
- Target level: **Advance (Bintang 5)** di ketiga kriteria
- Arsitektur: React (sesuai starter project ini)
- Prioritas pengerjaan: (1) CameraService → (2) DetectionService → (3) RootFactsService → (4) wiring App.jsx → (5) UI tambahan (tone dropdown, copy button, FPS control, loading %) → (6) PWA/offline & deploy Netlify → (7) ESLint config → (8) isi STUDENT.txt
