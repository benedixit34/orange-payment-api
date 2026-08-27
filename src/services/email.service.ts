import "dotenv/config";
import nodemailer from "nodemailer";

type SendEmailParams = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

export async function sendEmail({
    to,
    subject,
    html,
    text
}: SendEmailParams) {
    if (!process.env.SMTP_FROM) {
        throw new Error("SMTP_FROM is not configured.");
    }

    return transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        text,
        html
    });
}