const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = 8080;

app.use(bodyParser.json());

const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'todoList'
});

const jwtSecret = 'your_jwt_secret';  // Secret for signing tokens
const jwtRefreshSecret = 'your_jwt_refresh_secret';  // Secret for signing refresh tokens

// User sign-up
app.post('/signup', (req, res) => {
    const { id, password } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) throw err;
        const user = { id, password: hash };
        pool.query('INSERT INTO users SET ?', user, (error, results) => {
            if (error) throw error;
            res.status(201).send('User signed up successfully');
        });
    });
});

// User sign-in
app.post('/signin', (req, res) => {
    const { id, password } = req.body;
    pool.query('SELECT * FROM users WHERE id = ?', [id], (error, results) => {
        if (error) throw error;
        if (results.length === 0) return res.status(401).send('Authentication failed');

        const user = results[0];
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) throw err;
            if (!isMatch) return res.status(401).send('Authentication failed');

            const accessToken = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '5m' });
            const refreshToken = jwt.sign({ id: user.id }, jwtRefreshSecret, { expiresIn: '2w' });

            pool.query('UPDATE users SET refreshToken = ? WHERE id = ?', [refreshToken, id], (error) => {
                if (error) throw error;
                res.json({ accessToken, refreshToken });
            });
        });
    });
});

// Refresh access token
app.post('/refresh', (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).send('Refresh token required');

    jwt.verify(refreshToken, jwtRefreshSecret, (err, decoded) => {
        if (err) return res.status(401).send('Invalid refresh token');

        pool.query('SELECT * FROM users WHERE id = ? AND refreshToken = ?', [decoded.id, refreshToken], (error, results) => {
            if (error) throw error;
            if (results.length === 0) return res.status(401).send('Invalid refresh token');

            const accessToken = jwt.sign({ id: decoded.id }, jwtSecret, { expiresIn: '5m' });
            res.json({ accessToken });
        });
    });
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) return res.sendStatus(401);
        req.user = user;
        next();
    });
};

// To-Do CRUD operations
// To-Do 항목 생성
app.post('/todos', authenticateToken, (req, res) => {
    const todo = req.body;
    pool.query('INSERT INTO todos SET ?', todo, (error, results) => {
        if (error) throw error;
        res.status(201).send(`Todo added with ID: ${results.insertId}`);
    });
});

// To-Do 항목 조회
app.get('/todos', authenticateToken, (req, res) => {
    pool.query('SELECT * FROM todos', (error, results) => {
        if (error) throw error;
        res.json(results);
    });
});

// To-Do 항목 업데이트
app.put('/todos/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const todo = req.body;
    pool.query('UPDATE todos SET ? WHERE id = ?', [todo, id], (error) => {
        if (error) throw error;
        res.send('Todo updated successfully.');
    });
});

// To-Do 항목 삭제
app.delete('/todos/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    pool.query('DELETE FROM todos WHERE id = ?', id, (error) => {
        if (error) throw error;
        res.send('Todo deleted successfully.');
    });
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
