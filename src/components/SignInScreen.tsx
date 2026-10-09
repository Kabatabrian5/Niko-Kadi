import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  LogIn,
  LockKeyhole,
  Mail,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';

type SignInScreenProps = {
  isMuted: boolean;
  onToggleMusic: () => void;
  onContinue: () => void;
  onBackToHub: () => void;
  onRegister: () => void;
};

export function SignInScreen({
  isMuted,
  onToggleMusic,
  onContinue,
  onBackToHub,
  onRegister,
}: SignInScreenProps) {
  const [email, setEmail] = useState(() => localStorage.getItem('niko-kadi-email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem('niko-kadi-email')));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('');

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setStatus('Enter a valid email address to continue.');
      return;
    }

    if (password.length < 8) {
      setStatus('Your password must contain at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await getSupabaseClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (!data.session) throw new Error('Sign-in did not return an active session.');

      if (rememberMe) localStorage.setItem('niko-kadi-email', email.trim());
      else localStorage.removeItem('niko-kadi-email');
      onContinue();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setStatus('');
    try {
      const { error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Google sign-in is not available.');
    }
  };

  const handleGuest = () => {
    setStatus('Guest access enabled.');
    onContinue();
  };

  const handleForgotPassword = () => {
    setStatus(email.trim()
      ? 'Password recovery is not connected yet.'
      : 'Enter your email address first.');
  };

  return (
    <main className="sign-in-screen">
      <img
        className="sign-in-background"
        src="/assets/Playing_cards_on_hardwood_table_20261008160119.jpg"
        alt=""
        aria-hidden="true"
      />
      <div className="sign-in-atmosphere" aria-hidden="true" />
      <div className="sign-in-card-glow" aria-hidden="true" />

      <header className="sign-in-header">
        <button className="sign-in-back" type="button" onClick={onBackToHub}>
          <ArrowLeft size={18} />
          Back to hub
        </button>
        <button
          className="global-audio-button"
          type="button"
          onClick={onToggleMusic}
          aria-label={isMuted ? 'Unmute background music' : 'Mute background music'}
        >
          {isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}
        </button>
      </header>

      <section className="sign-in-stage" aria-label="Niko Kadi sign in">
        <div className="sign-in-frame" aria-hidden="true">
          <div className="sign-in-frame-shine" />
        </div>

        <div className="sign-in-card" aria-labelledby="sign-in-title">
          <div className="sign-in-brand">
            <span className="sign-in-brand-mark">N</span>
            <div>
              <strong>NIKO KADI</strong>
              <small>Kenyan classic card game</small>
            </div>
          </div>

          <div className="sign-in-copy">
            <p className="sign-in-kicker"><Sparkles size={14} /> Welcome back</p>
            <h1 id="sign-in-title">Sign In to Play</h1>
            <p>Join the table and continue your journey.</p>
          </div>

          <form className="sign-in-form" onSubmit={handleSubmit} noValidate>
            <label>
              <span>Email address</span>
              <span className="sign-in-input-wrap">
                <Mail size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  aria-describedby="sign-in-status"
                />
              </span>
            </label>

            <label>
              <span>Password</span>
              <span className="sign-in-input-wrap">
                <LockKeyhole size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-describedby="sign-in-status"
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            <div className="sign-in-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span><Check size={12} /> Remember me</span>
              </label>
              <button type="button" onClick={handleForgotPassword}>Forgot Password?</button>
            </div>

            <button className="sign-in-submit" type="submit" disabled={isSubmitting}>
              <LogIn size={18} />
              {isSubmitting ? 'Signing in…' : 'SIGN IN'}
            </button>
          </form>

          <div className="sign-in-divider"><span>or continue with</span></div>

          <button className="google-button" type="button" onClick={handleGoogle}>
            <span className="google-g" aria-hidden="true">G</span>
            Continue with Google
          </button>

          <button className="guest-button" type="button" onClick={handleGuest}>
            <span className="guest-icon">N</span>
            Play as guest
          </button>

          {status && <p id="sign-in-status" className="sign-in-status" role="status">{status}</p>}

          <p className="sign-in-legal">
            Don't have a Niko Kadi account? <button type="button" onClick={onRegister}>Click here to Register</button>
          </p>
        </div>
      </section>

      <footer className="sign-in-footer">
        <span>Built for local-first play</span>
        <span>Offline practice never changes your leaderboard</span>
      </footer>
    </main>
  );
}
