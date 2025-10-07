const express = require('express');
const router = express.Router();
const Problem = require('../models/Problem');

// Submit a new problem
router.post('/', async (req, res) => {
  try {
    const { name, contactNo, status, problem, field } = req.body;
    
    // Basic validation
    if (!name || !contactNo || !status || !problem || !field) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Create new problem
    const newProblem = new Problem({
      name,
      contactNo,
      status,
      problem,
      field
    });

    // Save to database
    const savedProblem = await newProblem.save();
    
    res.status(201).json({
      message: 'Problem submitted successfully',
      data: savedProblem
    });
  } catch (error) {
    console.error('Error submitting problem:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all problems
router.get('/', async (req, res) => {
  try {
    const { field, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build query
    const query = {};
    if (field) query.field = field;
    if (status) query.status = status;

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const problems = await Problem.find(query).sort(sort);
    
    res.json({
      count: problems.length,
      data: problems
    });
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single problem by ID
router.get('/:id', async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    res.json(problem);
  } catch (error) {
    console.error('Error fetching problem:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a problem
router.delete('/:id', async (req, res) => {
  try {
    const problem = await Problem.findByIdAndDelete(req.params.id);
    
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    res.json({ message: 'Problem deleted successfully' });
  } catch (error) {
    console.error('Error deleting problem:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
