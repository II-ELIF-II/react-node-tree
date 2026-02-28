import type * as React from "react";

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

export type TypeNodeEdge = {
  key: string;
  from: string;
  to: string;
  index: number;
  count: number;
};

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

export interface NodeFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  node: TypeNode;
  onRef: (id: string, element: HTMLDivElement | null) => void;
  children: React.ReactNode;
}

export type AlignAxis = "center" | "start" | "end";

export interface NodeTreeSegment {
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
}

export interface NodeTreeSvgBounds {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export interface NodeTreeLayoutState {
  segments: NodeTreeSegment[];
  nodeDelays: Map<string, number>;
  nodeAnimDuration: number;
  animationTotal: number;
  svgBounds: NodeTreeSvgBounds | null;
}
