import type * as React from "react";

/**
 * Runtime info provided to each node render function.
 * This enables render logic based on position, hierarchy, and animation state.
 */
export interface TypeNodeRenderContext<TData = unknown> {
  /** The current node being rendered. */
  node: TypeNode<TData>;
  /** Index of this node within its current siblings array. */
  index: number;
  /** Depth from root (root = 0). */
  depth: number;
  /** Parent node id, or undefined for root nodes. */
  parentId?: string;
  /** Ordered ancestor path ending with the current node id. */
  path: readonly string[];
  /** True when the current node has no children. */
  isLeaf: boolean;
  /** Number of direct children for the current node. */
  childCount: number;
  /** True when this node's enter animation has completed. */
  isNodeAnimationDone: boolean;
}

export interface TypeNodeChildren<TData = unknown> {
  /** Layout for the child group. */
  layout?: "stack" | "row";
  /** Child nodes under this node. */
  nodes: TypeNode<TData>[];
}

export type TypeNode<TData = unknown> = {
  /** Unique node identifier. */
  id: string;
  /** Optional payload for consumer-defined node data. */
  data?: TData;
  /** Render callback for this node. */
  render: (context: TypeNodeRenderContext<TData>) => React.ReactNode;
  /** Optional child group. */
  children?: TypeNodeChildren<TData>;
};

export type TypeNodeEdge = {
  key: string;
  from: string;
  to: string;
  index: number;
  count: number;
};

export type NodeTreeAlign =
  | "center"
  | "start"
  | "end"
  | { x: "center" | "start" | "end"; y: "center" | "start" | "end" };

export interface NodeTreeLayoutOptions {
  /** Horizontal/vertical alignment. String form applies to x with y defaulting to "start". @default "center" */
  align?: NodeTreeAlign;
  /** Overall flow direction for child placement. @default "down" */
  direction?: "down" | "right";
  /** Layout for top-level nodes. @default "stack" */
  root?: "stack" | "row";
  /** Spacing between nodes. @default 64 */
  gap?: number;
  /** Extra padding around connection bounds. @default 64 */
  padding?: number;
  /** Padding around the entire tree container. @default 128 */
  containerPadding?: number;
}

export interface NodeTreeConnectionOptions {
  /** Line stroke color. @default "rgba(255,255,255)" */
  color?: string;
  /** Line stroke width in px. @default 1 */
  width?: number;
  /** Line opacity (0 to 1). @default 1 when debug=true, otherwise 0.1 */
  opacity?: number;
}

export interface NodeTreeAnimationOptions {
  /** Total animation time in ms (all nodes/lines complete within this duration). @default 2000 */
  durationMs?: number;
}

export interface NodeTreeClassNameOptions {
  /** Class name for the root wrapper element. */
  root?: string;
  /** Class name for the inner canvas container. */
  canvas?: string;
  /** Class name for the renderer section. */
  renderer?: string;
  /** Class name for each node frame wrapper. */
  frame?: string;
  /** Class name for the SVG connections layer. */
  connections?: string;
}

export interface NodeTreeFrameOptions {
  /** Extra inline styles applied to each node frame wrapper. */
  style?: React.CSSProperties;
}

export interface NodeTreeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "className"> {
  /** Root nodes to render. */
  nodeTree: TypeNode[];
  /** Slot-based class names for internal elements. */
  className?: NodeTreeClassNameOptions;
  /** Grouped layout options. */
  layout?: NodeTreeLayoutOptions;
  /** Grouped connection line options. */
  connection?: NodeTreeConnectionOptions;
  /** Grouped animation options. */
  animation?: NodeTreeAnimationOptions;
  /** Grouped node frame options. */
  nodeFrame?: NodeTreeFrameOptions;
  /** Show debug overlay badges. @default true */
  debug?: boolean;
}

export interface NodeFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Node associated with this frame element. */
  node: TypeNode;
  /** Ref registry hook used internally for layout measurements. */
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
