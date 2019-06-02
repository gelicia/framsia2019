// This #include statement was automatically added by the Particle IDE.
#include <TinyGPS++.h>

const unsigned long PUBLISH_PERIOD = 60000; // publish every minute
TinyGPSPlus gps;
unsigned long lastPublish = 0;

void setup() {
    // Subscribe to the response, which will trigger the LED mode to change
    Particle.subscribe("hook-response/getScoreLatLong", changeLEDMode, MY_DEVICES);
    // GPS uses standard TX/RX pins for Serial
    Serial1.begin(9600);
}

void loop() {
    while (Serial1.available() > 0) {
        if (gps.encode(Serial1.read())) {
            displayInfo();
        }
    }
}

void changeLEDMode(const char *event, const char *data) {
  Particle.publish("changeLEDMode", data);
}
          
void displayInfo()
{
  if (millis() - lastPublish >= PUBLISH_PERIOD) {
    lastPublish = millis();
    if (Particle.connected()) {
      char buf[128];
      if (gps.location.isValid()) {
        snprintf(buf, sizeof(buf), "%f,%f", gps.location.lat(), gps.location.lng());
        //Particle.publish("gps", buf);
        //Particle.publish("getScoreLatLong", "59.9099435,10.7268254", PRIVATE);
        Particle.publish("getScoreLatLong", buf, PRIVATE);
      }
      else {
        Particle.publish("gps", "no location");
      }
    }
  }
}