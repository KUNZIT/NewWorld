"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "./button"
import { AlertCircle } from "lucide-react"


import { VerificationLevel, IDKitWidget, useIDKit } from "@worldcoin/idkit"
import type { ISuccessResult } from "@worldcoin/idkit"
import { verify } from "./actions/verify"
import Image from 'next/image'
import React from 'react'

// This component provides a background of animated rain drops using HTML canvas.
const AnimatedRainCanvasBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rainDrops = 300 // Number of raindrops
  const rainArray: {
    x: number
    y: number
    length: number
    opacity: number
    xSpeed: number
    ySpeed: number
  }[] = [] // Explicitly type rainArray

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return // Exit if context is not available

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Initialize rain drops
    for (let i = 0; i < rainDrops; i++) {
      rainArray.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        length: Math.random() * 10 + 5, // Length of raindrop
        opacity: Math.random() * 0.5 + 0.5, // Opacity for depth effect
        xSpeed: Math.random() * 2 - 1, // Slight horizontal movement
        ySpeed: Math.random() * 7 + 5, // Vertical speed
      })
    }

    const animateRain = () => {
      if (!ctx) return // Check context again in animation loop
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)' // Very light black with alpha (adjust alpha for fade speed)
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      rainArray.forEach(drop => {
        drop.y += drop.ySpeed
        drop.x += drop.xSpeed

        // Reset raindrop if it goes off screen
        if (drop.y > canvas.height) {
          drop.y = -drop.length
          drop.x = Math.random() * canvas.width
          drop.xSpeed = Math.random() * 2 - 1 // Re-randomize xSpeed when reset
        }

        // Draw raindrop as a line
        ctx.beginPath()
        ctx.moveTo(drop.x, drop.y)
        ctx.lineTo(drop.x, drop.y + drop.length)
        ctx.strokeStyle = `rgba(17,41,255,1)` // Blue color with opacity
        ctx.lineWidth = 1
        ctx.stroke()
      })

      requestAnimationFrame(animateRain)
    }

    animateRain()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }} />
  )
}

