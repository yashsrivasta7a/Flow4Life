import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, Search } from 'lucide-react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Navbar from '../../components/Navbar';

const Home = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getDatabase();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [userType, setUserType] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, 
      async (currentUser) => {
        setUser(currentUser);
        
        if (currentUser) {
          // Check if user has a profile and user type
          try {
            const userRef = ref(db, `users/${currentUser.uid}`);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
              setUserType(snapshot.val().userType || 'donor');
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
          }
        }
        
        setLoading(false);
      },
      (error) => {
        console.error("Auth state change error:", error);
        setAuthError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth, db]);

  const handleAuthAction = (path, userType) => {
    if (user) {
      // If user is logged in, redirect them to the correct home page
      navigate(path);
    } else {
      // If not logged in, send to signup with the userType
      navigate('/signup', { state: { userType } });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-purple-50 to-white flex items-center justify-center">
        <div className="text-red-500 text-xl">Loading...</div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-purple-50 to-white flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{authError}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar
        user={user}
        onLogout={handleSignOut}
        notifications={notifications}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />
      <div className="min-h-screen w-full bg-gradient-to-b from-purple-50 to-white">
        <div className="w-full px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16 w-full"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Welcome to
              <span className="text-red-500"> Flow4Life</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 mx-auto max-w-3xl">
              Connecting blood donors with those in need. Every donation counts, every life matters.
            </p>
            {/*{user && (
              <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg inline-block mb-8">
                Logged in as: {user.displayName || user.email}
                {userType && (
                  <span className="ml-2 text-sm bg-purple-200 px-2 py-1 rounded">
                    {userType === 'donor' ? 'Donor' : 'Requester'}
                  </span>
                )}
              </div>
            )} */}
            
            {user && userType && (
              <div className="mb-8">
                {/* <Link
                  to={userType === 'donor' ? '/donor' : '/requester'}
                  className="bg-red-500 text-white px-6 py-2 rounded-full hover:bg-red-600 transition-colors"
                >
                  Go to Your Dashboard
                </Link> */}
              </div>
            )}
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {/* Donor Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-red-50 to-red-100 p-8 rounded-2xl shadow-soft hover:shadow-lg transition-all cursor-pointer h-full"
              onClick={() => handleAuthAction('/donor', 'donor')}
            >
              <div className="flex justify-center mb-6">
                <Heart className="w-16 h-16 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-4">I Want to Donate</h2>
              <p className="text-gray-600 mb-6">
                Join our community of heroes. Your blood donation can save up to three lives.
              </p>
              <div className="bg-red-500 text-white px-6 py-3 rounded-full inline-block font-semibold hover:bg-red-600 transition-colors">
                Donate Blood
              </div>
            </motion.div>

            {/* Requester Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl shadow-soft hover:shadow-lg transition-all cursor-pointer h-full"
              onClick={() => handleAuthAction('/requester', 'requester')}
            >
              <div className="flex justify-center mb-6">
                <Search className="w-16 h-16 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">I Need Blood</h2>
              <p className="text-gray-600 mb-6">
                Quick and efficient blood request processing. Find donors in your area.
              </p>
              <div className="bg-blue-500 text-white px-6 py-3 rounded-full inline-block font-semibold hover:bg-blue-600 transition-colors">
                Request Blood
              </div>
            </motion.div>
          </div>

          {/* Statistics Section */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-xl shadow-soft text-center"
            >
              <h3 className="text-3xl font-bold text-red-500 mb-2">10,000+</h3>
              <p className="text-gray-600">Successful Donations</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white p-6 rounded-xl shadow-soft text-center"
            >
              <h3 className="text-3xl font-bold text-red-500 mb-2">5,000+</h3>
              <p className="text-gray-600">Active Donors</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white p-6 rounded-xl shadow-soft text-center"
            >
              <h3 className="text-3xl font-bold text-red-500 mb-2">24/7</h3>
              <p className="text-gray-600">Emergency Support</p>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;