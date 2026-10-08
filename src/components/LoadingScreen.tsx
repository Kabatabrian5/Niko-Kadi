import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

// The three clips form one continuous cinematic loading sequence.
// A single video element is reused so the visual transition is seamless.
const VIDEO_STAGES = [
  { source: '/assets/card-game-loading-scene.mp4', label: 'Loading the table' },
  { source: '/assets/card-game-table.mp4', label: 'Preparing the cards' },
  { source: '/assets/niko-kadi-background.mp4', label: 'Welcome to Niko Kadi' },
] as const;

export function LoadingScreen({
  onComplete,
  onStartMusic,
  isMuted,
  onToggleMusic,
}: {
  onComplete: () => void;
  onStartMusic: () => void;
  isMuted: boolean;
  onToggleMusic: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageElapsedRef = useRef(0);
  const stageDurationsRef = useRef<number[]>([]);
  const totalDurationRef = useRef(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(1);
  const currentStage = VIDEO_STAGES[stageIndex];

  useEffect(() => {
    void onStartMusic();
  }, [onStartMusic]);

  useEffect(() => {
    // Preload all three clips so the timeline can be calculated before playback.
    const videos = VIDEO_STAGES.map((stage) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = stage.source;
      return video;
    });

    const updateDuration = (event: Event) => {
      const index = videos.indexOf(event.currentTarget as HTMLVideoElement);
      const video = videos[index];
      stageDurationsRef.current[index] = video.duration || 0;
      totalDurationRef.current = stageDurationsRef.current.reduce(
        (total, duration) => total + duration,
        0,
      );
    };

    videos.forEach((video) => video.addEventListener('loadedmetadata', updateDuration));
    return () => {
      videos.forEach((video) => {
        video.removeEventListener('loadedmetadata', updateDuration);
        video.pause();
      });
    };
  }, []);

  useEffect(() => {
    // Calculate progress from the whole sequence, not from each individual clip.
    const progressTimer = window.setInterval(() => {
      const video = videoRef.current;
      const elapsed = stageElapsedRef.current + (video?.currentTime || 0);
      const totalDuration = totalDurationRef.current || 1;
      const nextProgress = Math.min(100, Math.round((elapsed / totalDuration) * 100));
      setProgress(Math.max(1, nextProgress));
    }, 100);

    return () => window.clearInterval(progressTimer);
  }, []);

  const advanceStage = useCallback(() => {
    const currentDuration = videoRef.current?.duration || 0;
    stageElapsedRef.current += currentDuration;

    if (stageIndex === VIDEO_STAGES.length - 1) {
      onComplete();
      return;
    }

    setStageIndex(stageIndex + 1);
  }, [onComplete, stageIndex]);

  return (
    <main className="loading-screen">
      <video
        key={currentStage.source}
        ref={videoRef}
        className="loading-background loading-video"
        poster="/assets/loading-screen.jfif"
        autoPlay
        muted
        loop={false}
        playsInline
        preload="auto"
        aria-hidden="true"
        onEnded={advanceStage}
      >
        <source src={currentStage.source} type="video/mp4" />
      </video>
      <div className="loading-vignette" aria-hidden="true" />
      <div className="loading-pattern" aria-hidden="true" />

      <section className="loading-content" aria-live="polite">
          <div className="loading-mark" aria-hidden="true">
            <span>N</span>
          </div>
          <p className="loading-kicker">A Kenyan card game</p>
          <h1>Niko Kadi</h1>
          <p className="loading-message">Preparing the table…</p>

          <div className="loading-meter" aria-label={`Loading ${progress}%`}>
            <div className="loading-meter-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="loading-progress">{progress}%</p>
          <p className="loading-stage">{currentStage.label}</p>
        </section>

      <button
        className="global-audio-button loading-audio-button"
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onToggleMusic}
        aria-label={isMuted ? 'Unmute background music' : 'Mute background music'}
      >
        {isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}
      </button>

      <div className="loading-tips" aria-label="Game tips">
        <span><strong>Play online</strong> · Connect when the lobby is available</span>
        <span><strong>Play offline</strong> · Challenge four AI opponents</span>
        <span><strong>Track progress</strong> · Watch your leaderboard rank</span>
      </div>
    </main>
  );
}