export default function Home() {
  // World ID and Timer state
  const [timer, setTimer] = useState(15)
  const [timerRunning, setTimerRunning] = useState(false)
  const [buttonDisabled, setButtonDisabled] = useState(false)

  // Ref for the World ID button to allow programmatic clicking
  const worldIdButtonRef = useRef<HTMLButtonElement>(null)

  // Arduino Controller state
  const [port, setPort] = useState<SerialPort | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [relayState, setRelayState] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reader, setReader] = useState<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const [writer, setWriter] = useState<WritableStreamDefaultWriter<Uint8Array> | null>(null)
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false)
  const [needsPermission, setNeedsPermission] = useState(false)

  // Arduino Controller logic
  const ARDUINO_LEONARDO_FILTERS = [
    { usbVendorId: 0x2341, usbProductId: 0x8036 },
    { usbVendorId: 0x2341, usbProductId: 0x0036 },
  ]

  const connectToArduino = useCallback(async (autoConnect = false) => {
    try {
      setIsLoading(true)
      setError(null)
      setNeedsPermission(false)

      if (!navigator.serial) {
        throw new Error("Web Serial API is not supported in this browser. Please use Chrome 89+ or Edge 89+")
      }

      let selectedPort: SerialPort

      if (autoConnect) {
        const ports = await navigator.serial.getPorts()
        const arduinoPort = ports.find((p) => {
          const info = p.getInfo()
          return ARDUINO_LEONARDO_FILTERS.some(
            (filter) => info.usbVendorId === filter.usbVendorId && info.usbProductId === filter.usbProductId,
          )
        })

        if (!arduinoPort) {
          console.log("[v0] No previously authorized Arduino Leonardo found for auto-connect")
          setNeedsPermission(true)
          return
        }
        selectedPort = arduinoPort
      } else {
        selectedPort = await navigator.serial.requestPort({
          filters: ARDUINO_LEONARDO_FILTERS,
        })
      }

      await selectedPort.open({ baudRate: 9600 });

      const portReader = selectedPort.readable?.getReader();
      const portWriter = selectedPort.writable?.getWriter();

      if (!portReader || !portWriter) {
        throw new Error("Failed to get serial port reader/writer")
      }

      setPort(selectedPort)
      setReader(portReader)
      setWriter(portWriter)
      setIsConnected(true)

      console.log("[v0] Arduino Leonardo connected via Web Serial API")

      setTimeout(async () => {
        try {
          await sendCommand("STATUS")
        } catch (testError) {
          console.log("[v0] Initial status check failed:", testError)
        }
      }, 1000)
    } catch (err) {
      if (!autoConnect) {
        setError(err instanceof Error ? err.message : "Failed to connect to Arduino")
      }
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const disconnectFromArduino = useCallback(async () => {
    if (port) {
      try {
        if (reader) {
          await reader.cancel()
          await reader.releaseLock()
          setReader(null)
        }
        if (writer) {
          await writer.close()
          setWriter(null)
        }
        await port.close()
      } catch (err) {
        console.error("Error disconnecting:", err)
      }
      setPort(null)
      setIsConnected(false)
      setRelayState(false)
      setAutoConnectAttempted(false)
    }
  }, [port, reader, writer])

  const sendCommand = useCallback(
    async (command: string) => {
      if (!port || !writer || !isConnected) {
        setError("Arduino not connected")
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        console.log(`[v0] Sending command: ${command}`)

        const encoder = new TextEncoder()
        const data = encoder.encode(command + "\n")

        await writer.write(data)
        console.log(`[v0] Command sent via Web Serial:`, command)
      } catch (err) {
        setIsConnected(false)
        setError(err instanceof Error ? err.message : "Failed to send command")
        console.error("[v0] Send command error:", err)
      } finally {
        setIsLoading(false)
      }
    },
    [port, writer, isConnected],
  )

  const operateRelay = useCallback(async () => {
    await sendCommand("RELAY_ON")
  }, [sendCommand])

  // World ID logic
  const app_id = process.env.NEXT_PUBLIC_WLD_APP_ID as `app_${string}`
  const action = process.env.NEXT_PUBLIC_WLD_ACTION

  const handleVerifyClick = () => {
    setOpen(true)
    document.body.classList.add('disable-interaction')
    setTimerRunning(true)
    setButtonDisabled(true)
    let timeLeft = timer

    const interval = setInterval(() => {
      timeLeft--
      setTimer(timeLeft)

      if (timeLeft < 0) {
        clearInterval(interval)
        console.log("Timer finished. Reloading the page...")
        window.location.reload()
      }
    }, 1400)
  }

  if (!app_id) {
    throw new Error("app_id is not set in environment variables!")
  }
  if (!action) {
    throw new Error("action is not set in environment variables!")
  }

  const { setOpen } = useIDKit()

  const onSuccess = (result: ISuccessResult) => {
    // Play a short beep sound
    const audio = new Audio('/beep.mp3')
    audio.play()
    // Trigger the relay operation
    operateRelay()
    console.log(
      "Successfully verified with World ID! Your nullifier hash is: " +
      result.nullifier_hash
    )
  }

  const handleProof = async (result: ISuccessResult) => {
    console.log(
      "Proof received from IDKit, sending to backend:\n",
      JSON.stringify(result)
    )
    const data = await verify(result)
    if (data.success) {
      console.log("Successful response from backend:\n", JSON.stringify(data))
    } else {
      throw new Error(`${data.detail}`)
    }
  }

  // Effect to continuously read serial data from the Arduino
  useEffect(() => {
    let loop = true;

    const readSerialData = async () => {
        if (!reader) return;

        const decoder = new TextDecoder();
        
        try {
            while (loop) {
                const { value, done } = await reader.read();
                if (done) {
                    console.log("[v0] Reader cancelled or closed.");
                    break;
                }
                
                const text = decoder.decode(value);
                const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

                for (const line of lines) {
                    console.log(`[v0] Received: ${line}`);

                    // Handle existing commands
                    if (line === "RELAY_ON_OK") {
                        setRelayState(true);
                    } else if (line === "RELAY_AUTO_OFF") {
                        setRelayState(false);
                    } 
                    
                    // --- NEW COMMAND HANDLING: PUSH BUTTON ---
                    else if (line === "BUTTON_4_PRESSED") {
                        console.log("[v0] External button pressed! Triggering World ID verification.");
                        
                        // Programmatically click the World ID button if it's not already disabled
                        if (worldIdButtonRef.current && !buttonDisabled) {
                            worldIdButtonRef.current.click();
                        } else {
                            console.log("[v0] World ID button is already disabled or not ready. Ignoring press.");
                        }
                    }
                }
            }
        } catch (error) {
            console.error("[v0] Serial read error:", error);
            // Re-release the lock if an error occurs to allow re-connection later
            if (reader) reader.releaseLock();
        }
    };

    if (isConnected && reader) {
        readSerialData();
    }

    return () => {
        loop = false; // Stop the while loop if the component unmounts or dependencies change
    };
  }, [isConnected, reader, setRelayState, buttonDisabled])

  // Effect to handle initial auto-connect attempt and disconnections
  useEffect(() => {
    const attemptAutoConnect = async () => {
      if (!autoConnectAttempted && navigator.serial) {
        setAutoConnectAttempted(true)
        console.log("[v0] Attempting auto-connect to Arduino...")
        await connectToArduino(true)
      }
    }

    const handleDisconnect = (event: Event) => {
      console.log("[v0] Serial port disconnected")
      setPort(null)
      setIsConnected(false)
      setRelayState(false)
      setReader(null)
      setWriter(null)
      setAutoConnectAttempted(false)
      setTimeout(() => {
        connectToArduino(true)
      }, 1000)
    }

    if (navigator.serial) {
      attemptAutoConnect()
      navigator.serial.addEventListener("disconnect", handleDisconnect)
      return () => {
        navigator.serial.removeEventListener("disconnect", handleDisconnect)
      }
    }
  }, [connectToArduino, autoConnectAttempted])

  const isWebSerialSupported = typeof navigator !== "undefined" && "serial" in navigator

  if (!isWebSerialSupported) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md p-6 bg-card rounded-lg border">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h2 className="text-lg font-semibold">Web Serial Not Supported</h2>
          </div>
          <p className="text-muted-foreground">
            Your browser doesn't support Web Serial API. Please use Chrome 89+, Edge 89+, or another Chromium-based
            browser.
          </p>
        </div>
      </div>
    )
  }

const isButtonHidden = true; // Set to 'false' to show the button
  
  return (
    <>
      <AnimatedRainCanvasBackground />
      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6">
        <p className="text-8xl mb-5 text-blue-900">WATER</p>

        {/* Arduino Controller Buttons */}
<div className="flex flex-col space-y-4 items-center">
  {/* Use && so that if the condition is false, nothing renders */}
  {needsPermission && !isConnected && (
    <Button
      onClick={() => connectToArduino(false)}
      disabled={isLoading}
      className="bg-black hover:bg-gray-800 text-white px-8 py-2"
    >
      {isLoading ? "Connecting..." : "Grant Connection"}
    </Button>
  )}
          <Button
            onClick={operateRelay}
            disabled={!isConnected || isLoading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 text-lg"
            size="lg"
            style={{ visibility: isButtonHidden ? "hidden" : "visible" }}
            >
            {isLoading ? "Operating..." : "Operate Relay"}
          </Button>
        </div>

        {/* World ID Widget and Button */}
        <IDKitWidget
          action={action}
          app_id={app_id}
          onSuccess={onSuccess}
          handleVerify={handleProof}
          verification_level={VerificationLevel.Orb}
        />
        <button
          className="border border-white bg-black text-white rounded-md px-4 py-2 text-lg hover:bg-blue-800"
          onClick={handleVerifyClick}
          disabled={buttonDisabled}
          ref={worldIdButtonRef} // <-- This ref is used by the new serial reader logic
        >
          <div className="mx-3 my-1">Verify with World ID</div>
        </button>

        {/* Timer display */}
        {timerRunning && (
          <div className="timer-display text-white">
            Time remaining: {timer} seconds
          </div>
        )}
      </div>
    </>
  )
}
