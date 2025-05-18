import React, { useState, useEffect, useRef } from 'react';
import { TbMessageChatbot } from 'react-icons/tb';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: "Hi! I'm Flow4Life Chatbot. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const key = import.meta.env.VITE_GEMINI_API_KEY;

  useEffect(() => {
    if (!key) {
      console.error('Gemini API key not found in environment variables');
    }
  }, [key]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
  if (!input.trim()) return;

  const userMessage = { sender: 'user', text: input };
  setMessages(prev => [...prev, userMessage]);
  setInput('');
  setIsLoading(true);

  try {
    if (!key) throw new Error('API key not available');

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/chat-bison-001:generateMessage?key=${key}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: {
            messages: [
              { author: "user", content: input }
            ]
          }
        })
      }
    );

    const data = await res.json();

    if (data.error) throw new Error(data.error.message);

    // Extract the chatbot reply from response
    const reply = data.candidates?.[0]?.message?.content || "Sorry, I didn't get that.";
    setMessages(prev => [...prev, { sender: 'bot', text: reply }]);
  } catch (error) {
    console.error('Error:', error);
    setMessages(prev => [
      ...prev,
      { sender: 'bot', text: 'Error connecting to Gemini API. Please check your API key and model access.' }
    ]);
  } finally {
    setIsLoading(false);
  }
};


  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center"
          onClick={() => setIsOpen(true)}
        >
          <TbMessageChatbot size={25} />
        </button>
      )}

      <div
        className={`fixed bottom-0 right-0 top-0 z-50 w-full sm:w-[400px] bg-white shadow-2xl border-l border-gray-300 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="bg-red-500 text-white px-4 py-3 font-bold flex justify-between items-center">
          <span>Flow4Life Chatbot</span>
          <button onClick={() => setIsOpen(false)} className="text-white text-xl font-bold">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                  msg.sender === 'user'
                    ? 'bg-red-500 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-800 rounded-2xl px-4 py-2 text-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t px-4 py-3 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring focus:ring-red-300"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className={`text-white px-4 py-2 rounded-full transition ${
              isLoading ? 'bg-red-300' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </>
  );
};

export default Chatbot;
