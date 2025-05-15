import React, { useEffect, useState } from 'react';
import { getAuth } from "firebase/auth";
import { useForm } from 'react-hook-form';
import { Label } from '@radix-ui/react-label';
import { getDatabase, ref, push, serverTimestamp } from "firebase/database";
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';

const BloodDonationForm = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState({ lng: 0, lat: 0 });
  const [address, setAddress] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lng: position.coords.longitude,
            lat: position.coords.latitude,
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
    }
  }, []);

  useEffect(() => {
    async function fetchLocation(lat, lng) {
      if (!lat || !lng) return;

      try {
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${"b3b3bbc277c2455fb37537202146f48e"}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch location data");

        const data = await res.json();
        if (data.results.length > 0) {
          const result = data.results[0].components;
          setAddress({
            state: result.state,
            city: result.city || result.town || result.village,
            zipcode: result.postcode,
            country: result.country
          });
        }
      } catch (error) {
        console.error("Error fetching location:", error);
      }
    }

    if (location.lat && location.lng) {
      fetchLocation(location.lat, location.lng);
    }
  }, [location.lat, location.lng]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const onSubmit = async (data) => {
    setLoading(true);
    const userId = auth?.currentUser?.uid;
    if (!userId) {
      alert("You must be signed in to request blood.");
      setLoading(false);
      return;
    }

    const db = getDatabase();
    const requestRef = ref(db, "donation_requests");

    const requestData = {
      userId,
      fullName: user.displayName,
      email: user.email,
      number: data.number,
      bloodGroup: data.bloodGroup,
      weight: data.weight,
      dateoflastdonation: data.dold,
      state: address?.state,
      city: address?.city,
      zipcode: address?.zipcode,
      address: data.address || "Not Provided",
      consent: data.consent,
      requestTime: serverTimestamp(),
    };

    try {
      await push(requestRef, requestData);
      // alert("Blood request submitted successfully!");
      navigate("/");
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
      <div className="flex justify-center items-center bg-gray-100 p-4 min-h-screen">
        <div className="bg-white shadow-xl rounded-2xl p-6 max-w-lg w-full transition transform hover:scale-105 duration-300 ease-in-out overflow-y-auto max-h-[80vh] custom-scrollbar">
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">Blood Donation Form</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col">
              <Label htmlFor="fullName" className="block text-gray-700 font-medium mb-1">
                Full Name
              </Label>
              <p>{user?.displayName}</p>
            </div>
            <div className="flex flex-col">
              <Label className="block text-gray-700 font-medium mb-1">
                Email
              </Label>
              <p>{user?.email}</p>
            </div>
            <div className="flex flex-col">
              <Label htmlFor="mobile" className="block text-gray-700 font-medium mb-1">
                Mobile Number
              </Label>
              <input
                type="text"
                id="number"
                placeholder="Enter your number"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 transition outline-none"
                {...register("number", {
                  required: "Mobile number is required",
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: "Enter a valid 10-digit mobile number",
                  },
                })}
              />
              {errors.number && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.number.message}
                </p>
              )}
            </div>
            <div className="flex flex-col">
              <Label htmlFor="bloodGroup" className="block text-gray-700 font-medium mb-1">
                Blood Group
              </Label>
              <select
                id="bloodGroup"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 transition outline-none"
                {...register('bloodGroup', { required: 'Blood Group is required' })}
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
              {errors.bloodGroup && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.bloodGroup.message}
                </p>
              )}
            </div>
            <div className="flex flex-col">
              <Label htmlFor="weight" className="block text-gray-700 font-medium mb-1">
                Weight
              </Label>
              <input
                type="number"
                id="weight"
                placeholder='Enter your Weight in Kgs'
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 transition outline-none"
                {...register('weight', { required: 'Weight is required' })}
              />
              {errors.weight && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.weight.message}
                </p>
              )}
            </div>
            <div className="flex flex-col">
              <Label htmlFor="dold" className="block text-gray-700 font-medium mb-1">
                Date of Last Donation
              </Label>
              <input
                type="date"
                id="dold"
                placeholder='Enter your Last Donation Date'
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 transition outline-none"
                {...register('dold')}
              />
            </div>
            <div className="flex flex-col">
              <Label className="block text-gray-700 font-medium mb-1">
                City : {address?.city}
              </Label>
              <Label className="block text-gray-700 font-medium mb-1">
                State : {address?.state}
              </Label>
              <Label className="block text-gray-700 font-medium mb-1">
                Pincode : {address?.zipcode}
              </Label>
              <Label className="block text-gray-700 font-medium mb-1">
                Country : {address?.country}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4 border border-gray-300 rounded-full"
                {...register("consent", { required: "You must agree before submitting" })}
              />
              <label className="text-sm text-gray-700">
                I agree to donate my blood and confirm that the provided information is accurate.
              </label>
            </div>
            {errors.consent && <p className="text-red-500 text-sm">{errors.consent.message}</p>}
            <div className="flex justify-center">
              <button
                type="submit"
                className="bg-red-500 text-white font-semibold px-6 py-3 rounded-full hover:bg-red-600 shadow-lg disabled:opacity-50 transition duration-200 ease-in-out transform hover:scale-105"
                disabled={loading}
              >
                {loading ? "Submitting..." : "Donate Blood"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default BloodDonationForm;