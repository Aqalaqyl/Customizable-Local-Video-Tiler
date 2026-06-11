import { useCallback } from 'react'
import type { TileNode, SplitNode, LeafNode, SplitDirection } from '../types/tile'

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function makeLeaf(name: string): LeafNode {
  return { type: 'leaf', id: makeId(), name }
}

/** Replace the leaf with the given id with a split containing old leaf + new leaf. */
function splitLeaf(
  node: TileNode,
  targetId: string,
  direction: SplitDirection,
  ratio: number,
  newLeafName: string
): TileNode {
  if (node.type === 'leaf') {
    if (node.id !== targetId) return node
    const newLeaf = makeLeaf(newLeafName)
    const split: SplitNode = {
      type: 'split',
      id: makeId(),
      direction,
      ratio,
      first: node,
      second: newLeaf
    }
    return split
  }
  return {
    ...node,
    first: splitLeaf(node.first, targetId, direction, ratio, newLeafName),
    second: splitLeaf(node.second, targetId, direction, ratio, newLeafName)
  }
}

/** Rename a leaf node. */
function renameLeaf(node: TileNode, targetId: string, newName: string): TileNode {
  if (node.type === 'leaf') {
    return node.id === targetId ? { ...node, name: newName } : node
  }
  return {
    ...node,
    first: renameLeaf(node.first, targetId, newName),
    second: renameLeaf(node.second, targetId, newName)
  }
}

/**
 * Remove a leaf and collapse its parent split.
 * The sibling of the removed leaf takes its parent's place.
 */
function removeLeaf(node: TileNode, targetId: string): TileNode | null {
  if (node.type === 'leaf') {
    return node.id === targetId ? null : node
  }
  const first = removeLeaf(node.first, targetId)
  const second = removeLeaf(node.second, targetId)
  if (first === null) return second
  if (second === null) return first
  return { ...node, first, second }
}

/** Update the ratio of a split node. */
function updateRatio(node: TileNode, splitId: string, ratio: number): TileNode {
  if (node.type === 'leaf') return node
  if (node.id === splitId) return { ...node, ratio: Math.max(0.1, Math.min(0.9, ratio)) }
  return {
    ...node,
    first: updateRatio(node.first, splitId, ratio),
    second: updateRatio(node.second, splitId, ratio)
  }
}

/** Collect all leaf nodes. */
export function collectLeaves(node: TileNode): LeafNode[] {
  if (node.type === 'leaf') return [node]
  return [...collectLeaves(node.first), ...collectLeaves(node.second)]
}

export function useTileActions(
  tree: TileNode,
  setTree: (t: TileNode) => void
) {
  const split = useCallback(
    (leafId: string, direction: SplitDirection, ratio: number, newName: string) => {
      setTree(splitLeaf(tree, leafId, direction, ratio, newName))
    },
    [tree, setTree]
  )

  const rename = useCallback(
    (leafId: string, newName: string) => {
      setTree(renameLeaf(tree, leafId, newName))
    },
    [tree, setTree]
  )

  const remove = useCallback(
    (leafId: string) => {
      const next = removeLeaf(tree, leafId)
      if (next !== null) setTree(next)
    },
    [tree, setTree]
  )

  const resize = useCallback(
    (splitId: string, ratio: number) => {
      setTree(updateRatio(tree, splitId, ratio))
    },
    [tree, setTree]
  )

  return { split, rename, remove, resize }
}

export { makeLeaf }
