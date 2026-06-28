# Dance Station AudioMass

This repository contains the customized AudioMass build used by Dance Station.

It is intended to be consumed as a git submodule by:

- local Dance Station
- the Faceless Dancer site

## Adapter Contract

Parent apps can launch AudioMass with:

```text
?ds_mode=site&ds_audio=<url>&ds_name=<display-name>
?ds_mode=local&ds_audio=<url>&ds_name=<display-name>
```

The shared bridge posts messages to the parent window:

- `dance-station:audiomass-ready`
- `dance-station:audiomass-loaded`
- `dance-station:audiomass-exported`
- `dance-station:audiomass-error`
- `dance-station:audiomass-adapter`

Adapter files live in `adapters/`:

- `dance-station-bridge.js`
- `dance-station-local.js`
- `dance-station-site.js`

The bridge is deliberately framework-free so both the Python-served local app and the Preact site can use the same AudioMass source.
