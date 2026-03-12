const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const bcrypt = require('bcrypt'); 
const SALT_ROUNDS = 10;

//  CREATE POOL HERE
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false}
});


// ||||||||||||||||||||||||
//  GET ENDPOINTS
// ||||||||||||||||||||||||

// will need to be edittted to allow for roles

//  GET all USers
router.get('/', async (req, res) => {
  try {
    const results = await pool.query(`
      SELECT u.*
      FROM users u
      LEFT JOIN expenses e ON u.id = e.user_id
    `);

    res.json({
      message: 'List of all users',
      users: results.rows
    });
  
  }catch(err){
    console.error('Query error:', err);
    res.status(500).json({ error: err.message});
  }
});

// GET user by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id) || id<=0){
      return res.status(400).json({message: 'Invalid User ID '});
    }

    const results = await pool.query(`
      SELECT u.*
      FROM users u
      WHERE u.id = $1`,[id]);

    if (results.rows.length === 0){
      return res.status(404).json({message: 'User not found'});
    }

    res.json({
      message: 'User Found',
      user: results.rows[0]
    });


  }catch (err){
    console.error('Get user error: ', err);
    res.status(500).json({ error: err.message});

  }

});

// // GET user by userName 
// // add permissions
router.get('/name/:user_name', async (req, res) => {
  try {

    const  { user_name } = req.params

    const results = await pool.query(`
      SELECT u.*
      FROM users u
      WHERE LOWER (u.user_name) = LOWER ($1)`, [user_name]);

      if (results.rows.length === 0 ){
        return res.status(404).json({message: 'User Name Not Found'});
      }

      res.json({
        message: 'User Found',
        user: results.rows
      })
 

  } catch (err){
    console.error('Get User error:', err);
    res.status(500).json({ error: err.message});
  }

});

// GET users by group name
router.get('/group/:group_name', async (req, res) => {
  try{

    const { group_name } = req.params

    const results = await pool.query(`
      SELECT u.*
      FROM users u 
      WHERE LOWER (u.group_name) = LOWER ($1)`, [group_name]);

    if (results.rows.length === 0){
      return res.status(404).json({message: 'Group Name out found'});
    }

    res.json({
      message: 'Group Found',
      group_name: results.rows
    })
  
  }catch(err){
    console.error('Get Group error:', err);
    res.status(500).json({error: err.message})
  }
  
});

// // GET user by email
// // add permissions
router.get('/email/:email', async (req, res) => {
    try{
      const { email } = req.params;

      if (!email || typeof email != 'string') {
        return res.status(400).json({message: 'Email is required'});
      }

      const result = await pool.query(
        `
        SELECT id, user_name, email, group_name, role
        FROM users
        WHERE email = $1
        `, [email]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found'});
      }

      res.json({
        message: 'User found',
        user: result.rows[0],
      });

    }catch(err){
      console.error('GET suer by email error: ', err);
      res.status(500).json({ error: err.message})

    }

});


// ||||||||||||||||||||||
//  POST ENDPOINT
// ||||||||||||||||||||||

//  POST create new user
router.post("/register", async (req, res) =>{
    try{
      const { user_name, email, password, group_name, role } = req.body;

      // basic validation
      if (!user_name || !email || !password){
        return res.status(400).json({
          message: 'user_name, email and password are required',
        })
      }

      // check if email already exists
      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1', [email]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ message: 'Email already registered'})
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user
      const insertText = `
        INSERT INTO users (created_at, user_name, email, password, group_name, role)
        VALUES (NOW(), $1, $2, $3, $4, $5)
        RETURNING id, created_at, user_name, email, group_name, role;  
      `;

      const values = [
        user_name,
        email,
        hashedPassword,
        group_name || null,
        role || null,
      ];

      const result = await pool.query(insertText, values);
      const user = result.rows[0];

      return res.status(201).json({
        message: "User created",
        user,
      });

    } catch (err){
        console.error('Create user error:', err);
        return res.status(500).json({
          message: 'Error creating user',
          error: err.message,
        });
       
    }
});

// POST to users/login
router.post('/login', async (req, res) => {

  try {
    const { email, password } = req.body;

    // validation
    if(!email || !password ){
      return res.status(400).json({message: 'Email and password are required'});
    }

    // find user by email
    const result = await pool.query(
      'SELECT id, user_name, email, password, group_name, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0 ){
      return req.status(401).json({message: 'Invalid credentials'});
    }

    const user = result.rows[0];

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch) {
      return res.status(401).json({message: 'Invalid Credentials'});
    }

    // strip hashed password before res
    delete user.password;

    return res.status(200).json({
      message: "Login Successful",
      user
    });


  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      message: 'Error Logging in',
      error: err.message
    });

  }
});

// ==========================
// PATCH a user
// ==========================

router.patch('/edit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_name, email, password, group_name, role } = req.body;

    const userId = Number(id);
    if (Number.isNaN(userId) || userId <= 0 ){
      return res.status(400).json({ message: 'Invalid User ID'})
    }

    // build dynamic SET based on provided fields
    const fields = [];
    const values = [];
    let idx = 1;

    if (user_name !== undefined){
      fields.push(`user_name = $${idx++}`);
      values.push(user_name);
    }

    if (email !== undefined){
      fields.push(`email = $${idx++}`);
      values.push(email);
    }

    if (password !== undefined){
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      fields.push(`password = $${idx++}`);
      values.push(hashedPassword);
    }

    if (group_name !== undefined){
      fields.push( `group_name = $${idx++}`);
      values.push(group_name);
    }

    if (role !== undefined){
      fields.push(`role = $${idx++}`);
      values.push(role);
    }

    if (fields.length === 0 ){
      return res.status(400).json({message: 'No fields provided to update'})
    }

    // add ID as a last parameter
    values.push(userId);

    const updateQuery = 
    `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id =$${idx}
      RETURNING user_name, email, password, group_name, role;
    `;

    const updateResult = await pool.query(updateQuery, values);

    if (updateResult.rows.length === 0){
      return res.status(404).json({message: 'User not found'});
    }

    // Fetch response
    const joinResult = await pool.query(
      `
      SELECT
      user_name, email, password, group_name, role
      FROM users
      WHERE id = $1
      `, [userId]
    );

    res.json({
      message: "User Updated",
      user: joinResult.rows[0]
    });

  }catch(err){
    console.error('PATCH user error: ', err);
    res.status(500).json({ error: err.message});

  }
  
})

// ==========================
// DELETE an users
// ==========================

router.delete('/delete/:id', async (req, res) => {
  try{
    const { id } = req.params;
    const userId = Number(id);

    // vaildate ID
    if (Number.isNaN(userId) || userId <= 0 ){
      return res.status(400).json({message: 'Invalid User Id'})
    };

    // DELETE and return deleted rows
    const result = await pool.query(
      `
      
      DELETE from users
      WHERE id = $1
      RETURNING user_name, email, group_name, role

      `, [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({message: 'User Not Found'})
    }

    return res.status(200).json({
      message: 'User Deleted',
      deleted: result.rows[0],
    });

  }catch(err){
    console.error('Delted User Error:', err);
    return res.status(500).json({ error: err.message})

  };
  
});



module.exports = router;