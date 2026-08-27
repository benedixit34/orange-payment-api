import "dotenv/config";

type CreateClickUpTaskParams = {
    name: string;
    description?: string;
    status?: string;
    listId: string;
};

type UpdateCustomFieldParams = {
    taskId: string;
    fieldId: string;
    value: unknown;
};

type ClickUpTaskResponse = {
    id: string;
    name: string;
};

const CLICKUP_API_URL = "https://api.clickup.com/api/v2";

function getClickUpToken(): string {
    const token = process.env.CLICKUP_API_TOKEN;

    if (!token) {
        throw new Error("CLICKUP_API_TOKEN is not configured.");
    }

    return token;
}

export async function createClickUpTask({
    name,
    description,
    status = "Open",
    listId
}: CreateClickUpTaskParams): Promise<ClickUpTaskResponse> {
    if (!listId) {
        throw new Error("ClickUp list ID is required.");
    }

    const response = await fetch(
        `${CLICKUP_API_URL}/list/${listId}/task`,
        {
            method: "POST",
            headers: {
                Authorization: getClickUpToken(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                description,
                status
            })
        }
    );

    if (!response.ok) {
        const error = await response.text();

        throw new Error(
            `ClickUp task creation failed: ${error}`
        );
    }

    return response.json() as Promise<ClickUpTaskResponse>;
}

export async function updateClickUpCustomField({
    taskId,
    fieldId,
    value
}: UpdateCustomFieldParams): Promise<void> {
    if (!taskId) {
        throw new Error("ClickUp task ID is required.");
    }

    if (!fieldId) {
        throw new Error("ClickUp custom field ID is required.");
    }

    const response = await fetch(
        `${CLICKUP_API_URL}/task/${taskId}/field/${fieldId}`,
        {
            method: "POST",
            headers: {
                Authorization: getClickUpToken(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                value
            })
        }
    );

    if (!response.ok) {
        const error = await response.text();

        throw new Error(
            `ClickUp custom field update failed: ${error}`
        );
    }
}