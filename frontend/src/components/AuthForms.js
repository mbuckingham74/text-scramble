import React from 'react';

export function LoginForm({ onLogin, onRegister, onBack, error }) {
  return (
    <div className="app">
      <div className="auth-form">
        <h1>Login</h1>
        {error && <p className="auth-error">{error}</p>}
        <form onSubmit={(e) => {
          e.preventDefault();
          const form = e.target;
          onLogin(form.username.value, form.password.value);
        }}>
          <input type="text" name="username" placeholder="Username" required />
          <input type="password" name="password" placeholder="Password" required />
          <button type="submit" className="btn primary">Login</button>
        </form>
        <p className="auth-switch">
          Don't have an account?{' '}
          <button className="link-btn" onClick={onRegister}>Register</button>
        </p>
        <button className="btn secondary" onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

export function RegisterForm({ onRegister, onLogin, onBack, error }) {
  return (
    <div className="app">
      <div className="auth-form">
        <h1>Register</h1>
        {error && <p className="auth-error">{error}</p>}
        <form onSubmit={(e) => {
          e.preventDefault();
          const form = e.target;
          onRegister(form.username.value, form.password.value);
        }}>
          <input type="text" name="username" placeholder="Username (3-20 chars)" required />
          <input type="password" name="password" placeholder="Password (8+ chars, mixed case + number)" required minLength="8" />
          <button type="submit" className="btn primary">Register</button>
        </form>
        <p className="auth-switch">
          Already have an account?{' '}
          <button className="link-btn" onClick={onLogin}>Login</button>
        </p>
        <button className="btn secondary" onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

export function AdminLoginForm({ onLogin, onBack, error }) {
  return (
    <div className="app">
      <div className="auth-form">
        <h1>Admin Login</h1>
        {error && <p className="auth-error">{error}</p>}
        <form onSubmit={(e) => {
          e.preventDefault();
          const form = e.target;
          onLogin(form.username.value, form.password.value);
        }}>
          <input type="text" name="username" placeholder="Admin Username" required />
          <input type="password" name="password" placeholder="Admin Password" required />
          <button type="submit" className="btn primary">Login</button>
        </form>
        <button className="btn secondary" onClick={onBack}>Back</button>
      </div>
    </div>
  );
}
