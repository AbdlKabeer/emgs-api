const swaggerJSDoc = require('swagger-jsdoc');
const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT || 5001;

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'EMGS API',
    version: '1.0.0',
    description: 'Documentation for EMGS API',
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: 'Development server',
    },
    {
      url: 'https://emgs-app.vercel.app',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

// Options for the swaggerJSDoc
const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: [
    './src/routes/*.js',
    './src/routes/**/*.js',
    './src/models/*.js',
    './src/controllers/*.js'
  ],
};

// Generate swagger spec
const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;

