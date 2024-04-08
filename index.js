const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const app = express();
const port = 8080;

app.use(bodyParser.json());

// MySQL 연결 설정
const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'todoList'
});
// To-Do 항목 생성
app.post('/todos', (req, res) => {
    const todo = req.body;
    pool.query('INSERT INTO todos SET ?', todo, (error, results, fields) => {
        if (error) throw error;
        res.status(201).send(`Todo added with ID: ${results.insertId}`);
    });
});

// To-Do 항목 조회
app.get('/todos', (req, res) => {
    pool.query('SELECT * FROM todos', (error, results, fields) => {
        if (error) throw error;
        res.json(results);
    });
});

// To-Do 항목 업데이트
app.put('/todos/:id', (req, res) => {
    const { id } = req.params;
    const todo = req.body;
    pool.query('UPDATE todos SET ? WHERE id = ?', [todo, id], (error, results, fields) => {
        if (error) throw error;
        res.send('Todo updated successfully.');
    });
});

// To-Do 항목 삭제
app.delete('/todos/:id', (req, res) => {
    const { id } = req.params;
    pool.query('DELETE FROM todos WHERE id = ?', id, (error, results, fields) => {
        if (error) throw error;
        res.send('Todo deleted successfully.');
    });
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
