# LumenPnP Pick and Place

# Task List

* Try Non-Squareness Compensation: [https://github.com/openpnp/openpnp/wiki/Linear-Transformed-Axes\#use-case--non-squareness-compensation](https://github.com/openpnp/openpnp/wiki/Linear-Transformed-Axes#use-case--non-squareness-compensation)   
* Try second fiducial calibration: [https://github.com/openpnp/openpnp/wiki/Vision-Solutions\#calibration-secondary-fiducial](https://github.com/openpnp/openpnp/wiki/Vision-Solutions#calibration-secondary-fiducial) 

# Feeders

## ReferenceTrayFeeder

## ReferenceStripFeeder

* This can be used with 3D-printed holders like those supplied by Opulo.   
* This can also be used by taping strips down with double-sided tape. This is very cheap, easy, and high-density, but would not work for plastic SMT strips unless we added a channel for the part pockets. For the LumenPnP, it may not work well unless we add a spacer plate to raise the strips 1 cm (3/8 inch).  
* OpenPnP directions: [https://github.com/openpnp/openpnp/wiki/ReferenceStripFeeder](https://github.com/openpnp/openpnp/wiki/ReferenceStripFeeder) 

## BlindsFeeder

These are simple strip holders with covers that can slide back to expose parts.

* Overview: [https://makr.zone/new-openpnp-blindsfeeder/353/](https://makr.zone/new-openpnp-blindsfeeder/353/)   
* Pull request (lots of info): [https://github.com/openpnp/openpnp/pull/936](https://github.com/openpnp/openpnp/pull/936)   
* OpenPnP directions: [https://github.com/openpnp/openpnp/wiki/BlindsFeeder](https://github.com/openpnp/openpnp/wiki/BlindsFeeder)   
* YouTube intro: [https://www.youtube.com/watch?v=dGde59Iv6eY](https://www.youtube.com/watch?v=dGde59Iv6eY)   
* Get the OpenSCAD files from OpenPnP in the configuration tab for the BlindsFeeder.

## PushPullFeeder

* Overview: [https://makr.zone/new-all-3d-printed-tapereel-feeder/399/](https://makr.zone/new-all-3d-printed-tapereel-feeder/399/)   
* OpenSCAD files: [https://github.com/markmaker/PushPullFeeder](https://github.com/markmaker/PushPullFeeder)   
* STL files for LumenPnP:  [https://www.printables.com/model/1151234-lumenpnp-referencepushpull-feeder-modifications](https://www.printables.com/model/1151234-lumenpnp-referencepushpull-feeder-modifications)  
  * Printer: Prusa Mini+ and Prusa MK3.5  
  * Print Settings: 0.4mm nozzle, 0.20mm layer height, 15% infill  
  * Filament: generic PETG  
  * Supports: none, Brim: none  
* OpenPnP directions: [https://github.com/openpnp/openpnp/wiki/ReferencePushPullFeeder](https://github.com/openpnp/openpnp/wiki/ReferencePushPullFeeder) 

# Tool Changer

* [https://docs.opulo.io/misc/auto-toolchanger/](https://docs.opulo.io/misc/auto-toolchanger/)   
* Opulo recommends avoiding tool changes or doing them manually, so I have not tried this and have not mounted the tool changer.

# Build/Staging Plates

* The staging plate has the bottom camera.   
* My staging plate was bowed upward by \~1.5-2mm in the center. Options to fix:  
  * Get a custom plate machined from aluminum or steel. Consider 5mm or 6mm thick aluminum for even higher rigidity.  
  * Flip the plate over and use the foot to hold it flat.  
  * Use adjustable feet.  
  * Add bracing, perhaps with an extra 2020 extrusion.  
  * Add weight under the plate to pull it down.  
* My plates also did not join perfectly, so I 3D-printed some flat connector plates.

# Motion System

* Out of the box, the accelerations were set very high, causing the LumenPnP to shake when jogging the positions, especially the Y-axis.   
  * Lowering the acceleration (how much) helps.  
  * I want to try a jerk setting, but the firmware appears to have jerk disabled.  
  * OpenPnP also has some advanced motion options to try.

## Fiducials

* [https://github.com/openpnp/openpnp/wiki/Visual-Homing](https://github.com/openpnp/openpnp/wiki/Visual-Homing)   
* [https://github.com/openpnp/openpnp/wiki/Vision-Solutions](https://github.com/openpnp/openpnp/wiki/Vision-Solutions#calibration-secondary-fiducial)   
* “Hence these primary and secondary fiducials are not to be confused with the homing fiducial. Technically you can reuse the primary calibration fiducial as a homing fiducial if it is permanently fixed on the machine, and at PCB surface Z. But that's not the recommended way.”  
* 