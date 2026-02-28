# @ii-elif-ii/ui-node-tree

Animated React node-tree component with configurable layouts and SVG connection lines.

## Install

```bash
npm install @ii-elif-ii/ui-node-tree
```

Peer dependencies (install in consuming app if needed):

- `react`
- `react-dom`

## Usage

```tsx
import * as React from "react";
import { NodeTree, type TypeNode } from "@ii-elif-ii/ui-node-tree";

const tree: TypeNode[] = [
  {
    id: "root",
    renderNode: (node) => <div className="rounded border p-3">{node.id}</div>,
    children: {
      layout: "row",
      nodes: [
        { id: "child-1", renderNode: (node) => <div>{node.id}</div> },
        { id: "child-2", renderNode: (node) => <div>{node.id}</div> }
      ]
    }
  }
];

export function Demo() {
  return <NodeTree nodeTree={tree} debug={false} />;
}
```

## API

- `NodeTree`
- `TypeNode`
- `NodeTreeProps`

## Publish (Private npm)

1. Authenticate to npm:

```bash
npm login
```

2. Build:

```bash
npm run build
```

3. Publish as private scoped package:

```bash
npm publish
```

This package is configured with:

- `publishConfig.access = "restricted"`
- scoped name `@ii-elif-ii/ui-node-tree`
