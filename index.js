// index.js
require('dotenv').config();
const { Pool } = require('pg');
const app = require('./src/server');

const PORT = process.env.PORT || 5001;  // Keep this
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;

const pool = new Pool({
  connectionString: SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function databaseConnect() {
  try {
    console.log('Connecting to:\n' + SUPABASE_DB_URL);
    await pool.query('SELECT 1');
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }
}

// Start the server once DB is connected
databaseConnect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });
