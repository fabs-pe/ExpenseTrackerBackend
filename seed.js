// seed.js - Complete working version for your exact Supabase schema
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 Connecting to Supabase...');
    await client.query('BEGIN');

    // 1. Clear existing data (in FK-safe order)
    await client.query('DELETE FROM expenses;');
    await client.query('DELETE FROM categories;');
    await client.query('DELETE FROM users;');

    // 2. Insert USERS (matches your users table: created_at, user_name, email, password, group_name, role)
    const now = new Date().toISOString();
    const insertUsersText = `
      INSERT INTO users (created_at, user_name, email, password, group_name, role)
      VALUES 
        ($1, $2, $3, $4, $5, $6),
        ($7, $8, $9, $10, $11, $12),
        ($13, $14, $15, $16, $17, $18)
      RETURNING id;
    `;
    
    const usersValues = [
      now, 'Fabian', 'fabian@email.com', 'password13', 'devgroup12e', null,
      now, 'Alice', 'alice@email.com', 'password42', 'devgroup12e', 'adult',
      now, 'Matisse', 'matisse@email.com', 'password13', '9888112e', 'adult',
    ];

    const { rows: userRows } = await client.query(insertUsersText, usersValues);
    const fabianId = userRows[0].id;
    const aliceId = userRows[1].id;
    const matisseId = userRows[2].id;
    console.log('✅ Users seeded:', userRows.map(u => u.id));

    // 3. Insert CATEGORIES (matches your categories table: created_at, category_name, category_desc)
    const insertCategoriesText = `
      INSERT INTO categories (created_at, category_name, category_desc)
      VALUES 
        ($1, $2, $3),
        ($4, $5, $6),
        ($7, $8, $9),
        ($10, $11, $12)
      RETURNING cat_id;
    `;
    
    const categoriesValues = [
      now, 'Car', 'All car expenses',
      now, 'Groceries', 'all food and beverage bought from shops',
      now, 'entertainment', 'going out not including restaurants',
      now, 'Alcohol', ' from the',
    ];

    const { rows: categoryRows } = await client.query(insertCategoriesText, categoriesValues);
    const carId = categoryRows[0].cat_id;
    const groceriesId = categoryRows[1].cat_id;
    const entertainmentId = categoryRows[2].cat_id;
    const alcoholId = categoryRows[3].cat_id;
    console.log('✅ Categories seeded:', categoryRows.map(c => c.cat_id));

    // Insert EXPENSES (matches expenses table)
 const insertExpensesText = `
  INSERT INTO expenses (cat_id, expense_name, description, amount, date, user_id)
  VALUES 
    ($1, $2, $3, $4, $5, $6),
    ($7, $8, $9, $10, $11, $12),
    ($13, $14, $15, $16, $17, $18),
    ($19, $20, $21, $22, $23, $24);
`;

const expensesValues = [
  // Petrol - user_id as ARRAY['80']
  carId, 'Petrol', 'Petrol to school', 45, '2025-04-12T00:00:00Z', `${fabianId}`,
  
  // Food
  groceriesId, 'Food', 'food for dinner on tueday', 100, '2025-01-02T00:00:00Z', `${aliceId}`,
  
  // Lunch Food
  groceriesId, 'Lunch Food', 'Food for the week lunches', 150, '2025-03-13T00:00:00Z', `${fabianId}`,
  
  // Long Weekend
  alcoholId, 'Long Weekend', 'all beverages for the weekend', 400, '2025-01-02T00:00:00Z', `${matisseId}`,
];

await client.query(insertExpensesText, expensesValues);
console.log('✅ Expenses seeded');

    await client.query('COMMIT');
    console.log('🎉 Database fully seeded!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    console.error('Full error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
