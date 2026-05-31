// Coordinated drive + tube-spool motion.
// Board: Arduino Mega 2560.  Serial monitor @ 9600 baud.
//
// As the robot drives, the spool pays out / reels in tube at the same linear
// rate, so the tube never goes taut or piles up. The SPOOL is the master:
// a "drive N cm" command steps the spool the matching number of steps, and
// because stepping is blocking, that same interval is how long the wheels run.
// Tune the wheel PWM once so robot speed == spool pay-out rate, and every
// distance stays in sync.
//
//   backward  ->  spool turns "wind" direction (CW, by request)
//   forward   ->  spool turns the other way    (CCW)
// If the spool turns the wrong way for a given drive direction, send 'flip'.
//
// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
//   Drivetrain direction (L293D inputs):
//     L293D IN1 (pin 2)  -> Mega D2   left forward
//     L293D IN2 (pin 7)  -> Mega D3   left backward
//     L293D IN3 (pin 10) -> Mega D4   right forward
//     L293D IN4 (pin 15) -> Mega D5   right backward
//   Drivetrain speed (L293D enables -- REWIRED off the 5V rail onto PWM pins):
//     L293D EN1,2 (pin 1) -> Mega D6  (left speed,  analogWrite)
//     L293D EN3,4 (pin 9) -> Mega D7  (right speed, analogWrite)
//   Spool stepper (28BYJ-48 via ULN2003):
//     ULN2003 IN1 -> Mega D22,  IN2 -> D23,  IN3 -> D24,  IN4 -> D25
//     ULN2003 +   -> 5V rail,   - -> common ground
//   L293D VCC2 (pin 8) -> motor 5V rail; common ground throughout.

#include <Stepper.h>

// ---- Drivetrain ----
const int LEFT_FWD = 2, LEFT_BWD = 3, RIGHT_FWD = 4, RIGHT_BWD = 5;
const int LEFT_EN  = 6, RIGHT_EN = 7;   // PWM speed pins

// ---- Spool stepper (ULN2003) ----
const int IN1 = 22, IN2 = 23, IN3 = 24, IN4 = 25;
const int STEPS_PER_REV = 2048;         // 28BYJ-48 full-step w/ 1:64 gearbox

Stepper spool(STEPS_PER_REV, IN1, IN3, IN2, IN4);  // 28BYJ-48 coil order

// ---- Tunable coordination parameters (adjust live over serial) ----
float spoolDiameterCm = 11.0;   // effective Ø where tube wraps (10-12 cm)
int   spoolRpm        = 12;     // 28BYJ-48 stalls above ~15-17 RPM
int   wheelPwmLeft    = 75;     // 0-255; calibrated ~= pay-out rate (open-loop, approx)
int   wheelPwmRight   = 75;     // trim L/R independently to drive straight
int   spoolBackwardSign = -1;   // which step sign is "wind" on backward; 'flip's it

float stepsPerCm;               // derived from diameter, recomputed on change

void recompute() {
  stepsPerCm = STEPS_PER_REV / (PI * spoolDiameterCm);
}

// Tube pay-out rate at the current RPM/diameter, in cm/s (the target robot speed).
float payoutRate() {
  return (spoolRpm / 60.0) * PI * spoolDiameterCm;
}

void driveForward()  { digitalWrite(LEFT_FWD, HIGH); digitalWrite(LEFT_BWD, LOW);
                       digitalWrite(RIGHT_FWD, HIGH); digitalWrite(RIGHT_BWD, LOW); }
void driveBackward() { digitalWrite(LEFT_FWD, LOW);  digitalWrite(LEFT_BWD, HIGH);
                       digitalWrite(RIGHT_FWD, LOW); digitalWrite(RIGHT_BWD, HIGH); }
void wheelsOff() { analogWrite(LEFT_EN, 0); analogWrite(RIGHT_EN, 0);
                   digitalWrite(LEFT_FWD, LOW); digitalWrite(LEFT_BWD, LOW);
                   digitalWrite(RIGHT_FWD, LOW); digitalWrite(RIGHT_BWD, LOW); }
void spoolOff() { digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
                  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW); }

// Coordinated move: drive `cm` while paying the matching tube out/in.
void moveCoordinated(float cm, bool backward) {
  long steps = lround(cm * stepsPerCm);
  if (steps <= 0) { Serial.println(F("distance must be > 0")); return; }

  spool.setSpeed(spoolRpm);
  backward ? driveBackward() : driveForward();
  analogWrite(LEFT_EN,  wheelPwmLeft);
  analogWrite(RIGHT_EN, wheelPwmRight);

  Serial.print(F("moving ")); Serial.print(backward ? F("back ") : F("fwd "));
  Serial.print(cm, 1); Serial.print(F("cm = ")); Serial.print(steps);
  Serial.print(F(" steps @ ")); Serial.print(spoolRpm); Serial.println(F(" rpm"));

  // Blocking step IS the travel timer; wheels run on hardware PWM throughout.
  long dir = backward ? (spoolBackwardSign * steps) : (-spoolBackwardSign * steps);
  spool.step(dir);

  wheelsOff();
  spoolOff();
  Serial.println(F("done"));
}

