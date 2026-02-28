import * as React from "react";
import type {
  NodeTreeLayoutState,
  TreeNode,
  TreeNodeEdge,
} from "../types";

type EdgeGeometry = {
  edge: TreeNodeEdge;
  fromX: number;
  fromY: number;
  fromBottom: number;
  fromCenterX: number;
  toX: number;
  toY: number;
  toLeft: number;
  toCenterY: number;
};

type UseNodeTreeLayoutParams = {
  nodeTree: TreeNode[];
  direction: "down" | "right";
  gap: number;
  padding: number;
  animationSpeed: number;
  debug: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  nodeRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
};

const EMPTY_LAYOUT: NodeTreeLayoutState = {
  segments: [],
  nodeDelays: new Map(),
  nodeAnimDuration: 0.42,
  animationTotal: 0,
  svgBounds: null,
};

function collectEdges(nodes: TreeNode[]) {
  const edges: TreeNodeEdge[] = [];
  const visiting = new Set<string>();
  const visit = (node: TreeNode) => {
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

function collectDescendants(nodes: TreeNode[]) {
  const map = new Map<string, string[]>();
  const visiting = new Set<string>();
  const visit = (node: TreeNode): string[] => {
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
  nodes.forEach(visit);
  return map;
}

export function useNodeTreeLayout({
  nodeTree,
  direction,
  gap,
  padding,
  animationSpeed,
  debug,
  containerRef,
  nodeRefs,
}: UseNodeTreeLayoutParams) {
  const [layoutState, setLayoutState] =
    React.useState<NodeTreeLayoutState>(EMPTY_LAYOUT);
  const [doneNodes, setDoneNodes] = React.useState<Set<string>>(
    () => new Set(),
  );
  const doneNodesRef = React.useRef<Set<string>>(new Set());
  const edges = React.useMemo(() => collectEdges(nodeTree), [nodeTree]);
  const descendantMap = React.useMemo(
    () => collectDescendants(nodeTree),
    [nodeTree],
  );

  const totalAnimationSec = Math.max(0.1, animationSpeed / 1000);

  const drawConnections = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const flowDown = direction === "down";

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

    const rectMap = new Map<string, ReturnType<typeof getRelativeRect>>();
    nodeRefs.current.forEach((el, id) => {
      rectMap.set(id, getRelativeRect(el));
    });

    const nextSegments: NodeTreeLayoutState["segments"] = [];
    const nextNodeDelays = new Map<string, number>();
    const baseSecondsPerPixel = 1 / 900;
    const baseNodeAnimDuration = 0.42;
    const edgeColorIndex = debug ? new Map<string, number>() : null;
    const edgeData = new Map<string, EdgeGeometry>();

    edges.forEach((edge) => {
      const fromRect = rectMap.get(edge.from);
      const toRect = rectMap.get(edge.to);
      if (!fromRect || !toRect) {
        return;
      }

      const fromX = flowDown ? fromRect.left + fromRect.width / 2 : fromRect.right;
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

    const visit = (node: TreeNode, depth: number, nodeDelay: number) => {
      const existing = nextNodeDelays.get(node.id) ?? 0;
      const resolvedDelay = Math.max(existing, nodeDelay);
      nextNodeDelays.set(node.id, resolvedDelay);

      const childEdges =
        node.children?.nodes
          .map((child) => edgeData.get(`${node.id}=>${child.id}`))
          .filter((edge): edge is EdgeGeometry => Boolean(edge)) ?? [];
      const stackLayout = node.children?.layout === "stack";
      const descendantIds =
        flowDown && stackLayout ? (descendantMap.get(node.id) ?? []) : [];
      const descendantLefts =
        flowDown && stackLayout
          ? descendantIds
              .map((id) => rectMap.get(id))
              .filter((rect): rect is NonNullable<typeof rect> => Boolean(rect))
              .map((rect) => rect.left)
          : [];
      const descendantMinLeft =
        descendantLefts.length > 0 ? Math.min(...descendantLefts) : undefined;
      const gutterX =
        flowDown && stackLayout
          ? (descendantMinLeft ??
              (childEdges.length > 0
                ? Math.min(...childEdges.map((edge) => edge.toLeft))
                : 0)) -
            gap / 2
          : 0;
      const gutterXRight =
        !flowDown && stackLayout
          ? (childEdges.length > 0
              ? Math.min(...childEdges.map((edge) => edge.toLeft))
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
          .filter(
            (entry): entry is NonNullable<typeof entry> => Boolean(entry),
          ) ?? [];

      if (debug) {
        orderedChildren.sort((a, b) => {
          if (a.length !== b.length) {
            return a.length - b.length;
          }
          return a.toX - b.toX;
        });
      }

      orderedChildren.forEach((entry, index) => {
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
      Math.max(0, ...Array.from(nextNodeDelays.values())) + baseNodeAnimDuration;
    const animationMax = Math.max(maxLineEnd, maxNodeEnd);
    const scale = animationMax > 0 ? totalAnimationSec / animationMax : 1;
    const scaledSegments = nextSegments
      .map((segment) => ({
        ...segment,
        delay: segment.delay * scale,
        duration: segment.duration * scale,
      }))
      .sort((a, b) => a.order - b.order);
    const scaledNodeDelays = new Map<string, number>();
    nextNodeDelays.forEach((value, key) => {
      scaledNodeDelays.set(key, value * scale);
    });

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
    animationSpeed,
    containerRef,
    debug,
    descendantMap,
    direction,
    edges,
    gap,
    nodeRefs,
    nodeTree,
    padding,
    totalAnimationSec,
  ]);

  React.useLayoutEffect(() => {
    const rafId = requestAnimationFrame(drawConnections);
    return () => cancelAnimationFrame(rafId);
  }, [drawConnections, nodeTree]);

  React.useEffect(() => {
    if (layoutState.animationTotal <= 0 || layoutState.nodeDelays.size === 0) {
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
    layoutState.nodeAnimDuration,
    layoutState.nodeDelays,
  ]);

  return { doneNodes, layoutState };
}
