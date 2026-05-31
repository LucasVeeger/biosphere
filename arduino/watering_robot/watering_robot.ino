// Plant-watering robot -- development sketch.
// Board: Arduino Mega 2560.
//
// This is a work-in-progress bring-up sketch that combines the three
// subsystems currently being prototyped, each driven over the serial
// monitor (9600 baud) so they can be exercised independently:
//
//   1. Drivetrain    -- 4x TT gear motors, tank/skid steer via an L293D.
//   2. Watering arm  -- 28BYJ-48 stepper on a ULN2003, homed to a limit switch.
//   3. Water pump     -- submersible pump switched by a 5V relay (or PN2222).
//
// ---------------------------------------------------------------------------
// Wiring -- Drivetrain (L293D dual H-bridge)
// ---------------------------------------------------------------------------
//   L293D pin 1  (EN1,2)  -> 5V logic rail        (channel always enabled)
//   L293D pin 9  (EN3,4)  -> 5V logic rail        (channel always enabled)
//   L293D pin 16 (VCC1)   -> 5V logic rail
//   L293D pin 8  (VCC2)   -> 5V MOTOR rail        (Elegoo MB-102 module)
//   L293D pins 4,5,12,13  -> GND rail
//   L293D pin 2  (IN1)    -> Mega D2   left forward
//   L293D pin 7  (IN2)    -> Mega D3   left backward
//   L293D pin 10 (IN3)    -> Mega D4   right forward
//   L293D pin 15 (IN4)    -> Mega D5   right backward
//   L293D out 1,2 (pins 3,6)   -> left motor pair  (both left wheels in parallel)
//   L293D out 3,4 (pins 11,14) -> right motor pair (both right wheels in parallel)
//
// ---------------------------------------------------------------------------
// Wiring -- Watering arm (28BYJ-48 via ULN2003)
// ---------------------------------------------------------------------------
//   ULN2003 IN1 -> Mega D8
//   ULN2003 IN2 -> Mega D9
//   ULN2003 IN3 -> Mega D10
//   ULN2003 IN4 -> Mega D11
//   ULN2003 +   -> 5V motor rail (Elegoo module)
//   ULN2003 -   -> GND rail
//   Limit switch (SPDT, NO + COM) -> Mega D6 and GND, using INPUT_PULLUP.
//     Switch open  => D6 reads HIGH.  Switch pressed => D6 reads LOW.
//
// ---------------------------------------------------------------------------
// Wiring -- Water pump (5V relay module, active-LOW is common on these boards)
// ---------------------------------------------------------------------------
//   Relay IN  -> Mega D12
//   Relay VCC -> 5V logic rail
//   Relay GND -> GND rail
//   Pump + and - switched through the relay COM/NO contacts, powered from the
//   motor rail (NOT the Arduino 5V -- the pump can pull far more than USB gives).
//
// IMPORTANT: all grounds are common. The Mega GND must be tied to the Elegoo
// module GND, or none of the motor logic levels make sense.

#include <Stepper.h>

// ---- Drivetrain pins (L293D inputs) ----
const int LEFT_FWD   = 2;
const int LEFT_BWD   = 3;
const int RIGHT_FWD  = 4;
const int RIGHT_BWD  = 5;

// ---- Watering arm (ULN2003) ----
// 28BYJ-48 coil order on the Stepper lib is IN1, IN3, IN2, IN4 (middle pair swapped).
const int ARM_IN1 = 8;
const int ARM_IN2 = 9;
const int ARM_IN3 = 10;
const int ARM_IN4 = 11;
const int LIMIT_SWITCH = 6;   // INPUT_PULLUP; LOW when pressed

const int STEPS_PER_REV = 2048;  // full-step with the internal 1:64 gearbox
const int ARM_RPM       = 12;    // 28BYJ-48 stalls above ~17 RPM
const int HOMING_NUDGE  = 16;    // steps per poll while seeking the switch
const long ARM_MAX_STEPS = 4L * STEPS_PER_REV;  // safety bound while homing

// ---- Water pump ----
const int PUMP_RELAY = 12;
const bool RELAY_ACTIVE_LOW = true;  // most blue 5V relay boards energise on LOW

Stepper arm(STEPS_PER_REV, ARM_IN1, ARM_IN3, ARM_IN2, ARM_IN4);

bool armHomed = false;
long armPosition = 0;   // steps from home; only meaningful once homed
bool pumpOn = false;

void driveStop() {
  digitalWrite(LEFT_FWD, LOW);
  digitalWrite(LEFT_BWD, LOW);
  digitalWrite(RIGHT_FWD, LOW);
  digitalWrite(RIGHT_BWD, LOW);
}

void driveForward() {
  digitalWrite(LEFT_FWD, HIGH);  digitalWrite(LEFT_BWD, LOW);
  digitalWrite(RIGHT_FWD, HIGH); digitalWrite(RIGHT_BWD, LOW);
}

void driveBackward() {
  digitalWrite(LEFT_FWD, LOW);  digitalWrite(LEFT_BWD, HIGH);
  digitalWrite(RIGHT_FWD, LOW); digitalWrite(RIGHT_BWD, HIGH);
}

