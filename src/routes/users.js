const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

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
      return res.status(400).json({message: 'Inavlid User ID '});
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
      WHERE u.user_name = $1`, [user_name]);

      if (results.rows.length === 0 ){
        return res.status(404).json({message: 'User Name Not Found'});
      }

      res.json({
        message: 'User Found',
        user: results.rows[0]
      })
 

  } catch (err){
    console.error('Get User error:', err);
    res.status(500).json({ error: err.message});
  }

});


// // GET user by email
// // add permissions
// router.get('/:email', async (req, res) => {
//     try{

// })


// ||||||||||||||||||||||
//  POST ENDPOINT
// ||||||||||||||||||||||

//  POST create new user
router.post("/register", async (request, response) =>{
    try{
        let newUser = await User.create(request.body)
        response.status(201).json({message: 'User registered successfully!'});

        response.json({user: newUser});
    } catch (err){
        response.status(500).json({message: "An error occured during the registering User", error: err.message});

    }
});

// POST to users/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check for missing fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare password (you had a small typo here)
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.WORKER_JWT_KEY, // make sure this exists in .env
      { expiresIn: '3h' }
    );

    // Respond with token + user info
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
      },
    });

  } catch (err) {
    res.status(500).json({ message: 'Error logging in', error: err.message });
  }
});



module.exports = router;