import { useCallback, useEffect, useState } from 'react';
import Toolbar from './components/Toolbar';
import TileLayout from './components/TileLayout';
import type { SplitDirection, TileNode } from './types';
import { countLeaves, splitLeaf, updateLeafName } from './utils/tileTree';
import './App.css';

export default function App() {
  const [layout, setLayout] = useState<TileNode | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [dataDir, setDataDir] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      if (!window.electronAPI) {
        setLoading(false);
        return;
      }
      const [config, dir] = await Promise.all([
        window.electronAPI.getConfig(),
        window.electronAPI.getDataDir(),
      ]);
      setLayout(config.layout);
      setDataDir(dir);
      setLoading(false);
    }
    init();
  }, []);

  const persistLayout = useCallback(async (newLayout: TileNode) => {
    setLayout(newLayout);
    if (window.electronAPI) {
      await window.electronAPI.saveLayout(newLayout);
    }
  }, []);

  const handleSplit = useCallback(
    (tileId: string, direction: SplitDirection, ratio: number) => {
      if (!layout) return;
      const newLayout = splitLeaf(layout, tileId, direction, ratio);
      persistLayout(newLayout);
    },
    [layout, persistLayout]
  );

  const handleRename = useCallback(
    (tileId: string, name: string) => {
      if (!layout) return;
      const newLayout = updateLeafName(layout, tileId, name);
      persistLayout(newLayout);
    },
    [layout, persistLayout]
  );

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Loading Video Tiler…</p>
      </div>
    );
  }

  if (!window.electronAPI) {
    return (
      <div className="app-loading">
        <p>Please run this app via Electron.</p>
        <code>npm run electron:dev</code>
      </div>
    );
  }

  if (!layout) return null;

  return (
    <div className="app">
      <Toolbar
        editMode={editMode}
        onToggleEditMode={() => setEditMode((m) => !m)}
        tileCount={countLeaves(layout)}
        dataDir={dataDir}
      />
      <main className="app-main">
        <TileLayout
          node={layout}
          editMode={editMode}
          onSplit={handleSplit}
          onRename={handleRename}
        />
      </main>
    </div>
  );
}
