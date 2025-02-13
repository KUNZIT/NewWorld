"use server";

import { VerificationLevel } from "@worldcoin/idkit-core";
import { verifyCloudProof } from "@worldcoin/idkit-core/backend";
import * as fs from 'fs/promises';
import path from 'path';

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
const DATA_FILE = path.join(process.cwd(), 'verifications.json');

async function readVerificationData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {};
    }
    console.error("Error reading verification data:", err);
    return {};
  }
}

async function writeVerificationData(data) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing verification data:", err);
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