import type { SplitDirection } from '../types';
import './SplitPreview.css';

interface SplitPreviewProps {
  direction: SplitDirection;
  ratio: number;
}

export default function SplitPreview({ direction, ratio }: SplitPreviewProps) {
  const isVertical = direction === 'vertical';

  return (
    <div className="split-preview-overlay" aria-hidden>
      <div
        className={`split-preview-dim ${isVertical ? 'dim-left' : 'dim-top'}`}
        style={
          isVertical
            ? { width: `${ratio * 100}%` }
            : { height: `${ratio * 100}%` }
        }
      />
      <div
        className={`split-preview-line ${isVertical ? 'vertical' : 'horizontal'}`}
        style={
          isVertical
            ? { left: `${ratio * 100}%` }
            : { top: `${ratio * 100}%` }
        }
      />
      <div
        className={`split-preview-dim ${isVertical ? 'dim-right' : 'dim-bottom'}`}
        style={
          isVertical
            ? { width: `${(1 - ratio) * 100}%`, left: `${ratio * 100}%` }
            : { height: `${(1 - ratio) * 100}%`, top: `${ratio * 100}%` }
        }
      />
      <div className="split-preview-label">
        {isVertical ? '↔ Vertical split' : '↕ Horizontal split'}
      </div>
    </div>
  );
}
