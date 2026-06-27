const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function start() {
  console.log('Starting in-memory MongoDB...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  console.log(`MongoDB running at: ${uri}`);

  await mongoose.connect(uri);
  console.log('Connected to in-memory MongoDB');

  // Create only the admin user for initial access
  const User = require('./models/User');
  const existingAdmin = await User.findOne({ email: 'admin@military.com' });
  if (!existingAdmin) {
    await User.create({
      fullName: 'Admin',
      email: 'admin@military.com',
      password: 'Admin@123',
      role: 'admin',
      assignedBase: 'Base Alpha'
    });
    console.log('Default admin user created: admin@military.com / Admin@123');
  }

  // Start Express
  const app = require('./app');
  const PORT = process.env.PORT || 5000;

  const server = app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  Military Supply Tracking API`);
    console.log(`  Server:  http://localhost:${PORT}`);
    console.log(`  API Docs: http://localhost:${PORT}/api-docs`);
    console.log(`  Health:   http://localhost:${PORT}/api/health`);
    console.log(`========================================\n`);
    console.log('Login: admin@military.com / Admin@123');
    console.log('');
  });

  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
