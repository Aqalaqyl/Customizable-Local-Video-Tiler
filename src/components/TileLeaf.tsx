import { useRef, useState, useCallback, useEffect } from 'react'
import VideoPlayer from './VideoPlayer'
import type { SplitDirection, SplitCallback, RenameCallback, DeleteCallback } from '../types/tile'

interface Props {
  id: string
  name: string
  folderPath: string
  editMode: boolean
  isOnly: boolean
  onSplit: SplitCallback
  onRename: RenameCallback
  onDelete: DeleteCallback
}

interface Preview {
  direction: SplitDirection
  ratio: number
}

export default function TileLeaf({
  id, name, folderPath, editMode, isOnly,
  onSplit, onRename, onDelete
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [hovered, setHovered] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(name)
  const [shiftHeld, setShiftHeld] = useState(false)

  // Sync rename input when name prop changes
  useEffect(() => { setRenameValue(name) }, [name])

  // Track shift key globally while this tile is in edit mode
  useEffect(() => {
    if (!editMode) return
    const onKey = (e: KeyboardEvent) => setShiftHeld(e.shiftKey)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [editMode])

  const calcPreview = useCallback((e: React.MouseEvent<HTMLDivElement>): Preview => {
    const rect = containerRef.current!.getBoundingClientRect()
    const direction: SplitDirection = e.shiftKey ? 'horizontal' : 'vertical'
    const ratio = direction === 'vertical'
      ? (e.clientX - rect.left) / rect.width
      : (e.clientY - rect.top) / rect.height
    return { direction, ratio: Math.max(0.15, Math.min(0.85, ratio)) }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!editMode) return
    setPreview(calcPreview(e))
    setShiftHeld(e.shiftKey)
  }, [editMode, calcPreview])

  const handleMouseLeave = useCallback(() => {
    setPreview(null)
    setHovered(false)
  }, [])

  const handleMouseEnter = useCallback(() => {
    setHovered(true)
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!editMode) return
    e.preventDefault()
    e.stopPropagation()
    const p = calcPreview(e)
    const newName = `Tile ${Math.floor(Math.random() * 900) + 100}`
    onSplit(id, p.direction, p.ratio, newName)
  }, [editMode, calcPreview, id, onSplit])

  const commitRename = useCallback(async () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== name) {
      onRename(id, trimmed)
    } else {
      setRenameValue(name)
    }
    setRenaming(false)
  }, [id, name, renameValue, onRename])

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') { setRenameValue(name); setRenaming(false) }
  }

  const previewCursor = editMode
    ? (shiftHeld ? 'ns-resize' : 'ew-resize')
    : 'default'

  return (
    <div
      ref={containerRef}
      className={`tile-leaf ${editMode ? 'edit-mode' : ''} ${hovered ? 'hovered' : ''}`}
      style={{ cursor: previewCursor }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
    >
      {/* Video player (non-edit mode) */}
      {!editMode && (
        <div className="tile-content">
          <VideoPlayer folderPath={folderPath} />
        </div>
      )}

      {/* Edit mode: show folder info and split hint */}
      {editMode && (
        <div className="tile-edit-body">
          <div className="tile-edit-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="4" y="4" width="14" height="32" rx="2" stroke="#4a9eff" strokeWidth="1.5" strokeDasharray="3 2"/>
              <rect x="22" y="4" width="14" height="32" rx="2" stroke="#4a9eff" strokeWidth="1.5" strokeDasharray="3 2"/>
            </svg>
          </div>
          <p className="tile-edit-hint">
            {shiftHeld ? 'Click to split horizontally' : 'Click to split vertically'}
            <br />
            <span className="tile-edit-sub">Hold Shift for horizontal split</span>
          </p>
        </div>
      )}

      {/* Split preview overlay */}
      {editMode && preview && (
        <div
          className="split-preview-overlay"
          style={{
            '--ratio': preview.direction === 'vertical' ? `${preview.ratio * 100}%` : '100%',
            '--ratio-h': preview.direction === 'horizontal' ? `${preview.ratio * 100}%` : '100%',
          } as React.CSSProperties}
          data-direction={preview.direction}
        >
          <div className="split-preview-first" />
          <div className="split-preview-line" />
          <div className="split-preview-second" />
        </div>
      )}

      {/* Tile name overlay on hover (non-edit) */}
      {!editMode && hovered && (
        <div className="tile-name-overlay">
          {renaming ? (
            <input
              className="tile-name-input"
              value={renameValue}
              autoFocus
              onChange={e => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleRenameKeyDown}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span
              className="tile-name-label"
              onDoubleClick={e => { e.stopPropagation(); setRenaming(true) }}
              title="Double-click to rename"
            >
              {name}
            </span>
          )}
        </div>
      )}

      {/* Edit mode tile header with controls */}
      {editMode && (
        <div className="tile-edit-header">
          {renaming ? (
            <input
              className="tile-name-input"
              value={renameValue}
              autoFocus
              onChange={e => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleRenameKeyDown}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span
              className="tile-edit-name"
              onDoubleClick={e => { e.stopPropagation(); setRenaming(true) }}
              title="Double-click to rename"
            >
              {name}
            </span>
          )}
          {!isOnly && (
            <button
              className="tile-delete-btn"
              onClick={e => { e.stopPropagation(); onDelete(id) }}
              title="Remove tile"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  )
}
