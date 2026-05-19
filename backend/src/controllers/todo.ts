import { Response } from 'express';
import crypto from 'crypto';
import redisClient from '../config/redis';
import { encrypt, decrypt } from '../utils/crypto';
import { AuthRequest } from '../middleware/auth';

interface Todo {
  id: string;
  title: string;
  description: string; // Encrypted in Redis
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  reminderTime?: string;
  completed: boolean;
}

export const getTodos = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const todosKey = `user:${userId}:todos`;
  const data = await redisClient.get(todosKey);
  
  if (!data) return res.json([]);

  const todos: Todo[] = JSON.parse(data);
  const decryptedTodos = todos.map(t => ({
    ...t,
    description: decrypt(t.description)
  }));

  res.json(decryptedTodos);
};

export const createTodo = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { title, description, priority, dueDate, reminderTime } = req.body;
  
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const newTodo: Todo = {
    id: crypto.randomUUID(),
    title,
    description: encrypt(description || ''),
    priority: priority || 'Low',
    dueDate,
    reminderTime,
    completed: false
  };

  const todosKey = `user:${userId}:todos`;
  const existingData = await redisClient.get(todosKey);
  const todos: Todo[] = existingData ? JSON.parse(existingData) : [];
  
  todos.push(newTodo);
  await redisClient.set(todosKey, JSON.stringify(todos));

  res.status(201).json({ ...newTodo, description: description || '' });
};

export const updateTodo = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const todoId = req.params.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const todosKey = `user:${userId}:todos`;
  const existingData = await redisClient.get(todosKey);
  if (!existingData) return res.status(404).json({ error: 'Todo not found' });

  const todos: Todo[] = JSON.parse(existingData);
  const index = todos.findIndex(t => t.id === todoId);
  
  if (index === -1) return res.status(404).json({ error: 'Todo not found' });

  const { title, description, priority, dueDate, reminderTime, completed } = req.body;

  if (title !== undefined) todos[index].title = title;
  if (description !== undefined) todos[index].description = encrypt(description);
  if (priority !== undefined) todos[index].priority = priority;
  if (dueDate !== undefined) todos[index].dueDate = dueDate;
  if (reminderTime !== undefined) todos[index].reminderTime = reminderTime;
  if (completed !== undefined) todos[index].completed = completed;

  await redisClient.set(todosKey, JSON.stringify(todos));

  res.json({
    ...todos[index],
    description: description !== undefined ? description : decrypt(todos[index].description)
  });
};

export const deleteTodo = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const todoId = req.params.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const todosKey = `user:${userId}:todos`;
  const existingData = await redisClient.get(todosKey);
  if (!existingData) return res.status(404).json({ error: 'Todo not found' });

  let todos: Todo[] = JSON.parse(existingData);
  todos = todos.filter(t => t.id !== todoId);

  await redisClient.set(todosKey, JSON.stringify(todos));
  res.json({ message: 'Todo deleted successfully' });
};
