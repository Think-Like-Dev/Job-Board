"use client";

import type { ReactNode } from "react";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTableSortDirection = "ASC" | "DESC";

export interface DataTableSorting {
  /** Backend sort key; defaults to the column id. */
  sortKey: string;
  direction: DataTableSortDirection;
}

/**
 * Extra column configuration read by the table header. A column becomes
 * sortable only when its definition sets `meta.sortable`.
 */
export interface DataTableColumnMeta {
  sortable?: boolean;
  /** Overrides the column id as the backend sort key. */
  sortKey?: string;
}

export interface DataTableCellContext<TData> {
  row: { original: TData };
  getValue: () => unknown;
}

export interface DataTableColumn<TData> {
  /** Stable key; defaults to `accessorKey`. */
  id?: string;
  /** Property read from the row when no `cell` is given. */
  accessorKey?: string;
  header: ReactNode | (() => ReactNode);
  cell?: (context: DataTableCellContext<TData>) => ReactNode;
  meta?: DataTableColumnMeta;
}

interface DataTableProps<TData> {
  columns: DataTableColumn<TData>[];
  data: TData[];
  isLoading: boolean;
  onRowClick?: (row: TData) => void;
  emptyMessage?: string;
  /** Controlled server-side sorting. Omit to render plain headers. */
  sorting?: DataTableSorting | null;
  onSortingChange?: (sorting: DataTableSorting | null) => void;
  /** Extra classes for the scroll container (e.g. to bound the height). */
  containerClassName?: string;
}

function SortIcon({ direction }: { direction: DataTableSortDirection | null }) {
  if (direction === "ASC") {
    return <ArrowUpIcon className="size-3.5 shrink-0" />;
  }
  if (direction === "DESC") {
    return <ArrowDownIcon className="size-3.5 shrink-0" />;
  }
  return <ArrowUpDownIcon className="size-3.5 shrink-0 text-muted-foreground/60" />;
}

function columnKey<TData>(column: DataTableColumn<TData>, index: number) {
  return column.id ?? column.accessorKey ?? `column-${index}`;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  onRowClick,
  emptyMessage = "No results.",
  sorting,
  onSortingChange,
  containerClassName,
}: DataTableProps<TData>) {
  const { t } = useTranslation();

  const sortLabel = (direction: DataTableSortDirection | null) => {
    if (direction === "ASC") return t("common.table.sortDescending");
    if (direction === "DESC") return t("common.table.clearSort");
    return t("common.table.sortAscending");
  };

  const handleSort = (sortKey: string) => {
    if (!onSortingChange) return;

    if (sorting?.sortKey !== sortKey) {
      onSortingChange({ sortKey, direction: "ASC" });
      return;
    }
    if (sorting.direction === "ASC") {
      onSortingChange({ sortKey, direction: "DESC" });
      return;
    }
    onSortingChange(null);
  };

  return (
    <div className={cn("overflow-x-auto rounded-md border", containerClassName)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => {
              const key = columnKey(column, index);
              const sortKey = column.meta?.sortKey ?? key;
              const canSort = Boolean(column.meta?.sortable && onSortingChange);
              const direction = sorting?.sortKey === sortKey ? sorting.direction : null;
              const header = typeof column.header === "function" ? column.header() : column.header;

              return (
                <TableHead
                  key={key}
                  aria-sort={
                    canSort
                      ? direction === "ASC"
                        ? "ascending"
                        : direction === "DESC"
                          ? "descending"
                          : "none"
                      : undefined
                  }
                >
                  {canSort ? (
                    <button
                      type="button"
                      onClick={() => handleSort(sortKey)}
                      title={sortLabel(direction)}
                      className="-mx-2 inline-flex items-center gap-1.5 rounded px-2 py-1 text-start font-medium transition-colors hover:bg-muted/60"
                    >
                      {header}
                      <SortIcon direction={direction} />
                      <span className="sr-only">{sortLabel(direction)}</span>
                    </button>
                  ) : (
                    header
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow aria-rowspan={4}>
              <TableCell
                rowSpan={24}
                colSpan={columns.length}
                className="h-24 text-center bg-muted/50"
              >
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              </TableCell>
            </TableRow>
          ) : data.length ? (
            data.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
              >
                {columns.map((column, columnIndex) => {
                  const value = column.accessorKey
                    ? (row as Record<string, unknown>)[column.accessorKey]
                    : undefined;
                  return (
                    <TableCell key={columnKey(column, columnIndex)}>
                      {column.cell
                        ? column.cell({
                            row: { original: row },
                            getValue: () => value,
                          })
                        : (value as ReactNode)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
