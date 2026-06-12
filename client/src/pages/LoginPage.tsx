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
      setError(e.body?.error ?? 'Giriş başarısız');
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
          <h2>Tekrar Hoş Geldin</h2>
          <p className="text-muted">Devam etmek için hesabına giriş yap.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="login-username">Kullanıcı Adı</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                id="login-username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Kullanıcı adınızı girin"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Şifre</label>
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
                <span>Giriş Yap</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>Hesabın yok mu? <Link to="/register" className="text-primary font-bold">Hemen Kayıt Ol</Link></p>
        </div>

        <div className="demo-info-card">
          <div className="demo-info-header">
            <ShieldCheck size={14} />
            <strong>Demo Hesap Bilgileri:</strong>
          </div>
          <div className="demo-credentials">
            <div className="credential-row">
              <span>Admin:</span> <code>admin / Admin123!</code>
            </div>
            <div className="credential-row">
              <span>Kullanıcı:</span> <code>user1 / User123!</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
