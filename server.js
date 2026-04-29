// server.js
const express = require('express');
const cors = require('cors');
const session = require('express-session');

// Import routes
const registerRoutes = require('./routes/register');
const membership_planRoutes = require('./routes/membership_plan');
const contactRoutes = require('./routes/contact');
const brokersRoutes = require('./routes/brokers');
const marriage_affiliateRoutes = require('./routes/marriage_affiliate');
const decorationRoutes = require('./routes/decoration');
const create_profileRoutes = require('./routes/create_profile');
const nriProfilesRoutes = require('./routes/nriprofiles');
const new_profilecreationRoutes = require('./routes/new_profilecreation');
const register2Routes = require('./routes/register2'); 
// const new_profilecreation2Routes = require('./routes/new_profilecreation2');
const sessionRoutes = require('./routes/session');
const interestRoutes = require("./routes/interests");
const userRoutes = require('./routes/user');
const forgotPasswordRoutes = require('./routes/forgot_password');
const saveUserRoutes = require('./routes/saveuser');


const app = express();

const path = require('path');

// ✅ Enable CORS with credentials - MUST be before routes
// Enhanced CORS: allow common localhost dev origins and allow "null" origin
// from file:// for local testing. Uses a function to decide per-request.
const allowedOrigins = [
  'http://127.0.0.1:5501', 'http://localhost:5501',
  'http://127.0.0.1:5500', 'http://localhost:5500',
  'http://127.0.0.1:5502', 'http://localhost:5502',
  'http://127.0.0.1:3000', 'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. file:// pages), or allowed localhost origins
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Also allow literal 'null' origin used by some browsers for file://
    if (origin === 'null') return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-User-Id'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 200
}));


