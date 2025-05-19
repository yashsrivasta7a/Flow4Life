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

  // Remove the test notification
  // setTimeout(() => {
  //   socket.emit('notification', {
  //     title: 'Hello!',
  //     body: 'This is a test notification.',
  //     url: 'https://example.com/chat',
  //   });
  // }, 5000);

  // Listen for new messages and send notification to the receiver
  socket.on('send-message', (data) => {
    // data: { text, senderId, receiverId, senderName, timestamp }
    // Emit notification to the receiver only
    io.emit('notification', {
      title: `Message from ${data.senderName || 'User'}`,
      body: data.text,
      url: `/chats?selected=${data.senderId}`,
      receiverId: data.receiverId
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(4000, () => {
  console.log('Server listening on port 4000');
});
