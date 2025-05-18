import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Droplet, Calendar, ClipboardCheck, MapPin, Phone, Heart, AlertCircle, User, Clock } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';
import { toast } from 'react-hot-toast';

const DonorHome = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const database = getDatabase();
  const [isRegisteredDonor, setIsRegisteredDonor] = useState(false);
  const [loading, setLoading] = useState(true);

  const donationSteps = [
    {
      icon: <ClipboardCheck className="w-8 h-8 text-red-500" />,
      title: "Check Eligibility",
      description: "Complete our quick eligibility questionnaire based on WHO guidelines."
    },
    {
      icon: <Calendar className="w-8 h-8 text-red-500" />,
      title: "Schedule Donation",
      description: "Choose a convenient time and location for your blood donation."
    },
    {
      icon: <Droplet className="w-8 h-8 text-red-500" />,
      title: "Donate Blood",
      description: "Give the gift of life through a safe and simple donation process."
    }
  ];

  useEffect(() => {
    const checkDonorStatus = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        const donorRef = ref(database, `donation_requests/${user.uid}`);
        const snapshot = await get(donorRef);
        setIsRegisteredDonor(snapshot.exists());
        setLoading(false);
      } catch (error) {
        console.error('Error checking donor status:', error);
        setLoading(false);
      }
    };

    checkDonorStatus();
  }, [auth, database]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-red-50 to-white pt-20">
      {/* Hero Section */}
      <section className="w-full px-4 py-20 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center w-full"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            {isRegisteredDonor ? (
              <>Welcome Back, <span className="text-red-600">Blood Hero!</span></>
            ) : (
              <>Save Lives Through <span className="text-red-600">Blood Donation</span></>
            )}
          </h1>
          <p className="text-xl text-gray-600 mb-8 mx-auto max-w-3xl">
            {isRegisteredDonor 
              ? "Thank you for being a registered donor. Your commitment to saving lives makes a real difference."
              : "Your donation can save up to three lives. Join our community of heroes making a difference."
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {loading ? (
              <div className="w-full flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
              </div>
            ) : isRegisteredDonor ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-xl shadow-soft p-6 border-2 border-red-500"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Heart className="w-8 h-8 text-red-500 mr-3" />
                      <h2 className="text-2xl font-semibold text-gray-900">Blood Requests</h2>
                    </div>
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                      Emergency
                    </span>
                  </div>
                  <p className="text-gray-600 mb-6">
                    View urgent blood requests in your area. Someone needs your help!
                  </p>
                  <button
                    onClick={() => navigate('/blood-requests')}
                    className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="w-5 h-5" />
                    View Blood Requests
                  </button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-xl shadow-soft p-6"
                >
                  <div className="flex items-center mb-4">
                    <User className="w-8 h-8 text-red-500 mr-3" />
                    <h2 className="text-2xl font-semibold text-gray-900">Your Profile</h2>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Update your information and view your donation history.
                  </p>
                  <button
                    onClick={() => navigate(`/profile/${auth.currentUser.uid}`)}
                    className="w-full bg-red-100 text-red-800 px-6 py-3 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    View Profile
                  </button>
                </motion.div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-soft p-6"
              >
                <div className="flex items-center mb-4">
                  <User className="w-8 h-8 text-red-500 mr-3" />
                  <h2 className="text-2xl font-semibold text-gray-900">Register as Donor</h2>
                </div>
                <p className="text-gray-600 mb-6">
                  Join our community of blood donors and help save lives. Registration takes only a few minutes.
                </p>
                <button
                  onClick={() => navigate('/donation-form')}
                  className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Register Now
                </button>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-soft p-6"
            >
              <div className="flex items-center mb-4">
                <Clock className="w-8 h-8 text-red-500 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900">Learn More</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Discover more about blood donation, eligibility criteria, and how you can make a difference.
              </p>
              <button
                onClick={() => navigate('/learn-more')}
                className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
              >
                Learn More
              </button>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Donation Process - Only show for non-registered donors */}
      {!isRegisteredDonor && (
        <section className="w-full px-4 py-16 bg-white sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How Blood Donation Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            {donationSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className="bg-white p-6 rounded-xl shadow-soft text-center h-full"
              >
                <div className="flex justify-center mb-4">
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section className="w-full px-4 py-16 bg-red-50 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Need Assistance?
          </h2>
          <p className="text-gray-600 mb-8">
            Our team is here to help you with any questions about blood donation.
          </p>
          <div className="flex items-center justify-center gap-3">
            <MapPin className="w-6 h-6 text-red-600" />
            <span className="text-gray-700">Find Donation Centers Near You</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DonorHome; 