// ✅ Middleware for larger payloads
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ✅ Debug API request logging
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`[API DEBUG] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// ✅ Session configuration
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // keep false for local development over HTTP
    sameSite: 'lax', // use 'lax' for localhost HTTP to work properly
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// ✅ Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Routes
try {
  console.log('Loading registerRoutes...');
  app.use('/api', registerRoutes);
  console.log('✅ registerRoutes loaded');

  console.log('Loading membership_planRoutes...');
  app.use('/api', membership_planRoutes);
  console.log('✅ membership_planRoutes loaded');

  console.log('Loading contactRoutes...');
  app.use('/api', contactRoutes);
  console.log('✅ contactRoutes loaded');

  console.log('Loading brokersRoutes...');
  app.use('/api', brokersRoutes);
  console.log('✅ brokersRoutes loaded');

  console.log('Loading marriage_affiliateRoutes...');
  app.use('/api', marriage_affiliateRoutes);
  console.log('✅ marriage_affiliateRoutes loaded');

  console.log('Loading decorationRoutes...');
  app.use('/api', decorationRoutes);
  console.log('✅ decorationRoutes loaded');

  console.log('Loading create_profileRoutes...');
  app.use('/api', create_profileRoutes);
  console.log('✅ create_profileRoutes loaded');

  console.log('Loading nriProfilesRoutes...');
  app.use('/api', nriProfilesRoutes);
  console.log('✅ nriProfilesRoutes loaded');

  console.log('Loading new_profilecreationRoutes...');
  app.use('/api', new_profilecreationRoutes);
  console.log('✅ new_profilecreationRoutes loaded');

  console.log('Loading register2Routes...');
  app.use('/api', register2Routes);
  console.log('✅ register2Routes loaded');

  // console.log('Loading new_profilecreation2Routes...');
  // app.use('/api', new_profilecreation2Routes);
  // console.log('✅ new_profilecreation2Routes loaded');

  console.log('Loading interestRoutes...');
  app.use("/api", interestRoutes);
  console.log('✅ interestRoutes loaded');

  console.log('Loading userRoutes...');
  app.use('/api', userRoutes);
  console.log('✅ userRoutes loaded');

  console.log('Loading sessionRoutes...');
  app.use('/api', sessionRoutes);
  console.log('✅ sessionRoutes loaded');

  console.log('Loading forgotPasswordRoutes...');
  app.use('/api', forgotPasswordRoutes);
  console.log('✅ forgotPasswordRoutes loaded');

  console.log('Loading saveUserRoutes...');
  app.use('/api', saveUserRoutes);
  console.log('✅ saveUserRoutes loaded');

} catch (err) {
  console.error('❌ Error loading routes:', err.message);
  process.exit(1);
}

// ✅ Serve uploads folder
app.use('/uploads', express.static('uploads'));

// ✅ Serve static frontend files from project root so pages and API share same origin
app.use(express.static(path.join(__dirname)));

// ✅ Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});







// // server.js
// const express = require('express');
// const cors = require('cors');
// const session = require('express-session');
// const path = require('path');

// const registerRoutes = require('./routes/register');
// const membership_planRoutes = require('./routes/membership_plan');
// const contactRoutes = require('./routes/contact');
// const brokersRoutes = require('./routes/brokers');
// const marriage_affiliateRoutes = require('./routes/marriage_affiliate');
// const decorationRoutes = require('./routes/decoration');
// const create_profileRoutes = require('./routes/create_profile');
// const nriProfilesRoutes = require('./routes/nriprofiles');
// const new_profilecreationRoutes = require('./routes/new_profilecreation');
// const register2Routes = require('./routes/register2');
// const new_profilecreation2Routes = require('./routes/new_profilecreation2');

// const app = express();

// // ✅ Enhanced CORS configuration for Edge compatibility
// app.use(cors({
//   origin: function (origin, callback) {
//     // Allow requests with no origin (like mobile apps, curl, Postman)
//     if (!origin) return callback(null, true);
    
//     const allowedOrigins = [
//       'http://127.0.0.1:5500',
//       'http://localhost:5500',
//       'http://localhost:3000',
//       'http://127.0.0.1:3000',
//       'http://localhost:8080',
//       'http://127.0.0.1:8080',
//       'null'
//     ];
    
//     if (allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
//   credentials: true,
//   preflightContinue: false,
//   optionsSuccessStatus: 204
// }));

// // ✅ Handle preflight requests explicitly
// app.options('*', cors()); // Enable preflight for all routes

// // ✅ Middleware for larger payloads
// app.use(express.json({ limit: "10mb" }));
// app.use(express.urlencoded({ limit: "10mb", extended: true }));

// // ✅ Enhanced session configuration for cross-browser compatibility
// app.use(session({
//   secret: 'your-secret-key-change-this-in-production',
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     httpOnly: true,
//     secure: false, // set to true in production with HTTPS
//     maxAge: 1000 * 60 * 60 * 24, // 1 day
//     sameSite: 'lax' // Helps with cross-origin requests
//   },
//   store: new session.MemoryStore(), // Consider using a proper store for production
//   name: 'sessionId' // Explicit session cookie name
// }));

// // ✅ Routes
// app.use('/api', registerRoutes);
// app.use('/api', membership_planRoutes);
// app.use('/api', contactRoutes);
// app.use('/api', brokersRoutes);
// app.use('/api', marriage_affiliateRoutes);
// app.use('/api', decorationRoutes);
// app.use('/api', create_profileRoutes);
// app.use('/api', nriProfilesRoutes);
// app.use('/api', new_profilecreationRoutes);
// app.use('/api', register2Routes);
// app.use('/api', new_profilecreation2Routes);

// // ✅ Serve uploads folder with proper headers
// app.use('/uploads', express.static('uploads', {
//   setHeaders: (res, path) => {
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
//   }
// }));

// // ✅ Health check endpoint
// app.get('/api/health', (req, res) => {
//   res.json({ 
//     status: 'OK', 
//     timestamp: new Date().toISOString(),
//     cors: 'enabled'
//   });
// });

// // ✅ Error handling middleware
// app.use((err, req, res, next) => {
//   console.error('Server Error:', err);
//   if (err.message === 'Not allowed by CORS') {
//     return res.status(403).json({ 
//       error: 'CORS policy violation', 
//       message: 'Request not allowed from this origin' 
//     });
//   }
//   res.status(500).json({ error: 'Internal server error' });
// });

// // ✅ 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({ error: 'Endpoint not found' });
// });

// // ✅ Start server
// const PORT = 3306;
// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`🚀 Server running at http://localhost:${PORT}`);
//   console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
// });



