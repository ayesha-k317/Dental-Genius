const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Connect to Supabase PostgreSQL
const pool = new Pool({
  connectionString: 'postgresql://postgres.flqlhsdwskwexdhcbzlr:DentalGeniusClinic123!@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

// Middleware
app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}));

// Create appointments table if not exists
pool.query(`
  CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    email TEXT,
    firstName TEXT,
    lastName TEXT,
    phone TEXT,
    appointmentTime TEXT,
    dob TEXT,
    treatment TEXT,
    doctor TEXT
  )
`).catch(console.error);

// Submit appointment
app.post('/submit-appointment', async (req, res) => {
  const d = req.body;

  try {
    await pool.query(`
      INSERT INTO appointments (email, firstName, lastName, phone, appointmentTime, dob, treatment, doctor)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [d.email, d.firstName, d.lastName, d.phone, d.appointmentTime, d.dob, d.treatment, d.doctor]);

    res.json({ success: true, message: 'Appointment saved successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to save appointment.' });
  }
});

// Admin login (simple)
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (email === 'admin@gmail.com' && password === 'admin123') {
    req.session.username = email;
    res.json({ success: true });
  } else {
    res.json({ success: false, message: 'Invalid credentials' });
  }
});

// Auth check
app.get('/check-auth', (req, res) => {
  if (req.session.username) {
    res.json({ loggedIn: true, username: req.session.username });
  } else {
    res.json({ loggedIn: false });
  }
});

// Get all appointments (only if logged in)
app.get('/appointments', async (req, res) => {
  if (!req.session.username) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const result = await pool.query('SELECT * FROM appointments ORDER BY appointmentTime DESC');
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

// Catch-all: serve home page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'Home.html'));
});

// 🚀 Start server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
