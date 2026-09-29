# SpringWatch AI

Please build the complete SpringSage AI application according to the attached specification:

# PROJECT: SPRINGSAGE AI

## Build a complete, functional, premium-quality AI-powered geospatial web application

Act as a senior full-stack developer, geospatial AI engineer, hydrogeologist, GIS specialist, and award-winning UI/UX designer.

Build a complete, interactive, responsive, professional website named **SpringSage AI**.

The website is a prototype for a Smart India Hackathon project under the Ministry of Tribal Affairs, focused on Agriculture, Food and Rural Technology.

The objective is to help government departments, watershed officers, hydrogeologists, NGOs, and tribal communities identify probable spring recharge zones, prioritize spring-revival interventions, visualize groundwater recharge suitability, and monitor spring health using geospatial data, AI/ML, and field validation.

IMPORTANT: Do not create just a landing page, static mockup, or a collection of non-functional dashboard cards. Build a complete working application with functional navigation, map interactions, data visualization, analysis workflows, and a realistic demonstration mode.

If an actual backend or external dataset is unavailable, implement a working local demonstration with clearly labeled sample data and modular interfaces for connecting real data and models later. Never represent simulated data or predictions as verified real-world findings.

---

# 1. BRAND IDENTITY AND DESIGN THEME

Product name: SpringSage AI
Tagline: "Every Spring Has a Story. We Map Its Source."
Supporting tagline: "AI-Powered Springshed Intelligence for Sustainable Mountain Water."

Brand personality:
* Scientific, trustworthy, modern, precise, and environmentally responsible.
* Designed for government officials and technical field agencies.
* Visually sophisticated but easy to understand for non-technical users.
* Should look like a professionally designed environmental technology SaaS platform, not a generic AI dashboard.

## Color palette
Use a premium forest-green and warm-neutral design system.
Primary forest green: #174D3A
Deep green: #10382D
Accent green: #65A878
Water blue: #3999C6
Warm off-white: #F6F7F2
White: #FFFFFF
Dark text: #172720
Muted text: #718078
Warning amber: #E6A23C
Risk red: #C9564D

Use light mode as the default. The GIS map should use natural terrain colors, forest-green overlays, water-blue spring markers, amber warning zones, and transparent recharge heatmaps.
Use a dark green sidebar with a light main workspace. Keep contrast, typography, spacing, and visual hierarchy consistent.
Typography: Inter or Manrope for UI text. Use a refined, bold heading style with clear readable labels.

Design requirements:
* Premium, clean, minimal, and spacious.
* Rounded cards with 12–16px radius.
* Thin borders and subtle shadows.
* Consistent 8px spacing system.
* Smooth transitions and subtle hover effects.
* Professional line icons from Lucide.
* Realistic terrain maps, satellite imagery, contour lines, and hydrological visualizations.
* No excessive gradients, glassmorphism, neon colors, giant headings, or unnecessary animations.
* No generic robot illustrations or random AI stock images.
* Use skeleton loaders, useful empty states, validation messages, and functional notifications.

The website must be fully responsive on desktop, tablet, and mobile.
Desktop layout: fixed 250px sidebar, top navigation bar, and flexible main workspace. On the analysis page, the map should occupy approximately 65–75% of the usable workspace.

---

# 2. APPLICATION STRUCTURE AND NAVIGATION

Create a persistent sidebar with the SpringSage AI logo and the following functional navigation items:
1. Overview
2. Springshed Explorer
3. Recharge Analysis
4. Intervention Planner
5. Spring Monitoring
6. Field Surveys
7. Reports & Export
8. Data Sources
9. Settings

At the bottom of the sidebar, show:
* User profile: Watershed Analyst
* Role: Field & Planning Division
* Current demonstration region
* Online/offline status indicator

Top navigation bar:
* Breadcrumbs based on current page
* Search springs, villages, and regions
* Current selected study area
* Notifications button
* Help button
* Profile menu
* Toggle for demonstration mode

Every navigation item must open a real page or functional view. Implement routing and maintain the selected study area across relevant pages.

