import "dotenv/config";

export async function getClickUpListFields() {
    const token = process.env.CLICKUP_API_TOKEN;
    const listId = process.env.CLICKUP_LIST_ID;

    if (!token) {
        throw new Error("CLICKUP_API_TOKEN is not configured.");
    }

    if (!listId) {
        throw new Error("CLICKUP_BOOKING_LIST_ID is not configured.");
    }

    const response = await fetch(
        `https://api.clickup.com/api/v2/list/${listId}/field`,
        {
            method: "GET",
            headers: {
                Authorization: token,
                Accept: "application/json"
            }
        }
    );

    if (!response.ok) {
        const error = await response.text();

        throw new Error(
            `Failed to fetch ClickUp fields: ${response.status} ${error}`
        );
    }

    return response.json();
}

getClickUpListFields()
    .then((data) => {
        console.log(JSON.stringify(data, null, 2));
    })
    .catch((error) => {
        console.error(error);
    });