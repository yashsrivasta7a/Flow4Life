import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, push, set } from 'firebase/database';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { MessageCircle, MapPin, AlertCircle, Clock, ArrowLeft, Send, User } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredChats = chats.filter(chat => {
    const searchLower = searchQuery.toLowerCase();
    return (
      chat.requestInfo?.patientName?.toLowerCase().includes(searchLower) ||
      chat.requestInfo?.bloodType?.toLowerCase().includes(searchLower) ||
      chat.requestInfo?.hospital?.toLowerCase().includes(searchLower) ||
      chat.requestInfo?.city?.toLowerCase().includes(searchLower)
    );
  });

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
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/")}
                className="bg-white text-red-600 px-5 py-2 rounded-xl hover:bg-red-50 transition-all transform hover:scale-105"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 transform transition-all hover:shadow-xl">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by patient name, blood type, hospital, or city..."
              className="w-full px-5 py-4 pr-12 text-lg border-2 border-gray-100 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Chats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 text-lg">Loading your chats...</p>
            </div>
          ) : filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                className={`bg-white p-6 rounded-2xl shadow-md transition-all cursor-pointer ${
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
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center">
                        <User className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {chat.requestInfo?.patientName || chat.otherUserName}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {getTimeAgo(chat.timestamp)}
                        </span>
                      </div>
                    </div>
                    {chat.unread && (
                      <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg mt-3">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {chat.lastMessage}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-2xl shadow-lg">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Chats</h3>
              <p className="text-gray-600">
                Your chats with blood requesters will appear here
              </p>
            </div>
          )}
        </div>

        {/* Chat Modal */}
        {selectedChat && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-2xl max-h-[80vh] flex flex-col overflow-hidden"
            >
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-red-600 to-red-800 text-white">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {chats.find(c => c.id === selectedChat)?.requestInfo?.patientName || 
                       chats.find(c => c.id === selectedChat)?.otherUserName}
                    </h3>
                    <div className="flex items-center gap-2 text-red-100">
                      <span>{chats.find(c => c.id === selectedChat)?.requestInfo?.bloodType} Blood Request</span>
                      {chats.find(c => c.id === selectedChat)?.requestInfo?.urgency === 'emergency' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-xs">
                          <AlertCircle className="w-3 h-3" />
                          Emergency
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
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
                          : 'bg-white text-gray-900 shadow-sm'
                      }`}
                    >
                      <p>{msg.text}</p>
                      <p className={`text-xs mt-1 ${
                        msg.isCurrentUser ? 'text-red-100' : 'text-gray-500'
                      }`}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 bg-white border-t">
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
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestChats; 