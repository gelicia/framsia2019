#include <neopixel.h>
#include <Adafruit_GPS.h>

Adafruit_GPS GPS(&Serial1);
Adafruit_NeoPixel strip = Adafruit_NeoPixel(24, D3, WS2812B);
int mode = 0;

void setup () {
    // Subscribe to the integration response event
    Particle.subscribe("hook-response/getScoreLatLong", changeLEDMode, MY_DEVICES);
    // function for testing modes
    Particle.function("setMode", setMode);
    
    Serial.begin(115200);
    Serial.println("Adafruit GPS library basic test!");
        
    // 9600 NMEA is the default baud rate for Adafruit MTK GPS's- some use 4800
    GPS.begin(9600);
    GPS.sendCommand(PMTK_SET_NMEA_OUTPUT_RMCGGA);
    GPS.sendCommand(PMTK_SET_NMEA_UPDATE_1HZ);
    GPS.sendCommand(PGCMD_ANTENNA);

    delay(1000);
    Serial1.println(PMTK_Q_RELEASE);

    strip.begin();
    strip.show(); 
}
 
uint32_t gpsTimer = millis();
 
void loop () {
	char c = GPS.read();
	
	if (GPS.newNMEAreceived()) {
		if (!GPS.parse(GPS.lastNMEA())) 
			return;
	}
	
	// if millis() or timer wraps around, we'll just reset it
	if (gpsTimer > millis()) gpsTimer = millis();
			
	if ((millis() - gpsTimer > 60000)) {
		gpsTimer = millis(); // reset the timer
		if (GPS.fix) {
			char buf[128];
				
            snprintf(buf, sizeof(buf), "%f,%f", GPS.latitudeDegrees, GPS.longitudeDegrees);
            Particle.publish("getScoreLatLong", buf, PRIVATE);
            delay(100);
		} else {
			Particle.publish("noFix", "true", PRIVATE);
		}
	}
	
	colorLEDs(mode);
}

int setMode(String arg) {
	mode = arg.toInt();
	return 1;
}

void changeLEDMode(const char *event, const char *data) {
    String dataStr = data;
    
    ///String dataStr = "{\"score\":668.0754023590992}";
    //String dataStr = "{\"statusCode\":\"400\",\"body\":\"Query params long and lat (or one param, a comma delimited latlong or longlat) are required and must be numeric.\",\"headers\":{\"Content-Type\":\"application/json\"}}";
    
    String score = dataStr.substring(dataStr.indexOf(":")+1, dataStr.lastIndexOf("}"));
    float scoreNum = score.toFloat(); // returns 0 for errors, which will turn the LEDs off, which is fine.
    if (scoreNum <= 100) {
        mode = 0;
    } else if (scoreNum > 100 && scoreNum <= 200) {
        mode = 1;
    } else if (scoreNum > 200 && scoreNum <= 300) {
        mode = 2;
    } else if (scoreNum > 300 && scoreNum <= 400) {
        mode = 3;
    }  else if (scoreNum > 400 && scoreNum <= 500) {
        mode = 4;
    } else if (scoreNum > 500) {
        mode = 5;
    }
    
    Particle.publish("changeLEDMode", String(mode));
}

void colorLEDs(int mode){
    switch (mode) {
        case 0:
            for(uint16_t i=0; i< strip.numPixels(); i++) {
				strip.setPixelColor(i, 0);
			}
			strip.show();
			break;
		case 1:
		    blueBlink(20, 400);
		    break;
		case 2:
		    blueBlink(100, 10);
		    break;
		case 3:
		    colorWipe(Wheel(100), 50);
		    colorWipe(strip.Color(100,100,100), 50);
		    break;
		case 4:
		    for(uint16_t i=0; i< strip.numPixels(); i++) {
			    strip.setPixelColor(i, Wheel(((i * 256 / strip.numPixels())) & 255));
	        }
			strip.show();
		    break;
		case 5:
		    rainbowCycle(10);
		    break;
    }
}


// Fill the dots one after the other with a color
void colorWipe(uint32_t c, uint32_t wait) {
	for(uint16_t i=0; i<strip.numPixels(); i++) {
        strip.setPixelColor(i, c);
        strip.show();
        delay(wait);
	}
}
 
// Slightly different, this makes the rainbow equally distributed throughout
void rainbowCycle(uint8_t wait) {
	uint16_t i, j;
 
	for(j=0; j<256*5; j++) { // 5 cycles of all colors on wheel
		for(i=0; i< strip.numPixels(); i++) {
			strip.setPixelColor(i, Wheel(((i * 256 / strip.numPixels()) + j) & 255));
		}
		strip.show();
		delay(wait);
	}
}

void blueBlink(uint16_t maxBright, uint8_t wait) {
	uint16_t i, j;
 
	for(j=0; j<maxBright; j++) { 
		for(i=0; i< strip.numPixels(); i++) {
			strip.setPixelColor(i, strip.Color(0, 0, j));
		}
		strip.show();
		delay(wait);
	}
    for(j=maxBright; j>0; j--) { 
		for(i=0; i< strip.numPixels(); i++) {
			strip.setPixelColor(i, strip.Color(0, 0, j));
		}
		strip.show();
		delay(wait);
	}
}
 
// Input a value 0 to 255 to get a color value.
// The colours are a transition r - g - b - back to r.
uint32_t Wheel(byte WheelPos) {
	if(WheelPos < 85) {
	 return strip.Color(WheelPos * 3, 255 - WheelPos * 3, 0);
	} else if(WheelPos < 170) {
	 WheelPos -= 85;
	 return strip.Color(255 - WheelPos * 3, 0, WheelPos * 3);
	} else {
	 WheelPos -= 170;
	 return strip.Color(0, WheelPos * 3, 255 - WheelPos * 3);
	}
}