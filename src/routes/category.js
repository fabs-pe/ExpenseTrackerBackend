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

// GET category by ID

// GET category by name