---

# 3. OVERVIEW DASHBOARD

Create an executive dashboard that gives a quick summary of spring health and recharge planning.

Header:
"Mountain Water Intelligence"
Subtitle: "Monitor spring systems, assess recharge potential, and prioritize field interventions."

Provide a prominent study area selector with these demonstration locations:
* Demo Himalayan Watershed
* Demo Tribal Springshed

Key metrics cards:
1. Total Springs Mapped: 42
2. Critical Springs at Risk: 9
3. High Recharge Potential Area: 18.4 sq km
4. Recommended Interventions: 27
5. Community Reliance: 14,850 people
6. Seasonal Discharge Trend: -18% vs 5-yr baseline

Dashboard sections:
* Interactive mini-map showing the selected watershed boundary, spring locations color-coded by discharge status, high recharge potential zones, and proposed intervention points. Clicking any element opens the full analysis view.
* Spring Health Distribution donut chart.
* Recharge Suitability Breakdown bar chart.
* Priority Action List table of top 5 critical springs.
* Quick Actions row: Run Recharge Analysis, Plan Interventions, Log Field Survey, Generate DPR Summary.
* Recent Activity Feed.

---

# 4. SPRINGSHED EXPLORER (INTERACTIVE GIS MAP)

An interactive map workspace with full layer controls, search, filter, and spring detail drawer.

Map requirements:
* Use Leaflet or Mapbox GL with terrain basemap, satellite imagery, and topographic style options.
* Layer toggle panel: Springs Layer, Elevation Contours, Drainage Network & Streams, Lineaments & Fault Zones, Land Use / Land Cover, Lithology / Geology, Recharge Potential Heatmap, Proposed Interventions, Watershed Boundary.
* Interactive map tools: Zoom, center on study area, full screen, opacity slider, legend, measure tool.
* Clicking a spring opens a slide-over panel showing full hydrological profile, discharge graph, vulnerability score, water quality, and action buttons.

---

# 5. RECHARGE SUITABILITY ANALYSIS (AI/ML ENGINE)

A dedicated geospatial AI analysis engine:
* Select analysis area and model type (Multi-Criteria AHP or Random Forest / Ensemble ML).
* Weight adjustment sliders for Elevation, Slope, Lineament Density, Drainage Density, Rainfall, LULC, Geology, Soil Permeability.
* "Run Recharge Assessment" button with animated processing state.
* Results display: Interactive classified heatmap (Very High, High, Moderate, Low, Very Low), statistics breakdown, feature importance chart, and model explanation drawer.

---

# 6. INTERVENTION PLANNER & DPR ESTIMATOR

Translates recharge zone predictions into engineering and watershed interventions:
* Recommended structures: Trenches, Check Dams, Percolation Ponds, Afforestation, Spring Chamber Renovation.
* Cost & Budget Estimator based on standard rural watershed schedules (INR).
* Exportable DPR (Detailed Project Report) Executive Summary generator.

---

# 7. SPRING MONITORING & TIME-SERIES ANALYTICS

Long-term temporal monitoring:
* Seasonal discharge comparison, water quality trends, precipitation correlation, and community impact tracker.

---

# 8. FIELD SURVEYS & COMMUNITY VALIDATION (GROUND TRUTHING)

Citizen science and field hydrogeologist data collection module:
* Interactive survey form with GPS tagging, discharge rate calculation, water quality parameters, and photo upload simulation.
* Table of submitted surveys with approval workflow.

---

# 9. REPORTS, DATA EXPORT & AUDIT

Comprehensive export hub:
* Generate PDF / summary reports, GeoJSON / Shapefile / CSV data exports.

---

# 10. REALISTIC SAMPLE DATASETS

Include realistic hydrological and geospatial demo data for Himalayan and Central Indian tribal springsheds.

Build the complete, functional application with polished UI, realistic mock data, and smooth navigation.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://springsage-watershed-mapper.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e33c934a-7a31-4a40-be0f-2189d2316f33).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
