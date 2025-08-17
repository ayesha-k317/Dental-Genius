const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// PostgreSQL connection (Supabase or other)
const pool = new Pool({
  connectionString: process.env.DATABASE_VARIABLE,
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration using PostgreSQL-backed store
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}));

// Serve static files
app.use(express.static(__dirname));

// Routes
try {
  // Login page
  app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
  });

  // Staff Dashboard (auth required)
  app.get('/Staff-Dashboard.html', (req, res) => {
    if (!req.session.username) {
      return res.redirect('/login.html');
    }
    res.sendFile(path.join(__dirname, 'Staff-Dashboard.html'));
  });

  // Appointment page
  app.get('/Book-an-appointment.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'Book-an-appointment.html'));
  });

  // Submit appointment
  app.post('/submit-appointment', async (req, res) => {
    const { firstName, lastName, email, treatment, appointmentTime } = req.body;

    try {
      await pool.query(`
        INSERT INTO appointments (firstName, lastName, email, treatment, appointmentTime)
        VALUES ($1, $2, $3, $4, $5)
      `, [firstName, lastName, email, treatment, appointmentTime]);

      res.json({ success: true, message: 'Appointment booked successfully!' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Error saving appointment.' });
    }
  });

  // Admin login
  app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const validUser = username === 'admin' && password === 'admin123';

    if (validUser) {
      req.session.username = username;
      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Invalid username or password.' });
    }
  });

  // Auth status
  app.get('/check-auth', (req, res) => {
    if (req.session.username) {
      res.json({ loggedIn: true, username: req.session.username });
    } else {
      res.json({ loggedIn: false });
    }
  });

  // Get all appointments (admin only)
  app.get('/appointments-data', async (req, res) => {
    if (!req.session.username) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
      const result = await pool.query(`SELECT * FROM appointments ORDER BY appointmentTime DESC`);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Logout
  app.post('/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/login.html');
    });
  });

  // Catch-all route: redirect unknown routes to login
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
  });

} catch (err) {
  console.error('Error defining routes:', err);
}

// Auto-create appointments table if it doesn't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    firstName TEXT,
    lastName TEXT,
    email TEXT,
    treatment TEXT,
    appointmentTime TEXT
  )
`).catch(console.error);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).send('Internal Server Error');
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
