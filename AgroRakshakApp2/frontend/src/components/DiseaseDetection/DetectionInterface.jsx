import { useAuth } from '../../contexts/AuthContext';
import { saveDetection } from '../../services/detectionService';
import { Save } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Loader, AlertCircle, Zap, ZapOff } from 'lucide-react';
import { detectDisease, healthCheck } from '../../services/api';
import ResultCard from './ResultCard';

const DetectionInterface = () => {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const canvasRef = useRef(null);

  const [isApiHealthy, setIsApiHealthy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isLiveDetection, setIsLiveDetection] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [error, setError] = useState(null);
  const [fps, setFps] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { currentUser } = useAuth();

  // Check API health on mount
  useEffect(() => {
    checkApiHealth();
  }, []);

  // Cleanup camera and detection interval on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  const checkApiHealth = async () => {
    try {
      setIsLoading(true);
      const health = await healthCheck();
      setIsApiHealthy(health.status === 'healthy');
      setIsLoading(false);
    } catch (err) {
      setError('Backend API not reachable. Please start the Python server.');
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setError(null);
      setIsLoading(true);
      setDetectionResult(null);

      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target.result);
      reader.readAsDataURL(file);

      const result = await detectDisease(file);
      
      if (result.success) {
        if (result.detection) {
          setDetectionResult(result.detection);
        } else {
          setError(result.message || 'No diseases detected above confidence thresholds');
        }
      } else {
        setError(`Detection failed: ${result.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCamera = async () => {
    try {
      setError(null);
      setPreviewImage(null);
      setDetectionResult(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current.play();
            setIsScanning(true);
            console.log('Camera started successfully');
          } catch (playError) {
            console.error('Video play failed:', playError);
            setError('Failed to start video playback');
          }
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      let errorMessage = 'Failed to access camera';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application.';
      }
      
      setError(errorMessage);
    }
  };

  const handleStopCamera = () => {
    if (isLiveDetection) {
      handleToggleLiveDetection();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
  };

  const captureFrameFromVideo = () => {
    if (!videoRef.current) return null;

    const canvas = canvasRef.current || document.createElement('canvas');
    if (!canvasRef.current) {
      canvasRef.current = canvas;
    }
    
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);

    return canvas;
  };

  const detectFrame = async () => {
    try {
      const canvas = captureFrameFromVideo();
      if (!canvas) return;

      const startTime = performance.now();

      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });

      const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' });
      const result = await detectDisease(file);
      
      const endTime = performance.now();
      const detectionTime = endTime - startTime;
      setFps(Math.round(1000 / detectionTime));

      if (result.success && result.detection) {
        setDetectionResult(result.detection);
      } else {
        setDetectionResult(null);
      }
    } catch (err) {
      console.error('Live detection error:', err);
    }
  };

  const handleToggleLiveDetection = () => {
    if (isLiveDetection) {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      setIsLiveDetection(false);
      setFps(0);
    } else {
      setIsLiveDetection(true);
      setError(null);
      
      detectFrame();
      
      detectionIntervalRef.current = setInterval(() => {
        detectFrame();
      }, 2000);
    }
  };

  const handleCaptureFrame = async () => {
    if (!videoRef.current) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const canvas = captureFrameFromVideo();
      if (!canvas) return;

      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.95);
      });

      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
      const result = await detectDisease(file);
      
      if (result.success && result.detection) {
        setDetectionResult(result.detection);
        
        const imageUrl = canvas.toDataURL('image/jpeg');
        setPreviewImage(imageUrl);
        
        handleStopCamera();
      } else {
        setError(result.message || 'No diseases detected in captured frame');
      }
    } catch (err) {
      console.error('Capture error:', err);
      setError(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Save detection to Firebase
  const handleSaveDetection = async () => {
  if (!detectionResult || !currentUser) return;

  try {
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    console.log('Starting save...');
    
    // Save detection data only (no image)
    await saveDetection(currentUser.uid, detectionResult);
    
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    console.log('✅ Save complete!');
  } catch (error) {
    console.error('❌ Save failed:', error);
    setError('Failed to save: ' + error.message);
  } finally {
    setIsSaving(false);
  }
};


  const handleReset = () => {
    setPreviewImage(null);
    setDetectionResult(null);
    setError(null);
    setSaveSuccess(false);
    if (isScanning) {
      handleStopCamera();
    }
  };

  return (
    <div className="detection-interface">
      <div className="detection-header">
        <h2>🍅 Tomato Disease Detection</h2>
        <p>AI-powered disease detection using YOLOv8</p>
        
        <div className="api-status">
          {isApiHealthy ? (
            <span className="status-healthy">✓ API Connected</span>
          ) : (
            <span className="status-error">✗ API Offline</span>
          )}
          {isLiveDetection && <span className="status-live">🔴 LIVE ({fps} FPS)</span>}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="detection-layout">
        <div className="camera-section">
          <div className="camera-container">
            {!previewImage && (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay
                  playsInline
                  muted
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    display: isScanning ? 'block' : 'none'
                  }}
                />
                
                {!isScanning && (
                  <div className="camera-placeholder">
                    <Camera size={64} />
                    <p>Start camera or upload image</p>
                  </div>
                )}
              </>
            )}

            {previewImage && (
              <div className="image-preview">
                <img src={previewImage} alt="Captured" />
                <button 
                  className="btn-close" 
                  onClick={handleReset}
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>

          <div className="camera-controls">
            {!isScanning ? (
              <>
                <button 
                  className="btn-primary" 
                  onClick={handleStartCamera}
                  disabled={!isApiHealthy || isLoading}
                >
                  <Camera size={20} />
                  Start Camera
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={() => fileInputRef.current.click()}
                  disabled={!isApiHealthy || isLoading}
                >
                  <Upload size={20} />
                  Upload Image
                </button>
                <input 
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </>
            ) : (
              <>
                <button 
                  className={isLiveDetection ? "btn-live-active" : "btn-live"}
                  onClick={handleToggleLiveDetection}
                  disabled={isLoading}
                >
                  {isLiveDetection ? <ZapOff size={20} /> : <Zap size={20} />}
                  {isLiveDetection ? 'Stop Live' : 'Start Live'}
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleCaptureFrame}
                  disabled={isLoading || isLiveDetection}
                >
                  📸 Capture
                </button>
                <button 
                  className="btn-danger" 
                  onClick={handleStopCamera}
                >
                  Stop Camera
                </button>
              </>
            )}
          </div>
        </div>

        <div className="results-section">
          <h3>Detection Results</h3>
          
          {isLoading && !isLiveDetection && (
            <div className="loading">
              <Loader className="animate-spin" size={48} />
              <p>Analyzing...</p>
            </div>
          )}

          {!isLoading && !detectionResult && !error && !isLiveDetection && (
            <div className="no-results">
              <p>No detections yet</p>
              <p className="hint">Upload an image or start camera</p>
            </div>
          )}

          {isLiveDetection && !detectionResult && (
            <div className="no-results">
              <p>🔴 Live scanning...</p>
              <p className="hint">Point camera at plant leaf</p>
            </div>
          )}

          {detectionResult && (
            <>
              <ResultCard detection={detectionResult} />
              
              {saveSuccess && (
                <div className="success-message">
                  ✓ Saved to history!
                </div>
              )}
              
              <button
                className="btn-save"
                onClick={handleSaveDetection}
                disabled={isSaving || saveSuccess}
              >
                <Save size={20} />
                {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save to History'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetectionInterface;
