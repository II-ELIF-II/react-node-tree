import * as React from "react";
import "./node-tree.css";
import { cn } from "./utils/cn";
import { TreeConnections } from "./tree-connections";
import { TreeRenderer } from "./tree-renderer";
import { useNodeTreeLayout } from "./use-node-tree-layout";
import type { AlignAxis, NodeTreeProps } from "./types";

const NodeTree = React.forwardRef<HTMLDivElement, NodeTreeProps>(
  (
    {
      className,
      nodeTree,
      layout,
      connection,
      animation,
      nodeFrame,
      debug = true,
      style,
      ...props
    },
    ref,
  ) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const nodeRefs = React.useRef(new Map<string, HTMLDivElement>());
    const registerNode = React.useCallback(
      (id: string, element: HTMLDivElement | null) => {
        const registry = nodeRefs.current;
        if (element) {
          registry.set(id, element);
        } else {
          registry.delete(id);
        }
      },
      [],
    );

    const resolvedAlign = layout?.align ?? "center";
    const resolvedDirection = layout?.direction ?? "down";
    const resolvedRootLayout = layout?.root ?? "stack";
    const resolvedPaddingContainer = layout?.containerPadding ?? 128;
    const resolvedPadding = layout?.padding ?? 64;
    const resolvedGap = layout?.gap ?? 64;
    const resolvedStrokeColor = connection?.color ?? "rgba(255,255,255)";
    const resolvedStrokeWidth = connection?.width ?? 1;
    const resolvedAnimationDurationMs = animation?.durationMs ?? 2000;
    const resolvedNodeFrameStyle = nodeFrame?.style;

    const { doneNodes, layoutState } = useNodeTreeLayout({
      nodeTree,
      direction: resolvedDirection,
      gap: resolvedGap,
      padding: resolvedPadding,
      animationSpeed: resolvedAnimationDurationMs,
      debug,
      containerRef,
      nodeRefs,
    });

    const flowDown = resolvedDirection === "down";
    const alignValue = resolvedAlign;
    const alignX: AlignAxis =
      typeof alignValue === "string" ? alignValue : alignValue.x;
    const alignY: AlignAxis =
      typeof alignValue === "string" ? "start" : alignValue.y;
    const resolvedConnectionOpacity = connection?.opacity ?? (debug ? 1 : 0.1);

    return (
      <div
        ref={ref}
        className={cn("unt-tree-root-container", className?.root)}
        style={style}
        {...props}
      >
        <div
          ref={containerRef}
          className={cn("unt-tree-canvas", className?.canvas)}
          style={{ padding: resolvedPaddingContainer }}
        >
          <TreeConnections
            layoutState={layoutState}
            debug={debug}
            strokeColor={resolvedStrokeColor}
            strokeWidth={resolvedStrokeWidth}
            opacity={resolvedConnectionOpacity}
            className={className?.connections}
          />
          <TreeRenderer
            nodeTree={nodeTree}
            rootLayout={resolvedRootLayout}
            flowDown={flowDown}
            alignX={alignX}
            alignY={alignY}
            gap={resolvedGap}
            debug={debug}
            layoutState={layoutState}
            doneNodes={doneNodes}
            registerNode={registerNode}
            rendererClassName={className?.renderer}
            nodeFrameClassName={className?.frame}
            nodeFrameStyle={resolvedNodeFrameStyle}
          />
        </div>
      </div>
    );
  },
);

NodeTree.displayName = "NodeTree";

export { NodeTree };
