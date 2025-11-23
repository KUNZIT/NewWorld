

# WATER KIOSK 

This is a Next.js application designed to communicate with the World Super Wallet app,

verifying if a user possesses the required orb verification level.

Upon successful verification, the application will operate Arduino microcontroller to switch on water pump motor. 

## Use cases 
Water distribution machine to provide water for verified unique human 

Visit
https://docs.google.com/presentation/d/1WlVzUMkRhP9nAike5jsqk_6oJ4VcdpBQQPlnX7_f3T0/edit?usp=drivesdk
https://youtube.com/shorts/b3y7G8OybpE?feature=share

https://new-world-j1t1.vercel.app/

## Environment Variables

This application requires the following environment variables:

-   `WORLD_ID_APP_ID`: Your World ID application ID.
-   `ACTION_NAME`: The specific action name used for verification.
-   `REDIS_URL`: The URL of your Redis database.

## Getting Started

Wiring:
*connect relay to Arduino Leonardo digital pin 2 ;
*connect Infrared sensor to the Arduino Leonardo digital pin 4

Upload this sketch code to the Arduino Leonardo microcontroller via the Arduino IDE


###cpp
// Arduino Leonardo WebUSB Relay Control Sketch with Auto-Timer and Button Input
const int RELAY_PIN = 2; // Connect relay to digital pin 2
const int BUTTON_PIN = 4; // Connect physical button (input) to digital pin 4

unsigned long relayStartTime = 0;
bool relayTimerActive = false;

// Variable to prevent sending the command repeatedly while the button is held down.
// We want to send the command only on the initial press (rising edge).
bool commandSentOnPress = false;

void setup() {
  Serial.begin(9600);
  
  // Setup RELAY pin
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Start with relay OFF
  
  // Setup onboard LED
  pinMode(LED_BUILTIN, OUTPUT);

  // Setup BUTTON pin using the internal PULLUP resistor.
  // CRITICAL: The button must now be wired between pin 4 and GND.
  // The pin will read LOW when pressed.
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  Serial.println("Relay Controller Ready!");
}

void loop() {
  // --- Existing Serial Command Processing (App to Arduino) ---
  if (Serial.available()) {
    String command = Serial.readString();
    command.trim();
    
    if (command == "RELAY_ON") {
      digitalWrite(RELAY_PIN, HIGH);
      digitalWrite(LED_BUILTIN, HIGH);
      relayStartTime = millis(); // Start timer
      relayTimerActive = true;
      Serial.println("RELAY_ON_OK");
    }
  }
  
  // --- Existing Relay Auto-Off Logic ---
  // If the timer is active and 2000ms (2 seconds) have passed
  if (relayTimerActive && (millis() - relayStartTime >= 4000)) {
    digitalWrite(RELAY_PIN, LOW);
    digitalWrite(LED_BUILTIN, LOW);
    relayTimerActive = false;
    Serial.println("RELAY_AUTO_OFF");
  }

  // --- NEW Button Monitoring Logic (Arduino to App) ---
  int buttonState = digitalRead(BUTTON_PIN);

  // Check if the button is currently pressed (LOW, because of PULLUP)
  if (buttonState == LOW) {
    if (!commandSentOnPress) {
      // Button is pressed (LOW), and we haven't sent the command yet in this press cycle.
      // Send a unique command that your web app will listen for.
      Serial.println("BUTTON_4_PRESSED");
      
      // Set the flag to true so the command isn't sent again until the button is released (HIGH).
      commandSentOnPress = true;
    }
  } else {
    // Button is not pressed (HIGH). Reset the flag.
    commandSentOnPress = false;
  }
  
  // A small delay to keep the loop from spinning too fast
  delay(5);
}


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


