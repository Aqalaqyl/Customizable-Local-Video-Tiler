import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  SplitDirection,
  SplitPreview,
  TileLeaf,
  VideoFile,
} from '../types';
import NameTooltip from './NameTooltip';
import SplitPreview from './SplitPreview';
import VideoPlayer from './VideoPlayer';
import './TilePanel.css';

interface TilePanelProps {
  tile: TileLeaf;
  editMode: boolean;
  onSplit: (tileId: string, direction: SplitDirection, ratio: number) => void;
  onRename: (tileId: string, name: string) => void;
}

export default function TilePanel({
  tile,
  editMode,
  onSplit,
  onRename,
}: TilePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [preview, setPreview] = useState<SplitPreview | null>(null);
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [folderName, setFolderName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(tile.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const loadVideos = useCallback(async () => {
    if (!window.electronAPI) return;
    const info = await window.electronAPI.getTileFolder(tile.id, tile.name);
    setVideos(info.videos);
    setFolderName(info.folderName);
  }, [tile.id, tile.name]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  useEffect(() => {
    setNameDraft(tile.name);
  }, [tile.name]);

  useEffect(() => {
    if (!editMode) {
      setPreview(null);
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [editMode]);

  const computePreview = useCallback(
    (clientX: number, clientY: number) => {
      const el = panelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const direction: SplitDirection = shiftHeld ? 'horizontal' : 'vertical';
      const ratio =
        direction === 'vertical'
          ? (clientX - rect.left) / rect.width
          : (clientY - rect.top) / rect.height;
      setPreview({ direction, ratio });
    },
    [shiftHeld]
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!editMode) return;
    computePreview(e.clientX, e.clientY);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!editMode || !preview) return;
    e.stopPropagation();
    onSplit(tile.id, preview.direction, preview.ratio);
  };

  const handleOpenFolder = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.openTileFolder(tile.id, tile.name);
    setTimeout(loadVideos, 500);
  };

  const commitRename = async () => {
    const trimmed = nameDraft.trim() || tile.name;
    setEditingName(false);
    if (trimmed !== tile.name) {
      onRename(tile.id, trimmed);
      if (window.electronAPI) {
        const result = await window.electronAPI.renameTile(tile.id, trimmed);
        setFolderName(result.folderName);
      }
    }
    loadVideos();
  };

  const startEditing = (e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation();
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  };

  return (
    <div
      ref={panelRef}
      className={`tile-panel ${editMode ? 'edit-mode' : ''} ${hovered ? 'hovered' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        if (editMode) setPreview(null);
      }}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      {!editMode && (
        <NameTooltip
          name={tile.name}
          folderName={folderName}
          visible={hovered && !editingName}
        />
      )}

      {editMode && preview && <SplitPreview direction={preview.direction} ratio={preview.ratio} />}

      {editMode && (
        <div className="tile-edit-header" onClick={(e) => e.stopPropagation()}>
          {editingName ? (
            <input
              ref={nameInputRef}
              className="tile-name-input"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') {
                  setNameDraft(tile.name);
                  setEditingName(false);
                }
              }}
              autoFocus
            />
          ) : (
            <button className="tile-name-btn" onClick={startEditing} title="Click to rename">
              {tile.name}
              <span className="rename-hint">✎</span>
            </button>
          )}
          <span className="tile-folder-tag">📁 {folderName}</span>
        </div>
      )}

      <div className="tile-content" onClick={(e) => editMode && e.stopPropagation()}>
        <VideoPlayer
          videos={videos}
          tileName={tile.name}
          onOpenFolder={handleOpenFolder}
          onRefresh={loadVideos}
        />
      </div>
    </div>
  );
}
