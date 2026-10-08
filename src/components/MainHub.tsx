import { useState } from 'react';
import {
  Bot,
  Crown,
  Gamepad2,
  Globe2,
  LogIn,
  Medal,
  Settings,
  Sparkles,
  Trophy,
  UserRound,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from 'lucide-react';

// The hub is the main navigation surface. It receives the authentication state
// from the app and keeps all mode choices in one place for easy future routing.
type MainHubProps = {
  isMuted: boolean;
  onToggleMusic: () => void;
  onGuestPlay: () => void;
};

export function MainHub({ isMuted, onToggleMusic, onGuestPlay }: MainHubProps) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'online' | 'practice' | null>(
    null,
  );

  // Online and practice actions are intentionally separated. Online play will
  // later connect to rooms, while practice will start the local AI engine.
  const handleMode = (mode: 'online' | 'practice') => {
    setSelectedMode(mode);
    if (mode === 'practice') {
      onGuestPlay();
    }
  };

  return (
    <main className="hub-screen">
      <video
        className="hub-video"
        poster="/assets/loading-screen.jfif"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src="/assets/niko-kadi-background.mp4" type="video/mp4" />
      </video>
      <header className="hub-header">
        <a className="brand" href="#top" aria-label="Niko Kadi home">
          <span className="brand-mark">N</span>
          <span>
            <strong>NIKO KADI</strong>
            <small>Kenyan classic card game</small>
          </span>
        </a>

        <div className="hub-actions">
          <button className="profile-chip" type="button" onClick={() => setIsAuthOpen(true)}>
            <span className="avatar">O</span>
            <span className="profile-copy">
              <strong>Onyango</strong>
              <small>1,240 points</small>
            </span>
            <Crown size={16} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" aria-label="Open settings">
            <Settings size={20} aria-hidden="true" />
          </button>
          <button
            className="global-audio-button"
            type="button"
            onClick={onToggleMusic}
            aria-label={isMuted ? 'Unmute background music' : 'Mute background music'}
          >
            {isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>
        </div>
      </header>

      <section className="hub-hero" id="top">
        <div className="hero-copy">
          <p className="hero-kicker">
            <Sparkles size={15} aria-hidden="true" />
            Your table is ready
          </p>
          <h1>Niko Kadi</h1>
          <p>
            Match, question, kick, jump, and drink your way through a classic
            Kenyan card game.
          </p>
        </div>
        <div className="leaderboard-card">
          <div className="leaderboard-icon">
            <Trophy size={23} aria-hidden="true" />
          </div>
          <div>
            <span>Leaderboard</span>
            <strong>#12</strong>
          </div>
          <span className="leaderboard-points">1,240 pts</span>
        </div>
      </section>

      <section className="mode-grid" aria-label="Choose a game mode">
        <article className="mode-card online-card">
          <div className="mode-card-top">
            <span className="mode-icon">
              <Globe2 size={24} aria-hidden="true" />
            </span>
            <span className="mode-badge"><Wifi size={13} /> Online</span>
          </div>
          <div className="mode-heading">
            <p>Online match</p>
            <h2>Play with friends</h2>
          </div>
          <ul>
            <li><span>2–5 players</span></li>
            <li><span>Earn +3 points per win</span></li>
            <li><span>Private room codes</span></li>
          </ul>
          <div className="mode-actions">
            <button className="primary-button" type="button" onClick={() => handleMode('online')}>
              <Gamepad2 size={18} aria-hidden="true" />
              Find game
            </button>
            <button className="secondary-button" type="button" onClick={() => setIsAuthOpen(true)}>
              Host a table
            </button>
          </div>
        </article>

        <article className="mode-card practice-card">
          <div className="mode-card-top">
            <span className="mode-icon">
              <Bot size={24} aria-hidden="true" />
            </span>
            <span className="mode-badge"><Sparkles size={13} /> Local</span>
          </div>
          <div className="mode-heading">
            <p>Practice mode</p>
            <h2>Play offline</h2>
          </div>
          <ul>
            <li><span>Play against 1–4 AI bots</span></li>
            <li><span>Practice without score loss</span></li>
            <li><span>Learn every card effect</span></li>
          </ul>
          <button className="practice-button" type="button" onClick={() => handleMode('practice')}>
            <Bot size={18} aria-hidden="true" />
            Start practice
          </button>
        </article>
      </section>

      <section className="rules-panel">
        <div className="rules-heading">
          <div>
            <p>Quick game rules</p>
            <h2>Know the table in seconds</h2>
          </div>
          <span><Medal size={17} /> 54 cards</span>
        </div>
        <div className="rules-grid">
          <div><strong>4</strong><span>Cards per player</span></div>
          <div><strong>2s</strong><span>Matching stack</span></div>
          <div><strong>3s</strong><span>Matching stack</span></div>
          <div><strong>J</strong><span>Jump the turn</span></div>
          <div><strong>K</strong><span>Reverse direction</span></div>
          <div><strong>Q / 8</strong><span>Ask a question</span></div>
          <div><strong>A</strong><span>Choose a suit</span></div>
          <div><strong>Joker</strong><span>Take a drink</span></div>
        </div>
      </section>

      <footer className="hub-footer">
        <span>Built for local-first play</span>
        <span>Offline practice never changes your leaderboard</span>
      </footer>

      {selectedMode && (
        <div className="mode-toast" role="status">
          <span>
            {selectedMode === 'online' ? 'Online lobby selected' : 'Practice session selected'}
          </span>
          <button type="button" onClick={() => setSelectedMode(null)} aria-label="Dismiss notification">
            <X size={16} />
          </button>
        </div>
      )}

      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
    </main>
  );
}

// The authentication modal is kept separate from the hub so future Google
// authentication and profile storage can be connected without changing the layout.
function AuthModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close authentication">
          <X size={20} />
        </button>
        <div className="auth-art" aria-hidden="true">
          <span>N</span>
        </div>
        <p className="auth-kicker">Join the table</p>
        <h2 id="auth-title">Play Niko Kadi</h2>
        <p className="auth-copy">
          Sign in to save your profile, leaderboard, and online room history.
        </p>
        <button className="google-button" type="button">
          <span className="google-g">G</span>
          Continue with Google
        </button>
        <div className="auth-divider"><span>or</span></div>
        <button className="guest-button" type="button">
          <UserRound size={18} />
          Play as guest
        </button>
        <p className="auth-note">
          <LogIn size={14} /> Your guest progress stays local and does not affect rankings.
        </p>
      </section>
    </div>
  );
}
