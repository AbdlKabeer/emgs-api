// src/controllers/service.controller.js - continued
const Service = require('../models/service.model');
const User = require('../models/user.model');
const Inquiry = require('../models/inquiry.model');
const { successResponse, badRequestResponse, internalServerErrorResponse } = require('../utils/custom_response/responses');

const { sendWhatsAppMessage } = require('../services/whatsapp.service');
const { createDefaultServices } = require('../utils/dafaultServices');


// exports.getAllServices = async (req, res) => {
//   try {
//     const servicesByCategory = await Service.aggregate([
//       { $match: { isActive: true } },

//       // Join with the 'users' collection
//       {
//         $lookup: {
//           from: 'users',
//           localField: 'user',
//           foreignField: '_id',
//           as: 'user'
//         }
//       },

//       // Unwind to convert user array to object
//       { $unwind: '$user' },

//       // Optional: only include specific fields
//       {
//         $project: {
//           name: 1,
//           description: 1,
//           category: 1,
//           whatsappContact: 1,
//           price: 1,
//           isActive: 1,
//           autoResponderMessage: 1,
//           createdAt: 1,
//           updatedAt: 1,
          
//           // Only specific user fields
//           user: {
//             _id: 1,
//             fullName: 1,
//             profilePicture: 1
//           }
//         }
//       },

//       // Group by category
//       {
//         $group: {
//           _id: '$category',
//           services: { $push: '$$ROOT' }
//         }
//       },

//       // Sort by category
//       { $sort: { _id: 1 } }
//     ]);

//     return successResponse(servicesByCategory, res, 200, 'Success');
//   } catch (error) {
//     console.error('Error fetching and grouping services:', error);
//     return internalServerErrorResponse(error.message, res);
//   }
// };

exports.getAllServices = async (req, res) => {
  try {
    const userId = req.user?.id; // or req.user.id depending on your middleware
    let enrolledServices = [];

    if (userId) {
      const user = await User.findById(userId).select('enrolledServices');
      enrolledServices = user?.enrolledServices.map(id => id.toString()) || [];
    }

    const servicesByCategory = await Service.aggregate([
      { $match: { isActive: true } },

      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },

      {
        $project: {
          name: 1,
          description: 1,
          features: 1, // ✅ Added features field
          category: 1,
          whatsappContact: 1,
          price: 1,
          isActive: 1,
          autoResponderMessage: 1,
          createdAt: 1,
          updatedAt: 1,
          user: {
            _id: 1,
            fullName: 1,
            profilePicture: 1
          }
        }
      },

      {
        $group: {
          _id: '$category',
          services: { $push: '$$ROOT' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 🔥 Add isEnrolled flag
    const enhancedServicesByCategory = servicesByCategory.map(category => ({
      ...category,
      services: category.services.map(service => ({
        ...service,
        isEnrolled: enrolledServices.includes(service._id.toString())
      }))
    }));

    return successResponse(enhancedServicesByCategory, res, 200, 'Success');
  } catch (error) {
    console.error('Error fetching and grouping services:', error);
    return internalServerErrorResponse(error.message, res);
  }
};


exports.getAllServicesFlat = async (req, res) => {
  try {
    const services = await Service.aggregate([
      { $match: { isActive: true } },

      // Join with user info
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },

      // Optional projection
      {
        $project: {
          name: 1,
          description: 1,
          category: 1,
          whatsappContact: 1,
          price: 1,
          isActive: 1,
          autoResponderMessage: 1,
          createdAt: 1,
          updatedAt: 1,
          user: {
            _id: 1,
            fullName: 1,
            profilePicture: 1
          }
        }
      },

      // Optional: sort alphabetically
      { $sort: { name: 1 } }
    ]);

    return successResponse(services, res, 200, 'Success');
  } catch (error) {
    console.error('Error fetching flat services:', error);
    return internalServerErrorResponse(error.message, res);
  }
};




exports.getServiceById = async (req, res) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, isActive: true });
    
    if (!service) {
      return badRequestResponse('Service not found',"NOT_FOUND",404,res)
    }
    
    return successResponse(service,res,200,'Success');
  } catch (error) {
    return internalServerErrorResponse(error.message, res, 500)
  }
};


exports.createService = async (req, res) => {
  try {
    const { name, description, category, whatsappContact, price, features, autoResponderMessage } = req.body;
    
    const service = new Service({
      name,
      description,
      category,
      whatsappContact,
      price,
      features,
      autoResponderMessage,
      isActive: true,
      user: req.user.id // Add user from authenticated user
    });
    
    await service.save();

    return successResponse({
      serviceId: service._id
    },res,201,'Service created successfully',)
  } catch (error) {
    return internalServerErrorResponse(error.message, res, 500);
  }
};


exports.updateService = async (req, res) => {
  try {
    const { name, description, category, whatsappContact, price, isActive } = req.body;
    
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        category,
        whatsappContact,
        price,
        isActive
      },
      { new: true }
    );
    
    if (!service) {
      return badRequestResponse('Service not found',"NOT_FOUND",404,res)
    }
    
    return successResponse({
      serviceId: service._id
    },res,200, 'Service updated successfully')
  } catch (error) {
    return internalServerErrorResponse(error.message, res, 500);
  }
};


exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    
    if (!service) {
      return badRequestResponse('Service not found',"NOT_FOUND",404,res)
    }
    return successResponse(null,res,204, 'Service deleted successfully' )
  } catch (error) {
    return internalServerErrorResponse(error.message, res, 500);
  }
};


exports.createInquiry = async (req, res) => {
  try {
    const { serviceId } = req.body;
    const userId = req.user.id;
    
    // Find service and ensure it's active
    const service = await Service.findOne({ _id: serviceId, isActive: true });
    if (!service) {
      return badRequestResponse('Service not found or not available',"NOT_FOUND",404,res)
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return badRequestResponse('User not found',"NOT_FOUND",404,res)
    }
    
    // Create inquiry
    const inquiry = new Inquiry({
      userId,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      userPhone: user.phone || '',
      serviceId,
      serviceName: service.name,
      // message,
      status: 'new'
    });
    
    await inquiry.save();
    
    // Prepare WhatsApp link
    const whatsappLink = `https://wa.me/${service.whatsappContact}?text=${encodeURIComponent(
      `Hello, I'm interested in ${service.name}. ${service.description}`
    )}`;
    
    return successResponse({
      inquiryId: inquiry._id,
      whatsappLink
    },res,201, 'Inquiry created successfully',)
  } catch (error) {
    return internalServerErrorResponse(error.message, res, 500);
  }
};

// Get services by category
exports.getServicesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    const services = await Service.find({ 
      category,
      isActive: true 
    });
    
    return successResponse(services,res,200,'Success');
  } catch (error) {
    return internalServerErrorResponse(error.message, res, 500);
  }
};


// ==================== USER SERVICE MANAGEMENT ENDPOINTS ====================

// Get all services created by the authenticated user
exports.getUserServices = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const services = await Service.find({ user: userId }).sort({ createdAt: -1 });
    
    return successResponse(services, res, 200, 'User services retrieved successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res, 500);
  }
};

// Create a service for the authenticated user
exports.createUserService = async (req, res) => {
  try {
    const { name, description, category, whatsappContact, price, features, autoResponderMessage } = req.body;
    const userId = req.user.id;
    
    const service = new Service({
      name,
      description,
      category,
      whatsappContact,
      price,
      features,
      autoResponderMessage,
      isActive: true,
      user: userId
    });
    
    await service.save();

    return successResponse({
      service
    }, res, 201, 'Service created successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res, 500);
  }
};

// Update user's own service
exports.updateUserService = async (req, res) => {
  try {
    const { name, description, category, whatsappContact, price, features, isActive, autoResponderMessage } = req.body;
    const userId = req.user.id;
    const serviceId = req.params.id;
    
    // Find service and verify ownership
    const service = await Service.findOne({ _id: serviceId, user: userId });
    
    if (!service) {
      return badRequestResponse('Service not found or you do not have permission to update it', "NOT_FOUND", 404, res);
    }
    
    // Update fields
    if (name !== undefined) service.name = name;
    if (description !== undefined) service.description = description;
    if (category !== undefined) service.category = category;
    if (whatsappContact !== undefined) service.whatsappContact = whatsappContact;
    if (price !== undefined) service.price = price;
    if (features !== undefined) service.features = features;
    if (isActive !== undefined) service.isActive = isActive;
    if (autoResponderMessage !== undefined) service.autoResponderMessage = autoResponderMessage;
    
    await service.save();
    
    return successResponse({
      service
    }, res, 200, 'Service updated successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res, 500);
  }
};

// Delete user's own service
exports.deleteUserService = async (req, res) => {
  try {
    const userId = req.user.id;
    const serviceId = req.params.id;
    
    // Find and delete service only if it belongs to the user
    const service = await Service.findOneAndDelete({ _id: serviceId, user: userId });
    
    if (!service) {
      return badRequestResponse('Service not found or you do not have permission to delete it', "NOT_FOUND", 404, res);
    }
    
    return successResponse(null, res, 200, 'Service deleted successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res, 500);
  }
};

// Update just the price of user's own service
exports.updateUserServicePrice = async (req, res) => {
  try {
    const { price } = req.body;
    const userId = req.user.id;
    const serviceId = req.params.id;
    
    if (price === undefined || price === null) {
      return badRequestResponse('Price is required', "VALIDATION_ERROR", 400, res);
    }
    
    if (typeof price !== 'number' || price < 0) {
      return badRequestResponse('Price must be a positive number', "VALIDATION_ERROR", 400, res);
    }
    
    // Find service and verify ownership
    const service = await Service.findOne({ _id: serviceId, user: userId });
    
    if (!service) {
      return badRequestResponse('Service not found or you do not have permission to update it', "NOT_FOUND", 404, res);
    }
    
    service.price = price;
    await service.save();
    
    return successResponse({
      serviceId: service._id,
      price: service.price
    }, res, 200, 'Service price updated successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res, 500);
  }
};



