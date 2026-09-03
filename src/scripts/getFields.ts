import "dotenv/config";

type ClickUpField = {
    id: string;
    name: string;
    type: string;
    type_config?: Record<string, unknown>;
    date_created?: string;
    hide?: boolean;
    required?: boolean;
};

type ClickUpFieldsResponse = {
    fields: ClickUpField[];
};


export async function getClickUpListFields(): Promise<ClickUpField[]> {
    const token = process.env.CLICKUP_API_TOKEN;
    const listId = process.env.CLICKUP_MASTERCLASS_LIST_ID;

    if (!token) {
        throw new Error("CLICKUP_API_TOKEN is not configured.");
    }

    if (!listId) {
        throw new Error("CLICKUP_MASTERCLASS_LIST_ID is not configured.");
    }

    const response = await fetch(
        `https://api.clickup.com/api/v2/list/${listId}/field`,
        {
            method: "GET",
            headers: {
                Authorization: token,
                Accept: "application/json",
            },
        }
    );

    if (!response.ok) {
        const error = await response.text();

        throw new Error(
            `Failed to fetch ClickUp fields: ${response.status} ${error}`
        );
    }

    const data = (await response.json()) as ClickUpFieldsResponse;

    return data.fields;
}









export async function getFieldIdByName(
    fieldName: string
): Promise<string | undefined> {
    const fields = await getClickUpListFields();

    const field = fields.find(
        (field) => field.name.toLowerCase() === fieldName.toLowerCase()
    );

    return field?.id;
}


getClickUpListFields()
    .then((data) => {
        console.log(JSON.stringify(data, null, 2));
    })
    .catch((error) => {
        console.error(error);
    });