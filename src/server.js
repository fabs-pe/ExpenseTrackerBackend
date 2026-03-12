
const express = require('express');
const app = express();
// const expensesRouter = require('./routes/expenses');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
// app.use('/expenses', expensesRouter); // mount expenses router

// Welcome route
app.get('/', (req, res) => {
  res.json({ message: 'Expense Tracker API' });
});

//user route 
const UserController = require('./routes/users');
app.use("/users", UserController);

// expense route
const ExpenseController = require('./routes/expenses');
app.use("/expenses", ExpenseController);

// category route
const CatController = require('./routes/category');
app.use("/category", CatController);

// 404 route
app.get('*', (req, res) => {
  res.status(404).json({ message: 'No route with that path!' });
});

module.exports = app;
