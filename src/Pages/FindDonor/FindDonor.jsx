import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue, query, orderByChild, push, set, get } from "firebase/database";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { MessageCircle, MapPin, AlertCircle, ArrowUpDown, User } from "lucide-react";
import { getAuth } from 'firebase/auth';
import { sendChatNotification } from '../../Utils/Notifications';
import { getCityFromCoordinates } from '../../Utils/Geocoding';

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lat2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

const FindDonor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const database = getDatabase();
  const auth = getAuth();
  const [donors, setDonors] = useState([]);
  const [allDonors, setAllDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllDonors, setShowAllDonors] = useState(false);
  const [userChats, setUserChats] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [userCity, setUserCity] = useState(null);

  // Extract request details with fallbacks
  const requestDetails = {
    bloodType: location.state?.bloodType || '',
    city: location.state?.city || '',
    location: location.state?.location || null,
    emergency: location.state?.emergency || false,
    timestamp: location.state?.timestamp || Date.now(),
    requestId: location.state?.requestId || null
  };

  // If no state was passed, try to get user's current location
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        let position;
        if (requestDetails.location) {
          position = {
            coords: {
              latitude: requestDetails.location.latitude,
              longitude: requestDetails.location.longitude
            }
          };
        } else if (navigator.geolocation) {
          position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
        }

        if (position) {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          
          // Get city name
          const cityName = await getCityFromCoordinates(latitude, longitude);
          if (cityName) {
            setUserCity(cityName);
            // If we don't have a city from request details, use the detected one
            if (!requestDetails.city) {
              requestDetails.city = cityName;
            }
          }
        }
      } catch (error) {
        console.error('Error getting location:', error);
        toast.error('Unable to get your location. Distance calculations will not be available.');
      }
    };

    getUserLocation();
  }, []);

  useEffect(() => {
    const donorsRef = ref(database, "donation_requests");
    const donorsQuery = query(donorsRef, orderByChild("timestamp"));

    onValue(donorsQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let donorsArray = Object.entries(data).map(([id, details]) => ({
          id,
          ...details,
          distance: userLocation ? calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            details.latitude,
            details.longitude
          ) : Infinity,
          isInSameCity: details.city && userCity && 
            details.city.toLowerCase() === userCity.toLowerCase()
        }));

        // Store all donors before filtering
        setAllDonors(donorsArray);

        // Apply filters only if not showing all donors
        if (!showAllDonors) {
          // Filter out unavailable donors
          donorsArray = donorsArray.filter(donor => donor.status !== 'unavailable');

          // Apply blood type filter only if we have a requested blood type
          if (requestDetails.bloodType) {
            donorsArray = donorsArray.filter(donor => 
              isBloodCompatible(requestDetails.bloodType, donor.bloodType)
            );
          }

          // Sort by location if available
          if (userLocation) {
            donorsArray.sort((a, b) => {
              // First, prioritize donors in the same city
              if (a.isInSameCity && !b.isInSameCity) return -1;
              if (!a.isInSameCity && b.isInSameCity) return 1;
              
              // Then sort by distance
              return (a.distance === Infinity ? Number.MAX_VALUE : a.distance) 
                     - (b.distance === Infinity ? Number.MAX_VALUE : b.distance);
            });
          }

          // If it's an emergency request, prioritize donors who are currently online
          if (requestDetails.emergency) {
            donorsArray.sort((a, b) => {
              const aOnline = a.lastActive && (Date.now() - a.lastActive < 300000); // 5 minutes
              const bOnline = b.lastActive && (Date.now() - b.lastActive < 300000);
              if (aOnline && !bOnline) return -1;
              if (!aOnline && bOnline) return 1;
              return 0;
            });
          }
        }

        setDonors(donorsArray);
      }
      setLoading(false);
    });
  }, [database, requestDetails, showAllDonors, userLocation, userCity]);

  useEffect(() => {
    if (auth.currentUser) {
      // Listen for user's chats to show chat status
      const userChatsRef = ref(database, `userChats/${auth.currentUser.uid}`);
      const unsubscribe = onValue(userChatsRef, (snapshot) => {
        const data = snapshot.val();
        setUserChats(data || {});
      });
      return () => unsubscribe();
    }
  }, [auth.currentUser, database]);

  const isBloodCompatible = (requestType, donorType) => {
    const compatibility = {
      'A+': ['A+', 'A-', 'O+', 'O-'],
      'A-': ['A-', 'O-'],
      'B+': ['B+', 'B-', 'O+', 'O-'],
      'B-': ['B-', 'O-'],
      'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      'AB-': ['A-', 'B-', 'AB-', 'O-'],
      'O+': ['O+', 'O-'],
      'O-': ['O-']
    };
    return compatibility[requestType]?.includes(donorType);
  };

  const handleChatClick = async (donorId, donorName) => {
    if (!auth.currentUser) {
      toast.error("Please sign in to chat with donors");
      navigate('/signin');
      return;
    }

    try {
      // Check if chat already exists
      const userChatsRef = ref(database, `userChats/${auth.currentUser.uid}`);
      const userChatsSnapshot = await get(userChatsRef);
      let existingChatId = null;
      
      if (userChatsSnapshot.exists()) {
        // Look for an existing chat with this donor
        Object.entries(userChatsSnapshot.val()).forEach(([chatId, chat]) => {
          if (chat.otherUserId === donorId) {
            existingChatId = chatId;
          }
        });
      }

      let chatId = existingChatId;

      if (!existingChatId) {
        // Create new chat if none exists
        chatId = push(ref(database, 'chats')).key;
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
        
        // Save in main chats collection
        await set(ref(database, `chats/${chatId}`), chatData);
        
        // Save in current user's chat list
        const userChatData = {
          otherUserId: donorId,
          otherUserName: donorName,
          lastMessage: "Chat started",
          timestamp: Date.now(),
          unread: false
        };
        await set(ref(database, `userChats/${auth.currentUser.uid}/${chatId}`), userChatData);
        
        // Save in donor's chat list
        const donorChatData = {
          otherUserId: auth.currentUser.uid,
          otherUserName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
          lastMessage: "Chat started",
          timestamp: Date.now(),
          unread: true
        };
        await set(ref(database, `userChats/${donorId}/${chatId}`), donorChatData);
        
        // Send notification to the donor
        await sendChatNotification(
          donorId,
          "A new chat has been started with you",
          auth.currentUser.displayName || auth.currentUser.email.split('@')[0]
        );

        toast.success("Chat started successfully");
      }

      // Navigate to chats page
      navigate('/chats');
    } catch (error) {
      console.error("Error handling chat:", error);
      toast.error("Failed to start chat. Please try again.");
    }
  };

  const handleViewProfile = (donorId) => {
    navigate(`/profile/${donorId}`);
  };

  const getChatPreview = (donorId) => {
    if (!userChats) return null;
    const chat = Object.entries(userChats).find(([_, chatData]) => chatData.otherUserId === donorId);
    return chat ? chat[1] : null;
  };

  const filteredDonors = showAllDonors ? allDonors : donors.filter(donor => {
    const searchLower = searchQuery.toLowerCase();
    return (
      donor.name?.toLowerCase().includes(searchLower) ||
      donor.bloodType?.toLowerCase().includes(searchLower) ||
      donor.city?.toLowerCase().includes(searchLower)
    );
  });

  // Add error boundary for donor display
  const renderDonorName = (donor) => {
    try {
      return donor.name || "Unknown Donor";
    } catch (error) {
      console.error("Error rendering donor name:", error, donor);
      return "Unknown Donor";
    }
  };

  // Enhanced location info display
  const renderLocationInfo = (donor) => {
    const locationInfo = [];
    
    // Add city information
    if (donor.city) {
      locationInfo.push(
        <div key="city" className="flex items-center gap-1">
          <MapPin className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{donor.city}</span>
        </div>
      );
    }
    
    // Add distance information
    if (donor.distance !== Infinity) {
      locationInfo.push(
        <div key="distance" className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span>{donor.distance.toFixed(1)} km away</span>
        </div>
      );
    }

    // Add "Same City" badge if applicable
    if (donor.isInSameCity) {
      locationInfo.push(
        <span key="same-city" className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium border border-green-100">
          Same City
        </span>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-3">
        {locationInfo.map((info, index) => (
          <React.Fragment key={index}>
            {info}
          </React.Fragment>
        ))}
            </div>
    );
  };

  // Update the donor card render to use the safe name renderer
  const renderDonorCard = (donor) => {
              const chatPreview = getChatPreview(donor.userId);
              return (
                <motion.div
                  key={donor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
        className={`bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow ${
          donor.isInSameCity ? 'border-2 border-green-500' : ''
        }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => handleViewProfile(donor.userId)}
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 hover:text-red-600">
                  {renderDonorName(donor)}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="inline-block px-2 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    {donor.bloodType || "Unknown"}
                  </span>
                  {requestDetails.isEmergency && (
                    <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Emergency
                          </span>
                  )}
                </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleChatClick(donor.userId, donor.name)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 px-3 py-1 rounded-lg hover:bg-blue-50 relative"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>Chat</span>
                      {chatPreview?.unread && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                      )}
                    </button>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
          {renderLocationInfo(donor)}
                    <div>Last Donation: {donor.lastDonation ? new Date(donor.lastDonation).toLocaleDateString() : 'Not specified'}</div>
                    {chatPreview && (
                      <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Last message:</p>
              <p className="text-sm text-gray-700" style={{ wordBreak: 'break-word' }}>
                {chatPreview.lastMessage}
              </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleViewProfile(donor.userId)}
                    className="mt-4 w-full text-gray-600 hover:text-red-600 text-sm font-medium flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-lg hover:border-red-200 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    View Full Profile
                  </button>
                </motion.div>
              );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Find Blood Donors
              </h1>
              <p className="text-lg text-red-100 mb-4">
                Connect with nearby donors and save lives together
              </p>
              {requestDetails.isEmergency && (
                <div className="inline-flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span>Emergency Request</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/chats")}
                className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-5 py-2 rounded-xl flex items-center gap-2 transition-all transform hover:scale-105"
              >
                <MessageCircle className="w-5 h-5" />
                <span>My Chats</span>
              </button>
              <button
                onClick={() => navigate("/")}
                className="bg-white text-red-600 px-5 py-2 rounded-xl hover:bg-red-50 transition-all transform hover:scale-105"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 transform transition-all hover:shadow-xl">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, blood type, or city..."
              className="w-full px-5 py-4 pr-12 text-lg border-2 border-gray-100 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Donor List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 text-lg">Finding donors near you...</p>
            </div>
          ) : filteredDonors.length > 0 ? (
            <motion.div
              layout
              className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredDonors.map((donor) => (
                <motion.div
                  key={donor.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5 }}
                  className={`bg-white p-6 rounded-2xl shadow-md transition-all ${
                    donor.isInSameCity ? 'ring-2 ring-green-500 ring-offset-2' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                      <div 
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => handleViewProfile(donor.userId)}
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-all">
                          <User className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-red-600 transition-colors">
                            {renderDonorName(donor)}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-100">
                              {donor.bloodType || "Unknown"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleChatClick(donor.userId, donor.name)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 px-4 py-2 rounded-xl hover:bg-blue-50 transition-all relative group"
                    >
                      <MessageCircle className="w-5 h-5 transform group-hover:scale-110 transition-transform" />
                      <span>Chat</span>
                      {getChatPreview(donor.userId)?.unread && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                      )}
                    </button>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                      {renderLocationInfo(donor)}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Last Donation: {donor.lastDonation ? new Date(donor.lastDonation).toLocaleDateString() : 'Not specified'}</span>
                    </div>
                    {getChatPreview(donor.userId) && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-xs text-blue-600 font-medium mb-1">Recent Message:</p>
                        <p className="text-sm text-gray-700" style={{ wordBreak: 'break-word' }}>
                          {getChatPreview(donor.userId).lastMessage}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleViewProfile(donor.userId)}
                    className="mt-6 w-full text-gray-700 hover:text-red-600 text-sm font-medium flex items-center justify-center gap-2 py-3 bg-gray-50 rounded-xl hover:bg-red-50 transition-all transform hover:scale-[1.02]"
                  >
                    <User className="w-4 h-4" />
                    View Full Profile
                  </button>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-2xl shadow-lg">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-gray-600 text-lg mb-6">
                No donors found matching your criteria
              </p>
              {!showAllDonors && (
                <button
                  onClick={() => {
                    setShowAllDonors(true);
                    setSearchQuery("");
                  }}
                  className="bg-red-600 text-white px-8 py-3 rounded-xl hover:bg-red-700 transition-all transform hover:scale-105"
                >
                  Show All Donors
                </button>
              )}
            </div>
          )}
        </div>
        {showAllDonors && (
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setShowAllDonors(false);
                setSearchQuery("");
              }}
              className="bg-gray-600 text-white px-8 py-3 rounded-xl hover:bg-gray-700 transition-all transform hover:scale-105"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FindDonor;