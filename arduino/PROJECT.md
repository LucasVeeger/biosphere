# Watering Robot — Project Progress

_Last updated: 2026-05-31_

Automated, mobile plant-watering robot: a 4-wheel chassis that drives along a
straight (1D) axis, pays a water tube off a spool as it moves, and (later) aims
an articulated arm and runs a pump. All control on an **Arduino Mega 2560**,
tethered to the PC over USB during development (`/dev/ttyUSB0`, CH340 clone).

---

## Current status at a glance

| Subsystem | Hardware | Pins | State |
|---|---|---|---|
| Drivetrain | 4× TT motors, L293D (tank/skid, used 1D) | dir D2–D5, PWM EN D6/D7 | ✅ drives fwd/back, straight |
| Spool stepper | 28BYJ-48 + ULN2003 | D22–D25 | ✅ winds/unwinds |
| Coordinated drive+spool | both of the above | — | 🔄 flashed, **PWM calibration in progress** |
| Arm stepper (2nd) | 28BYJ-48 + ULN2003 | D26–D29 (reserved) | ⬜ not wired |
| Water pump | 5V relay or PN2222 | TBD | ⬜ not wired |
| Limit switch (arm home) | SPDT, INPUT_PULLUP | TBD | ⬜ not wired |
| Mobile power | 18650 shield + bare cells | — | ⬜ cells ordered |

---

## Pin map (authoritative)

```
Drivetrain direction (L293D inputs):
  D2  left forward    (L293D IN1, pin 2)
  D3  left backward   (L293D IN2, pin 7)
  D4  right forward   (L293D IN3, pin 10)
  D5  right backward  (L293D IN4, pin 15)
Drivetrain speed (L293D enables — PWM):
  D6  left  (L293D EN1,2 pin 1)   <- rewired off 5V rail
  D7  right (L293D EN3,4 pin 9)   <- rewired off 5V rail
Spool stepper (ULN2003):  D22 D23 D24 D25
Arm stepper  (reserved):  D26 D27 D28 D29
```

Steppers live in the Mega's 2×18 block (22–53) so both ULN2003 cables sit side
by side. Drivetrain stays on the low PWM pins.

## Wiring notes

- **L293D:** VCC1 (pin 16) = logic 5V; VCC2 (pin 8) = motor 5V rail; GND pins
  4,5,12,13. Left motor pair on OUT1/OUT2 (pins 3,6), right on OUT3/OUT4 (11,14).
- **ULN2003:** `+` to 5V rail, `-` to common ground, IN1–4 are logic from Mega.
- **Common ground is mandatory** — Mega GND ↔ Elegoo/charger GND ↔ all driver
  GNDs, one continuous node. Heavy motor return should go straight to the supply
  GND, not through the logic stretch of rail (star-ground habit).

---

## Power (hard-won findings)

- **The 4 wheel motors dominate current**, not the steppers. Driving pulls
  ~1–2 A, turning would spike to ~4 A (we drive 1D / no turning, so peak is lower).
  A single 28BYJ-48 is only ~0.24 A.
- **The Elegoo MB-102 module cannot run the motors** — only a few hundred mA.
  Measured: rail **sags below 4.5 V** under motor load. Demoted to logic/3.3 V only.
- **A single stepper alone IS fine on the Elegoo** (~0.24 A) — that's how the spool
  was bench-tested.
- **Bench supply:** a 5 V / 3 A source feeding the motor rail. Note: a multi-voltage
  **PD/Quick-Charge** brick may NOT deliver its rated 5 V/3 A through a stripped
  cable — the high-current profile needs a data-line handshake the bare wires don't
  provide, so it current-limits and sags. Use a **plain USB-A 5 V/2.4A+ brick or a
  power bank** instead.
- **Final mobile supply:** the **18650 shield + 4 bare flat-top 18650 cells**
  (Samsung 30Q etc.) — regulated 5 V/3 A with onboard charging. _Cells ordered._
  - The RC 18650s already on hand (3.7 V, SM-2P connector, blue wrap, no exposed
    metal terminals) **do not fit the shield** — they connect only via their plug.
    Keep them for direct-wire use; don't cut into them.
