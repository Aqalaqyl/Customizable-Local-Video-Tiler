import type { SplitDirection, TileNode } from '../types';
import TilePanel from './TilePanel';
import './TileLayout.css';

interface TileLayoutProps {
  node: TileNode;
  editMode: boolean;
  onSplit: (tileId: string, direction: SplitDirection, ratio: number) => void;
  onRename: (tileId: string, name: string) => void;
}

export default function TileLayout({
  node,
  editMode,
  onSplit,
  onRename,
}: TileLayoutProps) {
  if (node.type === 'leaf') {
    return (
      <TilePanel
        tile={node}
        editMode={editMode}
        onSplit={onSplit}
        onRename={onRename}
      />
    );
  }

  const isVertical = node.direction === 'vertical';
  const firstPct = node.ratio * 100;
  const secondPct = (1 - node.ratio) * 100;

  return (
    <div
      className={`tile-split ${isVertical ? 'split-vertical' : 'split-horizontal'}`}
    >
      <div
        className="tile-split-child"
        style={isVertical ? { width: `${firstPct}%` } : { height: `${firstPct}%` }}
      >
        <TileLayout
          node={node.first}
          editMode={editMode}
          onSplit={onSplit}
          onRename={onRename}
        />
      </div>
      <div className="tile-split-divider" aria-hidden />
      <div
        className="tile-split-child"
        style={
          isVertical ? { width: `${secondPct}%` } : { height: `${secondPct}%` }
        }
      >
        <TileLayout
          node={node.second}
          editMode={editMode}
          onSplit={onSplit}
          onRename={onRename}
        />
      </div>
    </div>
  );
}
