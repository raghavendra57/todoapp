import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.post('auth/google', { credential: credentialResponse.credential });
      login(data.user, data.requireMfa);
      if (data.requireMfa) {
        navigate('/mfa-setup');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error('Login failed', err);
      setError(err.response?.data?.error || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegister) {
        await apiClient.post('auth/register', formData);
        // After register, auto login
        const { data } = await apiClient.post('auth/login', { 
          email: formData.email, 
          password: formData.password 
        });
        login(data.user, data.requireMfa);
      } else {
        const { data } = await apiClient.post('auth/login', { 
          email: formData.email, 
          password: formData.password 
        });
        login(data.user, data.requireMfa);
      }
      navigate('/');
    } catch (err: any) {
      console.error('Auth error:', err);
      const msg = err.response?.data?.error || err.message || 'Authentication failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[85vh] px-4">
      <div className="card w-full max-w-md p-0 overflow-hidden animate-slide-up shadow-2xl border-none">
        <div className="bg-primary-600 p-8 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary-500 to-primary-700 opacity-50" />
            <div className="relative z-10 flex flex-col items-center">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md mb-4">
                    <Shield className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold">Secure Todo App</h2>
                <p className="text-primary-100 text-sm mt-1">
                    {isRegister ? 'Create your encrypted workspace' : 'Welcome back to your tasks'}
                </p>
            </div>
        </div>

        <div className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-100 dark:border-red-900/50">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    required={isRegister}
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="John Doe"
                    className="input-field pl-10"
                  />
                </div>
              </div>
            )}
            
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="name@gmail.com"
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                  className="input-field pl-10"
                />
              </div>
            </div>

            <button 
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-dark-900 px-2 text-slate-400 font-medium">Or continue with</span></div>
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Login Failed')}
              useOneTap
              shape="pill"
              theme="outline"
              size="large"
              width="300"
            />
          </div>

          <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors"
            >
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
