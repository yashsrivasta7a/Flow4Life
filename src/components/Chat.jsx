import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, push, set, query, orderByChild, equalTo } from 'firebase/database';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from "framer-motion";
import { ChevronLeft, Send, User, MessageCircle } from "lucide-react";
import { app } from '../Utils/Firebase';
import { toast } from "react-hot-toast";

const Chat = () => {
  const navigate = useNavigate();
  const auth = getAuth(app);
  const database = getDatabase();

  const [user, setUser] = useState(null);
  const [donors, setDonors] = useState([]);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
        fetchDonors();
        fetchChats(user.uid);
      } else {
        navigate('/signin');
      }
    });
    return () => unsubscribe();
  }, [auth, navigate]);

  const fetchDonors = () => {
    const donorsRef = ref(database, 'donation_requests');
    onValue(donorsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const donorsList = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        })).filter(donor => donor.userId !== auth.currentUser?.uid);
        setDonors(donorsList);
      }
      setLoading(false);
    });
  };

  const fetchChats = (userId) => {
    const userChatsRef = ref(database, `chats`);
    onValue(userChatsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const chatsList = Object.entries(data).map(([chatId, chatData]) => ({
          id: chatId,
          ...chatData
        })).filter(chat => 
          chat.participants && 
          (chat.participants.includes(userId))
        );
        setChats(chatsList);
      }
      setLoading(false);
    });
  };

  const startNewChat = (donorId, donorName) => {
    const chatId = push(ref(database, 'chats')).key;
    const chatData = {
      participants: [auth.currentUser.uid, donorId],
      participantNames: {
        [auth.currentUser.uid]: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
        [donorId]: donorName
      },
      lastMessage: {
        text: "Chat started",
        timestamp: Date.now(),
        sender: auth.currentUser.uid
      }
    };
    
    set(ref(database, `chats/${chatId}`), chatData)
      .then(() => {
        setSelectedChat({
          id: chatId,
          ...chatData
        });
        toast.success("Chat started successfully");
      })
      .catch((error) => {
        toast.error("Failed to start chat");
        console.error("Error starting chat:", error);
      });
  };

  const selectChat = (chat) => {
    setSelectedChat(chat);
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

    // Update the last message in the chat
    set(ref(database, `chats/${selectedChat.id}/lastMessage`), messageData);

    setNewMessage('');
  };

  const getOtherParticipantName = (chat) => {
    if (!chat || !chat.participantNames) return 'Unknown';
    const otherParticipantId = chat.participants.find(id => id !== auth.currentUser?.uid);
    return chat.participantNames[otherParticipantId] || 'Unknown';
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
            onClick={() => navigate('/')}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Chats</h1>
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
                            {getOtherParticipantName(chat)}
                          </p>
                          {chat.lastMessage && (
                            <p className="text-sm text-gray-600 truncate">
                              {chat.lastMessage.text}
                            </p>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <div className="text-xs text-gray-500">
                            {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
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

            {/* New chat section */}
            <div className="p-4 border-t border-gray-100">
              <h3 className="font-medium text-gray-900 mb-3">Available Donors</h3>
              <div className="max-h-64 overflow-y-auto">
                {donors.length > 0 ? (
                  donors.map((donor) => (
                    <div
                      key={donor.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                      onClick={() => startNewChat(donor.userId, donor.fullName)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="bg-red-100 text-red-500 rounded-full px-2 py-1 text-xs font-medium">
                          {donor.bloodGroup}
                        </div>
                        <span className="font-medium">{donor.fullName}</span>
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
                    {getOtherParticipantName(selectedChat)}
                  </h3>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.length > 0 ? (
                    messages.map((message) => (
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
                          <p
                            className={`text-xs mt-1 ${
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
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No messages yet. Say hello!</p>
                    </div>
                  )}
                </div>

                {/* Message input */}
                <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-full border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
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