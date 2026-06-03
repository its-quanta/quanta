"use client";

import { useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { cn } from "@/lib/utils";

type VirtualListProps<T> = {
  items: readonly T[];
  estimateSize: number;
  overscan?: number;
  className?: string;
  getItemKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  measureDynamic?: boolean;
};

export function VirtualList<T>({
  items,
  estimateSize,
  overscan = 8,
  className,
  getItemKey,
  renderItem,
  measureDynamic = false,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    ...(measureDynamic
      ? { measureElement: (element) => element.getBoundingClientRect().height }
      : {}),
  });

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", className)}
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          if (!item) {
            return null;
          }
          return (
            <div
              key={getItemKey(item, virtualRow.index)}
              ref={measureDynamic ? virtualizer.measureElement : undefined}
              data-index={virtualRow.index}
              className="absolute left-0 top-0 w-full pb-3"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
