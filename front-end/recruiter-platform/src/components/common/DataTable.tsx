"use client"

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  Loader2,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type DataTableSortDirection = "ASC" | "DESC"

export interface DataTableSorting {
  /** Backend sort key; defaults to the column id. */
  sortKey: string
  direction: DataTableSortDirection
}

/**
 * Extra column configuration read by the table header. A column becomes
 * sortable only when its definition sets `meta.sortable`.
 */
export interface DataTableColumnMeta {
  sortable?: boolean
  /** Overrides the column id as the backend sort key. */
  sortKey?: string
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading: boolean
  onRowClick?: (row: TData) => void
  emptyMessage?: string
  /** Controlled server-side sorting. Omit to render plain headers. */
  sorting?: DataTableSorting | null
  onSortingChange?: (sorting: DataTableSorting | null) => void
}

function SortIcon({ direction }: { direction: DataTableSortDirection | null }) {
  if (direction === "ASC") {
    return <ArrowUpIcon className="size-3.5 shrink-0" />
  }
  if (direction === "DESC") {
    return <ArrowDownIcon className="size-3.5 shrink-0" />
  }
  return (
    <ArrowUpDownIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
  )
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  onRowClick,
  emptyMessage = "No results.",
  sorting,
  onSortingChange,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation()
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const sortLabel = (direction: DataTableSortDirection | null) => {
    if (direction === "ASC") return t("common.table.sortDescending")
    if (direction === "DESC") return t("common.table.clearSort")
    return t("common.table.sortAscending")
  }

  const handleSort = (sortKey: string) => {
    if (!onSortingChange) return

    if (sorting?.sortKey !== sortKey) {
      onSortingChange({ sortKey, direction: "ASC" })
      return
    }
    if (sorting.direction === "ASC") {
      onSortingChange({ sortKey, direction: "DESC" })
      return
    }
    onSortingChange(null)
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef
                  .meta as DataTableColumnMeta | undefined
                const sortKey = meta?.sortKey ?? header.column.id
                const canSort = Boolean(meta?.sortable && onSortingChange)
                const direction =
                  sorting?.sortKey === sortKey ? sorting.direction : null

                return (
                  <TableHead
                    key={header.id}
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
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={() => handleSort(sortKey)}
                        title={sortLabel(direction)}
                        className="-mx-2 inline-flex items-center gap-1.5 rounded px-2 py-1 text-start font-medium transition-colors hover:bg-muted/60"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        <SortIcon direction={direction} />
                        <span className="sr-only">{sortLabel(direction)}</span>
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
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
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                onClick={
                  onRowClick ? () => onRowClick(row.original) : undefined
                }
                className={onRowClick ? "cursor-pointer" : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
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
  )
}
