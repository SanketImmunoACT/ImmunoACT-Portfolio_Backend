const { Op } = require('sequelize');
const Hospital = require('../models/Hospital');
const geocodingService = require('../services/geocodingService');
const logger = require('../config/logger');

class HospitalController {
  /**
   * Search hospitals by location and radius
   */
  async searchByLocation(req, res) {
    try {
      const { 
        location, 
        radius = 50, 
        limit = 20, 
        services = [] 
      } = req.query;

      // Validate required parameters
      if (!location) {
        return res.status(400).json({
          success: false,
          message: 'Location parameter is required'
        });
      }

      const radiusKm = parseFloat(radius);
      if (isNaN(radiusKm) || radiusKm <= 0 || radiusKm > 1500) {
        return res.status(400).json({
          success: false,
          message: 'Radius must be a number between 1 and 1500 km'
        });
      }

      // Geocode the search location
      let searchCoords;
      try {
        searchCoords = await geocodingService.geocodeAddress(location);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Could not find the specified location. Please check the address and try again.',
          error: error.message
        });
      }

      // Get bounding box for efficient database query
      const boundingBox = geocodingService.getBoundingBox(
        searchCoords.latitude, 
        searchCoords.longitude, 
        radiusKm
      );

      // Build query conditions
      const whereConditions = {
        isActive: true,
        latitude: {
          [Op.between]: [boundingBox.minLat, boundingBox.maxLat]
        },
        longitude: {
          [Op.between]: [boundingBox.minLon, boundingBox.maxLon]
        }
      };

      // Add services filter if provided
      if (services.length > 0) {
        // Services field has been removed, so we'll ignore this filter
        // This maintains backward compatibility
      }

      // Fetch hospitals from database
      const hospitals = await Hospital.findAll({
        where: whereConditions,
        limit: parseInt(limit) || 20
      });

      // Calculate distances and filter by exact radius
      const hospitalsWithDistance = geocodingService.findHospitalsInRadius(
        searchCoords.latitude,
        searchCoords.longitude,
        radiusKm,
        hospitals
      );

      // Prepare response
      const response = {
        success: true,
        data: {
          searchLocation: {
            address: searchCoords.formattedAddress,
            latitude: searchCoords.latitude,
            longitude: searchCoords.longitude
          },
          radius: radiusKm,
          totalFound: hospitalsWithDistance.length,
          hospitals: hospitalsWithDistance
        }
      };

      // Add warning message if no hospitals found
      if (hospitalsWithDistance.length === 0) {
        response.message = `No hospitals found within ${radiusKm}km radius of ${location}. Please try expanding your search radius or searching for a different location.`;
      }

