// backend/src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.POSTGRES_URI, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// Retry logic for Neon free tier (wakes up slowly from idle)
async function connectWithRetry(retries = 5, delayMs = 5000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('Database connected successfully!');
      return;
    } catch (err) {
      console.error(`Database connection attempt ${i}/${retries} failed: ${err.message}`);
      if (i < retries) {
        console.log(`Retrying in ${delayMs / 1000}s...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  console.error('Could not connect to database after all retries. Continuing anyway...');
}

connectWithRetry();

module.exports = sequelize;
