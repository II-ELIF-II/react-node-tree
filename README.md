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

- `NodeTree`
- `TreeNode`
- `NodeTreeProps`

## Publish (Public npm)

1. Authenticate to npm:

```bash
npm login
```

2. Build:

```bash
npm run build
```

3. Publish:

```bash
npm publish
```

This package is configured with:

- `publishConfig.access = "public"`
- scoped name `@ii_elif_ii/ui-node-tree`
