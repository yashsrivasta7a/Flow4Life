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
  const dLon = deg2rad(lon2 - lon1);
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

  const requestDetails = location.state || {};

  // Get user's location and city
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

          // Get city name using our utility function
          const cityName = await getCityFromCoordinates(latitude, longitude);
          if (cityName) {
            setUserCity(cityName);
            console.log('Detected city:', cityName); // Debug log
          } else {
            console.log('Could not detect city from coordinates'); // Debug log
          }
        }
      } catch (error) {
        console.error('Error getting location:', error);
        toast.error('Unable to get your location. Distance calculations will not be available.');
      }
    };

    getUserLocation();
  }, [requestDetails]);

  useEffect(() => {
    const donorsRef = ref(database, "donation_requests");
    const donorsQuery = query(donorsRef, orderByChild("timestamp"));

    onValue(donorsQuery, (snapshot) => {
      const data = snapshot.val();
      console.log("Raw donor data:", data); // Debug log
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
        console.log("All donors:", donorsArray); // Debug log

        // Apply filters only if not showing all donors
        if (!showAllDonors) {
          // Filter out unavailable donors and check blood type compatibility
          donorsArray = donorsArray.filter(donor => {
            // First check if donor is available
            if (donor.status === 'unavailable') return false;
            
            // Then check blood type compatibility
            if (!requestDetails.bloodType) return true;
            return isBloodCompatible(requestDetails.bloodType, donor.bloodType);
          });

          // Sort by location - always prioritize same city and nearest donors
          if (userLocation) {
            donorsArray.sort((a, b) => {
              // First, prioritize donors in the same city
              if (a.isInSameCity && !b.isInSameCity) return -1;
              if (!a.isInSameCity && b.isInSameCity) return 1;
              
              // Then sort by distance (nearest first)
              const distanceA = a.distance === Infinity ? Number.MAX_VALUE : a.distance;
              const distanceB = b.distance === Infinity ? Number.MAX_VALUE : b.distance;
              return distanceA - distanceB;
            });
          }
        }
        console.log("Filtered donors:", donorsArray); // Debug log
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

  // Add a function to display location information
  const renderLocationInfo = (donor) => {
    const locationText = [];
    
    if (donor.isInSameCity) {
      locationText.push(<span key="same-city" className="text-green-600 font-medium">Same City</span>);
    }
    
    if (donor.city) {
      locationText.push(<span key="city">{donor.city}</span>);
    }

    if (donor.distance !== Infinity) {
      locationText.push(
        <span key="distance" className="text-gray-500">
          ({donor.distance.toFixed(1)} km away)
        </span>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 mr-1" />
        {locationText.map((text, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="mx-1">•</span>}
            {text}
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
                <span className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">
                  {donor.bloodType || "Unknown"}
                </span>
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
              <p className="text-sm text-gray-700 truncate">{chatPreview.lastMessage}</p>
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-md mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Available Donors</h1>
            {requestDetails.isEmergency && (
              <div className="flex items-center text-red-600 mt-2">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span>Emergency Request</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/chats")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              <span>My Chats</span>
            </button>
          <button
            onClick={() => navigate("/")}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Home
          </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow-md mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search by name, blood type, or city..."
              className="flex-1 px-4 py-2 border rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Donor List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
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
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: 1,
                    boxShadow: requestDetails.isEmergency 
                      ? ['0 0 0 0 rgba(220, 38, 38, 0)', '0 0 0 10px rgba(220, 38, 38, 0)']
                      : undefined
                  }}
                  transition={{
                    layout: { duration: 0.3 },
                    opacity: { duration: 0.2 },
                    boxShadow: {
                      repeat: Infinity,
                      duration: 2,
                      ease: "easeInOut"
                    }
                  }}
                  className={`${
                    requestDetails.isEmergency 
                      ? 'bg-red-600 text-white shadow-red-200 relative animate-pulse-subtle' 
                      : 'bg-white text-gray-800'
                  } p-6 rounded-xl shadow-lg hover:shadow-xl transition-all ${
                    donor.isInSameCity ? 'border-2 border-green-500' : ''
                  }`}
                >
                  {requestDetails.isEmergency && (
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping" />
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => handleViewProfile(donor.userId)}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          requestDetails.isEmergency 
                            ? 'bg-red-500 text-white' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className={`text-lg font-semibold hover:opacity-80 transition-opacity ${
                            requestDetails.isEmergency ? 'text-white' : 'text-gray-800 hover:text-red-600'
                          }`}>
                            {renderDonorName(donor)}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className={`inline-block px-2 py-1 rounded-full text-sm font-medium ${
                              requestDetails.isEmergency 
                                ? 'bg-red-500 text-white' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {donor.bloodType || "Unknown"}
                            </span>
                            {requestDetails.isEmergency && (
                              <span className="inline-flex items-center px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium animate-pulse">
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
                      className={`flex items-center gap-2 px-3 py-1 rounded-lg relative ${
                        requestDetails.isEmergency 
                          ? 'text-white hover:bg-red-500' 
                          : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                      }`}
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>Chat</span>
                      {getChatPreview(donor.userId)?.unread && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full"></span>
                      )}
                    </button>
                  </div>
                  
                  <div className={`space-y-2 text-sm ${
                    requestDetails.isEmergency ? 'text-red-100' : 'text-gray-600'
                  }`}>
                    {renderLocationInfo(donor)}
                    <div>Last Donation: {donor.lastDonation ? new Date(donor.lastDonation).toLocaleDateString() : 'Not specified'}</div>
                    {getChatPreview(donor.userId) && (
                      <div className={`mt-3 p-2 rounded-lg ${
                        requestDetails.isEmergency 
                          ? 'bg-red-500 bg-opacity-50' 
                          : 'bg-gray-50'
                      }`}>
                        <p className={requestDetails.isEmergency ? 'text-red-100' : 'text-gray-500'}>Last message:</p>
                        <p className={requestDetails.isEmergency ? 'text-white' : 'text-gray-700'} style={{ wordBreak: 'break-word' }}>
                          {getChatPreview(donor.userId).lastMessage}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleViewProfile(donor.userId)}
                    className={`mt-4 w-full font-medium flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
                      requestDetails.isEmergency 
                        ? 'border border-white text-white hover:bg-red-500' 
                        : 'text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    View Full Profile
                  </button>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-600 text-lg mb-4">
                No donors found matching your criteria.
              </p>
              {!showAllDonors && (
                <button
                  onClick={() => {
                    setShowAllDonors(true);
                    setSearchQuery("");
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Show All Donors
                </button>
              )}
            </div>
          )}
        </div>
        {showAllDonors && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setShowAllDonors(false);
                setSearchQuery("");
              }}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
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