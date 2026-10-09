import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  Sparkles,
  UserRound,
  Volume2,
  VolumeX,
} from 'lucide-react';
import tableBackground from '../../images/Hardwood_card_table_in_room_20261009111309.jpg';
import { getSupabaseClient } from '../lib/supabase';

type CreateAccountScreenProps = {
  isMuted: boolean;
  onToggleMusic: () => void;
  onBackToSignIn: () => void;
  onAccountCreated: () => void;
};

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function CreateAccountScreen({
  isMuted,
  onToggleMusic,
  onBackToSignIn,
  onAccountCreated,
}: CreateAccountScreenProps) {
  const [firstName, setFirstName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countryCode, setCountryCode] = useState('+254');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [verificationRequested, setVerificationRequested] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isConfirmingCode, setIsConfirmingCode] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [status, setStatus] = useState('');

  const hasValidEmail = EMAIL_PATTERN.test(email.trim());
  const hasValidPhone = phone.replace(/\D/g, '').length >= 7;
  const hasValidPassword = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isProfileLocked = verificationRequested || emailVerified;
  const hasCompleteProfile = Boolean(
    firstName.trim() &&
    secondName.trim() &&
    nickname.trim() &&
    hasValidEmail &&
    hasValidPassword &&
    passwordsMatch &&
    hasValidPhone &&
    gender,
  );
  const canCreateAccount = hasCompleteProfile && emailVerified;

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setVerificationRequested(false);
    setVerificationCode('');
    setEmailVerified(false);
    setStatus('');
  };

  const handleVerifyEmail = async () => {
    if (!hasCompleteProfile) {
      setStatus('Complete the required fields and use matching passwords before verifying your email.');
      return;
    }

    setIsSendingVerification(true);
    setStatus('');
    try {
      const supabase = getSupabaseClient();
      if (verificationRequested) {
        const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              second_name: secondName.trim(),
              nickname: nickname.trim(),
              phone: `${countryCode}${phone.replace(/\D/g, '')}`,
              gender,
            },
          },
        });

        if (error) throw error;
        if (data.session && data.user?.email_confirmed_at) {
          setEmailVerified(true);
          setStatus('Your email is confirmed. You can finish creating your account.');
          return;
        }
        setVerificationRequested(true);
      }

      setVerificationCode('');
      setStatus(`A verification code was sent to ${email.trim()}. Check your inbox and spam folder.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send the verification email.');
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleConfirmCode = async () => {
    if (!/^\d{6}$/.test(verificationCode)) {
      setStatus('Enter the 6-digit code from your confirmation email.');
      return;
    }

    setIsConfirmingCode(true);
    setStatus('');
    try {
      const { data, error } = await getSupabaseClient().auth.verifyOtp({
        email: email.trim(),
        token: verificationCode,
        type: 'signup',
      });
      if (error) throw error;
      if (!data.session) throw new Error('Email was verified, but no active session was returned. Please sign in.');

      setEmailVerified(true);
      setStatus('Email verified. Your profile is ready.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not verify that code.');
    } finally {
      setIsConfirmingCode(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreateAccount) return;

    setIsCreatingAccount(true);
    setStatus('');
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) throw new Error('Your verified session expired. Please sign in again.');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.session.user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile) throw new Error('Your profile was not created. Check the Auth profile trigger and policies.');

      onAccountCreated();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not finish account creation.');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  return (
    <main className="sign-in-screen create-account-screen">
      <img className="sign-in-background" src={tableBackground} alt="" aria-hidden="true" />
      <div className="sign-in-atmosphere" aria-hidden="true" />
      <div className="sign-in-card-glow" aria-hidden="true" />

      <header className="sign-in-header">
        <button className="sign-in-back" type="button" onClick={onBackToSignIn}>
          <ArrowLeft size={18} />
          Back to sign in
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

      <section className="sign-in-stage create-account-stage" aria-label="Create a Niko Kadi account">
        <div className="sign-in-frame" aria-hidden="true">
          <div className="sign-in-frame-shine" />
        </div>

        <div className="sign-in-card create-account-card" aria-labelledby="create-account-title">
          <div className="sign-in-brand">
            <span className="sign-in-brand-mark">N</span>
            <div>
              <strong>NIKO KADI</strong>
              <small>Kenyan classic card game</small>
            </div>
          </div>

          <div className="sign-in-copy">
            <p className="sign-in-kicker"><Sparkles size={14} /> Welcome to the table</p>
            <h1 id="create-account-title">Create your account</h1>
            <p>Join the table and make your place.</p>
          </div>

          <form className="sign-in-form create-account-form" onSubmit={handleSubmit} noValidate>
            <label className="create-account-field">
              <span>First name</span>
              <span className="sign-in-input-wrap">
                <UserRound size={17} />
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Enter first name"
                  autoComplete="given-name"
                  disabled={isProfileLocked}
                  required
                />
              </span>
            </label>

            <label className="create-account-field">
              <span>Second name</span>
              <span className="sign-in-input-wrap">
                <UserRound size={17} />
                <input
                  value={secondName}
                  onChange={(event) => setSecondName(event.target.value)}
                  placeholder="Enter second name"
                  autoComplete="family-name"
                  disabled={isProfileLocked}
                  required
                />
              </span>
            </label>

            <label className="create-account-field create-account-field--full">
              <span>Nickname</span>
              <span className="sign-in-input-wrap">
                <input
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="Choose a nickname"
                  autoComplete="nickname"
                  disabled={isProfileLocked}
                  required
                />
              </span>
            </label>

            <div className="create-account-email-row">
              <label className="create-account-field">
                <span>Email address</span>
                <span className="sign-in-input-wrap">
                  <Mail size={17} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => handleEmailChange(event.target.value)}
                    placeholder="Enter your email"
                    autoComplete="email"
                    aria-describedby="create-account-status"
                    disabled={isProfileLocked}
                    required
                  />
                </span>
              </label>
              <button
                className="create-account-verify"
                type="button"
                onClick={handleVerifyEmail}
                disabled={!hasCompleteProfile || emailVerified || isSendingVerification}
              >
                {emailVerified ? <CheckCircle2 size={17} /> : <Mail size={17} />}
                {emailVerified ? 'Verified' : isSendingVerification ? 'Sending…' : verificationRequested ? 'Resend code' : 'Verify email'}
              </button>
            </div>

            {verificationRequested && !emailVerified && (
              <div className="create-account-code-row">
                <label className="create-account-field">
                  <span>Verification code</span>
                  <span className="sign-in-input-wrap">
                    <input
                      value={verificationCode}
                      onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      aria-describedby="verification-code-note"
                    />
                  </span>
                </label>
                <button
                  className="create-account-confirm"
                  type="button"
                  onClick={handleConfirmCode}
                  disabled={isConfirmingCode || verificationCode.length !== 6}
                >
                  {isConfirmingCode ? 'Checking…' : 'Confirm code'}
                </button>
                <p id="verification-code-note">Enter the six-digit code from your confirmation email.</p>
              </div>
            )}

            <label className="create-account-field create-account-field--full">
              <span>Password</span>
              <span className="sign-in-input-wrap">
                <LockKeyhole size={17} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  aria-describedby="create-account-password-hint"
                  disabled={isProfileLocked}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={isProfileLocked}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
            <p id="create-account-password-hint" className="create-account-password-hint">
              Use at least 8 characters.
            </p>

            <label className="create-account-field create-account-field--full">
              <span>Confirm password</span>
              <span className="sign-in-input-wrap">
                <LockKeyhole size={17} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Enter your password again"
                  autoComplete="new-password"
                  aria-describedby="create-account-password-match"
                  disabled={isProfileLocked}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                  disabled={isProfileLocked}
                >
                  {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
            {confirmPassword && !passwordsMatch && (
              <p id="create-account-password-match" className="create-account-password-hint create-account-password-hint--error">
                Passwords do not match.
              </p>
            )}

            <label className="create-account-field">
              <span>Phone number</span>
              <span className="sign-in-input-wrap create-account-phone-wrap">
                <Phone size={17} />
                <select
                  className="create-account-country"
                  aria-label="Country calling code"
                  value={countryCode}
                  onChange={(event) => setCountryCode(event.target.value)}
                  disabled={isProfileLocked}
                >
                  <option value="+254">KE +254</option>
                  <option value="+256">UG +256</option>
                  <option value="+255">TZ +255</option>
                  <option value="+250">RW +250</option>
                  <option value="+1">US +1</option>
                  <option value="+44">UK +44</option>
                </select>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="712 345 678"
                  autoComplete="tel-national"
                  disabled={isProfileLocked}
                  required
                />
              </span>
            </label>

            <label className="create-account-field">
              <span>Gender</span>
              <span className="sign-in-input-wrap">
                <select
                  className="create-account-select"
                  value={gender}
                  onChange={(event) => setGender(event.target.value)}
                  disabled={isProfileLocked}
                  required
                >
                  <option value="" disabled>Select gender</option>
                  <option value="woman">Woman</option>
                  <option value="man">Man</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </span>
            </label>

            {emailVerified && (
              <p className="create-account-verified"><CheckCircle2 size={16} /> Email verified</p>
            )}

            <button className="sign-in-submit create-account-submit" type="submit" disabled={!canCreateAccount || isCreatingAccount}>
              {isCreatingAccount ? 'Opening your table…' : 'CREATE ACCOUNT'}
            </button>
          </form>

          {status && <p id="create-account-status" className="sign-in-status" role="status">{status}</p>}

          <p className="sign-in-legal">
            Already have an account? <button type="button" onClick={onBackToSignIn}>Sign in</button>
          </p>
        </div>
      </section>

      <footer className="sign-in-footer">
        <span>Built for local-first play</span>
          <span>Secure account registration</span>
      </footer>
    </main>
  );
}