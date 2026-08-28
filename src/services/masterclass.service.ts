import "dotenv/config";
import type { Booking } from "../types/index.js";
import {
  createClickUpTask,
  updateClickUpCustomField,
} from "./clickup.service.js";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

export async function createMasterclassBookingTask(booking: Booking) {
  const listId = getRequiredEnv("CLICKUP_MASTERCLASS_LIST_ID");
  const emailFieldId = getRequiredEnv("MASTERCLASS_EMAIL_FIELD_ID");
  const phoneFieldId = getRequiredEnv("MASTERCLASS_PHONE_FIELD_ID");
  const masterclassFieldId = getRequiredEnv("MASTERCLASS_FIELD_ID");


  const description = `
                ## Professional Information

                **Profile:** ${booking.profile}
                **Experience:** ${booking.experience}
                **Tools:** ${booking.tools.join(", ") || "None"}

                ## Masterclass

                **Start Date:** ${booking.session}
                **Ticket:** ${booking.ticket}
                **Amount:** ₦${booking.amount.toLocaleString()}

                ## Learning Goal

                ${booking.learningGoal || "Not provided"}

                ## Payment

                **Payment Status:** Paid
                **Flutterwave Transaction ID:** ${booking.transactionId}
                `;

  const task = await createClickUpTask({
    listId,
    name: booking.name,
    description,
  });

  const fields: Array<[string, unknown]> = [
    [emailFieldId, booking.email],
    [phoneFieldId, booking.phone],
    [masterclassFieldId, booking.masterclass],
  ];

  await Promise.all(
    fields.map(([fieldId, value]) =>
      updateClickUpCustomField({
        taskId: task.id,
        fieldId,
        value,
      }),
    ),
  );

  return task;
}
