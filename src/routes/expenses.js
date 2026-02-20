
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// CREATE POOL HERE (no import needed)
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});


// ==============================================================
// GET Routes
// ==============================================================


// ==========================
// GET all expenses (with user join)
// ==========================
router.get('/', async (req, res) => {
  try {
    const results = await pool.query(`
      SELECT e.*, u.user_name, u.email 
      FROM expenses e 
      LEFT JOIN users u ON e.user_id = u.id
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

router.get('/:id', async (req, res) => {
  try{
    const { id } = req.params;
    
    if (isNaN(id) || id <=0){
      return res.status(400).json({message: 'Invalid expense ID' });
    }

    const results = await pool.query(`
      SELECT e.id, e.cat_id, e.expense_name, e.description, e.amount, e.date, e.user_id, c.category_name, u.user_name, u.email
      FROM expenses e
      LEFT JOIN categories c ON e.cat_id = c.cat_id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.id = $1`,[id]);

    if (results.rows.length === 0) {
      return res.status(404).json({message: 'Expense not found' });
    }

    res.json({
      message: 'Expense found',
      expense: results.rows[0]
    });
  
  } catch (err) {
    console.error('Get expense error:', err);
  }
})

// ==========================
// GET expenses by date
// ==========================

router.get('/date/:start/:end', async (req,res) => {
  try{
    const { start, end } = req.params;

    // date format YYYY-MM-DD
    const startDate = `${start}T00:00:00Z`;
    const endDate = `${end}T23:59:59Z`;

    const results = await pool.query(`
      SELECT
      e.id, e.cat_id, e.expense_name, e.description, e.amount, e.date,e.user_id,
      c.category_name,
      u.user_name
      FROM expenses e
      LEFT JOIN categories c ON e.cat_id = c.cat_id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.date >= $1 AND e.date <= $2
      ORDER BY e.date DESC
      `, [startDate, endDate]);

    res.json({
      message: `Expenses ${start} to ${end}`,
      count: results.rows.length,
      expenses: results.rows
    });

  } catch (err) {
    console.error('Date expenses error:' , err);
    res.status(500).json({error: err.message});
  }
});

// ==========================
// GET expenses in between two amounts
// ==========================

router.get('/amounts/:low/:high', async (req, res) => {
  try {

    const { low, high } = req.params;

    if (isNaN(low, high) || low <=0 || high <=0){
      return res.status(400).json({message: 'Invalid amount range' });
    }

    const lowAmount = `${low}`;
    const highAmount = `${high}`;

    const results = await pool.query(`
      SELECT
      e.id, e.cat_id, e.expense_name, e.description, e.amount, e.date,e.user_id,
      c.category_name,
      u.user_name
      FROM expenses e
      LEFT JOIN categories c ON e.cat_id = c.cat_id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.amount >= $1 AND e.amount <= $2
      ORDER BY e.date DESC
      `, [lowAmount, highAmount]);

    res.json({
      message: `Expenses between $${lowAmount} to $${highAmount}`,
      count: results.rows.length,
      expenses: results.rows
    });

  } catch (err) {
    console.error('Amounts expenses error:' , err);
    res.status(500).json({error: err.message});
  }
});

// ==========================
// GET expenses by amount
// ==========================

router.get('/amount/:amount', async (req, res) => {
  try{
    const { amount } = req.params;

    if (isNaN(amount) || amount <=0){
      return res.status(400).json({message:'Invalid amount'});
    }

    const results = await pool.query(`
      SELECT e.*, u.user_name, u.email 
      FROM expenses e 
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.amount = $1`, [amount]);

    if (results.rows.length === 0){
      return res.status(404).json({message: 'No expenses with that amount'})
    };

    res.json({
      message: 'Expense Found',
      expense: results.rows
    });

  }catch(err){
    console.error('Get expense error: ', err);
    res.status(500).json({error: err.message})
  }
});

// ==========================
// GET expenses by user
// ==========================

router.get('/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const idNum = Number(user_id);

    if (Number.isNaN(idNum) || idNum <= 0){
      return res.status(400).json({message: 'Invalid user ID'});
    }

    const results = await pool.query(`
      SELECT e.id, e.cat_id, e.expense_name, e.description, e.amount, e.date, e.user_id,
      c.category_name,
      u.user_name, u.email
      FROM expenses e
      LEFT JOIN categories c ON e.cat_id = c.cat_id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.user_id = $1
      ORDER BY e.date DESC
      `, [idNum]);

    res.json({
      message: `Expenses for user ${user_id}`,
      count: results.rows.length,
      expenses: results.rows,
    });
  } catch (err){
    console.error('User expenses error:', err);
    res.status(500).json({error: err.message})
  }
  
})

// ==========================
// GET expenses by user
// ==========================

router.get('/all/summary', async (req, res) => {
  try{
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total_count,
        COALESCE(SUM(amount), 0)::numeric AS total_amount
      FROM expenses
      `);

    res.json({
      message: 'Expenses summary',
      summary: result.rows[0]
    });
  } catch (err) {
    console.error ('Summary error:', err);
    res.status(500).json({error: err.message});
  }
  
});

// ==============================================================
// POST Routes
// ==============================================================


// ==========================
// POST an expenses
// ==========================

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
      LEFT JOIN users u ON e.user_id = u.id
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
// PATCH an expenses
// ==========================


// ==========================
// DELETE an expenses
// ==========================




module.exports = router;





