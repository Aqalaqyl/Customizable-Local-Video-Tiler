import './NameTooltip.css';

interface NameTooltipProps {
  name: string;
  folderName: string;
  visible: boolean;
}

export default function NameTooltip({
  name,
  folderName,
  visible,
}: NameTooltipProps) {
  if (!visible) return null;

  return (
    <div className="name-tooltip">
      <span className="name-tooltip-title">{name}</span>
      <span className="name-tooltip-folder">📁 {folderName}</span>
    </div>
  );
}
