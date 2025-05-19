/* eslint-disable no-undef */
// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import webPush from 'web-push';
import { getDatabase, ref, onValue, get } from 'firebase/database';
import { app as firebaseApp } from './firebase-config.js'; // You'll need to create this file
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const server = http.createServer(app);
const database = getDatabase(firebaseApp);

// Apply CORS middleware to Express
app.use(cors());
app.use(express.json());

// Set up web-push
const vapidKeys = {
  publicKey: "BK9mBcf08rYak8LRxx3nOOWakdgXxukVCZBconXoDItOO_6dlpPPj6bFXc5_INLAg-bZobHWSI8ukifeOzeZ8eY",
  privateKey: "99XIohaaAF5OtscBpIE2KhAtI12EAW2IEiWPjD8BXBY"
};

webPush.setVapidDetails(
  'mailto:balironit@gmail.com', // Change to your email
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Set up Socket.IO with CORS configuration
const io = new Server(server, {
  cors: {
    origin: "*", // In production, specify your domain instead of "*"
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store active users
const activeUsers = new Map();

// Endpoint to save push subscription
app.post('/api/save-subscription', async (req, res) => {
  try {
    const { subscription, userId } = req.body;
    
    if (!subscription || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Save subscription to database
    const subscriptionRef = ref(database, `userSubscriptions/${userId}`);
    await set(subscriptionRef, JSON.stringify(subscription));
    
    res.status(200).json({ message: 'Subscription saved successfully' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send push notification
const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    // Get user's subscription from database
    const subscriptionRef = ref(database, `userSubscriptions/${userId}`);
    const snapshot = await get(subscriptionRef);
    
    if (snapshot.exists()) {
      const subscription = JSON.parse(snapshot.val());
      
      // Send push notification
      await webPush.sendNotification(
        subscription,
        JSON.stringify({
          title,
          body,
          data
        })
      );
      
      console.log(`Push notification sent to user ${userId}`);
      return true;
    } else {
      console.log(`No push subscription found for user ${userId}`);
      return false;
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  
  // Handle user joining
  socket.on("join", (userId) => {
    if (!userId) return;
    
    console.log(`User ${userId} joined with socket ${socket.id}`);
    socket.join(userId); // Join user-specific room
    activeUsers.set(socket.id, userId);
    
    // Emit user online status if needed
    io.emit("user-status", { userId, status: "online" });
  });
  
  // Handle sending messages
  socket.on("send-message", async (data) => {
    if (!data.receiverId) {
      console.error("Receiver ID is missing:", data);
      return;
    }
    
    console.log(`Message sent from ${data.senderId} to ${data.receiverId}`);
    
    // Add message ID if not provided
    if (!data.id) {
      data.id = Date.now().toString();
    }
    
    // Check if receiver is active (has an open socket)
    const receiverActive = Array.from(activeUsers.values()).includes(data.receiverId);
    
    // Send message to the recipient via socket
    io.to(data.receiverId).emit("receive-message", data);
    
    // Send delivery confirmation to sender
    socket.emit("message-delivered", { id: data.id, timestamp: Date.now() });
    
    // If receiver is not active, send push notification
    if (!receiverActive) {
      await sendPushNotification(
        data.receiverId,
        `Message from ${data.senderName || 'User'}`,
        data.text,
        {
          chatId: data.chatId,
          senderId: data.senderId,
          messageId: data.id
        }
      );
    }
  });
  
  // Handle typing indicator
  socket.on("typing", (data) => {
    if (!data.receiverId) return;
    io.to(data.receiverId).emit("user-typing", { 
      senderId: data.senderId,
      typing: true 
    });
  });
  
  // Handle stop typing
  socket.on("stop-typing", (data) => {
    if (!data.receiverId) return;
    io.to(data.receiverId).emit("user-typing", { 
      senderId: data.senderId,
      typing: false 
    });
  });
  
  // Handle disconnection
  socket.on("disconnect", () => {
    const userId = activeUsers.get(socket.id);
    if (userId) {
      console.log(`User ${userId} disconnected`);
      activeUsers.delete(socket.id);
      
      // Emit user offline status if needed
      io.emit("user-status", { userId, status: "offline" });
    } else {
      console.log("User disconnected:", socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});