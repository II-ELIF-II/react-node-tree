import * as React from "react";
import { cn } from "./utils/cn";
import type { NodeTreeLayoutState } from "./types";

type TreeConnectionsProps = {
  layoutState: NodeTreeLayoutState;
  debug: boolean;
  strokeColor: string;
  strokeWidth: number;
};

export function TreeConnections({
  layoutState,
  debug,
  strokeColor,
  strokeWidth,
}: TreeConnectionsProps) {
  if (!layoutState.svgBounds) {
    return null;
  }

  return (
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
  );
}
