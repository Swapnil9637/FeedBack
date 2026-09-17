const express = require('express');
const sequelize = require('./config/database');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const storeRoutes = require('./routes/stores');
const ratingRoutes = require('./routes/ratings');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 8000;

app.set('trust proxy', 1);
app.use(express.json());

const allowedOrigins = process.env.CLIENT_URL?.split(',').map(url => url.trim()) || [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

sequelize
  .authenticate()
  .then(() => {
    console.log('PostgreSQL connected');
    return sequelize.sync({ alter: true }); 
  })
  .then(() => console.log('Database synced successfully'))
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api', dashboardRouter);

app.get('/', (req, res) => {
  res.send('Rating App API is running');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
