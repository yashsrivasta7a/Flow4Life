import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getDatabase, ref, onValue, push, set, get, update } from 'firebase/database';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  MessageCircle, 
  MapPin, 
  AlertCircle, 
  ChevronLeft, 
  Send, 
  User 
} from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { requestNotificationPermission, showNotification } from '../../Utils/NotificationSystem';
import { app } from '../../Utils/Firebase';

const RequestChats = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth(app);
  const database = getDatabase();

  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [availableRequests, setAvailableRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedChatData, setSelectedChatData] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const chatMessagesUnsubscribeRef = useRef(null);

  // Scroll to bottom of messages when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Check and request notification permissions on component mount
  useEffect(() => {
    const setupNotifications = async () => {
      const hasPermission = await requestNotificationPermission();
      setNotificationsEnabled(hasPermission);
    };
    
    setupNotifications();
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchChats(currentUser.uid);
        fetchAvailableRequests(currentUser.uid);
      } else {
        navigate('/signin');
      }
    });
    return () => unsubscribe();
  }, [auth, navigate]);

  // Typing indicator handler
  const handleTyping = () => {
    if (!selectedChat) return;
    const typingRef = ref(database, `userChats/${selectedChat}/typing/${auth.currentUser.uid}`);
    set(typingRef, true);

    if (typingTimeout) clearTimeout(typingTimeout);
    const timeout = setTimeout(() => {
      set(typingRef, false);
    }, 2000);
    setTypingTimeout(timeout);
  };

  // Listen for typing indicator
  useEffect(() => {
    if (!selectedChat || !selectedChatData?.otherUserId) return;

    const otherUserId = selectedChatData.otherUserId;
    const typingRef = ref(database, `userChats/${selectedChat}/typing/${otherUserId}`);

    const unsubscribe = onValue(typingRef, (snapshot) => {
      setIsTyping(snapshot.val() || false);
    });

    return () => unsubscribe();
  }, [selectedChat, selectedChatData, database]);

  // Fetch user's existing chats
  const fetchChats = (userId) => {
    setLoading(true);
    const userChatsRef = ref(database, `userChats/${userId}`);
    onValue(userChatsRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const chatsArray = await Promise.all(Object.entries(data).map(async ([id, chat]) => {
          if (chat.otherUserId) {
            try {
              const userRef = ref(database, `users/${chat.otherUserId}`);
              const userSnapshot = await get(userRef);
              
              if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                chat.otherUserName = userData.name || 
                                     userData.displayName || 
                                     userData.email?.split('@')[0] || 
                                     chat.otherUserName || 
                                     'Unknown User';
              }
            } catch (error) {
              console.error('Error fetching user data:', error);
            }
          }
          
          return {
            id,
            ...chat,
            displayName: chat.otherUserName || 
                        chat.requestInfo?.patientName || 
                        'Unknown User'
          };
        }));

        const sortedChats = chatsArray.sort((a, b) => 
          (b.timestamp || 0) - (a.timestamp || 0)
        );
        
        setChats(sortedChats);

        // If there's an active chat ID from navigation, select it
        if (location.state?.activeChatId) {
          const activeChat = sortedChats.find(chat => chat.id === location.state.activeChatId);
          if (activeChat) {
            if (location.state.otherUserName) {
              activeChat.otherUserName = location.state.otherUserName;
            }
            if (location.state.otherUserId) {
              activeChat.otherUserId = location.state.otherUserId;
            }
            selectChat(activeChat);
          }
          window.history.replaceState({}, document.title);
        }
      } else {
        setChats([]);
      }
      setLoading(false);
    });
  };

  // Fetch available blood requests
  const fetchAvailableRequests = (userId) => {
    setRequestsLoading(true);
    const requestsRef = ref(database, 'blood_requests');
    onValue(requestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const requestsArray = Object.entries(data)
          .map(([id, request]) => ({
            id,
            ...request,
          }))
          .filter(request => request.userId !== userId) // Filter out current user's requests
          .sort((a, b) => {
            if (a.urgency === 'emergency' && b.urgency !== 'emergency') return -1;
            if (a.urgency !== 'emergency' && b.urgency === 'emergency') return 1;
            return (b.timestamp || 0) - (a.timestamp || 0);
          });
        setAvailableRequests(requestsArray);
      } else {
        setAvailableRequests([]);
      }
      setRequestsLoading(false);
    });
  };

  // Add new safety guidelines function
  const showSafetyGuidelines = useCallback(() => {
    toast((t) => (
      <div className="flex flex-col gap-2 max-w-md">
        <h3 className="font-bold text-lg mb-1">Safety Guidelines</h3>
        <ul className="list-disc pl-4 text-sm space-y-1">
          <li>Verify identity before sharing personal information</li>
          <li>Meet in public places for blood donation</li>
          <li>Share hospital/clinic details through chat</li>
          <li>Report suspicious behavior immediately</li>
          <li>Keep communication respectful and focused</li>
        </ul>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="self-end mt-2 px-4 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
        >
          I Understand
        </button>
      </div>
    ), {
      duration: 10000,
      position: 'top-center',
      style: {
        background: 'white',
        color: 'black',
        padding: '16px',
      },
    });
  }, []);

  // Start a new chat with a blood requester
  const startNewChat = async (requesterId, requesterName, requestData) => {
    if (!requesterId || !auth.currentUser) {
      toast.error("Missing user information");
      return;
    }

    // Show safety guidelines first
    showSafetyGuidelines();

    try {
      // Check if chat exists already
      const userChatsRef = ref(database, `userChats/${auth.currentUser.uid}`);
      const userChatsSnapshot = await get(userChatsRef);
      let existingChatId = null;

      if (userChatsSnapshot.exists()) {
        Object.entries(userChatsSnapshot.val()).forEach(([chatId, chat]) => {
          if (chat.otherUserId === requesterId) {
            existingChatId = chatId;
          }
        });
      }

      if (existingChatId) {
        const existingChat = chats.find(chat => chat.id === existingChatId);
        if (existingChat) {
          selectChat(existingChat);
          return;
        }
      }

      // Create new chat
      const chatId = push(ref(database, 'chats')).key;
      const chatData = {
        participants: [auth.currentUser.uid, requesterId],
        participantNames: {
          [auth.currentUser.uid]: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
          [requesterId]: requesterName
        },
        createdAt: Date.now(),
        lastMessage: {
          text: "Chat started",
          timestamp: Date.now(),
          sender: auth.currentUser.uid
        }
      };

      await set(ref(database, `chats/${chatId}`), chatData);

      const currentUserName = auth.currentUser.displayName || 
                             auth.currentUser.email.split('@')[0] || 
                             'Anonymous';

      const currentUserChatData = {
        otherUserId: requesterId,
        otherUserName: requesterName,
        lastMessage: "Chat started",
        timestamp: Date.now(),
        unread: false,
        requestInfo: requestData // Store blood request info in the chat
      };

      const requesterChatData = {
        otherUserId: auth.currentUser.uid,
        otherUserName: currentUserName,
        lastMessage: "Chat started",
        timestamp: Date.now(),
        unread: true,
        requestInfo: requestData // Store blood request info in the chat
      };

      await set(ref(database, `userChats/${auth.currentUser.uid}/${chatId}`), currentUserChatData);
      await set(ref(database, `userChats/${requesterId}/${chatId}`), requesterChatData);

      const newMessageRef = push(ref(database, `messages/${chatId}`));
      await set(newMessageRef, {
        text: "Chat started",
        sender: auth.currentUser.uid,
        senderName: currentUserName,
        timestamp: Date.now()
      });

      const newChat = {
        id: chatId,
        otherUserId: requesterId,
        otherUserName: requesterName,
        lastMessage: "Chat started",
        timestamp: Date.now(),
        unread: false,
        requestInfo: requestData
      };

      setChats(prevChats => [newChat, ...prevChats]);
      selectChat(newChat);

      toast.success("Chat started successfully");
    } catch (error) {
      console.error("Error starting chat:", error);
      toast.error("Failed to start chat. Please try again.");
    }
  };

  // Select a chat and fetch its messages
  const selectChat = (chat) => {
    if (!chat || !chat.id) {
      console.error("Invalid chat selected:", chat);
      return;
    }

    setSelectedChat(chat.id);
    setSelectedChatData(chat);
    setNewMessage(''); // Clear message input when changing chats

    // Remove any previous listener
    if (chatMessagesUnsubscribeRef.current) {
      chatMessagesUnsubscribeRef.current();
    }

    // Mark as read when selecting chat
    if (chat.unread) {
      const chatRef = ref(database, `userChats/${auth.currentUser.uid}/${chat.id}/unread`);
      set(chatRef, false);
    }

    // Real-time listener for messages
    const messagesRef = ref(database, `messages/${chat.id}`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesList = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value,
          isCurrentUser: value.sender === auth.currentUser.uid
        })).sort((a, b) => a.timestamp - b.timestamp);
        
        setMessages(messagesList);
      } else {
        setMessages([]);
      }
    });
    
    chatMessagesUnsubscribeRef.current = unsubscribe;
  };

  // Clean up message listener on unmount
  useEffect(() => {
    return () => {
      if (chatMessagesUnsubscribeRef.current) {
        chatMessagesUnsubscribeRef.current();
      }
    };
  }, []);

  // Send message  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedChat || !auth.currentUser) return;

    try {
      const otherUserId = selectedChatData?.otherUserId;
      if (!otherUserId) {
        console.error("Other user ID not found in selected chat:", selectedChatData);
        toast.error("Error sending message. Recipient not found.");
        return;
      }

      const currentUserName = auth.currentUser.displayName || 
                             auth.currentUser.email.split('@')[0] || 
                             'Anonymous';
                             
      // Check if notifications are enabled
      const hasNotificationPermission = await requestNotificationPermission();

      // Add message to messages collection
      const newMessageRef = push(ref(database, `messages/${selectedChat}`));
      const messageData = {
        text: newMessage.trim(),
        sender: auth.currentUser.uid,
        senderName: currentUserName,
        timestamp: Date.now()
      };
      
      set(newMessageRef, messageData);

      // Update last message in both users' chat entries
      const updates = {};
      updates[`userChats/${auth.currentUser.uid}/${selectedChat}/lastMessage`] = newMessage.trim();
      updates[`userChats/${auth.currentUser.uid}/${selectedChat}/timestamp`] = messageData.timestamp;
      updates[`userChats/${otherUserId}/${selectedChat}/lastMessage`] = newMessage.trim();
      updates[`userChats/${otherUserId}/${selectedChat}/timestamp`] = messageData.timestamp;
      updates[`userChats/${otherUserId}/${selectedChat}/unread`] = true;

      update(ref(database), updates);

      // Clear the message input
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Format time
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    
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

  // Function to request notification permission again if needed
  const requestNotifications = async () => {
    const hasPermission = await requestNotificationPermission();
    setNotificationsEnabled(hasPermission);
    
    if (hasPermission) {
      toast.success("Notifications enabled successfully");
    } else {
      toast.error("Failed to enable notifications. Please check your browser settings.");
    }
  };

  // Filter chats based on search query
  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      chat.otherUserName?.toLowerCase().includes(searchLower) ||
      chat.requestInfo?.patientName?.toLowerCase().includes(searchLower) ||
      chat.requestInfo?.bloodType?.toLowerCase().includes(searchLower) ||
      chat.requestInfo?.hospital?.toLowerCase().includes(searchLower) ||
      chat.requestInfo?.city?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-blue-50">
      {/* Header */}
      <motion.div
        className="bg-gradient-to-r from-red-500 to-red-600 shadow-lg sticky top-0 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 p-2 rounded-full hover:bg-red-400 text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-white">Blood Request Chats</h1>
          </div>
          
          {/* Notification toggle button */}
          {!notificationsEnabled && (
            <button 
              onClick={requestNotifications}
              className="px-3 py-1 bg-white/20 text-white rounded-md text-sm hover:bg-white/30 transition-colors backdrop-blur-sm"
            >
              Enable Notifications
            </button>
          )}
        </div>
      </motion.div>

      {/* Search bar */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search chats by patient name, blood type, hospital, or city..."
            className="w-full px-4 py-3 pr-10 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm placeholder-red-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row h-[calc(100vh-180px)] max-w-7xl mx-auto border border-gray-200 rounded-lg overflow-hidden shadow-xl bg-white/90 backdrop-blur-sm m-4">
        {/* Sidebar: Requests and Chats */}
        <div className={`flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-gray-200 bg-gradient-to-b from-gray-50 to-white`}>
          {/* Available Blood Requests */}
          <div className="px-4 py-2 border-b border-gray-200">
            <h2 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Available Blood Requests
            </h2>
            {requestsLoading ? (
              <p className="text-sm text-gray-500">Loading requests...</p>
            ) : availableRequests.length === 0 ? (
              <p className="text-sm text-gray-500">No blood requests found</p>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {availableRequests.map(request => (
                  <button
                    key={`request-${request.id}`}
                    onClick={() => startNewChat(
                      request.userId, 
                      request.patientName || 'Anonymous Requester',
                      {
                        patientName: request.patientName,
                        bloodType: request.bloodType,
                        hospital: request.hospital,
                        city: request.city,
                        urgency: request.urgency
                      }
                    )}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 flex justify-between items-center group transition-colors my-1"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{request.patientName}</span>
                      <span className="text-xs text-gray-500">{request.hospital}, {request.city}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        request.urgency === 'emergency' 
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {request.bloodType}
                      </span>
                      {request.urgency === 'emergency' && (
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chats */}
          <div className="flex-1 overflow-y-auto">
            <h2 className="font-semibold text-gray-700 px-4 py-2 flex items-center gap-2 border-b border-gray-200">
              <MessageCircle className="w-5 h-5 text-gray-500" />
              Your Chats
            </h2>
            {loading ? (
              <p className="p-4 text-gray-500 text-sm">Loading chats...</p>
            ) : filteredChats.length === 0 ? (
              <p className="p-4 text-gray-500 text-sm">No chats found</p>
            ) : (
              <ul>
                {filteredChats.map(chat => (
                  <li key={`chat-${chat.id}`}>
                    <button
                      onClick={() => selectChat(chat)}
                      className={`w-full px-3 md:px-4 py-3 text-left hover:bg-red-50 flex justify-between items-center transition-colors
                        ${selectedChat === chat.id ? "bg-red-50 border-l-4 border-red-500 shadow-sm" : ""}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <span className="text-red-600 font-medium">
                            {(chat.otherUserName || 'U')[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{chat.otherUserName || chat.requestInfo?.patientName || "Unknown"}</p>
                          <div className="flex flex-col">
                            {chat.requestInfo?.bloodType && (
                              <span className="text-xs font-semibold text-red-600">
                                {chat.requestInfo.bloodType} Blood Request
                              </span>
                            )}
                            <p className="text-xs text-gray-500 truncate max-w-[12rem]">{chat.lastMessage || ''}</p>
                          </div>
                        </div>
                      </div>
                      {chat.unread && (
                        <span className="inline-block bg-red-500 text-white rounded-full px-2 py-1 text-xs">New</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className={`flex flex-col flex-1 ${selectedChat ? 'flex' : 'hidden md:flex'}`}>
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-gradient-to-r from-red-50 to-white">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="md:hidden p-2 hover:bg-red-100 rounded-full text-red-500 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {selectedChatData?.otherUserName || selectedChatData?.requestInfo?.patientName || 'Chat'}
                    </h2>
                    {selectedChatData?.requestInfo && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-red-600">
                          {selectedChatData.requestInfo.bloodType}
                        </span>
                        <span className="text-gray-500">
                          {selectedChatData.requestInfo.hospital}, {selectedChatData.requestInfo.city}
                        </span>
                        {selectedChatData.requestInfo.urgency === 'emergency' && (
                          <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-medium">
                            Emergency
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {isTyping && (
                  <p className="text-sm text-gray-500 italic">Typing...</p>
                )}
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto px-3 md:px-6 py-4 space-y-3 bg-gradient-to-b from-gray-50 to-white"
                ref={chatContainerRef}
              >
                {messages.length === 0 ? (
                  <p className="text-gray-500 text-sm italic text-center">No messages yet.</p>
                ) : (
                  messages.map(msg => (
                    <div
                      key={`message-${msg.id}`}
                      className={`${
                        msg.isCurrentUser
                          ? "ml-auto bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md"
                          : "mr-auto bg-white shadow-md border-l-4 border-red-400"
                      } max-w-[85%] md:max-w-xs rounded-lg p-3 break-words hover:shadow-lg transition-shadow`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-xs mt-1 text-right ${
                        msg.isCurrentUser ? "text-gray-300" : "text-gray-500"
                      }`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <form onSubmit={sendMessage} className="flex border-t border-gray-200 p-3 md:p-4 space-x-2 md:space-x-3 items-center bg-gradient-to-r from-red-50 to-white">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleTyping}
                  placeholder="Type your message..."
                  className="flex-1 border border-red-200 rounded-lg px-3 md:px-4 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm placeholder-red-300"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white p-2 md:px-4 md:py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-red-400 italic bg-gradient-to-b from-red-50 to-white">
              <div className="p-8 rounded-full bg-red-100/50 backdrop-blur-sm">
                <MessageCircle size={64} className="text-red-500" />
              </div>
              <p className="mt-4 text-red-500 font-medium">Select a chat or start a new one</p>
              <p className="text-sm text-red-400 mt-2">Connect with blood requesters and help save lives</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestChats;