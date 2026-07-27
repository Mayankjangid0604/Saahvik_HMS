import { Fragment, useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type OnChangeFn,
  type VisibilityState,
  type Row,
} from "@tanstack/react-table";
import {
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Dropdown } from "./Dropdown";
import { TableSkeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";

export interface DataTableProps<T> {
  columns: ColumnDef<T, never>[] | ColumnDef<T>[];
  data: T[];
  /** Server-side pagination */
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  /** Server-side sorting */
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  /** When provided, rows can expand to show this content (e.g. beds under a room). */
  renderExpanded?: (row: Row<T>) => ReactNode;
  getRowId?: (row: T, index: number) => string;
  /** Hide the column-visibility toggle (on by default). */
  hideColumnToggle?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sorting,
  onSortingChange,
  isLoading,
  onRowClick,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  renderExpanded,
  getRowId,
  hideColumnToggle,
}: DataTableProps<T>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const table = useReactTable({
    data,
    columns: columns as ColumnDef<T>[],
    state: { sorting: sorting ?? [], columnVisibility },
    onSortingChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    getRowId,
  });

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {!hideColumnToggle && (
        <div className="flex justify-end border-b border-slate-100 px-2 py-1.5">
          <Dropdown
            trigger={
              <span className="inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs text-muted hover:bg-slate-50 hover:text-ink">
                <Columns3 className="h-3.5 w-3.5" /> Columns
              </span>
            }
          >
            <div className="max-h-64 overflow-y-auto px-1">
              {table
                .getAllLeafColumns()
                .filter((c) => c.getCanHide())
                .map((column) => (
                  <label
                    key={column.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                      className="accent-accent"
                    />
                    {typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id}
                  </label>
                ))}
            </div>
          </Dropdown>
        </div>
      )}

      {/* Horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-slate-200 bg-slate-50/70">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort() && !!onSortingChange;
                  const dir = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className="h-9 px-4 text-left text-xs font-semibold text-slate-600 whitespace-nowrap"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          className="inline-flex items-center gap-1 hover:text-ink"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {dir === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-accent" />
                          ) : dir === "desc" ? (
                            <ArrowDown className="h-3 w-3 text-accent" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 text-slate-400" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={table.getVisibleLeafColumns().length} className="p-0">
                  <TableSkeleton cols={Math.min(table.getVisibleLeafColumns().length, 6)} />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={table.getVisibleLeafColumns().length}>
                  <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <tr
                    className={cn(
                      "h-11 border-b border-slate-100 last:border-0",
                      (onRowClick || renderExpanded) && "cursor-pointer hover:bg-surface/60",
                    )}
                    onClick={() => {
                      if (renderExpanded) {
                        setExpanded((prev) => ({ ...prev, [row.id]: !prev[row.id] }));
                      }
                      onRowClick?.(row.original);
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {renderExpanded && expanded[row.id] && (
                    <tr className="border-b border-slate-100 bg-surface/50">
                      <td colSpan={row.getVisibleCells().length} className="px-4 py-3">
                        {renderExpanded(row)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2">
        <span className="text-xs text-muted">
          {total === 0 ? "0 results" : `${from}–${to} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          {onPageSizeChange && (
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 rounded border border-slate-200 bg-white px-1 text-xs text-muted"
              aria-label="Rows per page"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded p-1 text-muted hover:bg-slate-100 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted">
              {page} / {pageCount}
            </span>
            <button
              disabled={page >= pageCount}
              onClick={() => onPageChange(page + 1)}
              className="rounded p-1 text-muted hover:bg-slate-100 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
