const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Military Supply Tracking System API',
      version: '1.0.0',
      description: 'Complete REST API for Military Supply Tracking System',
      contact: { name: 'MST Development Team' }
    },
    servers: [{ url: 'http://localhost:5000', description: 'Development' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            fullName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            role: { type: 'string', enum: ['admin', 'supply-manager', 'base-officer'] },
            assignedBase: { type: 'string', enum: ['Base Alpha', 'Base Bravo', 'Base Charlie', 'Base Delta', 'Base Echo'] }
          }
        },
        Inventory: {
          type: 'object',
          properties: {
            itemName: { type: 'string' },
            category: { type: 'string', enum: ['Food Packs', 'Medical Kits', 'Fuel Supplies', 'Uniforms', 'Equipment Parts'] },
            quantity: { type: 'number' },
            minimumThreshold: { type: 'number' },
            locationBase: { type: 'string' },
            unit: { type: 'string' },
            description: { type: 'string' }
          }
        },
        Shipment: {
          type: 'object',
          properties: {
            originBase: { type: 'string' },
            destinationBase: { type: 'string' },
            items: { type: 'array', items: { type: 'object', properties: { inventory: { type: 'string' }, itemName: { type: 'string' }, quantity: { type: 'number' } } } },
            dispatchDate: { type: 'string', format: 'date' },
            expectedDeliveryDate: { type: 'string', format: 'date' },
            priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'MST API Documentation'
  }));
  app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
};

module.exports = setupSwagger;
