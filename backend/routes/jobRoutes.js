const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const auth = require('../middleware/auth');

// @route   GET api/jobs/search
// @desc    Search for jobs
// @access  Private
router.get('/search', auth, jobController.searchJobs);

// @route   GET api/jobs/:id
// @desc    Get job details
// @access  Private
router.get('/:id', auth, jobController.getJobDetails);

module.exports = router;
