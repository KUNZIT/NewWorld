"use client";

import { VerificationLevel, IDKitWidget, useIDKit } from "@worldcoin/idkit";
import type { ISuccessResult } from "@worldcoin/idkit";
import { verify } from "./actions/verify";
import Image from 'next/image';
import React, { useState, useEffect } from 'react';

export default function Home() {
  const [timer, setTimer] = useState(15);
  const [timerRunning, setTimerRunning] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [lastVerificationTime, setLastVerificationTime] = useState<number | null>(null); // State for last verification time

  const app_id = process.env.NEXT_PUBLIC_WLD_APP_ID as `app_${string}`;
  const action = process.env.NEXT_PUBLIC_WLD_ACTION;

  useEffect(() => {
    // Load last verification time from sessionStorage on mount
    const storedTime = sessionStorage.getItem('lastVerificationTime');
    if (storedTime) {
      setLastVerificationTime(parseInt(storedTime, 10));
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleVerifyClick = () => {
    const currentTime = Date.now();
    if (lastVerificationTime && (currentTime - lastVerificationTime < 24 * 60 * 60 * 1000)) {
      const remainingTime = 24 * 60 * 60 * 1000 - (currentTime - lastVerificationTime);
      const hours = Math.floor(remainingTime / (60 * 60 * 1000));
      const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);

      alert(`Verification is only allowed once every 24 hours. Please wait ${hours}:${minutes}:${seconds}.`);
      return; // Stop further execution
    }

    setOpen(true);
    document.body.classList.add('disable-interaction');
    setTimerRunning(true);
    setButtonDisabled(true);
    let timeLeft = timer;

    const interval = setInterval(() => {
      timeLeft--;
      setTimer(timeLeft);

      if (timeLeft < 0) {
        clearInterval(interval);
        console.log("Timer finished. Reloading the page...");
        window.location.reload();
      }
    }, 1000);
  };

  if (!app_id) {
    throw new Error("app_id is not set in environment variables!");
  }
  if (!action) {
    throw new Error("action is not set in environment variables!");
  }

  const { setOpen } = useIDKit();

  const onSuccess = (result: ISuccessResult) => {
    const audio = new Audio('/beep.mp3');
    audio.play();

    console.log(
      "Successfully verified with World ID! Your nullifier hash is: " +
        result.nullifier_hash
    );
  };

  const handleProof = async (result: ISuccessResult) => {
    console.log(
      "Proof received from IDKit, sending to backend:\n",
      JSON.stringify(result)
    );

    try {
      const data = await verify(result, undefined, lastVerificationTime); // Pass lastVerificationTime to the server action

      if (data.success) {
        console.log("Successful response from backend:\n", JSON.stringify(data));
        setLastVerificationTime(Date.now()); // Update the state
        sessionStorage.setItem('lastVerificationTime', Date.now().toString()); // Store in session storage
      } else {
        throw new Error(`Verification failed: ${data.detail}`);
      }
    } catch (error) {
      console.error("Error during verification:", error);
      alert(error.message); // Display error to the user
    }
  };

  return (
    // ... (rest of your JSX - no changes needed)
  );
}