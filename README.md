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
import "@ii-elif-ii/ui-node-tree/styles.css";

const tree: TypeNode[] = [
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
- `TypeNode`
- `NodeTreeProps`

## GitHub Demo

Live demo: [https://ii-elif-ii.github.io/ui-node-tree/](https://ii-elif-ii.github.io/ui-node-tree/)

GitHub Pages deployment is handled by [`deploy-pages.yml`](./.github/workflows/deploy-pages.yml):

1. Push to `main` (or run the workflow manually).
2. The workflow runs `npm ci` and `npm run build`.
3. It publishes `docs/` plus built `dist/` assets to GitHub Pages.

After first deployment, set repository Pages source to **GitHub Actions** in repo settings.

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
