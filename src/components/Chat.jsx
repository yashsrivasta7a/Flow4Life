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
  useEffect(() => {
    if (!user) return;
    // Join user's room for private messages
    socket.emit("join", user.uid);

    // Listen for incoming messages (real-time chat updates)
    socket.on("receive-message", (data) => {
      console.log("[Socket] receive-message event:", data);
      // If the message is for the current user and not in the active chat, show notification
      if (
        data.receiverId === user.uid &&
        (!selectedChat || selectedChat.otherUserId !== data.senderId)
      ) {
        // Toast notification (in-app)
        toast.success(`New message from ${data.senderName || "User"}`);
        // Browser notification
        if (notificationsEnabled) {
          showNotification(
            `Message from ${data.senderName || "User"}`,
            { body: data.text }
          );
        }
        // Update unread status in chats list
        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.otherUserId === data.senderId
              ? { ...chat, unread: true }
              : chat
          )
        );
      }
      // If the message is for the current chat, append it
      if (
        selectedChat &&
        ((data.senderId === selectedChat.otherUserId && data.receiverId === user.uid) ||
         (data.senderId === user.uid && data.receiverId === selectedChat.otherUserId))
      ) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.id || Date.now(),
            text: data.text,
            sender: data.senderId,
            senderName: data.senderName,
            timestamp: data.timestamp,
          },
        ]);
      }
    });

    // Listen for chat notifications
    socket.on("notification", (data) => {
      console.log("[Socket] notification event:", data);
      const { title, body, url, receiverId } = data;
      if (user && receiverId === user.uid) {
        showNotification(title, {
          body,
          icon: '/notification-icon.png',
          data: { url },
        });
      }
    });

    return () => {
      socket.off("receive-message");
      socket.off("notification");
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

  // Listen for typing status from other user
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
        })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Most recent first

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
          .filter(([_, donorData]) => donorData.userId !== userId) // exclude current user
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

  // Start new chat or select existing
  const startNewChat = async (donorId, donorName) => {
    if (!donorId || !donorName) {
      toast.error("Invalid donor information");
      return;
    }

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

  // Send message with Socket.IO
  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const messageData = {
      text: newMessage,
      senderId: auth.currentUser.uid,
      receiverId: selectedChat.otherUserId,
      senderName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
      timestamp: Date.now()
    };

    // Save to Firebase
    const newMessageRef = push(ref(database, `messages/${selectedChat.id}`));
    set(newMessageRef, {
      text: newMessage,
      sender: messageData.senderId,
      senderName: messageData.senderName,
      timestamp: messageData.timestamp
    });

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

    update(ref(database), updates);

    // Send notification through Firebase for offline users
    sendChatNotification(
      otherUserId,
      newMessage,
      messageData.senderName
    );

    // Emit message via socket.io for real-time updates
    socket.emit("send-message", messageData);

    setNewMessage('');
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <motion.div
        className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 p-2 rounded-full hover:bg-gray-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
          </div>
          
          {/* Notification toggle button */}
          {!notificationsEnabled && (
            <button 
              onClick={requestNotifications}
              className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              Enable Notifications
            </button>
          )}
        </div>
      </motion.div>

      <div className="flex h-[calc(100vh-64px)] max-w-7xl mx-auto border border-gray-200 rounded-lg overflow-hidden shadow-lg">
        {/* Sidebar: Donors and Chats */}
        <div className="flex flex-col w-80 border-r border-gray-200">
          {/* Donors */}
          <div className="px-4 py-2 border-b border-gray-200">
            <h2 className="font-semibold text-gray-700 mb-2">Donors</h2>
            {donorsLoading ? (
              <p className="text-sm text-gray-500">Loading donors...</p>
            ) : donors.length === 0 ? (
              <p className="text-sm text-gray-500">No donors found</p>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {donors.map(donor => (
                  <button
                    key={`donor-${donor.id}`}
                    onClick={() => startNewChat(donor.userId, donor.name)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex justify-between items-center"
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
                {chats.map(chat => (
                  <li key={`chat-${chat.id}`}>
                    <button
                      onClick={() => selectChat(chat)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-100 flex justify-between items-center
                        ${selectedChat?.id === chat.id ? "bg-gray-200 font-semibold" : ""}
                      `}
                    >
                      <div>
                        <p>{chat.otherUserName || "Unknown"}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[12rem]">{chat.lastMessage || ''}</p>
                      </div>
                      {chat.unread && (
                        <span className="inline-block bg-red-500 text-white rounded-full px-2 text-xs">New</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex flex-col flex-1">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{selectedChat.otherUserName || 'Chat'}</h2>
                {isTyping && (
                  <p className="text-sm text-gray-500 italic">Typing...</p>
                )}
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-gray-50"
                ref={chatContainerRef}
              >
                {messages.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">No messages yet.</p>
                ) : (
                  messages.map(msg => (
                    <div
                      key={`message-${msg.id}`}
                      className={`${
                        msg.sender === auth.currentUser.uid
                          ? "ml-auto bg-blue-600 text-white"
                          : "mr-auto bg-white border border-gray-300"
                      } max-w-xs rounded-lg p-3`}
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
              <form onSubmit={sendMessage} className="flex border-t border-gray-200 p-4 space-x-3 items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleTyping}
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400 italic">
              <MessageCircle size={64} />
              <p className="mt-4">Select a chat or start a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;