// Drivetrain bring-up test -- wheels only, no arm/pump wired yet.
// Board: Arduino Mega 2560.  Serial monitor @ 9600 baud.
//
// 4x TT gear motors, tank/skid steer through an L293D dual H-bridge.
// Left wheels are spliced in parallel; right wheels are spliced in parallel.
//
// Wiring (L293D dual H-bridge):
//   L293D pin 1  (EN1,2)  -> 5V logic rail        (channel always enabled)
//   L293D pin 9  (EN3,4)  -> 5V logic rail        (channel always enabled)
//   L293D pin 16 (VCC1)   -> 5V logic rail
//   L293D pin 8  (VCC2)   -> 5V MOTOR rail        (Elegoo MB-102 module)
//   L293D pins 4,5,12,13  -> GND rail
//   L293D pin 2  (IN1)    -> Mega D2   left forward
//   L293D pin 7  (IN2)    -> Mega D3   left backward
//   L293D pin 10 (IN3)    -> Mega D4   right forward
//   L293D pin 15 (IN4)    -> Mega D5   right backward
//   L293D out 1,2 (pins 3,6)   -> left motor pair
//   L293D out 3,4 (pins 11,14) -> right motor pair
//
// REQUIRED: tie the Mega GND to the Elegoo module GND (common ground), or the
// motor logic levels mean nothing and the wheels will ignore the code.

const int LEFT_FWD  = 2;
const int LEFT_BWD  = 3;
const int RIGHT_FWD = 4;
const int RIGHT_BWD = 5;

// Per-side drive helpers. dir: +1 forward, -1 backward, 0 stop.
void driveLeftSide(int dir) {
  digitalWrite(LEFT_FWD, dir > 0 ? HIGH : LOW);
  digitalWrite(LEFT_BWD, dir < 0 ? HIGH : LOW);
}

void driveRightSide(int dir) {
  digitalWrite(RIGHT_FWD, dir > 0 ? HIGH : LOW);
  digitalWrite(RIGHT_BWD, dir < 0 ? HIGH : LOW);
}

void stopAll() {
  driveLeftSide(0);
  driveRightSide(0);
}

// Drive both sides for a fractional number of seconds, then stop.
void driveTimed(int dir, float seconds, const char* label) {
  if (seconds <= 0) {
    Serial.println(F("usage: 'f <seconds>' / 'b <seconds>', e.g. 'f 2.5'"));
    return;
  }
  Serial.print(label);
  Serial.print(F(" for "));
  Serial.print(seconds, 2);
  Serial.println(F("s"));
  driveLeftSide(dir);
  driveRightSide(dir);
  delay((unsigned long)(seconds * 1000.0));
  stopAll();
  Serial.println(F("stop"));
}

void printHelp() {
  Serial.println(F("Drivetrain test commands:"));
  Serial.println(F("  f  forward      b  backward    (latch until 's')"));
  Serial.println(F("  f <sec>  forward for N seconds, then stop (e.g. 'f 2.5')"));
  Serial.println(F("  b <sec>  backward for N seconds, then stop"));
  Serial.println(F("  l  spin left    r  spin right"));
  Serial.println(F("  s  stop"));
  Serial.println(F("  1  LEFT side forward only   (polarity check)"));
  Serial.println(F("  2  RIGHT side forward only  (polarity check)"));
  Serial.println(F("  t  timed self-test: fwd 2s, stop, reverse 2s, stop"));
  Serial.println(F("Commands latch -- send 's' to stop."));
}

void setup() {
  Serial.begin(9600);
  unsigned long t = millis();
  while (!Serial && millis() - t < 3000);

  pinMode(LEFT_FWD, OUTPUT);
  pinMode(LEFT_BWD, OUTPUT);
  pinMode(RIGHT_FWD, OUTPUT);
  pinMode(RIGHT_BWD, OUTPUT);
  stopAll();

  Serial.println(F("Drivetrain test ready (Mega 2560)."));
  printHelp();
}

void selfTest() {
  Serial.println(F("self-test: forward 2s"));
  driveLeftSide(1); driveRightSide(1);
  delay(2000);
  Serial.println(F("self-test: stop 1s"));
  stopAll();
  delay(1000);
  Serial.println(F("self-test: reverse 2s"));
  driveLeftSide(-1); driveRightSide(-1);
  delay(2000);
  Serial.println(F("self-test: stop"));
  stopAll();
}

void loop() {
  if (!Serial.available()) return;

  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() == 0) return;

  // Split into command char and an optional numeric argument (e.g. "f 2.5").
  String arg = "";
  int sp = line.indexOf(' ');
  if (sp > 0) {
    arg = line.substring(sp + 1);
    arg.trim();
  }
  char c = line.charAt(0);
  float secs = arg.toFloat();  // 0.0 when no/invalid argument

  switch (c) {
    case 'f':
      if (arg.length()) driveTimed(1, secs, "forward");
      else { driveLeftSide(1);  driveRightSide(1);  Serial.println(F("forward")); }
      break;
    case 'b':
      if (arg.length()) driveTimed(-1, secs, "backward");
      else { driveLeftSide(-1); driveRightSide(-1); Serial.println(F("backward")); }
      break;
    case 'l': driveLeftSide(-1); driveRightSide(1);  Serial.println(F("spin left")); break;
    case 'r': driveLeftSide(1);  driveRightSide(-1); Serial.println(F("spin right")); break;
    case 's': stopAll();                             Serial.println(F("stop")); break;
    case '1': driveLeftSide(1);  driveRightSide(0);  Serial.println(F("LEFT side forward")); break;
    case '2': driveLeftSide(0);  driveRightSide(1);  Serial.println(F("RIGHT side forward")); break;
    case 't': selfTest(); break;
    case '?':
    case 'h': printHelp(); break;
    default:
      Serial.print(F("unknown: ")); Serial.println(c);
      printHelp();
  }
}
