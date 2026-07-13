import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';
import { isValidDetection, APP_CONFIG } from '../utils/config.js';
import { isWebGPUSupported, logError, validateModelMetadata } from '../utils/common.js';

const MODEL_URL = '/model/model.json';
const METADATA_URL = '/model/metadata.json';

export class DetectionService {
  constructor() {
    this.model = null;
    this.labels = [];
    this.config = null;
    this._imageSize = 224;
    this._currentBackend = null;
  }

  // [Basic] Muat model dan metadata secara bersamaan
  // [Advance] Backend Adaptif: cek navigator.gpu → WebGPU, fallback ke WebGL
  async loadModel(onProgress) {
    try {
      // -- Adaptive Backend --
      if (isWebGPUSupported()) {
        try {
          await tf.setBackend('webgpu');
          await tf.ready();
          this._currentBackend = 'webgpu';
        } catch {
          await tf.setBackend('webgl');
          await tf.ready();
          this._currentBackend = 'webgl';
        }
      } else {
        await tf.setBackend('webgl');
        await tf.ready();
        this._currentBackend = 'webgl';
      }

      onProgress && onProgress(10);

      // -- Load model + metadata secara bersamaan --
      const [loadedModel, metadataRes] = await Promise.all([
        tf.loadLayersModel(MODEL_URL),
        fetch(METADATA_URL),
      ]);

      onProgress && onProgress(70);

      const metadata = await metadataRes.json();

      if (!validateModelMetadata(metadata)) {
        throw new Error('Metadata model tidak valid: tidak ada field "labels".');
      }

      this.model = loadedModel;
      this.labels = metadata.labels;
      this._imageSize = metadata.imageSize || 224;

      // Warm-up: jalankan prediksi dummy agar TF siap, buang hasilnya
      tf.tidy(() => {
        const dummyInput = tf.zeros([1, this._imageSize, this._imageSize, 3]);
        this.model.predict(dummyInput);
      });

      onProgress && onProgress(100);

      return { backend: this._currentBackend, labels: this.labels };
    } catch (error) {
      logError('DetectionService.loadModel', error);
      throw error;
    }
  }

  // [Basic] Prediksi pada imageElement, kembalikan { label, confidence, isValid }
  // [Advance] tf.tidy() memastikan tidak ada tensor leak di setiap siklus prediksi
  async predict(imageElement) {
    if (!this.isLoaded()) return null;

    let predictions = null;

    try {
      predictions = tf.tidy(() => {
        // Konversi imageElement → tensor [1, imageSize, imageSize, 3], normalize ke [0,1]
        const imgTensor = tf.browser.fromPixels(imageElement)
          .resizeBilinear([this._imageSize, this._imageSize])
          .toFloat()
          .div(tf.scalar(255))
          .expandDims(0);

        const output = this.model.predict(imgTensor);
        // Kembalikan data dari GPU ke CPU di dalam tidy
        return output.dataSync();
      });

      // Cari label dengan confidence tertinggi
      let maxIdx = 0;
      for (let i = 1; i < predictions.length; i++) {
        if (predictions[i] > predictions[maxIdx]) maxIdx = i;
      }

      const confidence = Math.round(predictions[maxIdx] * 100);
      const label = this.labels[maxIdx] || 'Unknown';

      const result = {
        className: label,
        label,
        confidence,
        score: predictions[maxIdx],
        isValid: confidence >= APP_CONFIG.detectionConfidenceThreshold,
      };

      return result;
    } catch (error) {
      logError('DetectionService.predict', error);
      return null;
    }
  }

  // [Basic] Apakah model sudah dimuat dan siap
  isLoaded() {
    return !!(this.model && this.labels.length > 0);
  }

  // Getter: backend yang sedang dipakai (untuk info UI/debug)
  getBackend() {
    return this._currentBackend;
  }
}
