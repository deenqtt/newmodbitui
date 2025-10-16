// File: hooks/use-sort-table.ts

import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface UseSortableTableReturn<T> {
  sorted: T[];
  sortDirection: SortDirection;
  sortKey: string | null;
  handleSort: (key: string) => void;
}

export function useSortableTable<T extends Record<string, any>>(
  data: T[]
): UseSortableTableReturn<T> {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDirection) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === "asc" ? -1 : 1;
      if (bValue == null) return sortDirection === "asc" ? 1 : -1;

      // Handle string comparison
      if (typeof aValue === "string" && typeof bValue === "string") {
        const result = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        return sortDirection === "asc" ? result : -result;
      }

      // Handle number comparison
      if (typeof aValue === "number" && typeof bValue === "number") {
        const result = aValue - bValue;
        return sortDirection === "asc" ? result : -result;
      }

      // Handle boolean comparison
      if (typeof aValue === "boolean" && typeof bValue === "boolean") {
        const result = aValue === bValue ? 0 : aValue ? 1 : -1;
        return sortDirection === "asc" ? result : -result;
      }

      // Handle date comparison
      if (aValue instanceof Date && bValue instanceof Date) {
        const result = aValue.getTime() - bValue.getTime();
        return sortDirection === "asc" ? result : -result;
      }

      // Fallback to string comparison
      const aStr = String(aValue);
      const bStr = String(bValue);
      const result = aStr.toLowerCase().localeCompare(bStr.toLowerCase());
      return sortDirection === "asc" ? result : -result;
    });
  }, [data, sortKey, sortDirection]);

  const handleSort = (key: string) => {
    const keyStr = key;

    if (sortKey === keyStr) {
      // Cycling through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortKey(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      // New column, start with ascending
      setSortKey(keyStr);
      setSortDirection("asc");
    }
  };

  return {
    sorted,
    sortDirection,
    sortKey,
    handleSort,
  };
}
