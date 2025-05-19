import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Signuppage from './Pages/signup/Signuppage';
import Signinpage from './Pages/signin/Signinpage';
import Home from './Pages/Home/Home';
import DonorHome from './Pages/Home/DonorHome';
import RequesterHome from './Pages/Home/RequesterHome';
import LearnMore from './Pages/Home/LearnMore';
import RequestForm from './Pages/RequestForm/RequestForm';
import FindDonor from './Pages/FindDonor/FindDonor';
import BloodDonationForm from './Pages/Donationform/Blooddonationform';
import UserProfile from './Pages/UserProfile/UserProfile';
import ProfileSetup from './Pages/ProfileSetup/ProfileSetup';
import Chat from './components/Chat';
import NotificationCenter from './components/NotificationCenter';
// import ChatWithUser from './Pages/ChatWithUser/ChatWithUser';
// import ChatList from './Pages/ChatList/ChatList';
import { AnimatePresence } from 'framer-motion';
import BloodRequests from './Pages/BloodRequests/BloodRequests';
import RequestChats from './Pages/BloodRequests/RequestChats';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import Chatbot from './components/Chatbot';
import  { useEffect } from 'react';
import io from 'socket.io-client';
import { requestNotificationPermission, showNotification } from './Utils/NotificationSystem';


function AppContent() {
  const location = useLocation();
  

  // Add any routes you want to exclude the chatbot from
  const hideChatbotRoutes = ['/signin', '/signup'];
  const shouldShowChatbot = !hideChatbotRoutes.includes(location.pathname);

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen w-full bg-gradient-to-b from-background to-surface">
        <NotificationCenter />
        <div className="w-full">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/signin" element={<Signinpage />} />
              <Route path="/signup" element={<Signuppage />} />
              <Route path="/learn-more" element={<LearnMore />} />
              <Route path="/chatbot" element={<Chatbot />} />

              {/* Protected Routes */}
              <Route
                path="/donor"
                element={
                  <ProtectedRoute>
                    <DonorHome />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/requester"
                element={
                  <ProtectedRoute>
                    <RequesterHome />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/donation-form"
                element={
                  <ProtectedRoute>
                    <BloodDonationForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/request-form"
                element={
                  <ProtectedRoute>
                    <RequestForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/emergency"
                element={
                  <ProtectedRoute>
                    <RequestForm emergency={true} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/finddonor"
                element={
                  <ProtectedRoute>
                    <FindDonor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/blood-requests"
                element={
                  <ProtectedRoute>
                    <BloodRequests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/request-chats"
                element={
                  <ProtectedRoute>
                    <RequestChats />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/:userId"
                element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profilesetup"
                element={
                  <ProtectedRoute>
                    <ProfileSetup />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chats"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />
              {/* <Route
                path="/chat/:userId"
                element={
                  <ProtectedRoute>
                    <ChatWithUser />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat-list"
                element={
                  <ProtectedRoute>
                    <ChatList />
                  </ProtectedRoute>
                }
              /> */}
            </Routes>
          </AnimatePresence>

          {/* Floating Chatbot visible globally (except excluded routes) */}
          {shouldShowChatbot && <Chatbot />}
        </div>
      </div>
    </>
  );
}

// App wrapper for Router
function App() {
  if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js') // ✅ this must match the file in /public
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration);
      })
      .catch((err) => {
        console.error('❌ Service Worker registration failed:', err);
      });
  });
}
const socket = io('http://localhost:4000'); 
 useEffect(() => {
    // Request notification permission on component mount
    requestNotificationPermission();

    // Listen for 'notification' events from the server
    socket.on('notification', (data) => {
      const { title, body, url } = data;
      showNotification(title, {
        body,
        icon: '/notification-icon.png',
        data: { url },
      });
    });

    // Cleanup on unmount
    return () => {
      socket.off('notification');
    };
  }, []);



  return (
    <Router>
      <AppContent />
        <h1>Socket.IO Notification Demo</h1>
    </Router>
  );
}

export default App;
