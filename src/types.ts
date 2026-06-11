export interface TileLeaf {
  type: 'leaf';
  id: string;
  name: string;
}

export interface TileSplit {
  type: 'split';
  direction: 'horizontal' | 'vertical';
  ratio: number;
  first: TileNode;
  second: TileNode;
}

export type TileNode = TileLeaf | TileSplit;

export type SplitDirection = 'horizontal' | 'vertical';

export interface SplitPreview {
  direction: SplitDirection;
  ratio: number;
}

export interface VideoFile {
  name: string;
  path: string;
}
