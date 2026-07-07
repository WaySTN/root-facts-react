import { pipeline } from '@huggingface/transformers';
import { TONE_CONFIG } from '../utils/config.js';
import { isWebGPUSupported, logError } from '../utils/common.js';

// Tone → prompt instruction map (Bahasa Inggris, sesuai requirement)
const TONE_PROMPT_MAP = {
  normal:       'Give an interesting and informative fun fact about {vegetable}.',
  funny:        'Give a hilarious and witty fun fact about {vegetable}. Make it humorous and entertaining.',
  professional: 'Provide a scientifically accurate and formal fun fact about {vegetable} using professional language.',
  casual:       'Share a chill and friendly fun fact about {vegetable} in a relaxed, conversational tone.',
};

export class RootFactsService {
  constructor() {
    this.generator = null;
    this.isModelLoaded = false;
    this.isGenerating = false;
    this.config = null;
    this.currentBackend = null;
    this.currentTone = TONE_CONFIG.defaultTone;
  }

  // [Basic] Inisialisasi pipeline text2text-generation dari Transformers.js
  // [Advance] Backend Adaptif: WebGPU jika tersedia, fallback ke WebGL (cpu fallback otomatis dari lib)
  async loadModel(onProgress) {
    try {
      // Tentukan device berdasarkan ketersediaan WebGPU
      const device = isWebGPUSupported() ? 'webgpu' : 'wasm';
      this.currentBackend = device;

      onProgress && onProgress(5);

      // dtype: "q4" → unduh versi quantized (jauh lebih kecil dari versi full)
      this.generator = await pipeline(
        'text2text-generation',
        'Xenova/LaMini-Flan-T5-783M',
        {
          dtype: 'q4',
          device,
          progress_callback: (progressInfo) => {
            // progressInfo.progress di Transformers.js v3 sudah dalam format 0–100
            if (progressInfo && typeof progressInfo.progress === 'number') {
              const pct = Math.min(99, Math.round(progressInfo.progress));
              onProgress && onProgress(pct);
            }
          },
        },
      );

      this.isModelLoaded = true;
      onProgress && onProgress(100);

      return { backend: this.currentBackend };
    } catch (error) {
      logError('RootFactsService.loadModel', error);
      throw error;
    }
  }

  // [Advance] Set tone (persona) yang memengaruhi isi prompt secara nyata
  setTone(tone) {
    const validTones = TONE_CONFIG.availableTones.map((t) => t.value);
    if (validTones.includes(tone)) {
      this.currentTone = tone;
    }
  }

  // [Basic]  Generate fun fact dengan prompt dinamis berbahasa Inggris
  // [Skilled] Parameter generasi: max_new_tokens ≤ 150, temperature, top_p, do_sample
  // [Advance] Tone memengaruhi isi prompt secara nyata lewat TONE_PROMPT_MAP
  async generateFacts(vegetableName) {
    if (!this.isReady() || this.isGenerating) return null;

    this.isGenerating = true;

    try {
      // Bangun prompt berdasarkan tone aktif
      const toneTemplate = TONE_PROMPT_MAP[this.currentTone] || TONE_PROMPT_MAP.normal;
      const prompt = toneTemplate.replace('{vegetable}', vegetableName);

      const output = await this.generator(prompt, {
        max_new_tokens: 150,   // maks 150 agar tidak freeze di klien
        temperature: 0.85,     // sedikit variasi agar tidak monoton
        top_p: 0.92,           // nucleus sampling
        do_sample: true,       // aktifkan sampling (bukan greedy)
        repetition_penalty: 1.2,
      });

      // Ambil teks hasil generasi dari output array
      const generatedText =
        output?.[0]?.generated_text?.trim() ||
        output?.[0]?.translation_text?.trim() ||
        null;

      return generatedText;
    } catch (error) {
      logError('RootFactsService.generateFacts', error);
      return null;
    } finally {
      this.isGenerating = false;
    }
  }

  // [Basic] Apakah model sudah dimuat dan siap digunakan
  isReady() {
    return this.isModelLoaded && this.generator !== null;
  }

  // Getter: backend aktif (untuk info UI/debug)
  getBackend() {
    return this.currentBackend;
  }
}

