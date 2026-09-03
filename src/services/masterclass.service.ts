import "dotenv/config";
import type { Booking } from "../types/index.js";
import {
  createClickUpTask,
  updateClickUpCustomField,
  updateClickUpTaskStatus,
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

function getBookingValue(booking: Booking, field: ClickUpCustomField): unknown {
  switch (field.type) {
    case "email":
      return booking.email;
    case "phone":
      return booking.phone;
    default:
      break;
  }

  const bookingRecord = booking as unknown as Record<string, unknown>;
  const normalizedFieldName = normalizeFieldName(field.name);

  if (normalizedFieldName === normalizeFieldName("Current Skill Level")) {
    return booking.experience;
  }

  if (normalizedFieldName === normalizeFieldName("Primary Goal")) {
    return booking.masterclass;
  }

  if (normalizedFieldName === normalizeFieldName("Future Masterclass")) {
    return booking.futureInterest;
  }

  for (const [key, value] of Object.entries(bookingRecord)) {
    if (normalizeFieldName(key) === normalizedFieldName) {
      return value;
    }
  }

  return undefined;
}

export async function createMasterclassBookingTask(booking: Booking) {
  const listId = getRequiredEnv("CLICKUP_MASTERCLASS_LIST_ID");
  const clickUpFields = await getClickUpListFields(listId);

  const description = `
            Profile: ${booking.profile}
            Tools: ${booking.tools.join(", ") || "None"}
            Start Date: ${booking.session}
            Ticket: ${booking.ticket}
            Amount: ₦${booking.amount.toLocaleString()}
            Learning Goal: ${booking.learningGoal || "Not provided"}
            Payment Status: Paid
            Flutterwave Transaction ID: ${booking.transactionId}
            `;

  const task = await createClickUpTask({
    listId,
    name: booking.name,
    description,
  });

  const fields: Array<[string, unknown]> = [];

  for (const field of clickUpFields) {
    const value = getBookingValue(booking, field);

    if (value === undefined || value === null) {
      console.warn(
        `No corresponding booking value found for ClickUp field "${field.name}".`,
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

export async function confirmMasterclassPayment(
  clickUpTaskId: string,
  transactionId: number,
  amountApproved: number
) {
  const listId = getRequiredEnv(
    "CLICKUP_MASTERCLASS_LIST_ID"
  );

  await updateClickUpTaskStatus(
    clickUpTaskId,
    "PAYMENT CONFIRMED"
  );

  const fields = await getClickUpListFields(listId);
  const amountField = fields.find(
    (field) =>
      normalizeFieldName(field.name) ===
      normalizeFieldName("Amount Approved")
  );

  if (!amountField) {
    throw new Error(
      'ClickUp custom field "Amount Approved" was not found.'
    );
  }
  await updateClickUpCustomField({
    taskId: clickUpTaskId,
    fieldId: amountField.id,
    value: amountApproved,
  });

  return {
    success: true,
    clickUpTaskId,
    transactionId,
    amountApproved,
  };
}