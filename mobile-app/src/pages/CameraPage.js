import React, { useRef, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import useSocket from '../hooks/useSocket';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

// ─── COMPRESSION LEVELS ──────────────────────────────────────

const COMPRESSION_LEVELS = {
  original: { name: 'Full HD (Original)', scale: 1, quality: 1, videoQuality: 'high' },
  hd: { name: 'HD (50% Compression)', scale: 0.9, quality: 0.85, videoQuality: 'medium' },
  compressed: { name: 'Compressed (70% Compression)', scale: 0.7, quality: 0.7, videoQuality: 'medium' },
  ultracompressed: { name: 'Ultra Compressed (85% Compression)', scale: 0.5, quality: 0.5, videoQuality: 'low' }
};

// ─── STYLES ──────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#fff',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    padding: '14px 16px 10px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: '1px solid #222'
  },
  logo: { fontSize: 18, fontWeight: 700, letterSpacing: -0.3 },
  badge: (color) => ({
    background: color + '33', color,
    padding: '3px 10px', borderRadius: 20,
    fontSize: 12, fontWeight: 600
  }),
  camWrap: {
    position: 'relative',
    width: '100%',
    background: '#111',
    overflow: 'hidden'
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },
  camPlaceholder: {
    width: '100%', aspectRatio: '4/3',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    color: '#555', gap: 10, padding: 20, textAlign: 'center'
  },
  controls: {
    padding: '14px 16px',
    background: '#111',
    borderTop: '1px solid #222',
    maxHeight: '45vh',
    overflowY: 'auto'
  },
  compressionBox: {
    background: '#1a1a1a', border: '1px solid #333',
    borderRadius: 10, padding: 12, marginBottom: 12,
    fontSize: 13
  },
  compressionLabel: { fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 8 },
  compressionSelect: {
    width: '100%', padding: 10, borderRadius: 8,
    background: '#222', color: '#fff', border: '1px solid #333',
    fontSize: 13, marginBottom: 6
  },
  compressionInfo: { fontSize: 11, color: '#666', fontStyle: 'italic' },
  captureRow: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12, gap: 8
  },
  captureBtn: {
    width: 70, height: 70,
    borderRadius: '50%',
    background: '#fff',
    border: '4px solid #555',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, transition: 'transform 0.1s',
    flexShrink: 0
  },
  sideBtn: (color = '#1e1e1e', disabled = false) => ({
    background: disabled ? '#333' : color,
    color: disabled ? '#666' : '#fff', border: 'none',
    borderRadius: 12, padding: '10px 16px',
    fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 3, opacity: disabled ? 0.5 : 1
  }),
  uploadBtn: (disabled) => ({
    width: '100%',
    padding: '16px',
    background: disabled ? '#333' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    color: disabled ? '#666' : '#fff',
    border: 'none', borderRadius: 14,
    fontSize: 17, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    letterSpacing: 0.3,
    transition: 'background 0.2s'
  }),
  stackSection: {
    flex: 1, background: '#111',
    padding: '0 16px 16px', overflowY: 'auto'
  },
  stackHeader: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', padding: '12px 0 10px', gap: 10
  },
  stackTitle: { fontSize: 14, fontWeight: 600, color: '#ccc' },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8
  },
  imgCard: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    aspectRatio: '3/4',
    background: '#1a1a1a',
    border: '2px solid transparent',
    cursor: 'grab',
    transition: 'all 0.2s'
  },
  imgCardDragging: {
    opacity: 0.5,
    border: '2px dashed #2563eb'
  },
  imgThumb: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  vidThumb: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#0a0a0a' },
  imgNum: {
    position: 'absolute', top: 5, left: 5,
    background: 'rgba(0,0,0,0.7)', color: '#fff',
    borderRadius: 6, fontSize: 11, fontWeight: 700,
    padding: '2px 6px'
  },
  mediaType: {
    position: 'absolute', top: 5, right: 5,
    background: 'rgba(37,99,235,0.9)', color: '#fff',
    borderRadius: 6, fontSize: 10, fontWeight: 700,
    padding: '2px 6px'
  },
  delBtn: {
    position: 'absolute', bottom: 5, right: 5,
    background: 'rgba(220,38,38,0.9)', color: '#fff',
    border: 'none', borderRadius: 6,
    width: 26, height: 26, fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer'
  },
  progressBox: {
    background: '#1a1a1a', border: '1px solid #333',
    borderRadius: 10, padding: 12, marginTop: 10,
    fontSize: 13, color: '#aaa'
  },
  progressFill: (pct) => ({
    height: '100%', background: 'linear-gradient(90deg, #059669, #10b981)',
    width: `${pct}%`, transition: 'width 0.3s'
  }),
  errorPage: {
    minHeight: '100vh', background: '#0a0a0a', color: '#fff',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 32, textAlign: 'center', gap: 16
  },
  successPage: {
    minHeight: '100vh', background: '#0a0a0a', color: '#fff',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 32, textAlign: 'center', gap: 16
  }
};

