import type { ActionMeta, ResourceSchema } from "@/types/metadata";
import { useResourceMutations } from "@/hooks/useResource";

interface Props {
  schema: ResourceSchema;
  recordId?: string;
  onDone?: () => void;
  className?: string;
}

function allowedActions(schema: ResourceSchema) {
  const allowed = schema.capabilities?.actions;
  if (!allowed) return schema.actions;
  const set = new Set(allowed);
  return schema.actions.filter((a) => set.has(a.name));
}

export function DynamicActionRenderer({ schema, recordId, onDone, className }: Props) {
  const { runAction } = useResourceMutations(schema.resource, schema);
  const visible = allowedActions(schema);
  const detailActions = visible.filter((a) => a.detail);
  const listActions = visible.filter((a) => !a.detail);

  const actions = recordId ? detailActions : listActions;
  if (!actions.length) return null;

  const fire = async (action: ActionMeta) => {
    const method = action.methods[0] || "post";
    await runAction.mutateAsync({
      id: recordId,
      actionPath: action.url_path,
      method,
      actionName: action.name,
    });
    onDone?.();
  };

  return (
    <div className={`toolbar${className ? ` ${className}` : ""}`}>
      {actions.map((action) => (
        <button
          key={action.name}
          type="button"
          className="secondary"
          disabled={runAction.isPending}
          onClick={() => fire(action)}
        >
          {action.label ?? action.name.replace(/_/g, " ")}
        </button>
      ))}
    </div>
  );
}
