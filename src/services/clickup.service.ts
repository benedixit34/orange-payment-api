import "dotenv/config";

import type { CreateClickUpTaskParams, UpdateCustomFieldParams, ClickUpTaskResponse } from "../utils/clickup.js";
import { resolveCustomFieldValue } from "../utils/clickup.js";


const CLICKUP_API_URL = "https://api.clickup.com/api/v2";

function getClickUpToken(): string {
    const token = process.env.CLICKUP_API_TOKEN;

    if (!token) {
        throw new Error("CLICKUP_API_TOKEN is not configured.");
    }

    return token;
}

function getHeaders() {
    return {
        Authorization: getClickUpToken(),
        "Content-Type": "application/json",
        Accept: "application/json",
    };
}

export async function createClickUpTask({
    name,
    description,
    listId,
}: CreateClickUpTaskParams): Promise<ClickUpTaskResponse> {
    if (!listId) {
        throw new Error("ClickUp list ID is required.");
    }

    const url = `${CLICKUP_API_URL}/list/${listId}/task`;

    let response: Response;

    try {
        response = await fetch(url, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                name,
                description,
            }),
        });
    } catch (error) {
        console.error("ClickUp connection error:", error);

        throw new Error(
            "Unable to connect to ClickUp. Please try again later."
        );
    }

    if (!response.ok) {
        const error = await response.text();

        console.error("ClickUp API error:", {
            status: response.status,
            response: error,
        });

        throw new Error(
            `ClickUp task creation failed: ${response.status} ${error}`
        );
    }

    return (await response.json()) as ClickUpTaskResponse;
}



export async function updateClickUpCustomField({
    taskId,
    fieldId,
    value,
}: UpdateCustomFieldParams): Promise<void> {
    if (!taskId) {
        throw new Error("ClickUp task ID is required.");
    }

    if (!fieldId) {
        throw new Error("ClickUp custom field ID is required.");
    }

    const resolvedValue = await resolveCustomFieldValue(
        fieldId,
        value
    );

    const url = `${CLICKUP_API_URL}/task/${taskId}/field/${fieldId}`;

    let response: Response;

    try {
        response = await fetch(url, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                value: resolvedValue,
            }),
        });
    } catch (error) {
        console.error("ClickUp custom field connection error:", error);

        throw new Error(
            "Unable to connect to ClickUp while updating the custom field."
        );
    }

    if (!response.ok) {
        const error = await response.text();

        console.error("ClickUp custom field API error:", {
            status: response.status,
            response: error,
            fieldId,
            originalValue: value,
            resolvedValue,
        });

        throw new Error(
            `ClickUp custom field update failed: ${response.status} ${error}`
        );
    }
}