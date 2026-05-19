import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';
import { ScanFace } from 'lucide-react';

export default function MfaSetup() {
  const [qrCode, setQrCode] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, setMfaVerified } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // If user has MFA enabled already, they just need to validate
    if (user?.mfaEnabled) {
      // we don't need QR code setup
    } else {
      setupMfa();
    }
  }, [user]);

  const setupMfa = async () => {
    try {
      const { data } = await apiClient.post('mfa/setup');
      setQrCode(data.qrCode);
    } catch (err) {
      setError('Failed to load MFA setup');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const endpoint = user?.mfaEnabled ? 'mfa/validate' : 'mfa/verify';
      await apiClient.post(endpoint, { token: otp });
      setMfaVerified();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    setError('');
    setLoading(true);
    try {
      await apiClient.post('mfa/send-email');
      alert('A 6-digit code has been sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="card w-full max-w-md p-8 animate-slide-up">
        <div className="flex justify-center mb-6">
          <div className="bg-primary-100 dark:bg-primary-900/30 p-4 rounded-full">
            <ScanFace className="w-10 h-10 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-2">Two-Factor Authentication</h2>
        
        <div className="mb-6 flex flex-col items-center">
          {!user?.mfaEnabled ? (
            <>
              <p className="text-center text-slate-500 dark:text-slate-400 mb-4">
                Scan this QR code with Google Authenticator OR get a code via email.
              </p>
              {qrCode ? (
                <img src={qrCode} alt="MFA QR Code" className="w-48 h-48 border border-slate-200 rounded-lg p-2 bg-white" />
              ) : (
                <div className="w-48 h-48 bg-slate-100 dark:bg-dark-700 rounded-lg animate-pulse"></div>
              )}
            </>
          ) : (
            <p className="text-center text-slate-500 dark:text-slate-400 mb-4">
              Enter the 6-digit code from your app OR get a code via email.
            </p>
          )}
          
          <button 
            type="button"
            onClick={handleSendEmail}
            className="mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium underline"
          >
            Send code to my email instead
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800">{error}</div>}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Authentication Code</label>
            <input 
              type="text" 
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="input-field text-center tracking-widest font-mono text-lg"
              placeholder="000000"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading || otp.length !== 6}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );
}
