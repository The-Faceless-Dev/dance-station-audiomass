/* Site Dance Station adapter mode for AudioMass. */
(function () {
  window.DanceStationAudioMassMode = "site";
  if (window.DanceStationAudioMassBridge) {
    window.DanceStationAudioMassBridge.emit("dance-station:audiomass-adapter", {
      adapter: "site",
      capabilities: {
        localFileApi: false,
        browserWorkspace: true,
        exportMessage: true,
      },
    });
  }
})();
