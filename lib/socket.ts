import { io, Socket } from 'socket.io-client';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3001';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
    if (!socket) {
        socket = io(API_BASE_URL, {
            autoConnect: false,
        });
    }
    return socket;
};

export const connectSocket = (token: string) => {
    const s = getSocket();
    s.auth = { token };
    
    if (s.disconnected) {
        s.connect();
    }
    return s;
};

export const disconnectSocket = () => {
    if (socket && socket.connected) {
        socket.disconnect();
    }
};
