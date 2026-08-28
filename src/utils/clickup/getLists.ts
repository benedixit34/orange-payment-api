import "dotenv/config";

const CLICKUP_API_URL = "https://api.clickup.com/api/v2";

type ClickUpWorkspace = {
    id: string;
    name: string;
};

type ClickUpSpace = {
    id: string;
    name: string;
};

type ClickUpFolder = {
    id: string;
    name: string;
};

type ClickUpList = {
    id: string;
    name: string;
    space?: {
        id: string;
        name: string;
    };
    folder?: {
        id: string;
        name: string;
    };
};

function getClickUpToken(): string {
    const token = process.env.CLICKUP_API_TOKEN;

    if (!token) {
        throw new Error("CLICKUP_API_TOKEN is not configured.");
    }

    return token;
}

async function clickUpFetch<T>(url: string): Promise<T> {
    const response = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: getClickUpToken(),
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        const error = await response.text();

        throw new Error(
            `ClickUp API error ${response.status}: ${error}`
        );
    }

    return response.json() as Promise<T>;
}

export async function getClickUpWorkspaces(): Promise<ClickUpWorkspace[]> {
    const result = await clickUpFetch<{
        teams: ClickUpWorkspace[];
    }>(`${CLICKUP_API_URL}/team`);

    return result.teams;
}

export async function getClickUpSpaces(
    workspaceId: string
): Promise<ClickUpSpace[]> {
    const result = await clickUpFetch<{
        spaces: ClickUpSpace[];
    }>(
        `${CLICKUP_API_URL}/team/${workspaceId}/space?archived=false`
    );

    return result.spaces;
}

export async function getClickUpFolders(
    spaceId: string
): Promise<ClickUpFolder[]> {
    const result = await clickUpFetch<{
        folders: ClickUpFolder[];
    }>(
        `${CLICKUP_API_URL}/space/${spaceId}/folder?archived=false`
    );

    return result.folders;
}

export async function getClickUpFolderlessLists(
    spaceId: string
): Promise<ClickUpList[]> {
    const result = await clickUpFetch<{
        lists: ClickUpList[];
    }>(
        `${CLICKUP_API_URL}/space/${spaceId}/list?archived=false`
    );

    return result.lists;
}

export async function getClickUpListsInFolder(
    folderId: string
): Promise<ClickUpList[]> {
    const result = await clickUpFetch<{
        lists: ClickUpList[];
    }>(
        `${CLICKUP_API_URL}/folder/${folderId}/list?archived=false`
    );

    return result.lists;
}

export async function getAllClickUpLists() {
    const workspaces = await getClickUpWorkspaces();

    const result = [];

    for (const workspace of workspaces) {
        const spaces = await getClickUpSpaces(workspace.id);

        for (const space of spaces) {
            const folderlessLists =
                await getClickUpFolderlessLists(space.id);

            for (const list of folderlessLists) {
                result.push({
                    workspaceId: workspace.id,
                    workspaceName: workspace.name,
                    spaceId: space.id,
                    spaceName: space.name,
                    folderId: null,
                    folderName: null,
                    listId: list.id,
                    listName: list.name
                });
            }

            const folders = await getClickUpFolders(space.id);

            for (const folder of folders) {
                const lists =
                    await getClickUpListsInFolder(folder.id);

                for (const list of lists) {
                    result.push({
                        workspaceId: workspace.id,
                        workspaceName: workspace.name,
                        spaceId: space.id,
                        spaceName: space.name,
                        folderId: folder.id,
                        folderName: folder.name,
                        listId: list.id,
                        listName: list.name
                    });
                }
            }
        }
    }

    return result;
}

const lists = await getAllClickUpLists();

console.log(JSON.stringify(lists, null, 2));