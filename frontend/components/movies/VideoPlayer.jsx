'use client';

import { useEffect, useRef, useState } from 'react';
import PosterArt from './PosterArt';
import EmptyState from '../ui/EmptyState';

export default function VideoPlayer({ streamUrl, title, hue }) {
  const videoRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [streamUrl]);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return undefined;
    const handleError = () => setFailed(true);
    node.addEventListener('error', handleError, true);
    return () => {
      node.removeEventListener('error', handleError, true);
    };
  }, [streamUrl]);

  const hasStream = typeof streamUrl === 'string' && streamUrl.trim().length > 0;

  if (hasStream && !failed) {
    return (
      <section className="player" aria-label={`Video player for ${title || 'this title'}`}>
        <div className="player__frame">
          <video
            ref={videoRef}
            className="player__video"
            controls
            preload="metadata"
            playsInline
            controlsList="nodownload"
          >
            <source src={streamUrl} />
            Your browser cannot play this stream. Try a recent version of Chrome, Firefox or Safari.
          </video>
        </div>
        <p className="player__note">
          Streaming in HD where your connection allows. Licensed for viewing in your region.
        </p>
      </section>
    );
  }

  return (
    <section className="player" aria-label={`Playback unavailable for ${title || 'this title'}`}>
      <div className="player__frame player__frame--locked">
        <div className="player__poster">
          <PosterArt title={title} hue={hue} size="lg" />
        </div>
        <div className="player__locked-body">
          <EmptyState
            title={failed ? 'This stream could not be loaded' : 'Not yet licensed for streaming'}
            description={
              failed
                ? 'The video file for this title is temporarily unreachable. Please try again shortly — our distribution team has been notified.'
                : 'We are still finalising the streaming licence for this film with its rights holder. Add it to your watchlist and we will make it available the moment it clears.'
            }
          />
        </div>
      </div>
    </section>
  );
}