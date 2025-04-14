import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDatabase, ref, onValue } from "firebase/database";
import { auth } from "../../Utils/Firebase";

const ChatList = () => {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/signin");
      return;
    }

    const db = getDatabase();
    const chatsRef = ref(db, `userChats/${user.uid}`);
    onValue(chatsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const chatList = Object.entries(data).map(([chatId, chatData]) => ({
          chatId,
          ...chatData,
        }));
        setChats(chatList);
      }
      setLoading(false);
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Your Chats</h1>
        {chats.length > 0 ? (
          <div className="space-y-4">
            {chats.map((chat) => (
              <div
                key={chat.chatId}
                className="p-4 bg-white shadow-md rounded-lg hover:shadow-lg transition cursor-pointer"
                onClick={() => navigate(`/chat/${chat.chatId}`)}
              >
                <h2 className="text-lg font-bold text-gray-800">
                  {chat.name || "Unknown User"}
                </h2>
                <p className="text-gray-600">{chat.lastMessage || "No messages yet"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">You have no chats yet.</p>
        )}
      </div>
    </div>
  );
};

export default ChatList;
