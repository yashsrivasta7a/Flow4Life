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
  const [userCity, setUserCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterByCity, setFilterByCity] = useState(false);

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
            setUserCity(city || "");
          } catch (error) {
            console.error("Error fetching geolocation data:", error);
            setUserCity("");
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setUserCity("");
        }
      );
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
      setLoading(false);
    });
  }, [database]);

  useEffect(() => {
    // Filter based on search query and optionally by city
    const results = donationRequests.filter((request) => {
      // First check if the blood group matches the search query
      const bloodGroupMatches = 
        !searchQuery || 
        (request.bloodGroupRequired && 
         request.bloodGroupRequired.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Then check if we need to filter by city
      const cityMatches = 
        !filterByCity || 
        (request.city && 
         userCity && 
         request.city.toLowerCase() === userCity.toLowerCase());
      
      // Return true if both conditions are met
      return bloodGroupMatches && cityMatches;
    });
    
    console.log("Filtering results:", {
      totalRequests: donationRequests.length,
      filteredResults: results.length,
      filterByCity,
      userCity
    });
    
    setFilteredRequests(results);
  }, [searchQuery, donationRequests, userCity, filterByCity]);

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

        {/* Search and Filter Options */}
        <div className="mt-6 flex flex-col md:flex-row gap-4 items-center justify-center">
          <input
            type="text"
            placeholder="Search by Blood Group..."
            className="p-3 w-full md:w-1/2 border border-gray-300 rounded-md shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          {/* <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cityFilter"
              checked={filterByCity}
              onChange={() => setFilterByCity(!filterByCity)}
              className="h-4 w-4 text-red-600 border-gray-300 rounded"
            />
            <label htmlFor="cityFilter" className="text-gray-700">
              Show only in my city {userCity ? `(${userCity})` : ""}
            </label>
          </div> */}
        </div>

        {/* Donor List */}
        <div className="mt-6 flex flex-wrap justify-center gap-6">
          {loading ? (
            <div className="w-full flex justify-center items-center min-h-[200px]">
              <Helix size={65} speed={2.5} color="red" />
            </div>
          ) : filteredRequests.length > 0 ? (
            filteredRequests.map((request) => (
              <div
                key={request.id}
                className="p-6 bg-white shadow-md rounded-lg hover:shadow-lg transition cursor-pointer w-full sm:w-[45%] md:w-[30%]"
                onClick={() => navigate(`/chats`)}
              >
                <h3 className="text-lg font-bold text-gray-800">
                  {request.fullName}
                </h3>
                <p className="text-red-600 font-semibold">
                  Blood Group: {request.bloodGroupRequired}
                </p>
                <p className="text-gray-500">City: {request.city || "Not specified"}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/chats`);
                  }}
                  className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md"
                >
                  Chat with Donor
                </button>
              </div>
            ))
          ) : (
            <div className="w-full text-center py-10">
              <p className="text-gray-600 text-lg">
                No donation requests found matching your criteria.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default FindDonor;