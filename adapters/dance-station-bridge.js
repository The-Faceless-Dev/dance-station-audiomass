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
  let editor = null;

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

  function audioBufferToWav(buffer) {
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const samples = buffer.length;
    const bytesPerSample = 2;
    const blockAlign = channels * bytesPerSample;
    const dataSize = samples * blockAlign;
    const wav = new ArrayBuffer(44 + dataSize);
    const view = new DataView(wav);

    function writeString(offset, value) {
      for (let i = 0; i < value.length; i += 1) {
        view.setUint8(offset + i, value.charCodeAt(i));
      }
    }

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < samples; i += 1) {
      for (let channel = 0; channel < channels; channel += 1) {
        let value = buffer.getChannelData(channel)[i];
        value = Math.max(-1, Math.min(1, value));
        view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
        offset += bytesPerSample;
      }
    }
    return wav;
  }

  function currentBuffer() {
    if (!editor || !editor.engine || !editor.engine.wavesurfer) return null;
    return editor.engine.wavesurfer.backend && editor.engine.wavesurfer.backend.buffer;
  }

  function loadAudio(url, name) {
    if (!url) {
      window.DanceStationAudioMassBridge.error("No audio URL was provided.");
      return;
    }
    if (!editor || !editor.engine || !editor.engine.LoadSample) {
      window.DanceStationAudioMassBridge.error("AudioMass is not ready to load audio yet.");
      return;
    }
    try {
      editor.engine.LoadSample(url);
      window.DanceStationAudioMassBridge.loaded({ sourceUrl: url, sourceName: name || "" });
    } catch (error) {
      window.DanceStationAudioMassBridge.error(error && error.message ? error.message : String(error));
    }
  }

  function exportToDanceStation(name, requestId, targetWindow, targetOrigin) {
    try {
      const buffer = currentBuffer();
      if (!buffer) throw new Error("No audio is loaded in the editor.");
      const wav = audioBufferToWav(buffer);
      const payload = {
        requestId: requestId || null,
        name: name || sourceName || "dance-station-edit.wav",
        mimeType: "audio/wav",
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
        audio: wav,
      };
      if (targetWindow) {
        targetWindow.postMessage({
          source: "dance-station-audiomass",
          type: "dance-station-export-audio-result",
          ok: true,
          ...payload,
        }, targetOrigin || "*", [wav]);
      } else {
        window.parent.postMessage({
          source: "dance-station-audiomass",
          type: "dance-station:exported-audio",
          mode,
          payload,
        }, "*", [wav]);
      }
      window.DanceStationAudioMassBridge.exported({ name: payload.name, duration: payload.duration });
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      if (targetWindow) {
        targetWindow.postMessage({
          source: "dance-station-audiomass",
          type: "dance-station-export-audio-result",
          requestId: requestId || null,
          ok: false,
          error: message,
        }, targetOrigin || "*");
      }
      window.DanceStationAudioMassBridge.error(message);
    }
  }

  function downloadFile(blob, name) {
    if (mode !== "site" || !blob || !blob.arrayBuffer) return false;
    blob.arrayBuffer().then(function (buffer) {
      window.parent.postMessage({
        source: "dance-station-audiomass",
        type: "dance-station:native-download",
        mode,
        payload: {
          name: name || "audiomass-output.mp3",
          mimeType: blob.type || "application/octet-stream",
          buffer,
        },
      }, "*", [buffer]);
    }).catch(function (error) {
      window.DanceStationAudioMassBridge.error(error && error.message ? error.message : String(error));
    });
    return true;
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
    attachEditor: function (nextEditor) {
      editor = nextEditor;
    },
    requestAssets: function () {
      emit("dance-station:request-assets", state());
    },
    loadAudio,
    exportToDanceStation,
    downloadFile,
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

  window.addEventListener("message", function (event) {
    const message = event.data || {};
    if (message.type === "dance-station:load-audio") {
      const payload = message.payload || {};
      loadAudio(payload.url, payload.name);
      return;
    }
    if (message.type === "dance-station-export-audio") {
      exportToDanceStation(message.name, message.requestId, event.source, event.origin);
    }
  });

  window.DanceStationAudioMassBridge.ready();
})();
