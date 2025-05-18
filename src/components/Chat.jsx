import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, push, set, query, orderByChild, equalTo, get } from 'firebase/database';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from "framer-motion";
import { ChevronLeft, Send, User, MessageCircle } from "lucide-react";
import { app } from '../Utils/Firebase';
import { toast } from "react-hot-toast";
import { sendChatNotification } from '../Utils/Notifications'; // Import the notification function

const Chat = () => {
  const navigate = useNavigate();
  const auth = getAuth(app);
  const database = getDatabase();

  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [donorsLoading, setDonorsLoading] = useState(true);
  const [donors, setDonors] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle typing indicator
  const handleTyping = () => {
    if (!selectedChat) return;
    
    const typingRef = ref(database, `userChats/${selectedChat.id}/typing/${auth.currentUser.uid}`);
    set(typingRef, true);

    // Clear previous timeout
    if (typingTimeout) clearTimeout(typingTimeout);

    // Set new timeout
    const timeout = setTimeout(() => {
      set(typingRef, false);
    }, 2000);

    setTypingTimeout(timeout);
  };

  // Listen for typing status
  useEffect(() => {
    if (!selectedChat) return;

    const otherUserId = selectedChat.otherUserId;
    const typingRef = ref(database, `userChats/${selectedChat.id}/typing/${otherUserId}`);
    
    const unsubscribe = onValue(typingRef, (snapshot) => {
      setIsTyping(snapshot.val() || false);
    });

    return () => unsubscribe();
  }, [selectedChat, database]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
        fetchChats(user.uid);
        fetchDonors(user.uid);
      } else {
        navigate('/signin');
      }
    });
    return () => unsubscribe();
  }, [auth, navigate]);

  const fetchChats = (userId) => {
    const userChatsRef = ref(database, `userChats/${userId}`);
    onValue(userChatsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const chatsList = Object.entries(data).map(([chatId, chatData]) => ({
          id: chatId,
          ...chatData
        })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Sort by most recent
        
        setChats(chatsList);
        
        // If no chat is selected, select the most recent one
        if (!selectedChat && chatsList.length > 0) {
          selectChat(chatsList[0]);
        }
      }
      setLoading(false);
    });
  };

  // New function to fetch donor profiles
  const fetchDonors = (userId) => {
    setDonorsLoading(true);
    const donorsRef = ref(database, "donation_requests");
    
    onValue(donorsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const donorsList = Object.entries(data)
          .filter(([_, donorData]) => donorData.userId !== userId) // Filter out current user
          .map(([id, donorData]) => ({
            id,
            userId: donorData.userId,
            name: donorData.name || "Unknown",
            bloodGroup: donorData.bloodType || "Unknown"
          }));
        
        setDonors(donorsList);
      }
      setDonorsLoading(false);
    });
  };

  const startNewChat = async (donorId, donorName) => {
    if (!donorId || !donorName) {
      toast.error("Invalid donor information");
      return;
    }

    try {
      // Check if chat already exists first
      const userChatsRef = ref(database, `userChats/${auth.currentUser.uid}`);
      const userChatsSnapshot = await get(userChatsRef);
      let existingChatId = null;
      
      if (userChatsSnapshot.exists()) {
        // Look through existing chats to find a match
        Object.entries(userChatsSnapshot.val()).forEach(([chatId, chat]) => {
          if (chat.otherUserId === donorId) {
            existingChatId = chatId;
          }
        });
      }

      // If chat already exists, just select it
      if (existingChatId) {
        const existingChat = chats.find(chat => chat.id === existingChatId);
        if (existingChat) {
          selectChat(existingChat);
          return;
        }
      }

      // Create a new chat
      const chatId = push(ref(database, 'chats')).key;
      const chatData = {
        participants: [auth.currentUser.uid, donorId],
        participantNames: {
          [auth.currentUser.uid]: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
          [donorId]: donorName
        },
        createdAt: Date.now(),
        lastMessage: {
          text: "Chat started",
          timestamp: Date.now(),
          sender: auth.currentUser.uid
        }
      };
      
      // Store the chat in the chats collection
      await set(ref(database, `chats/${chatId}`), chatData);
      
      // Create entries in both users' chat lists
      const currentUserChatData = {
        otherUserId: donorId,
        otherUserName: donorName,
        lastMessage: "Chat started",
        timestamp: Date.now(),
        unread: false
      };
      
      const donorChatData = {
        otherUserId: auth.currentUser.uid,
        otherUserName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
        lastMessage: "Chat started",
        timestamp: Date.now(),
        unread: true
      };
      
      // Update both references
      await set(ref(database, `userChats/${auth.currentUser.uid}/${chatId}`), currentUserChatData);
      await set(ref(database, `userChats/${donorId}/${chatId}`), donorChatData);
      
      // Add first message to the chat
      const newMessageRef = push(ref(database, `messages/${chatId}`));
      await set(newMessageRef, {
        text: "Chat started",
        sender: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
        timestamp: Date.now()
      });
      
      // Send notification to the donor
      await sendChatNotification(
        donorId,
        "A new chat has been started with you",
        auth.currentUser.displayName || auth.currentUser.email.split('@')[0]
      );

      // Create a local chat object to select
      const newChat = {
        id: chatId,
        otherUserId: donorId,
        otherUserName: donorName,
        lastMessage: "Chat started",
        timestamp: Date.now(),
        unread: false
      };
      
      setSelectedChat(newChat);
      setChats(prevChats => [newChat, ...prevChats]);
      
      toast.success("Chat started successfully");
    } catch (error) {
      console.error("Error starting chat:", error);
      toast.error("Failed to start chat. Please try again.");
    }
  };

  const selectChat = (chat) => {
    if (!chat || !chat.id) {
      console.error("Invalid chat selected:", chat);
      return;
    }
    
    setSelectedChat(chat);
    
    // Mark chat as read
    if (chat.unread) {
      set(ref(database, `userChats/${auth.currentUser.uid}/${chat.id}/unread`), false);
    }
    
    // Fetch messages for this chat
    const messagesRef = ref(database, `messages/${chat.id}`);
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesList = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        })).sort((a, b) => a.timestamp - b.timestamp);
        setMessages(messagesList);
      } else {
        setMessages([]);
      }
    });
  };

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

    // Update both users' chat data
    const otherUserId = selectedChat.otherUserId;
    
    if (!otherUserId) {
      console.error("Other user ID not found in selected chat:", selectedChat);
      toast.error("Error sending message. Recipient not found.");
      return;
    }
    
    const updates = {};
    updates[`userChats/${auth.currentUser.uid}/${selectedChat.id}/lastMessage`] = newMessage;
    updates[`userChats/${auth.currentUser.uid}/${selectedChat.id}/timestamp`] = messageData.timestamp;
    updates[`userChats/${otherUserId}/${selectedChat.id}/lastMessage`] = newMessage;
    updates[`userChats/${otherUserId}/${selectedChat.id}/timestamp`] = messageData.timestamp;
    updates[`userChats/${otherUserId}/${selectedChat.id}/unread`] = true;
    
    set(ref(database), updates);
    
    // Send notification to the other participant
    sendChatNotification(
      otherUserId, 
      newMessage, 
      auth.currentUser.displayName || auth.currentUser.email.split('@')[0]
    );

    setNewMessage('');
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
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Chat list */}
          <div className="col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Your Conversations</h2>
            </div>
            
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading chats...</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {chats.length > 0 ? (
                  chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedChat?.id === chat.id ? 'bg-red-50' : ''
                      }`}
                      onClick={() => selectChat(chat)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-200 rounded-full p-2">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {chat.otherUserName || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            {chat.lastMessage || 'No messages yet'}
                          </p>
                        </div>
                        {chat.timestamp && (
                          <div className="text-xs text-gray-500">
                            {new Date(chat.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                        {chat.unread && (
                          <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No chats yet. Start by contacting a donor!</p>
                  </div>
                )}
              </div>
            )}

            {/* New chat section - Fixed to show actual donors from database */}
            <div className="p-4 border-t border-gray-100">
              <h3 className="font-medium text-gray-900 mb-3">Available Donors</h3>
              <div className="max-h-64 overflow-y-auto">
                {donorsLoading ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-500 border-t-transparent"></div>
                  </div>
                ) : donors.length > 0 ? (
                  donors.map((donor) => (
                    <div
                      key={donor.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                      onClick={() => startNewChat(donor.userId, donor.name)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="bg-red-100 text-red-500 rounded-full px-2 py-1 text-xs font-medium">
                          {donor.bloodGroup}
                        </div>
                        <span className="font-medium">{donor.name}</span>
                      </div>
                      <button className="text-blue-500 text-sm hover:underline">
                        Chat
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 text-sm">No donors available</p>
                )}
              </div>
            </div>
          </div>

          {/* Chat messages */}
          <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
            {selectedChat ? (
              <>
                {/* Chat header */}
                <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="bg-gray-200 rounded-full p-2">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedChat.otherUserName || 'Unknown'}
                  </h3>
                </div>

                {/* Messages */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.length > 0 ? (
                    <>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender === auth.currentUser?.uid
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              message.sender === auth.currentUser?.uid
                                ? 'bg-red-500 text-white'
                                : 'bg-white border border-gray-200 text-gray-800'
                            }`}
                          >
                            <p>{message.text}</p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <p
                                className={`text-xs ${
                                  message.sender === auth.currentUser?.uid
                                    ? 'text-red-100'
                                    : 'text-gray-500'
                                }`}
                              >
                                {new Date(message.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                              {message.sender === auth.currentUser?.uid && (
                                <span className="text-xs text-red-100">
                                  {message.read ? '✓✓' : '✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-gray-200 rounded-lg px-4 py-2">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No messages yet. Say hello!</p>
                    </div>
                  )}
                </div>

                {/* Message input */}
                <form onSubmit={sendMessage} className="p-4 border-t border-gray-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      placeholder="Type a message..."
                      className="flex-1 rounded-full border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center flex-col h-full text-center text-gray-500 p-8">
                <MessageCircle className="w-12 h-12 mb-4 text-gray-300" />
                <h3 className="text-xl font-medium text-gray-700 mb-2">No Chat Selected</h3>
                <p className="max-w-sm">
                  Select an existing conversation or start a new one by clicking on a donor from the list.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;