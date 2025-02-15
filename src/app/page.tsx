"use client";

import { VerificationLevel, IDKitWidget, useIDKit } from "@worldcoin/idkit";
import type { ISuccessResult } from "@worldcoin/idkit";
import { verify } from "./actions/verify";
import Image from 'next/image';
import React, { useState, useEffect } from 'react';

export default function Home() {
  const [timer, setTimer] = useState(15); // Initial timer value (60 seconds)
  const [timerRunning, setTimerRunning] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false); // Disable button
  
  const app_id = process.env.NEXT_PUBLIC_WLD_APP_ID as `app_${string}`;
  const action = process.env.NEXT_PUBLIC_WLD_ACTION;

  const handleVerifyClick = () => {
    setOpen(true); 
    document.body.classList.add('disable-interaction'); // Disable interaction on the body
    setTimerRunning(true);
    setButtonDisabled(true); // Disable the button
    let timeLeft = timer;

    const interval = setInterval(() => {
      timeLeft--;
      setTimer(timeLeft);

      if (timeLeft < 0) {
        clearInterval(interval);
        console.log("Timer finished. Reloading the page...");
        window.location.reload(); // Perform full page reload
      }
    }, 1000); // Update every second
  }; // Closing brace for handleVerifyClick function is here

  if (!app_id) {
    throw new Error("app_id is not set in environment variables!");
  }
  if (!action) {
    throw new Error("action is not set in environment variables!");
  }

  const { setOpen } = useIDKit();

  const onSuccess = (result: ISuccessResult) => {
  // Play a short beep sound
  const audio = new Audio('/beep.mp3'); 
  audio.play();

  // Optionally, you can still log the nullifier hash to the console
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
    const data = await verify(result);
    if (data.success) {
      console.log("Successful response from backend:\n", JSON.stringify(data));
    } else {
      throw new Error(`Verification failed: ${data.detail}`);
    }
  };

  return (
    <div className="relative h-screen w-screen">
      <Image
        src="/home.jpg" // Replace with your image path
        alt="Full Screen Image"
        fill
        style={{ objectFit: 'cover' }}
        priority // Add priority for faster loading of hero images
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl mb-5">WATER</p>
        <IDKitWidget
          action={action}
          app_id={app_id}
          onSuccess={onSuccess}
          handleVerify={handleProof}
          verification_level={VerificationLevel.Orb}
        />
        <button
          className="border border-black bg-white text-black rounded-md"
          onClick={handleVerifyClick}
          disabled={buttonDisabled} // Disable the button while the timer is runn
        >
          <div className="mx-3 my-1">Verify with World ID</div>
        </button>

        {timerRunning && ( // Conditionally render the timer display
          <div className="timer-display">
            Time remaining: {timer} seconds
          </div>
        )}
      </div>
    </div>
  );
}