// ─── COMPRESS IMAGE ──────────────────────────────────────────

function compressImage(base64Data, quality = 0.75, scale = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Data;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = Math.round(img.width * scale);
      let height = Math.round(img.height * scale);

      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
}

// ─── COMPRESS VIDEO ──────────────────────────────────────────

async function compressVideo(file, videoQuality = 'medium') {
  // For now, we'll just return the file as-is
  // Real video compression would require a library like FFmpeg.js
  // This is a placeholder that returns the original file
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        data: e.target.result,
        type: 'video',
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  });
}

// ─── COMPONENT ───────────────────────────────────────────────

export default function CameraPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const dragOverRef = useRef(null);

  const [sessionId, setSessionId] = useState(null);
  const [sessionValid, setSessionValid] = useState(null);
  const [media, setMedia] = useState([]); // {data, id, type: 'image'|'video', name}
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [flash, setFlash] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [cameraError, setCameraError] = useState(null);
  const [compressionLevel, setCompressionLevel] = useState('compressed');

  const { connected, emit } = useSocket(sessionId);

  const compressionSettings = COMPRESSION_LEVELS[compressionLevel];

  // Parse sessionId from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('sessionId');
    if (!sid) { setSessionValid(false); return; }
    setSessionId(sid);
    axios.get(`${BACKEND_URL}/api/sessions/${sid}`)
      .then(() => setSessionValid(true))
      .catch(() => setSessionValid(false));
  }, []);

  // Start camera with better error handling
  const startCamera = useCallback(async (mode = facingMode) => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    try {
      const constraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 960, min: 480 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
            .then(() => setCameraReady(true))
            .catch(err => {
              console.error('Play error:', err);
              setCameraError('Camera failed to start. Try refreshing.');
              setCameraReady(false);
            });
        };

        // Timeout if camera doesn't load
        const timeout = setTimeout(() => {
          if (!cameraReady) {
            setCameraError('Camera took too long to load. Try refreshing.');
          }
        }, 5000);

        return () => clearTimeout(timeout);
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('📷 Camera access denied. Check your browser settings and try refreshing.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('📷 No camera found on this device.');
      } else if (err.name === 'NotReadableError') {
        setCameraError('📷 Camera is being used by another app. Close it and refresh.');
      } else {
        setCameraError('📷 Camera error: ' + err.message);
      }
      setCameraReady(false);
    }
  }, [facingMode]);

  useEffect(() => {
    if (sessionValid === true) {
      const timer = setTimeout(() => startCamera(), 800);
      return () => clearTimeout(timer);
    }
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, [sessionValid, startCamera]);

  // Flip camera
  const flipCamera = async () => {
    const mode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(mode);
    setCameraReady(false);
    await startCamera(mode);
  };

  // Capture from video
  const capture = async () => {
    if (!canvasRef.current || !videoRef.current || !cameraReady) {
      setCameraError('Camera not ready. Please wait.');
      return;
    }
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      let data = canvas.toDataURL('image/jpeg', 0.95);

      // Compress based on selected level
      data = await compressImage(data, compressionSettings.quality, compressionSettings.scale);
      setMedia(prev => [...prev, { data, id: Date.now(), type: 'image', name: `photo-${Date.now()}.jpg` }]);

      // Flash effect
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
    } catch (err) {
      console.error('Capture error:', err);
      setCameraError('Failed to capture photo. Try again.');
    }
  };

  // Pick from gallery/files
  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          let data = ev.target.result;
          // Compress image based on selected level
          data = await compressImage(data, compressionSettings.quality, compressionSettings.scale);
          setMedia(prev => [...prev, { data, id: Date.now() + Math.random(), type: 'image', name: file.name }]);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const videoData = await compressVideo(file, compressionSettings.videoQuality);
          setMedia(prev => [...prev, { ...videoData, id: Date.now() + Math.random() }]);
        };
        reader.readAsDataURL(file);
      }
    });
    e.target.value = '';
  };

  // Delete media
  const deleteMedia = (id) => {
    setMedia(prev => prev.filter(m => m.id !== id));
  };

  // Drag and drop reorder - FIXED VERSION
  const onDragStart = (e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e, dropIdx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) return;

    setMedia(prev => {
      const newMedia = [...prev];
      const [draggedItem] = newMedia.splice(dragIdx, 1);
      newMedia.splice(dropIdx, 0, draggedItem);
      return newMedia;
    });
    setDragIdx(null);
  };

  const onDragEnd = () => {
    setDragIdx(null);
  };

  // Upload ONE media at a time
  const uploadMedia = async () => {
    if (!connected || media.length === 0) return;
    setUploading(true);
    setUploadProgress({ current: 0, total: media.length });

    try {
      for (let i = 0; i < media.length; i++) {
        const m = media[i];

        emit('upload-images', {
          sessionId,
          images: [m.data],
          mediaType: m.type // 'image' or 'video'
        });

        setUploadProgress({ current: i + 1, total: media.length });
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      await new Promise(r => setTimeout(r, 500));
      setMedia([]);
      setUploadDone(true);
    } catch (err) {
      console.error('Upload error:', err);
      setCameraError('Upload failed. Check your connection.');
    } finally {
      setUploading(false);
    }
  };

  const captureMore = () => {
    setMedia([]);
    setUploadDone(false);
    setUploadProgress({ current: 0, total: 0 });
  };

  // ─── RENDER STATES ──────────────────────────────────────────

  if (sessionValid === null) {
    return (
      <div style={S.errorPage}>
        <div style={{ fontSize: 40 }}>⏳</div>
        <p>Validating session…</p>
      </div>
    );
  }

  if (sessionValid === false) {
    return (
      <div style={S.errorPage}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Session Not Found</h2>
        <p style={{ color: '#888', fontSize: 15 }}>
          This session is expired or invalid.
        </p>
      </div>
    );
  }

  if (uploadDone) {
    return (
      <div style={S.successPage}>
        <div style={{ fontSize: 60 }}>✅</div>
        <h2 style={{ fontSize: 24, fontWeight: 700 }}>Upload Complete!</h2>
        <p style={{ color: '#888', fontSize: 15 }}>
          {media.length === 0 ? 'Media sent to your PC.' : `${media.length} item${media.length !== 1 ? 's' : ''} sent!`}
        </p>
        <button
          style={{ ...S.uploadBtn(false), marginTop: 20, maxWidth: 280 }}
          onClick={captureMore}
        >
          📸 Capture More
        </button>
      </div>
    );
  }

  // ─── MAIN UI ────────────────────────────────────────────────

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <span style={S.logo}>📱 ScanSync</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={S.badge(connected ? '#16a34a' : '#dc2626')}>
            {connected ? '● Live' : '○ Offline'}
          </span>
          {media.length > 0 && (
            <span style={S.badge('#2563eb')}>
              {media.length} item{media.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Camera viewport */}
      <div style={{ ...S.camWrap, aspectRatio: cameraReady ? '4/3' : undefined }}>
        {cameraReady ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={S.video}
            />
            {flash && (
              <div style={{
                position: 'absolute', inset: 0,
                background: '#fff', opacity: 0.6, pointerEvents: 'none'
              }} />
            )}
          </>
        ) : (
          <div style={S.camPlaceholder}>
            <div style={{ fontSize: 36 }}>📷</div>
            {cameraError ? (
              <>
                <p style={{ fontSize: 14, color: '#ef4444' }}>❌ {cameraError}</p>
                <button
                  style={{ ...S.sideBtn('#2563eb'), marginTop: 10 }}
                  onClick={() => startCamera()}
                >
                  🔄 Retry Camera
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 14 }}>Initializing camera…</p>
                <p style={{ fontSize: 12, color: '#666' }}>
                  If prompted, allow camera access
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileInput}
      />

      {/* Controls */}
      <div style={S.controls}>
        {/* Compression Selector */}
        <div style={S.compressionBox}>
          <div style={S.compressionLabel}>📦 Quality Level</div>
          <select
            value={compressionLevel}
            onChange={(e) => setCompressionLevel(e.target.value)}
            style={S.compressionSelect}
          >
            {Object.entries(COMPRESSION_LEVELS).map(([key, val]) => (
              <option key={key} value={key}>{val.name}</option>
            ))}
          </select>
          <div style={S.compressionInfo}>
            {compressionSettings.name}
          </div>
        </div>

        {/* Capture buttons */}
        <div style={S.captureRow}>
          <button
            style={S.sideBtn()}
            onClick={() => fileInputRef.current?.click()}
          >
            <span style={{ fontSize: 22 }}>🖼</span>
            <span style={{ fontSize: 11 }}>Media</span>
          </button>

          <button
            style={S.captureBtn}
            disabled={!cameraReady || uploading}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; if (cameraReady) capture(); }}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.93)'}
            onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; if (cameraReady) capture(); }}
          >
            📸
          </button>

          <button 
            style={S.sideBtn(undefined, !cameraReady)} 
            onClick={flipCamera}
            disabled={!cameraReady}
          >
            <span style={{ fontSize: 22 }}>🔄</span>
            <span style={{ fontSize: 11 }}>Flip</span>
          </button>
        </div>

        {/* Upload button */}
        <button
          style={S.uploadBtn(media.length === 0 || !connected || uploading)}
          disabled={media.length === 0 || !connected || uploading}
          onClick={uploadMedia}
        >
          {uploading
            ? `⏳ Uploading ${uploadProgress.current}/${uploadProgress.total}...`
            : media.length === 0
              ? '📷 Take photos/videos first'
              : `⬆ Upload ${media.length} Item${media.length !== 1 ? 's' : ''} to PC`
          }
        </button>

        {uploading && uploadProgress.total > 0 && (
          <div style={S.progressBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Uploading {uploadProgress.current} of {uploadProgress.total}</span>
              <span>{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: '#333', overflow: 'hidden' }}>
              <div style={S.progressFill((uploadProgress.current / uploadProgress.total) * 100)} />
            </div>
            <p style={{ marginTop: 8, fontSize: 12, color: '#16a34a' }}>
              ⏱ Waiting for {uploadProgress.total - uploadProgress.current} more…
            </p>
          </div>
        )}
      </div>

      {/* Media stack */}
      {media.length > 0 && (
        <div style={S.stackSection}>
          <div style={S.stackHeader}>
            <span style={S.stackTitle}>
              Captured ({media.length}) — drag to reorder
            </span>
            <button
              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
              onClick={() => { if (window.confirm('Clear all?')) { setMedia([]); } }}
            >
              Clear
            </button>
          </div>

          <div style={S.grid3}>
            {media.map((item, i) => (
              <div
                key={item.id}
                style={{
                  ...S.imgCard,
                  ...(dragIdx === i ? S.imgCardDragging : {})
                }}
                draggable
                onDragStart={(e) => onDragStart(e, i)}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, i)}
                onDragEnd={onDragEnd}
              >
                {item.type === 'video' ? (
                  <div style={{...S.vidThumb, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30}}>
                    🎥
                  </div>
                ) : (
                  <img src={item.data} alt={`${i + 1}`} style={S.imgThumb} />
                )}
                <div style={S.imgNum}>{i + 1}</div>
                <div style={S.mediaType}>{item.type === 'video' ? '🎥' : '📸'}</div>
                <button style={S.delBtn} onClick={() => deleteMedia(item.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}