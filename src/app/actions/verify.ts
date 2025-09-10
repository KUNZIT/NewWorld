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
const KV_KEY = 'world-id-verifications'; // Key to store verification data

let redisClient: ReturnType<typeof createClient> | null = null; // Initialize to null
async function getRedisClient() {  // Function to create and reuse the client
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


async function readVerificationData(): Promise<Record<string, number>> {
    const client = await getRedisClient();
  try {
    const data = await client.get('world-id-verifications');
    return data ? JSON.parse(data) : {};
  } catch (err) {
    console.error("Error reading verification data from Redis:", err);
    return {};
  }
}

async function writeVerificationData(data: Record<string, number>) {
    const client = await getRedisClient();
  try {
    await client.set('world-id-verifications', JSON.stringify(data));
  } catch (err) {
    console.error("Error writing verification data to Redis:", err);
  }
}

export async function verify(
  proof: IVerifyRequest["proof"],
  signal?: string
): Promise<VerifyReply> {

  const userId = proof.nullifier_hash;

  const verificationData = await readVerificationData();
  const lastVerification = verificationData[userId];

  if (lastVerification) {
    const timeSinceLastVerification = Date.now() - lastVerification;
    const fiveMinutes = 5 * 60 * 1000;

    if (timeSinceLastVerification < fiveMinutes) {
      const remainingTime = fiveMinutes - timeSinceLastVerification;
      const minutes = Math.floor(remainingTime / (60 * 1000));
      const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);

      const message = `Verification is only allowed once every 5 minutes. Please wait ${minutes}:${seconds} `;

      return {
        success: false,
        detail: message,
      };
    }
  }

  const verifyRes = await verifyCloudProof(proof, app_id, action, signal);
  if (verifyRes.success) {
    verificationData[userId] = Date.now();
    await writeVerificationData(verificationData);
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
