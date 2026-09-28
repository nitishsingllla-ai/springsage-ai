# Interactive Transect & 3D Cross-Section

## What I’ll build
- Add a transect tool to Springshed Explorer so users can choose a spring, draw a ridge-to-spring line on the map, or load a representative transect.
- Show the selected transect on the map with clearly marked ridge and spring-eye endpoints.
- Add a dedicated **Cross-Section** analysis page with an interactive 3D hydrogeological block, elevation profile, slope markers, and geological metrics.
- Visualize synthetic lithology contacts, fracture planes, water table, and animated recharge paths tied to the selected study area and spring.
- Include view controls for vertical exaggeration, geology visibility, water-table visibility, flow animation, and camera reset.

## Interaction flow
1. Select a spring or start the transect tool in Explorer.
2. Click a ridge point, then a spring/end point; the line remains visible on the map.
3. Open the cross-section workspace with that transect.
4. Orbit/zoom the 3D view, inspect elevation and strata, and adjust vertical exaggeration or overlays.

## Technical details
- Use React Three Fiber and Three.js for the 3D block, with procedural terrain/strata geometry and an orbit camera.
- Keep the 3D viewer client-only to avoid server-rendering issues.
- Extend the existing synthetic terrain model to sample elevation, slope, lithology, fractures, water table, and recharge metrics along a transect.
- Store the active transect in the existing client store so Explorer and the dedicated analysis page stay synchronized.
- Add route-specific metadata and a navigation entry for the new tool.
- Verify the workflow in both demo regions at desktop and mobile widths, including animation, map selection, and a clean browser console.
