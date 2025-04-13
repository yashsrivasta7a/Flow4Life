import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { Helix } from "ldrs/react";
import "ldrs/react/Helix.css";

const FindDonor = () => {
  const database = getDatabase();
  const navigate = useNavigate();
  const [donationRequests, setDonationRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userCity, setUserCity] = useState("Faridabad");

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(
              `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${"b3b3bbc277c2455fb37537202146f48e"}`
            );
            const data = await response.json();
            const city =
              data.results?.[0]?.components?.city ||
              data.results?.[0]?.components?.town;
            setUserCity(city || "Faridabad");
          } catch (error) {
            console.error("Error fetching geolocation data:", error);
            setUserCity("Faridabad");
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setUserCity("Faridabad");
        }
      );
    } else {
      setUserCity("Faridabad");
    }
  }, []);

  useEffect(() => {
    const donationRequestsRef = ref(database, "blood_requests");
    onValue(donationRequestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const requestsArray = Object.entries(data).map(([id, details]) => ({
          id,
          ...details,
        }));
        setDonationRequests(requestsArray);
      }
    });
  }, [database]);

  useEffect(() => {
    console.log("Donation Requests:", donationRequests);
    console.log("User City:", userCity);
    console.log("Search Query:", searchQuery);

    const results = donationRequests.filter(
      (request) =>
        request.bloodGroupRequired &&
        request.bloodGroupRequired
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) &&
        request.city &&
        userCity &&
        request.city.toLowerCase() === userCity.toLowerCase()
    );
    setFilteredRequests(results);
    console.log(filteredRequests);
  }, [searchQuery, donationRequests, userCity]);

  return (
    <section className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <nav className="flex justify-between items-center bg-red-600 text-white p-4 rounded-xl shadow-md">
          <h1 className="text-3xl font-bold">Find Donors</h1>
          <button
            onClick={() => navigate("/")}
            className="bg-white text-red-600 px-4 py-2 rounded-md"
          >
            Home
          </button>
        </nav>

        {/* Search Bar */}
        <div className="mt-6 text-center">
          <input
            type="text"
            placeholder="Search by Blood Group..."
            className="p-3 w-full md:w-1/2 border border-gray-300 rounded-md shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Donor List */}
        <div className="mt-6 flex flex-wrap justify-center gap-6">
  {filteredRequests.length > 0 ? (
    filteredRequests.map((request) => (
      <div
        key={request.id}
        className="p-6 bg-white shadow-md rounded-lg hover:shadow-lg transition cursor-pointer w-full sm:w-[45%] md:w-[30%]"
        onClick={() => navigate(`/profile/${request.userId}`)}
      >
        <h3 className="text-lg font-bold text-gray-800">
          {request.fullName}
        </h3>

        <p className="text-red-600 font-semibold">
          Blood Group: {request.bloodGroupRequired}
        </p>
        <p className="text-gray-500">City: {request.city}</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/chat/${request.id}`);
          }}
          className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md"
        >
          Chat with Donor
        </button>
      </div>
    ))
  ) : (
    <div className="w-full flex justify-center items-center min-h-[200px]">
      <Helix size={65} speed={2.5} color="red" />
    </div>
  )}
</div>
      </div>
    </section>
  );
};

export default FindDonor;
