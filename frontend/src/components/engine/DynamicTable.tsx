import type { ResourceSchema } from "@/types/metadata";
import { fieldByName } from "@/types/metadata";
import { useRelationLabelMaps } from "@/hooks/useRelationLabels";
import { CellValue } from "./CellValue";

interface Props {
  schema: ResourceSchema;
  rows: Record<string, unknown>[];
  loading?: boolean;
  onRowClick?: (row: Record<string, unknown>) => void;
}

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="skeleton-row">
          {Array.from({ length: columns }).map((__, j) => (
            <td key={j}>
              <span className="skeleton-cell" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function DynamicTable({ schema, rows, loading, onRowClick }: Props) {
  const labelMaps = useRelationLabelMaps(schema);
  const columns = schema.list_display.length ? schema.list_display : ["id"];
  const emptyMessage = schema.empty_state ?? "No records yet. Create one to get started.";

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col.replace(/_/g, " ")}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0 ? (
            <TableSkeleton columns={columns.length + 1} />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="empty-state">
                <p>{emptyMessage}</p>
                <p className="muted">Use New to add your first record.</p>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={String(row.id)} className={onRowClick ? "row-clickable" : undefined}>
                {columns.map((col) => (
                  <td key={col} onClick={() => onRowClick?.(row)}>
                    <CellValue
                      field={fieldByName(schema, col)}
                      value={row[col]}
                      labelMaps={labelMaps}
                      row={row}
                    />
                  </td>
                ))}
                <td>
                  {onRowClick && (
                    <button type="button" className="secondary" onClick={() => onRowClick(row)}>
                      Open
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {loading && rows.length > 0 && <p className="muted table-loading-hint">Refreshing…</p>}
    </div>
  );
}
