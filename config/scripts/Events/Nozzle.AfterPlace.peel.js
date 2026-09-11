/*
 * Peel jog on recycle - act.
 *
 * Nozzle.AfterPlace fires inside ReferenceNozzle.place(), after the vacuum is
 * cut and the place dwell has expired but before the caller retracts. That is
 * the only window in which motion can be injected between release and lift.
 *
 * place() is shared by board placements, discards and feeder take-backs, so
 * this script does nothing unless Feeder.BeforeTakeBack.peel.js armed it AND
 * the nozzle is actually standing at that feeder's pick location.
 *
 * Without this, release is "cut the vacuum, dwell, lift straight up" and
 * nothing shears the bond - small parts ride back up on the tip. Jogging
 * sideways presses the part against the wall of the tape pocket, which holds
 * it while the tip slides off. The jog follows the part's long axis where it
 * has one, and otherwise runs across the tape - see pickAxis() below.
 *
 * Globals: nozzle, part. Note nozzle.getPart() and nozzle.getPartsFeeder() are
 * already null here; the part binding was captured before place() cleared them.
 *
 * See docs/NozzleSetup.md, "Peel Jog".
 */

var Logger         = Java.type("org.pmw.tinylog.Logger");
var Location       = Java.type("org.openpnp.model.Location");
var LengthUnit     = Java.type("org.openpnp.model.LengthUnit");
var CompletionType = Java.type("org.openpnp.spi.MotionPlanner$CompletionType");
var NO_OPTS        = Java.to([], "org.openpnp.model.Motion$MotionOption[]");

// --- tunables ---------------------------------------------------------------
// LIFT_MM: raised before jogging, to clear the pocket floor corner. Default 0:
//   lifting also lifts a part that is still stuck, and a 0.35 mm part in a
//   ~0.6 mm pocket has little headroom before its top edge clears the rim - at
//   which point the jog drags it out onto the carrier tape instead of shearing
//   it off, a failure that passes the part-off check while losing the part. At
//   0 the part rests on the pocket floor, which is where the shear works best.
//   Try 0.05 only if the tip is seen scrubbing the part along the floor.
// BACK_MM / FWD_MM: relative travel, back then forward along the long axis. The
//   net displacement from the pick point is only FWD_MM - BACK_MM, so the
//   default -0.1/+0.2 stays within +/-0.1 mm of pocket centre.
var LIFT_MM    = 0.00;
var BACK_MM    = 0.10;
var FWD_MM     = 0.20;
var SPEED      = 0.2;      // fraction of machine speed; these moves are accel-limited anyway
var MAX_AGE_MS = 30000;    // arm -> place() measures ~400 ms in the logs
var XY_TOL_MM  = 0.5;      // how close to the feeder pick location counts as a take-back
var SQUARE_TOL_MM = 0.05;  // body sides closer than this count as square - no long axis
// ----------------------------------------------------------------------------

/*
 * Which way to jog, as a unit vector in machine coordinates plus a label for
 * the log. Returns null if no direction can be justified, in which case the
 * caller skips the peel rather than guessing - jogging along a pocket's short
 * dimension is the one thing that can jam the tip against a pocket wall.
 */
function pickAxis(feeder, bw, bh, rotation) {
    if (Math.abs(bw - bh) >= SQUARE_TOL_MM) {
        // The footprint's body width lies along part-local X, and the nozzle's
        // C rotation is the rotation the part was picked at, so part-local X
        // maps to machine (cos C, sin C).
        var theta = ((bw > bh) ? rotation : rotation + 90.0) * Math.PI / 180.0;
        return { ux: Math.cos(theta), uy: Math.sin(theta),
                 how: "part long axis (body " + bw + " x " + bh + ")" };
    }

    // Square body - no long axis to prefer. Jog ACROSS the tape rather than
    // along it: the strip feeders do not always hold the tape firmly, so a jog
    // along its length risks dragging the tape and losing the taught position.
    // A square part sits in a square pocket, so the clearance is the same
    // either way and tape-shift risk is the only thing left to decide on.
    if (typeof feeder.getIdealLineLocations !== "function") {
        return null;    // not a strip feeder; no tape direction to work from
    }
    var line = feeder.getIdealLineLocations();
    if (line === null || line.length < 2) {
        return null;
    }
    // [0] is the reference hole, [1] the last hole (or the vision-found hole),
    // so this vector is the tape's own travel direction.
    var a = line[0].convertToUnits(LengthUnit.Millimeters);
    var b = line[1].convertToUnits(LengthUnit.Millimeters);
    var tx = b.getX() - a.getX();
    var ty = b.getY() - a.getY();
    var len = Math.sqrt(tx * tx + ty * ty);
    if (len < 1e-6) {
        return null;    // holes coincident; the feeder is not taught
    }
    return { ux: -ty / len, uy: tx / len,
             how: "across the tape (square body " + bw + " x " + bh + ")" };
}

