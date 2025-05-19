import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, set, push } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AlertCircle, Clock, MapPin } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { sendCityNotification } from '../../components/SendCityNotification';
import { checkAndSendMatchingRequests } from '../../Utils/EmailNotifications';

const RequestForm = ({ emergency = false }) => {
    const navigate = useNavigate();
    const auth = getAuth();
    const database = getDatabase();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [userLocation, setUserLocation] = useState(null);

    const [formData, setFormData] = useState({
        patientName: '',
        age: '',
        bloodType: '',
        units: '',
        hospital: '',
        city: '',
        contactNumber: '',
        urgency: emergency ? 'emergency' : 'normal',
        additionalInfo: '',
        latitude: '',
        longitude: ''
    });

    useEffect(() => {
        // Set urgency to emergency if coming from emergency route
        if (emergency) {
            setFormData(prev => ({
                ...prev,
                urgency: 'emergency'
            }));
        }

        // Get user's location when component mounts
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                    setFormData(prev => ({
                        ...prev,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    }));
                },
                (error) => {
                    console.error("Error getting location:", error);
                    toast.error("Please enable location services for better matching with nearby donors");
                }
            );
        }
    }, [emergency]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const user = auth.currentUser;
            if (!user) {
                toast.error("Please sign in to submit a blood request");
                navigate('/signin', { state: { from: '/request-form' } });
                return;
            }

            const requestData = {
                ...formData,
                userId: user.uid,
                userEmail: user.email,
                timestamp: Date.now(),
                status: 'active',
                isEmergency: emergency,
                location: userLocation || null
            };

            // Add to blood_requests node
            const newRequestRef = push(ref(database, 'blood_requests'));
            await set(newRequestRef, requestData);

            // Send notifications to matching donors
            await checkAndSendMatchingRequests(requestData);

            toast.success("Blood request submitted and notifications sent!");

            // Navigate to FindDonor page with request details
            navigate('/finddonor', { 
                state: { 
                    requestId: newRequestRef.key,
                    bloodType: formData.bloodType,
                    isEmergency: emergency,
                    location: userLocation
                }
            });

        } catch (error) {
            console.error('Error submitting request:', error);
            toast.error("Error submitting request. Please try again.");
        }
    };

    return (
        <>
            <Navbar
                user={user}
                onLogout={() => {}}
                notifications={notifications}
                showNotifications={showNotifications}
                setShowNotifications={setShowNotifications}
                menuOpen={menuOpen}
                setMenuOpen={setMenuOpen}
            />
            <div className="min-h-screen w-full bg-gradient-to-b from-background to-surface py-12 px-4 sm:px-6 lg:px-8">
                <div className="w-full max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-soft p-8"
                    >
                        <div className="flex items-center justify-center gap-3 mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 text-center">
                                {emergency ? 'Emergency Blood Request' : 'Request Blood'}
                            </h1>
                            {emergency && (
                                <div className="bg-red-100 text-red-600 px-3 py-1 rounded-full flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="font-medium">Emergency</span>
                                </div>
                            )}
                        </div>

                        {emergency && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                                    <div>
                                        <p className="text-red-700 font-medium">Emergency Request</p>
                                        <p className="text-red-600 text-sm">
                                            This request will be marked as high priority and immediately notified to all eligible donors in your area.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Patient Information */}
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-900">Patient Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Patient Name</label>
                                        <input
                                            type="text"
                                            name="patientName"
                                            required
                                            className="input"
                                            value={formData.patientName}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                                        <input
                                            type="number"
                                            name="age"
                                            required
                                            className="input"
                                            value={formData.age}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Blood Type Needed</label>
                                        <select
                                            name="bloodType"
                                            required
                                            className="input"
                                            value={formData.bloodType}
                                            onChange={handleInputChange}
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
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Units Required</label>
                                        <input
                                            type="number"
                                            name="units"
                                            required
                                            min="1"
                                            className="input"
                                            value={formData.units}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Location Information */}
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-900">Location Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Hospital Name</label>
                                        <input
                                            type="text"
                                            name="hospital"
                                            required
                                            className="input"
                                            value={formData.hospital}
                                            onChange={handleInputChange}
                                        />
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
                                </div>
                            </div>

                            {/* Urgency Level - Only show if not emergency */}
                            {!emergency && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-semibold text-gray-900">Urgency Level</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => handleInputChange({ target: { name: 'urgency', value: 'normal' } })}
                                            className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 ${
                                                formData.urgency === 'normal'
                                                    ? 'border-green-500 bg-green-50'
                                                    : 'border-gray-200 hover:border-green-500'
                                            }`}
                                        >
                                            <Clock className="w-6 h-6 text-green-500" />
                                            <span className="font-medium">Normal</span>
                                            <span className="text-sm text-gray-500">Within 24 hours</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleInputChange({ target: { name: 'urgency', value: 'urgent' } })}
                                            className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 ${
                                                formData.urgency === 'urgent'
                                                    ? 'border-yellow-500 bg-yellow-50'
                                                    : 'border-gray-200 hover:border-yellow-500'
                                            }`}
                                        >
                                            <Clock className="w-6 h-6 text-yellow-500" />
                                            <span className="font-medium">Urgent</span>
                                            <span className="text-sm text-gray-500">Within 6 hours</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleInputChange({ target: { name: 'urgency', value: 'emergency' } })}
                                            className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 ${
                                                formData.urgency === 'emergency'
                                                    ? 'border-red-500 bg-red-50'
                                                    : 'border-gray-200 hover:border-red-500'
                                            }`}
                                        >
                                            <AlertCircle className="w-6 h-6 text-red-500" />
                                            <span className="font-medium">Emergency</span>
                                            <span className="text-sm text-gray-500">Immediate need</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Contact Information */}
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                                        <input
                                            type="tel"
                                            name="contactNumber"
                                            required
                                            className="input"
                                            value={formData.contactNumber}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Additional Information */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Information</label>
                                <textarea
                                    name="additionalInfo"
                                    rows="4"
                                    className="input"
                                    value={formData.additionalInfo}
                                    onChange={handleInputChange}
                                    placeholder="Any additional details that might be helpful..."
                                ></textarea>
                            </div>

                            {/* Submit Button */}
                            <div className="flex flex-col items-center gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.95 }}
                                    type="submit"
                                    className={`w-full max-w-md px-8 py-4 rounded-full font-semibold text-white ${
                                        emergency
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-blue-600 hover:bg-blue-700'
                                    } transition-colors flex items-center justify-center gap-2`}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            {emergency ? 'Submit Emergency Request' : 'Submit Request'}
                                            {emergency && <AlertCircle className="w-5 h-5" />}
                                        </>
                                    )}
                                </motion.button>
                                <p className="text-sm text-gray-500 text-center">
                                    {emergency
                                        ? 'Your emergency request will be immediately notified to nearby donors'
                                        : 'You will be notified when donors respond to your request'}
                                </p>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </div>
        </>
    );
};

export default RequestForm;
