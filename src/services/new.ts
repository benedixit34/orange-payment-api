
import "dotenv/config";

import type { Booking } from "../types/index.js";

import {
    createClickUpTask,
    updateClickUpCustomField,
} from "./clickup.service.js";

import {
    getClickUpListFields,
} from "../utils/clickup.js";

function getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`${name} is not configured.`);
    }

    return value;
}

/**
 * Converts names into a common format so that:
 *
 * email         -> email
 * Email         -> email
 * phone         -> phone
 * Phone Number  -> phonenumber
 * preferredMode -> preferredmode
 * Preferred Mode -> preferredmode
 */
function normalizeFieldName(value: string): string {
    return value
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
}

/**
 * Find the corresponding booking value for
 * a ClickUp custom field.
 */
function getBookingValue(
    booking: Booking,
    fieldName: string
): unknown {
    const normalizedFieldName =
        normalizeFieldName(fieldName);

    const bookingRecord =
        booking as unknown as Record<string, unknown>;

    for (const [key, value] of Object.entries(
        bookingRecord
    )) {
        if (
            normalizeFieldName(key) ===
            normalizedFieldName
        ) {
            return value;
        }
    }

    return undefined;
}

export async function createMasterclassBookingTask(
    booking: Booking
) {
    const listId = getRequiredEnv(
        "CLICKUP_MASTERCLASS_LIST_ID"
    );

    /*
     * Get the fields currently configured
     * on the ClickUp list.
     */
    const clickUpFields =
        await getClickUpListFields(listId);

    const description = `
## Professional Information

**Profile:** ${booking.profile}
**Tools:** ${booking.tools.join(", ") || "None"}

## Masterclass

**Name:** ${booking.masterclass}
**Start Date:** ${booking.session}
**Ticket:** ${booking.ticket}
**Amount:** ₦${booking.amount.toLocaleString()}

## Learning Goal

${booking.learningGoal || "Not provided"}

## Payment

**Payment Status:** Paid
**Flutterwave Transaction ID:** ${booking.transactionId}
`;

    /*
     * Create the ClickUp task.
     */
    const task = await createClickUpTask({
        listId,
        name: booking.name,
        description,
    });

    /*
     * Build custom-field updates dynamically.
     *
     * Every ClickUp field is checked against the
     * properties available on the Booking object.
     */
    const fields: Array<[string, unknown]> = [];

    for (const field of clickUpFields) {
        const value = getBookingValue(
            booking,
            field.name
        );

        /*
         * Don't update fields that don't have a
         * corresponding property in the booking.
         */
        if (value === undefined || value === null) {
            continue;
        }

        /*
         * Don't send objects/functions as custom-field
         * values unless explicitly supported.
         */
        if (typeof value === "function") {
            continue;
        }

        fields.push([
            field.id,
            value,
        ]);
    }

    /*
     * Update all matching ClickUp custom fields.
     */
    await Promise.all(
        fields.map(
            ([fieldId, value]) =>
                updateClickUpCustomField({
                    taskId: task.id,
                    fieldId,
                    value,
                })
        )
    );

    return task;
}

