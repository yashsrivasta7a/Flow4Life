import React, { useEffect, useState } from "react";
import { FaMapMarkerAlt, FaComments, FaPhone } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import { getDatabase, ref, get, push, set } from "firebase/database";
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";
import Navbar from '../../components/Navbar';
import { sendChatNotification } from '../../Utils/Notifications';
import { User, MessageCircle, MapPin, Droplet, Calendar } from 'lucide-react';

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

        // Check if this is the current user's profile
        setIsOwnProfile(auth.currentUser?.uid === userId);

        // Fetch user data
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

  const handleGoBack = () => {
    navigate(-1);
  };

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
      // Generate a unique chat ID that will be the same for both users
      const chatId = [auth.currentUser.uid, userId].sort().join('_');

      // Check if chat already exists
      const chatRef = ref(db, `chats/${chatId}`);
      const chatSnapshot = await get(chatRef);

      if (!chatSnapshot.exists()) {
        // Create new chat
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

        // Create chat entries for both users simultaneously
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

        // Use update to write to multiple paths atomically
        await set(ref(db), updates);

        // Send notification to the other user
        await sendChatNotification(
          userId,
          "A new chat has been started with you",
          auth.currentUser.displayName || auth.currentUser.email.split('@')[0]
        );

        toast.success("Chat started successfully");
      }

      // Navigate to chats page
      navigate('/chats');
    } catch (error) {
      console.error("Error starting chat:", error);
      if (error.code === 'PERMISSION_DENIED') {
        toast.error("You don't have permission to start this chat. Please try again later.");
      } else {
        toast.error("Failed to start chat. Please try again.");
      }
    }
  };

  const handleCall = () => {
    // You might want to implement a call functionality or show contact info
    alert(`Calling ${userProfile.name}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl text-gray-600">User not found</p>
        <button
          onClick={handleGoBack}
          className="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          Go Back
        </button>
      </div>
    );
  }

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
      <div className="min-h-screen bg-gray-100 py-8 pt-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {/* Profile Header */}
            <div className="relative h-48 bg-gradient-to-r from-red-500 to-red-600">
              <button
                onClick={handleGoBack}
                className="absolute top-4 left-4 bg-white text-red-500 px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                Back
              </button>
            </div>

            {/* Profile Content */}
            <div className="relative px-6 py-8">
              <div className="absolute -top-16 left-6">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                  <span className="text-4xl font-bold text-red-500">
                    {userProfile.name ? userProfile.name[0].toUpperCase() : "?"}
                  </span>
                </div>
              </div>

              <div className="mt-16">
                <h1 className="text-3xl font-bold text-gray-900">{userProfile.name}</h1>
                {userProfile.bloodType && (
                  <span className="inline-block mt-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                    {userProfile.bloodType}
                  </span>
                )}
                
                {userProfile.city && (
                  <div className="mt-4 flex items-center text-gray-600">
                    <MapPin className="mr-2" />
                    <span>{userProfile.city}</span>
                  </div>
                )}

                {userProfile.bio && (
                  <p className="mt-4 text-gray-600">{userProfile.bio}</p>
                )}

                {/* User Stats */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{userProfile.city}</span>
                  </div>
                  <div className="flex items-center">
                    <Droplet className="w-4 h-4 mr-2" />
                    <span>Blood Type: {userProfile.bloodType}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Last Donation: {userProfile.lastDonation ? new Date(userProfile.lastDonation).toLocaleDateString() : 'Not specified'}</span>
                  </div>
                </div>

                {/* Action Buttons - Only show for other users' profiles */}
                {!isOwnProfile && (
                  <div className="mt-8 space-y-4">
                    <button 
                      onClick={handleChat}
                      className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition flex items-center justify-center"
                    >
                      <MessageCircle className="w-5 h-5 mr-2" /> Chat Now
                    </button>
                    <button 
                      onClick={() => navigate("/chats")}
                      className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition flex items-center justify-center"
                    >
                      <MessageCircle className="w-5 h-5 mr-2" /> View All Chats
                    </button>
                  </div>
                )}

                {/* Edit Profile Button - Only show for own profile */}
                {isOwnProfile && (
                  <div className="mt-8">
                    <button 
                      onClick={() => navigate("/profilesetup")}
                      className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition flex items-center justify-center"
                    >
                      <User className="w-5 h-5 mr-2" /> Edit Profile
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserProfile;