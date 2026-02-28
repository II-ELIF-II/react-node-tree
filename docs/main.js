import React from "react";
import { createRoot } from "react-dom/client";

const styleHref = new URL("./dist/node-tree.css", import.meta.url).href;
if (!document.querySelector('link[data-ui-node-tree-demo="true"]')) {
  const libStyle = document.createElement("link");
  libStyle.rel = "stylesheet";
  libStyle.href = styleHref;
  libStyle.setAttribute("data-ui-node-tree-demo", "true");
  document.head.appendChild(libStyle);
}

const moduleHref = new URL("./dist/index.js", import.meta.url).href;
const { NodeTree } = await import(moduleHref);

const e = React.createElement;

function nodeCard(ctx) {
  return e(
    "div",
    { className: "demo-node" },
    e("div", { className: "demo-node-title" }, ctx.node.id),
    e("div", { className: "demo-node-meta" }, `Depth ${ctx.depth} • Children ${ctx.childCount}`),
    e(
      "div",
      { className: "demo-node-state" },
      ctx.isNodeAnimationDone ? "animation: complete" : "animation: running",
    ),
  );
}

const nodeTree = [
  {
    id: "CEO",
    render: nodeCard,
    children: {
      layout: "row",
      nodes: [
        {
          id: "CTO",
          render: nodeCard,
          children: {
            layout: "stack",
            nodes: [
              { id: "Platform", render: nodeCard },
              { id: "DevEx", render: nodeCard },
            ],
          },
        },
        {
          id: "COO",
          render: nodeCard,
          children: {
            layout: "stack",
            nodes: [
              { id: "Ops", render: nodeCard },
              { id: "Finance", render: nodeCard },
            ],
          },
        },
        {
          id: "CPO",
          render: nodeCard,
          children: {
            layout: "stack",
            nodes: [
              { id: "Design", render: nodeCard },
              { id: "Research", render: nodeCard },
            ],
          },
        },
      ],
    },
  },
];

function App() {
  return e(NodeTree, {
    nodeTree,
    debug: false,
    className: {
      root: "demo-root",
      frame: "demo-frame",
      connections: "demo-connections",
    },
    layout: {
      align: { x: "center", y: "start" },
      direction: "down",
      root: "stack",
      gap: 44,
      padding: 56,
      containerPadding: 56,
    },
    connection: {
      color: "#60a5fa",
      width: 2,
      opacity: 0.3,
    },
    animation: {
      durationMs: 1800,
    },
    nodeFrame: {
      style: { padding: "12px" },
    },
  });
}

createRoot(document.getElementById("app")).render(e(App));
