import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MfaSetup from './pages/MfaSetup';
import Navbar from './components/Navbar';
import { useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

function App() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Check dark mode preference on load
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id';

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Router>
        <div className="min-h-screen bg-slate-50 dark:bg-dark-900 transition-colors duration-300">
          {isAuthenticated && <Navbar />}
          <main className="container mx-auto px-4 py-8 max-w-5xl">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/mfa-setup" element={<MfaSetup />} />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
