/*
 * Peel jog on recycle - arm.
 *
 * Feeder.BeforeTakeBack fires only from the GUI Recycle button
 * (JogControlsPanel.recycleAction), immediately before feeder.takeBackPart().
 * It is the one event that identifies a take-back, so it arms the flag that
 * Nozzle.AfterPlace.peel.js looks for. Board placements and discards never
 * arm it and are therefore untouched.
 *
 * Globals: nozzle, feeder, part.
 * See docs/NozzleSetup.md, "Peel Jog".
 */

var Logger = Java.type("org.pmw.tinylog.Logger");

try {
    // config.scriptState is a TreeMap<String,String> that OpenPnP maintains for
    // exactly this purpose. Script bindings are rebuilt on every invocation, so
    // plain script variables cannot carry state between events.
    config.scriptState.put("nwc.peel.armed",
            nozzle.getName() + "|" + feeder.getId() + "|"
            + java.lang.System.currentTimeMillis());
    Logger.info("[peel] armed for " + nozzle.getName() + " / " + feeder.getName());
}
catch (e) {
    // Never rethrow: this runs before takeBackPart(), so an exception here would
    // abort the recycle before it started.
    Logger.error("[peel] arm failed (ignored): " + e);
}
