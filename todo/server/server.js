const express = require("express");
const cors = require("cors");
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// In-memory todos (no database)
let todos = [];

// Health endpoint
app.get("/api/health", (req, res) => { res.json({ ok: true }); });

// Simple todos API
app.get('/api/todos', (req, res) => {
  res.json({ todos });
});
app.post('/api/todos', (req, res) => {
  const title = (req.body && req.body.title || '').toString().trim();
  if (!title) return res.status(400).json({ error: 'title required' });
  const todo = { id: Date.now().toString(36), title, completed: false };
  todos.push(todo);
  res.status(201).json({ todo });
});
app.patch('/api/todos/:id', (req, res) => {
  const t = todos.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });
  if (typeof req.body.title === 'string') t.title = req.body.title.trim();
  if (typeof req.body.completed === 'boolean') t.completed = req.body.completed;
  res.json({ todo: t });
});
app.delete('/api/todos/:id', (req, res) => {
  const len = todos.length;
  todos = todos.filter(x => x.id !== req.params.id);
  if (todos.length === len) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
});

app.get("/", (req, res) => {
  res.send("API Running (no database)");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
