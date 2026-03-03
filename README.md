# @ii_elif_ii/react-node-tree

Animated React tree renderer with configurable layout and SVG connection lines.

## Install

```bash
npm install @ii_elif_ii/react-node-tree
```

Peer dependencies:

- `react`
- `react-dom`

## Quick Start

```tsx
import * as React from "react";
import { NodeTree, type TreeNode } from "@ii_elif_ii/react-node-tree";
import "@ii_elif_ii/react-node-tree/styles.css";

const tree: TreeNode[] = [
  {
    id: "root",
    render: ({ node }) => <div className="rounded border p-3">{node.id}</div>,
    children: {
      layout: "row",
      nodes: [
        { id: "child-1", render: ({ node }) => <div>{node.id}</div> },
        { id: "child-2", render: ({ node }) => <div>{node.id}</div> },
      ],
    },
  },
];

export function Demo() {
  return (
    <NodeTree
      nodeTree={tree}
      layout={{ direction: "down", root: "stack", gap: 64 }}
      connection={{ color: "rgba(255,255,255)", width: 1, opacity: 0.15 }}
      animation={{ durationMs: 2000 }}
      className={{ frame: "my-node-frame" }}
      nodeFrame={{ style: { borderRadius: 12 } }}
    />
  );
}
```

## Terminology

- `NodeTree`: the React component that renders the full tree.
- `TreeNode`: the node data model used to build your tree.

## API

### `TreeNode<TData = unknown>`

```ts
type TreeNode<TData = unknown> = {
  id: string;
  data?: TData;
  render: (context: TreeNodeRenderContext<TData>) => React.ReactNode;
  children?: {
    layout?: "stack" | "row";
    nodes: TreeNode<TData>[];
  };
};
```

### `TreeNodeRenderContext<TData = unknown>`

- `node`: current `TreeNode`
- `index`: index among siblings
- `depth`: depth from root (`0` for root)
- `parentId`: parent id (`undefined` for root nodes)
- `path`: ancestor path ending with current node id
- `isLeaf`: whether the node has no children
- `childCount`: number of direct children
- `isNodeAnimationDone`: whether this node's enter animation finished

### `NodeTreeProps`

- `nodeTree: TreeNode[]` root nodes to render
- `className?: NodeTreeClassNameOptions` slot classes (`root`, `canvas`, `renderer`, `frame`, `connections`)
- `layout?: NodeTreeLayoutOptions`
- `connection?: NodeTreeConnectionOptions`
- `animation?: NodeTreeAnimationOptions`
- `nodeFrame?: NodeTreeFrameOptions`
- `debug?: boolean`
- all standard `div` attributes except plain `className` (this package uses slot-based `className`)

### `NodeTreeLayoutOptions`

- `align?: "center" | "start" | "end" | { x, y }`
- `direction?: "down" | "right"`
- `root?: "stack" | "row"`
- `gap?: number`
- `padding?: number`
- `containerPadding?: number`

### `NodeTreeConnectionOptions`

- `color?: string`
- `width?: number`
- `opacity?: number`

### `NodeTreeAnimationOptions`

- `durationMs?: number`

### `NodeTreeFrameOptions`

- `style?: React.CSSProperties`

## Exports

### Component

- `NodeTree`

### Types

- `TreeNode`
- `TreeNodeChildren`
- `TreeNodeRenderContext`
- `TreeNodeEdge`
- `NodeTreeProps`
- `NodeTreeLayoutOptions`
- `NodeTreeConnectionOptions`
- `NodeTreeAnimationOptions`
- `NodeTreeClassNameOptions`
- `NodeTreeFrameOptions`
- `NodeFrameProps`
