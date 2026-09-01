export type Booking = {
    transactionId?: number;
    name: string;
    email: string;
    phone: string;
    profile: string;
    experience: "Beginner" | "Intermediate" | "Advanced";
    tools: string[];
    masterclass: string;
    session: string;
    ticket: string;
    amount: number;
    learningGoal: string;
    preferredMode?: "Physical - Studio" | "Virtual - Livestream";
};