# @ii_elif_ii/ui-node-tree

Animated React node-tree component with configurable layouts and SVG connection lines.
Built primarily for my personal use.

## Install

```bash
npm install @ii_elif_ii/ui-node-tree
```

Peer dependencies (install in consuming app if needed):

- `react`
- `react-dom`

## Usage

```tsx
import * as React from "react";
import { NodeTree, type TreeNode } from "@ii_elif_ii/ui-node-tree";
import "@ii_elif_ii/ui-node-tree/styles.css";

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
      debug={false}
      className={{ frame: "my-node-frame" }}
      layout={{ direction: "down", root: "stack", gap: 64 }}
      connection={{ color: "rgba(255,255,255)", width: 1, opacity: 0.15 }}
      animation={{ durationMs: 2000 }}
      nodeFrame={{ style: { borderRadius: 12 } }}
    />
  );
}
```

## API

### `NodeTree`

Main React component that renders the tree and animated SVG connections.

### `TreeNode`

Node model for `nodeTree`.

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

### `TreeNodeRenderContext`

Render callback context:

- `node`: current `TreeNode`
- `index`: sibling index
- `depth`: depth from root (`0` for root)
- `parentId`: parent node id (undefined for root)
- `path`: ancestor path ending with current node id
- `isLeaf`: whether node has no children
- `childCount`: direct children count
- `isNodeAnimationDone`: whether node enter animation has finished

### `NodeTreeProps`

Props for `NodeTree`:

- `nodeTree: TreeNode[]` root nodes to render
- `className?: NodeTreeClassNameOptions` slot classes (`root`, `canvas`, `renderer`, `frame`, `connections`)
- `layout?: NodeTreeLayoutOptions` layout config
  - `align?: "center" | "start" | "end" | { x, y }`
  - `direction?: "down" | "right"`
  - `root?: "stack" | "row"`
  - `gap?: number`
  - `padding?: number`
  - `containerPadding?: number`
- `connection?: NodeTreeConnectionOptions`
  - `color?: string`
  - `width?: number`
  - `opacity?: number`
- `animation?: NodeTreeAnimationOptions`
  - `durationMs?: number`
- `nodeFrame?: NodeTreeFrameOptions`
  - `style?: React.CSSProperties`
- `debug?: boolean`

### Exported Types

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
