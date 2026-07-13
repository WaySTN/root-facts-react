import { getCameraErrorMessage, logError } from '../utils/common.js';

export class CameraService {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.config = null;
    this._fps = 30;
    this._frameInterval = 1000 / 30;
    this._lastFrameTime = 0;
    this._availableCameras = [];
  }

  setVideoElement(videoElement) {
    this.video = videoElement;
  }

  setCanvasElement(canvasElement) {
    this.canvas = canvasElement;
  }

  // [Basic] Enumerasi device kamera dan tentukan constraints berdasarkan kamera yang dipilih
  async loadCameras() {
    try {
      // Minta akses sementara agar label kamera tersedia di enumerateDevices
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach((track) => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      this._availableCameras = devices.filter((d) => d.kind === 'videoinput');
      return this._availableCameras;
    } catch (error) {
      logError('CameraService.loadCameras', error);
      throw new Error(getCameraErrorMessage(error));
    }
  }

  // [Basic] Memulai stream kamera dan pasang ke elemen <video>
  async startCamera(selectedCameraId = null) {
    try {
      // Hentikan stream sebelumnya jika ada
      this.stopCamera();

      const constraints = this._buildConstraints(selectedCameraId);
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (this.video) {
        this.video.srcObject = this.stream;
        await this.video.play();
      }

      return this.stream;
    } catch (error) {
      logError('CameraService.startCamera', error);
      throw new Error(getCameraErrorMessage(error));
    }
  }

  // [Basic] Hentikan stream kamera dan bersihkan resource
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.video) {
      this.video.srcObject = null;
    }

    this._lastFrameTime = 0;
  }

  // [Skilled] Atur FPS limit untuk siklus deteksi
  setFPS(fps) {
    this._fps = Number(fps) || 30;
    this._frameInterval = 1000 / this._fps;
  }

  // [Basic] Apakah kamera sedang aktif (stream berjalan)
  isActive() {
    return !!(this.stream && this.stream.active);
  }

  // [Basic] Apakah elemen video siap digunakan untuk prediksi
  isReady() {
    return !!(
      this.video &&
      this.video.readyState >= 2 && // HAVE_CURRENT_DATA
      this.video.videoWidth > 0 &&
      this.video.videoHeight > 0 &&
      this.isActive()
    );
  }

  // Helper: periksa apakah frame baru boleh diproses berdasarkan FPS limit
  shouldProcessFrame() {
    const now = performance.now();
    if (now - this._lastFrameTime >= this._frameInterval) {
      this._lastFrameTime = now;
      return true;
    }
    return false;
  }

  // Helper: bangun MediaStreamConstraints berdasarkan kamera yang dipilih
  _buildConstraints(selectedCameraId) {
    if (selectedCameraId && selectedCameraId !== 'default') {
      return {
        video: {
          deviceId: { exact: selectedCameraId },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };
    }

    return {
      video: {
        facingMode: 'environment',
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    };
  }
}