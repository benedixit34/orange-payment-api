export const TICKET_PRICES = {
  NGN: {
    "early-bird": 180000,
    standard: 200000,
    vip: 300000,
  },

  USD: {
    "early-bird": 140,
    standard: 160,
    vip: 230,
  },
} as const;

export type TicketType = keyof typeof TICKET_PRICES.NGN;
export type Currency = keyof typeof TICKET_PRICES;