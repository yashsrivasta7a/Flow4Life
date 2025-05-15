// Add this to your Chat component

import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, push, set, get } from 'firebase/database';
import { getMessaging, onMessage, getToken } from 'firebase/messaging';
import { app } from "../../Utils/Firebase";
import { toast } from "react-hot-toast";

// For city-based notifications, add this to your RequestForm component
export const sendCityNotification = async (city, bloodGroup, urgency) => {
  try {
    const db = getDatabase();
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) return;
    
    // Get all donors in the same city
    const donorsRef = ref(db, 'donation_requests');
    const snapshot = await get(donorsRef);
    const donors = [];
    
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const donor = childSnapshot.val();
        if (donor.city && donor.city.toLowerCase() === city.toLowerCase() && donor.userId !== currentUser.uid) {
          donors.push(donor);
        }
      });
    }
    
    // Send notification to each donor
    for (const donor of donors) {
      if (donor.userId) {
        // Get the user's FCM token
        const userTokenRef = ref(db, `users/${donor.userId}/fcmToken`);
        const tokenSnapshot = await get(userTokenRef);
        
        if (tokenSnapshot.exists()) {
          const token = tokenSnapshot.val();
          
          // Store notification in database
          const notificationsRef = ref(db, `notifications/${donor.userId}`);
          await push(notificationsRef, {
            title: `Urgent Blood Request in ${city}`,
            body: `Someone needs ${bloodGroup} blood ${urgency === 'Emergency' ? 'urgently' : 'soon'} in your city.`,
            timestamp: Date.now(),
            read: false,
            type: 'blood_request',
            bloodGroup,
            urgency,
            city,
            requesterId: currentUser.uid
          });
          
          // You would typically use a server for sending FCM messages
          // This is where you'd call your cloud function
          console.log(`Notification would be sent to token: ${token}`);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error sending city notification:", error);
    return false;
  }
};

// Chat notifications
// Add this to your Chat component
export const sendChatNotification = async (recipientId, message, senderName) => {
  try {
    const db = getDatabase();
    
    // Get recipient's FCM token
    const userTokenRef = ref(db, `users/${recipientId}/fcmToken`);
    const tokenSnapshot = await get(userTokenRef);
    
    if (tokenSnapshot.exists()) {
      const token = tokenSnapshot.val();
      
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
      
      // In a production app, you would use a server/cloud function to send this
      console.log(`Chat notification would be sent to token: ${token}`);
    }
    
    return true;
  } catch (error) {
    console.error("Error sending chat notification:", error);
    return false;
  }
};

// Add this to your Chat component, when sending a message
const sendMessage = (e) => {
  e.preventDefault();
  if (!newMessage.trim() || !selectedChat) return;

  const messageData = {
    text: newMessage,
    sender: auth.currentUser.uid,
    senderName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
    timestamp: Date.now()
  };

  // Add message to the messages collection
  const newMessageRef = push(ref(database, `messages/${selectedChat.id}`));
  set(newMessageRef, messageData);

  // Update the last message in the chat
  set(ref(database, `chats/${selectedChat.id}/lastMessage`), messageData);

  // Send notification to the other participant
  const otherParticipantId = selectedChat.participants.find(id => id !== auth.currentUser.uid);
  if (otherParticipantId) {
    sendChatNotification(
      otherParticipantId, 
      newMessage, 
      auth.currentUser.displayName || auth.currentUser.email.split('@')[0]
    );
  }

  setNewMessage('');
};

// Add this to your RequestForm component's onSubmit function
// After successfully pushing the blood request
await sendCityNotification(data.city, data.bloodGroupRequired, data.urgency);
toast.success("Request submitted and notifications sent to donors in your city!");

// Create a NotificationComponent to display notifications
export const NotificationComponent = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const database = getDatabase();

  useEffect(() => {
    if (!auth.currentUser) return;

    const notificationsRef = ref(database, `notifications/${auth.currentUser.uid}`);
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const notificationData = snapshot.val();
      if (notificationData) {
        const notificationList = Object.entries(notificationData).map(([id, data]) => ({
          id,
          ...data,
          createdAt: new Date(data.timestamp).toLocaleString()
        })).sort((a, b) => b.timestamp - a.timestamp);
        
        setNotifications(notificationList);
      } else {
        setNotifications([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth.currentUser, database]);

  const markAsRead = (notificationId) => {
    if (!auth.currentUser) return;
    
    const notificationRef = ref(database, `notifications/${auth.currentUser.uid}/${notificationId}`);
    set(notificationRef, { ...notifications.find(n => n.id === notificationId), read: true });
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800">Notifications</h2>
      </div>
      
      {loading ? (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading notifications...</p>
        </div>
      ) : notifications.length > 0 ? (
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {notifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`p-4 hover:bg-gray-50 cursor-pointer ${notification.read ? 'opacity-70' : ''}`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-full p-2 ${
                  notification.type === 'chat' ? 'bg-blue-100 text-blue-500' : 'bg-red-100 text-red-500'
                }`}>
                  {notification.type === 'chat' ? (
                    <MessageCircle className="w-5 h-5" />
                  ) : (
                    <Droplet className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{notification.title}</p>
                  <p className="text-sm text-gray-600">{notification.body}</p>
                  <p className="text-xs text-gray-500 mt-1">{notification.createdAt}</p>
                </div>
                {!notification.read && (
                  <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">
          <Bell className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p>No notifications yet</p>
        </div>
      )}
    </div>
  );
};