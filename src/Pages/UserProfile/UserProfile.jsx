import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDatabase, ref, get, set, update } from "firebase/database";
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";
import Navbar from '../../components/Navbar';
import { sendChatNotification } from '../../Utils/Notifications';
import { 
  User, MessageCircle, MapPin, Droplet, Calendar, 
  Activity, Heart, Clock, Award, ChevronLeft, Mail,
  CheckCircle, XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const db = getDatabase();
  const auth = getAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!userId) {
          setLoading(false);
          return;
        }

        setIsOwnProfile(auth.currentUser?.uid === userId);
        const userRef = ref(db, `users/${userId}`);
        const donorRef = ref(db, `donation_requests/${userId}`);
        
        const [userSnapshot, donorSnapshot] = await Promise.all([
          get(userRef),
          get(donorRef)
        ]);

        if (userSnapshot.exists() || donorSnapshot.exists()) {
          const userData = userSnapshot.val() || {};
          const donorData = donorSnapshot.val() || {};
          
          setUserProfile({
            ...userData,
            ...donorData,
            userId: userId
          });
        } else {
          console.error("User not found in database.");
          setUserProfile(null);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast.error("Error loading profile");
      }
      setLoading(false);
    };

    fetchUserProfile();
  }, [userId, db, auth.currentUser]);

  const handleGoBack = () => navigate(-1);

  const handleChat = async () => {
    if (!auth.currentUser) {
      toast.error("Please sign in to chat");
      navigate('/signin');
      return;
    }

    if (userId === auth.currentUser.uid) {
      toast.error("You cannot chat with yourself");
      return;
    }

    try {
      const chatId = [auth.currentUser.uid, userId].sort().join('_');
      const chatRef = ref(db, `chats/${chatId}`);
      const chatSnapshot = await get(chatRef);

      if (!chatSnapshot.exists()) {
        const chatData = {
          participants: [auth.currentUser.uid, userId],
          participantNames: {
            [auth.currentUser.uid]: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
            [userId]: userProfile.name
          },
          createdAt: Date.now(),
          lastMessage: {
            text: "Chat started",
            timestamp: Date.now(),
            sender: auth.currentUser.uid
          }
        };

        const updates = {
          [`chats/${chatId}`]: chatData,
          [`userChats/${auth.currentUser.uid}/${chatId}`]: {
            otherUserId: userId,
            otherUserName: userProfile.name,
            lastMessage: "Chat started",
            timestamp: Date.now(),
            unread: false
          },
          [`userChats/${userId}/${chatId}`]: {
            otherUserId: auth.currentUser.uid,
            otherUserName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
            lastMessage: "Chat started",
            timestamp: Date.now(),
            unread: true
          }
        };

        await set(ref(db), updates);
        await sendChatNotification(
          userId,
          "A new chat has been started with you",
          auth.currentUser.displayName || auth.currentUser.email.split('@')[0]
        );

        toast.success("Chat started successfully");
      }
      navigate('/chats');
    } catch (error) {
      console.error("Error starting chat:", error);
      toast.error("Failed to start chat. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <p className="text-xl text-gray-600 mb-4">User not found</p>
        <button
          onClick={handleGoBack}
          className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const stats = [
    {
      icon: <Droplet className="w-6 h-6 text-blue-500" />,
      label: "Blood Type",
      value: userProfile.bloodType || "Not specified",
      color: "bg-blue-50"
    },
    {
      icon: <Heart className="w-6 h-6 text-red-500" />,
      label: "Donations",
      value: userProfile.donations || "0",
      color: "bg-red-50"
    },
    {
      icon: <Activity className="w-6 h-6 text-green-500" />,
      label: "Status",
      value: userProfile.status || "Available",
      color: "bg-green-50"
    },
    {
      icon: <Award className="w-6 h-6 text-purple-500" />,
      label: "Member Since",
      value: new Date(userProfile.createdAt || Date.now()).getFullYear(),
      color: "bg-purple-50"
    }
  ];

  return (
    <>
      <Navbar
        user={auth.currentUser}
        onLogout={() => {}}
        notifications={notifications}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />
      <div className="min-h-screen bg-gray-50 py-8 pt-20">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            {/* Profile Header */}
            <div className="relative h-48 bg-gradient-to-r from-red-100 to-red-600">
              <button
                onClick={handleGoBack}
                className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-red-500 px-4 py-2 rounded-lg hover:bg-white transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            </div>

            {/* Profile Content */}
            <div className="relative px-6 py-8">
              {/* Avatar */}
              <div className="absolute -top-16 left-6">
                <div className="w-32 h-32 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg transform hover:scale-105 transition-transform">
                  <span className="text-4xl font-bold">
                    {userProfile.name ? userProfile.name[0].toUpperCase() : "?"}
                  </span>
                </div>
              </div>

              {/* Main Content */}
              <div className="mt-20">
                {/* User Info */}
                <div className="space-y-4">
                  <h1 className="text-3xl font-bold text-gray-900">{userProfile.name}</h1>
                  
                  {userProfile.email && (
                    <div className="flex items-center text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      <span>{userProfile.email}</span>
                    </div>
                  )}
                  
                  {userProfile.bloodType && (
                    <span className="inline-flex items-center px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium">
                      <Droplet className="w-4 h-4 mr-1" />
                      {userProfile.bloodType}
                    </span>
                  )}
                  
                  {userProfile.city && (
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{userProfile.city}</span>
                    </div>
                  )}
                </div>

                {/* Quick Availability Toggle - Only show for own profile */}
                {isOwnProfile && (
                  <div className="fixed bottom-6 left-6 z-50">
                    <div className="bg-white rounded-xl shadow-lg p-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={async () => {
                            try {
                              const newStatus = userProfile.status === 'available' ? 'unavailable' : 'available';
                              await update(ref(db), {
                                [`users/${userId}/status`]: newStatus,
                                [`donation_requests/${userId}/status`]: newStatus
                              });
                              setUserProfile(prev => ({
                                ...prev,
                                status: newStatus
                              }));
                              toast.success(`Status updated to ${newStatus}`);
                            } catch (error) {
                              console.error('Error updating status:', error);
                              toast.error('Failed to update status');
                            }
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                            userProfile.status === 'available'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {userProfile.status === 'available' ? (
                            <>
                              <CheckCircle className="w-5 h-5" />
                              <span>Available</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5" />
                              <span>Unavailable</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                  {stats.map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`${stat.color} rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2`}
                    >
                      {stat.icon}
                      <span className="text-sm text-gray-600">{stat.label}</span>
                      <span className="text-lg font-semibold text-gray-900">{stat.value}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Additional Info */}
                <div className="mt-8 space-y-4 text-gray-600">
                  {userProfile.lastDonation && (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>Last Donation: {new Date(userProfile.lastDonation).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {userProfile.bio && (
                    <p className="text-gray-600 mt-4 bg-gray-50 p-4 rounded-lg">
                      {userProfile.bio}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-8 space-y-4">
                  {!isOwnProfile ? (
                    <>
                      <button 
                        onClick={handleChat}
                        className="w-full bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        <MessageCircle className="w-5 h-5" /> Start Chat
                      </button>
                      <button 
                        onClick={() => navigate("/chats")}
                        className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-5 h-5" /> View All Chats
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => navigate("/profilesetup")}
                      className="w-full bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <User className="w-5 h-5" /> Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default UserProfile;