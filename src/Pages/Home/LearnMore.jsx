import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, Clock, Check, X, AlertCircle, Droplet, User, Activity } from 'lucide-react';

const LearnMore = () => {
  const navigate = useNavigate();

  const eligibilityCriteria = [
    {
      title: "Age",
      requirement: "18-65 years old",
      description: "Regular donors over 65 may continue to donate with physician approval."
    },
    {
      title: "Weight",
      requirement: "Above 50kg (110 lbs)",
      description: "Ensures donor safety during the donation process."
    },
    {
      title: "Hemoglobin Level",
      requirement: "≥ 12.5 g/dL (females), ≥ 13.0 g/dL (males)",
      description: "Will be tested before donation."
    },
    {
      title: "Time Between Donations",
      requirement: "At least 56 days",
      description: "Allows your body to replenish red blood cells."
    }
  ];

  const donationProcess = [
    {
      title: "Registration",
      description: "Fill out a confidential medical history questionnaire.",
      icon: <User className="w-6 h-6 text-red-500" />
    },
    {
      title: "Health Check",
      description: "Quick physical examination including blood pressure, pulse, and hemoglobin test.",
      icon: <Activity className="w-6 h-6 text-red-500" />
    },
    {
      title: "Donation",
      description: "The actual donation takes about 8-10 minutes.",
      icon: <Droplet className="w-6 h-6 text-red-500" />
    },
    {
      title: "Recovery",
      description: "Light refreshments and 10-15 minutes rest.",
      icon: <Heart className="w-6 h-6 text-red-500" />
    }
  ];

  const handleDonorRegistration = () => {
    navigate('/donation-form');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-red-50 to-white">
      {/* Hero Section */}
      <section className="w-full px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6"
          >
            Learn About <span className="text-red-600">Blood Donation</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto"
          >
            Understanding the donation process and requirements helps ensure a safe and successful donation experience.
          </motion.p>
        </div>
      </section>

      {/* Quick Facts */}
      <section className="w-full px-4 py-16 bg-white sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Quick Facts About Blood Donation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-red-50 p-6 rounded-xl text-center"
            >
              <div className="text-4xl font-bold text-red-600 mb-2">4.5M</div>
              <p className="text-gray-700">Americans need blood transfusions each year</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-red-50 p-6 rounded-xl text-center"
            >
              <div className="text-4xl font-bold text-red-600 mb-2">3</div>
              <p className="text-gray-700">Lives can be saved with one donation</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-red-50 p-6 rounded-xl text-center"
            >
              <div className="text-4xl font-bold text-red-600 mb-2">56</div>
              <p className="text-gray-700">Days until you can donate again</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Eligibility Criteria */}
      <section className="w-full px-4 py-16 bg-red-50 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Basic Eligibility Requirements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {eligibilityCriteria.map((criteria, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-soft"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{criteria.title}</h3>
                <div className="text-red-600 font-medium mb-2">{criteria.requirement}</div>
                <p className="text-gray-600">{criteria.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Donation Process */}
      <section className="w-full px-4 py-16 bg-white sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">The Donation Process</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {donationProcess.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="bg-red-50 p-6 rounded-xl text-center"
              >
                <div className="flex justify-center mb-4">
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full px-4 py-16 bg-red-50 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Ready to Save Lives?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Your donation can make a real difference in someone's life.
          </p>
          <motion.button
            onClick={handleDonorRegistration}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-colors"
          >
            Register as Donor
          </motion.button>
        </div>
      </section>
    </div>
  );
};

export default LearnMore; 