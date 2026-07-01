import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: "left" | "right";
  className?: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick, className }: DataTableProps<T>) {
  return (
    <div className={cn("overflow-hidden rounded-[15px] border border-hairline bg-card shadow-card", className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-hairline-soft">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-[18px] py-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-content-faint",
                  col.align === "right" ? "text-right" : "text-left",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b border-hairline-soft transition-colors last:border-b-0",
                onRowClick && "cursor-pointer hover:bg-muted/40"
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-[18px] py-3.5 text-[14px] text-foreground",
                    col.align === "right" && "text-right",
                    col.className
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
