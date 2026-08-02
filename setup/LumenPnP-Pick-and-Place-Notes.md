# LumenPnP Pick and Place Notes

## Installation
Per Claude's recommendations, I used the .tar.gz download approach to simplify multiple parallel installs.
* Download https://s3-us-west-2.amazonaws.com/openpnp/OpenPnP-unix-main.tar.gz
* Installed on 2026-08-01. Version 2.6
* sudo apt install openjdk-17-jdk openjdk-21-jdk visualvm   # Install Java and debugger
* sudo adduser $USER dialout   # Make sure I can access the serial ports
* sudo systemctl mask ModemManager  # Turn off modem manager that might interfere with serial ports
* sudo apt install v4l-utils   # Camera utilities
* v4l2-ctl --list-devices   # Check the list of cameras
* ls /dev/ttyAC*   # Check for the LumenPnP serial port
* ls /dev/serial/by-id  # Check for the LumenPnP serial port by ID
   * /dev/serial/by-id/usb-STMicroelectronics_MARLIN_OPULO_LUMEN_REV5_CDC_in_FS_Mode_398236833034-if00

## Calibration
- Set bottom camera offset for centered view X=-51, Y=11
- Centered top camera on fiducial 1 (with nozzle N1): X:192.230   Y:134.221   Z:26.500    C:0.000    
- Primary Fiducial N1 Nozzle Position: X:216.940   Y:197.165   Z:4.080     C:0.000
- Second Fiducial N1 Nozzle Position:  X:216.840   Y:107.025   Z:13.940    C:0.000
- Primary Fiducial N2 Nozzle Position: X:218.268   Y:196.761   Z:4.270     C:0.000    
- Bottom camera N1 position after offset adjust: X:218.111   Y:152.835   Z:4.200     C:0.000    

## Task List

* Try Non-Squareness Compensation: [https://github.com/openpnp/openpnp/wiki/Linear-Transformed-Axes\#use-case--non-squareness-compensation](https://github.com/openpnp/openpnp/wiki/Linear-Transformed-Axes#use-case--non-squareness-compensation)   
* Try second fiducial calibration: [https://github.com/openpnp/openpnp/wiki/Vision-Solutions\#calibration-secondary-fiducial](https://github.com/openpnp/openpnp/wiki/Vision-Solutions#calibration-secondary-fiducial) 

* Try bottom camera auto-focus for part height detection.

## Enhancements

1. Aluminum build plate - 6mm thick, 600x300mm, tapped 3mm holes. 15X stiffer
1. 15 mm high second fiducial  - nozzle N1 could not reach the Opulo supported second fiducial (5 mm).

## Feeders

### ReferenceTrayFeeder

### ReferenceStripFeeder

* This can be used with 3D-printed holders like those supplied by Opulo.   
* This can also be used by taping strips down with double-sided tape. This is very cheap, easy, and high-density, but would not work for plastic SMT strips unless we added a channel for the part pockets. For the LumenPnP, it may not work well unless we add a spacer plate to raise the strips 1 cm (3/8 inch).  
* OpenPnP directions: [https://github.com/openpnp/openpnp/wiki/ReferenceStripFeeder](https://github.com/openpnp/openpnp/wiki/ReferenceStripFeeder) 

### BlindsFeeder

These are simple strip holders with covers that can slide back to expose parts.

* Overview: [https://makr.zone/new-openpnp-blindsfeeder/353/](https://makr.zone/new-openpnp-blindsfeeder/353/)   
* Pull request (lots of info): [https://github.com/openpnp/openpnp/pull/936](https://github.com/openpnp/openpnp/pull/936)   
* OpenPnP directions: [https://github.com/openpnp/openpnp/wiki/BlindsFeeder](https://github.com/openpnp/openpnp/wiki/BlindsFeeder)   
* YouTube intro: [https://www.youtube.com/watch?v=dGde59Iv6eY](https://www.youtube.com/watch?v=dGde59Iv6eY)   
* Get the OpenSCAD files from OpenPnP in the configuration tab for the BlindsFeeder.

### PushPullFeeder

* Overview: [https://makr.zone/new-all-3d-printed-tapereel-feeder/399/](https://makr.zone/new-all-3d-printed-tapereel-feeder/399/)   
* OpenSCAD files: [https://github.com/markmaker/PushPullFeeder](https://github.com/markmaker/PushPullFeeder)   
* STL files for LumenPnP:  [https://www.printables.com/model/1151234-lumenpnp-referencepushpull-feeder-modifications](https://www.printables.com/model/1151234-lumenpnp-referencepushpull-feeder-modifications)  
  * Printer: Prusa Mini+ and Prusa MK3.5  
  * Print Settings: 0.4mm nozzle, 0.20mm layer height, 15% infill  
  * Filament: generic PETG  
  * Supports: none, Brim: none  
* OpenPnP directions: [https://github.com/openpnp/openpnp/wiki/ReferencePushPullFeeder](https://github.com/openpnp/openpnp/wiki/ReferencePushPullFeeder) 

## Tool Changer

* [https://docs.opulo.io/misc/auto-toolchanger/](https://docs.opulo.io/misc/auto-toolchanger/)   
* Opulo recommends avoiding tool changes or doing them manually, so I have not tried this and have not mounted the tool changer.

## Build/Staging Plates

* The staging plate has the bottom camera.   
* My staging plate was bowed upward by \~1.5-2mm in the center. Options to fix:  
  * Get a custom plate machined from aluminum or steel. Consider 5mm or 6mm thick aluminum for even higher rigidity.  
  * Flip the plate over and use the foot to hold it flat.  
  * Use adjustable feet.  
  * Add bracing, perhaps with an extra 2020 extrusion.  
  * Add weight under the plate to pull it down.  
* My plates also did not join perfectly, so I 3D-printed some flat connector plates.

## Motion System

* Out of the box, the accelerations were set very high, causing the LumenPnP to shake when jogging the positions, especially the Y-axis.   
  * Lowering the acceleration (how much) helps.  
  * I want to try a jerk setting, but the firmware appears to have jerk disabled.  
  * OpenPnP also has some advanced motion options to try.

### Fiducials

* [https://github.com/openpnp/openpnp/wiki/Visual-Homing](https://github.com/openpnp/openpnp/wiki/Visual-Homing)   
* [https://github.com/openpnp/openpnp/wiki/Vision-Solutions](https://github.com/openpnp/openpnp/wiki/Vision-Solutions#calibration-secondary-fiducial)   
* “Hence these primary and secondary fiducials are not to be confused with the homing fiducial. Technically you can reuse the primary calibration fiducial as a homing fiducial if it is permanently fixed on the machine, and at PCB surface Z. But that's not the recommended way.”  
* 
