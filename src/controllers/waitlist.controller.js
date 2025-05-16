const Waitlist = require('../models/waitlist.model');

/**
 * Add a new email to the waitlist
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.addToWaitlist = async (req, res) => {
  try {
    const { email, firstName, lastName, phone, interests, referralSource, additionalInfo } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if email already exists in waitlist
    const existingEntry = await Waitlist.findOne({ email });
    if (existingEntry) {
      return res.status(409).json({ 
        success: false, 
        message: 'Email already exists in waitlist',
        status: existingEntry.status
      });
    }

    // Create new waitlist entry
    const waitlistEntry = new Waitlist({
      email,
      firstName,
      lastName,
      phone,
      interests,
      referralSource,
      additionalInfo
    });

    await waitlistEntry.save();

    res.status(201).json({
      success: true,
      message: 'Successfully added to waitlist',
      data: {
        id: waitlistEntry._id,
        email: waitlistEntry.email,
        status: waitlistEntry.status,
        createdAt: waitlistEntry.createdAt
      }
    });
  } catch (error) {
    console.error('Waitlist addition error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to waitlist',
      error: error.message
    });
  }
};

/**
 * Get all waitlist entries (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllWaitlistEntries = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const queryOptions = {};
    if (status) {
      queryOptions.status = status;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const waitlistEntries = await Waitlist.find(queryOptions)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalEntries = await Waitlist.countDocuments(queryOptions);
    
    res.status(200).json({
      success: true,
      count: waitlistEntries.length,
      total: totalEntries,
      totalPages: Math.ceil(totalEntries / parseInt(limit)),
      currentPage: parseInt(page),
      data: waitlistEntries
    });
  } catch (error) {
    console.error('Get waitlist entries error:', error);
    res.status(500).json({
      success: false,  
      message: 'Failed to retrieve waitlist entries',
      error: error.message
    });
  }
};

/**
 * Update waitlist entry status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateWaitlistStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'contacted', 'invited', 'registered'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be one of: pending, contacted, invited, registered' 
      });
    }
    
    const updateData = { status };
    
    // If status is 'invited', set invitedAt to current date
    if (status === 'invited') {
      updateData.invitedAt = new Date();
    }
    
    const updatedEntry = await Waitlist.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!updatedEntry) {
      return res.status(404).json({
        success: false,
        message: 'Waitlist entry not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Waitlist status updated successfully',
      data: updatedEntry
    });
  } catch (error) {
    console.error('Update waitlist status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update waitlist status',
      error: error.message
    });
  }
};

/**
 * Delete waitlist entry
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteWaitlistEntry = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedEntry = await Waitlist.findByIdAndDelete(id);
    
    if (!deletedEntry) {
      return res.status(404).json({
        success: false,
        message: 'Waitlist entry not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Waitlist entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete waitlist entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete waitlist entry',
      error: error.message
    });
  }
};

/**
 * Check waitlist status by email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.checkWaitlistStatus = async (req, res) => {
  try {
    const { email } = req.params;
    
    const waitlistEntry = await Waitlist.findOne({ email });
    
    if (!waitlistEntry) {
      return res.status(404).json({
        success: false,
        message: 'Email not found in waitlist'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        email: waitlistEntry.email,
        status: waitlistEntry.status,
        joinedAt: waitlistEntry.createdAt,
        invitedAt: waitlistEntry.invitedAt
      }
    });
  } catch (error) {
    console.error('Check waitlist status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check waitlist status',
      error: error.message
    });
  }
};