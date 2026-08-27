import "dotenv/config";
import type { Request, Response } from "express";
import { verifyTransaction } from "../services/flutterwave.service.js";
import { createMasterclassBookingTask } from "../services/masterclass.service.js";
import { sendEmail } from "../services/email.service.js";
import type { Booking } from "../types/index.js";

const ticketPrices: Record<string, number> = {
    "early-bird": 180000,
    standard: 200000,
    vip: 300000
};

export async function createBooking(req: Request, res: Response) {
    try {
        const {
            transactionId,
            name,
            email,
            phone,
            profile,
            experience,
            tools = [],
            masterclass,
            session,
            ticket,
            learningGoal = ""
        } = req.body;

        if (!transactionId) {
            return res.status(400).json({
                success: false,
                message: "Transaction ID is required."
            });
        }

        const parsedTransactionId = Number(transactionId);

        if (
            !Number.isInteger(parsedTransactionId) ||
            parsedTransactionId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid transaction ID."
            });
        }

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
            return res.status(400).json({
                success: false,
                message: "Required booking information is missing."
            });
        }

        if (!Array.isArray(tools)) {
            return res.status(400).json({
                success: false,
                message: "Invalid tools format."
            });
        }

        const expectedAmount = ticketPrices[ticket];

        if (!expectedAmount) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket type."
            });
        }

        const payment = await verifyTransaction(parsedTransactionId);

        if (payment.status !== "success" || !payment.data) {
            return res.status(400).json({
                success: false,
                message: "Payment could not be verified."
            });
        }

        const transaction = payment.data;

        if (transaction.status !== "successful") {
            return res.status(400).json({
                success: false,
                message: "Payment was not successful."
            });
        }

        if (transaction.currency !== "NGN") {
            return res.status(400).json({
                success: false,
                message: "Invalid payment currency."
            });
        }

        if (transaction.amount !== expectedAmount) {
            return res.status(400).json({
                success: false,
                message: "Incorrect payment amount."
            });
        }

        if (
            transaction.customer.email.toLowerCase() !==
            email.trim().toLowerCase()
        ) {
            return res.status(400).json({
                success: false,
                message: "Payment email does not match booking email."
            });
        }

        const booking: Booking = {
            transactionId: transaction.id,
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            profile: profile.trim(),
            experience: experience.trim(),
            tools,
            masterclass: masterclass.trim(),
            session: session.trim(),
            ticket: ticket.trim(),
            amount: expectedAmount,
            learningGoal: learningGoal.trim()
        };

        const clickUpTask = await createMasterclassBookingTask(booking);

        try {
            await sendEmail({
                to: booking.email,
                subject: "Masterclass Booking Confirmation",
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                        <h2>Booking Confirmed</h2>

                        <p>Hi ${booking.name},</p>

                        <p>
                            Your payment has been successfully received
                            and your masterclass booking has been confirmed.
                        </p>

                        <h3>Booking Details</h3>

                        <p>
                            <strong>Masterclass:</strong> ${booking.masterclass}<br>
                            <strong>Session:</strong> ${booking.session}<br>
                            <strong>Ticket:</strong> ${booking.ticket}<br>
                            <strong>Amount:</strong> ₦${booking.amount.toLocaleString()}<br>
                            <strong>Transaction ID:</strong> ${booking.transactionId}
                        </p>

                        <p>
                            Thank you for registering. We look forward to
                            having you.
                        </p>

                        <p>
                            Regards,<br>
                            Orange VFX
                        </p>
                    </div>
                `,
                text: `
Booking Confirmed

Hi ${booking.name},

Your payment has been successfully received and your masterclass booking has been confirmed.

Masterclass: ${booking.masterclass}
Session: ${booking.session}
Ticket: ${booking.ticket}
Amount: ₦${booking.amount.toLocaleString()}
Transaction ID: ${booking.transactionId}

Thank you for registering.

Regards,
Orange VFX
                `
            });
        } catch (error) {
            console.error(
                "Booking confirmation email failed:",
                error
            );
        }

        return res.status(201).json({
            success: true,
            message: "Booking created successfully.",
            data: {
                transactionId: transaction.id,
                clickUpTaskId: clickUpTask.id
            }
        });
    } catch (error) {
        console.error("Create booking error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create booking."
        });
    }
}