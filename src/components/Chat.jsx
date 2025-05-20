import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, push, set, get, update } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { motion } from "framer-motion";
import { ChevronLeft, Send, User, MessageCircle } from "lucide-react";
import { app } from '../Utils/Firebase';
import { toast } from "react-hot-toast";
import { sendChatNotification } from '../Utils/Notifications';
import socket from "../Utils/socket";
import { requestNotificationPermission, showNotification } from '../Utils/NotificationSystem';

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
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

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
      
      if (!hasPermission) {
        toast.info("Enable notifications for a better chat experience", {
          duration: 5000,
          icon: '🔔',
        });
      }
    };
    
    setupNotifications();
  }, []);

  // --- SOCKET.IO NOTIFICATION SYSTEM ---
  // Enhanced socket.io notification handling
  useEffect(() => {
    if (!user) return;
    
    // Join user's room for private messages
    socket.emit("join", user.uid);

    // Listen for incoming messages
    socket.on("receive-message", (data) => {
      console.log("[Chat.jsx] receive-message event:", data);
      
      // Show notification if message is not in active chat
      if (
        data.receiverId === user.uid &&
        (!selectedChat || selectedChat.otherUserId !== data.senderId)
      ) {
        // In-app toast notification
        toast.custom((t) => (
          <div className="flex items-center gap-3 bg-white p-4 rounded-lg shadow-lg">
            <MessageCircle className="w-6 h-6 text-red-500" />
            <div className="flex-1">
              <p className="font-medium">{data.senderName}</p>
              <p className="text-sm text-gray-600 truncate">{data.text}</p>
            </div>
            <button
              onClick={() => {
                const chat = chats.find(c => c.otherUserId === data.senderId);
                if (chat) {
                  setSelectedChat(chat);
                }
                toast.dismiss(t.id);
              }}
              className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600"
            >
              View
            </button>
          </div>
        ), {
          duration: 5000,
          position: 'top-right',
        });

        // Browser notification if enabled
        if (notificationsEnabled) {
          showNotification(`Message from ${data.senderName}`, {
            body: data.text,
            icon: '/flow4life-logo.png',
            data: { url: `/chats/${selectedChat?.id}` },
          });
        }

        // Update unread status in chats list
        setChats(prevChats =>
          prevChats.map(chat =>
            chat.otherUserId === data.senderId
              ? { ...chat, unread: true }
              : chat
          )
        );
      }
    });

    return () => {
      socket.off("receive-message");
    };
  }, [user, selectedChat, chats, notificationsEnabled]);

  // Typing indicator handler
  const handleTyping = () => {
    if (!selectedChat) return;
    const typingRef = ref(database, `userChats/${selectedChat.id}/typing/${auth.currentUser.uid}`);
    set(typingRef, true);

    if (typingTimeout) clearTimeout(typingTimeout);
    const timeout = setTimeout(() => {
      set(typingRef, false);
    }, 2000);
    setTypingTimeout(timeout);
  };

  useEffect(() => {
    if (!selectedChat) return;

    const otherUserId = selectedChat.otherUserId;
    const typingRef = ref(database, `userChats/${selectedChat.id}/typing/${otherUserId}`);

    const unsubscribe = onValue(typingRef, (snapshot) => {
      setIsTyping(snapshot.val() || false);
    });

    return () => unsubscribe();
  }, [selectedChat, database]);

  // Auth state listener
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

  // Fetch chats
  const fetchChats = (userId) => {
    const userChatsRef = ref(database, `userChats/${userId}`);
    onValue(userChatsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const chatsList = Object.entries(data).map(([chatId, chatData]) => ({
          id: chatId,
          ...chatData
        })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); 

        setChats(chatsList);
        if (!selectedChat && chatsList.length > 0) {
          selectChat(chatsList[0]);
        }
      }
      setLoading(false);
    });
  };

  // Fetch donors
  const fetchDonors = (userId) => {
    setDonorsLoading(true);
    const donorsRef = ref(database, "donation_requests");
    onValue(donorsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const donorsList = Object.entries(data)
          .filter(([_, donorData]) => donorData.userId !== userId)
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

  // Add safety guidelines function
  const showSafetyGuidelines = useCallback(() => {
    toast((t) => (
      <div className="flex flex-col gap-2 max-w-md">
        <h3 className="font-bold text-lg mb-1">Chat Safety Guidelines</h3>
        <ul className="list-disc pl-4 text-sm space-y-1">
          <li>Meet only in public places or hospitals</li>
          <li>Verify donor/recipient identity before meeting</li>
          <li>Share hospital location through the chat</li>
          <li>Do not share sensitive personal information</li>
          <li>Report any suspicious behavior</li>
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

  // Start new chat or select existing
  const startNewChat = async (donorId, donorName) => {
    if (!donorId || !donorName) {
      toast.error("Invalid donor information");
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
          if (chat.otherUserId === donorId) {
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

      await set(ref(database, `chats/${chatId}`), chatData);

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

      await set(ref(database, `userChats/${auth.currentUser.uid}/${chatId}`), currentUserChatData);
      await set(ref(database, `userChats/${donorId}/${chatId}`), donorChatData);

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

      // Also send via socket for real-time notification
      socket.emit("send-message", {
        text: "Chat started",
        senderId: auth.currentUser.uid,
        receiverId: donorId,
        senderName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
        timestamp: Date.now()
      });

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

  // Store unsubscribe function in a ref to avoid memory leaks and duplicate listeners
  const chatMessagesUnsubscribeRef = useRef(null);

  // Select chat, fetch messages and mark read
  const selectChat = (chat) => {
    if (!chat || !chat.id) {
      console.error("Invalid chat selected:", chat);
      return;
    }

    setSelectedChat(chat);

    if (chat.unread) {
      set(ref(database, `userChats/${auth.currentUser.uid}/${chat.id}/unread`), false);
    }

    // Remove any previous listener
    if (chatMessagesUnsubscribeRef.current) {
      chatMessagesUnsubscribeRef.current();
    }

    // Real-time listener for messages
    const messagesRef = ref(database, `messages/${chat.id}`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
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

  // Send message with enhanced notifications
  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const currentUserName = auth.currentUser.displayName || auth.currentUser.email.split('@')[0];
      const messageData = {
        text: newMessage.trim(),
        senderId: auth.currentUser.uid,
        receiverId: selectedChat.otherUserId,
        senderName: currentUserName,
        timestamp: Date.now()
      };

      // Save to Firebase
      const newMessageRef = push(ref(database, `messages/${selectedChat.id}`));
      await set(newMessageRef, {
        text: messageData.text,
        sender: messageData.senderId,
        senderName: messageData.senderName,
        timestamp: messageData.timestamp
      });

      // Update last message and unread status
      const updates = {};
      updates[`userChats/${auth.currentUser.uid}/${selectedChat.id}/lastMessage`] = messageData.text;
      updates[`userChats/${auth.currentUser.uid}/${selectedChat.id}/timestamp`] = messageData.timestamp;
      updates[`userChats/${selectedChat.otherUserId}/${selectedChat.id}/lastMessage`] = messageData.text;
      updates[`userChats/${selectedChat.otherUserId}/${selectedChat.id}/timestamp`] = messageData.timestamp;
      updates[`userChats/${selectedChat.otherUserId}/${selectedChat.id}/unread`] = true;

      await update(ref(database), updates);

      // Send notification through Firebase
      await sendChatNotification(
        selectedChat.otherUserId,
        messageData.text,
        messageData.senderName
      );

      // Also emit via socket for real-time updates
      socket.emit("send-message", messageData);

      // Show browser notification if enabled
      if (await requestNotificationPermission()) {
        showNotification(`New message from ${messageData.senderName}`, {
          body: messageData.text,
          icon: '/flow4life-logo.png',
          data: { url: `/chats/${selectedChat.id}` },
        });
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
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

  return (    <div className="min-h-screen bg-gradient-to-b from-red-50 to-blue-50">
      {/* Header */}
      <motion.div
        className="bg-gradient-to-r from-red-500 to-red-600 shadow-lg sticky top-0 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">            <button
              onClick={() => navigate(-1)}
              className="mr-4 p-2 rounded-full hover:bg-red-400 text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-white">Chat</h1>
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
      </motion.div>      <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] max-w-7xl mx-auto border border-gray-200 rounded-lg overflow-hidden shadow-xl bg-white/90 backdrop-blur-sm m-4">
        {/* Sidebar: Donors and Chats */}
        <div className={`flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-gray-200 bg-gradient-to-b from-gray-50 to-white`}>
          {/* Donors */}
          <div className="px-4 py-2 border-b border-gray-200">
            <h2 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              Available Donors
            </h2>
            {donorsLoading ? (
              <p className="text-sm text-gray-500">Loading donors...</p>
            ) : donors.length === 0 ? (
              <p className="text-sm text-gray-500">No donors found</p>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {donors.map(donor => (
                  <button                    key={`donor-${donor.id}`}
                    onClick={() => startNewChat(donor.userId, donor.name)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 flex justify-between items-center group transition-colors my-1"
                  >
                    <span>{donor.name}</span>
                    <span className="text-xs text-gray-500">{donor.bloodGroup}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chats */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-gray-500 text-sm">Loading chats...</p>
            ) : chats.length === 0 ? (
              <p className="p-4 text-gray-500 text-sm">No chats yet</p>
            ) : (
              <ul>
                {chats.map(chat => (                  <li key={`chat-${chat.id}`}>
                    <button
                      onClick={() => selectChat(chat)}                      className={`w-full px-3 md:px-4 py-3 text-left hover:bg-red-50 flex justify-between items-center transition-colors
                        ${selectedChat?.id === chat.id ? "bg-red-50 border-l-4 border-red-500 shadow-sm" : ""}
                      `}
                    >
                      <div className="flex items-center gap-3">                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <span className="text-red-600 font-medium">
                            {chat.otherUserName?.[0]?.toUpperCase() || "U"}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{chat.otherUserName || "Unknown"}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[12rem]">{chat.lastMessage || ''}</p>
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
        </div>        {/* Chat area */}
        <div className={`flex flex-col flex-1 ${selectedChat ? 'flex' : 'hidden md:flex'}`}>
          {selectedChat ? (
            <>
              {/* Chat Header */}              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-gradient-to-r from-red-50 to-white">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="md:hidden p-2 hover:bg-red-100 rounded-full text-red-500 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-lg font-semibold">{selectedChat.otherUserName || 'Chat'}</h2>
                </div>
                {isTyping && (
                  <p className="text-sm text-gray-500 italic">Typing...</p>
                )}
              </div>              {/* Messages */}
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
                        msg.sender === auth.currentUser.uid
                          ? "ml-auto bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md"
                          : "mr-auto bg-white shadow-md border-l-4 border-red-400"
                      } max-w-[85%] md:max-w-xs rounded-lg p-3 break-words hover:shadow-lg transition-shadow`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-xs mt-1 text-right ${
                        msg.sender === auth.currentUser.uid ? "text-gray-300" : "text-gray-500"
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
            </>          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-red-400 italic bg-gradient-to-b from-red-50 to-white">
              <div className="p-8 rounded-full bg-red-100/50 backdrop-blur-sm">
                <MessageCircle size={64} className="text-red-500" />
              </div>
              <p className="mt-4 text-red-500 font-medium">Select a chat or start a new one</p>
              <p className="text-sm text-red-400 mt-2">Connect with blood donors and help save lives</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;