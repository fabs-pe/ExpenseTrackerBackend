// db.js (or similar)
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
});

async function databaseConnect() {
  try {
    console.log('Connecting to:\n' + process.env.SUPABASE_DB_URL);
    await pool.query('SELECT 1'); // simple health check
    console.log('Database connected');
  } catch (error) {
    console.warn(
      `databaseConnect failed to connect to DB:\n${JSON.stringify(error)}`
    );
    throw error;
  }
}

module.exports = {
  databaseConnect,
  pool,
};
