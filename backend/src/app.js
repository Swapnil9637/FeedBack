// Start Continuous Profiling Setup
const pprof = require('@datadog/pprof');
const https = require('https');
const { URL } = require('url'); 

// Send to the Main Server Proxy, which will attach your auth tokens automatically
const PROFILING_ENDPOINT = 'https://deployraai.onrender.com/api/observability/profiles/v1/profiles';
const PROJECT_ID = '6aaaeb61b44c3e52e9fba443';
const SERVICE_NAME_FOR_PROFILE = 'FeedBack'; 
const PROFILING_INTERVAL_MS = 60 * 1000; // Run every 60 seconds

let profileCounter = 0; 

// 1. Enable heap profiler to track memory allocations
pprof.heap.start(512 * 1024, 64);

function sendProfileData(buffer, profileType) {
  const url = new URL(PROFILING_ENDPOINT);
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'x-project-id': PROJECT_ID,
      'x-service-name': SERVICE_NAME_FOR_PROFILE,
      'x-profile-type': profileType,
      'Content-Type': 'application/octet-stream',
      'Content-Length': Buffer.byteLength(buffer),
    },
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
         console.log(`[Profiling] ${profileType} profile ${profileCounter} sent successfully!`);
      } else {
        console.error(`[Profiling] Failed to send ${profileType} profile ${profileCounter} (Status: ${res.statusCode}): ${data}`);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`[Profiling] Problem with ${profileType} profile request ${profileCounter}: ${e.message}`);
  });

  req.write(buffer);
  req.end();
}

function startContinuousProfiling() {
  console.log('[Profiling] Initializing continuous CPU and Memory profiling...');

  const captureAndSend = async () => {
    profileCounter++;
    try {
      console.log(`[Profiling] Capturing CPU & Memory profiles ${profileCounter}...`);
      
      // 2. Capture 10 seconds of CPU activity
      const cpuProfile = await pprof.time.profile({ durationMillis: 10000 });
      const cpuBuffer = await pprof.encode(cpuProfile);
      sendProfileData(cpuBuffer, 'cpu');

      // 3. Capture Heap Memory profile
      const heapProfile = await pprof.heap.profile();
      const heapBuffer = await pprof.encode(heapProfile);
      sendProfileData(heapBuffer, 'memory');

    } catch (error) {
      console.error(`[Profiling] Error during profiling interval ${profileCounter}:`, error);
    }
  };

  // Trigger the very first set immediately
  captureAndSend();
  
  // Run the continuous profiling loop
  setInterval(captureAndSend, PROFILING_INTERVAL_MS);
}

startContinuousProfiling();
// End Continuous Profiling Setup


process.env.OTEL_EXPORTER_OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'https://deployraai.onrender.com/api/observability/traces';
process.env.OTEL_SERVICE_NAME = 'FeedBack';
const { initExpressObservability, observabilityMiddleware  } = require('@swapnil454/tracepilot/express');
initExpressObservability();

const express = require('express');
const sequelize = require('./config/database');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// ... (Rest of your Express setup remains exactly the same below this line)
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const storeRoutes = require('./routes/stores');
const ratingRoutes = require('./routes/ratings');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(observabilityMiddleware());
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
