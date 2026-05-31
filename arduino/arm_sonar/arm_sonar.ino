// Watering arm (aims the tube) + HC-SR04 sonar (plant-in-range trigger).
// Board: Arduino Mega 2560.  Serial monitor @ 9600 baud.
//
// The arm is a 28BYJ-48 on a 2nd ULN2003; the sonar watches straight ahead and
// raises a "ready to water" flag whenever something sits within the threshold
// distance (a plant). Detection is edge-triggered so it only announces on the
// in-range / out-of-range transitions, not every reading. Later, the in-range
// flag will start the pump.
//
// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
//   Arm stepper (2nd ULN2003):
//     ULN2003 IN1 -> D26,  IN2 -> D27,  IN3 -> D28,  IN4 -> D29
//     ULN2003 +   -> 5V rail,  - -> common ground
//   HC-SR04 sonar (5V part; Echo connects directly to the 5V Mega):
//     VCC  -> 5V rail
//     Trig -> D30
//     Echo -> D31
//     GND  -> common ground

#include <Stepper.h>

// ---- Arm stepper ----
const int ARM_IN1 = 26, ARM_IN2 = 27, ARM_IN3 = 28, ARM_IN4 = 29;
const int STEPS_PER_REV = 2048;             // 28BYJ-48 full-step w/ 1:64 gearbox
const float STEPS_PER_DEG = STEPS_PER_REV / 360.0;

Stepper arm(STEPS_PER_REV, ARM_IN1, ARM_IN3, ARM_IN2, ARM_IN4);  // 28BYJ-48 order

// ---- Sonar ----
const int TRIG = 30, ECHO = 31;
const unsigned long ECHO_TIMEOUT_US = 30000UL;  // ~5 m max before giving up

// ---- Water pump (5V relay module) ----
const int  PUMP_RELAY = 32;
const bool RELAY_ACTIVE_LOW = false;  // this board energises on HIGH

// ---- Tunables ----
int   armRpm          = 12;     // 28BYJ-48 stalls above ~15-17 RPM
long  waterDistanceCm = 15;     // "in range" threshold
const int SWEEP_STEP_DEG = 5;   // sweep resolution between sonar reads

long  armPosition = 0;          // steps from power-on / last 'zero'
bool  wasInRange  = false;
bool  monitorOn   = false;      // continuous distance printing
unsigned long lastPing = 0;

bool pumpOn = false;

void armOff() {
  digitalWrite(ARM_IN1, LOW); digitalWrite(ARM_IN2, LOW);
  digitalWrite(ARM_IN3, LOW); digitalWrite(ARM_IN4, LOW);
}

void pumpWrite(bool on) {
  pumpOn = on;
  digitalWrite(PUMP_RELAY, (RELAY_ACTIVE_LOW ? !on : on) ? HIGH : LOW);
}

// Run the pump for a fractional number of seconds, then stop (blocking).
void water(float seconds) {
  if (seconds <= 0) { Serial.println(F("usage: water <seconds>")); return; }
  Serial.print(F("watering ")); Serial.print(seconds, 1); Serial.println(F("s"));
  pumpWrite(true);
  delay((unsigned long)(seconds * 1000.0));
  pumpWrite(false);
  Serial.println(F("pump off"));
}

