const pprof = require('@datadog/pprof');
const fetch = require('node-fetch'); // Ensure 'node-fetch' is installed (npm install node-fetch)

// --- Continuous Profiling Setup ---
const PROFILE_UPLOAD_URL = 'https://deployraai-ingestor.yourdomain.com/v1/profiles';
const PROJECT_ID = '6aaaeb61b44c3e52e9fba443';
const PROFILE_TYPE = 'cpu';
const PROFILE_DURATION_MS = 5000; // Capture CPU profile for 5 seconds
const UPLOAD_INTERVAL_MS = 60 * 1000; // Upload a new profile every 60 seconds

async function collectAndUploadProfile() {
    try {
        console.log('Starting CPU profile collection...');
        const profile = await pprof.profile({
            durationMillis: PROFILE_DURATION_MS,
            // Optionally, specify 'sourceMapper: true' if source maps are available
            // and you want to resolve original source locations.
            // However, this might add overhead; typically better for local debugging.
            // For continuous profiling, raw profiles are often mapped on the ingestor side.
        });
        const pprofBuffer = pprof.encodeSync(profile);

        // OTEL_SERVICE_NAME is set below in the main app logic
        const serviceName = process.env.OTEL_SERVICE_NAME || 'FeedBack'; // Fallback to 'FeedBack' if not yet set

        console.log(`Uploading CPU profile for service: ${serviceName}...`);
        const response = await fetch(PROFILE_UPLOAD_URL, {
            method: 'POST',
            headers: {
                'x-project-id': PROJECT_ID,
                'x-service-name': serviceName,
                'x-profile-type': PROFILE_TYPE,
                'Content-Type': 'application/octet-stream',
            },
            body: pprofBuffer,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to upload profile: ${response.status} ${response.statusText} - ${errorText}`);
        } else {
            console.log('CPU profile uploaded successfully!');
        }
    } catch (error) {
        console.error('Error during profile collection or upload:', error);
    }
}

// Schedule the continuous profiling task
setInterval(collectAndUploadProfile, UPLOAD_INTERVAL_MS);

// Ensure that the initial call happens after the application has had a chance to start up,
// or if you want an immediate first profile, call it once here too.
// For continuous profiling, setInterval is enough.
// --- End Continuous Profiling Setup ---

process.env.OTEL_EXPORTER_OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'https://deployraai.onrender.com/api/observability/traces';
process.env.OTEL_SERVICE_NAME = 'FeedBack';
const { initExpressObservability } = require('@swapnil454/tracepilot/express');
initExpressObservability();

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