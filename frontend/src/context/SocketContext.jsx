import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

// One shared connection for the whole app, created outside React's render lifecycle.
// Creating/disconnecting it inside an effect makes React StrictMode's double mount (and Vite HMR)
// close the socket while its websocket handshake is still in flight, which the browser reports as
// "WebSocket is closed before the connection is established" and which drops the first connection.
let socketSingleton = null;

const getSocket = () => {
  if (!socketSingleton) {
    // In dev, Vite proxies /socket.io to http://127.0.0.1:5000 (IPv4-pinned, see
    // BACKEND_TARGET in vite.config.js) with ws: true.
    // Start with polling and upgrade to websocket: the Flask dev server
    // (Werkzeug/simple-websocket) can only upgrade one connection at a time,
    // so forcing `websocket` first makes Vite's proxy log ECONNABORTED whenever
    // a stale upgrade is aborted (HMR / StrictMode remount / tab reload).
    socketSingleton = io({
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      // Never give up: with a finite attempt count Socket.IO emits `reconnect_failed` and
      // stops reconnecting for good, so any backend outage longer than the retry budget
      // (Flask debug-reloader restart, or the Vite dev server being started before
      // run.py finished booting) left the Live Calls channel stuck on "RECONNECTING"
      // until the page was reloaded.
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      // Cap the exponential backoff so a restart is noticed within ~10s without
      // hammering the Werkzeug dev server / Vite proxy during a longer outage.
      reconnectionDelayMax: 10000,
      autoConnect: true,
    });
  }
  return socketSingleton;
};

if (import.meta.hot) {
  // A hot update replaces this module: drop the old connection so it does not linger.
  import.meta.hot.dispose(() => {
    socketSingleton?.disconnect();
    socketSingleton = null;
  });
}

export const SocketProvider = ({ children }) => {
  const [liveEvents, setLiveEvents] = useState([]);
  const [activeCallAlert, setActiveCallAlert] = useState(null);
  const socket = getSocket();
  const [isConnected, setIsConnected] = useState(socket.connected);
  const listenersRef = useRef(new Map());

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    // Handle inbound real-time calls broadcast from CallService.initiate_call
    const handleNewCall = (callData) => {
      triggerCallAlert(callData);
      notifyListeners('call:new', callData);
    };
    const handleTranscript = (transcriptData) => {
      notifyListeners('call:transcript', transcriptData);
    };
    const handleTransferred = (callData) => {
      notifyListeners('call:transferred', callData);
    };
    const handleEnded = (callData) => {
      notifyListeners('call:ended', callData);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('call:new', handleNewCall);
    socket.on('call:transcript', handleTranscript);
    socket.on('call:transferred', handleTransferred);
    socket.on('call:ended', handleEnded);

    // Re-sync in case the shared socket connected before this provider mounted
    if (socket.connected) handleConnect();

    return () => {
      // Detach only this provider's handlers; the shared connection stays open for other consumers.
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('call:new', handleNewCall);
      socket.off('call:transcript', handleTranscript);
      socket.off('call:transferred', handleTransferred);
      socket.off('call:ended', handleEnded);
    };
  }, [socket]);

  const notifyListeners = (event, data) => {
    const callbacks = listenersRef.current.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in socket listener for ${event}:`, e);
        }
      });
    }
  };

  const subscribe = useCallback((event, callback) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event).add(callback);

    return () => {
      const callbacks = listenersRef.current.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }, []);

  const triggerCallAlert = (callData) => {
    setActiveCallAlert(callData);
    setLiveEvents((prev) => [
      { id: Date.now(), type: 'CALL', data: callData, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 19),
    ]);
  };

  const clearCallAlert = () => setActiveCallAlert(null);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        liveEvents,
        activeCallAlert,
        triggerCallAlert,
        clearCallAlert,
        subscribe
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
