import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, Search } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-purple-50 to-white">
      <div className="w-full px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16 w-full"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to
            <span className="text-purple-600"> Flow4Life</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 mx-auto max-w-3xl">
            Connecting blood donors with those in need. Every donation counts, every life matters.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* Donor Card */}
          <Link to="/donor" className="w-full">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-red-50 to-red-100 p-8 rounded-2xl shadow-soft hover:shadow-lg transition-all cursor-pointer h-full"
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
          </Link>

          {/* Requester Card */}
          <Link to="/requester" className="w-full">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl shadow-soft hover:shadow-lg transition-all cursor-pointer h-full"
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
          </Link>
        </div>

        {/* Statistics Section */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-xl shadow-soft text-center"
          >
            <h3 className="text-3xl font-bold text-purple-600 mb-2">10,000+</h3>
            <p className="text-gray-600">Successful Donations</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-xl shadow-soft text-center"
          >
            <h3 className="text-3xl font-bold text-purple-600 mb-2">5,000+</h3>
            <p className="text-gray-600">Active Donors</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white p-6 rounded-xl shadow-soft text-center"
          >
            <h3 className="text-3xl font-bold text-purple-600 mb-2">24/7</h3>
            <p className="text-gray-600">Emergency Support</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Home;