const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');

dotenv.config();

const app = express();

// ✅ FIXED CORS
app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      'http://localhost:3000',
      process.env.CLIENT_URL
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/user', require('./routes/userRoutes'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Server is running' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
    });
    cron.schedule('59 23 28-31 * *', async () => {
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      if (now.getDate() === lastDay) {
        const { generateMonthlyReports } = require('./utils/reportGenerator');
        await generateMonthlyReports();
      }
    });
  })
  .catch(err => { console.error('❌ MongoDB error:', err); process.exit(1); });

module.exports = app;
