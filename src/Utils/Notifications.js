// Path: src/Utils/Notifications.js
import { getDatabase, ref, push, get } from 'firebase/database';
import { getAuth } from 'firebase/auth';

export const sendChatNotification = async (recipientId, message, senderName) => {
    console.log(`Attempting to send notification to ${recipientId}`);
    try {
      const db = getDatabase();
      
      // Get recipient's FCM token
      const userTokenRef = ref(db, `users/${recipientId}/fcmToken`);
      console.log(`Looking for token at: users/${recipientId}/fcmToken`);
      
      const tokenSnapshot = await get(userTokenRef);
      
      if (tokenSnapshot.exists()) {
        const token = tokenSnapshot.val();
        console.log(`Found token: ${token}`);
        
        // Store notification in database
        const notificationsRef = ref(db, `notifications/${recipientId}`);
        await push(notificationsRef, {
          title: `New message from ${senderName}`,
          body: message.length > 50 ? message.substring(0, 50) + '...' : message,
          timestamp: Date.now(),
          read: false,
          type: 'chat',
          senderId: getAuth().currentUser.uid,
          senderName
        });
        
        // Send notification via socket.io for real-time delivery
        if (typeof window !== 'undefined') {
          // Only run in browser
          import('../Utils/socket').then(({ default: socket }) => {
            const payload = {
              text: message,
              senderId: getAuth().currentUser.uid,
              receiverId: recipientId,
              senderName,
              timestamp: Date.now()
            };
            console.log('[Socket.IO] Emitting send-message:', payload);
            socket.emit('send-message', payload);
          });
        }
        
        console.log(`Notification stored in database for ${recipientId}`);
      } else {
        console.log(`No FCM token found for user ${recipientId}`);
      }
      
      return true;
    } catch (error) {
      console.error("Error sending chat notification:", error);
      return false;
    }
  };