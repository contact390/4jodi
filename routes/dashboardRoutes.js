const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/stats', dashboardController.getDashboardStats);
router.get('/recent-users', dashboardController.getRecentRegistrations);
router.get('/trends', dashboardController.getRegistrationTrends);
router.get('/profiles', dashboardController.getAllProfiles);
router.get('/interests', dashboardController.getInterestsDashboard);
router.get('/membership-analytics', dashboardController.getMembershipAnalytics);

module.exports = router;