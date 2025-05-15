import React, { useEffect, useState } from "react";
import { FaBell, FaEllipsisV, FaMapMarkerAlt, FaComments, FaPhone } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import { getDatabase, ref, get } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Navbar from '../../components/Navbar';

const UserProfile = () => {
  const { userId } = useParams(); // Extract userId from URL
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const db = getDatabase(); // Initialize Firestore
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        console.log("Fetching user with ID:", userId); // Debugging step

        const userRef = ref(db, `users/${userId}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          console.log("User data:", snapshot.val()); // Log fetched data
          setUserProfile(snapshot.val());
        } else {
          console.error("User not found in database.");
          setUserProfile(null);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
      setLoading(false);
    };

    if (userId) fetchUserProfile();
  }, [userId, db]);

  const handleGoBack = () => {
    navigate(-1); // Navigate back to the previous page
  };

  const handleChat = () => {
    // Implement chat functionality
    navigate(`/chats/${userId}`);
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
      <div className="text-center text-red-500 text-xl mt-12">
        User not found.
      </div>
    );
  }

  return (
    <>
      <Navbar
        user={user}
        onLogout={() => {}}
        notifications={notifications}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 p-4 flex justify-center items-center">
        <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={handleGoBack}
              className="text-red-500 hover:text-red-600 text-2xl"
            >
              ←
            </button>
            <div className="flex space-x-4">
              <button className="text-red-500 hover:text-red-600">
                <FaBell className="w-6 h-6" />
              </button>
              <button className="text-red-500 hover:text-red-600">
                <FaEllipsisV className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Profile Picture & Availability */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <img 
                src={userProfile.profilePicture || "https://i.pinimg.com/736x/34/b0/1a/34b01aa7a98dc4af4782bf37278bc54a.jpg"} 
                alt="Profile" 
                className="w-32 h-32 rounded-xl border-4 border-red-500 object-cover"
              />
            </div>
            <h2 className="text-2xl font-bold mb-2">{userProfile.name}</h2>
            <span 
              className={`inline-block px-3 py-1 rounded-full text-white ${
                userProfile.isAvailable ? 'bg-green-500' : 'bg-red-500'
              }`}
            >
              {userProfile.isAvailable ? "✅ AVAILABLE FOR DONATE" : "❌ NOT AVAILABLE"}
            </span>
          </div>

          {/* User Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 text-center">
            <div>
              <span className="text-2xl font-bold block">{userProfile.bloodGroup}</span>
              <p className="text-gray-600">BLOOD TYPE</p>
            </div>
            <div>
              <span className="text-2xl font-bold block">{userProfile.donated || 0}</span>
              <p className="text-gray-600">DONATED</p>
            </div>
            <div>
              <span className="text-2xl font-bold block">{userProfile.requested || 0}</span>
              <p className="text-gray-600">REQUESTED</p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center justify-center mt-6 text-gray-600">
            <FaMapMarkerAlt className="mr-2" />
            <p>{userProfile.location || 'Location not specified'}</p>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 space-y-4">
            <button 
              onClick={handleChat}
              className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition flex items-center justify-center"
            >
              <FaComments className="mr-2" /> CHAT NOW
            </button>
            <button 
              onClick={() => navigate(`/chat/${userId}`)}
              className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition flex items-center justify-center"
            >
              <FaComments className="mr-2" /> CHAT WITH RECIPIENT
            </button>
            <button 
              onClick={handleCall}
              className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition flex items-center justify-center"
            >
              <FaPhone className="mr-2" /> CALL NOW
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserProfile;