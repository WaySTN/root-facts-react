import { useState, useRef, useEffect } from 'react';
import { Camera, Mic, ScanLine } from 'lucide-react';
import { TONE_CONFIG } from '../utils/config';

function CameraSection({
  isRunning,
  onToggleCamera,
  onToneChange,
  services,
  error,
  currentTone,
}) {
  const [fps, setFps] = useState(30);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Pasang video & canvas ke CameraService saat service tersedia
  useEffect(() => {
    if (services.camera) {
      if (videoRef.current && !services.camera.video) {
        services.camera.setVideoElement(videoRef.current);
      }
      if (canvasRef.current && !services.camera.canvas) {
        services.camera.setCanvasElement(canvasRef.current);
      }
    }
  });

  // Re-play video setelah isRunning jadi true:
  // play() dipanggil saat video masih display:none (class 'hidden'),
  // sehingga beberapa browser tidak render frame — panggil lagi setelah visible.
  useEffect(() => {
    if (isRunning && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [isRunning]);

  // Update FPS di CameraService saat nilai berubah
  useEffect(() => {
    if (services.camera) {
      services.camera.setFPS(fps);
    }
  }, [fps, services.camera]);

  // Enumerate kamera nyata saat CameraService tersedia (sebelum kamera diaktifkan)
  useEffect(() => {
    if (!services.camera || cameras.length > 0) return;

    const enumerateCameras = async () => {
      try {
        const devices = await services.camera.loadCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          setSelectedCameraId(devices[0].deviceId);
        }
      } catch {
        // Gagal enumerate: tetap gunakan kamera default
        setCameras([]);
      }
    };

    enumerateCameras();
  }, [services.camera, cameras.length]);

  const handleFpsChange = (newFps) => {
    setFps(Number(newFps));
  };

  const handleToneChange = (e) => {
    if (onToneChange) {
      onToneChange(e.target.value);
    }
  };

  const handleCameraSelect = (deviceId) => {
    setSelectedCameraId(deviceId);
    // Jika kamera sedang aktif, restart dengan kamera baru
    if (services.camera && services.camera.isActive()) {
      services.camera.startCamera(deviceId || null);
    }
  };

  const handleToggleClick = () => {
    if (onToggleCamera) {
      // Teruskan selectedCameraId agar startCamera pakai device yang benar
      onToggleCamera(selectedCameraId || null);
    }
  };

  // Tombol aktif begitu Detector (TF.js) selesai load — tidak perlu tunggu Generator
  const isDetectorReady = !!(services.detector && services.detector.isLoaded());
  const buttonDisabled = !isDetectorReady;
  const buttonText = isRunning ? 'Stop Scan' : 'Mulai Scan';

  return (
    <section className="camera-section" aria-label="Camera Feed and Controls">
      <div className="camera-container">
        <div className="camera-wrapper">
          <video
            ref={videoRef}
            id="media-video"
            autoPlay
            muted
            playsInline
            className={isRunning ? '' : 'hidden'}
          />

          <canvas
            ref={canvasRef}
            id="media-canvas"
            className="hidden"
          />

          <div className={`camera-overlay ${isRunning ? 'active' : ''}`}>
            <div className="overlay-frame"></div>
          </div>

          {!isRunning && (
            <div className="camera-placeholder">
              <Camera size={48} />
              <p>Kamera tidak aktif</p>
              {error && (
                <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="camera-controls">
          <button
            id="btn-toggle"
            className={`capture-btn ${isRunning ? 'scanning' : ''}`}
            onClick={handleToggleClick}
            disabled={buttonDisabled}
            aria-label={buttonText}
            style={{ opacity: buttonDisabled ? 0.6 : 1 }}
          >
            <ScanLine size={24} />
          </button>
        </div>

        <div className="settings-bar">
          <div className="setting-item">
            <Camera size={16} />
            <select
              id="camera-select"
              value={selectedCameraId}
              onChange={(e) => handleCameraSelect(e.target.value)}
              disabled={isRunning}
            >
              {cameras.length > 0 ? (
                cameras.map((cam, idx) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label || `Kamera ${idx + 1}`}
                  </option>
                ))
              ) : (
                <option value="">Kamera Default</option>
              )}
            </select>
          </div>

          <div className="setting-item fps-setting">
            <span id="fps-label">{fps} FPS</span>
            <input
              id="fps-slider"
              type="range"
              min="15"
              max="60"
              step="15"
              value={fps}
              onChange={(e) => handleFpsChange(e.target.value)}
              disabled={isRunning}
            />
          </div>

          <div className="setting-item tone-setting">
            <Mic size={16} />
            <select
              id="tone-select"
              value={currentTone || 'normal'}
              onChange={handleToneChange}
              disabled={isRunning}
            >
              {TONE_CONFIG.availableTones.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CameraSection;
