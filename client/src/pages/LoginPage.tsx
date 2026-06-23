import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

interface Props {
  readonly onLogin: (user: { userId: number; role: 'admin' | 'user'; username: string }) => void;
}

import { User, Lock, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.login(username, password);
      const me = await api.auth.me();
      onLogin(me);
    } catch (err: unknown) {
      const e = err as { body?: { error?: string } };
      setError(e.body?.error ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <ShieldCheck size={32} className="text-primary" />
          </div>
          <h2>Welcome Back</h2>
          <p className="text-muted">Sign in to your account to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="login-username">Username</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                id="login-username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="error-badge">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button className="btn-primary-gradient full-width" type="submit" disabled={loading}>
            {loading ? (
              <div className="spinner-xs" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register" className="text-primary font-bold">Register Now</Link></p>
        </div>

        <div className="demo-info-card">
          <div className="demo-info-header">
            <ShieldCheck size={14} />
            <strong>Demo Account Info:</strong>
          </div>
          <div className="demo-credentials">
            <div className="credential-row">
              <span>Admin:</span> <code>admin / Admin123!</code>
            </div>
            <div className="credential-row">
              <span>User:</span> <code>user1 / User123!</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
