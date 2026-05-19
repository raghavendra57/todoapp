import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, CheckSquare, Crown, Sun, Moon, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, isPremium, logout } = useAuthStore();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

  const handleLogout = async () => {
    try {
      await apiClient.post('auth/logout');
      logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const toggleTheme = () => {
    if (theme === 'light') {
      document.documentElement.classList.add('dark');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      setTheme('light');
    }
  };

  return (
    <nav className="bg-white dark:bg-dark-800 border-b border-slate-200 dark:border-dark-700 sticky top-0 z-10 transition-colors duration-300">
      <div className="container mx-auto px-4 max-w-5xl h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary-600 dark:text-primary-400">
          <CheckSquare className="w-6 h-6" />
          <span>SecureTodo</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <Link 
            to="/mfa-setup" 
            className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden xs:inline">Security</span>
          </Link>

          {isPremium && (
            <span className="flex items-center gap-1 text-sm font-semibold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md">
              <Crown className="w-4 h-4" />
              Premium
            </span>
          )}
          
          <button onClick={toggleTheme} className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-full hover:bg-slate-100 dark:hover:bg-dark-700 transition-colors">
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          <div className="hidden sm:block text-sm font-medium">
            {user?.email}
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
