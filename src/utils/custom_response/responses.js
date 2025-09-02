const statusCodes = require('./statusCodes');  // Your status code utility file (optional)

const successResponse = (data = null, res, statusCode = 200, message="Success") => {
    const responseData = {
        status: true,
        message:message,
        detail:message,
        data
    };
    return res.status(statusCode).json(responseData);
};

const errorResponse = (message = 'An error occurred', group = 'BAD_REQUEST', statusCode = 400, res= null) => {
    console.log(res)
    console.log(res)
    console.log(res)
    console.log(res)
    console.log(res)
    const responseData = {
        status: false,
        group,
        detail: message,
        message
    };
    return res.status(statusCode).json(responseData);
};

const validationErrorResponse = (errors = null, res) => {
    const message = 'Validation failed';
    const responseData = {
        status: false,
        message,
        detail: message,
        errors
    };
    return res.status(422).json(responseData);
};

const verificationSuccessResponse = (data = null, message = 'Success', responseCode = '00', statusCode = 200, statusBool = true, res) => {
    const responseData = {
        status: statusBool,
        message,
        detail: message,
        response_code: responseCode,
        data
    };
    return res.status(statusCode).json(responseData);
};

const badRequestResponse = (message = 'Bad Request', group = 'BAD_REQUEST', statusCode = 400, res) => {
    return errorResponse(message, group, statusCode, res);
};

const internalServerErrorResponse = (message = 'Internal Server Error', res, statusCode = 500) => {
    return errorResponse(message, 'INTERNAL_SERVER_ERROR', statusCode, res);
};


/**
 * Creates a paginated response with standardized format
 * 
 * @param {Array} data - The array of items for the current page
 * @param {number} totalItems - Total number of items across all pages
 * @param {number} currentPage - The current page number
 * @param {number} limit - Number of items per page
 * @param {Object} res - Express response object
 * @param {string} message - Optional success message
 * @param {number} statusCode - HTTP status code for the response
 * @returns {Object} Express response with standardized pagination format
 */
const paginationResponse = (
    data,
    totalItems,
    currentPage = 1,
    limit = 10,
    res,
    message = 'Success',
    statusCode = 200
  ) => {
    // Ensure currentPage and limit are numbers
    currentPage = parseInt(currentPage);
    limit = parseInt(limit);
  
    // Calculate pagination values
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;
  
    // Create response object
    const responseData = {
      status: true,
      message,
      detail: message,
      metadata: {
        totalItems,
        totalPages,
        currentPage,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? currentPage + 1 : null,
        prevPage: hasPrevPage ? currentPage - 1 : null
      },
      results:data
      
    };
  
    return res.status(statusCode).json(responseData);
  };
  

module.exports = {
    successResponse,
    errorResponse,
    validationErrorResponse,
    verificationSuccessResponse,
    badRequestResponse,
    internalServerErrorResponse,
    paginationResponse
};