try {
    // Wrapped in a function purely so each gate can bail out with `return`.
    // A bare script body has nothing to return from, which would force the
    // gates into a deeply nested if/else ladder.
    (function peel() {

        // Consume the flag unconditionally, before any gate is evaluated, so a
        // flag left behind by a take-back that threw before place() survives at
        // most one place event - and the pick-location gate below stops even
        // that one.
        var flag = config.scriptState.remove("nwc.peel.armed");
        if (flag === null) {
            return;     // Ordinary board placement or discard. Do nothing.
        }

        // Armed by Feeder.BeforeTakeBack.peel.js as "nozzle|feederId|millis".
        var fields      = String(flag).split("|");
        var armedNozzle = fields[0];
        var feederId    = fields[1];
        var armedAtMs   = parseInt(fields[2], 10);   // 10 = radix, i.e. read it as decimal
        var ageMs       = java.lang.System.currentTimeMillis() - armedAtMs;

        if (armedNozzle !== nozzle.getName()) {
            Logger.info("[peel] skip: armed for " + armedNozzle + ", this is " + nozzle.getName());
            return;
        }
        if (ageMs > MAX_AGE_MS) {
            Logger.info("[peel] skip: stale flag, age " + ageMs + " ms");
            return;
        }

        var feeder = machine.getFeeder(feederId);
        if (feeder === null) {
            Logger.warn("[peel] skip: feeder " + feederId + " no longer exists");
            return;
        }

        // Valid at this point: ReferenceStripFeeder.takeBackPart() only
        // decrements feedCount after putPartBack() returns, so the pick
        // location still names the pocket we are standing over.
        var cur  = nozzle.getLocation().convertToUnits(LengthUnit.Millimeters);
        var pick = feeder.getPickLocation().convertToUnits(LengthUnit.Millimeters);
        var dx = cur.getX() - pick.getX();
        var dy = cur.getY() - pick.getY();
        var off = Math.sqrt(dx * dx + dy * dy);
        if (off > XY_TOL_MM) {
            Logger.warn("[peel] skip: " + off.toFixed(3) + " mm from the "
                    + feeder.getName() + " pick location - not a take-back");
            return;
        }

        // From here on a jog direction has to be known. A part with no footprint
        // at all tells us nothing about its shape, so it is skipped rather than
        // guessed at - unlike a square one, which pickAxis() handles.
        var partId = (part === null) ? "(no part)" : part.getId();
        var pkg = (part === null) ? null : part.getPackage();
        var fp  = (pkg === null) ? null : pkg.getFootprint();
        if (fp === null) {
            Logger.warn("[peel] skip: " + partId + " has no footprint");
            return;
        }

        var bw = fp.getBodyWidth();
        var bh = fp.getBodyHeight();
        if (bw <= 0 || bh <= 0) {
            Logger.warn("[peel] skip: " + partId + " footprint has no body dimensions ("
                    + bw + " x " + bh + ")");
            return;
        }

        // The part's rotation comes from the PICK LOCATION, not from
        // nozzle.getLocation(). place() calls setPart(null) before firing this
        // event, and AbstractNozzle.setPart(null) clears the nozzle's
        // rotationModeOffset (AbstractNozzle.java:112-114) - so from here on
        // getLocation() reports the raw head rotation rather than the part
        // rotation, and on this machine the two differ by exactly 90 degrees.
        // The log says it out loud: "set rotation mode offset: none." fires
        // between place() and this script.
        var c0 = cur.getRotation();               // hold the CURRENT rotation in the moves
        var partRotation = pick.getRotation();    // the part's rotation in the tape
        var axis = pickAxis(feeder, bw, bh, partRotation);
        if (axis === null) {
            Logger.warn("[peel] skip: " + partId + " has a square body (" + bw + " x " + bh
                    + ") and " + feeder.getName() + " gives no tape direction to jog across");
            return;
        }
        var ux = axis.ux, uy = axis.uy;

        var x0 = cur.getX(), y0 = cur.getY();
        var zp = cur.getZ() + LIFT_MM;

        Logger.info("[peel] " + partId + " at " + feeder.getName()
                + ": part C=" + partRotation.toFixed(2)
                + " (head " + c0.toFixed(2) + ") along " + axis.how
                + " = (" + ux.toFixed(3) + ", " + uy.toFixed(3) + ")"
                + " lift=" + LIFT_MM + " back=" + BACK_MM + " fwd=" + FWD_MM);

        // Every target comes from the one snapshot above: getLocation() reports
        // planned, not physical, position and the planner is asynchronous, so
        // re-reading it between moves would drift.
        if (LIFT_MM > 0) {
            nozzle.moveTo(new Location(LengthUnit.Millimeters,
                    x0, y0, zp, c0), SPEED, NO_OPTS);
        }
        nozzle.moveTo(new Location(LengthUnit.Millimeters,
                x0 - ux * BACK_MM, y0 - uy * BACK_MM, zp, c0), SPEED, NO_OPTS);
        nozzle.moveTo(new Location(LengthUnit.Millimeters,
                x0 + ux * (FWD_MM - BACK_MM), y0 + uy * (FWD_MM - BACK_MM),
                zp, c0), SPEED, NO_OPTS);

        // Come to a full stop so the caller's retract cannot be blended into
        // the jog, which would round off the shear.
        nozzle.waitForCompletion(CompletionType.WaitForStillstand);
        Logger.info("[peel] done");
    })();
}
catch (e) {
    // Never rethrow. An exception here propagates out of place(), so
    // ReferenceStripFeeder.takeBackPart() never reaches setFeedCount(count - 1)
    // and the tape's feed count silently desyncs from the tape. The peel is an
    // optimisation; the part-off check that runs straight after is the real
    // safety net, and it reports a stuck part on its own.
    Logger.error("[peel] failed (ignored, part-off check will report): " + e);
}
