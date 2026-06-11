import { useState, useEffect, useCallback, useRef } from 'react'
import TileContainer from './components/TileContainer'
import { useTileActions, makeLeaf, collectLeaves } from './hooks/useTileTree'
import type { TileNode, SplitDirection } from './types/tile'
import './styles/globals.css'

const DEFAULT_TILE_NAME = 'My Videos'

function buildDefault(name: string): TileNode {
  return makeLeaf(name)
}

export default function App() {
  const [tree, setTree] = useState<TileNode | null>(null)
  const [basePath, setBasePath] = useState<string>('')
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [basePathInputVisible, setBasePathInputVisible] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { split, rename, remove, resize } = useTileActions(tree!, setTree)

  // Load persisted state on mount
  useEffect(() => {
    async function init() {
      const defaultBase = await window.electronAPI.getDefaultBasePath()
      const saved = await window.electronAPI.loadState() as { tree?: TileNode; basePath?: string } | null

      let resolvedBase = defaultBase
      let resolvedTree: TileNode

      if (saved?.basePath) resolvedBase = saved.basePath
      if (saved?.tree) {
        resolvedTree = saved.tree
      } else {
        resolvedTree = buildDefault(DEFAULT_TILE_NAME)
      }

      await window.electronAPI.ensureDir(resolvedBase)

      // Ensure all tile folders exist
      const leaves = collectLeaves(resolvedTree)
      for (const leaf of leaves) {
        await window.electronAPI.ensureDir(`${resolvedBase}/${leaf.name}`)
      }

      setBasePath(resolvedBase)
      setTree(resolvedTree)
      setLoading(false)
    }
    init()
  }, [])

  // Persist state when tree or basePath changes (debounced)
  useEffect(() => {
    if (!tree || !basePath || loading) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await window.electronAPI.saveState({ tree, basePath })
    }, 500)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [tree, basePath, loading])

  const handleSplit = useCallback(
    async (leafId: string, direction: SplitDirection, ratio: number, newName: string) => {
      await window.electronAPI.createFolder(basePath, newName)
      split(leafId, direction, ratio, newName)
    },
    [basePath, split]
  )

  const handleRename = useCallback(
    async (leafId: string, newName: string) => {
      if (!tree) return
      // Find old name
      const leaves = collectLeaves(tree)
      const leaf = leaves.find(l => l.id === leafId)
      if (leaf && leaf.name !== newName) {
        await window.electronAPI.renameFolder(basePath, leaf.name, newName)
      }
      rename(leafId, newName)
    },
    [basePath, tree, rename]
  )

  const handleDelete = useCallback(
    (leafId: string) => {
      remove(leafId)
    },
    [remove]
  )

  const handleResize = useCallback(
    (splitId: string, ratio: number) => {
      resize(splitId, ratio)
    },
    [resize]
  )

  const chooseBasePath = useCallback(async () => {
    const chosen = await window.electronAPI.openDirectory()
    if (chosen) {
      await window.electronAPI.ensureDir(chosen)
      setBasePath(chosen)
      setBasePathInputVisible(false)
      // Re-ensure all tile folders in the new base
      if (tree) {
        const leaves = collectLeaves(tree)
        for (const leaf of leaves) {
          await window.electronAPI.createFolder(chosen, leaf.name)
        }
      }
    }
  }, [tree])

  if (loading || !tree) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading Video Tiler…</p>
      </div>
    )
  }

  const totalLeaves = collectLeaves(tree).length

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-left">
          <span className="app-title">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="app-logo">
              <rect x="1" y="1" width="7" height="16" rx="1.5" fill="#4a9eff" opacity="0.9"/>
              <rect x="10" y="1" width="7" height="7" rx="1.5" fill="#4a9eff" opacity="0.6"/>
              <rect x="10" y="10" width="7" height="7" rx="1.5" fill="#4a9eff" opacity="0.4"/>
            </svg>
            Video Tiler
          </span>
        </div>

        <div className="app-header-center">
          {editMode && (
            <span className="edit-mode-badge">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M8.5 1L11 3.5 4.5 10H2V7.5L8.5 1Z"/>
              </svg>
              EDIT MODE — Click tile to split · Shift+Click for horizontal
            </span>
          )}
        </div>

        <div className="app-header-right">
          {basePathInputVisible && (
            <div className="base-path-bar">
              <span className="base-path-text" title={basePath}>{basePath}</span>
              <button className="btn-secondary btn-sm" onClick={chooseBasePath}>Change…</button>
              <button className="btn-icon" onClick={() => setBasePathInputVisible(false)}>✕</button>
            </div>
          )}
          <button
            className="btn-secondary btn-sm"
            onClick={() => setBasePathInputVisible(v => !v)}
            title="Manage media folder"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 3.5C1 2.67 1.67 2 2.5 2H6l2 2h5.5C14.33 4 15 4.67 15 5.5v7c0 .83-.67 1.5-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9Z"/>
            </svg>
            Folder
          </button>
          <button
            className={`btn-edit-toggle ${editMode ? 'active' : ''}`}
            onClick={() => setEditMode(e => !e)}
            title={editMode ? 'Exit edit mode' : 'Enter edit mode to split tiles'}
          >
            {editMode ? (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Done
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <rect x="1" y="1" width="5" height="12" rx="1"/>
                  <rect x="8" y="1" width="5" height="5.5" rx="1"/>
                  <rect x="8" y="7.5" width="5" height="5.5" rx="1"/>
                </svg>
                Edit Layout
              </>
            )}
          </button>
        </div>
      </header>

      <main className="app-main">
        <TileContainer
          node={tree}
          basePath={basePath}
          editMode={editMode}
          totalLeaves={totalLeaves}
          onSplit={handleSplit}
          onRename={handleRename}
          onDelete={handleDelete}
          onResize={handleResize}
        />
      </main>
    </div>
  )
}
