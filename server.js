const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.static(__dirname)); // serve static files like CSS, JS, images from root
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'yourSecretKey', // replace with env var in prod
    resave: false,
    saveUninitialized: true
}));

// PostgreSQL connection
const pool = new Pool({
    connectionString: 'postgresql://postgres.flqlhsdwskwexdhcbzlr:DentalGeniusClinic123!@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres'
});

// Ensure appointments table exists
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

// Serve Home.html at root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Home.html'));
});

// Serve staff dashboard page
app.get('/staff-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'staff-dashboard.html'));
});

// Insert appointment
app.post('/submit-appointment', async (req, res) => {
    const d = req.body;
    console.log('Received appointment data:', d);

    try {
        // Format appointmentTime as ISO string for consistency
        const appointmentTime = d.appointmentTime || null;

        const result = await pool.query(`
            INSERT INTO appointments (firstName, lastName, email, treatment, appointmentTime)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [d.firstName, d.lastName, d.email, d.treatment, appointmentTime]);

        console.log('Inserted appointment:', result.rows[0]);
        res.json({ success: true, message: 'Appointment saved successfully!' });
    } catch (err) {
        console.error('Error inserting appointment:', err);
        res.status(500).json({ success: false, message: 'Failed to save appointment.' });
    }
});

// Hardcoded login for demo
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const validUser = email === 'admin@gmail.com' && password === 'password123';

    if (validUser) {
        req.session.username = email;
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Invalid username or password.' });
    }
});

// Check auth status
app.get('/check-auth', (req, res) => {
    if (req.session.username) {
        res.json({ loggedIn: true, username: req.session.username });
    } else {
        res.json({ loggedIn: false });
    }
});

// Fetch all appointments for dashboard
app.get('/appointments', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM appointments ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching appointments:', err);
        res.status(500).json({ error: err.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
