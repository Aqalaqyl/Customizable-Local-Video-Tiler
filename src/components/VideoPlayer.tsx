import { useEffect, useRef, useState } from 'react';
import type { VideoFile } from '../types';
import { toFileUrl } from '../utils/fileUrl';
import './VideoPlayer.css';

interface VideoPlayerProps {
  videos: VideoFile[];
  tileName: string;
  onOpenFolder: () => void;
  onRefresh: () => void;
}

export default function VideoPlayer({
  videos,
  tileName,
  onOpenFolder,
  onRefresh,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showList, setShowList] = useState(false);

  const current = videos[selectedIndex] ?? null;

  useEffect(() => {
    if (videos.length === 0) {
      setSelectedIndex(0);
      return;
    }
    if (selectedIndex >= videos.length) {
      setSelectedIndex(0);
    }
  }, [videos, selectedIndex]);

  useEffect(() => {
    if (videoRef.current && current) {
      videoRef.current.load();
    }
  }, [current?.path]);

  const videoSrc = current ? toFileUrl(current.path) : undefined;

  return (
    <div className="video-player">
      <div className="video-area">
        {current ? (
          <video
            ref={videoRef}
            key={current.path}
            className="video-element"
            src={videoSrc}
            controls
            autoPlay
          />
        ) : (
          <div className="video-empty">
            <div className="video-empty-icon">🎬</div>
            <p>No videos in <strong>{tileName}</strong></p>
            <p className="video-empty-hint">
              Drop video files into this tile&apos;s folder to get started.
            </p>
            <div className="video-empty-actions">
              <button className="vp-btn" onClick={onOpenFolder}>
                Open Folder
              </button>
              <button className="vp-btn secondary" onClick={onRefresh}>
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>

      {videos.length > 0 && (
        <div className="video-controls">
          <button
            className="vp-btn icon"
            onClick={() => setShowList((s) => !s)}
            title="Playlist"
          >
            ☰ {videos.length}
          </button>
          <span className="now-playing" title={current?.name}>
            {current?.name ?? '—'}
          </span>
          <button className="vp-btn icon" onClick={onOpenFolder} title="Open folder">
            📁
          </button>
          <button className="vp-btn icon" onClick={onRefresh} title="Refresh list">
            ↻
          </button>
        </div>
      )}

      {showList && videos.length > 0 && (
        <div className="video-playlist">
          {videos.map((v, i) => (
            <button
              key={v.path}
              className={`playlist-item ${i === selectedIndex ? 'active' : ''}`}
              onClick={() => {
                setSelectedIndex(i);
                setShowList(false);
              }}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
