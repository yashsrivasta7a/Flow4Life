import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import ChatWithUser from './Pages/ChatWithUser/ChatWithUser';
import ChatList from './Pages/ChatList/ChatList';
import { AnimatePresence } from 'framer-motion';
import BloodRequests from './Pages/BloodRequests/BloodRequests';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
  }

  return (
    <Router>
      <Toaster position="top-center" />
      <div className="min-h-screen w-full bg-gradient-to-b from-background to-surface">
        <NotificationCenter />
        <div className="w-full">
          <AnimatePresence mode="wait">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/signin" element={<Signinpage />} />
              <Route path="/signup" element={<Signuppage />} />
              <Route path="/learn-more" element={<LearnMore />} />

              {/* Protected Routes */}
              <Route path="/donor" element={
                <ProtectedRoute>
                  <DonorHome />
                </ProtectedRoute>
              } />
              <Route path="/requester" element={
                <ProtectedRoute>
                  <RequesterHome />
                </ProtectedRoute>
              } />
              <Route path="/donation-form" element={
                <ProtectedRoute>
                  <BloodDonationForm />
                </ProtectedRoute>
              } />
              <Route path="/request-form" element={
                <ProtectedRoute>
                  <RequestForm />
                </ProtectedRoute>
              } />
              <Route path="/emergency" element={
                <ProtectedRoute>
                  <RequestForm emergency={true} />
                </ProtectedRoute>
              } />
              <Route path="/finddonor" element={
                <ProtectedRoute>
                  <FindDonor />
                </ProtectedRoute>
              } />
              <Route path="/blood-requests" element={
                <ProtectedRoute>
                  <BloodRequests />
                </ProtectedRoute>
              } />
              <Route path="/profile/:userId" element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              } />
              <Route path="/profilesetup" element={
                <ProtectedRoute>
                  <ProfileSetup />
                </ProtectedRoute>
              } />
              <Route path="/chats" element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              } />
              <Route path="/chat/:userId" element={
                <ProtectedRoute>
                  <ChatWithUser />
                </ProtectedRoute>
              } />
              <Route path="/chat-list" element={
                <ProtectedRoute>
                  <ChatList />
                </ProtectedRoute>
              } />
            </Routes>
          </AnimatePresence>
        </div>
      </div>
    </Router>
  );
}

export default App;
