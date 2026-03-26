import ApiError from '../utils/ApiError.js';
import logger from '../config/logger.js';
import config from '../config/index.js';

const errorHandler = (err, req, res, _next) => {
  let error = err;

  // If it's not an ApiError, wrap it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, [], err.stack);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    ...(error.errors.length > 0 && { errors: error.errors }),
    ...(config.env === 'development' && { stack: error.stack }),
  };

  if (error.statusCode >= 500) {
    logger.error(`${error.statusCode} - ${error.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    logger.error(error.stack);
  } else {
    logger.warn(`${error.statusCode} - ${error.message} - ${req.originalUrl} - ${req.method}`);
  }

  res.status(error.statusCode).json(response);
};

export default errorHandler;
