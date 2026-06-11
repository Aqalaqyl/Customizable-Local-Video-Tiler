import { useEffect, useRef, useState, useCallback } from 'react'

interface VideoFile {
  name: string
  path: string
}

interface Props {
  folderPath: string
}

export default function VideoPlayer({ folderPath }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [files, setFiles] = useState<VideoFile[]>([])
  const [current, setCurrent] = useState<VideoFile | null>(null)
  const [showList, setShowList] = useState(false)

  const loadFiles = useCallback(async () => {
    const result = await window.electronAPI.listVideos(folderPath)
    setFiles(result)
  }, [folderPath])

  useEffect(() => {
    loadFiles()
    const interval = setInterval(loadFiles, 5000)
    return () => clearInterval(interval)
  }, [loadFiles])

  const play = (file: VideoFile) => {
    setCurrent(file)
    setShowList(false)
  }

  const handleEnded = () => {
    const idx = files.findIndex(f => f.path === current?.path)
    if (idx >= 0 && idx < files.length - 1) {
      play(files[idx + 1])
    }
  }

  const openFolder = async () => {
    await window.electronAPI.openPath(folderPath)
  }

  return (
    <div className="video-player">
      {current ? (
        <div className="video-wrapper">
          <video
            ref={videoRef}
            key={current.path}
            src={`file://${current.path}`}
            controls
            autoPlay
            onEnded={handleEnded}
            className="video-el"
          />
          <div className="video-controls-bar">
            <button className="btn-icon" onClick={() => setShowList(s => !s)} title="File list">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="2" y="3" width="12" height="1.5" rx="0.75"/>
                <rect x="2" y="7.25" width="12" height="1.5" rx="0.75"/>
                <rect x="2" y="11.5" width="12" height="1.5" rx="0.75"/>
              </svg>
            </button>
            <span className="now-playing">{current.name}</span>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="#333" strokeWidth="2"/>
              <path d="M19 16L33 24L19 32V16Z" fill="#444"/>
            </svg>
          </div>
          <p className="empty-text">No video playing</p>
          {files.length > 0 ? (
            <button className="btn-primary" onClick={() => setShowList(true)}>
              Browse {files.length} file{files.length !== 1 ? 's' : ''}
            </button>
          ) : (
            <div className="empty-hint">
              <p>Add videos to this folder to get started</p>
              <button className="btn-secondary" onClick={openFolder}>Open Folder</button>
            </div>
          )}
        </div>
      )}

      {showList && (
        <div className="file-list-overlay" onClick={e => { if (e.target === e.currentTarget) setShowList(false) }}>
          <div className="file-list-panel">
            <div className="file-list-header">
              <span>Video Files</span>
              <div className="file-list-header-actions">
                <button className="btn-icon" onClick={openFolder} title="Open folder">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M1 3.5C1 2.67 1.67 2 2.5 2H6l2 2h5.5C14.33 4 15 4.67 15 5.5v7c0 .83-.67 1.5-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9Z"/>
                  </svg>
                </button>
                <button className="btn-icon" onClick={loadFiles} title="Refresh">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 3a5 5 0 1 0 4.55 2.93l1.4-.78A6.5 6.5 0 1 1 8 1.5V0l2.5 2.5L8 5V3Z"/>
                  </svg>
                </button>
                <button className="btn-icon" onClick={() => setShowList(false)}>✕</button>
              </div>
            </div>
            <div className="file-list-body">
              {files.length === 0 ? (
                <p className="file-list-empty">No video files found</p>
              ) : (
                files.map(f => (
                  <div
                    key={f.path}
                    className={`file-item ${current?.path === f.path ? 'active' : ''}`}
                    onClick={() => play(f)}
                    title={f.name}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="file-icon">
                      <path d="M6 3L13 8L6 13V3Z"/>
                    </svg>
                    <span className="file-name">{f.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
