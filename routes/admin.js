const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const { strictLimiter } = require('../middleware/security');

// Get recent activity
router.get('/recent-activity', 
  strictLimiter,
  authenticateToken,
  authorize('super_admin', 'office_executive', 'hr_manager'),
  async (req, res) => {
    try {
      // Mock data for now - implement actual activity logging later
      const activities = [
        {
          id: 1,
          action: 'New contact form submitted',
          user: 'System',
          time: '2 minutes ago',
          type: 'contact',
          timestamp: new Date(Date.now() - 2 * 60 * 1000)
        },
        {
          id: 2,
          action: 'Media article published',
          user: req.user.firstName + ' ' + req.user.lastName,
          time: '15 minutes ago',
          type: 'media',
          timestamp: new Date(Date.now() - 15 * 60 * 1000)
        },
        {
          id: 3,
          action: 'Publication updated',
          user: 'Editor',
          time: '1 hour ago',
          type: 'publication',
          timestamp: new Date(Date.now() - 60 * 60 * 1000)
        }
      ];

      res.json({
        success: true,
        data: {
          activities,
          total: activities.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent activity'
      });
    }
  }
);

// Get system status
router.get('/system-status',
  strictLimiter,
  authenticateToken,
  authorize('super_admin', 'office_executive', 'hr_manager'),
  async (req, res) => {
    try {
      const services = [
        {
          name: 'API Server',
          status: 'Operational',
          uptime: '99.9%',
          color: 'green',
          responseTime: Math.floor(Math.random() * 50) + 20 + 'ms'
        },
        {
          name: 'Database',
          status: 'Operational',
          uptime: '99.8%',
          color: 'green',
          responseTime: Math.floor(Math.random() * 20) + 5 + 'ms'
        },
        {
          name: 'File Storage',
          status: 'Operational',
          uptime: '100%',
          color: 'green',
          responseTime: Math.floor(Math.random() * 30) + 15 + 'ms'
        },
        {
          name: 'Email Service',
          status: Math.random() > 0.8 ? 'Degraded' : 'Operational',
          uptime: '95.2%',
          color: Math.random() > 0.8 ? 'yellow' : 'green',
          responseTime: Math.floor(Math.random() * 200) + 50 + 'ms'
        }
      ];

      res.json({
        success: true,
        data: {
          services,
          overallStatus: services.every(s => s.status === 'Operational') ? 'Healthy' : 'Degraded'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system status'
      });
    }
  }
);

// Get performance metrics
router.get('/performance-metrics',
  strictLimiter,
  authenticateToken,
  authorize('super_admin', 'office_executive', 'hr_manager'),
  async (req, res) => {
    try {
      const metrics = {
        contentViews: {
          total: Math.floor(Math.random() * 20000) + 10000,
          change: '+' + Math.floor(Math.random() * 20) + '%',
          trend: 'up'
        },
        userEngagement: {
          total: Math.floor(Math.random() * 10) + 5,
          change: '+' + Math.floor(Math.random() * 10) + '%',
          trend: 'up'
        },
        systemLoad: {
          total: Math.floor(Math.random() * 50) + 30,
          change: '-' + Math.floor(Math.random() * 10) + '%',
          trend: 'down'
        },
        errorRate: {
          total: Math.random().toFixed(1),
          change: '-' + Math.floor(Math.random() * 20) + '%',
          trend: 'down'
        }
      };

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch performance metrics'
      });
    }
  }
);

// Get notifications
router.get('/notifications',
  strictLimiter,
  authenticateToken,
  authorize('super_admin', 'office_executive', 'hr_manager'),
  async (req, res) => {
    try {
      const notifications = [
        {
          id: 1,
          type: 'contact',
          title: 'New Contact Form Submission',
          message: 'A new contact form has been submitted',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          read: false,
          priority: 'high'
        },
        {
          id: 2,
          type: 'system',
          title: 'System Update Available',
          message: 'A new system update is available for installation',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          read: false,
          priority: 'medium'
        }
      ];

      const unreadCount = notifications.filter(n => !n.read).length;

      res.json({
        success: true,
        data: {
          notifications,
          unreadCount,
          total: notifications.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications'
      });
    }
  }
);

// Mark notification as read
router.patch('/notifications/:id/read',
  strictLimiter,
  authenticateToken,
  authorize('super_admin', 'office_executive', 'hr_manager'),
  async (req, res) => {
    try {
      // In a real implementation, update the notification in the database
      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read'
      });
    }
  }
);

// Mark all notifications as read
router.patch('/notifications/mark-all-read',
  strictLimiter,
  authenticateToken,
  authorize('super_admin', 'office_executive', 'hr_manager'),
  async (req, res) => {
    try {
      // In a real implementation, update all notifications in the database
      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to mark all notifications as read'
      });
    }
  }
);

// Get real-time stats
router.get('/real-time-stats',
  strictLimiter,
  authenticateToken,
  authorize('super_admin', 'office_executive', 'hr_manager'),
  async (req, res) => {
    try {
      const stats = {
        activeUsers: Math.floor(Math.random() * 50) + 10,
        pendingActions: Math.floor(Math.random() * 10),
        systemAlerts: [],
        recentSubmissions: Math.floor(Math.random() * 20) + 5
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch real-time stats'
      });
    }
  }
);

module.exports = router;