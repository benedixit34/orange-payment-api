import "dotenv/config";
import type { Booking } from "../types/index.js";
import {
    createClickUpTask,
    updateClickUpCustomField
} from "./clickup.service.js";

export async function createMasterclassBookingTask(booking: Booking) {
    const listId = process.env.CLICKUP_BOOKING_LIST_ID;

    if (!listId) {
        throw new Error("CLICKUP_BOOKING_LIST_ID is not configured.");
    }

    const task = await createClickUpTask({
        listId,
        name: `Masterclass Booking - ${booking.name}`
    });

    const fields: Array<[string | undefined, unknown]> = [
        [process.env.CLICKUP_FIELD_NAME, booking.name],
        [process.env.CLICKUP_FIELD_EMAIL, booking.email],
        [process.env.CLICKUP_FIELD_PHONE, booking.phone],
        [process.env.CLICKUP_FIELD_PROFILE, booking.profile],
        [process.env.CLICKUP_FIELD_EXPERIENCE, booking.experience],
        [process.env.CLICKUP_FIELD_TOOLS, booking.tools.join(", ")],
        [process.env.CLICKUP_FIELD_MASTERCLASS, booking.masterclass],
        [process.env.CLICKUP_FIELD_SESSION, booking.session],
        [process.env.CLICKUP_FIELD_TICKET, booking.ticket],
        [process.env.CLICKUP_FIELD_AMOUNT, booking.amount],
        [process.env.CLICKUP_FIELD_LEARNING_GOAL, booking.learningGoal],
        [
            process.env.CLICKUP_FIELD_TRANSACTION_ID,
            String(booking.transactionId)
        ]
    ];

    await Promise.all(
        fields
            .filter(
                (field): field is [string, unknown] =>
                    Boolean(field[0])
            )
            .map(([fieldId, value]) =>
                updateClickUpCustomField({
                    taskId: task.id,
                    fieldId,
                    value
                })
            )
    );

    return task;
}