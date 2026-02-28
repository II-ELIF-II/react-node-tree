import * as React from "react";
import { cn } from "./utils/cn";
import type {
  AlignAxis,
  NodeFrameProps,
  NodeTreeLayoutState,
  TypeNode,
} from "./types";

type TreeRendererProps = {
  nodeTree: TypeNode[];
  rootLayout: "stack" | "row";
  flowDown: boolean;
  alignX: AlignAxis;
  alignY: AlignAxis;
  gap: number;
  debug: boolean;
  layoutState: NodeTreeLayoutState;
  doneNodes: Set<string>;
  registerNode: (id: string, element: HTMLDivElement | null) => void;
};

function NodeFrame({ node, className, onRef, children, ...props }: NodeFrameProps) {
  return (
    <div
      ref={(element) => {
        onRef(node.id, element);
      }}
      className={cn("cursor-auto", className)}
      data-nodeframe
      data-viewport-no-pan
      {...props}
    >
      {children}
    </div>
  );
}

function renderTreeNode({
  node,
  index,
  parentId,
  depth,
  path,
  flowDown,
  alignX,
  alignY,
  gap,
  debug,
  layoutState,
  doneNodes,
  registerNode,
}: {
  node: TypeNode;
  index: number;
  parentId?: string;
  depth: number;
  path: Set<string>;
  flowDown: boolean;
  alignX: AlignAxis;
  alignY: AlignAxis;
  gap: number;
  debug: boolean;
  layoutState: NodeTreeLayoutState;
  doneNodes: Set<string>;
  registerNode: (id: string, element: HTMLDivElement | null) => void;
}): React.ReactNode {
  const stackUnder = !flowDown && node.children?.layout === "stack";
  if (path.has(node.id)) {
    return null;
  }

  path.add(node.id);
  const childrenContent =
    node.children?.nodes && node.children.nodes.length > 0 ? (
      <div
        className={cn(
          "flex shrink-0",
          {
            "flex-col": node.children?.layout === "stack" || !flowDown,
            "flex-row": node.children?.layout !== "stack" && flowDown,
          },
          {
            "items-start":
              (node.children?.layout === "stack" || !flowDown
                ? alignX
                : alignY) === "start",
            "items-center":
              (node.children?.layout === "stack" || !flowDown
                ? alignX
                : alignY) === "center",
            "items-end":
              (node.children?.layout === "stack" || !flowDown
                ? alignX
                : alignY) === "end",
          },
          {
            "justify-start":
              (node.children?.layout === "stack" || !flowDown
                ? alignY
                : alignX) === "start",
            "justify-center":
              (node.children?.layout === "stack" || !flowDown
                ? alignY
                : alignX) === "center",
            "justify-end":
              (node.children?.layout === "stack" || !flowDown
                ? alignY
                : alignX) === "end",
          },
        )}
        style={{
          gap,
          marginTop: flowDown || stackUnder ? gap : 0,
          marginLeft: flowDown
            ? node.children?.layout === "stack"
              ? gap
              : 0
            : stackUnder
              ? gap / 2
              : gap,
        }}
      >
        {node.children.nodes.map((child, childIndex) =>
          renderTreeNode({
            node: child,
            index: childIndex,
            parentId: node.id,
            depth: depth + 1,
            path,
            flowDown,
            alignX,
            alignY,
            gap,
            debug,
            layoutState,
            doneNodes,
            registerNode,
          }),
        )}
      </div>
    ) : null;
  path.delete(node.id);

  return (
    <div
      key={`${node.id}-${index}`}
      className={cn(
        "relative flex",
        {
          "flex-col": flowDown || stackUnder,
          "flex-row": !flowDown && !stackUnder,
        },
        {
          "items-start": (flowDown ? alignX : alignY) === "start",
          "items-center": (flowDown ? alignX : alignY) === "center",
          "items-end": (flowDown ? alignX : alignY) === "end",
        },
        {
          "justify-start": (flowDown ? alignY : alignX) === "start",
          "justify-center": (flowDown ? alignY : alignX) === "center",
          "justify-end": (flowDown ? alignY : alignX) === "end",
        },
      )}
    >
      <NodeFrame
        node={node}
        className={cn("node-enter relative flex border border-white/20 p-4", {
          "justify-start": alignX === "start",
          "justify-center": alignX === "center",
          "justify-end": alignX === "end",
        })}
        style={{
          animationDuration: `${layoutState.nodeAnimDuration}s`,
          animationDelay: `${
            layoutState.nodeDelays.get(node.id) ?? depth * 0.08 + index * 0.04
          }s`,
        }}
        onRef={registerNode}
      >
        {debug ? (
          <div
            className={cn("absolute top-2 left-2 z-10 px-2 py-1 text-xs", {
              "bg-emerald-200 text-emerald-950": depth % 6 === 0,
              "bg-sky-200 text-sky-950": depth % 6 === 1,
              "bg-amber-200 text-amber-950": depth % 6 === 2,
              "bg-rose-200 text-rose-950": depth % 6 === 3,
              "bg-lime-200 text-lime-950": depth % 6 === 4,
              "bg-violet-200 text-violet-950": depth % 6 === 5,
            })}
          >
            <div>{`DEPTH: ${depth}`}</div>
            <div>{`PARENT-ID: ${parentId ?? "root"}`}</div>
            <div>{`NODE-ID: ${node.id}`}</div>
            <div>{`C-LAYOUT: ${node.children?.layout ?? "N/A"}`}</div>
          </div>
        ) : null}
        {node.renderNode(node, index, depth, doneNodes.has(node.id))}
      </NodeFrame>

      {childrenContent}
    </div>
  );
}

export function TreeRenderer({
  nodeTree,
  rootLayout,
  flowDown,
  alignX,
  alignY,
  gap,
  debug,
  layoutState,
  doneNodes,
  registerNode,
}: TreeRendererProps) {
  return (
    <section
      className={cn(
        "relative z-10 flex w-full overflow-visible",
        {
          "flex-row": rootLayout === "row",
          "flex-col": rootLayout !== "row",
        },
        rootLayout === "row"
          ? {
              "items-start": alignY === "start",
              "items-center": alignY === "center",
              "items-end": alignY === "end",
              "justify-start": alignX === "start",
              "justify-center": alignX === "center",
              "justify-end": alignX === "end",
            }
          : {
              "items-start": alignX === "start",
              "items-center": alignX === "center",
              "items-end": alignX === "end",
              "justify-start": alignY === "start",
              "justify-center": alignY === "center",
              "justify-end": alignY === "end",
            },
      )}
      style={{ gap }}
    >
      {nodeTree.map((node, index) =>
        renderTreeNode({
          node,
          index,
          depth: 0,
          path: new Set<string>(),
          flowDown,
          alignX,
          alignY,
          gap,
          debug,
          layoutState,
          doneNodes,
          registerNode,
        }),
      )}
    </section>
  );
}
