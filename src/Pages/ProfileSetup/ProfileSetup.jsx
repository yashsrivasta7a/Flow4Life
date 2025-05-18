import { useState, useEffect } from "react";
import { getDatabase, ref, update, get } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { toast } from "react-hot-toast";
import Navbar from '../../components/Navbar';
import { User, Mail, MapPin, Droplet, Calendar, FileText } from 'lucide-react';

const ProfileSetup = () => {
    const auth = getAuth();
    const db = getDatabase();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        bloodType: "",
        city: "",
        bio: "",
        lastDonation: "",
        status: "available",
    });
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // Fetch existing user data
                const userRef = ref(db, `users/${currentUser.uid}`);
                const donorRef = ref(db, `donation_requests/${currentUser.uid}`);
                
                try {
                    const [userSnapshot, donorSnapshot] = await Promise.all([
                        get(userRef),
                        get(donorRef)
                    ]);

                    const userData = userSnapshot.val() || {};
                    const donorData = donorSnapshot.val() || {};

                    setFormData({
                        name: userData.name || currentUser.displayName || "",
                        email: currentUser.email || "",
                        bloodType: userData.bloodType || donorData.bloodType || "",
                        city: userData.city || donorData.city || "",
                        bio: userData.bio || "",
                        lastDonation: userData.lastDonation || donorData.lastDonation || "",
                        status: userData.status || donorData.status || "available",
                    });
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    toast.error("Error loading user data");
                }
                setLoading(false);
            } else {
                navigate("/signin");
            }
        });

        return () => unsubscribe();
    }, [auth, navigate, db]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const updates = {};
            
            // Update user data
            updates[`users/${user.uid}`] = {
                ...formData,
                updatedAt: Date.now()
            };

            // Update donation request data
            updates[`donation_requests/${user.uid}`] = {
                userId: user.uid,
                name: formData.name,
                bloodType: formData.bloodType,
                city: formData.city,
                status: formData.status,
                lastDonation: formData.lastDonation,
                timestamp: Date.now()
            };

            await update(ref(db), updates);
            toast.success("Profile updated successfully!");
            navigate(`/profile/${user.uid}`);
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Error updating profile");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
            </div>
        );
    }

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
            <div className="min-h-screen bg-gray-50 py-8 pt-20">
                <div className="max-w-2xl mx-auto px-4">
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Email (read-only) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="email"
                                            value={formData.email}
                                            className="pl-10 w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
                                            disabled
                                        />
                                    </div>
                                </div>

                                {/* Blood Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
                                    <div className="relative">
                                        <Droplet className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <select
                                            name="bloodType"
                                            value={formData.bloodType}
                                            onChange={handleChange}
                                            className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            required
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
                                </div>

                                {/* City */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Last Donation Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Donation Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="date"
                                            name="lastDonation"
                                            value={formData.lastDonation}
                                            onChange={handleChange}
                                            className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                {/* Bio */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                                    <div className="relative">
                                        <FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                                        <textarea
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleChange}
                                            className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            rows="4"
                                            placeholder="Tell us about yourself..."
                                        />
                                    </div>
                                </div>

                                {/* Availability Status */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Availability Status</label>
                                    <div className="relative">
                                        <select
                                            name="status"
                                            value={formData.status}
                                            onChange={handleChange}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        >
                                            <option value="available">Available</option>
                                            <option value="unavailable">Unavailable</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-4">
                                <button
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProfileSetup;