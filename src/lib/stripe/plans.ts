// Shared plan metadata (safe for client and server)
export const STRIPE_PLANS = {
  pro: {
    name: "Pro",
    price: 19,
    interval: "month" as const,
    features: [
      "Unlimited AI generations",
      "Post scheduling",
      "Full Brand Brain insights",
      "LinkedIn direct publishing",
      "Priority support",
    ],
  },
} as const;
