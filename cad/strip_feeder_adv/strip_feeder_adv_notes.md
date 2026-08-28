# Advanced Strip Feeder Notes

## Design Notes

This feeder is designed to be printed as two parts with a dovetail connection. This allows better grooves and other features to precisely hold the tape. It also allows more precise bottom side dovetails to group feeders and mount them to the build plate.

## Tasks

- The 1.5mm pin hole works pretty well, but try fine-tuning it for a more precise and reliable press fit.
- DONE: Adjust plate mounting to keep feeders flat on build plate. *Raised bottom surface of the mounting dovetail by 0.2mm.* 
- DONE: Update the base strip design to keep everything square OR use the bolting scheme. *Added a brace that screws into two holes to stay square. I think I'll try it in the center first, so that I can slide feeders in from both sides and it will ensure the center stays flat to the staging plate.*
- DONE: Add a locator pin to keep the tape from moving. *I could not get good results with a 3D printed post, so I ordered 1.5mm x 8mm machined pins from uxcell on Amazon and they seem good (I haven't run a job yet.*
- DONE: Add one or two fiducials, perhaps square because they may print better. I think we could just use a hole. *Added one 1mm square hole to the front label section. It is located in a line with the tape holes and 5 mm from the first tape hole.*
- DONE: Tune the spring fingers to allow ≥0.15mm of tape thickness play.
- Put the label text closer to the tape if possible and maybe use a slightly smaller font. Right now the camera view is too narrow to see the first tape hole and the text. Although this may not matter: I think the push pull feeder label is in a different location.
- Add extra bottom dovetails for more mounting options.
- Consider standardizing on a width like 11 mm.
- DONE: Print in green for good contrast
- Add a variant with a moveable cover, like the blinds feeder. This version would not need the hold-down fingers, because the cover could perform the hold-down function.

## Completed

- DONE: Add three or more horizontal holes (probably for M2 or M2.5 screws) to hold 2+ feeders together. Optionally make recesses for the screw heads on one side and the nuts on the other.
- DONE: Consider reducing the extra height above the strip on the fixed side.
- DONE: Mark the version on the bottom or side
- DONE: Set the top of tape height to 10mm
- DONE: Add mounting option beyond the end of the feeder to allow installation and removal with strips installed
- DONE: Make more parametric