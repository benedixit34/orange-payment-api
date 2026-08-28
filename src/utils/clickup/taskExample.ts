
import "dotenv/config";

const CLICKUP_API_URL = "https://api.clickup.com/api/v2";

type ClickUpTask = {
    id: string;
    name: string;
    status: {
        status: string;
        color: string;
    };
    date_created: string;
    date_updated: string;
    description: string;
};

type ClickUpTasksResponse = {
    tasks: ClickUpTask[];
    last_page: boolean;
};

function getClickUpToken(): string {
    const token = process.env.CLICKUP_API_TOKEN;

    if (!token) {
        throw new Error("CLICKUP_API_TOKEN is not configured.");
    }

    return token;
}

async function getLatenessReportTasks(listId: number | string): Promise<ClickUpTask[]> {

    const response = await fetch(
        `${CLICKUP_API_URL}/list/${listId}/task?include_closed=true`,
        {
            method: "GET",
            headers: {
                Authorization: getClickUpToken(),
                "Content-Type": "application/json"
            }
        }
    );

    if (!response.ok) {
        const error = await response.text();

        throw new Error(
            `Failed to get ClickUp tasks: ${response.status} ${error}`
        );
    }

    const result =
        (await response.json()) as ClickUpTasksResponse;

    return result.tasks;
}

async function main() {
    try {
        const tasks = await getLatenessReportTasks(process.env.SAMPLE_LIST_ID!);

        console.log(JSON.stringify(tasks, null, 2));
    } catch (error) {
        console.error(error);
    }
}

main();