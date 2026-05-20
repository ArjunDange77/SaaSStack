import { describe, it, expect } from "vitest";
import {
  actionSuccessMessage,
  createSuccessMessage,
  deleteSuccessMessage,
  updateSuccessMessage,
} from "../feedbackMessages";
import type { ActionMeta, ResourceSchema } from "@/types/metadata";

const schema = { title: "Rooms" } as ResourceSchema;

function action(name: string, label?: string): ActionMeta {
  return {
    name,
    label: label ?? name.replace(/_/g, " "),
    url_path: name,
    detail: false,
    methods: ["POST"],
  };
}

describe("feedbackMessages", () => {
  it("builds CRUD success strings from schema title", () => {
    expect(createSuccessMessage(schema)).toBe("Room created");
    expect(updateSuccessMessage(schema)).toBe("Room saved");
    expect(deleteSuccessMessage(schema)).toBe("Room deleted");
  });

  it("uses known action copy or falls back", () => {
    expect(actionSuccessMessage(action("vacate", "Vacate"))).toBe("Assignment vacated");
    expect(actionSuccessMessage(action("custom_action", "Custom"))).toBe("Custom completed");
    expect(
      actionSuccessMessage({
        name: "other_thing",
        url_path: "other_thing",
        detail: false,
        methods: ["POST"],
      })
    ).toBe("other thing completed");
  });
});
