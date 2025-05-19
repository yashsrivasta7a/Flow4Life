// src/Utils/socket.js
import { io } from "socket.io-client";
const socket = io("http://localhost:4000"); // Updated to match backend port
export default socket;
