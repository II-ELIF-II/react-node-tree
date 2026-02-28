import * as React from "react";
import { cn } from "./utils/cn";

const NODE_TREE_STYLES = `
  @keyframes node-enter {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  .node-enter {
    animation-name: node-enter;
    animation-timing-function: ease-out;
    animation-fill-mode: both;
  }
  @keyframes line-draw {
    0% { opacity: 0.2; }
    100% { stroke-dashoffset: 0; opacity: 1; }
  }
  .node-line {
    animation-name: line-draw;
    animation-timing-function: ease-out;
    animation-fill-mode: both;
  }
`;

export type TypeNode = {
  id: string;
  /** Rendered node content. */
  renderNode: (
    node: TypeNode,
    index: number,
    depth: number,
    isAnimationDone: boolean,
  ) => React.ReactNode;
  /** Optional child group. */
  children?: { layout?: "stack" | "row"; nodes: TypeNode[] };
};
type TypeNodeEdge = {
  key: string;
  from: string;
  to: string;
  index: number;
  count: number;
};

function collectEdges(nodes: TypeNode[]) {
  const edges: TypeNodeEdge[] = [];
  const visiting = new Set<string>();
  const visit = (node: TypeNode) => {
    if (visiting.has(node.id)) {
      return;
    }
    visiting.add(node.id);
    if (node.children?.nodes && node.children.nodes.length > 0) {
      node.children.nodes.forEach((child, index) => {
        const key = `${node.id}=>${child.id}`;
        edges.push({
          key,
          from: node.id,
          to: child.id,
          index,
          count: node.children?.nodes.length ?? 1,
        });
        visit(child);
      });
    }
    visiting.delete(node.id);
  };

  nodes.forEach(visit);
  return edges;
}

