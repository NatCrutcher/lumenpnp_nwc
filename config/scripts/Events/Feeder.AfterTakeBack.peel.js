/*
 * Peel jog on recycle - disarm.
 *
 * Nozzle.AfterPlace.peel.js consumes the flag itself, so on a healthy recycle
 * there is nothing left to clear and this script is silent. It earns its place
 * as a diagnostic: if the flag is still set by the time the take-back finishes,
 * Nozzle.AfterPlace.peel.js did not run, which usually means the scripting
 * engine pool still holds the negative cache for that event (Machine Setup ->
 * Scripting -> clear the engine pool), or the filename is wrong.
 *
 * Note this event is NOT in a finally block in JogControlsPanel.recycleAction:
 * if takeBackPart() throws, it never fires. The flag's expiry and the
 * pick-location gate in Nozzle.AfterPlace.peel.js are what actually make a
 * stale flag harmless.
 *
 * Globals: nozzle, feeder, part.
 * See docs/NozzleSetup.md, "Peel Jog".
 */

var Logger = Java.type("org.pmw.tinylog.Logger");

try {
    if (config.scriptState.remove("nwc.peel.armed") !== null) {
        Logger.warn("[peel] flag survived the take-back - Nozzle.AfterPlace.peel.js did not run");
    }
}
catch (e) {
    Logger.error("[peel] cleanup failed (ignored): " + e);
}
