# WATER KIOSK

This is a Next.js application designed to communicate with the World Super Wallet app,

verifying if a user possesses the required orb verification level.

Upon successful verification, the application emits a short audio signal (beep).

To prevent abuse, verification checks are restricted to a 24-hour period, managed using a Redis database.

## Potential Use Case

This application can be deployed in a vending machine to distribute water or other products
 based on unique human identity and mathematical patterns.

Visit https://new-world-j1t1.vercel.app/

## Environment Variables

This application requires the following environment variables:

-   `WORLD_ID_APP_ID`: Your World ID application ID.
-   `ACTION_NAME`: The specific action name used for verification.
-   `REDIS_URL`: The URL of your Redis database.

## Getting Started

1.  **Use Node.js v20:**

    ```bash
    nvm use 20
    ```

2.  **Install dependencies and start the development server:**

    ```bash
    pnpm install && pnpm dev
    ```



To learn more about Next.js and World ID, take a look at the following resources:

-   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
-   [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
-   [World ID Documentation](https://docs.worldcoin.org/) - learn about World ID features and API.


