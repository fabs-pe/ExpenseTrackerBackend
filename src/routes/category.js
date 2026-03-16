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
router.get('/title/:category_name', async (req, res) => {
    try{
        const { category_name } = req.params;

        const results = await pool.query(
            `
            SELECT c.*
            FROM categories c
            WHERE LOWER (c.category_name) = LOWER ($1)
            `, [category_name]
        );

        if (results.rowCount.length === 0 ){
            return results.status(404).json({message: 'Category Not Found'})
        }

        res.json({
            message: 'Category Found',
            Category: results.rows
        })

    }catch(err){
        console.error('GET Category Error:', err);
        res.status(500).json({ error: err.message})

    }
    
});

// ||||||||||||||||||||||
//  POST ENDPOINT
// ||||||||||||||||||||||

// POST create a new category
router.post('/create', async (req, res) => {
    try{
        const { category_name, category_desc } = req.body;

        // validation
        if(!category_name || !category_desc){
            return res.status(400).json({
                message: 'Category name and description are required'
            })
        }

        // check if categpry name exists
        const existing = await pool.query(
            'SELECT cat_id FROM categories WHERE category_name = $1', [category_name]
        );
        if (existing.rows.length > 0){
            return res.status(400).json({ message: 'Category name already exists'})
        }

        // insert data
        const insertText = `
            INSERT INTO categories (created_at, category_name, category_desc)
            VALUES (NOW(), $1, $2)
            RETURNING cat_id, created_at, category_name, category_desc;
        `;

        const values = [
            category_name,
            category_desc,
        ];

        const result = await pool.query(insertText, values);
        const category = result.rows[0];

        return res.status(201).json({
            message: "Category Created",
            category,
        });


    } catch(err){
        console.error('Create category error');
        res.status(500).json({ error: err.message})
    }
})


// ||||||||||||||||||||||
//  PATCH ENDPOINT
// ||||||||||||||||||||||




// ||||||||||||||||||||||
//  DELETE ENDPOINT
// ||||||||||||||||||||||


module.exports = router;