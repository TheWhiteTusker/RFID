// Lattice Lane RFID kiosk — multiple RC522 readers on one ESP32-S3.
// Tap a tag on any reader -> the shell page at http://<esp-ip>/ swaps its iframe
// to that product's URL. Serving the shell ourselves means no CORS anywhere.
//
// Library: "MFRC522" by GithubCommunity / miguelbalboa (Library Manager).
//
// Wiring — every reader SHARES the bus, only SS differs:
//   SCK -> 12   MISO -> 13   MOSI -> 11   RST -> 10   3.3V   GND   (all readers)
//   SS/SDA -> one pin per reader, from SS_PINS below.
//
// RC522 is 3.3 V ONLY. 5 V kills it.
// Free GPIOs on ESP32-S3: 1-21 minus the pins above. Do NOT use 26-32 (flash/PSRAM),
// 33-37 (octal PSRAM on N8R8/N16R8 boards), 19/20 (native USB), or 0/3/45/46 (strapping).
// GPIO 22-25 do not exist on the S3 at all.

#include <WiFi.h>
#include <WebServer.h>
#include <SPI.h>
#include <MFRC522.h>
#include "secrets.h"   // WIFI_SSID / WIFI_PASS - gitignored
#include "page.h"      // KIOSK_PAGE

// One entry per reader. Add or remove freely — everything else adapts.
const byte SS_PINS[] = {4, 5, 6, 7};
#define RST_PIN  10
#define SCK_PIN  12
#define MISO_PIN 13
#define MOSI_PIN 11

const byte N_READERS = sizeof(SS_PINS);
MFRC522 rfid[N_READERS];
WebServer server(80);

String currentURL = "";
unsigned long reads = 0;   // bumps on every accepted tap, so a re-tap always reloads

String getUID(MFRC522 &r) {

  String uid = "";

  for (byte i = 0; i < r.uid.size; i++) {   // 4 bytes on MIFARE Classic, 7 on NTAG215

    if (r.uid.uidByte[i] < 0x10) {
      uid += "0";
    }

    uid += String(r.uid.uidByte[i], HEX);

    if (i < r.uid.size - 1) {
      uid += ":";
    }
  }

  uid.toUpperCase();
  return uid;
}

// Where the Node showcase is running. The slug must match a key in data/products.json.
// Set this to the machine running "npm start" (or your CMS host once deployed).
const char *SITE = "http://192.168.1.44:8080/product/";

// Tap a tag, read the UID off Serial, paste it into the matching row. Blank rows are skipped.
struct Tag { const char *uid; const char *slug; };
const Tag TAGS[] = {
  {"04:1C:3E:44:CA:2A:81", "game-box"},   // Rubber Wood Game Box
  {"53:B2:11:7A", "slim-tictactoe"},      // Slim Tic Tac Toe
  {"04:89:46:44:CA:2A:81", "puzzle-3pc"}, // 3 Piece Puzzle
  {"04:7E:4C:44:CA:2A:81", "infinity-square"}, // Infinity Lamp, square
  {"",            "infinity-rectangle"},  // Infinity Lamp, rectangle
  {"04:66:44:45:CA:2A:81", "photo-frame"},// Magnetic Photo Frame 4x4
  {"",            "desktask"},            // DeskTask organiser
  {"04:F6:57:44:CA:2A:81", "perpetual-calendar"}, // Perpetual Calendar
};

String getProductURL(String uid) {

  for (auto &t : TAGS) {

    // uid[0] guard: an unmapped blank row must never match a real read
    if (t.uid[0] && uid == t.uid) {
      return String(SITE) + t.slug;
    }
  }

  return "";
}

void handleRoot() {

  String page = FPSTR(KIOSK_PAGE);

  server.send(200, "text/html", page);
}

void handleCurrent() {

  server.send(200, "text/plain", currentURL);
}

void setup() {

  Serial.begin(115200);

  delay(1000);   // S3 native USB CDC drops early prints without this

  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN);   // no SS arg: the library drives each CS itself

  // Park every SS high before touching the bus, so un-initialised readers
  // can't drive MISO while another one is being set up.
  for (byte i = 0; i < N_READERS; i++) {
    pinMode(SS_PINS[i], OUTPUT);
    digitalWrite(SS_PINS[i], HIGH);
  }

  for (byte i = 0; i < N_READERS; i++) {

    rfid[i].PCD_Init(SS_PINS[i], RST_PIN);

    // A silently miswired reader is the #1 failure on a multi-reader rig, so name it now.
    byte v = rfid[i].PCD_ReadRegister(MFRC522::VersionReg);

    Serial.printf("reader %u (SS=%u) version 0x%02X%s\n", i, SS_PINS[i], v,
                  (v == 0x00 || v == 0xFF) ? "  <- BAD WIRING OR POWER" : "");
  }

  Serial.println();
  Serial.println("Connecting to WiFi...");

  WiFi.begin(WIFI_SSID, WIFI_PASS);

  while (WiFi.status() != WL_CONNECTED) {

    delay(500);

    Serial.print(".");

  }

  Serial.println();
  Serial.println("WiFi Connected!");

  Serial.print("Open browser at: http://");
  Serial.println(WiFi.localIP());

  server.on("/", handleRoot);
  server.on("/current", handleCurrent);

  server.begin();

  Serial.println("Web server started");
}

void loop() {

  server.handleClient();

  for (byte i = 0; i < N_READERS; i++) {

    if (!rfid[i].PICC_IsNewCardPresent()) {
      continue;
    }

    if (!rfid[i].PICC_ReadCardSerial()) {
      continue;
    }

    String uid = getUID(rfid[i]);

    Serial.printf("reader %u  UID: %s\n", i, uid.c_str());

    String url = getProductURL(uid);

    if (url != "") {

      reads++;
      // ?t= makes a re-tap of the same tag a distinct URL, so the kiosk frame
      // reloads even after the arrows browsed somewhere else
      currentURL = url + "?t=" + reads;

      Serial.print("Opening: ");
      Serial.println(currentURL);

    }

    else {

      Serial.println("Unknown RFID  <- paste this UID into TAGS[]");

    }

    rfid[i].PICC_HaltA();
    rfid[i].PCD_StopCrypto1();
  }
}
