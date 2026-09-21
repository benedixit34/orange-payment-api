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


import type { Currency } from "../config/ticketConfig.js";

type BookingRequestData = {
  name: string;
  email: string;
  phone: string;
  profile: string;
  experience: "Beginner" | "Intermediate" | "Advanced";
  tools: string[];
  masterclass: string;
  session: string;
  learningGoal: string;
  referralCode?: string;
  preferredMode?: "Physical - Studio" | "Virtual - Livestream";
  futureInterest?: string;
};

const getBookingData = (
  body: Request["body"],
): BookingRequestData | null => {
  const {
    name,
    email,
    phone,
    profile,
    experience,
    tools = [],
    masterclass,
    session,
    learningGoal,
    referralCode,
    preferredMode,
    futureInterest,
  } = body;

  if (
    !name ||
    !email ||
    !phone ||
    !profile ||
    !experience ||
    !masterclass
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
    experience: experience.trim() as
      | "Beginner"
      | "Intermediate"
      | "Advanced",
    tools,
    masterclass: masterclass.trim(),
    session: session.trim(),
    learningGoal: learningGoal.trim() || undefined,
    referralCode: referralCode.trim() || undefined,
    preferredMode: normalizedPreferredMode,
    futureInterest: futureInterest?.trim() || undefined,
  };
};

const createBooking = (
  data: BookingRequestData,
  transactionId: number,
): Booking => {
  return {
    transactionId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    profile: data.profile,
    experience: data.experience,
    tools: data.tools,
    masterclass: data.masterclass,
    session: data.session,
    learningGoal: data.learningGoal,
    referralCode: data.referralCode,
    preferredMode: data.preferredMode || "Physical - Studio",
    futureInterest: data.futureInterest || undefined,
  };
};

export async function saveToClickUp(
  req: Request,
  res: Response,
) {
  try {
    const bookingData = getBookingData(req.body);
    const phoneCountryCode = req.body.countryCode;

    if (!bookingData) {
      return res.status(400).json({
        success: false,
        message: "Required booking information is missing or invalid.",
      });
    }

    // const country = await Promise.race([
    //   getCountryFromIp(req),
    //   new Promise<string | null>((resolve) =>
    //     setTimeout(() => resolve(null), 2000),
    //   ),
    // ]);

    // const country_code =  phoneCountryCode === "+234"
    //     ? "NG"
    //     : country;

    const currency: Currency =
      phoneCountryCode === "+234" || !phoneCountryCode
        ? "NGN"
        : "USD";

    const booking = createBooking(bookingData, 0);

    const clickUpTask =
      await createMasterclassBookingTask(booking);

    const reference = await savePendingBooking(
      booking.name,
      booking.email,
      booking.phone,
      booking.profile,
      booking.experience,
      booking.tools,
      booking.masterclass,
      booking.session,
      booking.learningGoal,
      clickUpTask.id,
      booking.referralCode,
      booking.preferredMode,
      booking.futureInterest,
      currency,
    );

    return res.status(201).json({
      success: true,
      message: "Booking saved successfully.",
      data: {
        clickUpTaskId: clickUpTask.id,
        reference,
        transactionId: null,
        paymentConfirmed: false,
        currency,
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

export async function getPendingBookingData(
  req: Request,
  res: Response,
) {
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
        message:
          "Transaction ID and booking reference are required.",
      });
    }

    const booking = await getPendingBooking(reference);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or has expired.",
      });
    }

    const verification =
      await verifyTransaction(transactionId);

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

    if (
      Number(verification.data?.id) !== Number(transactionId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID does not match.",
      });
    }

    if (
      booking.transactionReference &&
      verification.data?.tx_ref !==
        booking.transactionReference
    ) {
      return res.status(400).json({
        success: false,
        message: "Transaction reference does not match.",
      });
    }

    const amountApproved = Number(
      verification.data?.amount,
    );

    if (
      Number.isNaN(amountApproved) ||
      amountApproved !== Number(booking.amount)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment amount does not match the booking.",
      });
    }

    const currencyApproved =
      verification.data?.currency;

    if (
      currencyApproved !== booking.currency
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment currency does not match the booking.",
      });
    }

    await confirmMasterclassPayment(
      booking.clickUpTaskId,
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
        currency: currencyApproved,
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