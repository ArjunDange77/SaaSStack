import type { ResourceSchema } from "@/types/metadata";
import { fieldByName } from "@/types/metadata";
import { useRelationLabelMaps } from "@/hooks/useRelationLabels";
import { CellValue } from "./CellValue";

interface Props {
  schema: ResourceSchema;
  rows: Record<string, unknown>[];
  onRowClick?: (row: Record<string, unknown>) => void;
}

export function DynamicTable({ schema, rows, onRowClick }: Props) {
  const labelMaps = useRelationLabelMaps(schema);
  const columns = schema.list_display.length ? schema.list_display : ["id"];

  return (
    <table>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col}>{col}</th>
          ))}
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length + 1} className="empty-state">
              No records yet. Create one to get started.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={String(row.id)} style={{ cursor: onRowClick ? "pointer" : undefined }}>
              {columns.map((col) => (
                <td key={col} onClick={() => onRowClick?.(row)}>
                  <CellValue
                    field={fieldByName(schema, col)}
                    value={row[col]}
                    labelMaps={labelMaps}
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
  );
}
