# RootFacts 🥕

RootFacts adalah aplikasi web interaktif berbasis **React + Vite** yang menggunakan kecerdasan buatan (AI) secara lokal (*on-device AI*) untuk mendeteksi berbagai jenis sayuran secara real-time dan menghasilkan fakta menarik (*fun fact*) unik berdasarkan persona/gaya bahasa pilihan pengguna. 

Aplikasi ini dirancang sebagai Progressive Web App (PWA) yang tangguh dan memiliki kemampuan penuh untuk berjalan tanpa koneksi internet (*offline capability*).

---

## 🌟 Fitur Utama

- **👁️ Deteksi Sayuran Real-time (Computer Vision):** Menggunakan **TensorFlow.js** dan model klasifikasi gambar untuk mengenali hingga 18 jenis sayuran secara langsung melalui kamera perangkat.
- **🧠 Generasi Fakta Dinamis (On-Device GenAI):** Memanfaatkan **Transformers.js** dengan model `LaMini-Flan-T5-77M` versi quantized (`q4`) yang berjalan sepenuhnya di browser pengguna tanpa membutuhkan API key atau koneksi server eksternal.
- **🎭 Persona Dinamis:** Memungkinkan pengguna memilih gaya bahasa keluaran teks fakta menarik (Normal, Lucu, Profesional, Santai) yang memengaruhi prompt instruksi AI secara nyata.
- **⚡ Backend Adaptif:** Sistem secara otomatis mendeteksi kapabilitas perangkat dan memilih akselerasi hardware terbaik (WebGPU -> WebGL -> WASM) secara aman untuk performa optimal.
- **📶 PWA & Offline Capability:** Terintegrasi dengan Service Worker (Workbox) untuk mem-precache seluruh aset inti web serta berkas model AI, sehingga aplikasi tetap berfungsi penuh meskipun perangkat dalam keadaan offline (Mode Pesawat).
- **📋 Salin Fakta:** Kemudahan menyalin teks fakta menarik langsung ke clipboard perangkat.

---

## 🛠️ Teknologi yang Digunakan

- **Frontend Framework:** React (Vite)
- **Computer Vision:** `@tensorflow/tfjs` & `@tensorflow/tfjs-backend-webgpu`
- **Generative AI:** `@huggingface/transformers` (Transformers.js v3)
- **Desain & Ikon:** Lucide React & Custom CSS (Glassmorphism & Clean Modern UI)
- **Service Worker / PWA:** `vite-plugin-pwa` (Workbox)
- **Linter & Code Quality:** ESLint

---

## 📦 Daftar Sayuran yang Didukung

Aplikasi ini dapat mengenali 18 jenis sayuran berikut:
`Beetroot`, `Paprika`, `Cabbage`, `Carrot`, `Cauliflower`, `Chilli`, `Corn`, `Cucumber`, `Eggplant`, `Garlic`, `Ginger`, `Lettuce`, `Onion`, `Peas`, `Potato`, `Turnip`, `Soybean`, dan `Spinach`.

---

## 🚀 Memulai Project di Lokal

Ikuti langkah-langkah berikut untuk menjalankan project ini di komputer Anda secara lokal:

### Prasyarat
Pastikan Anda sudah menginstal [Node.js](https://nodejs.org/) di sistem Anda.

### Langkah-langkah
1. **Clone repositori ini:**
   ```bash
   git clone https://github.com/WaySTN/root-facts-react.git
   cd root-facts-react
   ```

2. **Instal dependensi:**
   ```bash
   npm install
   ```

3. **Jalankan server pengembangan (Dev):**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di alamat `http://localhost:5173` (atau port lain yang tertera di terminal).

4. **Build untuk Produksi & Preview PWA:**
   ```bash
   npm run build
   npm run preview
   ```

---

## 🌐 Deployment (Netlify)

Aplikasi ini siap dideploy ke Netlify dengan pengaturan yang sudah disesuaikan di `netlify.toml`. 

### Konfigurasi Netlify
- **Build Command:** `npm run build`
- **Publish Directory:** `dist`
- **Headers & Keamanan:** Menyediakan dukungan header CORS dan mematikan kebijakan pembatasan COOP/COEP agar proses pengunduhan model AI dari CDN HuggingFace berjalan lancar.

---

## 📁 Struktur Folder Utama

```text
├── public/
│   ├── favicon.ico
│   ├── icons/             # Ikon untuk manifest PWA
│   └── model/             # Model TensorFlow.js untuk deteksi sayur
├── src/
│   ├── components/        # Komponen UI (CameraSection, InfoPanel, dll)
│   ├── hooks/             # Custom React Hooks (State management)
│   ├── services/          # Logika AI & Kamera (CameraService, DetectionService, RootFactsService)
│   ├── utils/             # Konfigurasi aplikasi & Helper umum
│   ├── App.jsx            # Entry point aplikasi utama
│   └── index.css          # Desain sistem & Styling global
├── STUDENT.txt            # Informasi URL hasil deploy
├── netlify.toml           # Konfigurasi deploy Netlify
└── vite.config.js         # Konfigurasi build Vite & PWA
```
