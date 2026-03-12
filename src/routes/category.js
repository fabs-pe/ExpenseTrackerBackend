const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: {rejectUnauthorized: false}
});

// ||||||||||||||||||||||||
//  GET ENDPOINTS
// ||||||||||||||||||||||||

// GET all categories
router.get('/', async (req,res) => {
    try{
        const results = await pool.query(
            `
            SELECT c.*
            FROM categories c
            `
        );

        res.json({
            message: "List of categories",
            Categories: results.rows
        });

    }catch(err){
        console.error('Query error:', err);
        res.status(500).json({ error: err.message})

    }    
});

// GET category by ID

router.get('/:id', async (req, res) => {
    try{
        const { id } = req.params;

        if (isNaN(id) || id <= 0){
            return res.status(400).json({message: 'Invalid Category ID'});
        }

        const results = await pool.query(
            `
            SELECT c.*
            FROM categories c
            WHERE c.cat_id = $1
            `, [id]
        );

        if (results.rows.length === 0) {
            return res.status(404).json({message: 'Category Not Found'});
        }

        res.json({
            message: 'Category Found',
            Category: results.rows[0]

        });

    }catch(err){
        console.error('Get Category Error: ', err);
        res.status(500).json({error: err.message});

    }
    
});

// GET category by name


module.exports = router;