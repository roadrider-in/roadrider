import React from 'react';

export const Svg = ({
  width,
  height,
  viewBox,
  fill,
  stroke,
  strokeWidth,
  strokeLinecap,
  strokeLinejoin,
  children,
  style,
}) => (
  <svg
    width={width}
    height={height}
    viewBox={viewBox}
    fill={fill}
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap={strokeLinecap}
    strokeLinejoin={strokeLinejoin}
    style={style}
  >
    {children}
  </svg>
);

export const Path = ({
  d,
  fill,
  stroke,
  strokeWidth,
  strokeLinecap,
  strokeLinejoin,
  strokeDasharray,
}) => (
  <path
    d={d}
    fill={fill}
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap={strokeLinecap}
    strokeLinejoin={strokeLinejoin}
    strokeDasharray={strokeDasharray}
  />
);

export const Rect = ({
  x,
  y,
  width,
  height,
  rx,
  fill,
  stroke,
  strokeWidth,
}) => (
  <rect
    x={x}
    y={y}
    width={width}
    height={height}
    rx={rx}
    fill={fill}
    stroke={stroke}
    strokeWidth={strokeWidth}
  />
);

export const Circle = ({ cx, cy, r, fill, stroke, strokeWidth }) => (
  <circle
    cx={cx}
    cy={cy}
    r={r}
    fill={fill}
    stroke={stroke}
    strokeWidth={strokeWidth}
  />
);

export const Line = ({ x1, y1, x2, y2, stroke, strokeWidth, strokeLinecap }) => (
  <line
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap={strokeLinecap}
  />
);

export const Polygon = ({ points, fill, stroke, strokeWidth }) => (
  <polygon
    points={points}
    fill={fill}
    stroke={stroke}
    strokeWidth={strokeWidth}
  />
);

export const Polyline = ({ points, fill, stroke, strokeWidth }) => (
  <polyline
    points={points}
    fill={fill}
    stroke={stroke}
    strokeWidth={strokeWidth}
  />
);

export default Svg;
