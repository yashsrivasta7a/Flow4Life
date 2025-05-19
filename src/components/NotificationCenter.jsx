// src/components/NotificationCenter.js
import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { toast } from 'react-hot-toast';

const NotificationCenter = () => {
  const auth = getAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // Listen for new notifications
        const db = getDatabase();
        const notificationsRef = ref(db, `notifications/${user.uid}`);
        
        const notificationListener = onValue(notificationsRef, (snapshot) => {
          const data = snapshot.val();
          console.log('[NotificationCenter] Notifications fetched:', data);
          if (data) {
            const notifList = Object.entries(data).map(([key, value]) => ({
              id: key,
              ...value
            }))
            .filter(notif => !notif.read)
            .sort((a, b) => b.timestamp - a.timestamp);
            
            setNotifications(notifList);
            
            // Show toast for new notifications
            notifList.forEach(notif => {
              if (!notif.toastDisplayed) {
                console.log('[NotificationCenter] Showing toast for notification:', notif);
                toast(notif.title, {
                  description: notif.body,
                  action: {
                    label: "View",
                    onClick: () => markAsRead(notif.id)
                  },
                });
                
                // Mark as toast displayed
                update(ref(db, `notifications/${user.uid}/${notif.id}`), {
                  toastDisplayed: true
                });
              }
            });
          }
        });
        
        return () => {
          // Cleanup listener
          notificationListener();
        };
      }
    });
    
    return () => unsubscribe();
  }, [auth]);

  const markAsRead = (notificationId) => {
    const db = getDatabase();
    update(ref(db, `notifications/${auth.currentUser.uid}/${notificationId}`), {
      read: true
    });
  };

  return null; // This component doesn't render anything visible
};

export default NotificationCenter;