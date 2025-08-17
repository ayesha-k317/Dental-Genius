const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.static(__dirname)); // Serves static files (HTML, CSS, images)
app.use(bodyParser.json());
app.use(session({
    secret: 'yourSecretKey',       // Use env variable in production
    resave: false,
    saveUninitialized: true        // Quick dev setup
}));

// PostgreSQL connection (update credentials if needed)
const pool = new Pool({
    connectionString: 'postgresql://postgres.flqlhsdwskwexdhcbzlr:DentalGeniusClinic123!@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres'
});

// Serve Home.html at root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Home.html'));
});

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

// Handle appointment submission
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

// Login (hardcoded for demo)
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const validUser = username === 'admin' && password === 'password123';

    if (validUser) {
        req.session.username = username;
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Invalid username or password.' });
    }
});

// Check authentication
app.get('/check-auth', (req, res) => {
    if (req.session.username) {
        res.json({ loggedIn: true, username: req.session.username });
    } else {
        res.json({ loggedIn: false });
    }
});

// Fetch all appointments
app.get('/appointments', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM appointments');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
