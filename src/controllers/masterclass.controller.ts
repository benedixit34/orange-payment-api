import "dotenv/config";
import type { Request, Response } from "express";

import { verifyTransaction } from "../services/flutterwave.service.js";
import {
  createMasterclassBookingTask,
  confirmMasterclassPayment,
} from "../services/masterclass.service.js";
import type { Booking } from "../types/index.js";
import {
  savePendingBooking,
  getPendingBooking,
  deletePendingBooking,
} from "../services/booking-storage.service.js";

const TICKET_PRICES: Record<string, number> = {
  "early-bird": 180000,
  standard: 200000,
  vip: 300000,
};

type BookingRequestData = {
  name: string;
  email: string;
  phone: string;
  profile: string;
  experience: "Beginner" | "Intermediate" | "Advanced";
  tools: string[];
  masterclass: string;
  session: string;
  ticket: string;
  learningGoal: string;
  preferredMode?: "Physical - Studio" | "Virtual - Livestream";
  futureInterest?: string;
};

const getBookingData = (body: Request["body"]): BookingRequestData | null => {
  const {
    name,
    email,
    phone,
    profile,
    experience,
    tools = [],
    masterclass,
    session,
    ticket,
    learningGoal,
    preferredMode,
    futureInterest,
  } = body;

  if (
    !name ||
    !email ||
    !phone ||
    !profile ||
    !experience ||
    !masterclass ||
    !session ||
    !ticket
  ) {
    return null;
  }

  if (!Array.isArray(tools)) {
    return null;
  }

  const normalizedPreferredMode =
    typeof preferredMode === "string"
      ? preferredMode.trim().replace(/\s+/g, " ")
      : "Physical - Studio";

  if (
    normalizedPreferredMode !== "Physical - Studio" &&
    normalizedPreferredMode !== "Virtual - Livestream"
  ) {
    return null;
  }

  return {
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    profile: profile.trim(),
    experience: experience.trim() as "Beginner" | "Intermediate" | "Advanced",
    tools,
    masterclass: masterclass.trim(),
    session: session.trim(),
    ticket: ticket.trim(),
    learningGoal: learningGoal.trim(),
    preferredMode: normalizedPreferredMode,
    futureInterest: futureInterest?.trim() || undefined,
  };
};

const validateTicket = (ticket: string) => {
  const amount = TICKET_PRICES[ticket];

  if (!amount) {
    return null;
  }

  return amount;
};

const createBooking = (
  data: BookingRequestData,
  transactionId: number,
  amount: number,
): Booking => {
  return {
    transactionId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    profile: data.profile,
    experience: data.experience || "Beginner",
    tools: data.tools,
    masterclass: data.masterclass,
    session: data.session,
    ticket: data.ticket,
    amount,
    learningGoal: data.learningGoal,
    preferredMode: data.preferredMode || "Physical - Studio",
    futureInterest: data.futureInterest || undefined,
  };
};

export async function saveToClickUp(req: Request, res: Response) {
  try {
    const bookingData = getBookingData(req.body);

    if (!bookingData) {
      return res.status(400).json({
        success: false,
        message: "Required booking information is missing or invalid.",
      });
    }

    const expectedAmount = validateTicket(bookingData.ticket);

    if (!expectedAmount) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket type.",
      });
    }

    let transactionId = 0;

    const booking = createBooking(bookingData, transactionId, expectedAmount);

    const clickUpTask = await createMasterclassBookingTask(booking);

    const reference = await savePendingBooking(
      booking.name,
      booking.email,
      booking.phone,
      booking.profile,
      booking.experience,
      booking.tools,
      booking.masterclass,
      booking.session,
      booking.ticket,
      expectedAmount,
      booking.learningGoal,
      clickUpTask.id,
      booking.preferredMode,
      booking.futureInterest,
    );

    return res.status(201).json({
      success: true,
      message: "Booking saved successfully.",
      data: {
        clickUpTaskId: clickUpTask.id,
        reference,
        transactionId: null,
        amountApproved: null,
        paymentConfirmed: false,
        ticket: booking.ticket,
      },
    });
  } catch (error) {
    console.error("Save to ClickUp error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save booking.",
    });
  }
}

export async function getPendingBookingData(req: Request, res: Response) {
  try {
    const reference = String(req.params.reference);

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "Booking reference is required.",
      });
    }

    const booking = await getPendingBooking(reference);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or has expired.",
      });
    }

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("Get pending booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve booking.",
    });
  }
}

export async function confirmMasterclassPaymentController(
  req: Request,
  res: Response,
) {
  try {
    const { transactionId, reference } = req.body;

    if (!transactionId || !reference) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID and booking reference are required.",
      });
    }

    const booking = await getPendingBooking(reference);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or has expired.",
      });
    }

    const verification = await verifyTransaction(transactionId);

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: "Payment could not be verified.",
      });
    }

    if (verification.data?.status !== "successful") {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed.",
      });
    }

    const amountApproved = Number(verification.data?.amount);

    if (Number.isNaN(amountApproved) || amountApproved !== booking.amount) {
      return res.status(400).json({
        success: false,
        message: "Payment amount does not match the booking.",
      });
    }

    await confirmMasterclassPayment(
      booking.clickUpTaskId!,
      Number(transactionId),
      amountApproved,
    );

    await deletePendingBooking(reference);

    return res.status(200).json({
      success: true,
      message: "Payment confirmed successfully.",
      data: {
        reference,
        transactionId: Number(transactionId),
        amountApproved,
        paymentConfirmed: true,
      },
    });
  } catch (error) {
    console.error("Confirm payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to confirm payment.",
    });
  }
}
