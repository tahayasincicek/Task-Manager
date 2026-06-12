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
      setError(errs ? errs.map((x) => x.message).join(', ') : (e.body?.error ?? 'Kayıt başarısız'));
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
          <h2>Yeni Hesap Oluştur</h2>
          <p className="text-muted">Hemen kayıt ol ve projelerini yönetmeye baş.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="register-username">Kullanıcı Adı</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                id="register-username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Örn: ahmet_yilmaz"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="register-email">E-posta</label>
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
            <label htmlFor="register-password">Şifre</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="En az 6 karakter"
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
                <span>Kayıt Ol</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>Zaten hesabın var mı? <Link to="/login" className="text-primary font-bold">Giriş Yap</Link></p>
        </div>
      </div>
    </div>
  );
}
