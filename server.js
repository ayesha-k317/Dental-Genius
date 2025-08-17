const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_VARIABLE,
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: false
}));

// Serve static assets (CSS, images, etc.)
app.use(express.static(__dirname));

// Serve HTML pages
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/Staff-Dashboard.html', (req, res) => {
  if (!req.session.username) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'Staff-Dashboard.html'));
});

app.get('/Book-an-appointment.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Book-an-appointment.html'));
});

// Create appointments table (if it doesn't exist)
pool.query(`
  CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    name TEXT,
    email TEXT,
    treatment TEXT,
    appointment_time TEXT
  )
`).catch(console.error);

// POST: Handle appointment booking
app.post('/submit-appointment', async (req, res) => {
  const { name, email, treatment, appointmentTime } = req.body;

  try {
    await pool.query(`
      INSERT INTO appointments (name, email, treatment, appointment_time)
      VALUES ($1, $2, $3, $4)
    `, [name, email, treatment, appointmentTime]);

    res.json({ success: true, message: 'Appointment booked successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error saving appointment.' });
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
    const result = await pool.query('SELECT * FROM appointments ORDER BY appointment_time DESC');
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

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
