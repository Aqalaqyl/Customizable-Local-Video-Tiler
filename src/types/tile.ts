export type SplitDirection = 'horizontal' | 'vertical'

export interface LeafNode {
  type: 'leaf'
  id: string
  name: string
}

export interface SplitNode {
  type: 'split'
  id: string
  direction: SplitDirection
  /** Fraction (0–1) at which the first child ends */
  ratio: number
  first: TileNode
  second: TileNode
}

export type TileNode = LeafNode | SplitNode

export interface AppState {
  tree: TileNode
  basePath: string
}

export type SplitCallback = (
  leafId: string,
  direction: SplitDirection,
  ratio: number,
  newName: string
) => void

export type RenameCallback = (leafId: string, newName: string) => void
export type DeleteCallback = (leafId: string) => void