// Spool only -- verify pay-out length / direction with no driving.
void spoolOnly(float cm, bool backward) {
  long steps = lround(cm * stepsPerCm);
  spool.setSpeed(spoolRpm);
  long dir = backward ? (spoolBackwardSign * steps) : (-spoolBackwardSign * steps);
  Serial.print(F("spool-only ")); Serial.print(steps); Serial.println(F(" steps"));
  spool.step(dir);
  spoolOff();
  Serial.println(F("done"));
}

// Wheels only, for the same duration a `cm` move would take -- drive it, then
// measure how far the robot actually rolled. If it matches `cm`, PWM is tuned.
void wheelsOnly(float cm, bool backward) {
  unsigned long ms = (unsigned long)(cm / payoutRate() * 1000.0);
  backward ? driveBackward() : driveForward();
  analogWrite(LEFT_EN, wheelPwmLeft);
  analogWrite(RIGHT_EN, wheelPwmRight);
  Serial.print(F("wheels-only ")); Serial.print(ms); Serial.println(F(" ms -- measure travel"));
  delay(ms);
  wheelsOff();
  Serial.println(F("done"));
}

void printStatus() {
  Serial.println(F("--- drive_spool ---"));
  Serial.print(F("spool dia=")); Serial.print(spoolDiameterCm, 1);
  Serial.print(F("cm  steps/cm=")); Serial.print(stepsPerCm, 1);
  Serial.print(F("  rpm=")); Serial.print(spoolRpm);
  Serial.print(F("  payout=")); Serial.print(payoutRate(), 1); Serial.println(F(" cm/s"));
  Serial.print(F("wheel pwm L=")); Serial.print(wheelPwmLeft);
  Serial.print(F(" R=")); Serial.print(wheelPwmRight);
  Serial.print(F("  spoolBackwardSign=")); Serial.println(spoolBackwardSign);
}

void printHelp() {
  Serial.println(F("Commands (serial @ 9600):"));
  Serial.println(F("  f <cm> / b <cm>   drive forward/back N cm, spool in sync"));
  Serial.println(F("  spool <cm>        spool only (check length/direction)"));
  Serial.println(F("  wheels <cm>       wheels only for the matched time (calibrate PWM)"));
  Serial.println(F("  pwm <L> <R>       set wheel PWM 0-255 (match speed / drive straight)"));
  Serial.println(F("  rpm <n>           set spool RPM (1..15 reliable)"));
  Serial.println(F("  dia <cm>          set spool effective diameter"));
  Serial.println(F("  flip              reverse spool direction vs drive direction"));
  Serial.println(F("  status / help"));
  Serial.println(F("Calibrate: 'wheels 30', measure travel; raise/lower pwm until ~30cm."));
}

void setup() {
  Serial.begin(9600);
  unsigned long t = millis();
  while (!Serial && millis() - t < 3000);

  pinMode(LEFT_FWD, OUTPUT); pinMode(LEFT_BWD, OUTPUT);
  pinMode(RIGHT_FWD, OUTPUT); pinMode(RIGHT_BWD, OUTPUT);
  pinMode(LEFT_EN, OUTPUT); pinMode(RIGHT_EN, OUTPUT);
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  wheelsOff();
  spoolOff();

  recompute();
  Serial.println(F("drive_spool ready (Mega 2560)."));
  printStatus();
  printHelp();
}

void loop() {
  if (!Serial.available()) return;

  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() == 0) return;

  // Split into command + up to two numeric args.
  String cmd = line, a1 = "", a2 = "";
  int s1 = line.indexOf(' ');
  if (s1 > 0) {
    cmd = line.substring(0, s1);
    String rest = line.substring(s1 + 1); rest.trim();
    int s2 = rest.indexOf(' ');
    if (s2 > 0) { a1 = rest.substring(0, s2); a2 = rest.substring(s2 + 1); a2.trim(); }
    else a1 = rest;
  }
  cmd.toLowerCase();

  if (cmd == "f" || cmd == "fwd")        moveCoordinated(a1.toFloat(), false);
  else if (cmd == "b" || cmd == "back")  moveCoordinated(a1.toFloat(), true);
  else if (cmd == "spool")               spoolOnly(a1.toFloat(), true);
  else if (cmd == "wheels")              wheelsOnly(a1.toFloat(), true);
  else if (cmd == "pwm") {
    wheelPwmLeft  = constrain(a1.toInt(), 0, 255);
    wheelPwmRight = constrain(a2.toInt(), 0, 255);
    Serial.print(F("pwm L=")); Serial.print(wheelPwmLeft);
    Serial.print(F(" R=")); Serial.println(wheelPwmRight);
  }
  else if (cmd == "rpm") { spoolRpm = constrain(a1.toInt(), 1, 17); printStatus(); }
  else if (cmd == "dia") { spoolDiameterCm = a1.toFloat(); recompute(); printStatus(); }
  else if (cmd == "flip") { spoolBackwardSign = -spoolBackwardSign; printStatus(); }
  else if (cmd == "status") printStatus();
  else if (cmd == "help" || cmd == "?") printHelp();
  else { Serial.print(F("unknown: ")); Serial.println(cmd); printHelp(); }
}
