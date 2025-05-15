import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Label } from '@radix-ui/react-label';
import { getDatabase, ref, push, serverTimestamp } from "firebase/database";
import { auth } from "../../Utils/Firebase.jsx";
import Navbar from '../../components/Navbar';

const RequestForm = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const onSubmit = async (data) => {
        setLoading(true);

        const userId = auth?.currentUser?.uid;
        if (!userId) {
            alert("You must be signed in to request blood.");
            setLoading(false);
            return;
        }

        const db = getDatabase();
        const requestRef = ref(db, "blood_requests");

        const requestData = {
            userId,
            fullName: data.fullName,
            email: data.email,
            number: data.number,
            bloodGroupRequired: data.bloodGroupRequired,
            urgency: data.urgency,
            dateNeeded: data.dateNeeded,
            state: data.state,
            city: data.city,
            zipcode: data.zipcode,
            hospitalName: data.hospitalName,
            reason: data.reason || "Not specified",
            additionalMessage: data.addmsg || "No additional message",
            status: "pending",
            requestTime: serverTimestamp(),
        };

        try {
            await push(requestRef, requestData);
            alert("Blood request submitted successfully!");
        } catch (error) {
            console.error("Error submitting request:", error);
            alert("Failed to submit request.");
        } finally {
            setLoading(false);
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
            <div className="flex justify-center items-center bg-gray-100 p-4 min-h-screen ">
                <div className="bg-white shadow-xl rounded-2xl p-6 max-w-lg w-full 
                      transition transform hover:scale-105 duration-300 ease-in-out 
                      overflow-y-auto max-h-[80vh] custom-scrollbar">
                    <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">Blood Request Form</h2>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                        {/* Full Name */}
                        <div className="flex flex-col">
                            <Label htmlFor="fullName" className="block text-gray-700 font-medium mb-1">Full Name</Label>
                            <input
                                type="text"
                                id="fullName"
                                placeholder="Enter your full name"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 transition outline-none"
                                {...register('fullName', { required: 'Name is required' })}
                            />
                            {errors.fullName && <p className="text-sm text-red-500 mt-1">{errors.fullName.message}</p>}
                        </div>

                        {/* Email */}
                        <div className="flex flex-col">
                            <Label htmlFor="email" className="block text-gray-700 font-medium mb-1">Email</Label>
                            <input
                                type="email"
                                id="email"
                                placeholder="Enter your email"
                                className="border border-gray-300 p-2 rounded-md focus:ring focus:ring-blue-300"
                                {...register('email', { required: 'Email is required' })}
                            />
                            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
                        </div>

                        {/* Mobile Number */}
                        <div className="flex flex-col">
                            <Label htmlFor="number" className="block text-gray-700 font-medium mb-1">Mobile Number</Label>
                            <input
                                type="text"
                                id="number"
                                placeholder="Enter your number"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 transition outline-none"
                                {...register("number", {
                                    required: "Mobile number is required",
                                    pattern: { value: /^[0-9]{10}$/, message: "Enter a valid 10-digit mobile number" }
                                })}
                            />
                            {errors.number && <p className="text-sm text-red-500 mt-1">{errors.number.message}</p>}
                        </div>

                        {/* Blood Group */}
                        <div className="flex flex-col">
                            <Label htmlFor="bloodGroupRequired" className="block text-gray-700 font-medium mb-1">Blood Group Required</Label>
                            <select
                                id="bloodGroupRequired"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 transition outline-none"
                                {...register('bloodGroupRequired', { required: 'Blood Group is required' })}
                            >
                                <option value="">-- Select Blood Group --</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                            </select>
                            {errors.bloodGroupRequired && <p className="text-sm text-red-500 mt-1">{errors.bloodGroupRequired.message}</p>}
                        </div>

                        {/* Urgency Level */}
                        <div className="flex flex-col">
                            <Label htmlFor="urgency" className="block text-gray-700 font-medium mb-1">Urgency Level</Label>
                            <select
                                id="urgency"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 transition outline-none"
                                {...register('urgency', { required: 'Urgency level is required' })}
                            >
                                <option value="">-- Select Urgency --</option>
                                <option value="Emergency">Emergency</option>
                                <option value="24_hours">Within 24 Hours</option>
                                <option value="week">Within a week</option>
                            </select>
                            {errors.urgency && <p className="text-sm text-red-500 mt-1">{errors.urgency.message}</p>}
                        </div>

                        {/* Date needed */}
                        <div className="flex flex-col">
                            <Label htmlFor="dateNeeded" className="block text-gray-700 font-medium mb-1">Required Date </Label>
                            <input
                                type="date"
                                id="dateneeded"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 transition outline-none"
                                {...register('dateNeeded', { required: "Date is required" })}
                            />
                            {errors.dateNeeded && <p className="text-sm text-red-500 mt-1">{errors.dateNeeded.message}</p>}
                        </div>


                        {/* Location Fields */}
                        <div className="flex flex-col">
                            <Label htmlFor="state" className="block text-gray-700 font-medium mb-1">State</Label>
                            <input
                                type="text"
                                id="state"
                                placeholder="Enter your state"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 transition outline-none"
                                {...register("state", { required: "State is required" })}
                            />
                            {errors.state && <p className="text-sm text-red-500 mt-1">{errors.state.message}</p>}
                        </div>

                        <div className="flex flex-col">
                            <Label htmlFor="city" className="block text-gray-700 font-medium mb-1">City</Label>
                            <input
                                type="text"
                                id="city"
                                placeholder="Enter your city"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 transition outline-none"
                                {...register("city", { required: "City is required" })}
                            />
                            {errors.city && <p className="text-sm text-red-500 mt-1">{errors.city.message}</p>}
                        </div>

                        {/* ZipCode */}
                        <div className="flex flex-col">
                            <Label htmlFor="zipcode" className="block text-gray-700 font-medium mb-1">Zipcode</Label>
                            <input
                                type="number"
                                id="zipcode"
                                placeholder="Enter your zipcode"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 transition outline-none"
                                {...register('zipcode', { required: 'Zipcode is required' })}
                            />
                            {errors.zipcode && <p className="text-sm text-red-500 mt-1">{errors.zipcode.message}</p>}
                        </div>



                        {/* Hospital Name */}
                        <div className="flex flex-col">
                            <Label htmlFor="hospitalName" className="block text-gray-700 font-medium mb-1">Hospital Name</Label>
                            <input
                                type="text"
                                id="hospitalName"
                                placeholder="Enter hospital name"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 transition outline-none"
                                {...register("hospitalName", { required: "Hospital name is required" })}
                            />
                            {errors.hospitalName && <p className="text-sm text-red-500 mt-1">{errors.hospitalName.message}</p>}
                        </div>

                        {/* Reason */}
                        <div className="flex flex-col">
                            <Label htmlFor="reason" className="block text-gray-700 font-medium mb-1">Reason (e.g., Accident case, Surgery)</Label>
                            <textarea
                                id="reason"
                                placeholder="Enter your reason"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 transition outline-none"
                                {...register("reason", { required: "Reason is required" })}
                            />
                            {errors.reason && <p className="text-sm text-red-500 mt-1">{errors.reason.message}</p>}
                        </div>

                        {/* Additional Message */}
                        <div className="flex flex-col">
                            <Label htmlFor="addmsg" className="block text-gray-700 font-medium mb-1">Additional Message (Optional)</Label>
                            <textarea
                                id="addmsg"
                                placeholder="Any additional information"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 transition outline-none"
                                {...register("addmsg")}
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-center">
                            <button
                                type="submit"
                                className="bg-red-500 text-white font-semibold px-6 py-3 rounded-full hover:bg-red-600  shadow-lg disabled:opacity-50  transition duration-200 ease-in-out transform hover:scale-105 "
                                disabled={loading}
                            >
                                {loading ? "Submitting..." : "Submit Request"}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </>
    );
};

export default RequestForm;
