import React, { useRef, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import useSocket from '../hooks/useSocket';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

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
  // Camera area
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
    color: '#555', gap: 10
  },
  // Bottom controls
  controls: {
    padding: '14px 16px',
    background: '#111',
    borderTop: '1px solid #222'
  },
  captureRow: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12
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
  sideBtn: (color = '#1e1e1e') => ({
    background: color,
    color: '#fff', border: 'none',
    borderRadius: 12, padding: '10px 16px',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 3
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
  // Stack
  stackSection: {
    flex: 1, background: '#111',
    padding: '0 16px 16px'
  },
  stackHeader: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', padding: '12px 0 10px'
  },
  stackTitle: { fontSize: 14, fontWeight: 600, color: '#ccc' },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8
  },
  imgCard: (dragging) => ({
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    aspectRatio: '3/4',
    background: '#1a1a1a',
    opacity: dragging ? 0.4 : 1,
    transition: 'opacity 0.15s'
  }),
  imgThumb: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  imgNum: {
    position: 'absolute', top: 5, left: 5,
    background: 'rgba(0,0,0,0.7)', color: '#fff',
    borderRadius: 6, fontSize: 11, fontWeight: 700,
    padding: '2px 6px'
  },
  delBtn: {
    position: 'absolute', top: 5, right: 5,
    background: 'rgba(220,38,38,0.9)', color: '#fff',
    border: 'none', borderRadius: 6,
    width: 26, height: 26, fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer'
  },
  // Error / success states
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

// ─── COMPONENT ───────────────────────────────────────────────────

export default function CameraPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  const [sessionId, setSessionId] = useState(null);
  const [sessionValid, setSessionValid] = useState(null); // null=checking, true, false
  const [images, setImages] = useState([]); // [{data: base64, id}]
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [flash, setFlash] = useState(false);

  const { connected, emit } = useSocket(sessionId);

  // Parse sessionId from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('sessionId');
    if (!sid) { setSessionValid(false); return; }
    setSessionId(sid);
    // Validate session with backend
    axios.get(`${BACKEND_URL}/api/sessions/${sid}`)
      .then(() => setSessionValid(true))
      .catch(() => setSessionValid(false));
  }, []);

  // Start camera
  const startCamera = useCallback(async (mode = facingMode) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 960 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraReady(false);
    }
  }, [facingMode]);

  useEffect(() => {
    if (sessionValid === true) startCamera();
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, [sessionValid]); // eslint-disable-line

  // Flip camera
  const flipCamera = async () => {
    const mode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(mode);
    await startCamera(mode);
  };

  // Capture from video
  const capture = () => {
    if (!canvasRef.current || !videoRef.current || !cameraReady) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const data = canvas.toDataURL('image/jpeg', 0.88);
    setImages(prev => [...prev, { data, id: Date.now() }]);
    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
  };

  // Pick from gallery
  const pickFromGallery = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages(prev => [...prev, { data: ev.target.result, id: Date.now() + Math.random() }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Delete image
  const deleteImg = (id) => setImages(prev => prev.filter(img => img.id !== id));

  // Drag to reorder
  const onDragStart = (i) => setDragIdx(i);
  const onDragOver = (e, i) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    setImages(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIdx, 1);
      arr.splice(i, 0, moved);
      setDragIdx(i);
      return arr;
    });
  };
  const onDragEnd = () => setDragIdx(null);

  // Upload to PC
  const uploadAll = async () => {
    if (!connected || images.length === 0) return;
    setUploading(true);
    emit('upload-images', {
      sessionId,
      images: images.map(img => img.data)
    });
    // Wait a moment to let the server broadcast
    await new Promise(r => setTimeout(r, 800));
    setUploading(false);
    setUploadDone(true);
  };

  // Reset after upload
  const captureMore = () => {
    setImages([]);
    setUploadDone(false);
  };

  // ─── RENDER STATES ──────────────────────────────────────────────

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
        <p style={{ color: '#888', fontSize: 15 }}>
          Please go back to your PC and create a new session, then scan the fresh QR code.
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
          {images.length} image{images.length !== 1 ? 's' : ''} sent to your PC.
        </p>
        <p style={{ color: '#888', fontSize: 14 }}>Check your PC dashboard now.</p>
        <button
          style={{ ...S.uploadBtn(false), marginTop: 20, maxWidth: 280 }}
          onClick={captureMore}
        >
          📸 Capture More
        </button>
      </div>
    );
  }

  // ─── MAIN CAMERA UI ─────────────────────────────────────────────

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <span style={S.logo}>📱 ScanSync</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={S.badge(connected ? '#16a34a' : '#dc2626')}>
            {connected ? '● Live' : '○ Offline'}
          </span>
          {images.length > 0 && (
            <span style={S.badge('#2563eb')}>
              {images.length} photo{images.length !== 1 ? 's' : ''}
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
            {/* Flash overlay */}
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
            <p style={{ fontSize: 14 }}>Loading camera…</p>
            <p style={{ fontSize: 12, color: '#444' }}>Allow camera access if prompted</p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={pickFromGallery}
      />

      {/* Capture controls */}
      <div style={S.controls}>
        <div style={S.captureRow}>
          {/* Gallery picker */}
          <button
            style={S.sideBtn()}
            onClick={() => fileInputRef.current?.click()}
          >
            <span style={{ fontSize: 22 }}>🖼</span>
            <span style={{ fontSize: 11 }}>Gallery</span>
          </button>

          {/* Shutter button */}
          <button
            style={S.captureBtn}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; capture(); }}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.93)'}
            onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; capture(); }}
          >
            📸
          </button>

          {/* Flip camera */}
          <button style={S.sideBtn()} onClick={flipCamera}>
            <span style={{ fontSize: 22 }}>🔄</span>
            <span style={{ fontSize: 11 }}>Flip</span>
          </button>
        </div>

        {/* Upload button */}
        <button
          style={S.uploadBtn(images.length === 0 || !connected || uploading)}
          disabled={images.length === 0 || !connected || uploading}
          onClick={uploadAll}
        >
          {uploading
            ? '⏳ Uploading…'
            : images.length === 0
              ? '📷 Take some photos first'
              : `⬆ Upload ${images.length} Photo${images.length !== 1 ? 's' : ''} to PC`
          }
        </button>
      </div>

      {/* Image stack */}
      {images.length > 0 && (
        <div style={S.stackSection}>
          <div style={S.stackHeader}>
            <span style={S.stackTitle}>
              Captured ({images.length}) — drag to reorder
            </span>
            <button
              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
              onClick={() => { if (window.confirm('Clear all?')) setImages([]); }}
            >
              Clear all
            </button>
          </div>

          <div style={S.grid3}>
            {images.map((img, i) => (
              <div
                key={img.id}
                style={S.imgCard(dragIdx === i)}
                draggable
                onDragStart={() => onDragStart(i)}
                onDragOver={e => onDragOver(e, i)}
                onDragEnd={onDragEnd}
              >
                <img src={img.data} alt={`${i + 1}`} style={S.imgThumb} />
                <div style={S.imgNum}>{i + 1}</div>
                <button style={S.delBtn} onClick={() => deleteImg(img.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
