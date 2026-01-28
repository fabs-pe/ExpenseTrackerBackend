
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// CREATE POOL HERE (no import needed)
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

// ==========================
// GET all expenses (with user join)
// ==========================
router.get('/', async (req, res) => {
  try {
    const results = await pool.query(`
      SELECT e.*, u.user_name, u.email 
      FROM expenses e 
      LEFT JOIN users u ON e.user_id[1]::text = u.id::text
    `);
    
    res.json({ 
      message: 'List of all expenses', 
      expenses: results.rows 
    });
  } catch (err) {
    console.error('Query error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// GET expenses. by ID (with user join)
// ==========================

// const count = await pool.query('SELECT COUNT(*) as total FROM expenses');
// const sample = await pool.query('SELECT * FROM expenses LIMIT 1');


module.exports = router;





