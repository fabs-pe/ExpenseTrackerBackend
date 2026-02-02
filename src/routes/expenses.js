
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


router.post('/add', async (req, res) => {
  try {
    const { cat_id, expense_name, description, amount, date, user_id } = req.body;
    
    if (!cat_id || !expense_name || !amount || !date || !user_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const userArray = [String(user_id)];
    const insertValues = [cat_id, expense_name, description || null, Number(amount), date, userArray];

    // INSERT
    const insertText = `
      INSERT INTO expenses (cat_id, expense_name, description, amount, date, user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;
    
    const insertResult = await pool.query(insertText, insertValues);
    const newExpenseId = insertResult.rows[0].id;

    // JOIN (fixed column name)
    const joinText = `
      SELECT 
        e.id, e.cat_id, e.expense_name, e.description, e.amount, e.date,
        c.category_name,
        u.user_name, u.email
      FROM expenses e
      LEFT JOIN categories c ON e.cat_id = c.cat_id
      LEFT JOIN users u ON e.user_id[1]::text = u.id::text
      WHERE e.id = $1;
    `;
    
    const joinResult = await pool.query(joinText, [newExpenseId]);

    res.status(201).json({
      message: 'Expense created',
      expense: joinResult.rows[0]
    });

  } catch (err) {
    console.error('POST error:', err);
    res.status(500).json({ error: err.message });
  }
});


// ==========================
// GET expenses. by ID (with user join)
// ==========================

// const count = await pool.query('SELECT COUNT(*) as total FROM expenses');
// const sample = await pool.query('SELECT * FROM expenses LIMIT 1');


module.exports = router;





