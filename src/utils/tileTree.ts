import { v4 as uuidv4 } from 'uuid';
import type { SplitDirection, TileLeaf, TileNode } from '../types';

export function createLeaf(name = 'New Tile'): TileLeaf {
  return { type: 'leaf', id: uuidv4(), name };
}

export function splitLeaf(
  node: TileNode,
  targetId: string,
  direction: SplitDirection,
  ratio: number
): TileNode {
  if (node.type === 'leaf') {
    if (node.id !== targetId) return node;
    const clamped = Math.min(0.9, Math.max(0.1, ratio));
    return {
      type: 'split',
      direction,
      ratio: clamped,
      first: { ...node },
      second: createLeaf(`${node.name} 2`),
    };
  }

  return {
    ...node,
    first: splitLeaf(node.first, targetId, direction, ratio),
    second: splitLeaf(node.second, targetId, direction, ratio),
  };
}

export function updateLeafName(
  node: TileNode,
  targetId: string,
  name: string
): TileNode {
  if (node.type === 'leaf') {
    if (node.id !== targetId) return node;
    return { ...node, name };
  }
  return {
    ...node,
    first: updateLeafName(node.first, targetId, name),
    second: updateLeafName(node.second, targetId, name),
  };
}

export function removeLeaf(node: TileNode, targetId: string): TileNode | null {
  if (node.type === 'leaf') {
    return node.id === targetId ? null : node;
  }

  const first = removeLeaf(node.first, targetId);
  const second = removeLeaf(node.second, targetId);

  if (!first && !second) return null;
  if (!first) return second;
  if (!second) return first;

  return { ...node, first, second };
}

export function findLeaf(node: TileNode, targetId: string): TileLeaf | null {
  if (node.type === 'leaf') {
    return node.id === targetId ? node : null;
  }
  return findLeaf(node.first, targetId) ?? findLeaf(node.second, targetId);
}

export function countLeaves(node: TileNode): number {
  if (node.type === 'leaf') return 1;
  return countLeaves(node.first) + countLeaves(node.second);
}
