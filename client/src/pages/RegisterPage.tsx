import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

interface Props {
  readonly onLogin: (user: { userId: number; role: 'admin' | 'user'; username: string }) => void;
}

import { UserPlus, User, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';

export default function RegisterPage({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.register(username, email, password);
      await api.auth.login(username, password);
      const me = await api.auth.me();
      onLogin(me);
      navigate('/tasks');
    } catch (err: unknown) {
      const e = err as { body?: { errors?: { message: string }[]; error?: string } };
      const errs = e.body?.errors;
      setError(errs ? errs.map((x) => x.message).join(', ') : (e.body?.error ?? 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <UserPlus size={32} className="text-primary" />
          </div>
          <h2>Create New Account</h2>
          <p className="text-muted">Register now and start managing your projects.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="register-username">Username</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                id="register-username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. john_doe"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="register-email">Email</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ahmet@example.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="register-password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
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
                <span>Register</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login" className="text-primary font-bold">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}
