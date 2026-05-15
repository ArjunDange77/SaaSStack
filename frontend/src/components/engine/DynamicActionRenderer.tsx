import type { ActionMeta, ResourceSchema } from "@/types/metadata";
import { useResourceMutations } from "@/hooks/useResource";

interface Props {
  schema: ResourceSchema;
  recordId?: string;
  onDone?: () => void;
}

export function DynamicActionRenderer({ schema, recordId, onDone }: Props) {
  const { runAction } = useResourceMutations(schema.resource);
  const detailActions = schema.actions.filter((a) => a.detail);
  const listActions = schema.actions.filter((a) => !a.detail);

  const actions = recordId ? detailActions : listActions;
  if (!actions.length) return null;

  const fire = async (action: ActionMeta) => {
    const method = action.methods[0] || "post";
    await runAction.mutateAsync({
      id: recordId,
      actionPath: action.url_path,
      method,
    });
    onDone?.();
  };

  return (
    <div className="toolbar">
      {actions.map((action) => (
        <button
          key={action.name}
          type="button"
          className="secondary"
          disabled={runAction.isPending}
          onClick={() => fire(action)}
        >
          {action.name.replace(/_/g, " ")}
        </button>
      ))}
    </div>
  );
}
