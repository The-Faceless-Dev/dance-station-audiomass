/* Dance Station AudioMass adapter bridge.
 *
 * This file is intentionally small and framework-free. Local Dance Station and
 * the site can both load it, then choose local or site behavior with ds_mode.
 */
(function () {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("ds_mode") || "standalone";
  const sourceUrl = params.get("ds_audio") || "";
  const sourceName = params.get("ds_name") || "";

  function emit(type, payload) {
    window.parent.postMessage(
      {
        source: "dance-station-audiomass",
        type,
        mode,
        payload: payload || {},
      },
      "*"
    );
  }

  function state() {
    return {
      mode,
      sourceUrl,
      sourceName,
      hasSource: Boolean(sourceUrl),
    };
  }

  window.DanceStationAudioMassBridge = {
    mode,
    sourceUrl,
    sourceName,
    state,
    emit,
    ready: function () {
      emit("dance-station:audiomass-ready", state());
    },
    loaded: function (payload) {
      emit("dance-station:audiomass-loaded", Object.assign(state(), payload || {}));
    },
    exported: function (payload) {
      emit("dance-station:audiomass-exported", Object.assign(state(), payload || {}));
    },
    error: function (message, details) {
      emit("dance-station:audiomass-error", { message: String(message || "AudioMass error"), details: details || null });
    },
  };

  window.addEventListener("error", function (event) {
    window.DanceStationAudioMassBridge.error(event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.DanceStationAudioMassBridge.ready();
})();
