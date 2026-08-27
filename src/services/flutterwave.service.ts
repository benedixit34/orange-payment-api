import "dotenv/config";

type FlutterwaveResponse<T = unknown> = {
    status: string;
    message: string;
    data: T | null;
};

type Transaction = {
    id: number;
    tx_ref: string;
    amount: number;
    currency: string;
    status: string;
    customer: {
        name: string;
        email: string;
        phone_number: string;
    };
};

export async function verifyTransaction(
    transactionId: number
): Promise<FlutterwaveResponse<Transaction>> {
    const response = await fetch(
        `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
        }
    );

    if (!response.ok) {
        throw new Error(
            `Flutterwave verification failed: ${response.status}`
        );
    }

    return (await response.json()) as FlutterwaveResponse<Transaction>;
}