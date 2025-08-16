const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

//  PostgreSQL connection using environment variable (Render/Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_VARIABLE,
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); // Serve HTML, CSS, JS, images
app.use(session({
  secret: 'yourSecretKey', 
  resave: false,
  saveUninitialized: true
}));

// Create appointments table if it doesn't exist
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

// POST: Submit appointment
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

// POST: Admin login
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

// GET: Check session
app.get('/check-auth', (req, res) => {
  if (req.session.username) {
    res.json({ loggedIn: true, username: req.session.username });
  } else {
    res.json({ loggedIn: false });
  }
});

// GET: Fetch appointments (auth required)
app.get('/appointments-data', async (req, res) => {
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

// POST: Logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

// GET: Protected staff dashboard
app.get('/Staff-Dashboard.html', (req, res) => {
  if (!req.session.username) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'Staff-Dashboard.html'));
});

// Fallback route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
