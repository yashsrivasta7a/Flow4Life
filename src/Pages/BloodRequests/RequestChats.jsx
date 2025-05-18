import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getDatabase, ref, onValue, push, set, get } from 'firebase/database';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { MessageCircle, MapPin, AlertCircle, Clock, ArrowLeft, Send, User, Search } from 'lucide-react';
import { getAuth } from 'firebase/auth';

const RequestChats = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const database = getDatabase();
  const auth = getAuth();
  const [chats, setChats] = useState([]);
  const [availableRequests, setAvailableRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedChatData, setSelectedChatData] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/signin');
      return;
    }

    // Listen for user's chats
    const userChatsRef = ref(database, `userChats/${auth.currentUser.uid}`);
    const unsubscribe = onValue(userChatsRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const chatsArray = await Promise.all(Object.entries(data).map(async ([id, chat]) => {
          if (chat.otherUserId) {
            try {
              const userRef = ref(database, `users/${chat.otherUserId}`);
              const userSnapshot = await get(userRef);
              
              if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                chat.otherUserName = userData.name || userData.displayName || userData.email?.split('@')[0] || chat.otherUserName || 'Unknown User';
              }
            } catch (error) {
              console.error('Error fetching user data:', error);
            }
          }
          
          return {
            id,
            ...chat,
            displayName: chat.otherUserName || chat.requestInfo?.patientName || 'Unknown User'
          };
        }));

        const sortedChats = chatsArray.sort((a, b) => b.timestamp - a.timestamp);
        setChats(sortedChats);

        if (location.state?.activeChatId) {
          const activeChat = sortedChats.find(chat => chat.id === location.state.activeChatId);
          if (activeChat) {
            if (location.state.otherUserName) {
              activeChat.otherUserName = location.state.otherUserName;
            }
            if (location.state.otherUserId) {
              activeChat.otherUserId = location.state.otherUserId;
            }
            handleChatSelect(location.state.activeChatId, activeChat);
          }
          window.history.replaceState({}, document.title);
        }
      } else {
        setChats([]);
      }
      setLoading(false);
    });

    // Fetch available blood requests
    const requestsRef = ref(database, 'blood_requests');
    const requestsUnsubscribe = onValue(requestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const requestsArray = Object.entries(data)
          .map(([id, request]) => ({
            id,
            ...request,
          }))
          .filter(request => request.userId !== auth.currentUser.uid) // Filter out current user's requests
          .sort((a, b) => {
            if (a.urgency === 'emergency' && b.urgency !== 'emergency') return -1;
            if (a.urgency !== 'emergency' && b.urgency === 'emergency') return 1;
            return b.timestamp - a.timestamp;
          });
        setAvailableRequests(requestsArray);
      } else {
        setAvailableRequests([]);
      }
    });

    return () => {
      unsubscribe();
      requestsUnsubscribe();
    };
  }, [auth.currentUser, database, navigate, location.state]);

  // Listen for messages when a chat is selected
  useEffect(() => {
    if (!selectedChat) return;

    setMessages([]); // Clear messages when changing chats
    const messagesRef = ref(database, `messages/${selectedChat}`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesList = Object.entries(data)
          .map(([id, message]) => ({
            id,
            ...message,
            isCurrentUser: message.sender === auth.currentUser.uid
          }))
          .sort((a, b) => a.timestamp - b.timestamp);
        setMessages(messagesList);
      }
    });

    // Mark chat as read
    const chatRef = ref(database, `userChats/${auth.currentUser.uid}/${selectedChat}`);
    set(chatRef, { unread: false }, { merge: true });

    return () => unsubscribe();
  }, [selectedChat, database, auth.currentUser]);

  const handleChatSelect = async (chatId, preloadedChat = null) => {
    const chat = preloadedChat || chats.find(c => c.id === chatId);
    if (!chat) return;

    console.log('Selected chat:', chat); // Debug log

    // If we don't have the other user's name, try to fetch it
    if (chat.otherUserId) {
      try {
        const userRef = ref(database, `users/${chat.otherUserId}`);
        const userSnapshot = await get(userRef);
        console.log('Selected user data:', userSnapshot.val()); // Debug log
        
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          chat.otherUserName = userData.name || userData.displayName || userData.email?.split('@')[0] || chat.otherUserName || 'Unknown User';
        } else {
          console.log('Selected user not found in database:', chat.otherUserId); // Debug log
        }
      } catch (error) {
        console.error('Error fetching selected user data:', error);
      }
    }

    setSelectedChat(chatId);
    setSelectedChatData(chat);
    setMessage(''); // Clear message input when changing chats

    // Mark as read when selecting chat
    const chatRef = ref(database, `userChats/${auth.currentUser.uid}/${chatId}`);
    set(chatRef, { unread: false }, { merge: true });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedChat) return;

    try {
      const chat = chats.find(c => c.id === selectedChat);
      const currentUserName = auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Anonymous';
      
      const newMessage = {
        text: message.trim(),
        sender: auth.currentUser.uid,
        timestamp: Date.now(),
        senderName: currentUserName
      };

      // Add message to messages collection
      await push(ref(database, `messages/${selectedChat}`), newMessage);

      // Update last message in chat
      await set(ref(database, `chats/${selectedChat}/lastMessage`), {
        text: message.trim(),
        timestamp: Date.now(),
        sender: auth.currentUser.uid,
        senderName: currentUserName
      });

      // Update both users' chat lists
      const updates = {
        lastMessage: message.trim(),
        timestamp: Date.now()
      };

      await set(ref(database, `userChats/${auth.currentUser.uid}/${selectedChat}`), 
        { ...chat, ...updates }, { merge: true });
      
      if (chat.otherUserId) {
        await set(ref(database, `userChats/${chat.otherUserId}/${selectedChat}`), 
          { ...chat, ...updates, unread: true }, { merge: true });
      }

      // Clear the message input
      setMessage('');

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message: ' + error.message);
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

  const filteredItems = (items, type) => {
    const query = searchQuery.toLowerCase();
    return items.filter(item => {
      if (type === 'chats') {
        return (
          item.displayName.toLowerCase().includes(query) ||
          item.requestInfo?.bloodType?.toLowerCase().includes(query) ||
          item.requestInfo?.hospital?.toLowerCase().includes(query)
        );
      } else {
        return (
          item.patientName?.toLowerCase().includes(query) ||
          item.bloodType?.toLowerCase().includes(query) ||
          item.hospital?.toLowerCase().includes(query)
        );
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <motion.div
        className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Blood Request Chats</h1>
        </div>
      </motion.div>

      <div className="flex h-[calc(100vh-64px)] max-w-7xl mx-auto border border-gray-200 rounded-lg overflow-hidden shadow-lg">
        {/* Chat List Sidebar */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <input
                type="text"
                placeholder="Search chats and requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-100 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {/* Available Blood Requests Section */}
                {availableRequests.length > 0 && (
                  <div className="py-3">
                    <h2 className="px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Available Blood Requests
                    </h2>
                    {filteredItems(availableRequests, 'requests').map((request) => (
                      <motion.button
                        key={request.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                        onClick={() => handleChatClick(request.userId, request.patientName, request)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-red-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {request.patientName}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-red-600 font-medium">
                                {request.bloodType}
                              </span>
                              {request.urgency === 'emergency' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  <AlertCircle className="w-3 h-3" />
                                  Emergency
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 truncate mt-1">
                              {request.hospital}, {request.city}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Chat History Section */}
                {chats.length > 0 && (
                  <div className="py-3">
                    <h2 className="px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Chat History
                    </h2>
                    {filteredItems(chats, 'chats').map((chat) => (
                      <motion.button
                        key={chat.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                          selectedChat === chat.id ? 'bg-red-50' : ''
                        }`}
                        onClick={() => handleChatSelect(chat.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-red-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {chat.displayName}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-red-600 font-medium">
                                {chat.requestInfo?.bloodType}
                              </span>
                              {chat.requestInfo?.urgency === 'emergency' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  <AlertCircle className="w-3 h-3" />
                                  Emergency
                                </span>
                              )}
                            </div>
                            {chat.lastMessage && (
                              <div className="text-sm text-gray-500 truncate mt-1">
                                {chat.lastMessage}
                              </div>
                            )}
                            {chat.unread && (
                              <div className="mt-1">
                                <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {!loading && availableRequests.length === 0 && chats.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <MessageCircle className="w-12 h-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Chats</h3>
                    <p className="text-gray-600">Your chats with blood requesters will appear here</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        {selectedChat ? (
          <div className="flex-1 flex flex-col bg-gray-50">
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">
                      {selectedChatData?.otherUserName || 'Unknown User'}
                    </h3>
                    {selectedChatData?.requestInfo?.patientName && selectedChatData?.requestInfo?.patientName !== selectedChatData?.otherUserName && (
                      <span className="text-sm text-gray-500">
                        (Patient: {selectedChatData.requestInfo.patientName})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {selectedChatData?.requestInfo?.bloodType && (
                      <>
                        <span className="font-medium text-red-600">
                          {selectedChatData.requestInfo.bloodType}
                        </span>
                        <span>•</span>
                      </>
                    )}
                    <span>{selectedChatData?.requestInfo?.hospital || 'Chat'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      msg.isCurrentUser
                        ? 'bg-red-600 text-white'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    {!msg.isCurrentUser && (
                      <p className={`text-xs font-medium mb-1 ${msg.isCurrentUser ? 'text-red-100' : 'text-gray-700'}`}>
                        {msg.senderName || selectedChatData?.otherUserName || 'Unknown User'}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.isCurrentUser ? 'text-red-100' : 'text-gray-500'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} /> {/* Auto-scroll anchor */}
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border-2 border-gray-100 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="p-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Chat</h3>
              <p className="text-gray-600">Choose a chat from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestChats; 