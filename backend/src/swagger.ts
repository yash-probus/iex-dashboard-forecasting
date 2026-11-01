import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import fs from 'fs';
import path from 'path';

export const setupSwagger = (app: Application) => {
  try {
    const swaggerFilePath = path.join(__dirname, 'swagger_output.json');
    if (fs.existsSync(swaggerFilePath)) {
      const swaggerFile = JSON.parse(fs.readFileSync(swaggerFilePath, 'utf8'));
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile, { explorer: true }));
      console.log('Swagger UI initialized at /api-docs');
    } else {
      console.log('Swagger output file not found. Run `npm run swagger` to generate it.');
    }
  } catch (error) {
    console.error('Failed to initialize Swagger UI:', error);
  }
};
