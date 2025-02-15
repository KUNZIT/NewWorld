"use server"; // Keep "use server"

import { VerificationLevel } from "@worldcoin/idkit-core";
import { verifyCloudProof } from "@worldcoin/idkit-core/backend";
import { kv } from '@vercel/kv'; // Import Vercel KV SDK - Let's try to keep this

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

async function readVerificationData() {
  try {
    const data = await kv.get(KV_KEY); // Get data from Vercel KV -  Still using kv.get()
    return (data ? JSON.parse(data as string) : {}) as Record<string, number>; // Parse JSON
  } catch (err) {
    console.error("Error reading verification data from Redis:", err); // Updated log message
    return {};
  }
}

async function writeVerificationData(data: Record<string, number>) {
  try {
    await kv.set(KV_KEY, JSON.stringify(data)); // Store data as JSON string in Vercel KV - Still using kv.set()
  } catch (err) {
    console.error("Error writing verification data to Redis:", err); // Updated log message
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
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (timeSinceLastVerification < twentyFourHours) {
      const remainingTime = twentyFourHours - timeSinceLastVerification;
      const hours = Math.floor(remainingTime / (60 * 60 * 1000));
      const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);

      const message = `Verification is only allowed once every 24 hours. Please wait ${hours}:${minutes}:${seconds} `;

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