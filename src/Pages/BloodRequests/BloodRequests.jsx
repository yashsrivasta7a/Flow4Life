import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, query, orderByChild, push, set, get } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { MessageCircle, MapPin, AlertCircle, Clock } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { sendChatNotification } from '../../Utils/Notifications';

const BloodRequests = () => {
  const navigate = useNavigate();
  const database = getDatabase();
  const auth = getAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Unable to get your location. Distance calculations will not be available.');
        }
      );
    }

    // Fetch blood requests
    const requestsRef = ref(database, 'blood_requests');
    const requestsQuery = query(requestsRef, orderByChild('timestamp'));

    onValue(requestsQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let requestsArray = Object.entries(data).map(([id, details]) => ({
          id,
          ...details,
          distance: userLocation ? calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            details.latitude,
            details.longitude
          ) : null
        }));

        // Sort by emergency status first, then by timestamp
        requestsArray.sort((a, b) => {
          if (a.urgency === 'emergency' && b.urgency !== 'emergency') return -1;
          if (a.urgency !== 'emergency' && b.urgency === 'emergency') return 1;
          return b.timestamp - a.timestamp;
        });

        setRequests(requestsArray);
      }
      setLoading(false);
    });
  }, [database, userLocation]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    
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

  const handleChatClick = async (requesterId, requesterName) => {
    if (!auth.currentUser) {
      toast.error("Please sign in to chat with requesters");
      navigate('/signin');
      return;
    }

    try {
      // Check if chat already exists
      const userChatsRef = ref(database, `userChats/${auth.currentUser.uid}`);
      const userChatsSnapshot = await get(userChatsRef);
      let existingChatId = null;
      
      if (userChatsSnapshot.exists()) {
        // Look for an existing chat with this requester
        Object.entries(userChatsSnapshot.val()).forEach(([chatId, chat]) => {
          if (chat.otherUserId === requesterId) {
            existingChatId = chatId;
          }
        });
      }

      let chatId = existingChatId;

      if (!existingChatId) {
        // Create new chat if none exists
        chatId = push(ref(database, 'chats')).key;
        const chatData = {
          participants: [auth.currentUser.uid, requesterId],
          participantNames: {
            [auth.currentUser.uid]: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
            [requesterId]: requesterName
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
          otherUserId: requesterId,
          otherUserName: requesterName,
          lastMessage: "Chat started",
          timestamp: Date.now(),
          unread: false
        };
        await set(ref(database, `userChats/${auth.currentUser.uid}/${chatId}`), userChatData);
        
        // Save in requester's chat list
        const requesterChatData = {
          otherUserId: auth.currentUser.uid,
          otherUserName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
          lastMessage: "Chat started",
          timestamp: Date.now(),
          unread: true
        };
        await set(ref(database, `userChats/${requesterId}/${chatId}`), requesterChatData);
        
        // Send notification to the requester
        await sendChatNotification(
          requesterId,
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

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'emergency':
        return 'bg-red-600 text-white';
      case 'urgent':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-green-500 text-white';
    }
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'emergency':
        return <AlertCircle className="w-4 h-4" />;
      case 'urgent':
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return Math.floor(seconds) + ' seconds ago';
  };

  const filteredRequests = requests.filter(request => {
    // First filter out the current user's requests
    if (auth.currentUser && request.userId === auth.currentUser.uid) {
      return false;
    }
    
    // Then apply search filters
    const searchLower = searchQuery.toLowerCase();
    return (
      request.patientName?.toLowerCase().includes(searchLower) ||
      request.bloodType?.toLowerCase().includes(searchLower) ||
      request.hospital?.toLowerCase().includes(searchLower) ||
      request.city?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Blood Requests
              </h1>
              <p className="text-lg text-red-100 mb-4">
                Help save lives by donating blood to those in need
              </p>
            </div>
            <div className="flex gap-3">
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
              placeholder="Search by patient name, blood type, hospital, or city..."
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

        {/* Requests List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 text-lg">Finding blood requests...</p>
            </div>
          ) : filteredRequests.length > 0 ? (
            filteredRequests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                className={`bg-white p-6 rounded-2xl shadow-md transition-all ${
                  request.urgency === 'emergency' ? 'ring-2 ring-red-500 ring-offset-2' : ''
                }`}
              >
                {/* Header with Patient Name and Chat Button */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      {request.patientName}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {/* Blood Type Badge */}
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-100">
                        {request.bloodType}
                      </span>
                      {/* Urgency Badge */}
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium ${getUrgencyColor(request.urgency)}`}>
                        {getUrgencyIcon(request.urgency)}
                        {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}
                      </span>
                    </div>
                  </div>
                  {auth.currentUser && request.userId !== auth.currentUser.uid && (
                    <button
                      onClick={() => handleChatClick(request.userId, request.patientName)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 px-4 py-2 rounded-xl hover:bg-blue-50 transition-all relative group"
                    >
                      <MessageCircle className="w-5 h-5 transform group-hover:scale-110 transition-transform" />
                      <span>Chat</span>
                    </button>
                  )}
                </div>

                {/* Request Details */}
                <div className="space-y-3 text-sm">
                  {/* Hospital and Location */}
                  <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-800">{request.hospital}</div>
                      <div className="text-gray-600">{request.city}</div>
                      {request.distance && (
                        <div className="text-gray-500 mt-1 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          {request.distance.toFixed(1)} km away
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time and Units */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">Posted</span>
                      </div>
                      <div className="text-gray-800">
                        {getTimeAgo(request.timestamp)}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-gray-600 mb-1 font-medium">
                        Units Needed
                      </div>
                      <div className="text-2xl font-bold text-red-600">
                        {request.units}
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {request.additionalInfo && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <div className="font-medium mb-1 text-blue-700">Additional Information</div>
                      <p className="text-blue-800">{request.additionalInfo}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-2xl shadow-lg">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-gray-600 text-lg">
                No blood requests found matching your criteria
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BloodRequests; 