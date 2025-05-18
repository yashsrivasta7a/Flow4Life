import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, push, set } from 'firebase/database';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { MessageCircle, MapPin, AlertCircle, Clock, ArrowLeft, Send } from 'lucide-react';
import { getAuth } from 'firebase/auth';

const RequestChats = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const database = getDatabase();
  const auth = getAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/signin');
      return;
    }

    // Listen for user's chats
    const userChatsRef = ref(database, `userChats/${auth.currentUser.uid}`);
    const unsubscribe = onValue(userChatsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert to array and sort by timestamp
        const chatsArray = Object.entries(data)
          .map(([id, chat]) => ({
            id,
            ...chat,
            isRequester: chat.role === 'requester',
            isDonor: chat.role === 'donor'
          }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setChats(chatsArray);
      } else {
        setChats([]);
      }
      setLoading(false);
    });

    // If there's an activeChatId from navigation, select it
    if (location.state?.activeChatId) {
      setSelectedChat(location.state.activeChatId);
    }

    return () => unsubscribe();
  }, [auth.currentUser, database, navigate]);

  // Listen for messages when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      const messagesRef = ref(database, `messages/${selectedChat}`);
      const unsubscribe = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const messagesArray = Object.entries(data)
            .map(([id, message]) => ({
              id,
              ...message,
              isCurrentUser: message.sender === auth.currentUser.uid
            }))
            .sort((a, b) => a.timestamp - b.timestamp);
          setMessages(messagesArray);

          // Mark messages as read if they're not from current user
          if (auth.currentUser) {
            const chatRef = ref(database, `userChats/${auth.currentUser.uid}/${selectedChat}`);
            set(chatRef, { unread: false }, { merge: true });
          }
        } else {
          setMessages([]);
        }
      });

      return () => unsubscribe();
    }
  }, [selectedChat, database, auth.currentUser]);

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedChat) return;

    try {
      const chat = chats.find(c => c.id === selectedChat);
      const newMessage = {
        text: message,
        sender: auth.currentUser.uid,
        timestamp: Date.now(),
        senderRole: chat.role
      };

      // Add message to messages collection
      await push(ref(database, `messages/${selectedChat}`), newMessage);

      // Update last message in chat
      await set(ref(database, `chats/${selectedChat}/lastMessage`), {
        text: message,
        timestamp: Date.now(),
        sender: auth.currentUser.uid
      });

      // Update last message in both users' chat lists
      await set(ref(database, `userChats/${auth.currentUser.uid}/${selectedChat}/lastMessage`), message);
      await set(ref(database, `userChats/${auth.currentUser.uid}/${selectedChat}/timestamp`), Date.now());
      await set(ref(database, `userChats/${chat.otherUserId}/${selectedChat}/lastMessage`), message);
      await set(ref(database, `userChats/${chat.otherUserId}/${selectedChat}/timestamp`), Date.now());
      await set(ref(database, `userChats/${chat.otherUserId}/${selectedChat}/unread`), true);

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return Math.floor(seconds) + ' seconds ago';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/blood-requests')}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">
                    Blood Request Chats
                  </h1>
                  <p className="text-lg text-red-100">
                    Communicate with blood requesters
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
          </div>
        ) : chats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chats.map((chat) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer ${
                  selectedChat === chat.id ? 'ring-2 ring-red-500 ring-offset-2' : ''
                }`}
                onClick={() => setSelectedChat(chat.id)}
              >
                {/* Request Info */}
                {chat.requestInfo && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-100">
                        {chat.requestInfo.bloodType}
                      </span>
                      {chat.requestInfo.urgency === 'emergency' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium bg-red-600 text-white">
                          <AlertCircle className="w-4 h-4" />
                          Emergency
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <div>
                        <div className="font-medium">{chat.requestInfo.hospital}</div>
                        <div>{chat.requestInfo.city}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chat Preview */}
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-gray-800">
                      {chat.requestInfo?.patientName || chat.otherUserName}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {getTimeAgo(chat.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {chat.lastMessage}
                  </p>
                  {chat.unread && (
                    <div className="flex justify-end">
                      <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Chats</h3>
            <p className="text-gray-600">
              Your chats with blood requesters will appear here
            </p>
          </div>
        )}

        {/* Chat Interface */}
        {selectedChat && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="font-semibold">
                      {chats.find(c => c.id === selectedChat)?.requestInfo?.patientName || 
                       chats.find(c => c.id === selectedChat)?.otherUserName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {chats.find(c => c.id === selectedChat)?.requestInfo?.bloodType} Blood Request
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.isCurrentUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        msg.isCurrentUser
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p>{msg.text}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border-2 border-gray-100 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="p-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestChats; 