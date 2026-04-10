import React, { createContext, useEffect, useState, useMemo } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  
  // Dynamically determine the backend URL based on current page URL
  const SERVER_URL = useMemo(() => {
    if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
    
    const { protocol, hostname } = window.location;
    // Assume backend is on port 5000 of the same host
    return `${protocol}//${hostname}:5000`;
  }, []);

  useEffect(() => {
    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling']
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket.IO connected successfully with ID:', newSocket.id);
    });

    newSocket.on('message', (data) => {
      console.log('Message from server:', data);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket.IO disconnected.');
    });

    return () => newSocket.close();
  }, [SERVER_URL]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export { SocketContext, SocketProvider };
