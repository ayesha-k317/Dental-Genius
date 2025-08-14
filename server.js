const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Hardcoded login credentials
const VALID_EMAIL = 'admin@example.com';
const VALID_PASSWORD = 'admin123';

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // Serve static files (HTML, CSS, images)

// === ROUTES ===

// Serve login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'Staff-Dashboard.html'));
});

// Handle login POST
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (email === VALID_EMAIL && password === VALID_PASSWORD) {
    res.sendFile(path.join(__dirname, 'Staff-Dashboard.html'));
  } else {
    res.send('<h3>Incorrect email or password.</h3><a href="/login">Try again</a>');
  }
});

// Serve appointment form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Book-an-appointment.html'));
});

// Handle appointment booking (optional – leave blank or log it)
app.post('/submit', (req, res) => {
  const { name, email, treatment, datetime } = req.body;

  console.log('Appointment booked:', { name, email, treatment, datetime });

  res.send('<h3>✅ Appointment booked successfully!</h3><a href="/">Book another</a>');
});

// serve dashboard directly
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'Staff-Dashboard.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
