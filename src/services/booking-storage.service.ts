import { Redis } from "@upstash/redis";
import crypto from "crypto";
import type { Booking } from "../types/index.js";

const redis = Redis.fromEnv();

const BOOKING_TTL = 7 * 24 * 60 * 60;

type PendingBooking = Booking & {
    reference: string;
    clickUpTaskId: string;
};

const getBookingKey = (reference: string) =>
    `masterclass:booking:${reference}`;

export async function savePendingBooking(
    name: string,
    email: string,
    phone: string,
    profile: string,
    experience: "Beginner" | "Intermediate" | "Advanced",
    tools: string[],
    masterclass: string,
    session: string,
    ticket: string,
    amount: number,
    learningGoal: string,
    clickUpTaskId: string,
    preferredMode?: "Physical - Studio" | "Virtual - Livestream",
    futureInterest?: string | undefined,
    
): Promise<string> {
    const reference = `MC-${crypto.randomUUID()}`;

    const pendingBooking: PendingBooking = {
        reference,
        name,
        email,
        phone,
        profile,
        experience,
        tools,
        masterclass,
        session,
        ticket,
        amount,
        learningGoal,
        preferredMode,
        futureInterest,
        clickUpTaskId,
    };

    await redis.set(
        getBookingKey(reference),
        pendingBooking,
        { ex: BOOKING_TTL }
    );

    return reference;
}

export async function getPendingBooking(
    reference: string
): Promise<PendingBooking | null> {
    return await redis.get<PendingBooking>(
        getBookingKey(reference)
    );
}

export async function deletePendingBooking(
    reference: string
): Promise<void> {
    await redis.del(getBookingKey(reference));
}