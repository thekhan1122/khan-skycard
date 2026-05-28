
# 🌤️ Khan Skycard – Sky Edition (K‑Flow Card) Pre release.

[![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/thekhan1122E/khan-skycard?include_prereleases&label=pre-release)](https://github.com/thekhan1122E/khan-skycard/releases)
[![HACS Custom](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz/docs/faq/custom_repositories)

A beautiful, real‑time energy flow card for Home Assistant, **based on the original K‑Flow Card** but enhanced with a full photographic sky background, realistic sun/moon, and many visual improvements.  
This is the **Sky Edition** – a personal fork focused on atmospheric visuals.

![Preview](https://your-image-url.com/preview.png)   <!-- Replace with actual screenshot -->

---

## ✨ Features (vs original)

- 📸 **13 weather/time sky backgrounds** (clear, cloudy, rainy, night, dawn/dusk, snow, fog, thunderstorm)
- ☀️ **Realistic sun & moon** – dynamic position, colour temperature, crescent moon with earthshine
- 🔋 **Battery cylinder** – SOC %, voltage, fill animation, dual battery support
- ⚡ **Animated flow paths** – grid (cyan), battery (green), PV (yellow)
- 🏠 **Inverter badge** – name, temperature, load percentage
- 📊 **Detailed stats** – cell min/max, BMS temp, endurance, remaining capacity (Ah or kWh), daily totals
- 🚫 EV charger support (optional – can be removed)
- 🎨 **Fully customisable labels & sensors** – override any tile with your own entity
- 🧩 **Visual editor** – configure everything inside Home Assistant

---

## 🙏 Credit

This card is a **modified version** of the excellent [K‑Flow Card](https://github.com/thekhan1122/k-flow-card) by [Original Author].  
All credits for the core energy flow logic, SVG structure, and editor go to them.  
The **Sky Edition** adds photographic backgrounds, enhanced sun/moon rendering, and layout tweaks.

---

## 📥 Installation

### HACS (recommended)
1. Add this repository as a **custom repository** in HACS:
   - Type: `Lovelace`
   - URL: `https://github.com/thekhan1122/khan-skycard`
2. Install “Khan Skycard” from HACS.
3. Add the resource to your `configuration.yaml` or via UI:
   ```yaml
   resources:
     - url: /hacsfiles/khan-skycard/khan-skycard.js
       type: module
Manual
Download khan-skycard.js from the latest release.

Place it in your www/community/khan-skycard/ folder.

Add to configuration.yaml:

yaml
resources:
  - url: /local/community/khan-skycard/khan-skycard.js
    type: module
Sky images (required)
Download the sky image pack from the Releases page (file sky-images.zip) and extract to:

text
/config/www/community/khan-skycard/sky/
The card will fall back to CSS gradients if images are missing.

⚙️ Configuration
Add as a custom card in your Lovelace dashboard:

yaml
type: custom:khan-skycard
pv1_power: sensor.goodwe_pv1_power
pv2_power: sensor.goodwe_pv2_power
grid_active_power: sensor.goodwe_active_power
battery_soc: sensor.jk_soc
battery_power: sensor.jk_power
battery_voltage: sensor.jk_voltage
...
All configuration options are identical to the original K‑Flow Card – use the visual editor (click the pencil icon) to explore and set your entities.

Key options:

Option	Default	Description
inverter_name	INV	Display name on the badge
battery_cap_unit	ah	ah or kwh – remaining capacity unit
battery_full_ah	0	Battery capacity in Ah (if unit = ah)
battery_full_wh	0	Battery capacity in kWh (if unit = kwh)
_show_battery2	false	Enable second battery
_show_ev	false	Show EV charger section
_labels_custom_entities	false	Unlock label overrides
invert_grid_power	true	GoodWe active_power: positive = export
weather_entity	weather.home	Entity for sky background
🖼️ Sky Image Pack
The sky images are not included in the main repository because of their size.
You must download the separate ZIP from the Releases page.

After extraction, the following files should exist:

text
sky-clear-day.png
sky-clear-dawn.png
sky-clear-dusk.png
sky-night-clear.png
sky-partlycloudy-day.png
sky-partlycloudy-night.png
sky-cloudy-day.png
sky-cloudy-night.png
sky-rainy-day.png
sky-rainy-night.png
sky-thunderstorm.png
sky-snowy-day.png
sky-fog-day.png
Place them in /local/community/khan-skycard/sky/ (create the folder if needed).

🔧 Customising Layout (advanced)
You can tweak positions, sizes, and fonts by editing khan-skycard.js:

What	Where to change
Battery position	translate(399, 126) inside battIconSection
Sun/moon arc	d="M 42,161 Q 260,42 472,161" and _sunData() formulas
Flow lines	d="M ..." attributes of flowGridIn, flowBattOut, etc.
Font sizes	Search for font-size in SVG and CSS blocks
Lower block vertical position	.kfc-content { transform:translateY(-14%) }
After editing, clear your browser cache and restart Home Assistant.

📜 License
Personal & Non‑Commercial Use – Forking Allowed
Copyright © 2025 [Your Name]

This software is free to use, modify, and fork for personal, non‑commercial purposes only.
You may not use it commercially (e.g., sell it, include it in a paid product, or use it for any commercial advantage).
Any redistribution must remain non‑commercial and include this license notice.

See the LICENSE file for full details.

🤝 Support & Contributions
Open an issue for bugs or questions.

Pull requests are welcome – but any contributed code will be subject to the same non‑commercial license.

🧪 Pre‑Release Note
This is a pre‑release (v2.0.0-pre).

Sky images are not bundled in the repository – download separately from Releases.

Tested with GoodWe & JK BMS sensors; other inverters may need sensor mapping adjustments.

Report bugs via GitHub issues.

Enjoy your energy flow with a beautiful sky! ☀️🌙

text

---

## ✅ Instructions to use

1. Replace `thekhan1122E` with your actual GitHub username in all places (the repository URL and the release link).
2. Replace `your-image-url.com/preview.png` with an actual screenshot link (you can upload an image to the repository and use the raw URL).
3. Replace `[Original Author]` and the original K‑Flow Card link if you know it; otherwise just write “the original K‑Flow Card by rsc (or unknown)”.
4. Save the file as `README.md` and commit it to your repository root.

Now your `khan-skycard` repository has a complete, professional README that explains everything – from installation to customisation – while clearly stating your non‑commercial, fork‑allowed license.