// Single HC-SR04 reading in cm; returns -1 on no echo / timeout.
long readDistanceCm() {
  digitalWrite(TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  unsigned long dur = pulseIn(ECHO, HIGH, ECHO_TIMEOUT_US);
  if (dur == 0) return -1;
  return (long)(dur / 58);   // ~58 us per cm round-trip
}

// Move the arm a relative number of degrees (blocking).
void moveArmDeg(float deg) {
  long steps = lround(deg * STEPS_PER_DEG);
  arm.setSpeed(armRpm);
  arm.step(steps);
  armPosition += steps;
  armOff();
  Serial.print(F("arm @ ")); Serial.print(armPosition / STEPS_PER_DEG, 1);
  Serial.println(F(" deg"));
}

// Sweep up to `deg`, reading sonar each increment; stop + flag if a plant
// comes into range, otherwise complete the sweep.
void sweep(float deg) {
  long totalSteps = lround(fabs(deg) * STEPS_PER_DEG);
  long chunk = lround(SWEEP_STEP_DEG * STEPS_PER_DEG);
  int  dir = (deg < 0) ? -1 : 1;
  arm.setSpeed(armRpm);

  Serial.print(F("sweeping ")); Serial.print(deg, 0); Serial.println(F(" deg..."));
  long done = 0;
  while (done < totalSteps) {
    long thisChunk = min(chunk, totalSteps - done);
    arm.step(dir * thisChunk);
    armPosition += dir * thisChunk;
    done += thisChunk;
    armOff();

    long d = readDistanceCm();
    if (d > 0 && d <= waterDistanceCm) {
      Serial.print(F("PLANT IN RANGE at ")); Serial.print(d);
      Serial.print(F(" cm (arm ")); Serial.print(armPosition / STEPS_PER_DEG, 1);
      Serial.println(F(" deg) -- ready to water"));
      wasInRange = true;
      return;   // stop aimed at the plant
    }
  }
  Serial.println(F("sweep done -- no plant in range"));
}

// Background detection: edge-triggered in-range / out-of-range announcements.
void pollSonar() {
  if (millis() - lastPing < 200) return;
  lastPing = millis();

  long d = readDistanceCm();
  if (monitorOn) {
    Serial.print(F("dist: "));
    if (d < 0) Serial.println(F("--")); else { Serial.print(d); Serial.println(F(" cm")); }
  }

  bool inRange = (d > 0 && d <= waterDistanceCm);
  if (inRange && !wasInRange) {
    Serial.print(F("PLANT IN RANGE at ")); Serial.print(d);
    Serial.println(F(" cm -- ready to water"));
  } else if (!inRange && wasInRange) {
    Serial.println(F("out of range"));
  }
  wasInRange = inRange;
}

void printStatus() {
  Serial.print(F("arm=")); Serial.print(armPosition / STEPS_PER_DEG, 1);
  Serial.print(F("deg  rpm=")); Serial.print(armRpm);
  Serial.print(F("  threshold=")); Serial.print(waterDistanceCm);
  Serial.print(F("cm  monitor=")); Serial.println(monitorOn ? F("on") : F("off"));
}

void printHelp() {
  Serial.println(F("Commands (serial @ 9600):"));
  Serial.println(F("  arm <deg>     swing arm relative degrees (e.g. 'arm 30', 'arm -30')"));
  Serial.println(F("  sweep <deg>   sweep arm, stop + flag when a plant enters range"));
  Serial.println(F("  ping          single distance reading"));
  Serial.println(F("  pump on|off   switch the pump relay"));
  Serial.println(F("  water <sec>   run the pump for N seconds, then stop"));
  Serial.println(F("  thresh <cm>   set in-range threshold"));
  Serial.println(F("  rpm <n>       set arm speed (1..15 reliable)"));
  Serial.println(F("  monitor on|off  stream distance readings"));
  Serial.println(F("  zero          set current arm position as 0 deg"));
  Serial.println(F("  status / help"));
  Serial.println(F("Background: in-range is announced automatically on each transition."));
}

void setup() {
  Serial.begin(9600);
  unsigned long t = millis();
  while (!Serial && millis() - t < 3000);

  pinMode(ARM_IN1, OUTPUT); pinMode(ARM_IN2, OUTPUT);
  pinMode(ARM_IN3, OUTPUT); pinMode(ARM_IN4, OUTPUT);
  armOff();
  pinMode(TRIG, OUTPUT); digitalWrite(TRIG, LOW);
  pinMode(ECHO, INPUT);
  pinMode(PUMP_RELAY, OUTPUT); pumpWrite(false);

  Serial.println(F("arm_sonar ready (Mega 2560)."));
  printStatus();
  printHelp();
}

void loop() {
  pollSonar();

  if (!Serial.available()) return;
  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() == 0) return;

  String cmd = line, arg = "";
  int sp = line.indexOf(' ');
  if (sp > 0) { cmd = line.substring(0, sp); arg = line.substring(sp + 1); arg.trim(); }
  cmd.toLowerCase();

  if (cmd == "arm")           moveArmDeg(arg.toFloat());
  else if (cmd == "sweep")    sweep(arg.toFloat());
  else if (cmd == "ping") {
    long d = readDistanceCm();
    Serial.print(F("dist: "));
    if (d < 0) Serial.println(F("-- (no echo)")); else { Serial.print(d); Serial.println(F(" cm")); }
  }
  else if (cmd == "pump") {
    if (arg == "on")       { pumpWrite(true);  Serial.println(F("pump on")); }
    else if (arg == "off") { pumpWrite(false); Serial.println(F("pump off")); }
    else                     Serial.println(F("usage: pump on | pump off"));
  }
  else if (cmd == "water")  water(arg.toFloat());
  else if (cmd == "thresh") { waterDistanceCm = arg.toInt(); printStatus(); }
  else if (cmd == "rpm")    { armRpm = constrain(arg.toInt(), 1, 17); printStatus(); }
  else if (cmd == "monitor") { monitorOn = (arg == "on"); printStatus(); }
  else if (cmd == "zero")   { armPosition = 0; Serial.println(F("arm zeroed")); }
  else if (cmd == "status") printStatus();
  else if (cmd == "help" || cmd == "?") printHelp();
  else { Serial.print(F("unknown: ")); Serial.println(cmd); printHelp(); }
}
