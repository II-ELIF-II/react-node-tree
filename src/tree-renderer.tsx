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
  rendererClassName?: string;
  nodeFrameClassName?: string;
  nodeFrameStyle?: React.CSSProperties;
};

function axisToFlexAlign(axis: AlignAxis): React.CSSProperties["alignItems"] {
  if (axis === "start") {
    return "flex-start";
  }
  if (axis === "end") {
    return "flex-end";
  }
  return "center";
}

function axisToFlexJustify(axis: AlignAxis): React.CSSProperties["justifyContent"] {
  if (axis === "start") {
    return "flex-start";
  }
  if (axis === "end") {
    return "flex-end";
  }
  return "center";
}

function NodeFrame({ node, className, onRef, children, ...props }: NodeFrameProps) {
  return (
    <div
      ref={(element) => {
        onRef(node.id, element);
      }}
      className={cn("unt-tree-node-hit", className)}
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
  nodeFrameClassName,
  nodeFrameStyle,
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
  nodeFrameClassName?: string;
  nodeFrameStyle?: React.CSSProperties;
}): React.ReactNode {
  const stackUnder = !flowDown && node.children?.layout === "stack";
  if (path.has(node.id)) {
    return null;
  }

  path.add(node.id);
  const childrenLayoutIsStack = node.children?.layout === "stack" || !flowDown;
  const childCount = node.children?.nodes.length ?? 0;
  const isLeaf = childCount === 0;
  const pathIds = [...path];
  const childrenContent =
    node.children?.nodes && node.children.nodes.length > 0 ? (
      <div
        className="unt-tree-children"
        style={{
          display: "flex",
          flexShrink: 0,
          flexDirection: childrenLayoutIsStack ? "column" : "row",
          alignItems: axisToFlexAlign(childrenLayoutIsStack ? alignX : alignY),
          justifyContent: axisToFlexJustify(childrenLayoutIsStack ? alignY : alignX),
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
            nodeFrameClassName,
            nodeFrameStyle,
          }),
        )}
      </div>
    ) : null;
  path.delete(node.id);

  return (
    <div
      key={`${node.id}-${index}`}
      className="unt-tree-node-wrap"
      style={{
        display: "flex",
        position: "relative",
        flexDirection: flowDown || stackUnder ? "column" : "row",
        alignItems: axisToFlexAlign(flowDown ? alignX : alignY),
        justifyContent: axisToFlexJustify(flowDown ? alignY : alignX),
      }}
    >
      <NodeFrame
        node={node}
        className={cn("node-enter unt-tree-node-frame", nodeFrameClassName)}
        style={{
          justifyContent: axisToFlexJustify(alignX),
          animationDuration: `${layoutState.nodeAnimDuration}s`,
          animationDelay: `${
            layoutState.nodeDelays.get(node.id) ?? depth * 0.08 + index * 0.04
          }s`,
          ...nodeFrameStyle,
        }}
        onRef={registerNode}
      >
        {debug ? (
          <div
            className={cn(
              "unt-tree-debug-badge",
              `unt-tree-debug-badge--${depth % 6}`,
            )}
          >
            <div>{`DEPTH: ${depth}`}</div>
            <div>{`PARENT-ID: ${parentId ?? "root"}`}</div>
            <div>{`NODE-ID: ${node.id}`}</div>
            <div>{`C-LAYOUT: ${node.children?.layout ?? "N/A"}`}</div>
          </div>
        ) : null}
        {node.render({
          node,
          index,
          depth,
          parentId,
          path: pathIds,
          isLeaf,
          childCount,
          isNodeAnimationDone: doneNodes.has(node.id),
        })}
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
  rendererClassName,
  nodeFrameClassName,
  nodeFrameStyle,
}: TreeRendererProps) {
  const rootLayoutRow = rootLayout === "row";
  return (
    <section
      className={cn("unt-tree-renderer", rendererClassName)}
      style={{
        gap,
        display: "flex",
        width: "100%",
        overflow: "visible",
        position: "relative",
        zIndex: 10,
        flexDirection: rootLayoutRow ? "row" : "column",
        alignItems: axisToFlexAlign(rootLayoutRow ? alignY : alignX),
        justifyContent: axisToFlexJustify(rootLayoutRow ? alignX : alignY),
      }}
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
          nodeFrameClassName,
          nodeFrameStyle,
        }),
      )}
    </section>
  );
}
