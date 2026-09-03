import "dotenv/config";
import type { Request, Response } from "express";

import { verifyTransaction } from "../services/flutterwave.service.js";
import { createMasterclassBookingTask, confirmMasterclassPayment } from "../services/masterclass.service.js";
import type { Booking } from "../types/index.js";

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
        experience: experience.trim() as
            | "Beginner"
            | "Intermediate"
            | "Advanced",
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
    amount: number
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



export async function saveToClickUp(
    req: Request,
    res: Response
) {
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

        
        const rawTransactionId =
            req.body.transactionId ??
            req.body.transaction_id ??
            req.body.id;

        const hasTransactionId =
            rawTransactionId !== undefined &&
            rawTransactionId !== null &&
            String(rawTransactionId).trim() !== "";


        let transactionId = 0;
        let amountApproved = expectedAmount;

        if (hasTransactionId) {
            transactionId = Number(rawTransactionId);

            if (!Number.isInteger(transactionId) ||
                transactionId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid Flutterwave transaction ID.",
                });
            }

            const verification = await verifyTransaction(transactionId);

            if (!verification || verification.status !== "successful") {
                return res.status(400).json({
                    success: false,
                    message:
                        "Payment could not be verified.",
                });
            }

            amountApproved = Number(verification.data?.amount);

            if (Number.isNaN(amountApproved) || amountApproved !== expectedAmount) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Payment amount does not match the selected ticket.",
                });
            }
        }
        

        const booking = createBooking(
            bookingData,
            transactionId,
            expectedAmount
        );

        const clickUpTask = await createMasterclassBookingTask(booking);
        if (hasTransactionId) { 
            await confirmMasterclassPayment( clickUpTask.id, transactionId, amountApproved ); 
        }

        return res.status(201).json({
            success: true,
            message: hasTransactionId
                ? "Payment verified and booking saved successfully."
                : "Booking saved successfully.",
            data: {
                clickUpTaskId: clickUpTask.id,
                transactionId: hasTransactionId
                    ? transactionId
                    : null,
                amountApproved: hasTransactionId
                    ? amountApproved
                    : null,
                paymentConfirmed: hasTransactionId,
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