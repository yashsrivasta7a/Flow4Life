export const getCityFromCoordinates = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
      {
        headers: {
          'Accept-Language': 'en', // Get results in English
          'User-Agent': 'Flow4Life Blood Donation App' // Required by Nominatim's terms
        }
      }
    );
    const data = await response.json();
    
    if (data.address) {
      // Try to get the city name from different possible fields
      return data.address.city || 
             data.address.town || 
             data.address.village || 
             data.address.suburb ||
             data.address.municipality;
    }
    return null;
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    return null;
  }
}; 