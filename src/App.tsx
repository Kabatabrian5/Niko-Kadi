import { useCallback, useEffect, useRef, useState } from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { MainHub } from './components/MainHub';
import { PracticeTable } from './components/PracticeTable';
import { SignInScreen } from './components/SignInScreen';
import { CreateAccountScreen } from './components/CreateAccountScreen';
import { getSupabaseClient } from './lib/supabase';

type Screen = 'loading' | 'sign-in' | 'create-account' | 'hub' | 'practice';

// The application owns the screen transition. The loading state is temporary;
// sign-in is the next destination, followed by the main hub.
export default function App() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [screen, setScreen] = useState<Screen>('loading');
  // The soundtrack starts unmuted, while the user can mute it at any time.
  const [isMuted, setIsMuted] = useState(false);
  const [isPlayingPractice, setIsPlayingPractice] = useState(false);

  useEffect(() => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) return;

    let isMounted = true;
    void getSupabaseClient().auth.getSession().then(({ data, error }) => {
      if (isMounted && !error && data.session) setScreen('hub');
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Keep the audio element's mute state synchronized with the persistent control.
    audio.muted = isMuted;
    if (!isMuted && audio.paused) {
      void audio.play().catch(() => setIsMuted(true));
    }
  }, [isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
    };
  }, []);

  const startMusic = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    // Attempt audible autoplay; browsers may require the user to unmute explicitly.
    try {
      await audio.play();
    } catch {
      // The loading experience remains usable if the browser blocks playback.
      setIsMuted(true);
    }
  }, []);

  const toggleMusic = useCallback(() => {
    setIsMuted((current) => !current);
  }, []);

  return (
    <>
      <audio
        ref={audioRef}
        src="/assets/cheza-kama-wewe-vocal-60s.mp3"
        loop
        preload="auto"
        aria-hidden="true"
      />

      {screen === 'loading' ? (
        <LoadingScreen
          onComplete={() => setScreen('sign-in')}
          onStartMusic={startMusic}
          isMuted={isMuted}
          onToggleMusic={toggleMusic}
        />
      ) : screen === 'sign-in' ? (
        <SignInScreen
          isMuted={isMuted}
          onToggleMusic={toggleMusic}
          onContinue={() => setScreen('hub')}
          onBackToHub={() => setScreen('hub')}
          onRegister={() => setScreen('create-account')}
        />
      ) : screen === 'create-account' ? (
        <CreateAccountScreen
          isMuted={isMuted}
          onToggleMusic={toggleMusic}
          onBackToSignIn={() => setScreen('sign-in')}
          onAccountCreated={() => setScreen('hub')}
        />
      ) : isPlayingPractice ? (
        <PracticeTable onExit={() => setIsPlayingPractice(false)} />
      ) : (
        <MainHub
          isMuted={isMuted}
          onToggleMusic={toggleMusic}
          onGuestPlay={() => setIsPlayingPractice(true)}
        />
      )}
    </>
  );
}
