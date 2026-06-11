import './Toolbar.css';

interface ToolbarProps {
  editMode: boolean;
  onToggleEditMode: () => void;
  tileCount: number;
  dataDir: string;
}

export default function Toolbar({
  editMode,
  onToggleEditMode,
  tileCount,
  dataDir,
}: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="toolbar-left">
        <span className="toolbar-logo">▦ Video Tiler</span>
        <span className="toolbar-meta">{tileCount} tile{tileCount !== 1 ? 's' : ''}</span>
      </div>

      <div className="toolbar-center">
        {editMode && (
          <div className="edit-hints">
            <span className="hint">
              <kbd>Click</kbd> split vertically
            </span>
            <span className="hint">
              <kbd>Shift</kbd> + <kbd>Click</kbd> split horizontally
            </span>
          </div>
        )}
      </div>

      <div className="toolbar-right">
        <button
          className={`edit-toggle ${editMode ? 'active' : ''}`}
          onClick={onToggleEditMode}
          title={editMode ? 'Exit edit mode' : 'Enter edit mode to split tiles'}
        >
          {editMode ? '✓ Done Editing' : '✎ Edit Layout'}
        </button>
        <span className="data-dir" title={dataDir}>
          📁 {dataDir}
        </span>
      </div>
    </header>
  );
}
