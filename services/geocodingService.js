const axios = require('axios');
const logger = require('../config/logger');

class GeocodingService {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
  }

  /**
   * Convert address to coordinates using Google Geocoding API
   * @param {string} address - Full address or city name
   * @returns {Promise<Object>} - {latitude, longitude, formattedAddress}
   */
  async geocodeAddress(address) {
    try {
      if (!this.googleApiKey) {
        throw new Error('Google Maps API key not configured');
      }

      const response = await axios.get(this.baseUrl, {
        params: {
          address: address,
          key: this.googleApiKey,
          region: 'in' // Bias results to India
        }
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Geocoding failed: ${response.data.status}`);
      }

      const result = response.data.results[0];
      const location = result.geometry.location;

      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address,
        addressComponents: result.address_components
      };
    } catch (error) {
      logger.error('Geocoding error:', error);
      throw new Error('Failed to geocode address');
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Latitude of first point
   * @param {number} lon1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lon2 - Longitude of second point
   * @returns {number} - Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees 
   * @returns {number}
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Find hospitals within radius of a location
   * @param {number} centerLat - Center latitude
   * @param {number} centerLon - Center longitude
   * @param {number} radiusKm - Radius in kilometers
   * @param {Array} hospitals - Array of hospital objects with lat/lon
   * @returns {Array} - Hospitals within radius with distance
   */
  findHospitalsInRadius(centerLat, centerLon, radiusKm, hospitals) {
    return hospitals
      .map(hospital => {
        const distance = this.calculateDistance(
          centerLat, 
          centerLon, 
          parseFloat(hospital.latitude), 
          parseFloat(hospital.longitude)
        );
        
        return {
          ...hospital.toJSON(),
          distance: distance
        };
      })
      .filter(hospital => hospital.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get approximate bounding box for database query optimization
   * @param {number} lat - Center latitude
   * @param {number} lon - Center longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {Object} - {minLat, maxLat, minLon, maxLon}
   */
  getBoundingBox(lat, lon, radiusKm) {
    const latDelta = radiusKm / 111; // Approximate km per degree latitude
    const lonDelta = radiusKm / (111 * Math.cos(this.toRadians(lat))); // Adjust for longitude
    
    return {
      minLat: lat - latDelta,
      maxLat: lat + latDelta,
      minLon: lon - lonDelta,
      maxLon: lon + lonDelta
    };
  }
}

module.exports = new GeocodingService();