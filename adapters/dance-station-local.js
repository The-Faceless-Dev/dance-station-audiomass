/* Local Dance Station adapter mode for AudioMass. */
(function () {
  window.DanceStationAudioMassMode = "local";
  if (window.DanceStationAudioMassBridge) {
    window.DanceStationAudioMassBridge.emit("dance-station:audiomass-adapter", {
      adapter: "local",
      capabilities: {
        localFileApi: true,
        browserWorkspace: false,
        exportMessage: true,
      },
    });
  }
})();
