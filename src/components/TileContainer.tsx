import { useRef, useCallback } from 'react'
import type { TileNode, SplitCallback, RenameCallback, DeleteCallback } from '../types/tile'
import TileLeaf from './TileLeaf'

interface Props {
  node: TileNode
  basePath: string
  editMode: boolean
  totalLeaves: number
  onSplit: SplitCallback
  onRename: RenameCallback
  onDelete: DeleteCallback
  onResize: (splitId: string, ratio: number) => void
}

export default function TileContainer({
  node, basePath, editMode, totalLeaves,
  onSplit, onRename, onDelete, onResize
}: Props) {
  if (node.type === 'leaf') {
    const folderPath = `${basePath}/${node.name}`
    return (
      <TileLeaf
        id={node.id}
        name={node.name}
        folderPath={folderPath}
        editMode={editMode}
        isOnly={totalLeaves === 1}
        onSplit={onSplit}
        onRename={onRename}
        onDelete={onDelete}
      />
    )
  }

  const isVertical = node.direction === 'vertical'

  return (
    <div
      className={`tile-split ${isVertical ? 'split-vertical' : 'split-horizontal'}`}
    >
      <div
        className="tile-split-child"
        style={{ flex: `${node.ratio} 1 0` }}
      >
        <TileContainer
          node={node.first}
          basePath={basePath}
          editMode={editMode}
          totalLeaves={totalLeaves}
          onSplit={onSplit}
          onRename={onRename}
          onDelete={onDelete}
          onResize={onResize}
        />
      </div>

      <SplitHandle
        splitId={node.id}
        direction={node.direction}
        ratio={node.ratio}
        onResize={onResize}
      />

      <div
        className="tile-split-child"
        style={{ flex: `${1 - node.ratio} 1 0` }}
      >
        <TileContainer
          node={node.second}
          basePath={basePath}
          editMode={editMode}
          totalLeaves={totalLeaves}
          onSplit={onSplit}
          onRename={onRename}
          onDelete={onDelete}
          onResize={onResize}
        />
      </div>
    </div>
  )
}

interface HandleProps {
  splitId: string
  direction: 'horizontal' | 'vertical'
  ratio: number
  onResize: (splitId: string, ratio: number) => void
}

function SplitHandle({ splitId, direction, ratio, onResize }: HandleProps) {
  const isDragging = useRef(false)
  const startPos = useRef(0)
  const startRatio = useRef(ratio)
  const containerSize = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    startPos.current = direction === 'vertical' ? e.clientX : e.clientY
    startRatio.current = ratio

    // Measure the parent split container size
    const parent = (e.currentTarget as HTMLElement).parentElement
    if (parent) {
      containerSize.current = direction === 'vertical'
        ? parent.getBoundingClientRect().width
        : parent.getBoundingClientRect().height
    }

    const onMove = (me: MouseEvent) => {
      if (!isDragging.current) return
      const pos = direction === 'vertical' ? me.clientX : me.clientY
      const delta = pos - startPos.current
      const newRatio = startRatio.current + delta / containerSize.current
      onResize(splitId, newRatio)
    }

    const onUp = () => {
      isDragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [direction, ratio, splitId, onResize])

  return (
    <div
      className={`split-handle ${direction === 'vertical' ? 'handle-vertical' : 'handle-horizontal'}`}
      onMouseDown={handleMouseDown}
    >
      <div className="split-handle-inner" />
    </div>
  )
}
