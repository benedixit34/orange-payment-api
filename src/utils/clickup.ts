import "dotenv/config";

export type CreateClickUpTaskParams = {
  name: string;
  description?: string;
  listId: string;
};

export type UpdateCustomFieldParams = {
  taskId: string;
  fieldId: string;
  value: unknown;
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

  const data = (await response.json()) as ClickUpFieldsResponse;

  return data.fields;
}

export async function resolveCustomFieldValue(
  fieldId: string,
  value: unknown,
): Promise<unknown> {
  const listId = process.env.CLICKUP_MASTERCLASS_LIST_ID;

  if (!listId) {
    throw new Error("CLICKUP_MASTERCLASS_LIST_ID is not configured.");
  }

  const fields = await getClickUpListFields(listId);

  const field = fields.find((item) => item.id === fieldId);

  if (!field) {
    throw new Error(`ClickUp custom field "${fieldId}" could not be found.`);
  }

  if (field.type !== "drop_down" && field.type !== "labels") {
    return value;
  }

  const options = field.type_config?.options ?? [];

  if (!options.length) {
    throw new Error(
      `ClickUp custom field "${field.name}" has no configured options.`,
    );
  }

  const stringValue = String(value).trim().toLowerCase();

  const option = options.find(
    (item) => item.name.trim().toLowerCase() === stringValue,
  );

  if (!option) {
    throw new Error(
      `Invalid option "${value}" for ClickUp field "${field.name}". ` +
        `Available options: ${options.map((item) => item.name).join(", ")}`,
    );
  }

  if (field.type === "drop_down") {
    return option.id;
  }

  if (field.type === "labels") {
    return [option.id];
  }

  return value;
}
