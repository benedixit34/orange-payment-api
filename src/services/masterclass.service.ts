import "dotenv/config";
import type { Booking } from "../types/index.js";
import {
  createClickUpTask,
  updateClickUpCustomField,
} from "./clickup.service.js";

import { getClickUpListFields, ClickUpCustomField } from "../utils/clickup.js";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}


function normalizeFieldName(value: string): string {
    return value
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
}


function getBookingValue(
    booking: Booking,
    field: ClickUpCustomField
): unknown {
    switch (field.type) {
        case "email":
            return booking.email;

        case "phone":
            return booking.phone;

        default:
            break;
    }

 
  
    const bookingRecord =
        booking as unknown as Record<string, unknown>;

        

    const normalizedFieldName = normalizeFieldName(
        field.name
    );

           if (
        normalizedFieldName ===
        normalizeFieldName("Current Skill Level")
    ) {
        return booking.experience;
    }
    
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


export async function createMasterclassBookingTask(booking: Booking) {
  const listId = getRequiredEnv("CLICKUP_MASTERCLASS_LIST_ID");

  const clickUpFields = await getClickUpListFields(listId);
  // const emailFieldId = getRequiredEnv("MASTERCLASS_EMAIL_FIELD_ID");
  // const phoneFieldId = getRequiredEnv("MASTERCLASS_PHONE_FIELD_ID");
  // const masterclassFieldId = getRequiredEnv("MASTERCLASS_FIELD_ID");
  // const experienceFieldId = getRequiredEnv("MASTERCLASS_EXPERIENCE_FIELD_ID")
  // const preferredModeFieldId = getRequiredEnv("MASTERCLASS_PREFERRED_MODE_FIELD_ID");


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

  const task = await createClickUpTask({
    listId,
    name: booking.name,
    description,
  });

  // const fields: Array<[string, unknown]> = [
  //   [emailFieldId, booking.email],
  //   [phoneFieldId, booking.phone],
  //   [experienceFieldId, booking.experience],
  //   [preferredModeFieldId, booking.preferredMode],
  // ];

  const fields: Array<[string, unknown]> = []
  for (const field of clickUpFields) {
    const value = getBookingValue(booking, field);

    if (value === undefined || value === null) {
      console.warn(
        `No corresponding booking value found for ClickUp field "${field.name}".`
      );
      continue;
    }

    fields.push([field.id, value]);

  }

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
