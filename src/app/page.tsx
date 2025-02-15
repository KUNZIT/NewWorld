"use client";

import { VerificationLevel, IDKitWidget, useIDKit } from "@worldcoin/idkit";
import type { ISuccessResult } from "@worldcoin/idkit";
import { verify } from "./actions/verify";
import Image from 'next/image';
import React, { useState, useEffect, useRef } from 'react'; // Import useRef and useEffect for AnimatedRainCanvasBackground

const AnimatedRainCanvasBackground = () => { // Define AnimatedRainCanvasBackground as a separate component
    const canvasRef = useRef<HTMLCanvasElement>(null); // Use useRef<HTMLCanvasElement>(null) for proper typing
    const rainDrops = 300; // Number of raindrops
    const rainArray: {
        x: number;
        y: number;
        length: number;
        opacity: number;
        xSpeed: number;
        ySpeed: number;
    }[] = []; // Explicitly type rainArray

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return; // Exit if context is not available

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Initialize rain drops
        for (let i = 0; i < rainDrops; i++) {
            rainArray.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                length: Math.random() * 10 + 5, // Length of raindrop
                opacity: Math.random() * 0.5 + 0.5, // Opacity for depth effect
                xSpeed: Math.random() * 2 - 1, // Slight horizontal movement
                ySpeed: Math.random() * 7 + 5, // Vertical speed
            });
        }

        const animateRain = () => {
            if (!ctx) return; // Check context again in animation loop
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; // Very light black with alpha (adjust alpha for fade speed)
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            rainArray.forEach(drop => {
                drop.y += drop.ySpeed;
                drop.x += drop.xSpeed;

                // Reset raindrop if it goes off screen
                if (drop.y > canvas.height) {
                    drop.y = -drop.length;
                    drop.x = Math.random() * canvas.width;
                    drop.xSpeed = Math.random() * 2 - 1; // Re-randomize xSpeed when reset
                }

                // Draw raindrop as a line
                ctx.beginPath();
                ctx.moveTo(drop.x, drop.y);
                ctx.lineTo(drop.x, drop.y + drop.length);
                ctx.strokeStyle = `rgba(17,41,255,1)`; // Blue color with opacity
                ctx.lineWidth = 1;
                ctx.stroke();
            });

            requestAnimationFrame(animateRain);
        };

        animateRain();

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            // No need to explicitly clean up canvas 2d resources like in WebGL, but good practice to clear animation frame
            // (Although browser usually handles this when component unmounts)
            // cancelAnimationFrame(animationFrameId); // If you stored the animation frame ID, you could cancel it here.
        };

    }, []); // Empty dependency array for useEffect to run once on mount

    return (
        <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }} />
    ); // Correct return for AnimatedRainCanvasBackground
};


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
        }, 1000);
    }; // Closing brace for handleVerifyClick function is correctly placed here

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
        <>
            <AnimatedRainCanvasBackground /> {/* Render AnimatedRainCanvasBackground component here */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-8xl mb-5 text-blue-900">WATER KIOSK</p>
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
        </>
    );
}