'use client';

import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'text' | 'title' | 'avatar' | 'badge' | 'btn' | 'input' | 'card' | 'custom' | 'dark';
}

export default function Skeleton({
  width,
  height,
  borderRadius,
  className = '',
  style = {},
  variant = 'custom',
}: SkeletonProps) {
  const variantClass = variant !== 'custom' ? `skeleton-${variant}` : '';
  const customStyles: React.CSSProperties = {
    ...style,
    ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
    ...(borderRadius !== undefined
      ? { borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius }
      : {}),
  };

  return <div className={`skeleton ${variantClass} ${className}`.trim()} style={customStyles} />;
}
