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

function formatColumnLabel(col: string): string {
  return col.replace(/_/g, " ");
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

function CardSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card-skeleton" aria-hidden />
      ))}
    </>
  );
}

export function DynamicTable({ schema, rows, loading, onRowClick }: Props) {
  const labelMaps = useRelationLabelMaps(schema);
  const columns = schema.list_display.length ? schema.list_display : ["id"];
  const primaryCol = columns[0];
  const emptyMessage = schema.empty_state ?? "No records yet. Create one to get started.";

  const renderCard = (row: Record<string, unknown>) => {
    const primaryField = fieldByName(schema, primaryCol);
    return (
      <article key={String(row.id)} className="record-card">
        <div className="record-card-primary">
          <CellValue
            field={primaryField}
            value={row[primaryCol]}
            labelMaps={labelMaps}
            row={row}
          />
        </div>
        {columns.slice(1).map((col) => (
          <div key={col} className="record-card-row">
            <span className="record-card-label">{formatColumnLabel(col)}</span>
            <span className="record-card-value">
              <CellValue
                field={fieldByName(schema, col)}
                value={row[col]}
                labelMaps={labelMaps}
                row={row}
              />
            </span>
          </div>
        ))}
        {onRowClick && (
          <button
            type="button"
            className="secondary record-card-open"
            onClick={() => onRowClick(row)}
          >
            Open
          </button>
        )}
      </article>
    );
  };

  return (
    <>
      <div className="record-cards mobile-only" aria-label={`${schema.title} list`}>
        {loading && rows.length === 0 ? (
          <CardSkeleton />
        ) : rows.length === 0 ? (
          <div className="record-cards-empty">
            <p>{emptyMessage}</p>
            <p className="muted">Use New to add your first record.</p>
          </div>
        ) : (
          rows.map(renderCard)
        )}
        {loading && rows.length > 0 && <p className="muted table-loading-hint">Refreshing…</p>}
      </div>

      <div className="table-wrap desktop-only">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{formatColumnLabel(col)}</th>
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
    </>
  );
}
