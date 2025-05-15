import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { getMessaging, onMessage, getToken } from 'firebase/messaging';
import { app } from "../../Utils/Firebase";
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Droplet, MapPin, Users, Heart, ArrowRight, ChevronRight, MessageCircle, Heading1 } from "lucide-react";
import blood from '../../assets/blood.png'
import { toast } from "react-hot-toast";
import Navbar from '../../components/Navbar';

const Home = () => {
  const navigate = useNavigate();
  const auth = getAuth(app);
  const database = getDatabase();
  const messaging = getMessaging(app);

  const [user, setUser] = useState(null);
  const [donationRequests, setDonationRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationToken, setNotificationToken] = useState(null);
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        requestNotificationPermission();
      } else {
        navigate('/signin');
      }
    });
    return () => unsubscribe();
  }, [auth, navigate]);

  useEffect(() => {
    const donationRequestsRef = ref(database, 'donation_requests');
    onValue(donationRequestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setDonationRequests(Object.values(data)); // No city filter, show all
      }
      setLoading(false);
    });
  }, [database]);

  useEffect(() => {
    onMessage(messaging, (payload) => {
      console.log('Message received in foreground: ', payload)
      setNotifications((prev) => [...prev, payload.notification]);
      toast.success(payload.notification?.title || "New notification");
    });
  }, [messaging]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScroll(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const requestNotificationPermission = async () => {
    try {
      const token = await getToken(messaging, { vapidKey: 'BGdFd5iKrCCk65_Ld6mWv9XAutBRVe1Q5RmCHylozHlT5uwJBQfiCxUubjqoIOJM0bW2Ctg1cXKU6c0tXJ5dYJQ' });
      const userId = auth.currentUser?.uid;
      if (token && userId) {
        await set(ref(database, `users/${userId}/fcmToken`), token);
        setNotificationToken(token); // Save token to state
      }
      console.log('Notification token:', token);

    } catch (error) {
      console.error('Error getting notification token:', error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/signin');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // const stats = [
  //   { icon: <Droplet className="w-8 h-8 text-red-500" />, value: "1,000+", label: "Blood Donations" },
  //   { icon: <Users className="w-8 h-8 text-red-500" />, value: "5,000+", label: "Active Donors" },
  //   { icon: <MapPin className="w-8 h-8 text-red-500" />, value: "50+", label: "Cities Covered" },
  // ];

  return (
    <>
      <Navbar
        user={user}
        onLogout={handleLogout}
        notifications={notifications}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />
      <div className="min-h-screen bg-gradient-to-b from-background to-surface">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <motion.h1
              className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Save Lives Through
              <span className="text-red-500"> Blood Donation</span>
            </motion.h1>
            <motion.p
              className="text-xl text-gray-600 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Connect with blood donors in your area and help save lives
            </motion.p>
            <motion.div
              className="flex flex-wrap justify-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <button
                onClick={() => navigate("/finddonor")}
                className="bg-red-500 text-white px-8 py-3 rounded-full hover:bg-red-600 transition-colors shadow-sm hover:shadow flex items-center gap-2"
              >
                Donate Blood <Heart className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate("/requestform")}
                className="bg-white text-red-500 border-2 border-red-500 px-8 py-3 rounded-full hover:bg-red-50 transition-colors shadow-sm hover:shadow flex items-center gap-2"
              >
                Request Blood <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate("/chats")}
                className="bg-blue-500 text-white px-8 py-3 rounded-full hover:bg-blue-600 transition-colors shadow-sm hover:shadow flex items-center gap-2"
              >
                View Chats <MessageCircle className="w-5 h-5" />
              </button>
            </motion.div>
          </div>

          {/* Stats Section */}
          {/* <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 * index }}
              >
                <div className="flex justify-center mb-4">{stat.icon}</div>
                <div className="text-2xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </motion.div>
            ))} */}
        </div>

        {/* Donation Requests Section */}
        <div className="mt-16 mx-9">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Available Blood Donors</h2>
            <Link
              to="/finddonor"
              className="text-red-500 hover:text-red-600 flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading requests...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {donationRequests.map((request, index) => (
                <motion.div
                  key={index}
                  className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/profile/${request.userId}`)}
                  whileHover={{ scale: 1.02 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{request.fullName}</h3>
                      <p className="text-gray-600">{request.city}</p>
                    </div>
                    <div className="bg-red-50 text-red-500 px-3 py-1 rounded-full text-sm font-medium">
                      {request.bloodGroup}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <button className="text-red-500 hover:text-red-600 flex items-center gap-1">
                      Contact <MessageCircle className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-500">Urgent</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Chat Section */}
        <div className="mt-8 text-center">
          <Link
            to="/donate"
            className="inline-flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-full hover:bg-red-600 transition-colors shadow-sm hover:shadow"
          >
            <MessageCircle className="w-5 h-5" />
            Register as Donor
          </Link>
        </div>

      </div>
      {/* Footer */}
      <footer className="bg-surface border-t border-accent py-6 mt-16 text-center text-primary text-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 px-4">
          <div>
            &copy; {new Date().getFullYear()} Flow4Life. All rights reserved.
          </div>
          <div className="flex gap-4">
            <a href="mailto:support@flow4life.com" className="hover:text-accent transition">Contact</a>
            <a href="/" className="hover:text-accent transition">Dashboard</a>
            <a href="/finddonor" className="hover:text-accent transition">Find Donors</a>
          </div>
        </div>
      </footer>
      {/* Scroll to Top Button */}
      {showScroll && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-accent transition z-50"
          aria-label="Scroll to top"
        >
          ↑
        </button>
      )}
    </>
  );
};

export default Home;