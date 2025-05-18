import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

const ChatNotification = () => {
  const auth = getAuth();
  const database = getDatabase();
  const navigate = useNavigate();
  const [unreadMessages, setUnreadMessages] = useState({});

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const messagesRef = ref(database, `messages/${user.uid}`);
    
    onValue(messagesRef, (snapshot) => {
      const messages = snapshot.val();
      if (messages) {
        const unread = {};
        Object.entries(messages).forEach(([senderId, userMessages]) => {
          const unreadCount = Object.values(userMessages).filter(msg => !msg.read).length;
          if (unreadCount > 0) {
            unread[senderId] = unreadCount;
            // Show toast for new messages
            showMessageNotification(senderId, unreadCount);
          }
        });
        setUnreadMessages(unread);
      }
    });

    return () => {
      off(messagesRef);
    };
  }, [auth.currentUser, database]);

  const showMessageNotification = (senderId, count) => {
    // Get sender's name from the database
    const userRef = ref(database, `users/${senderId}`);
    onValue(userRef, (snapshot) => {
      const senderData = snapshot.val();
      if (senderData) {
        toast(
          (t) => (
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-blue-500" />
              <div>
                <p className="font-medium">{senderData.name}</p>
                <p className="text-sm text-gray-600">
                  {count} new message{count > 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => {
                  navigate(`/chat/${senderId}`);
                  toast.dismiss(t.id);
                }}
                className="ml-2 px-3 py-1 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600"
              >
                View
              </button>
            </div>
          ),
          {
            duration: 5000,
            position: 'top-right',
            style: {
              background: 'white',
              color: 'black',
              padding: '16px',
            },
          }
        );
      }
    }, {
      onlyOnce: true
    });
  };

  return null; // This component doesn't render anything
};

export default ChatNotification; 