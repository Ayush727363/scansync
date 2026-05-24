import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

export default function useSocket(sessionId) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const socket = io(BACKEND_URL, { reconnection: true });
    socketRef.current = socket;
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-session', sessionId);
    });
    socket.on('disconnect', () => setConnected(false));
    return () => socket.disconnect();
  }, [sessionId]);

  const emit = (event, data) => socketRef.current?.emit(event, data);

  return { connected, emit };
}
