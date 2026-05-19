import { format } from 'date-fns';
import { Calendar, Clock, AlertCircle, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { type Todo } from '../store/todoStore';

interface TodoItemProps {
  todo: Todo;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
  onDelete: (id: string) => void;
}

export default function TodoItem({ todo, onUpdate, onDelete }: TodoItemProps) {
  const isOverdue = new Date(todo.dueDate) < new Date() && !todo.completed;

  const priorityColors = {
    Low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    High: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className={`card p-4 transition-all duration-300 ${todo.completed ? 'opacity-60 bg-slate-50 dark:bg-dark-900/50' : 'hover:shadow-md hover:border-primary-200 dark:hover:border-primary-900/50'}`}>
      <div className="flex items-start gap-3">
        <button 
          onClick={() => onUpdate(todo.id, { completed: !todo.completed })}
          className="mt-1 text-slate-400 hover:text-primary-500 transition-colors"
        >
          {todo.completed ? (
            <CheckCircle2 className="w-6 h-6 text-primary-500" />
          ) : (
            <Circle className="w-6 h-6" />
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-1">
            <h3 className={`font-semibold text-lg truncate ${todo.completed ? 'line-through text-slate-500' : ''}`}>
              {todo.title}
            </h3>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${priorityColors[todo.priority]}`}>
              {todo.priority}
            </span>
          </div>
          
          <p className={`text-sm mb-3 ${todo.completed ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
            {todo.description || 'No description provided.'}
          </p>
          
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(todo.dueDate), 'MMM d, yyyy')}
            </div>
            
            {todo.reminderTime && (
              <div className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
                <Clock className="w-3.5 h-3.5" />
                {format(new Date(todo.reminderTime), 'h:mm a')}
              </div>
            )}
            
            {isOverdue && (
              <div className="flex items-center gap-1 text-red-500">
                <AlertCircle className="w-3.5 h-3.5" />
                Overdue
              </div>
            )}
          </div>
        </div>
        
        <button 
          onClick={() => onDelete(todo.id)}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Delete Todo"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
