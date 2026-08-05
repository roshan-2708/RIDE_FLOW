'use client';

import { createContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            const newSocket = import('http://localhost:5000', {
                transports: ['websocket'],
                withCredentials: true
            });

            newSocket.on('connect', () => {
                console.log('Socket connected');
                newSocket.emit('user : join', user.id);
            });

            setSocket(newSocket);

            return () => newSocket.close();
        }
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};