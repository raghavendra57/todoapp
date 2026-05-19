// Simple in-memory todos for serverless (Vercel)
let todos = [];

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ todos });
  }
  if (req.method === 'POST') {
    try {
      const { title } = req.body || {};
      if (!title || !String(title).trim()) return res.status(400).json({ error: 'title required' });
      const todo = { id: Date.now().toString(36), title: String(title).trim() };
      todos.push(todo);
      return res.status(201).json({ todo });
    } catch (e) {
      return res.status(500).json({ error: 'bad request' });
    }
  }
  return res.status(405).json({ error: 'method not allowed' });
}
