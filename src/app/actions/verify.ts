"use server"; // Keep "use server"

import { VerificationLevel } from "@worldcoin/idkit-core";
import { verifyCloudProof } from "@worldcoin/idkit-core/backend";
import { createClient } from 'redis'; // Import createClient

export type VerifyReply = {
  success: boolean;
  code?: string;
  attribute?: string | null;
  detail?: string;
};

interface IVerifyRequest {
  proof: {
    nullifier_hash: string;
    merkle_root: string;
    proof: string;
    verification_level: VerificationLevel;
  };
  signal?: string;
}

const app_id = process.env.NEXT_PUBLIC_WLD_APP_ID as `app_${string}`;
const action = process.env.NEXT_PUBLIC_WLD_ACTION as string;

// Separate keys for user-specific verification timestamps and the total count.
const KV_KEY_USER_VERIFICATIONS = 'world-id-verifications-users'; 
const KV_KEY_TOTAL_VERIFICATIONS = 'world-id-verifications-total';

let redisClient: ReturnType<typeof createClient> | null = null; // Initialize to null
async function getRedisClient() { // Function to create and reuse the client
  if (!redisClient) {
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL, // Use REDIS_URL environment variable
      });
      await redisClient.connect();
      console.log('Connected to Redis');
    } catch (error) {
      console.error('Error connecting to Redis:', error);
      throw error; // Re-throw the error to prevent the server from starting
    }
  }
  return redisClient;
}

async function readUserVerificationData(): Promise<Record<string, number>> {
  const client = await getRedisClient();
  try {
    const data = await client.get(KV_KEY_USER_VERIFICATIONS);
    return data ? JSON.parse(data) : {};
  } catch (err) {
    console.error("Error reading user verification data from Redis:", err);
    return {};
  }
}

async function writeUserVerificationData(data: Record<string, number>) {
  const client = await getRedisClient();
  try {
    await client.set(KV_KEY_USER_VERIFICATIONS, JSON.stringify(data));
  } catch (err) {
    console.error("Error writing user verification data to Redis:", err);
  }
}

/**
 * Increments the total verification count in Redis.
 * This function uses the atomic INCR command to prevent race conditions.
 */
async function incrementTotalVerifications() {
  const client = await getRedisClient();
  try {
    // INCR increments the number stored at a key by one.
    // If the key does not exist, it is set to 0 before performing the operation.
    await client.incr(KV_KEY_TOTAL_VERIFICATIONS);
    console.log("Total verifications count incremented.");
  } catch (err) {
    console.error("Error incrementing total verifications count in Redis:", err);
  }
}

/**
 * Retrieves the total verification count from Redis.
 * @returns The total number of successful verifications, or 0 if not found.
 */
export async function getTotalVerificationsCount(): Promise<number> {
  const client = await getRedisClient();
  try {
    const count = await client.get(KV_KEY_TOTAL_VERIFICATIONS);
    return count ? parseInt(count, 10) : 0;
  } catch (err) {
    console.error("Error getting total verifications count from Redis:", err);
    return 0;
  }
}

export async function verify(
  proof: IVerifyRequest["proof"],
  signal?: string
): Promise<VerifyReply> {
  const userId = proof.nullifier_hash;

  const verificationData = await readUserVerificationData();
  const lastVerification = verificationData[userId];

  if (lastVerification) {
    const timeSinceLastVerification = Date.now() - lastVerification;
    const fiveMinutes = 5 * 60 * 1000;

    if (timeSinceLastVerification < fiveMinutes) {
      const remainingTime = fiveMinutes - timeSinceLastVerification;
      const minutes = Math.floor(remainingTime / (60 * 1000));
      const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);

      const message = `Verification is only allowed once every 5 minutes. Please wait ${minutes}:${seconds}`;

      return {
        success: false,
        detail: message,
      };
    }
  }

  const verifyRes = await verifyCloudProof(proof, app_id, action, signal);
  if (verifyRes.success) {
    // Update the user's last verification timestamp
    verificationData[userId] = Date.now();
    await writeUserVerificationData(verificationData);

    // Increment the total successful verifications count
    await incrementTotalVerifications();

    return { success: true };
  } else {
    return { success: false, code: verifyRes.code, attribute: verifyRes.attribute, detail: verifyRes.detail };
  }
}


verify.close = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('Redis connection closed.');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
};
