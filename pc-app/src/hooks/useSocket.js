import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

export default function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10
    });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    return () => socket.disconnect();
  }, []);

  const emit = (event, data) => socketRef.current?.emit(event, data);
  const on = (event, fn) => socketRef.current?.on(event, fn);
  const off = (event, fn) => socketRef.current?.off(event, fn);

  return { connected, emit, on, off };
}
