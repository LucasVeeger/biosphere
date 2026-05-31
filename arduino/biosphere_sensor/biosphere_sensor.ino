#include <WiFiS3.h>
#include <ArduinoHttpClient.h>

const char* WIFI_SSID = "KadeKonnect";
const char* WIFI_PASS = "Matrozen!";

const char* SENSOR_SERVICE_HOST = "192.168.2.12";
const int   SENSOR_SERVICE_PORT = 8081;

const int RAW_WET = 142;
const int RAW_DRY = 473;

const unsigned long POST_INTERVAL_MS = 60000;

struct Sensor {
  const char* id;
  int         pin;
};

const Sensor SENSORS[] = {
  { "dc960af6-3068-4a5f-8313-2510a94865d1", A0 },
  { "92b2b151-6b22-4242-99b2-0cbf77a3285b", A1 },
  { "0f5f566a-a78b-4574-8450-ed91ccac1756", A2 },
  { "224c1558-2eee-47de-bb3d-ad2471bab328", A3 },
  { "38a32ce9-4b9d-4d2a-bef7-af409e172cf5", A4 },
  { "d984374d-2a4c-490f-bb83-60e8c6475bef", A5 },
};

const int NUM_SENSORS = sizeof(SENSORS) / sizeof(SENSORS[0]);

WiFiClient wifi;
HttpClient  client = HttpClient(wifi, SENSOR_SERVICE_HOST, SENSOR_SERVICE_PORT);

unsigned long lastPost = 0;

float moisturePercent(int raw) {
  float pct = 100.0 - ((float)(raw - RAW_WET) / (RAW_DRY - RAW_WET)) * 100.0;
  if (pct < 0)   pct = 0;
  if (pct > 100) pct = 100;
  return pct;
}

void postReading(const char* sensorId, int raw, float pct) {
  String body = "{\"sensor_id\":\"";
  body += sensorId;
  body += "\",\"value\":";
  body += String(pct, 2);
  body += ",\"unit\":\"percent\",\"raw\":";
  body += raw;
  body += "}";

  client.beginRequest();
  client.post("/ingest");
  client.sendHeader("Content-Type", "application/json");
  client.sendHeader("Content-Length", body.length());
  client.beginBody();
  client.print(body);
  client.endRequest();

  int status = client.responseStatusCode();
  Serial.print("  POST /ingest -> ");
  Serial.println(status);
}

void setup() {
  Serial.begin(9600);
  unsigned long t = millis();
  while (!Serial && millis() - t < 3000);

  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  delay(1000);
  Serial.println(" connected.");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  bool shouldPost = millis() - lastPost >= POST_INTERVAL_MS;
  if (shouldPost) lastPost = millis();

  for (int i = 0; i < NUM_SENSORS; i++) {
    int   raw = analogRead(SENSORS[i].pin);
    float pct = moisturePercent(raw);

    Serial.print("A");
    Serial.print(i);
    Serial.print(": raw=");
    Serial.print(raw);
    Serial.print("  moisture=");
    Serial.print(pct, 1);
    Serial.println("%");

    if (shouldPost) {
      Serial.print("  posting raw=");
      Serial.print(raw);
      Serial.print(" pct=");
      Serial.println(pct, 1);
      postReading(SENSORS[i].id, raw, pct);
    }
  }

  delay(1000);
}
