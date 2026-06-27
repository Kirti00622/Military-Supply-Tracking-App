const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const setupSwagger = require('./utils/swagger');
const { checkLowStock } = require('./services/alertService');

const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const alertRoutes = require('./routes/alertRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

if (mongoose.connection.readyState === 0) {
  connectDB();
}

app.use(helmet());
app.use(cors({
  origin: function(origin, cb) {
    const allowed = ['http://localhost:5500', 'http://127.0.0.1:5500'];
    if (!origin || allowed.includes(origin)) return cb(null, true);
    return cb(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(morgan('dev'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { success: false, message: 'Too many requests. Please try again later.' } });
app.use('/api/', limiter);

setupSwagger(app);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Military Supply Tracking API is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

setInterval(checkLowStock, 60 * 60 * 1000);

module.exports = app;
