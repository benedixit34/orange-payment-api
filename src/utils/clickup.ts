import "dotenv/config";

export type UpdateCustomFieldParams = {
  taskId: string;
  fieldId: string;
  value: unknown;
  fields: ClickUpCustomField[];
};

export type ClickUpTaskResponse = {
  id: string;
  name: string;
};

export type ClickUpCustomFieldOption = {
  id: string;
  name: string;
  orderindex?: number;
};

export type ClickUpCustomField = {
  id: string;
  name: string;
  type: string;
  type_config?: {
    options?: ClickUpCustomFieldOption[];
  };
};

export type CreateClickUpTaskParams = {
  listId: string;
  name: string;
  description?: string;
};

type ClickUpFieldsResponse = {
  fields: ClickUpCustomField[];
};

function getClickUpToken(): string {
  const token = process.env.CLICKUP_API_TOKEN;

  if (!token) {
    throw new Error("CLICKUP_API_TOKEN is not configured.");
  }

  return token;
}

const CLICKUP_API_URL = "https://api.clickup.com/api/v2";

function getHeaders() {
  return {
    Authorization: getClickUpToken(),
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export async function getClickUpListFields(
  listId: string,
): Promise<ClickUpCustomField[]> {
  if (!listId) {
    throw new Error("ClickUp list ID is required.");
  }

  const url = `${CLICKUP_API_URL}/list/${listId}/field`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: getHeaders(),
    });
  } catch (error) {
    console.error("ClickUp fields connection error:", error);

    throw new Error(
      "Unable to connect to ClickUp while fetching custom fields.",
    );
  }

  if (!response.ok) {
    const error = await response.text();

    console.error("ClickUp fields API error:", {
      status: response.status,
      response: error,
    });

    throw new Error(
      `ClickUp fields request failed: ${response.status} ${error}`,
    );
  }

  const data =
    (await response.json()) as ClickUpFieldsResponse;

  return data.fields;
}

export function resolveCustomFieldValue(
  fields: ClickUpCustomField[],
  fieldId: string,
  value: unknown,
): unknown {
  const field = fields.find(
    (item) => item.id === fieldId,
  );

  if (!field) {
    throw new Error(
      `ClickUp custom field "${fieldId}" could not be found.`,
    );
  }

  if (
    field.type !== "drop_down" &&
    field.type !== "labels"
  ) {
    return value;
  }

  const options =
    field.type_config?.options ?? [];

  if (!options.length) {
    throw new Error(
      `ClickUp custom field "${field.name}" has no configured options.`,
    );
  }

  const normalizeValue = (input: unknown): string =>
    String(input)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const normalizedValue =
    normalizeValue(value);

  const option = options.find(
    (item) =>
      normalizeValue(item.name) ===
      normalizedValue,
  );

  if (!option) {
    throw new Error(
      `Invalid option "${value}" for ClickUp field "${field.name}". ` +
        `Available options: ${options
          .map((item) => item.name)
          .join(", ")}`,
    );
  }

  if (field.type === "drop_down") {
    return option.id;
  }

  return [option.id];
}