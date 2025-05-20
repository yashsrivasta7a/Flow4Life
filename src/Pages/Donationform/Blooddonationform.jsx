import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, set, update, get } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Check, X, AlertCircle, Info, Calendar, Clock, Heart } from 'lucide-react';

const SuccessModal = ({ isOpen, onClose, isLoading }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="bg-white rounded-xl p-8 max-w-md w-full mx-4 relative"
          >
            {!isLoading && (
              <div className="absolute top-4 right-4">
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            )}
            <div className="text-center">
              {isLoading ? (
                <>
                  <div className="mx-auto flex items-center justify-center h-16 w-16 mb-6">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Processing Your Registration
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Please wait while we register you as a donor
                  </p>
                </>
              ) : (
                <>
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                    <Heart className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Registration Successful!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Thank you for registering as a blood donor. Your commitment to helping others is truly appreciated.
                  </p>
                  <button
                    onClick={onClose}
                    className="bg-red-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-red-700 transition-colors"
                  >
                    Go to Dashboard
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const BloodDonationForm = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const database = getDatabase();
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastDonationDate, setLastDonationDate] = useState(null);

  // Check if user is already registered as donor and validate 7-day cooling period
  useEffect(() => {
    const checkDonorStatus = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          toast.error("Please sign in to continue");
          navigate('/signin', { state: { from: '/donation-form' } });
          return;
        }

        // Check both user profile and donation requests
        const [userSnapshot, donorSnapshot] = await Promise.all([
          get(ref(database, `users/${user.uid}`)),
          get(ref(database, `donation_requests/${user.uid}`))
        ]);

        let existingData = {
          // Always set these from auth data first
          name: user.displayName || '',
          email: user.email || '',
        };
        
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          existingData = {
            ...existingData,
            // Only override name if it exists in userData and not in auth
            name: existingData.name || userData.name || '',
            phone: userData.phone || '',
            city: userData.city || ''
          };
        }

        if (donorSnapshot.exists()) {
          const donorData = donorSnapshot.val();
          const lastDonation = donorData.lastDonation ? new Date(donorData.lastDonation) : null;
          setLastDonationDate(lastDonation);
          
          existingData = {
            ...existingData,
            bloodType: donorData.bloodType || '',
            gender: donorData.gender || '',
            age: donorData.age || '',
            weight: donorData.weight || ''
          };
        }

        // Pre-fill form with existing data
        setFormData(prev => ({
          ...prev,
          ...existingData
        }));

        setLoading(false);
      } catch (error) {
        console.error('Error checking donor status:', error);
        setLoading(false);
      }
    };

    checkDonorStatus();
  }, [auth, database, navigate]);

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    weight: '',
    bloodType: '',
    phone: '',
    city: '',
    lastDonation: '',
    gender: '',
  });

  const [eligibilityAnswers, setEligibilityAnswers] = useState({
    age: null,
    weight: null,
    health: null,
    recentSurgery: null,
    pregnancy: null,
    medication: null,
    infection: null,
    vaccination: null,
    travel: null,
    risk: null,
    diabetes: null,
    heartCondition: null,
    cancer: null,
    bloodPressure: null,
    hemoglobin: null,
  });

  const eligibilityQuestions = [
    {
      id: 'age',
      question: 'Are you between 18-65 years old?',
      requirement: 'You must be between 18-65 years old to donate blood.',
      info: 'Regular donors over 65 may continue to donate with physician approval.',
    },
    {
      id: 'weight',
      question: 'Do you weigh more than 50kg/110lbs?',
      requirement: 'Minimum weight requirement is 50kg/110lbs.',
      info: 'This ensures your own safety during donation.',
    },
    {
      id: 'health',
      question: 'Are you in good health and feeling well today?',
      requirement: 'You should be in good health and feeling well.',
      info: 'No fever, cold, or other illnesses in the last week.',
    },
    {
      id: 'hemoglobin',
      question: 'Is your hemoglobin level above 12.5 g/dL (females) or 13.0 g/dL (males)?',
      requirement: 'Minimum hemoglobin levels required for donation.',
      info: 'If unsure, we will test your hemoglobin levels before donation.',
    },
    {
      id: 'bloodPressure',
      question: 'Is your blood pressure within normal range (systolic 90-180, diastolic 50-100)?',
      requirement: 'Blood pressure must be within acceptable range.',
      info: 'We will check your blood pressure before donation.',
    },
    {
      id: 'recentSurgery',
      question: 'Have you had any major surgery in the last 6 months?',
      requirement: 'No major surgery in the past 6 months.',
      disqualifyIf: true,
      info: 'Minor procedures may require shorter waiting periods.',
    },
    {
      id: 'pregnancy',
      question: 'Are you pregnant, recently given birth, or breastfeeding?',
      requirement: 'Not pregnant or within 6 months post-delivery.',
      disqualifyIf: true,
      info: 'Wait 6 months after giving birth before donating.',
    },
    {
      id: 'medication',
      question: 'Are you currently taking any antibiotics or other medication for an infection?',
      requirement: 'No current antibiotics or infection medication.',
      disqualifyIf: true,
      info: 'Some medications may require waiting periods.',
    },
    {
      id: 'infection',
      question: 'Do you have any infectious diseases (HIV, Hepatitis B, Hepatitis C)?',
      requirement: 'No infectious diseases.',
      disqualifyIf: true,
      info: 'This ensures recipient safety.',
    },
    {
      id: 'diabetes',
      question: 'Do you have well-controlled diabetes without complications?',
      requirement: 'Diabetes must be well-controlled.',
      info: 'Type 2 diabetes with good control may be acceptable.',
    },
    {
      id: 'heartCondition',
      question: 'Do you have any heart conditions or cardiovascular diseases?',
      requirement: 'No severe heart conditions.',
      disqualifyIf: true,
      info: 'Some controlled conditions may be acceptable with physician approval.',
    },
    {
      id: 'cancer',
      question: 'Have you ever had cancer?',
      requirement: 'No active cancer or ongoing treatment.',
      disqualifyIf: true,
      info: 'Cancer survivors may donate after 5 years of being cancer-free.',
    },
    {
      id: 'vaccination',
      question: 'Have you received any vaccinations in the last 4 weeks?',
      requirement: 'No recent vaccinations.',
      disqualifyIf: true,
      info: 'Different vaccines have different waiting periods.',
    },
    {
      id: 'travel',
      question: 'Have you traveled to any disease-risk areas in the last 6 months?',
      requirement: 'No recent travel to disease-risk areas.',
      disqualifyIf: true,
      info: 'Some travel restrictions may apply based on current health advisories.',
    },
    {
      id: 'risk',
      question: 'Have you engaged in any high-risk behaviors in the last 6 months?',
      requirement: 'No high-risk behaviors.',
      disqualifyIf: true,
      info: 'This includes unsafe sexual practices or needle sharing.',
    },
  ];

  const handleAnswerChange = (questionId, answer) => {
    setEligibilityAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const isEligible = () => {
    const requiredAnswers = eligibilityQuestions.every(q => {
      if (q.disqualifyIf) {
        return eligibilityAnswers[q.id] === false;
      }
      return eligibilityAnswers[q.id] === true;
    });
    return requiredAnswers;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isEligible()) {
      toast.error("Sorry, you are not eligible to donate blood at this time.");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("Please sign in to register as a donor");
        navigate('/signin', { state: { from: '/donation-form' } });
        return;
      }

      // Create user profile data
      const userData = {
        ...formData,
        userId: user.uid,
        email: user.email,
        name: formData.name || user.displayName || user.email.split('@')[0], // Fallback to username from email
        timestamp: Date.now(),
        type: 'donor',
        status: 'active',
        lastUpdated: Date.now()
      };

      // Create donation request data with current timestamp as lastDonation
      const donationRequestData = {
        userId: user.uid,
        name: userData.name, // Use the same name as in userData
        email: user.email,
        bloodType: formData.bloodType,
        city: formData.city,
        lastDonation: Date.now(),
        status: 'available',
        timestamp: Date.now(),
      };

      // Update both nodes
      await Promise.all([
        set(ref(database, `users/${user.uid}`), userData),
        set(ref(database, `donation_requests/${user.uid}`), donationRequestData)
      ]);

      // Show loading modal first
      setIsProcessing(true);
      setShowSuccessModal(true);

      // Simulate processing time (you can replace this with actual matching logic)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Show success state
      setIsProcessing(false);
      
      toast.success("Registration complete! Thank you for becoming a blood donor.", {
        duration: 5000,
        position: 'top-center',
        style: {
          background: '#10B981',
          color: '#FFFFFF',
          padding: '16px',
          borderRadius: '8px',
        },
        icon: '❤️'
      });

    } catch (error) {
      console.error('Error submitting form:', error);
      if (error.code === 'PERMISSION_DENIED') {
        toast.error("Permission denied. Please make sure you're properly signed in.");
      } else {
        toast.error("Error submitting form. Please try again.");
      }
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    navigate('/donor');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-red-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <SuccessModal isOpen={showSuccessModal} onClose={handleModalClose} isLoading={isProcessing} />
      {loading ? (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
            </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-soft p-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Blood Donor Registration</h1>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information */}
              <div className="space-y-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
                {/* Show existing user info in a summary card if available */}
                {(formData.name || formData.email) && (
                  <div className="bg-red-50 p-4 rounded-lg mb-6 border border-red-100">
                    <h3 className="text-lg font-semibold text-red-800 mb-3">Your Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formData.name && (
                        <div className="flex flex-col">
                          <span className="text-sm text-red-600">Name</span>
                          <span className="font-medium text-gray-900">{formData.name}</span>
                        </div>
                      )}
                      {formData.email && (
                        <div className="flex flex-col">
                          <span className="text-sm text-red-600">Email</span>
                          <span className="font-medium text-gray-900">{formData.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {!formData.name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        name="name"
                        required
                        className="input"
                        value={formData.name}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      name="gender"
                      required
                      className="input"
                      value={formData.gender}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                    <input
                      type="number"
                      name="age"
                      required
                      min="18"
                      max="65"
                      className="input"
                      value={formData.age}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                    <input
                      type="number"
                      name="weight"
                      required
                      min="50"
                      className="input"
                      value={formData.weight}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Blood Type</label>
                    <select
                      name="bloodType"
                      required
                      className={`input ${formData.bloodType ? 'bg-gray-50' : ''}`}
                      value={formData.bloodType}
                      onChange={handleInputChange}
                      disabled={!!formData.bloodType}
                    >
                      <option value="">Select Blood Type</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  {!lastDonationDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Donation Date</label>
                      <div className="relative">
                        <input
                          type="date"
                          name="lastDonation"
                          className="input"
                          value={formData.lastDonation}
                          onChange={handleInputChange}
                        />
                        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="e.g., 1234567890"
                      maxLength="10"
                      className="input"
                      value={formData.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setFormData(prev => ({
                          ...prev,
                          phone: value
                        }));
                      }}
                      />
                    <p className="mt-1 text-sm text-gray-500">Enter 10-digit number without spaces or special characters</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      name="city"
                      required
                      className="input"
                      value={formData.city}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  {/* Show last donation info if it exists */}
                  {lastDonationDate && (
                    <div className="md:col-span-2">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-blue-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-blue-800">Last Donation</p>
                            <p className="text-blue-600">{new Date(lastDonationDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Eligibility Questions */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Eligibility Questionnaire</h2>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>Takes about 5 minutes</span>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                    <p className="text-sm text-blue-700">
                      Please answer all questions honestly. Your accurate responses help ensure both donor and recipient safety.
                      All information provided is confidential.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {eligibilityQuestions.map((q) => (
                    <div key={q.id} className="bg-gray-50 p-6 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="flex-grow">
                          <p className="text-gray-900 font-medium">{q.question}</p>
                          <p className="text-sm text-gray-600 mt-1">{q.requirement}</p>
                          {q.info && (
                            <div className="mt-2 flex items-start gap-2 text-sm text-blue-600">
                              <Info className="w-4 h-4 mt-0.5" />
                              <p>{q.info}</p>
                            </div>
                          )}
            </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleAnswerChange(q.id, true)}
                            className={`px-4 py-2 rounded-full flex items-center gap-2 ${
                              eligibilityAnswers[q.id] === true
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            <Check className="w-4 h-4" /> Yes
                          </button>
              <button
                            type="button"
                            onClick={() => handleAnswerChange(q.id, false)}
                            className={`px-4 py-2 rounded-full flex items-center gap-2 ${
                              eligibilityAnswers[q.id] === false
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            <X className="w-4 h-4" /> No
              </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex flex-col items-center gap-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
                {!isEligible() && Object.values(eligibilityAnswers).some(answer => answer !== null) && (
                  <div className="bg-red-50 p-4 rounded-lg w-full border border-red-100">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="w-5 h-5" />
                      <p>Based on your answers, you may not be eligible to donate blood at this time.</p>
                    </div>
                    <p className="mt-2 text-sm text-red-600">
                      Please consult with a healthcare provider for more information about your eligibility status.
                    </p>
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                   className="btn w-full max-w-md bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-full transition-colors duration-200 shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={!isEligible()}
                >
                  Register as Donor
                </motion.button>
                <p className="text-sm text-gray-500 text-center">
                  By registering, you agree to be contacted when your blood type is needed in your area.
                </p>
            </div>
          </form>
          </motion.div>
        </div>
      )}
      </div>
  );
};

export default BloodDonationForm;