- **Bulk cap:** a 470–1000 µF electrolytic across the motor rail smooths startup
  spikes (parallel several 100 µF kit caps if needed). Optional but recommended;
  doesn't fix sustained overload, only spikes.

---

## Coordinated drive + spool — the math

As the robot drives, the spool pays tube at the same linear rate.
**backward → spool winds (CW); forward → unwinds (CCW).**

- Spool effective Ø ≈ **11 cm** (range 10–12) → circumference π·11 ≈ **34.6 cm/rev**
- 28BYJ-48 = **2048 steps/rev** → **steps/cm = 2048 / (π·Ø)** ≈ **59** at Ø11
  (65 @ Ø10, 54 @ Ø12; effective Ø grows as tube layers build → err toward paying
  out slightly MORE so the tube goes slack, never taut).
- **Spool is the speed bottleneck:** max ~12–15 RPM → pay-out only **6.9–8.6 cm/s**.
  Wheels at full throttle are ~68 cm/s, so **wheels must be slowed via PWM** to match.
- **Control model:** spool is master/timekeeper. A `b 30` command steps the spool
  `30×59≈1770` steps (blocking) — that interval is also how long the wheels run.
  Tune wheel PWM once so robot speed == pay-out rate, then every distance auto-syncs.
- **Open risk:** ~6.9 cm/s is ~10% throttle, near the floor where TT motors stall.
  If they won't crawl: raise `rpm`, raise effective `dia`, or fall back to **pulsed
  wheel driving** (burst on/off, spool continuous) — to be added if needed.

### Calibration procedure (drive_spool sketch)
1. `spool 5` — check wind direction; `flip` if wrong.
2. `wheels 5` — check robot rolls back & straight; trim with `pwm <L> <R>`.
3. `wheels 30` — measure actual travel; raise/lower `pwm` until ~30 cm.
4. `b 30` — combined move; tube should stay lightly managed.

---

## Sketches (`arduino/`)

| Sketch | Purpose | State |
|---|---|---|
| `drivetrain_test/` | Wheels only; f/b/l/r/s + per-side polarity + timed `f <sec>` | ✅ tested |
| `stepper_control/` | Spool stepper (D22–25); r/f/b/speed/demo | ✅ tested |
| `drive_spool/` | **Coordinated drive+spool**; f/b/spool/wheels/pwm/rpm/dia/flip | 🔄 calibrating |
| `watering_robot/` | Integration: drive + arm stepper + pump relay | ⬜ arm still on old D8–11, **migrate to D26–29**; untested |
| `biosphere_sensor/` | (separate) WiFi soil-moisture sensor → sensor_service | pre-existing |

All sketches share the same conventions: top-of-file wiring map, `const int`
pins, `F()`-wrapped serial strings, interactive serial command loop @ 9600.

---

## Next steps
- [ ] Finish `drive_spool` PWM calibration; decide if pulsed-drive fallback is needed.
- [ ] Install bare 18650s in the shield; move motor rail to its 5 V/3 A output.
- [ ] Wire 2nd (arm) stepper to D26–D29; migrate `watering_robot.ino` arm pins 8–11 → 26–29.
- [ ] Pump relay integration (pick pin, low-side switch from a Mega pin).
- [ ] Arm homing routine against a limit switch (INPUT_PULLUP, drive to LOW = zero).
- [ ] Commit the `arduino/` sketches as the "coordinated motion working" checkpoint.

## Build / flash reference
```bash
arduino-cli compile --fqbn arduino:avr:mega arduino/<sketch>
arduino-cli upload  --fqbn arduino:avr:mega -p /dev/ttyUSB0 arduino/<sketch>
# Close the serial monitor before uploading — it holds the port and the flash fails.
# Reopen the monitor at 9600 baud to drive the sketch.
```
```
# CH340 clone board: if /dev/ttyUSB0 never appears, brltty is hijacking it:
sudo apt-get remove -y brltty   # then unplug/replug
```
```

