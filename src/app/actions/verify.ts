"use server";

import { VerificationLevel } from "@worldcoin/idkit-core";
import { verifyCloudProof } from "@worldcoin/idkit-core/backend";

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

export async function verify(
  proof: IVerifyRequest["proof"],
  lastVerificationTime: number | null, // Add parameter for last verification time
  signal?: string,
): Promise<VerifyReply> {

  const userId = proof.nullifier_hash;

  if (lastVerificationTime) {
    const timeSinceLastVerification = Date.now() - lastVerificationTime;
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
    return { success: true }; // No longer writing to file system
  } else {
    return { success: false, code: verifyRes.code, attribute: verifyRes.attribute, detail: verifyRes.detail };
  }
}