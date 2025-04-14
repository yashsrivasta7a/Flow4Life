import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { auth } from "../../Utils/Firebase";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";

const getChatId = (id1, id2) => [id1, id2].sort().join("_");

const ChatWithUser = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const firestore = getFirestore();

  const [formValue, setFormValue] = useState("");
  const [chatUserName, setChatUserName] = useState("");
  const [loadingUsername, setLoadingUsername] = useState(true);
  const dummy = useRef(null);

  const chatId = getChatId(user?.uid, userId);
  const messagesRef = collection(firestore, `chats/${chatId}/messages`);
  const messagesQuery = query(messagesRef, orderBy("createdAt", "asc"));
  const [messages, loadingMessages] = useCollectionData(messagesQuery, { idField: "id" });

  useEffect(() => {
    const fetchChatUserName = async () => {
      if (!userId) return;
      setLoadingUsername(true);
      const userDoc = doc(firestore, "users", userId);
      const userSnap = await getDoc(userDoc);
      if (userSnap.exists()) {
        setChatUserName(userSnap.data()?.name || "Unknown User");
      }
      setLoadingUsername(false);
    };
    fetchChatUserName();
  }, [firestore, userId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!formValue.trim() || !user) return;

    const { uid, photoURL } = user;

    await addDoc(messagesRef, {
      text: formValue.trim(),
      createdAt: serverTimestamp(),
      uid,
      photoURL: photoURL || "",
    });

    setFormValue("");
    dummy.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-red-500 text-lg">You must be signed in to chat.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-red-500 text-white p-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="bg-white text-red-500 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
        >
          Back
        </button>
        <h1 className="text-lg font-bold truncate">
          {loadingUsername ? "Loading..." : chatUserName}
        </h1>
        <div className="w-16" />
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4">
        {loadingMessages ? (
          <div className="flex justify-center items-center h-full">
            <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 animate-spin border-red-500"></div>
          </div>
        ) : (
          <>
            {messages?.map((msg) => (
              <ChatMessage key={msg.id} message={msg} currentUserId={user.uid} />
            ))}
            <span ref={dummy} />
          </>
        )}
      </main>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="flex items-center p-4 bg-white border-t border-gray-300"
      >
        <input
          type="text"
          value={formValue}
          onChange={(e) => setFormValue(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <button
          type="submit"
          className="ml-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
        >
          Send
        </button>
      </form>
    </div>
  );
};

const ChatMessage = ({ message, currentUserId }) => {
  const { text, uid, photoURL } = message;
  const isSentByCurrentUser = uid === currentUserId;

  return (
    <div
      className={`flex items-center mb-4 ${
        isSentByCurrentUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isSentByCurrentUser && (
        <img
          src={photoURL || "https://i.pravatar.cc/40"}
          alt="User Avatar"
          className="w-10 h-10 rounded-full mr-2"
        />
      )}
      <div
        className={`p-3 rounded-lg shadow-md max-w-xs ${
          isSentByCurrentUser
            ? "bg-red-500 text-white"
            : "bg-gray-200 text-gray-800"
        }`}
      >
        {text}
      </div>
    </div>
  );
};

export default ChatWithUser;
