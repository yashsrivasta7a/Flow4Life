// server/index.js

import express from 'express';
import http from 'http';
import { Server as SocketIo } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new SocketIo(server, {
  cors: {
    origin: '*', // Adjust as needed for your setup
  },
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Example: Send a notification after 5 seconds
  setTimeout(() => {
    socket.emit('notification', {
      title: 'Hello!',
      body: 'This is a test notification.',
      url: 'https://example.com/chat',
    });
  }, 5000);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(4000, () => {
  console.log('Server listening on port 4000');
});