export interface NodeTreeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Root nodes to render. */
  nodeTree: TypeNode[];
  /** Extra padding around connection bounds. */
  padding?: number;
  /** Padding around the entire tree container. */
  paddingContainer?: number;
  /** Spacing between nodes. */
  gap?: number;
  width?: number | string;
  height?: number | string;
  /** Horizontal/vertical alignment (string applies to x; object allows x/y split). */
  align?:
    | "center"
    | "start"
    | "end"
    | { x: "center" | "start" | "end"; y: "center" | "start" | "end" };
  /** Overall flow direction for child placement. */
  direction?: "down" | "right";
  /** Layout for top-level nodes. */
  rootLayout?: "stack" | "row";
  /** Line stroke color */
  strokeColor?: string;
  /** Line stroke width in px. */
  strokeWidth?: number;
  /** Total animation time in ms (all nodes/lines complete within this duration). */
  animationSpeed?: number;
  /** Show debug overlay badges. */
  debug?: boolean;
}

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
    const [layoutState, setLayoutState] = React.useState<{
      segments: Array<{
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        length: number;
        depth: number;
        delay: number;
        duration: number;
        colorIndex: number;
        order: number;
      }>;
      nodeDelays: Map<string, number>;
      nodeAnimDuration: number;
      animationTotal: number;
      svgBounds: {
        width: number;
        height: number;
        offsetX: number;
        offsetY: number;
      } | null;
    }>({
      segments: [],
      nodeDelays: new Map(),
      nodeAnimDuration: 0.42,
      animationTotal: 0,
      svgBounds: null,
    });
    const [doneNodes, setDoneNodes] = React.useState<Set<string>>(
      () => new Set(),
    );
    const doneNodesRef = React.useRef<Set<string>>(new Set());
    const nodeRefs = React.useRef(new Map<string, HTMLDivElement>());
    const edges = React.useMemo(() => collectEdges(nodeTree), [nodeTree]);
    const descendantMap = React.useMemo(() => {
      const map = new Map<string, string[]>();
      const visiting = new Set<string>();
      const visit = (node: TypeNode): string[] => {
        if (visiting.has(node.id)) {
          return [];
        }
        visiting.add(node.id);
        const descendants: string[] = [];
        node.children?.nodes.forEach((child) => {
          descendants.push(child.id);
          descendants.push(...visit(child));
        });
        map.set(node.id, descendants);
        visiting.delete(node.id);
        return descendants;
      };
      nodeTree.forEach(visit);
      return map;
    }, [nodeTree]);
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

    const totalAnimationSec = Math.max(0.1, animationSpeed / 1000);

    const drawConnections = React.useCallback(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const flowDown = direction === "down";

      // Compute element bounds relative to the tree container (ignores viewport transforms).
      const getRelativeRect = (element: HTMLElement) => {
        let left = 0;
        let top = 0;
        let current: HTMLElement | null = element;
        while (current && current !== container) {
          left += current.offsetLeft;
          top += current.offsetTop;
          current = current.offsetParent as HTMLElement | null;
        }
        return {
          left,
          top,
          right: left + element.offsetWidth,
          bottom: top + element.offsetHeight,
          width: element.offsetWidth,
          height: element.offsetHeight,
        };
      };
      // Pre-compute rects once per draw to avoid repeated DOM walks.
      const rectMap = new Map<string, ReturnType<typeof getRelativeRect>>();
      nodeRefs.current.forEach((el, id) => {
        rectMap.set(id, getRelativeRect(el));
      });

      // Build line segments in container coordinates.
      const nextSegments: Array<{
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        length: number;
        depth: number;
        delay: number;
        duration: number;
        colorIndex: number;
        order: number;
      }> = [];
      const nextNodeDelays = new Map<string, number>();
      const baseSecondsPerPixel = 1 / 900;
      const baseNodeAnimDuration = 0.42;
      const edgeColorIndex = debug ? new Map<string, number>() : null;
      const edgeData = new Map<
        string,
        {
          edge: TypeNodeEdge;
          fromX: number;
          fromY: number;
          fromBottom: number;
          fromCenterX: number;
          toX: number;
          toY: number;
          toLeft: number;
          toRight: number;
          toCenterY: number;
        }
      >();

      edges.forEach((edge) => {
        const fromRect = rectMap.get(edge.from);
        const toRect = rectMap.get(edge.to);
        if (!fromRect || !toRect) {
          return;
        }

        const fromX = flowDown
          ? fromRect.left + fromRect.width / 2
          : fromRect.right;
        const fromY = flowDown
          ? fromRect.bottom
          : fromRect.top + fromRect.height / 2;
        const toX = flowDown ? toRect.left + toRect.width / 2 : toRect.left;
        const toY = flowDown ? toRect.top : toRect.top + toRect.height / 2;

        edgeData.set(edge.key, {
          edge,
          fromX,
          fromY,
          fromBottom: fromRect.bottom,
          fromCenterX: fromRect.left + fromRect.width / 2,
          toX,
          toY,
          toLeft: toRect.left,
          toRight: toRect.left + toRect.width,
          toCenterY: toRect.top + toRect.height / 2,
        });
      });

      const pushSegment = (
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        depth: number,
        delay: number,
        colorIndex: number,
        order: number,
      ) => {
        const length = Math.hypot(x2 - x1, y2 - y1);
        const duration = Math.max(0.05, length * baseSecondsPerPixel);
        nextSegments.push({
          x1,
          y1,
          x2,
          y2,
          length,
          depth,
          delay,
          duration,
          colorIndex,
          order,
        });
        return duration;
      };

      const visit = (node: TypeNode, depth: number, nodeDelay: number) => {
        const existing = nextNodeDelays.get(node.id) ?? 0;
        const resolvedDelay = Math.max(existing, nodeDelay);
        nextNodeDelays.set(node.id, resolvedDelay);

        const childEdges =
          node.children?.nodes
            .map((child) => edgeData.get(`${node.id}=>${child.id}`))
            .filter(Boolean) ?? [];
        const stackLayout = node.children?.layout === "stack";
        const descendantIds =
          flowDown && stackLayout ? (descendantMap.get(node.id) ?? []) : [];
        const descendantLefts =
          flowDown && stackLayout
            ? descendantIds
                .map((id) => rectMap.get(id))
                .filter(Boolean)
                .map((rect) => rect!.left)
            : [];
        const descendantMinLeft =
          descendantLefts.length > 0 ? Math.min(...descendantLefts) : undefined;
        const gutterX =
          flowDown && stackLayout
            ? (descendantMinLeft ??
                (childEdges.length > 0
                  ? Math.min(...childEdges.map((edge) => edge!.toLeft))
                  : 0)) -
              gap / 2
            : 0;
        const gutterY =
          !flowDown && stackLayout
            ? (childEdges.length > 0
                ? Math.min(...childEdges.map((edge) => edge!.toY))
                : 0) -
              gap / 2
            : 0;
        const gutterXRight =
          !flowDown && stackLayout
            ? (childEdges.length > 0
                ? Math.min(...childEdges.map((edge) => edge!.toLeft))
                : 0) -
              gap / 2
            : 0;

        const orderedChildren =
          node.children?.nodes
            .map((child) => {
              const edge = edgeData.get(`${node.id}=>${child.id}`);
              if (!edge) {
                return null;
              }
              const dx = edge.toX - edge.fromX;
              const dy = edge.toY - edge.fromY;
              const length = Math.hypot(dx, dy);
              return { child, edge, length, toX: edge.toX };
            })
            .filter(Boolean) ?? [];

        if (debug) {
          orderedChildren.sort((a, b) => {
            if (!a || !b) return 0;
            if (a.length !== b.length) {
              return a.length - b.length;
            }
            return a.toX - b.toX;
          });
        }

        orderedChildren.forEach((entry, index) => {
          if (!entry) {
            return;
          }
          const { child, edge } = entry;
          const edgeKey = edge.edge.key;
          let colorIndex = 0;
          if (edgeColorIndex) {
            if (!edgeColorIndex.has(edgeKey)) {
              edgeColorIndex.set(edgeKey, edgeColorIndex.size);
            }
            colorIndex = edgeColorIndex.get(edgeKey) ?? 0;
          }
          const order = orderedChildren.length - 1 - index;
          const edgeDelay = resolvedDelay + baseNodeAnimDuration + index * 0.04;
          let totalDuration = 0;
          if (flowDown && stackLayout) {
            const baseDrop = Math.max(12, gap / 2);
            const targetY = edge.toCenterY;
            const midY =
              edge.fromY + Math.min(baseDrop, (targetY - edge.fromY) * 0.6);
            totalDuration += pushSegment(
              edge.fromX,
              edge.fromY,
              edge.fromX,
              midY,
              depth,
              edgeDelay,
              colorIndex,
              order,
            );
            totalDuration += pushSegment(
              edge.fromX,
              midY,
              gutterX,
              midY,
              depth,
              edgeDelay + totalDuration,
              colorIndex,
              order,
            );
            totalDuration += pushSegment(
              gutterX,
              midY,
              gutterX,
              targetY,
              depth,
              edgeDelay + totalDuration,
              colorIndex,
              order,
            );
            totalDuration += pushSegment(
              gutterX,
              targetY,
              edge.toLeft,
              targetY,
              depth,
              edgeDelay + totalDuration,
              colorIndex,
              order,
            );
          } else if (!flowDown && stackLayout) {
            const targetY = edge.toCenterY;
            const baseDrop = Math.max(12, gap / 2);
            const midY =
              edge.fromBottom +
              Math.min(baseDrop, (targetY - edge.fromBottom) * 0.6);
            totalDuration += pushSegment(
              edge.fromCenterX,
              edge.fromBottom,
              edge.fromCenterX,
              midY,
              depth,
              edgeDelay,
              colorIndex,
              order,
            );
            totalDuration += pushSegment(
              edge.fromCenterX,
              midY,
              gutterXRight,
              midY,
              depth,
              edgeDelay + totalDuration,
              colorIndex,
              order,
            );
            totalDuration += pushSegment(
              gutterXRight,
              midY,
              gutterXRight,
              targetY,
              depth,
              edgeDelay + totalDuration,
              colorIndex,
              order,
            );
            totalDuration += pushSegment(
              gutterXRight,
              targetY,
              edge.toLeft,
              targetY,
              depth,
              edgeDelay + totalDuration,
              colorIndex,
              order,
            );
          } else if (flowDown) {
            const midY = edge.fromY + (edge.toY - edge.fromY) * 0.5;
            totalDuration += pushSegment(
              edge.fromX,
              edge.fromY,
              edge.fromX,
              midY,
              depth,
              edgeDelay,
              colorIndex,
              order,
            );
            totalDuration += pushSegment(
              edge.fromX,
              midY,
              edge.toX,
              midY,
              depth,
              edgeDelay + totalDuration,
              colorIndex,
              order,
            );
            totalDuration += pushSegment(
              edge.toX,
              midY,
              edge.toX,
              edge.toY,
              depth,
              edgeDelay + totalDuration,
              colorIndex,
              order,
            );
          } else {
            const midX = edge.fromX + (edge.toX - edge.fromX) * 0.5;
            totalDuration += pushSegment(
              edge.fromX,
              edge.fromY,
              midX,
              edge.fromY,
              depth,
              edgeDelay,
              colorIndex,
              order,
            );
            totalDuration += pushSegment(
              midX,
              edge.fromY,
              midX,
              edge.toY,
              depth,
              edgeDelay + totalDuration,
              colorIndex,
              order,
            );
            totalDuration += pushSegment(
              midX,
              edge.toY,
              edge.toX,
              edge.toY,
              depth,
              edgeDelay + totalDuration,
              colorIndex,
              order,
            );
          }
          visit(child, depth + 1, edgeDelay + totalDuration);
        });
      };

      nodeTree.forEach((node) => visit(node, 0, 0));

      if (nextSegments.length === 0) {
        setLayoutState((prev) => ({
          ...prev,
          segments: [],
          svgBounds: null,
          animationTotal: 0,
        }));
        setDoneNodes(new Set());
        doneNodesRef.current = new Set();
        return;
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      nextSegments.forEach((segment) => {
        minX = Math.min(minX, segment.x1, segment.x2);
        minY = Math.min(minY, segment.y1, segment.y2);
        maxX = Math.max(maxX, segment.x1, segment.x2);
        maxY = Math.max(maxY, segment.y1, segment.y2);
      });

      if (
        !Number.isFinite(minX) ||
        !Number.isFinite(minY) ||
        !Number.isFinite(maxX) ||
        !Number.isFinite(maxY)
      ) {
        return;
      }

      const width = Math.max(1, maxX - minX + padding * 2);
      const height = Math.max(1, maxY - minY + padding * 2);
      const offsetX = minX - padding;
      const offsetY = minY - padding;

      const maxLineEnd = Math.max(
        0,
        ...nextSegments.map((segment) => segment.delay + segment.duration),
      );
      const maxNodeEnd =
        Math.max(0, ...Array.from(nextNodeDelays.values())) +
        baseNodeAnimDuration;
      const animationMax = Math.max(maxLineEnd, maxNodeEnd);
      const scale = animationMax > 0 ? totalAnimationSec / animationMax : 1;
      const scaledSegments = nextSegments
        .map((segment) => ({
          ...segment,
          delay: segment.delay * scale,
          duration: segment.duration * scale,
        }))
        // Higher order should render on top.
        .sort((a, b) => a.order - b.order);
      const scaledNodeDelays = new Map<string, number>();
      nextNodeDelays.forEach((value, key) => {
        scaledNodeDelays.set(key, value * scale);
      });

      // Store segments + bounds for the SVG overlay.
      setLayoutState({
        segments: scaledSegments,
        nodeDelays: scaledNodeDelays,
        nodeAnimDuration: baseNodeAnimDuration * scale,
        animationTotal: animationMax * scale,
        svgBounds: { width, height, offsetX, offsetY },
      });
      setDoneNodes(new Set());
      doneNodesRef.current = new Set();
    }, [
      direction,
      edges,
      gap,
      padding,
      animationSpeed,
      totalAnimationSec,
      descendantMap,
    ]);

    React.useLayoutEffect(() => {
      const rafId = requestAnimationFrame(drawConnections);
      return () => cancelAnimationFrame(rafId);
    }, [drawConnections, nodeTree]);

    React.useEffect(() => {
      if (
        layoutState.animationTotal <= 0 ||
        layoutState.nodeDelays.size === 0
      ) {
        return;
      }

      const entries = Array.from(layoutState.nodeDelays.entries())
        .map(([id, delay]) => ({
          id,
          end: delay + layoutState.nodeAnimDuration,
        }))
        .sort((a, b) => a.end - b.end);

      doneNodesRef.current = new Set();
      setDoneNodes(new Set());

      const start = performance.now();
      let rafId = 0;
      let index = 0;

      const tick = () => {
        const elapsed = (performance.now() - start) / 1000;
        let updated = false;

        while (index < entries.length && elapsed >= entries[index].end) {
          doneNodesRef.current.add(entries[index].id);
          index += 1;
          updated = true;
        }

        if (updated) {
          setDoneNodes(new Set(doneNodesRef.current));
        }

        if (index < entries.length) {
          rafId = requestAnimationFrame(tick);
        }
      };

      rafId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafId);
    }, [
      layoutState.animationTotal,
      layoutState.nodeDelays,
      layoutState.nodeAnimDuration,
    ]);

    const flowDown = direction === "down";
    const alignValue = align ?? "center";
    const alignX = typeof alignValue === "string" ? alignValue : alignValue.x;
    const alignY = typeof alignValue === "string" ? "start" : alignValue.y;

    const renderTree = (
      node: TypeNode,
      index: number,
      parentId?: string,
      depth = 0,
      path?: Set<string>,
    ) => {
      const stackUnder = !flowDown && node.children?.layout === "stack";
      const nextPath = path ?? new Set<string>();
      if (nextPath.has(node.id)) {
        return null;
      }
      nextPath.add(node.id);
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
              gap: gap,
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
            {node.children.nodes.map((child, index) =>
              renderTree(child, index, node.id, depth + 1, nextPath),
            )}
          </div>
        ) : null;
      nextPath.delete(node.id);
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
            className={cn(
              "node-enter relative flex border border-white/20 p-4",
              {
                "justify-start": alignX === "start",
                "justify-center": alignX === "center",
                "justify-end": alignX === "end",
              },
            )}
            style={{
              animationDuration: `${layoutState.nodeAnimDuration}s`,
              animationDelay: `${
                layoutState.nodeDelays.get(node.id) ??
                depth * 0.08 + index * 0.04
              }s`,
            }}
            onRef={registerNode}
          >
            {/* Node content */}
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
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-full min-h-0 w-full overflow-hidden",
          className,
        )}
        {...props}
      >
        <div
          ref={containerRef}
          className="relative"
          style={{ padding: paddingContainer }}
        >
          <style>{NODE_TREE_STYLES}</style>
          {layoutState.svgBounds ? (
            // SVG overlay for connection lines.
            <svg
              className={cn("pointer-events-none absolute inset-0 z-0", {
                "opacity-100": debug,
                "opacity-10": !debug,
              })}
              width={layoutState.svgBounds.width}
              height={layoutState.svgBounds.height}
              viewBox={`0 0 ${layoutState.svgBounds.width} ${layoutState.svgBounds.height}`}
              style={{
                left: layoutState.svgBounds.offsetX,
                top: layoutState.svgBounds.offsetY,
              }}
            >
              {layoutState.segments.map((segment) => {
                const debugPalette = [
                  "#22d3ee",
                  "#a855f7",
                  "#f59e0b",
                  "#10b981",
                  "#f97316",
                  "#38bdf8",
                ];
                const lineColor = debug
                  ? debugPalette[segment.colorIndex % debugPalette.length]
                  : strokeColor;
                return (
                  <line
                    key={`${segment.x1}-${segment.y1}-${segment.x2}-${segment.y2}-${segment.delay}`}
                    x1={segment.x1 - layoutState.svgBounds!.offsetX}
                    y1={segment.y1 - layoutState.svgBounds!.offsetY}
                    x2={segment.x2 - layoutState.svgBounds!.offsetX}
                    y2={segment.y2 - layoutState.svgBounds!.offsetY}
                    className="node-line"
                    style={{
                      strokeDasharray: segment.length,
                      strokeDashoffset: segment.length,
                      animationDelay: `${segment.delay}s`,
                      animationDuration: `${segment.duration}s`,
                    }}
                    stroke={lineColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>
          ) : null}
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
            style={{ gap: gap }}
          >
            {nodeTree.map((node, index) => renderTree(node, index))}
          </section>
        </div>
      </div>
    );
  },
);
NodeTree.displayName = "NodeTree";

interface NodeFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  node: TypeNode;
  onRef: (id: string, element: HTMLDivElement | null) => void;
  children: React.ReactNode;
}
const NodeFrame = React.forwardRef<HTMLDivElement, NodeFrameProps>(
  ({ node, className, onRef, children, ...props }, ref) => {
    return (
      <div
        ref={(element) => {
          onRef(node.id, element);

          // forward the ref if provided
          if (typeof ref === "function") {
            ref(element);
          } else if (ref) {
            ref.current = element;
          }
        }}
        className={cn("cursor-auto", className)}
        data-nodeframe
        data-viewport-no-pan
        {...props}
      >
        {children}
      </div>
    );
  },
);
NodeFrame.displayName = "NodeFrame";

export { NodeTree };
