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

    // Don't allow chat with self
    if (requesterId === auth.currentUser.uid) {
      toast.error("You cannot chat with yourself");
      return;
    }

    try {
      // First check if the requester exists
      const requesterRef = ref(database, `users/${requesterId}`);
      const requesterSnapshot = await get(requesterRef);
      
      if (!requesterSnapshot.exists()) {
        toast.error("Could not find the requester's profile");
        return;
      }

      // Generate a unique chat ID that will be the same for both users
      const chatId = [auth.currentUser.uid, requesterId].sort().join('_');

      // Check if chat already exists
      const chatRef = ref(database, `chats/${chatId}`);
      const chatSnapshot = await get(chatRef);

      if (!chatSnapshot.exists()) {
        // Create new chat
        const chatData = {
          participants: [auth.currentUser.uid, requesterId],
          participantNames: {
            [auth.currentUser.uid]: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
            [requesterId]: requesterName
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
            otherUserId: requesterId,
            otherUserName: requesterName,
            lastMessage: "Chat started",
            timestamp: Date.now(),
            unread: false
          },
          [`userChats/${requesterId}/${chatId}`]: {
            otherUserId: auth.currentUser.uid,
            otherUserName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
            lastMessage: "Chat started",
            timestamp: Date.now(),
            unread: true
          }
        };

        // Use update to write to multiple paths atomically
        await set(ref(database), updates);

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
      if (error.code === 'PERMISSION_DENIED') {
        toast.error("You don't have permission to start this chat. Please try again later.");
      } else {
        toast.error("Failed to start chat. Please try again.");
      }
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white p-6 rounded-xl shadow-md mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Blood Requests</h1>
              <p className="text-gray-600 mt-1">Help save lives by donating blood</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Home
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-6 rounded-xl shadow-md mb-6">
          <input
            type="text"
            placeholder="Search by patient name, blood type, hospital, or city..."
            className="w-full px-4 py-2 border rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Requests List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
            </div>
          ) : filteredRequests.length > 0 ? (
            filteredRequests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow ${
                  request.urgency === 'emergency' ? 'border-2 border-red-500' : ''
                }`}
              >
                {/* Header with Patient Name and Chat Button */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      {request.patientName}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {/* Blood Type Badge */}
                      <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                        {request.bloodType}
                      </span>
                      {/* Urgency Badge */}
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(request.urgency)}`}>
                        {getUrgencyIcon(request.urgency)}
                        {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}
                      </span>
                    </div>
                  </div>
                  {auth.currentUser && request.userId !== auth.currentUser.uid && (
                    <button
                      onClick={() => handleChatClick(request.userId, request.patientName)}
                      className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-full transition-colors"
                    >
                      <MessageCircle className="w-6 h-6" />
                    </button>
                  )}
                </div>

                {/* Request Details */}
                <div className="space-y-3 text-sm">
                  {/* Hospital and Location */}
                  <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-800">{request.hospital}</div>
                      <div className="text-gray-600">{request.city}</div>
                      {request.distance && (
                        <div className="text-gray-500 mt-1">
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
                    <div className="bg-blue-50 p-3 rounded-lg text-blue-800">
                      <div className="font-medium mb-1">Additional Information</div>
                      <p className="text-blue-700">{request.additionalInfo}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-600 text-lg">
                No blood requests found matching your criteria.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BloodRequests; 