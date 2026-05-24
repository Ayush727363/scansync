import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import useSocket from '../hooks/useSocket';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

// ─── STYLES ──────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100vh',
    background: '#f0f2f5',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  navbar: {
    background: '#fff',
    borderBottom: '1px solid #e8ecf0',
    padding: '0 32px',
    height: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
  },
  logo: { fontSize: 20, fontWeight: 700, color: '#1a1a2e', letterSpacing: -0.5 },
  dot: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 6 },
  main: { maxWidth: 1200, margin: '0 auto', padding: '32px 24px' },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 28,
    marginBottom: 24,
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)'
  },
  row: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  h2: { fontSize: 18, fontWeight: 600, color: '#1a1a2e', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  sessionId: {
    fontFamily: 'monospace',
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a2e',
    letterSpacing: 6,
    background: '#f5f7fa',
    padding: '10px 20px',
    borderRadius: 8,
    border: '2px dashed #d0d7e0'
  },
  qrWrap: {
    background: '#fff',
    border: '2px solid #e8ecf0',
    borderRadius: 12,
    padding: 16,
    display: 'inline-block'
  },
  urlBox: {
    background: '#f5f7fa',
    border: '1px solid #e0e5eb',
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#555',
    wordBreak: 'break-all',
    flex: 1
  },
  btn: (color = '#2563eb', text = '#fff') => ({
    background: color,
    color: text,
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
    transition: 'opacity 0.15s'
  }),
  btnOutline: {
    background: 'transparent',
    color: '#2563eb',
    border: '2px solid #2563eb',
    borderRadius: 8,
    padding: '9px 18px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  bigCreateBtn: {
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '18px 40px',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: 0.3,
    boxShadow: '0 4px 16px rgba(37,99,235,0.3)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 14,
    marginTop: 20
  },
  imgCard: (selected) => ({
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    cursor: 'pointer',
    border: selected ? '3px solid #2563eb' : '3px solid transparent',
    boxShadow: selected ? '0 0 0 1px #2563eb' : '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'border 0.1s, box-shadow 0.1s',
    background: '#e8ecf0',
    animation: 'fadeIn 0.3s'
  }),
  imgThumb: { width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' },
  vidThumb: { 
    width: '100%', 
    aspectRatio: '3/4', 
    objectFit: 'cover', 
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1a1a2e',
    fontSize: 48,
    color: '#fff'
  },
  imgOverlay: {
    position: 'absolute', inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, opacity: 0, transition: 'opacity 0.15s'
  },
  imgNum: {
    position: 'absolute', top: 6, left: 6,
    background: 'rgba(0,0,0,0.6)', color: '#fff',
    borderRadius: 6, fontSize: 11, fontWeight: 700,
    padding: '2px 7px'
  },
  mediaType: {
    position: 'absolute', top: 6, right: 6,
    background: 'rgba(37,99,235,0.9)', color: '#fff',
    borderRadius: 6, fontSize: 11, fontWeight: 700,
    padding: '2px 7px'
  },
  imgBtn: (bg) => ({
    background: bg, border: 'none', borderRadius: 6,
    color: '#fff', padding: '6px 10px', fontSize: 12,
    cursor: 'pointer', fontWeight: 600
  }),
  emptyState: {
    textAlign: 'center', padding: '60px 20px',
    color: '#aab', fontSize: 15
  },
  badge: (color) => ({
    background: color + '22', color, borderRadius: 6,
    padding: '3px 10px', fontSize: 12, fontWeight: 600
  }),
  notification: {
    position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
    background: '#10b981', color: '#fff',
    borderRadius: 10, padding: '12px 20px', fontSize: 14,
    fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    animation: 'slideUp 0.3s'
  }
};

// ─── HELPERS ─────────────────────────────────────────────────

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function b64toBlob(b64, mime) {
  const byteStr = atob(b64.split(',')[1]);
  const ab = new ArrayBuffer(byteStr.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
  return new Blob([ab], { type: mime });
}

// ─── COPY TO CLIPBOARD - UNIVERSAL FIX ──────────────────────

async function copyToClipboard(text) {
  try {
    // Try modern API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.log('Clipboard API failed:', err);
  }

  // Fallback method
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (err) {
    console.log('Fallback copy failed:', err);
    return false;
  }
}

async function copyImageToClipboard(b64Data) {
  try {
    const blob = b64toBlob(b64Data, 'image/jpeg');
    
    // Try modern API
    if (navigator.clipboard && navigator.clipboard.write) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/jpeg': blob })]);
      return true;
    }
  } catch (err) {
    console.log('Image clipboard failed:', err);
  }

  // For images, offer download as fallback
  return false;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────

export default function Dashboard() {
  const { connected, emit, on, off } = useSocket();
  const [sessionId, setSessionId] = useState(null);
  const [mobileUrl, setMobileUrl] = useState('');
  const [media, setMedia] = useState([]); // {data, type: 'image'|'video'}
  const [selected, setSelected] = useState(new Set());
  const [status, setStatus] = useState('idle');
  const [clientCount, setClientCount] = useState(0);
  const [notification, setNotification] = useState(null);
  const [isReceiving, setIsReceiving] = useState(false);

  const notify = useCallback((msg, color = '#2563eb') => {
    setNotification({ msg, color });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Listen for media
  useEffect(() => {
    on('images-received', (data) => {
      setMedia(data.images || []);
      setIsReceiving(true);
      if (data.images && data.images.length > 0) {
        notify(`📥 Received ${data.images.length} item${data.images.length !== 1 ? 's' : ''}!`, '#16a34a');
      }
    });

    on('client-count', (data) => setClientCount(data.count));
    on('session-expired', () => {
      notify('Session expired. Create a new one.', '#dc2626');
      setSessionId(null); setMedia([]); setStatus('idle');
    });
    on('error', (err) => notify(err.message, '#dc2626'));

    return () => {
      off('images-received'); off('client-count');
      off('session-expired'); off('error');
    };
  }, [on, off, notify]);

  // Create session
  const createSession = async () => {
    setStatus('creating');
    try {
      const res = await axios.post(`${BACKEND_URL}/api/sessions/create`);
      const { sessionId: sid, mobileUrl: url } = res.data;
      setSessionId(sid);
      setMobileUrl(url);
      setMedia([]); setSelected(new Set());
      emit('join-session', sid);
      setStatus('waiting');
      setIsReceiving(false);
    } catch (e) {
      notify('Failed to create session. Is the backend running?', '#dc2626');
      setStatus('idle');
    }
  };

  // End session
  const endSession = async () => {
    if (!window.confirm('End session? All media will be cleared.')) return;
    await axios.delete(`${BACKEND_URL}/api/sessions/${sessionId}`).catch(() => {});
    setSessionId(null); setMedia([]); setSelected(new Set());
    setStatus('idle'); setClientCount(0);
  };

  // Selection
  const toggleSelect = (i) => {
    const s = new Set(selected);
    s.has(i) ? s.delete(i) : s.add(i);
    setSelected(s);
  };
  const selectAll = () => setSelected(media.length === selected.size ? new Set() : new Set(media.map((_, i) => i)));

  // Download
  const downloadOne = (mediaData, i) => {
    const a = document.createElement('a');
    a.href = mediaData; 
    a.download = `scansync-${sessionId}-${i + 1}.jpg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const downloadAllZip = async () => {
    const targets = selected.size > 0 ? [...selected].map(i => media[i]) : media;
    if (!targets.length) return;
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      targets.forEach((m, i) => {
        zip.file(`media-${i + 1}.jpg`, m.split(',')[1], { base64: true });
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, `scansync-${sessionId}.zip`);
      notify(`✅ Downloaded ${targets.length} items as ZIP`);
    } catch (e) {
      targets.forEach((m, i) => setTimeout(() => downloadOne(m, i), i * 200));
      notify(`✅ Downloading ${targets.length} items`);
    }
  };

  // Delete
  const deleteSelected = () => {
    const keep = media.filter((_, i) => !selected.has(i));
    setMedia(keep);
    emit('clear-images', sessionId);
    if (keep.length > 0) emit('upload-images', { sessionId, images: keep });
    setSelected(new Set());
    notify('Deleted selected items');
  };

  const clearAll = () => {
    if (!window.confirm('Delete all media from session?')) return;
    setMedia([]); setSelected(new Set());
    emit('clear-images', sessionId);
    notify('All media cleared');
  };

  // Copy image
  const handleCopyImage = async (mediaData, i) => {
    const success = await copyImageToClipboard(mediaData);
    if (success) {
      notify('📋 Image copied to clipboard!');
    } else {
      notify('Clipboard not supported. Try downloading instead.', '#f59e0b');
    }
  };

  // Copy URL
  const handleCopyUrl = async () => {
    const success = await copyToClipboard(mobileUrl);
    if (success) {
      notify('📋 Link copied to clipboard!');
    } else {
      notify('Failed to copy. Try again.', '#f59e0b');
    }
  };

  // ─── RENDER ─────────────────────────────────────────────────

  return (
    <div style={S.page}>
      {notification && (
        <div style={{ ...S.notification, background: notification.color }}>
          {notification.msg}
        </div>
      )}

      {/* Navbar */}
      <nav style={S.navbar}>
        <span style={S.logo}>📸 ScanSync</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#888' }}>
            <span style={{ ...S.dot, background: connected ? '#16a34a' : '#dc2626' }} />
            {connected ? 'Connected' : 'Disconnected'}
          </span>
          {sessionId && <span style={S.badge('#2563eb')}>Session: {sessionId}</span>}
          {clientCount > 1 && <span style={S.badge('#16a34a')}>📱 Mobile connected</span>}
        </div>
      </nav>

      <main style={S.main}>
        {!sessionId && (
          <div style={{ ...S.card, textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, color: '#1a1a2e' }}>
              ScanSync – PC Dashboard
            </h1>
            <p style={{ color: '#888', marginBottom: 32, fontSize: 15 }}>
              Create a session, scan the QR code on your phone, and transfer images & videos instantly.
            </p>
            <button style={S.bigCreateBtn} onClick={createSession} disabled={!connected}>
              {!connected ? '⏳ Connecting...' : '✨ Create New Session'}
            </button>
          </div>
        )}

        {sessionId && (
          <>
            {/* Session info + QR */}
            <div style={S.card}>
              <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {/* QR Code */}
                <div>
                  <p style={S.label}>Scan with phone camera</p>
                  <div style={S.qrWrap}>
                    <QRCodeSVG value={mobileUrl} size={200} level="H" includeMargin={false} />
                  </div>
                </div>
                {/* Details */}
                <div style={{ flex: 1, minWidth: 260 }}>
                  <p style={S.label}>Session ID</p>
                  <div style={{ ...S.sessionId, marginBottom: 20 }}>{sessionId}</div>

                  <p style={S.label}>Mobile Link</p>
                  <div style={{ ...S.row, marginBottom: 20 }}>
                    <div style={S.urlBox}>{mobileUrl}</div>
                    <button style={S.btn()} onClick={handleCopyUrl}>Copy</button>
                  </div>

                  <div style={S.row}>
                    <button style={S.btn('#16a34a')} onClick={createSession}>
                      🔄 New Session
                    </button>
                    <button style={S.btn('#dc2626')} onClick={endSession}>
                      ✕ End Session
                    </button>
                  </div>

                  <p style={{ marginTop: 16, fontSize: 13, color: '#aab' }}>
                    Session expires in 60 minutes.
                  </p>
                </div>
              </div>

              {isReceiving && media.length > 0 && (
                <div style={{ background: '#f0f9ff', border: '2px solid #0ea5e9', borderRadius: 10, padding: 16, marginTop: 16, color: '#0ea5e9' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 0, marginBottom: 10 }}>
                    📥 Receiving media in real-time
                  </h3>
                  <p style={{ fontSize: 13, margin: 0 }}>
                    Received: {media.length} item{media.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Media section */}
            <div style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <h2 style={{ ...S.h2, margin: 0 }}>
                  Media
                  <span style={{ ...S.badge('#2563eb'), marginLeft: 10, fontSize: 13 }}>
                    {media.length}
                  </span>
                  {selected.size > 0 && (
                    <span style={{ ...S.badge('#f59e0b'), marginLeft: 8, fontSize: 13 }}>
                      {selected.size} selected
                    </span>
                  )}
                </h2>

                {media.length > 0 && (
                  <div style={S.row}>
                    <button style={S.btnOutline} onClick={selectAll}>
                      {selected.size === media.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button style={S.btn()} onClick={downloadAllZip}>
                      ⬇ {selected.size > 0 ? `Download ${selected.size}` : 'Download All'}
                    </button>
                    {selected.size > 0 && (
                      <button style={S.btn('#dc2626')} onClick={deleteSelected}>
                        🗑 Delete {selected.size}
                      </button>
                    )}
                    <button style={S.btn('#64748b')} onClick={clearAll}>
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              {media.length === 0 ? (
                <div style={S.emptyState}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📱</div>
                  <p>Waiting for media from mobile…</p>
                  <p style={{ fontSize: 13, marginTop: 8, color: '#ccc' }}>
                    Scan the QR code and start capturing photos or videos
                  </p>
                </div>
              ) : (
                <div style={S.grid}>
                  {media.map((m, i) => (
                    <div
                      key={i}
                      style={S.imgCard(selected.has(i))}
                      onClick={() => toggleSelect(i)}
                      onMouseEnter={e => e.currentTarget.querySelector('.overlay').style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.querySelector('.overlay').style.opacity = 0}
                    >
                      {m.type === 'video' ? (
                        <div style={S.vidThumb}>🎥</div>
                      ) : (
                        <img src={m} alt={`Media ${i + 1}`} style={S.imgThumb} />
                      )}
                      <div className="overlay" style={S.imgOverlay}>
                        <button
                          style={S.imgBtn('#2563eb')}
                          onClick={e => { e.stopPropagation(); downloadOne(m, i); }}
                          title="Download"
                        >⬇</button>
                        {m.type !== 'video' && (
                          <button
                            style={S.imgBtn('#059669')}
                            onClick={e => { e.stopPropagation(); handleCopyImage(m, i); }}
                            title="Copy to clipboard"
                          >📋</button>
                        )}
                        <button
                          style={S.imgBtn('#dc2626')}
                          onClick={e => {
                            e.stopPropagation();
                            const keep = media.filter((_, idx) => idx !== i);
                            setMedia(keep);
                            emit('clear-images', sessionId);
                          }}
                          title="Delete"
                        >✕</button>
                      </div>
                      <div style={S.imgNum}>{i + 1}</div>
                      <div style={S.mediaType}>{m.type === 'video' ? '🎥' : '📸'}</div>
                      {selected.has(i) && (
                        <div style={{
                          position: 'absolute', top: 6, right: 6,
                          background: '#2563eb', borderRadius: '50%',
                          width: 22, height: 22, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 13
                        }}>✓</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { transform:translateY(100px); opacity:0; } to { transform:translateY(0); opacity:1; } }
        button:hover { opacity: 0.88; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}