void driveLeft() {  // spin in place: left back, right forward
  digitalWrite(LEFT_FWD, LOW);  digitalWrite(LEFT_BWD, HIGH);
  digitalWrite(RIGHT_FWD, HIGH); digitalWrite(RIGHT_BWD, LOW);
}

void driveRight() { // spin in place: left forward, right back
  digitalWrite(LEFT_FWD, HIGH); digitalWrite(LEFT_BWD, LOW);
  digitalWrite(RIGHT_FWD, LOW); digitalWrite(RIGHT_BWD, HIGH);
}

void armPowerDown() {
  digitalWrite(ARM_IN1, LOW);
  digitalWrite(ARM_IN2, LOW);
  digitalWrite(ARM_IN3, LOW);
  digitalWrite(ARM_IN4, LOW);
}

void pumpWrite(bool on) {
  pumpOn = on;
  bool level = RELAY_ACTIVE_LOW ? !on : on;
  digitalWrite(PUMP_RELAY, level ? HIGH : LOW);
}

// Drive the arm backward (negative) until the limit switch closes, then set
// that physical stop as coordinate zero.
bool homeArm() {
  Serial.println(F("homing arm: seeking limit switch..."));
  long traveled = 0;
  while (digitalRead(LIMIT_SWITCH) == HIGH) {
    if (traveled >= ARM_MAX_STEPS) {
      Serial.println(F("homing FAILED: switch not found within travel limit."));
      armPowerDown();
      return false;
    }
    arm.step(-HOMING_NUDGE);
    traveled += HOMING_NUDGE;
  }
  armPowerDown();
  armPosition = 0;
  armHomed = true;
  Serial.print(F("homed. switch hit after "));
  Serial.print(traveled);
  Serial.println(F(" steps; position = 0."));
  return true;
}

void moveArmTo(long target) {
  if (!armHomed) {
    Serial.println(F("arm not homed yet -- run 'home' first."));
    return;
  }
  if (target < 0) target = 0;
  if (target > ARM_MAX_STEPS) target = ARM_MAX_STEPS;
  long delta = target - armPosition;
  arm.step(delta);
  armPosition = target;
  armPowerDown();
  Serial.print(F("arm at step "));
  Serial.println(armPosition);
}

void printHelp() {
  Serial.println(F("Commands (serial @ 9600):"));
  Serial.println(F("  drivetrain:  f | b | l | r | s   (forward/back/left/right/stop)"));
  Serial.println(F("  arm:         home | arm <step>   (move to absolute step, 0..max)"));
  Serial.println(F("  pump:        pump on | pump off"));
  Serial.println(F("  help"));
  Serial.println(F("Drive commands latch -- send 's' to stop the wheels."));
}

void setup() {
  Serial.begin(9600);
  unsigned long t = millis();
  while (!Serial && millis() - t < 3000);

  pinMode(LEFT_FWD, OUTPUT);
  pinMode(LEFT_BWD, OUTPUT);
  pinMode(RIGHT_FWD, OUTPUT);
  pinMode(RIGHT_BWD, OUTPUT);
  driveStop();

  pinMode(ARM_IN1, OUTPUT);
  pinMode(ARM_IN2, OUTPUT);
  pinMode(ARM_IN3, OUTPUT);
  pinMode(ARM_IN4, OUTPUT);
  armPowerDown();
  arm.setSpeed(ARM_RPM);

  pinMode(LIMIT_SWITCH, INPUT_PULLUP);

  pinMode(PUMP_RELAY, OUTPUT);
  pumpWrite(false);

  Serial.println(F("Watering robot ready (Mega 2560)."));
  printHelp();
}

void runCommand(String line) {
  line.trim();
  if (line.length() == 0) return;

  String cmd = line;
  String arg = "";
  int sp = line.indexOf(' ');
  if (sp > 0) {
    cmd = line.substring(0, sp);
    arg = line.substring(sp + 1);
    arg.trim();
  }
  cmd.toLowerCase();

  if (cmd == "help" || cmd == "?") {
    printHelp();
  } else if (cmd == "f") {
    driveForward();  Serial.println(F("drive: forward"));
  } else if (cmd == "b") {
    driveBackward(); Serial.println(F("drive: backward"));
  } else if (cmd == "l") {
    driveLeft();     Serial.println(F("drive: left"));
  } else if (cmd == "r") {
    driveRight();    Serial.println(F("drive: right"));
  } else if (cmd == "s") {
    driveStop();     Serial.println(F("drive: stop"));
  } else if (cmd == "home") {
    homeArm();
  } else if (cmd == "arm") {
    moveArmTo(arg.toInt());
  } else if (cmd == "pump") {
    arg.toLowerCase();
    if (arg == "on")       { pumpWrite(true);  Serial.println(F("pump: on")); }
    else if (arg == "off") { pumpWrite(false); Serial.println(F("pump: off")); }
    else                     Serial.println(F("usage: pump on | pump off"));
  } else {
    Serial.print(F("unknown command: "));
    Serial.println(cmd);
    printHelp();
  }
}

void loop() {
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    runCommand(line);
  }
}