      // Set cache control headers to prevent caching of search results
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json(response);

    } catch (error) {
      logger.error('Hospital search error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while searching for hospitals',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get all hospitals (with optional filters)
   */
  async getAllHospitals(req, res) {
    try {
      const { 
        city, 
        state, 
        type,
        search,
        services, 
        page = 1,
        limit = 10,
        sortBy,
        sortOrder
      } = req.query;

      const whereConditions = { isActive: true };
      const offset = (parseInt(page) - 1) * parseInt(limit);

      if (city) {
        whereConditions.city = {
          [Op.like]: `%${city}%`
        };
      }

      if (state) {
        whereConditions.state = {
          [Op.like]: `%${state}%`
        };
      }

      if (type) {
        whereConditions.type = type;
      }

      if (search) {
        whereConditions[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { city: { [Op.like]: `%${search}%` } },
          { address: { [Op.like]: `%${search}%` } }
        ];
      }

      // Add services filter if provided
      if (services) {
        // Services field has been removed, so we'll ignore this filter
        // This maintains backward compatibility
      }

      // Build order clause
      let order = [['name', 'ASC']]; // Default sorting
      if (sortBy && sortOrder) {
        const validSortFields = ['name', 'city', 'state', 'type', 'createdAt'];
        const validSortOrders = ['asc', 'desc'];
        
        if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toLowerCase())) {
          order = [[sortBy, sortOrder.toUpperCase()]];
        }
      }

      const hospitals = await Hospital.findAndCountAll({
        where: whereConditions,
        limit: parseInt(limit),
        offset: offset,
        order: order
      });

      const totalPages = Math.ceil(hospitals.count / parseInt(limit));
      const currentPage = parseInt(page);

      res.json({
        success: true,
        data: {
          hospitals: hospitals.rows,
          total: hospitals.count,
          currentPage: currentPage,
          totalPages: totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      logger.error('Get hospitals error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching hospitals'
      });
    }
  }

  /**
   * Get hospital by ID
   */
  async getHospitalById(req, res) {
    try {
      const { id } = req.params;

      const hospital = await Hospital.findOne({
        where: { 
          id: id,
          isActive: true 
        }
      });

      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: 'Hospital not found'
        });
      }

      res.json({
        success: true,
        data: hospital
      });

    } catch (error) {
      logger.error('Get hospital by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching hospital details'
      });
    }
  }

  /**
   * Create new hospital (admin only)
   */
  async createHospital(req, res) {
    try {
      const hospitalData = req.body;

      // Geocode the address if coordinates not provided
      if (!hospitalData.latitude || !hospitalData.longitude) {
        const fullAddress = `${hospitalData.address}, ${hospitalData.city}, ${hospitalData.state}, ${hospitalData.country || 'India'}`;
        
        try {
          const coords = await geocodingService.geocodeAddress(fullAddress);
          hospitalData.latitude = coords.latitude;
          hospitalData.longitude = coords.longitude;
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Could not geocode the provided address. Please provide valid latitude and longitude coordinates.'
          });
        }
      }

      const hospital = await Hospital.create(hospitalData);

      res.status(201).json({
        success: true,
        message: 'Hospital created successfully',
        data: hospital
      });

    } catch (error) {
      logger.error('Create hospital error:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map(err => ({
            field: err.path,
            message: err.message
          }))
        });
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while creating the hospital'
      });
    }
  }

  /**
   * Update hospital (admin only)
   */
  async updateHospital(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const hospital = await Hospital.findByPk(id);
      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: 'Hospital not found'
        });
      }

      // Re-geocode if address changed
      if (updateData.address || updateData.city || updateData.state) {
        const fullAddress = `${updateData.address || hospital.address}, ${updateData.city || hospital.city}, ${updateData.state || hospital.state}, ${updateData.country || hospital.country}`;
        
        try {
          const coords = await geocodingService.geocodeAddress(fullAddress);
          updateData.latitude = coords.latitude;
          updateData.longitude = coords.longitude;
        } catch (error) {
          logger.warn('Could not re-geocode updated address:', error);
        }
      }

      await hospital.update(updateData);

      res.json({
        success: true,
        message: 'Hospital updated successfully',
        data: hospital
      });

    } catch (error) {
      logger.error('Update hospital error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while updating the hospital'
      });
    }
  }

  /**
   * Delete hospital (admin only) - Soft Delete
   */
  async deleteHospital(req, res) {
    try {
      const { id } = req.params;
      const { permanent = false } = req.query; // Allow permanent delete via query param

      const hospital = await Hospital.findByPk(id);
      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: 'Hospital not found'
        });
      }

      if (permanent === 'true') {
        // Hard delete - only for super admins with explicit confirmation
        await hospital.destroy();
        
        // Log the permanent deletion for audit
        logger.warn('Hospital permanently deleted', {
          hospitalId: id,
          hospitalName: hospital.name,
          deletedBy: req.user?.username || 'unknown',
          ip: req.ip,
          timestamp: new Date().toISOString()
        });

        res.json({
          success: true,
          message: 'Hospital permanently deleted from database'
        });
      } else {
        // Soft delete - default behavior
        await hospital.update({ 
          isActive: false,
          deletedAt: new Date() // Add deletion timestamp
        });

        // Log the soft deletion for audit
        logger.info('Hospital soft deleted', {
          hospitalId: id,
          hospitalName: hospital.name,
          deletedBy: req.user?.username || 'unknown',
          ip: req.ip,
          timestamp: new Date().toISOString()
        });

        res.json({
          success: true,
          message: 'Hospital deleted successfully (can be restored)'
        });
      }

    } catch (error) {
      logger.error('Delete hospital error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while deleting the hospital'
      });
    }
  }

  /**
   * Restore deleted hospital (admin only)
   */
  async restoreHospital(req, res) {
    try {
      const { id } = req.params;

      const hospital = await Hospital.findByPk(id);
      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: 'Hospital not found'
        });
      }

      if (hospital.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Hospital is already active'
        });
      }

      await hospital.update({ 
        isActive: true,
        deletedAt: null 
      });

      // Log the restoration for audit
      logger.info('Hospital restored', {
        hospitalId: id,
        hospitalName: hospital.name,
        restoredBy: req.user?.username || 'unknown',
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Hospital restored successfully',
        data: hospital
      });

    } catch (error) {
      logger.error('Restore hospital error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while restoring the hospital'
      });
    }
  }

  /**
   * Get deleted hospitals (admin only)
   */
  async getDeletedHospitals(req, res) {
    try {
      const { 
        page = 1,
        limit = 10
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const hospitals = await Hospital.findAndCountAll({
        where: { isActive: false },
        limit: parseInt(limit),
        offset: offset,
        order: [['updatedAt', 'DESC']]
      });

      const totalPages = Math.ceil(hospitals.count / parseInt(limit));
      const currentPage = parseInt(page);

      res.json({
        success: true,
        data: {
          hospitals: hospitals.rows,
          total: hospitals.count,
          currentPage: currentPage,
          totalPages: totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      logger.error('Get deleted hospitals error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching deleted hospitals'
      });
    }
  }

  /**
   * Get hospital statistics (admin only)
   */
  async getHospitalStats(req, res) {
    try {
      let totalHospitals = 0;
      let privateHospitals = 0;
      let governmentHospitals = 0;
      let debugInfo = {};

      try {
        // Get all hospitals for debugging
        const allHospitals = await Hospital.findAll({
          attributes: ['id', 'name', 'type', 'isActive']
        });
        
        debugInfo.allHospitals = allHospitals;
        debugInfo.totalInDb = allHospitals.length;
        debugInfo.activeInDb = allHospitals.filter(h => h.isActive).length;
        debugInfo.inactiveInDb = allHospitals.filter(h => !h.isActive).length;

        totalHospitals = await Hospital.count({
          where: { isActive: true }
        });

        privateHospitals = await Hospital.count({
          where: { 
            isActive: true,
            type: 'Private'
          }
        });

        governmentHospitals = await Hospital.count({
          where: { 
            isActive: true,
            type: 'Government'
          }
        });

        debugInfo.queries = {
          totalHospitals,
          privateHospitals,
          governmentHospitals
        };

      } catch (dbError) {
        logger.warn('Database error in hospital stats, using fallback data:', dbError.message);
        debugInfo.error = dbError.message;
        // Use fallback data if database queries fail
        totalHospitals = 0;
        privateHospitals = 0;
        governmentHospitals = 0;
      }

      res.json({
        success: true,
        data: {
          totalHospitals,
          privateHospitals,
          governmentHospitals
        },
        debug: process.env.NODE_ENV === 'development' ? debugInfo : undefined
      });

    } catch (error) {
      logger.error('Get hospital stats error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching hospital statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new HospitalController();