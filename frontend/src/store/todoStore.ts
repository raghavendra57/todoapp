import { create } from 'zustand';
import apiClient from '../api/client';

export interface Todo {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  reminderTime?: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  isLoading: boolean;
  error: string | null;
  fetchTodos: () => Promise<void>;
  addTodo: (todo: Partial<Todo>) => Promise<void>;
  updateTodo: (id: string, todo: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  isLoading: false,
  error: null,
  fetchTodos: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.get('todos');
      set({ todos: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch todos', isLoading: false });
    }
  },
  addTodo: async (todo) => {
    try {
      const { data } = await apiClient.post('todos', todo);
      set({ todos: [...get().todos, data] });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to add todo' });
    }
  },
  updateTodo: async (id, todo) => {
    try {
      const { data } = await apiClient.put(`todos/${id}`, todo);
      set({ todos: get().todos.map(t => (t.id === id ? data : t)) });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to update todo' });
    }
  },
  deleteTodo: async (id) => {
    try {
      await apiClient.delete(`todos/${id}`);
      set({ todos: get().todos.filter(t => t.id !== id) });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to delete todo' });
    }
  }
}));
