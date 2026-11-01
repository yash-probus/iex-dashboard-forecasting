// Inject dummy env variables for Docker build where .env is missing
process.env.JWT_SECRET = 'dummy_secret_for_swagger_generation';
process.env.PORT = '5000';
process.env.NODE_ENV = 'development';

import app from './app';
import listEndpoints from 'express-list-endpoints';
import fs from 'fs';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

// Initialize swagger-jsdoc to parse JSDoc comments from route files
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IEX Dashboard API',
      description: 'API documentation for the IEX Dashboard platform. Documented routes show exact schemas; auto-discovered routes show a generic success response.',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://13.206.77.155:5002',
        description: 'Production Server',
      },
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server',
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
    security: [{ bearerAuth: [] }],
  },
  // Paths to files containing OpenAPI definitions
  apis: ['./src/modules/**/*.ts', './src/routes/**/*.ts'],
};

// Generate base swagger doc from JSDoc
const swaggerDoc = swaggerJsdoc(options) as any;
if (!swaggerDoc.paths) {
  swaggerDoc.paths = {};
}

// Get all endpoints from express router
const endpoints = listEndpoints(app as any);

endpoints.forEach((endpoint) => {
  const pathParts = endpoint.path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}'); // convert express /:id to OpenAPI /{id}
  
  if (!swaggerDoc.paths[pathParts]) {
    swaggerDoc.paths[pathParts] = {};
  }
  
  endpoint.methods.forEach((method) => {
    const lowerMethod = method.toLowerCase();
    if (lowerMethod === 'middleware') return;

    // Generate a generic fallback response structure
    const pathParams = (pathParts.match(/\{[a-zA-Z0-9_]+\}/g) || []).map(p => p.replace(/[{}]/g, ''));
    const parameters = pathParams.map(param => ({
      in: 'path',
      name: param,
      required: true,
      schema: { type: 'string' }
    }));

    // Auto-assign a tag based on the first part of the URL (e.g. /api/auth -> Auth)
    const segments = pathParts.split('/').filter(Boolean);
    let tag = 'General';
    if (segments.length >= 2 && segments[0] === 'api') {
      // Convert 'trader-performance' to 'Trader Performance'
      tag = segments[1].split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    if (!swaggerDoc.paths[pathParts][lowerMethod]) {
      swaggerDoc.paths[pathParts][lowerMethod] = {
        summary: `Auto-generated ${method} for ${pathParts}`,
        description: 'This endpoint was automatically discovered. Add JSDoc to the route for exact output schemas.',
        tags: [tag],
        parameters: parameters,
        responses: {
          '200': {
            description: 'Successful response'
          }
        }
      };
    }

    // Force add security requirement if not present
    if (!swaggerDoc.paths[pathParts][lowerMethod].security) {
      swaggerDoc.paths[pathParts][lowerMethod].security = [{ bearerAuth: [] }];
    }

    // Force add 401 Unauthorized response
    swaggerDoc.paths[pathParts][lowerMethod].responses = {
      ...swaggerDoc.paths[pathParts][lowerMethod].responses,
      '401': {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Unauthorized' }
              }
            }
          }
        }
      }
    };
  });
});

const outputPath = path.join(__dirname, 'swagger_output.json');
fs.writeFileSync(outputPath, JSON.stringify(swaggerDoc, null, 2));
console.log(`Successfully generated swagger documentation with ${endpoints.length} routes at ${outputPath}`);
process.exit(0);
