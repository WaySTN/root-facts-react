import { useRef, useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CameraSection from './components/CameraSection';
import InfoPanel from './components/InfoPanel';
import { useAppState } from './hooks/useAppState';
import { CameraService } from './services/CameraService';
import { DetectionService } from './services/DetectionService';
import { RootFactsService } from './services/RootFactsService';
import { APP_CONFIG, isValidDetection } from './utils/config';
import { createDelay, logError } from './utils/common';

function App() {
  const { state, actions } = useAppState();
  const detectionLoopRef = useRef(null);
  const isRunningRef = useRef(false);
  const lastDetectedLabelRef = useRef(null);
  const [currentTone, setCurrentTone] = useState('normal');
  const [copyStatus, setCopyStatus] = useState('idle'); // 'idle' | 'copied'

  // [Basic] Inisialisasi ketiga service saat aplikasi dimuat
  useEffect(() => {
    let cancelled = false;

    const initServices = async () => {
      const detector = new DetectionService();
      const camera = new CameraService();
      const generator = new RootFactsService();

      // Simpan instance ke state agar komponen lain bisa akses
      actions.setServices({ detector, camera, generator });

      try {
        // --- Load Detection Model (TF.js) ---
        actions.setModelStatus('Memuat Model AI... 0%');
        await detector.loadModel((pct) => {
          if (!cancelled) {
            actions.setModelStatus(`Menunggu Model... ${pct}%`);
          }
        });

        if (cancelled) return;
        actions.setModelStatus('Menunggu Model... 100%');

        // --- Load Generator Model (Transformers.js) ---
        actions.setModelStatus('Memuat Generator... 0%');
        await generator.loadModel((pct) => {
          if (!cancelled) {
            actions.setModelStatus(`Memuat Generator... ${pct}%`);
          }
        });

        if (cancelled) return;
        actions.setModelStatus('Model AI Siap');
      } catch (err) {
        if (!cancelled) {
          logError('App.initServices', err);
          actions.setError('Gagal memuat model AI. Refresh halaman untuk mencoba lagi.');
          actions.setModelStatus('Gagal Memuat Model');
        }
      }
    };

    initServices();

    // [Basic] Cleanup saat komponen unmount
    return () => {
      cancelled = true;
      stopDetectionLoop();
    };
  }, []);

  // Tambahan: cleanup kamera saat unmount via state
  useEffect(() => {
    return () => {
      if (state.services.camera) {
        state.services.camera.stopCamera();
      }
    };
  }, [state.services.camera]);

  // [Basic] Hentikan detection loop
  const stopDetectionLoop = useCallback(() => {
    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
    isRunningRef.current = false;
  }, []);

  // [Basic] Loop deteksi berbasis requestAnimationFrame, throttle dengan FPS dari CameraService
  const startDetectionLoop = useCallback((detector, camera, generator) => {
    let isFetchingFact = false;

    const loop = async () => {
      if (!isRunningRef.current) return;

      // Throttle berdasarkan FPS limit yang diset user
      if (camera.shouldProcessFrame() && camera.isReady()) {
        const result = await detector.predict(camera.video);

        if (result && isValidDetection(result)) {
          // Hanya trigger generateFacts jika sayuran berbeda dari sebelumnya
          if (result.label !== lastDetectedLabelRef.current && !isFetchingFact) {
            lastDetectedLabelRef.current = result.label;
            isFetchingFact = true;

            actions.setDetectionResult(result);
            actions.setAppState('analyzing');
            actions.setFunFactData(null);

            await createDelay(APP_CONFIG.analyzingDelay);

            if (!isRunningRef.current) {
              isFetchingFact = false;
              return;
            }

            actions.setAppState('result');

            await createDelay(APP_CONFIG.factsGenerationDelay);

            if (!isRunningRef.current) {
              isFetchingFact = false;
              return;
            }

            try {
              const fact = await generator.generateFacts(result.label);
              actions.setFunFactData(fact || 'error');
            } catch {
              actions.setFunFactData('error');
            } finally {
              isFetchingFact = false;
            }
          }
        }
      }

      detectionLoopRef.current = requestAnimationFrame(loop);
    };

    detectionLoopRef.current = requestAnimationFrame(loop);
  }, [actions]);

  // [Basic] Mulai/stop kamera dan loop deteksi
  const handleToggleCamera = useCallback(async (selectedCameraId = null) => {
    const { detector, camera, generator } = state.services;
    if (!detector || !camera || !generator) return;

    if (state.isRunning) {
      // --- Stop ---
      isRunningRef.current = false;
      stopDetectionLoop();
      camera.stopCamera();
      lastDetectedLabelRef.current = null;
      actions.setRunning(false);
      actions.resetResults();
    } else {
      // --- Start ---
      try {
        actions.setError(null);
        await camera.startCamera(selectedCameraId);
        isRunningRef.current = true;
        actions.setRunning(true);
        startDetectionLoop(detector, camera, generator);
      } catch (err) {
        actions.setError(err.message || 'Gagal memulai kamera.');
        actions.setRunning(false);
        isRunningRef.current = false;
      }
    }
  }, [state.services, state.isRunning, actions, stopDetectionLoop, startDetectionLoop]);

  // [Advance] Ubah tone fun fact (update state + service langsung)
  const handleToneChange = useCallback((newTone) => {
    setCurrentTone(newTone);
    if (state.services.generator) {
      state.services.generator.setTone(newTone);
    }
    // Reset agar sayuran yang sama bisa di-generate ulang dengan tone baru
    lastDetectedLabelRef.current = null;
  }, [state.services.generator]);

  // [Skilled] Copy fun fact ke clipboard dengan feedback visual
  const handleCopyFact = useCallback(async () => {
    const text = state.funFactData;
    if (!text || text === 'error') return;

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      logError('App.handleCopyFact', err);
    }
  }, [state.funFactData]);

  return (
    <div className="app-container">
      <Header modelStatus={state.modelStatus} />

      <main className="main-content">
        <CameraSection
          isRunning={state.isRunning}
          onToggleCamera={handleToggleCamera}
          onToneChange={handleToneChange}
          services={state.services}
          modelStatus={state.modelStatus}
          error={state.error}
          currentTone={currentTone}
        />

        <InfoPanel
          appState={state.appState}
          detectionResult={state.detectionResult}
          funFactData={state.funFactData}
          error={state.error}
          onCopyFact={handleCopyFact}
          copyStatus={copyStatus}
        />
      </main>

      <footer className="footer">
        <p>Powered by TensorFlow.js &amp; Transformers.js</p>
      </footer>

      {state.error && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '380px',
          padding: '0.875rem 1rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          color: '#991b1b',
          fontSize: '0.8125rem',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 1000
        }}>
          <strong>Error:</strong> {state.error}
          <button
            onClick={() => actions.setError(null)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#991b1b',
              padding: 0,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
