// 28BYJ-48 stepper motor driven by a ULN2003 board.
// Used here as the water-tube SPOOL winder (forward winds, backward unwinds).
//
// Pins live in the Mega's 2x18 digital block (22-53), so both steppers can sit
// side by side: this spool stepper on 22-25, the arm stepper reserved for 26-29.
//
// Wiring:
//   ULN2003 IN1 -> Mega D22
//   ULN2003 IN2 -> Mega D23
//   ULN2003 IN3 -> Mega D24
//   ULN2003 IN4 -> Mega D25
//   ULN2003 +   -> 5V from the Elegoo MB-102 power supply module (jumper on 5V)
//   ULN2003 -   -> GND, AND tie that GND to the Arduino GND (shared ground required)
//   Motor 5-pin connector -> ULN2003 white socket
//
// The built-in Stepper library wants the coil-firing order, which on
// 28BYJ-48 is IN1, IN3, IN2, IN4 -- note the swapped middle pair.

#include <Stepper.h>

const int IN1 = 22;
const int IN2 = 23;
const int IN3 = 24;
const int IN4 = 25;

const int STEPS_PER_REV = 2048;  // 28BYJ-48 full-step with internal 1:64 gearing
const unsigned long DEMO_PAUSE_MS = 800;
const int DEFAULT_RPM = 12;      // 28BYJ-48 starts stalling above ~17 RPM

Stepper motor(STEPS_PER_REV, IN1, IN3, IN2, IN4);

bool demoRunning = true;
int  demoDirection = 1;
unsigned long demoNextChange = 0;

void powerDownCoils() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
}

void printHelp() {
  Serial.println(F("Commands:"));
  Serial.println(F("  f <steps>   step forward N steps  (e.g. 'f 512')"));
  Serial.println(F("  b <steps>   step backward N steps"));
  Serial.println(F("  r <rev>     rotate N revolutions  (fractional and negative ok, e.g. 'r -0.5')"));
  Serial.println(F("  speed <rpm> set speed in RPM  (1..17 reliable on 28BYJ-48)"));
  Serial.println(F("  demo        restart the auto fwd/back demo"));
  Serial.println(F("  stop        stop the demo"));
  Serial.println(F("  help        show this list"));
  Serial.println(F("Note: stepping is blocking, so new commands are read only between moves."));
}

void setup() {
  Serial.begin(9600);
  unsigned long t = millis();
  while (!Serial && millis() - t < 3000);

  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  powerDownCoils();

  motor.setSpeed(DEFAULT_RPM);

  Serial.println(F("Stepper ready (28BYJ-48 via ULN2003)."));
  printHelp();
  demoNextChange = millis();
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
  } else if (cmd == "demo") {
    demoRunning = true;
    demoNextChange = millis();
    Serial.println(F("demo on"));
  } else if (cmd == "stop") {
    demoRunning = false;
    powerDownCoils();
    Serial.println(F("demo off"));
  } else if (cmd == "speed") {
    int rpm = arg.toInt();
    if (rpm <= 0) rpm = 1;
    motor.setSpeed(rpm);
    Serial.print(F("speed=")); Serial.println(rpm);
  } else if (cmd == "f" || cmd == "b") {
    long steps = arg.toInt();
    if (cmd == "b") steps = -steps;
    demoRunning = false;
    Serial.print(F("stepping ")); Serial.println(steps);
    motor.step(steps);
    powerDownCoils();
  } else if (cmd == "r") {
    float rev = arg.toFloat();
    long steps = (long)(rev * STEPS_PER_REV);
    demoRunning = false;
    Serial.print(F("revolutions=")); Serial.print(rev);
    Serial.print(F(" steps=")); Serial.println(steps);
    motor.step(steps);
    powerDownCoils();
  } else {
    Serial.print(F("unknown command: ")); Serial.println(cmd);
    printHelp();
  }
}

void loop() {
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    runCommand(line);
  }

  if (demoRunning && millis() >= demoNextChange) {
    Serial.print(F("demo: one revolution, direction="));
    Serial.println(demoDirection);
    motor.step(demoDirection * STEPS_PER_REV);
    powerDownCoils();
    demoDirection = -demoDirection;
    demoNextChange = millis() + DEMO_PAUSE_MS;
  }
}
