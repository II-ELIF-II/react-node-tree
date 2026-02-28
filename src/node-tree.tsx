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
      align = "center",
      direction = "down",
      rootLayout = "stack",
      paddingContainer = 128,
      padding = 64,
      gap = 64,
      debug = true,
      strokeColor = "rgba(255,255,255)",
      strokeWidth = 1,
      animationSpeed = 2000,
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

    const { doneNodes, layoutState } = useNodeTreeLayout({
      nodeTree,
      direction,
      gap,
      padding,
      animationSpeed,
      debug,
      containerRef,
      nodeRefs,
    });

    const flowDown = direction === "down";
    const alignValue = align ?? "center";
    const alignX: AlignAxis =
      typeof alignValue === "string" ? alignValue : alignValue.x;
    const alignY: AlignAxis =
      typeof alignValue === "string" ? "start" : alignValue.y;

    return (
      <div
        ref={ref}
        className={cn("relative h-full min-h-0 w-full overflow-hidden", className)}
        style={style}
        {...props}
      >
        <div
          ref={containerRef}
          className="relative"
          style={{ padding: paddingContainer }}
        >
          <TreeConnections
            layoutState={layoutState}
            debug={debug}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
          />
          <TreeRenderer
            nodeTree={nodeTree}
            rootLayout={rootLayout}
            flowDown={flowDown}
            alignX={alignX}
            alignY={alignY}
            gap={gap}
            debug={debug}
            layoutState={layoutState}
            doneNodes={doneNodes}
            registerNode={registerNode}
          />
        </div>
      </div>
    );
  },
);

NodeTree.displayName = "NodeTree";

export { NodeTree };
