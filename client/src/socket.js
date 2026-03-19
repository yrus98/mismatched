import { io } from 'socket.io-client';

const isProduction = import.meta.env.PROD;
const URL = isProduction ? undefined : (import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`);
export const socket = io(URL);

