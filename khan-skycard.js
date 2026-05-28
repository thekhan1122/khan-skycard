// khan-skycard.js – Sky Edition v2.0.0
// ═══════════════════════════════════════════════════════════════
// CHANGELOG
// ═══════════════════════════════════════════════════════════════
//
// Sky v2.0.0  �  Full photographic background + visual overhaul
//   LAYOUT
//   - Background: full-card photographic PNG (13 weather/time variants).
//     Sky images live at /local/community/khan-skycard/sky/
//     Names: sky-clear-day, sky-clear-dawn, sky-clear-dusk,
//            sky-night-clear, sky-partlycloudy-day, sky-partlycloudy-night,
//            sky-cloudy-day, sky-cloudy-night, sky-rainy-day, sky-rainy-night,
//            sky-thunderstorm, sky-snowy-day, sky-fog-day
//   - Grid tower and house are part of the photo � SVG icon overlays removed.
//   - Battery cylinder removed from photo; SVG battery (fill bar, SOC %, voltage)
//     retained on the RIGHT side, mirrored from previous left position.
//   - Grid pylon moved to LEFT to match photo composition.
//   INVERTER
//   - Large INV box replaced with a tiny amber-bordered pill badge (64×22 px)
//     positioned between the house window pillars at (228, 311).
//   - Floating glassmorphism banner above the badge shows INV name, TEMP, LOAD %.
//   CELESTIAL
//   - Arc path, horizon line, rise/set dots and time labels removed.
//   - Sun and moon travel freely without an arc.
//   - Sun (_sunOrbHTML): full photorealistic rewrite � atmospheric scatter halo,
//     mid corona, inner halo, 16 alternating corona rays (inline SVG, 1 rpm rotation),
//     brilliant core with 4-layer box-shadow. Colour shifts horizon-orange → zenith-white.
//   - Moon (_moonSVG): full rewrite � SVG mask crescent, earthshine blue glow,
//     limb-darkening surface gradient, 6 craters clipped to lit face, limb brightening.
//   FLOW PATHS
//   - All paths rerouted to tiny INV badge: grid and battery converge at y=320;
//     load runs vertically from y=430 to badge bottom at y=335.
//   PV / PWR BAR
//   - PV blocks: flat uniform-height coloured segments (green → cyan → yellow).
//   - PWR bar: square-cornered with live percentage label, colour blue → orange.
//
// v1.1.0  �  Unified Edition (see git history for full notes)

// ═══════════════════════════════════════════════════════════════
// VISUAL EDITOR
// ═══════════════════════════════════════════════════════════════
class KhanSkyCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
    this._attached = false;
    this._rendered = false;
    this._ownChange = false;
  }

  connectedCallback() {
    this._attached = true;
    this._render();
  }

  setConfig(config) {
    this._config = { ...config };
    if (this._ownChange) return;
    if (this._attached) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered && this._attached) {
      this._render();
    } else {
      this.querySelectorAll('ha-selector').forEach(el => { el.hass = hass; });
    }
  }

  _fireChanged() {
    this._ownChange = true;
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: { ...this._config } },
      bubbles: true,
      composed: true,
    }));
    Promise.resolve().then(() => { this._ownChange = false; });
  }

  _set(key, value) {
    if (this._config[key] === value) return;
    this._config = { ...this._config, [key]: value };
    this._fireChanged();
    if (key === '_show_battery' || key === '_show_battery2' || key === '_show_pv_extra' ||
        key === '_show_ev'      || key === 'battery_cap_unit' || key === '_labels_custom_entities' ||
        key === 'label_cell_temp_minmax' || key === 'label_bms_temp'         ||
        key === 'label_min_cell'         || key === 'label_max_cell'         ||
        key === 'label_batt_dis'         || key === 'label_total_pv_gen'     ||
        key === 'label_entity_cell_temp' || key === 'label_entity_bms_temp'  ||
        key === 'label_entity_min_cell'  || key === 'label_entity_max_cell'  ||
        key === 'label_entity_batt_dis'  || key === 'total_pv_gen_entity')
      this._render();
  }

  _render() {
    if (!this._hass) return;
    if (!this._sectionOpen) this._sectionOpen = {};
    const cfg = this._config;
    const showBatt1 = !!(cfg._show_battery !== false);
    const showBatt2 = !!(cfg._show_battery2);
    const showPVExtra = !!(cfg._show_pv_extra);
    const showEV = !!(cfg._show_ev);
    const capUnit = cfg.battery_cap_unit || 'ah'; // 'ah' or 'kwh'

    const style = `
      <style>
        :host { display: block; font-family: var(--paper-font-body1_-_font-family, inherit); }
        .section {
          margin-bottom: 16px;
          border: 1px solid var(--divider-color, rgba(0,0,0,.12));
          border-radius: 10px;
          overflow: hidden;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: var(--secondary-background-color, rgba(0,0,0,.04));
          font-size: .82rem;
          font-weight: 700;
          letter-spacing: .5px;
          text-transform: uppercase;
          color: var(--secondary-text-color);
          cursor: default;
        }
        .section-header.toggleable { cursor: pointer; user-select: none; }
        .section-header .toggle-chip {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: .72rem;
          font-weight: 600;
          letter-spacing: .3px;
          text-transform: none;
          padding: 2px 10px 2px 6px;
          border-radius: 20px;
          background: var(--card-background-color, #fff);
          border: 1px solid var(--divider-color, rgba(0,0,0,.15));
          color: var(--primary-text-color);
          transition: background .15s;
        }
        .section-header .toggle-chip.on {
          background: var(--primary-color, #03a9f4);
          border-color: var(--primary-color, #03a9f4);
          color: #fff;
        }
        .section-body { padding: 12px 14px 4px; }
        .row {
          display: block;
          margin-bottom: 6px;
        }
        .row-label {
          display: block;
          font-size: .78rem;
          font-weight: 500;
          color: var(--primary-text-color);
          margin-bottom: 3px;
          padding-left: 2px;
          line-height: 1.3;
        }
        .row-label small {
          display: inline;
          font-size: .68rem;
          color: var(--secondary-text-color);
          margin-left: 5px;
        }
        .row-input { display: block; width: 100%; }
        ha-selector, ha-textfield { width: 100%; display: block; }
        ha-textfield { --mdc-shape-small: 6px; }
        .divider { height: 1px; background: var(--divider-color, rgba(0,0,0,.08)); margin: 4px 0 14px; }
      </style>
    `;

    const shell = document.createElement('div');
    shell.innerHTML = style;

    const makeSection = (sectionId, icon, title, rows, opts = {}) => {
      if (this._sectionOpen[sectionId] === undefined) this._sectionOpen[sectionId] = (sectionId === 'general');
      const isOpen = this._sectionOpen[sectionId];
      const sec = document.createElement('div');
      sec.className = 'section';
      const hdr = document.createElement('div');
      hdr.className = 'section-header toggleable';
      // Chevron � styled as a small disclosure button
      const chevron = document.createElement('span');
      chevron.textContent = isOpen ? '▼' : '▶';
      chevron.style.cssText = [
        'display:inline-flex',
        'align-items:center',
        'justify-content:center',
        'width:20px',
        'height:20px',
        'min-width:20px',
        'border-radius:5px',
        'background:var(--secondary-background-color,rgba(255,255,255,.07))',
        'border:1px solid var(--divider-color,rgba(255,255,255,.15))',
        'font-size:.7rem',
        'line-height:1',
        `color:${isOpen ? 'var(--primary-color,#03a9f4)' : 'var(--secondary-text-color,#aaa)'}`,
        'flex-shrink:0',
        'transition:color .15s,background .15s',
        'cursor:pointer',
        'user-select:none',
      ].join(';');
      hdr.appendChild(chevron);
      const titleSpan = document.createElement('span');
      titleSpan.textContent = `${icon} ${title}`;
      hdr.appendChild(titleSpan);
      // Click anywhere on header (except toggle-chip) to collapse/expand
      hdr.addEventListener('click', () => {
        this._sectionOpen[sectionId] = !this._sectionOpen[sectionId];
        this._render();
      });
      if (opts.toggleKey) {
        const chip = document.createElement('span');
        chip.className = 'toggle-chip' + (opts.toggleOn ? ' on' : '');
        chip.innerHTML = opts.toggleOn ? `✓ Enabled` : `＋ Enable`;
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          this._set(opts.toggleKey, !opts.toggleOn);
        });
        hdr.appendChild(chip);
      }
      sec.appendChild(hdr);
      // Body visible when section is open AND content not suppressed by toggle
      const bodyVisible = isOpen && !opts.hidden;
      if (bodyVisible) {
        const body = document.createElement('div');
        body.className = 'section-body';
        rows.forEach(r => body.appendChild(r));
        sec.appendChild(body);
      }
      return sec;
    };

    const picker = (key, label, optional = false) => {
      const wrap = document.createElement('div');
      wrap.className = 'row';
      wrap.style.marginBottom = '14px';
      const lbl = document.createElement('div');
      lbl.className = 'row-label';
      lbl.textContent = label;
      if (optional) {
        const sm = document.createElement('small');
        sm.textContent = 'optional';
        lbl.appendChild(sm);
      }
      const inputWrap = document.createElement('div');
      inputWrap.className = 'row-input';
      const sel = document.createElement('ha-selector');
      sel.hass = this._hass;
      sel.selector = { entity: {} };
      sel.value = cfg[key] || '';
      sel._configKey = key;
      sel.addEventListener('value-changed', (ev) => {
        ev.stopPropagation();
        this._set(key, ev.detail.value || '');
      });
      inputWrap.appendChild(sel);
      wrap.appendChild(lbl);
      wrap.appendChild(inputWrap);
      return wrap;
    };

    // Text field � native input, commits on blur/Enter only.
    // ha-selector(text) fires value-changed per keystroke → triggers setConfig → _render → destroys field.
    const textField = (key, label, placeholder = '') => {
      const wrap = document.createElement('div');
      wrap.className = 'row';
      wrap.style.marginBottom = '14px';
      const fieldBox = document.createElement('div');
      fieldBox.style.cssText = `
        display:block; position:relative;
        border:1px solid var(--divider-color, rgba(0,0,0,.42));
        border-radius:4px;
        padding:6px 12px 6px;
        background:var(--input-fill-color, var(--secondary-background-color, rgba(0,0,0,.04)));
        box-sizing:border-box; width:100%;
        transition: border-color .15s;
      `;
      fieldBox.addEventListener('focusin',  () => { fieldBox.style.borderColor = 'var(--primary-color, #03a9f4)'; });
      fieldBox.addEventListener('focusout', () => { fieldBox.style.borderColor = 'var(--divider-color, rgba(0,0,0,.42))'; });
      const lbl = document.createElement('div');
      lbl.textContent = label;
      lbl.style.cssText = `font-size:.72rem; color:var(--secondary-text-color); margin-bottom:2px; line-height:1;`;
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = placeholder;
      input.value = cfg[key] !== undefined ? String(cfg[key]) : '';
      input.style.cssText = `
        display:block; width:100%; border:none; outline:none;
        background:transparent; color:var(--primary-text-color);
        font-size:.95rem; font-family:inherit; padding:0; box-sizing:border-box;
      `;
      // Commit ONLY on blur or Enter � prevents per-keystroke re-render
      const commit = (ev) => this._set(key, ev.target.value);
      input.addEventListener('change', commit);
      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') ev.target.blur(); });
      fieldBox.appendChild(lbl);
      fieldBox.appendChild(input);
      wrap.appendChild(fieldBox);
      return wrap;
    };

    // Number field � native input, commits on blur/Enter only (same reason as textField).
    const numberField = (key, label, min, max, step, unit = '') => {
      const wrap = document.createElement('div');
      wrap.className = 'row';
      wrap.style.marginBottom = '14px';
      const fieldBox = document.createElement('div');
      fieldBox.style.cssText = `
        display:block; position:relative;
        border:1px solid var(--divider-color, rgba(0,0,0,.42));
        border-radius:4px;
        padding:6px 12px 6px;
        background:var(--input-fill-color, var(--secondary-background-color, rgba(0,0,0,.04)));
        box-sizing:border-box; width:100%;
        transition: border-color .15s;
      `;
      fieldBox.addEventListener('focusin',  () => { fieldBox.style.borderColor = 'var(--primary-color, #03a9f4)'; });
      fieldBox.addEventListener('focusout', () => { fieldBox.style.borderColor = 'var(--divider-color, rgba(0,0,0,.42))'; });
      const lbl = document.createElement('div');
      lbl.textContent = unit ? `${label}  (${unit})` : label;
      lbl.style.cssText = `font-size:.72rem; color:var(--secondary-text-color); margin-bottom:2px; line-height:1;`;
      const input = document.createElement('input');
      input.type = 'number';
      input.min = String(min); input.max = String(max); input.step = String(step);
      input.value = cfg[key] !== undefined && cfg[key] !== '' ? String(cfg[key]) : '';
      input.style.cssText = `
        display:block; width:100%; border:none; outline:none;
        background:transparent; color:var(--primary-text-color);
        font-size:.95rem; font-family:inherit; padding:0; box-sizing:border-box;
      `;
      // Commit ONLY on blur or Enter � prevents per-keystroke re-render
      const commit = (ev) => {
        let v = parseFloat(ev.target.value);
        if (isNaN(v)) return;
        // Hard-clamp to declared range � browser max attr is advisory only
        v = Math.min(max, Math.max(min, v));
        // Round to step precision to avoid float noise
        if (step >= 1) v = Math.round(v);
        ev.target.value = String(v); // reflect clamped value back into field
        this._set(key, v);
      };
      // oninput: truncate while typing so user can't exceed max digit count
      input.addEventListener('input', () => {
        const raw = input.value.replace(/[^0-9.]/g, '');
        const v = parseFloat(raw);
        if (!isNaN(v) && v > max) input.value = String(max);
      });
      input.addEventListener('change', commit);
      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') ev.target.blur(); });
      fieldBox.appendChild(lbl);
      fieldBox.appendChild(input);
      wrap.appendChild(fieldBox);
      return wrap;
    };


    // Native CSS pill toggle
    const switchRow = (key, labelText, hintText = '') => {
      const wrap = document.createElement('div');
      wrap.className = 'row';
      wrap.style.cssText = 'margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;';
      const left = document.createElement('div');
      left.style.flex = '1';
      const lbl = document.createElement('div');
      lbl.className = 'row-label';
      lbl.style.marginBottom = '2px';
      lbl.textContent = labelText;
      left.appendChild(lbl);
      if (hintText) {
        const hint = document.createElement('div');
        hint.style.cssText = 'font-size:.68rem;color:var(--secondary-text-color);line-height:1.4;';
        hint.textContent = hintText;
        left.appendChild(hint);
      }
      const pillLabel = document.createElement('label');
      pillLabel.style.cssText = 'position:relative;display:inline-block;width:40px;height:22px;flex-shrink:0;cursor:pointer;';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!cfg[key];
      cb.style.cssText = 'opacity:0;width:0;height:0;position:absolute;';
      const track = document.createElement('span');
      const knob  = document.createElement('span');
      const sync = () => {
        track.style.cssText = 'position:absolute;inset:0;border-radius:11px;transition:background .2s;background:' +
          (cb.checked ? 'var(--primary-color,#03a9f4)' : 'var(--divider-color,rgba(0,0,0,.25))') + ';';
        knob.style.cssText  = 'position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;' +
          'box-shadow:0 1px 3px rgba(0,0,0,.35);transition:left .2s;left:' + (cb.checked ? '21px' : '3px') + ';';
      };
      sync();
      cb.addEventListener('change', () => { sync(); this._set(key, cb.checked); });
      pillLabel.appendChild(cb);
      pillLabel.appendChild(track);
      pillLabel.appendChild(knob);
      wrap.appendChild(left);
      wrap.appendChild(pillLabel);
      return wrap;
    };

    const divider = () => {
      const d = document.createElement('div');
      d.className = 'divider';
      return d;
    };

    // ═══ Build sections ═══

    // ── Battery capacity radio helper ──
    const battCapUnit = cfg.battery_cap_unit || 'ah';
    const battCapRadio = (() => {
      const outer = document.createElement('div');
      // Radio row
      const radioWrap = document.createElement('div');
      radioWrap.style.cssText = 'display:flex;gap:18px;margin-bottom:10px;';
      const rName = 'bcr_' + Math.random().toString(36).slice(2);
      ['ah', 'kwh'].forEach(unit => {
        const lbl = document.createElement('label');
        lbl.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:.82rem;cursor:pointer;color:var(--primary-text-color);';
        const rb = document.createElement('input');
        rb.type = 'radio'; rb.name = rName; rb.value = unit; rb.checked = battCapUnit === unit;
        rb.style.accentColor = 'var(--primary-color,#03a9f4)';
        rb.addEventListener('change', () => { if (rb.checked) this._set('battery_cap_unit', unit); });
        lbl.appendChild(rb);
        lbl.appendChild(document.createTextNode(unit === 'ah' ? 'Ah (Amp-hours)' : 'kWh'));
        radioWrap.appendChild(lbl);
      });
      outer.appendChild(radioWrap);
      // Show the relevant field
      if (battCapUnit === 'ah') {
        outer.appendChild(numberField('battery_full_ah', 'Battery Capacity', 0, 999, 1, 'Ah'));
      } else {
        outer.appendChild(numberField('battery_full_wh', 'Battery Capacity', 0, 999.99, 0.01, 'kWh'));
      }
      return outer;
    })();

    // Capacity group wrapper � plain div, not .row, to avoid nested margin-bottom doubling
    const capGroupWrap = document.createElement('div');
    capGroupWrap.style.marginBottom = '14px';
    const capGroupLbl = document.createElement('div');
    capGroupLbl.className = 'row-label';
    capGroupLbl.textContent = 'Battery Capacity';
    capGroupWrap.appendChild(capGroupLbl);
    capGroupWrap.appendChild(battCapRadio);

    shell.appendChild(makeSection('general', '⚙️', 'General', [
      textField('inverter_name', 'Inverter Name', 'e.g. My Inverter'),
      divider(),
      capGroupWrap,
      divider(),
      numberField('pv_max_power',       'PV Array Max Power',    0, 30000, 100, 'W'),
      numberField('inverter_max_power', 'Inverter Max Power',    0, 20000, 100, 'W'),
      divider(),
      picker('weather_entity', 'Weather Entity (for sky images � optional)'),
    ]));

    // ── Labels: global gate + per-row activation ──
    // Gate: section chip toggles _labels_custom_entities (body hidden when off).
    // Per-row: entity picker activates only when that row's label text differs from its default.
    const labelsEnabled = !!(cfg._labels_custom_entities);

    // Helper: entity picker that can be visually disabled
    const pickerMaybeDisabled = (key, label, disabled = false, optional = false) => {
      const wrap = picker(key, label, optional);
      if (disabled) {
        wrap.style.position = 'relative';
        const veil = document.createElement('div');
        veil.style.cssText = [
          'position:absolute', 'inset:0', 'border-radius:6px',
          'background:var(--secondary-background-color,rgba(0,0,0,.06))',
          'opacity:.55', 'pointer-events:all', 'cursor:not-allowed',
          'z-index:10',
        ].join(';');
        const note = document.createElement('div');
        note.style.cssText = [
          'position:absolute', 'inset:0', 'display:flex', 'align-items:center',
          'justify-content:center', 'font-size:.68rem', 'font-weight:600',
          'color:var(--secondary-text-color)', 'letter-spacing:.3px',
          'pointer-events:none', 'z-index:11',
        ].join(';');
        note.textContent = '⛔ Overridden by Labels section';
        wrap.appendChild(veil);
        wrap.appendChild(note);
      }
      return wrap;
    };

    // Per-row active (lock): true when global gate ON AND label text ≠ default AND entity is selected
    // Only lock Battery pickers if user has BOTH renamed the label AND picked a custom entity.
    const _labelChanged = (key, def) => labelsEnabled && (cfg[key] || def) !== def;
    const _labelLocked  = (textKey, def, entityKey) => _labelChanged(textKey, def) && !!(cfg[entityKey]);
    const cellTempActive   = _labelChanged('label_cell_temp_minmax', 'CELL TEMP MIN/MAX');
    const bmsTempActive    = _labelChanged('label_bms_temp',         'BMS TEMP');
    const minCellActive    = _labelChanged('label_min_cell',         'Min Cell');
    const maxCellActive    = _labelChanged('label_max_cell',         'Max Cell');
    const battDisActive    = _labelChanged('label_batt_dis',         'Batt Dis.');
    const totalPvGenActive = _labelChanged('label_total_pv_gen',     'TOTAL PV GEN.');
    // Lock flags for Battery section pickers (stricter � requires entity also set)
    const cellTempLocked   = _labelLocked('label_cell_temp_minmax', 'CELL TEMP MIN/MAX', 'label_entity_cell_temp');
    const bmsTempLocked    = _labelLocked('label_bms_temp',         'BMS TEMP',          'label_entity_bms_temp');
    const minCellLocked    = _labelLocked('label_min_cell',         'Min Cell',          'label_entity_min_cell');
    const maxCellLocked    = _labelLocked('label_max_cell',         'Max Cell',          'label_entity_max_cell');
    const battDisLocked    = _labelLocked('label_batt_dis',         'Batt Dis.',         'label_entity_batt_dis');

    // Label rows � text field + entity picker with live state preview
    const labelRow = (textKey, textLabel, textPlaceholder, entityKey, active = false) => {
      const frag = document.createDocumentFragment();
      frag.appendChild(textField(textKey, textLabel, textPlaceholder));
      const entityRow = document.createElement('div');
      entityRow.style.cssText = 'margin-top:-6px;margin-bottom:14px;';
      const entityLabel = document.createElement('div');
      entityLabel.style.cssText = 'font-size:.72rem;color:var(--secondary-text-color);padding:0 2px 3px;line-height:1;display:flex;align-items:center;gap:6px;';
      entityLabel.textContent = active ? 'Entity (overrides default)' : 'Entity � change label to unlock';
      // State preview badge � shows current entity state text (e.g. "charging", "on grid backup mode")
      const currentEntityId = cfg[entityKey];
      if (active && currentEntityId && this._hass && this._hass.states[currentEntityId]) {
        const stateVal = this._hass.states[currentEntityId].state;
        const badge = document.createElement('span');
        badge.textContent = stateVal;
        badge.style.cssText = [
          'font-size:.65rem', 'font-weight:700', 'letter-spacing:.3px',
          'padding:1px 7px', 'border-radius:20px',
          'background:var(--primary-color,#03a9f4)', 'color:#fff',
          'text-transform:capitalize', 'flex-shrink:0',
        ].join(';');
        entityLabel.appendChild(badge);
      }
      const sel = document.createElement('ha-selector');
      sel.hass = this._hass;
      sel.selector = { entity: {} };
      sel.value = cfg[entityKey] || '';
      sel._configKey = entityKey;
      sel.style.cssText = 'width:100%;display:block;';
      if (!active) {
        sel.style.opacity = '0.4';
        sel.style.pointerEvents = 'none';
        sel.title = 'Change the label text above to unlock this entity picker';
      }
      sel.addEventListener('value-changed', (ev) => {
        ev.stopPropagation();
        this._set(entityKey, ev.detail.value || '');
      });
      entityRow.appendChild(entityLabel);
      entityRow.appendChild(sel);
      const wrapper = document.createElement('div');
      wrapper.appendChild(frag);
      wrapper.appendChild(entityRow);
      return wrapper;
    };

    // Info banner
    const labelInfoBanner = (() => {
      const info = document.createElement('div');
      info.style.cssText = 'font-size:.72rem;line-height:1.5;color:var(--secondary-text-color);background:var(--secondary-background-color,rgba(0,0,0,.04));border:1px solid var(--divider-color,rgba(0,0,0,.10));border-radius:7px;padding:7px 10px;margin-bottom:10px;';
      info.innerHTML = '&#x1F4A1; <strong>Tip:</strong> Rename a tile label to unlock its entity override. The matching sensor in the Battery section will lock automatically to prevent duplication.';
      return info;
    })();

    shell.appendChild(makeSection('labels', '🏷️', 'Labels', [
      labelInfoBanner,
      labelRow('label_cell_temp_minmax', 'Cell Temp Min/Max label', 'CELL TEMP MIN/MAX', 'label_entity_cell_temp', cellTempActive),
      labelRow('label_bms_temp',         'BMS Temp label',          'BMS TEMP',          'label_entity_bms_temp',  bmsTempActive),
      labelRow('label_min_cell',         'Min Cell label',          'Min Cell',          'label_entity_min_cell',  minCellActive),
      labelRow('label_max_cell',         'Max Cell label',          'Max Cell',          'label_entity_max_cell',  maxCellActive),
      labelRow('label_batt_dis',         'Batt Dis label',          'Batt Dis.',         'label_entity_batt_dis',  battDisActive),
      labelRow('label_total_pv_gen',     'Total PV Gen label',      'TOTAL PV GEN.',     'total_pv_gen_entity',    totalPvGenActive),
    ], { toggleKey: '_labels_custom_entities', toggleOn: labelsEnabled, hidden: !labelsEnabled }));

    shell.appendChild(makeSection('solar', '??', 'Solar', [
      picker('pv1_power', 'PV1 Power'),
      picker('pv2_power', 'PV2 Power'),
    ]));

    shell.appendChild(makeSection('solar_extra', '??', 'Extra PV Strings', [
      picker('pv3_power', 'PV3 Power', true),
      picker('pv4_power', 'PV4 Power', true),
    ], { toggleKey: '_show_pv_extra', toggleOn: showPVExtra, hidden: !showPVExtra }));

    shell.appendChild(makeSection('solar_extras', '??', 'Solar Extras', [
      picker('pv_total_power',  'Total PV Power',  true),
      divider(),
      picker('inv_temp',        'Inverter Temp'),
      picker('today_pv',        'Today PV Gen'),
      picker('today_batt_chg',  'Today Batt Charge'),
      picker('today_load',      'Today Load'),
      picker('consump',         'House Consumption'),
    ]));

    shell.appendChild(makeSection('grid', '🔌', 'Grid', [
      switchRow('invert_grid_power', '🔄 Invert grid power sign', 'Enable if positive = exporting (e.g. GoodWe active_power)'),
      divider(),
      picker('grid_active_power',  'Grid Active Power'),
      picker('grid_import_energy', 'Grid Import Energy'),
      picker('grid_export_energy', 'Grid Export Energy', true),
      picker('grid_power_alt',     'Alt Grid Sensor',    true),
    ]));

    shell.appendChild(makeSection('battery1', '??', 'Primary Battery', [
      switchRow('invert_battery_power', '🔄 Invert battery power sign', 'Enable if positive = discharging'),
      divider(),
      picker('battery_soc',      'Battery SOC'),
      picker('battery_power',    'Battery Power'),
      picker('battery_current',  'Battery Current'),
      picker('battery_voltage',  'Battery Voltage'),
      pickerMaybeDisabled('battery_temp1',    'Temp 1',           cellTempLocked),
      pickerMaybeDisabled('battery_temp2',    'Temp 2',           cellTempLocked),
      pickerMaybeDisabled('battery_mos',      'BMS Temp',         bmsTempLocked),
      pickerMaybeDisabled('battery_min_cell', 'Min Cell Voltage', minCellLocked),
      pickerMaybeDisabled('battery_max_cell', 'Max Cell Voltage', maxCellLocked),
      pickerMaybeDisabled('batt_dis',         'Discharge Today',  battDisLocked),
      divider(),
      picker('goodwe_battery_soc',  'Fallback SOC',     true),
      picker('goodwe_battery_curr', 'Fallback Current', true),
    ], { toggleKey: '_show_battery', toggleOn: showBatt1, hidden: !showBatt1 }));

    shell.appendChild(makeSection('battery2', '??', 'Secondary Battery', [
      switchRow('invert_battery_power', '🔄 Invert battery power sign', 'Shared with Primary'),
      divider(),
      picker('battery2_soc',      'SOC'),
      picker('battery2_power',    'Power'),
      picker('battery2_current',  'Current'),
      picker('battery2_voltage', 'Voltage'),
      pickerMaybeDisabled('battery2_mos',     'BMS Temp', bmsTempLocked),
      divider(),
      numberField('battery2_full_ah', 'Battery 2 Capacity (if different from Batt 1)', 0, 999, 1, 'Ah'),
      numberField('battery2_full_wh', 'Battery 2 Capacity (if different from Batt 1)', 0, 999.99, 0.01, 'kWh'),
    ], { toggleKey: '_show_battery2', toggleOn: showBatt2, hidden: !showBatt2 }));

    shell.appendChild(makeSection('ev', '🚗', 'EV / Car Charger', [
      picker('charger_state',           'Charger State'),
      picker('charger_power',           'Charger Power'),
      picker('charger_current',         'Charger Current'),
      picker('charger_soc',             'Car Battery SOC'),
      picker('charger_eta',             'Charge ETA (min)', true),
      numberField('charger_battery_capacity_wh', 'EV Battery Capacity', 0, 200000, 1, 'Wh'),
    ], { toggleKey: '_show_ev', toggleOn: showEV, hidden: !showEV }));

    this.innerHTML = '';
    this.appendChild(shell);
    this._rendered = true; // Fix #2: mark rendered so hass setter stops triggering full DOM rebuilds
  }
}
customElements.define('khan-skycard-editor', KhanSkyCardEditor);

// ═══════════════════════════════════════════════════════════════
// MAIN CARD
// ═══════════════════════════════════════════════════════════════
class KhanSkyCard extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this.config = {};
    this._prevPvTotal = -1;
    this._prevSunPos = { bx: -1, by: -1 };
    this._prevPvBlocksKey = '';
    this._prevSkyKey  = null; // sky image key cache
    this._skySlot     = 'A'; // A/B crossfade slot
    this.attachShadow({ mode: 'open' });
  }

  // Read weather condition from HA weather entity.
  // Auto-detects Met.no / Open-Meteo common entity IDs so the card works
  // out of the box without any manual configuration.
  _wxCondition() {
    // Candidate entity IDs � tries in order, uses first that exists in HA states
    const candidates = [
      this.config.weather_entity,          // user-configured (default: weather.home)
      'weather.home',                       // Met.no standard
      'weather.forecast_home',             // Met.no alternate
      'weather.home_hourly',               // Met.no hourly
      'weather.home_daily',                // Met.no daily
      'weather.open_meteo',                // Open-Meteo
      'weather.openweathermap',            // OpenWeatherMap
    ].filter(Boolean);

    let state = null;
    for (const eid of candidates) {
      const s = this._hass?.states[eid];
      if (s && s.state && s.state !== 'unavailable' && s.state !== 'unknown') {
        state = s.state.toLowerCase().replace(/-/g, '');
        break;
      }
    }
    if (!state) return 'clear'; // no weather entity found � default to clear

    if (state.includes('thunder') || state.includes('lightning'))                    return 'thunderstorm';
    if (state.includes('snow')    || state.includes('sleet') || state.includes('hail')) return 'snowy';
    if (state.includes('rain')    || state.includes('drizzle') || state.includes('shower')) return 'rainy';
    if (state.includes('fog')     || state.includes('mist') || state.includes('haze'))  return 'fog';
    if (state.includes('cloud')   || state.includes('overcast')) {
      return (state.includes('partly') || state.includes('few') || state.includes('scattered'))
        ? 'partlycloudy' : 'cloudy';
    }
    return 'clear';
  }

  static getStubConfig() {
    return {
      pv1_power: 'sensor.goodwe_pv1_power',
      pv2_power: 'sensor.goodwe_pv2_power',
      pv3_power: '',
      pv4_power: '',
      pv_total_power: 'sensor.goodwe_pv_power',
      grid_active_power: 'sensor.goodwe_active_power',
      grid_import_energy: 'sensor.goodwe_today_energy_import',
      grid_export_energy: '',
      consump: 'sensor.goodwe_house_consumption',
      today_pv: 'sensor.goodwe_today_s_pv_generation',
      today_batt_chg: 'sensor.goodwe_today_battery_charge',
      today_load: 'sensor.goodwe_today_load',
      battery_soc: 'sensor.jk_soc',
      battery_power: 'sensor.jk_power',
      battery_current: 'sensor.jk_current',
      battery_voltage: 'sensor.jk_voltage',
      battery_temp1: 'sensor.jk_temp1',
      battery_temp2: 'sensor.jk_temp2',
      battery_mos: 'sensor.jk_mos',
      battery_min_cell: 'sensor.jk_cellmin',
      battery_max_cell: 'sensor.jk_cellmax',
      goodwe_battery_soc: 'sensor.goodwe_battery_state_of_charge',
      goodwe_battery_curr: 'sensor.goodwe_battery_current',
      inv_temp: 'sensor.goodwe_inverter_temperature_module',
      batt_dis: 'sensor.goodwe_today_battery_discharge',
      battery2_soc: '',
      battery2_power: '',
      battery2_current: '',
      battery2_voltage: '',
      battery2_mos: '',
      battery_full_ah: 0,
      battery_full_wh: 0,
      battery_cap_unit: 'ah',
      battery2_full_ah: 0,
      battery2_full_wh: 0,
      inverter_max_power: 6000,
      pv_max_power: 7500,
      charger_state: '',
      charger_current: '',
      charger_power: '',
      charger_soc: '',
      charger_eta: '',
      charger_battery_capacity_wh: '',
      sun: 'sun.sun',
      weather_entity: 'weather.home',
      inverter_name: '',
      label_cell_temp_minmax: 'CELL TEMP MIN/MAX',
      label_bms_temp: 'BMS TEMP',
      label_endurance: 'ENDURANCE',
      label_min_cell: 'Min Cell',
      label_max_cell: 'Max Cell',
      label_batt_dis: 'Batt Dis.',
      total_pv_gen_entity: 'sensor.goodwe_total_pv_generation',
      label_total_pv_gen: 'TOTAL PV GEN.',
      label_entity_cell_temp: '',
      label_entity_bms_temp: '',
      label_entity_min_cell: '',
      label_entity_max_cell: '',
      label_entity_batt_dis: '',
      _labels_custom_entities: false,
      grid_power_alt: 'sensor.grid_phase_a_power',
      _show_battery: true,
      _show_battery2: false,
      invert_battery_power: false,
      invert_grid_power: true,   // GoodWe active_power: positive = export (inverted vs import convention)
      _show_pv_extra: false,   // combined toggle
      _show_ev: false,
    };
  }

  getCardSize() { return 8; }
  static getConfigElement() { return document.createElement('khan-skycard-editor'); }

  setConfig(config) {
    this.config = { ...KhanSkyCard.getStubConfig(), ...config };
    this._buildStaticSVG();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateDynamic();
    const sun = this._sunData();
    this._renderSky(sun, this._wxCondition());
  }

  _val(eid, toWatts = false) {
    if (!eid) return null;
    const s = this._hass?.states?.[eid];
    if (!s || s.state === 'unavailable' || s.state === 'unknown') return null;
    const v = parseFloat(s.state);
    if (isNaN(v)) return null;
    if (toWatts) {
      const unit = (s.attributes?.unit_of_measurement || '').trim();
      if (unit === 'kW' || unit === 'kilowatt') return v * 1000;
    }
    return v;
  }

  _strVal(eid) {
    if (!eid) return '';
    const s = this._hass?.states?.[eid];
    return s ? String(s.state).toLowerCase() : '';
  }

  _socColor(p) { return p<=25?'#f85149':p<=50?'#f39c4b':p<=75?'#58a6ff':'#4CAF50'; }
  _cellTempColor(t) { return t<=15?'#58a6ff':t<=35?'#3fb950':t<=45?'#f0883e':'#f85149'; }
  _cellVoltColor(v) { if(v<=0.001)return'#8b949e'; if(v<3.0)return'#f85149'; if(v<3.1)return'#f39c4b'; if(v<3.4)return'#f4d03f'; if(v<=3.65)return'#3fb950'; return'#f85149'; }
  _tempColor(t) { return t<=25?'#3fb950':t<=45?'#f0883e':'#f85149'; }
  _remCapColor(p) { return p<=15?'#e34d4c':p<=30?'#f39c4b':p<=55?'#f4d03f':'#2ecc71'; }
  _fmtTime(h) { if(!isFinite(h)||h<=0) return'--';const hh=Math.floor(h),mm=Math.round((h-hh)*60);return hh+'h '+(mm<10?'0':'')+mm+'m'; }
  _fmtEndurance(h) {
    if (!isFinite(h) || h < 0) return '--';
    const days = Math.floor(h / 24), hrs = Math.floor(h % 24), mins = Math.floor((h - Math.floor(h)) * 60);
    if (days > 0) return days + 'd ' + hrs + 'h';
    return hrs + 'h ' + (mins < 10 ? '0' : '') + mins + 'm';
  }
  _fmtTill(h) {
    // Fix #15: h > 0 guard was too strict � h approaching 0 from positive side
    // (battery at 0%, tiny charge power) returned 'Till --' despite a valid ETA.
    // Use h < 0 to reject only truly invalid/negative values.
    if (!isFinite(h) || h < 0) return 'Till --';
    const target = new Date(Date.now() + h * 3600000);
    const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][target.getDay()];
    let hr = target.getHours(); const ampm = hr >= 12 ? 'PM' : 'AM';
    hr = hr % 12 || 12;
    return 'Till ' + day + ' ' + hr + ':' + target.getMinutes().toString().padStart(2,'0') + ' ' + ampm;
  }

  _sunData() {
    const attrs = this._hass?.states[this.config.sun || 'sun.sun']?.attributes;
    // Sun position uses time-based t derived from today's ACTUAL rise/set times.
    // next_rising/next_setting flip to tomorrow after sunrise � we correct for this
    // by subtracting one day when the event is more than 18 h in the future.
    // elevation is used only for night detection and bell (arc height) � it is a
    // live real-time value and is never affected by the tomorrow-flip problem.
    let rise = '06:00', set = '18:00';
    let t = 0.5;
    let night = false;
    let bell = 0.5;

    // Return the nearest occurrence (today's) of an HA future-only ISO timestamp.
    // HA next_rising/next_setting are always in the future; after the event passes today
    // they flip to tomorrow. We detect this by checking if the event is > 18 h away �
    // if so, we step back one calendar day in LOCAL time (not UTC) to recover today's time.
    const nearestTime = iso => {
      if (!iso) return null;
      try {
        const future = new Date(iso);
        if ((future - Date.now()) > 18 * 3600000) {
          // Step back one day while preserving the exact local clock time
          future.setDate(future.getDate() - 1);
        }
        // Return local HH:MM (correct for user's timezone)
        return String(future.getHours()).padStart(2, '0') + ':' + String(future.getMinutes()).padStart(2, '0');
      } catch (e) { return null; }
    };

    if (attrs) {
      // Get today's actual rise / set for display labels AND position math
      rise = nearestTime(attrs.next_rising)  || rise;
      set  = nearestTime(attrs.next_setting) || set;

      const toMin = ts => { const p = ts.split(':').map(Number); return p[0] * 60 + p[1]; };
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const RISE = toMin(rise), SET = toMin(set);
      const dayLen = SET - RISE;

      // t: 0 = sunrise, 1 = sunset, clamped to [0,1]
      t = dayLen > 0 ? Math.max(0, Math.min(1, (nowMin - RISE) / dayLen)) : 0.5;

      // Night detection: prefer live elevation when available
      if (attrs.elevation != null) {
        night = parseFloat(attrs.elevation) < 0;
        // bell: how high the sun is (0 at horizon, 1 at max elevation)
        bell = Math.max(0, Math.sin(Math.max(0, parseFloat(attrs.elevation)) * Math.PI / 180));
      } else {
        night = nowMin < RISE || nowMin > SET;
        bell  = 1 - Math.pow(Math.abs(2 * t - 1), 1.5);
      }
    }

    // Sun position: left(42,161) → top(260,54) → right(472,161)
    const bx = Math.round((1 - t) * (1 - t) * 42 + 2 * (1 - t) * t * 260 + t * t * 472);
    const by = Math.round((1 - t) * (1 - t) * 161 + 2 * (1 - t) * t * 54 + t * t * 161);


    // Moon travels same arc right→left during night
    let mx = 260, my = 161;
    if (night) {
      const toMin2 = ts => { const p = ts.split(':').map(Number); return p[0] * 60 + p[1]; };
      const RISE2 = toMin2(rise), SET2 = toMin2(set);
      const nowMin2 = new Date().getHours() * 60 + new Date().getMinutes();
      const dayLen2 = SET2 > RISE2 ? SET2 - RISE2 : 0;
      const nightLen = Math.max(1, 1440 - dayLen2);
      let tMoon = nowMin2 >= SET2
        ? (nowMin2 - SET2) / nightLen
        : (nowMin2 + 1440 - SET2) / nightLen;
      tMoon = Math.max(0, Math.min(1, tMoon));
    // Moon direction: rises east (right side at sunset), sets west (left side at sunrise)
    // tMoon=0 = just after sunset (right/east horizon), tMoon=1 = just before sunrise (left/west horizon)
      mx = Math.round((1 - tMoon) * (1 - tMoon) * 42 + 2 * (1 - tMoon) * tMoon * 260 + tMoon * tMoon * 500);
      my = Math.round((1 - tMoon) * (1 - tMoon) * 161 + 2 * (1 - tMoon) * tMoon * 85 + tMoon * tMoon * 161);
    }
    return { rise, set, night, bell, bx, by, mx, my, t };
  }

  _battFill(soc){
    const ft=138,fb=269,fh=131;const fH=Math.round((soc||0)/100*fh),fY=fb-fH;let c,f,tc;
    if(soc<=20){c='#ff2200';f='url(#battGlowRed)';tc='#fff';}else if(soc<=40){c='#f4d03f';f='url(#battGlowOrange)';tc='#000';}else if(soc<=75){c='#44ff00';f='url(#battGlowGreen)';tc='#fff';}else{c='#00f0ff';f='url(#battGlowCyan)';tc='#fff';}
    return{y:fY,height:fH,color:c,filter:fH>4?f:'none',textColor:tc};
  }

  _flowLevel(w,type){
    if(type==='solar'){if(w<200)return{dur:4,size:1.8,count:6};if(w<600)return{dur:3.2,size:2.2,count:12};if(w<1200)return{dur:2.7,size:2.5,count:20};if(w<2500)return{dur:2.4,size:2.8,count:30};if(w<4000)return{dur:1.8,size:3.2,count:42};if(w<6000)return{dur:1.2,size:3.5,count:55};return{dur:.9,size:3.8,count:65};}
    if(w<150)return{dur:4,size:1.8,count:4};if(w<500)return{dur:3.2,size:2.2,count:8};if(w<1000)return{dur:2.7,size:2.5,count:14};if(w<2000)return{dur:2.4,size:2.8,count:22};if(w<3000)return{dur:1.8,size:3.2,count:30};if(w<4500)return{dur:1.5,size:3.5,count:40};return{dur:.9,size:3.8,count:50};
  }

  _buildPvBlocksHTML(pvTotal, pvMax) {
    const N = 17;
    const max = Math.max(pvMax, 1);
    const lit = Math.min(N, Math.max(0, Math.round((pvTotal / max) * N)));
    const offCol = 'rgba(255,255,255,0.07)';
    let onCol = offCol;
    if (lit > 0) {
      if (lit <= 7) onCol = '#3fb950';
      else if (lit <= 13) onCol = '#29b6f6';
      else onCol = '#ffe83c';
    }
    let html = '';
    for (let i = 0; i < N; i++) {
      html += `<div class="kfc-pv-seg" style="background:${i < lit ? onCol : offCol}"></div>`;
    }
    return html;
  }

  _buildPvWaveHTML(bx,by,pvT){
    if(pvT<=10)return'';const fl=this._flowLevel(pvT,'solar');const sY=by+28;const cp1Y=by+70;const cp2Y=by+90;const pD='M '+bx.toFixed(1)+','+sY.toFixed(1)+' C '+bx.toFixed(1)+','+cp1Y.toFixed(1)+' 260,'+cp2Y.toFixed(1)+' 260,290';const col='rgba(255,232,60,.95)',gc='rgba(255,190,20,.55)';const dD=(fl.dur*.8).toFixed(2),dL=(8+fl.size*1.5).toFixed(1),gL=(6+fl.size*1.2).toFixed(1),dT=(parseFloat(dL)+parseFloat(gL)).toFixed(1);let h='';h+='<path d="'+pD+'" fill="none" stroke="'+gc+'" stroke-width="6" stroke-dasharray="'+dL+' '+gL+'" stroke-linecap="round" opacity="0.25" filter="url(#arcSunF2)"><animate attributeName="stroke-dashoffset" from="'+dT+'" to="0" dur="'+dD+'s" repeatCount="indefinite" calcMode="linear"/></path>';h+='<path d="'+pD+'" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="1.8" stroke-dasharray="'+dL+' '+gL+'" stroke-linecap="round"><animate attributeName="stroke-dashoffset" from="'+dT+'" to="0" dur="'+dD+'s" repeatCount="indefinite" calcMode="linear"/></path>';h+='<path d="'+pD+'" fill="none" stroke="'+col+'" stroke-width="1.0" stroke-dasharray="'+dL+' '+gL+'" stroke-linecap="round" opacity="0.85"><animate attributeName="stroke-dashoffset" from="'+dT+'" to="0" dur="'+dD+'s" repeatCount="indefinite" calcMode="linear"/></path>';const wD=[{amp:6,dur:fl.dur*.9,ox:0,op:.9,sc:'rgba(255,255,255,0.92)',dLen:'3.0',dGap:'40.0'},{amp:10,dur:fl.dur*1.1,ox:3,op:.6,sc:col,dLen:'4.5',dGap:'50.0'}];const wc=Math.min(2,Math.max(1,Math.round(fl.count/5)));for(let wi=0;wi<wc;wi++){const w=wD[wi];const sC=Math.round(fl.count*.5),sD=w.dur.toFixed(2),sCy=(parseFloat(w.dLen)+parseFloat(w.dGap)).toFixed(1);for(let si=0;si<sC;si++){const fr=si/sC,ph=fr*Math.PI*2,sY2=(w.amp*Math.sin(ph+wi*1.1)).toFixed(1),sX=(w.ox+w.amp*.3*Math.cos(ph*.5)).toFixed(1),sDe=(fr*w.dur%w.dur).toFixed(3),sO=(w.op*(.5+.5*Math.abs(Math.sin(ph)))*.6).toFixed(2);h+='<g transform="translate('+sX+','+sY2+')"><path d="'+pD+'" fill="none" stroke="'+w.sc+'" stroke-width="1.2" stroke-dasharray="'+w.dLen+' '+w.dGap+'" stroke-linecap="round" opacity="'+sO+'"><animate attributeName="stroke-dashoffset" from="'+sCy+'" to="0" dur="'+sD+'s" begin="-'+sDe+'s" repeatCount="indefinite" calcMode="linear"/></path></g>';}}return h;
  }

  _buildStaticSVG() {
    const dual = !!(this.config._show_battery2);
    const showBatt1 = !!(this.config._show_battery !== false);
    const ev   = !!(this.config._show_ev);
    const showPvExtra = !!(this.config._show_pv_extra);
    const iconPath = '/local/community/khan-skycard';    // icons served from HACS community folder

    const pv3txt = showPvExtra ? `<text id="pv3label" x="8" y="424" font-size="9" fill="#8b949e" letter-spacing="1">PV3</text><text id="pv3FlowVal" x="8" y="438" font-size="12" font-weight="700" fill="#ffe83c">-- W</text>` : '';
    const pv4txt = showPvExtra ? `<text id="pv4label" x="8" y="456" font-size="9" fill="#8b949e" letter-spacing="1">PV4</text><text id="pv4FlowVal" x="8" y="470" font-size="12" font-weight="700" fill="#ffe83c">-- W</text>` : '';

    // EV placement — values only in 2-col layout near car inside garage, no icon
    const evtxt = ev ? `<g id="evGroup">
      <!-- EV flow: from house right side down into garage -->
      <path id="flowHomeEV" d="M 345,322 V 375" fill="none" stroke="#00aaff" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="6 5" opacity="0">
        <animate attributeName="stroke-dashoffset" from="11" to="0" dur="0.8s" repeatCount="indefinite" calcMode="linear"/>
      </path>
      <!-- EV stats: 2-column grid near car. Left col: W / A  Right col: % / ETA -->
      <text x="318" y="385" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,0.45)" letter-spacing="0.8">W</text>
      <text x="372" y="385" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,0.45)" letter-spacing="0.8">SOC</text>
      <text id="evPowerVal"   x="318" y="397" text-anchor="middle" font-size="11" font-weight="700" fill="#00aaff">-- W</text>
      <text id="evSocVal"     x="372" y="397" text-anchor="middle" font-size="11" font-weight="700" fill="#4ade80">-- %</text>
      <text x="318" y="408" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,0.45)" letter-spacing="0.8">A</text>
      <text x="372" y="408" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,0.45)" letter-spacing="0.8">ETA</text>
      <text id="evCurrentVal" x="318" y="419" text-anchor="middle" font-size="10" font-weight="600" fill="#88ccff">-- A</text>
      <text id="evEtaVal"     x="372" y="419" text-anchor="middle" font-size="10" font-weight="600" fill="#4ade80">--</text>
    </g>` : '';

    const batteryTip = `<rect x="75" y="122" width="18" height="6" rx="3" fill="url(#battCapGrad)"/>`;

    // Battery SVG – large cylinder matching model image, cyan fill, bold % text
    const battIconSection = !showBatt1 ? '' : (
      `<g transform="translate(399, 126) scale(0.86, 0.95)">
        <g id="battIconWrap">
          <!-- Outer shell -->
          <rect x="49" y="128" width="70" height="148" rx="12" fill="url(#battShellGrad)"/>
          ${batteryTip}
          <!-- Bottom cap -->
          <rect x="51" y="269" width="66" height="7" rx="3.5" fill="url(#battCapGrad)"/>
          <!-- Top rim -->
          <rect x="51" y="130" width="66" height="6" rx="3" fill="url(#battCapGrad)"/>
          <!-- Glass overlay -->
          <rect x="49" y="128" width="70" height="148" rx="12" fill="url(#battGlassBody)" style="pointer-events:none"/>
          <!-- Inner dark well -->
          <rect x="53" y="138" width="62" height="131" rx="9" fill="#080c10"/>` +
      (dual ? `
            <rect id="battFillBar1" x="53" y="269" width="30" height="0" rx="0" fill="#00f0ff" clip-path="url(#battBodyClipLeft)"/>
            <rect id="battFillHL1"  x="53" y="269" width="30" height="0" rx="0" fill="url(#battFillHighlight)" clip-path="url(#battBodyClipLeft)" style="pointer-events:none"/>
            <rect id="battFillBar2" x="85" y="269" width="30" height="0" rx="0" fill="#00f0ff" clip-path="url(#battBodyClipRight)"/>
            <rect id="battFillHL2"  x="85" y="269" width="30" height="0" rx="0" fill="url(#battFillHighlight)" clip-path="url(#battBodyClipRight)" style="pointer-events:none"/>
            <g id="battBoltGroup1" opacity="0"><polygon points="72,176 64,195 70,195 66,215 78,193 72,193 80,176" fill="#1a4aff" stroke="rgba(100,150,255,.5)" stroke-width="0.8" filter="url(#battGlowBolt)"><animate attributeName="opacity" values="0.5;1;0.5" dur="1.0s" repeatCount="indefinite"/></polygon></g>
            <g id="battBoltGroup2" opacity="0"><polygon points="104,176 96,195 102,195 98,215 110,193 104,193 112,176" fill="#1a4aff" stroke="rgba(100,150,255,.5)" stroke-width="0.8" filter="url(#battGlowBolt)"><animate attributeName="opacity" values="0.5;1;0.5" dur="1.0s" repeatCount="indefinite"/></polygon></g>
            <text id="fcBattVal1" x="68"  y="210" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">--%</text>
            <text id="fcBattVal2" x="100" y="210" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">--%</text>
          ` : `
            <rect id="battFillBar" x="53" y="269" width="62" height="0" rx="0" fill="#00f0ff" clip-path="url(#battBodyClip)"/>
            <rect id="battFillHL"  x="53" y="269" width="62" height="0" rx="0" fill="url(#battFillHighlight)" clip-path="url(#battBodyClip)" style="pointer-events:none"/>
            <g id="battBoltGroup" opacity="0"><polygon points="86,176 74,199 82,199 77,226 95,197 85,197 98,176" fill="#1a9fff" stroke="rgba(100,200,255,.6)" stroke-width="0.8" filter="url(#battGlowBolt)"><animate attributeName="opacity" values="0.5;1;0.5" dur="1.0s" repeatCount="indefinite"/></polygon></g>
            <!-- Big bold % text – matches model image -->
            <text id="fcBattVal" x="84" y="215" text-anchor="middle" font-size="19" font-weight="800" fill="#fff">--%</text>
          `) +
      `</g>
      </g>`
    );

    this.shadowRoot.innerHTML = `<style>
      :host{display:block} @keyframes svgPulseOrange{0%,100%{filter:drop-shadow(0 0 5px #f39c4b)}50%{filter:drop-shadow(0 0 8px #f5b06a)}}
      @keyframes kfcTwinkle{0%,100%{opacity:.10}50%{opacity:.85}}
      @keyframes kfcRain{0%{transform:translateY(-30px) skewX(-10deg)}100%{transform:translateY(110%) skewX(-10deg)}}
      @keyframes kfcSnow{0%{transform:translateY(-10px) translateX(0)}25%{transform:translateY(28%) translateX(8px)}50%{transform:translateY(56%) translateX(-5px)}75%{transform:translateY(82%) translateX(9px)}100%{transform:translateY(110%) translateX(3px)}}
      @keyframes kfcLightning{0%,85%,88%,92%,100%{opacity:0}86%,90%{opacity:.8}}
      @keyframes kfcFogDrift{0%{transform:translateX(-6%)}100%{transform:translateX(6%)}}
      @keyframes kfcSunPulse{0%,100%{opacity:.16;transform:translate(-50%,-50%) scale(1)}50%{opacity:.28;transform:translate(-50%,-50%) scale(1.07)}}
      .kfc-shell{position:relative;overflow:hidden;border-radius:14px;padding:10px 8px;
        box-shadow:0 4px 28px rgba(0,0,0,.65);width:100%;box-sizing:border-box;
        border:1px solid rgba(255,255,255,.06);background:rgb(21,47,85);transition:background 1.2s ease;
        font-family:'Segoe UI',system-ui,-apple-system,sans-serif}
      #kfcSkyDiv{position:absolute;top:0;left:0;right:0;height:58%;border-radius:14px 14px 0 0;overflow:hidden;pointer-events:none;z-index:0}
      .kfc-content{position:relative;z-index:1;margin-bottom:0}
      .st{background:transparent;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:9px 8px;text-align:left}
      .stm{padding-left:8px;padding-right:8px}
      .st .l{font-size:.56rem;color:#a8b4c8;letter-spacing:1.3px;text-transform:uppercase;margin-bottom:3px;font-weight:500;display:block;text-align:left}
      .st .v{font-size:0.95rem;font-weight:700;color:#dde8f8;display:block;text-align:left}
      .dv{height:1px;background:rgba(255,255,255,.07);margin:10px 0}
      .ct{font-size:.65rem;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#f39c4b;margin-bottom:8px;margin-top:10px;display:flex;align-items:center;gap:8px}
      .ct::after{content:'';flex:1;height:1px;background:rgba(243,156,75,0.22)}
      .pvf{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:2px}
      .pvi{text-align:center;background:transparent;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:6px 4px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
      .pvi .ico{font-size:1.7rem;margin-bottom:2px;display:block;text-align:center}
      .pvi .lbl{font-size:.58rem;color:#a8b4c8;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:2px;display:block;text-align:center}
      .pvi .val{font-size:1.1rem;font-weight:700;color:#dde8f8;display:block;text-align:center}
      .pvi .val.yw{color:#f4d03f} text{font-family:'Segoe UI',system-ui,-apple-system,sans-serif}
      .kfc-bars-row{display:flex;align-items:center;gap:8px;margin-top:10px;padding:0 1px}
      .kfc-bar-col{flex:1 1 0;min-width:0;display:flex;align-items:center;gap:4px}
      .kfc-bar-lbl{font-size:.7rem;color:#7a8fa8;letter-spacing:1.5px;font-weight:600;white-space:nowrap;flex-shrink:0}
      .kfc-bar-meter-wrap{flex:1 1 0;min-width:0;display:flex;align-items:center}
      .kfc-bar-pwr-slot{flex:1 1 0;min-width:0;position:relative;display:flex;align-items:center}
      .kfc-bar-pwr-slot .kfc-bar-meter-wrap{flex:1 1 0;width:100%;min-width:0}
      .kfc-bar-meter{width:90%;height:8px;flex:0 0 auto;display:flex;gap:2px;align-items:stretch;box-sizing:border-box}
      .kfc-bar-meter-pwr{position:relative;gap:0;height:8px;background:rgba(5,10,25,0.97);border-radius:3px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)}
      .kfc-pv-seg{flex:1 1 0;min-width:0;height:100%;border-radius:2px}
      .kfc-pwr-fill-area{position:absolute;left:0;top:0;bottom:0;right:0;overflow:hidden;border-radius:2px}
      #pwrBar{position:absolute;top:0;left:0;bottom:0;width:0%;height:100%;border-radius:2px;transition:width .4s ease,background .4s ease}
      .kfc-bar-pct{position:absolute;right:0;top:50%;transform:translateY(-50%);font-size:.58rem;font-weight:700;color:#29b6f6;line-height:1;white-space:nowrap;z-index:2;pointer-events:none}
    </style>
    <div class="kfc-shell" id="kfcShell">
      <div id="kfcSkyDiv" aria-hidden="true"></div>
      <div id="kfcBottomGrad" style="position:absolute;top:58%;left:0;right:0;bottom:0;pointer-events:none;z-index:0;border-radius:0 0 14px 14px;transition:background 1.4s ease"></div>
      <div class="kfc-content" style="transform:translateY(-14%)">
      <div class="ct">? Energy Flow <span id="battStatusBadge" style="margin-left:auto;font-size:.62rem;font-weight:700;letter-spacing:1.5px;padding:2px 10px;border-radius:8px;background:rgba(0,0,0,.32);color:#a8b4c8;text-transform:uppercase;border:1px solid rgba(255,255,255,.09)">IDLE</span></div>
      <div style="width:100%"><svg id="flowSvg" viewBox="0 0 520 450" style="width:100%;display:block">
      <defs>
        <filter id="arcSunF" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="7"/></filter>
        <filter id="arcSunF2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3"/></filter>
        <filter id="moonF"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <radialGradient id="dynAuraG" cx="50%" cy="45%" r="55%"><stop offset="0%" stop-color="rgba(30,100,200,.28)"/><stop offset="55%" stop-color="rgba(30,80,160,.10)"/><stop offset="100%" stop-color="rgba(0,0,0,0)"/></radialGradient>
        <radialGradient id="sunCG" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="rgba(255,255,220,.98)"/><stop offset="40%" stop-color="rgb(255,125,10)"/><stop offset="100%" stop-color="rgba(255,130,10,.6)"/></radialGradient>
        <linearGradient id="arcDayGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="rgba(255,180,50,0)"/><stop offset="20%" stop-color="rgba(255,200,70,.5)"/><stop offset="50%" stop-color="rgba(255,228,110,.92)"/><stop offset="80%" stop-color="rgba(255,200,70,.5)"/><stop offset="100%" stop-color="rgba(255,180,50,0)"/></linearGradient>
        <linearGradient id="arcNightGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="rgba(140,170,255,0)"/><stop offset="30%" stop-color="rgba(155,185,255,.35)"/><stop offset="50%" stop-color="rgba(200,215,255,.7)"/><stop offset="70%" stop-color="rgba(155,185,255,.35)"/><stop offset="100%" stop-color="rgba(140,170,255,0)"/></linearGradient>
        <linearGradient id="battCapGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#2d2d2d"/><stop offset="18%" stop-color="#8f8f8f"/><stop offset="50%" stop-color="#ececec"/><stop offset="82%" stop-color="#7a7a7a"/><stop offset="100%" stop-color="#242424"/></linearGradient>
        <linearGradient id="battShellGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#050505"/><stop offset="18%" stop-color="#111"/><stop offset="50%" stop-color="#080808"/><stop offset="82%" stop-color="#111"/><stop offset="100%" stop-color="#030303"/></linearGradient>
        <linearGradient id="battGlassBody" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="rgba(255,255,255,0.03)"/><stop offset="15%" stop-color="rgba(255,255,255,0.22)"/><stop offset="33%" stop-color="rgba(255,255,255,0.05)"/><stop offset="50%" stop-color="rgba(255,255,255,0)"/><stop offset="67%" stop-color="rgba(255,255,255,0.05)"/><stop offset="85%" stop-color="rgba(255,255,255,0.18)"/><stop offset="100%" stop-color="rgba(255,255,255,0.03)"/></linearGradient>
        <linearGradient id="battFillHighlight" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="rgba(255,255,255,0.02)"/><stop offset="20%" stop-color="rgba(255,255,255,0.22)"/><stop offset="48%" stop-color="rgba(255,255,255,0.44)"/><stop offset="60%" stop-color="rgba(255,255,255,0.12)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></linearGradient>
        ${dual?`<clipPath id="battBodyClipLeft"><rect x="53" y="138" width="30" height="131" rx="6"/></clipPath><clipPath id="battBodyClipRight"><rect x="85" y="138" width="30" height="131" rx="6"/></clipPath>`:`<clipPath id="battBodyClip"><rect x="53" y="138" width="62" height="131" rx="9"/></clipPath>`}
        <filter id="battGlowRed"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="battGlowOrange"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="battGlowGreen"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="battGlowCyan"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="battGlowBolt"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="iconGlowOrange" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10" result="b"/><feFlood flood-color="rgba(255,140,0,0.6)" result="c"/><feComposite in="c" in2="b" operator="in" result="d"/><feMerge><feMergeNode in="d"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="iconGlowBlue" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10" result="b"/><feFlood flood-color="rgba(30,144,255,0.6)" result="c"/><feComposite in="c" in2="b" operator="in" result="d"/><feMerge><feMergeNode in="d"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="iconGlowGreen" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10" result="b"/><feFlood flood-color="rgba(46,204,113,0.6)" result="c"/><feComposite in="c" in2="b" operator="in" result="d"/><feMerge><feMergeNode in="d"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="iconGlowYellow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10" result="b"/><feFlood flood-color="rgba(255,230,0,0.7)" result="c"/><feComposite in="c" in2="b" operator="in" result="d"/><feMerge><feMergeNode in="d"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="flowGlowCyan" x="-70%" y="-220%" width="240%" height="540%"><feGaussianBlur stdDeviation="3.2" result="b"/><feFlood flood-color="rgba(62,205,255,0.78)" result="c"/><feComposite in="c" in2="b" operator="in" result="d"/><feMerge><feMergeNode in="d"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="flowGlowGreen" x="-70%" y="-220%" width="240%" height="540%"><feGaussianBlur stdDeviation="3.2" result="b"/><feFlood flood-color="rgba(145,255,55,0.78)" result="c"/><feComposite in="c" in2="b" operator="in" result="d"/><feMerge><feMergeNode in="d"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <!-- Sun glow: pure radial gradients, perfectly circular, zero square artefact -->
        <radialGradient id="sunGlowG1" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(255,255,220,1)"/><stop offset="100%" stop-color="rgba(255,255,220,0)"/></radialGradient>
        <radialGradient id="sunGlowG2" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(255,240,160,1)"/><stop offset="100%" stop-color="rgba(255,240,160,0)"/></radialGradient>
        <radialGradient id="sunGlowG3" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(255,210,80,1)"/><stop offset="100%" stop-color="rgba(255,210,80,0)"/></radialGradient>
        <radialGradient id="sunGlowG4" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(255,170,30,1)"/><stop offset="100%" stop-color="rgba(255,170,30,0)"/></radialGradient>
        <radialGradient id="sunCoreGD" cx="50%" cy="38%" r="60%">
          <stop offset="0%"   stop-color="#ffffff"/>
          <stop offset="45%"  stop-color="#fffbe8"/>
          <stop offset="100%" stop-color="#ffe090"/>
        </radialGradient>
        <filter id="flowGlowRed" x="-70%" y="-220%" width="240%" height="540%"><feGaussianBlur stdDeviation="3.2" result="b"/><feFlood flood-color="rgba(255,55,55,0.72)" result="c"/><feComposite in="c" in2="b" operator="in" result="d"/><feMerge><feMergeNode in="d"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <marker id="arrowRed"   markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0.5 L0,4.5 L4.5,2.5 z" fill="#ff3434"/></marker>
        <marker id="arrowCyan"  markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0.5 L0,4.5 L4.5,2.5 z" fill="#00f0ff"/></marker>
        <marker id="arrowGreen" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0.5 L0,4.5 L4.5,2.5 z" fill="#39ff14"/></marker>
      </defs>
      <ellipse id="skyAura" cx="260" cy="84" rx="230" ry="110" fill="url(#dynAuraG)" opacity="0.35"/>
      <!-- ── SUN/MOON ARC ── -->
      <ellipse id="skyAura2" cx="260" cy="159" rx="230" ry="110" fill="url(#dynAuraG)" opacity="0"/>
      <!-- Dashed horizon line -->
      <line x1="55" y1="161" x2="477" y2="161" stroke="rgba(255,255,255,.18)" stroke-width="1" stroke-dasharray="4,9"/>
      <!-- Horizon dots: amber rise · white noon · orange-red set -->
      <circle cx="50"  cy="161" r="5"   fill="#f5c842"/>
      <circle cx="260" cy="161" r="3.5" fill="rgba(255,255,255,.30)"/>
      <circle cx="472" cy="161" r="5"   fill="#e05030"/>
      <!-- Time labels -->
      <text id="sunRiseLabel" x="50"  y="179" fill="rgba(255,255,255,.72)" font-size="11" font-weight="600" text-anchor="middle">--:--</text>
      <text x="260" y="179" fill="rgba(255,255,255,.32)" font-size="11" font-weight="400" text-anchor="middle">12:00</text>
      <text id="sunSetLabel"  x="472" y="179" fill="rgba(255,255,255,.72)" font-size="11" font-weight="600" text-anchor="middle">--:--</text>
      <!-- Golden day-arc (thicker, matches model image) -->
      <path id="sunArcTrack" d="M 42,161 Q 260,54 472,161" fill="none" stroke="url(#arcDayGrad)" stroke-width="2.0" stroke-linecap="round"/>
      <!-- Night dashed arc -->
      <path d="M 472,161 Q 260,54 42,161" fill="none" stroke="url(#arcNightGrad)" stroke-width="1.5" stroke-dasharray="4,6" opacity=".35"/>
      <g id="arcSunGroup" opacity="1">
        <!-- L4 outermost atmospheric haze pulsing -->
        <circle id="sunL4" cx="260" cy="12" r="110" fill="url(#sunGlowG4)" opacity="0.10">
          <animate attributeName="r"       values="110;138;110"    dur="3.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.08;0.18;0.08" dur="3.8s" repeatCount="indefinite"/>
        </circle>
        <!-- L3 outer corona -->
        <circle id="sunL3" cx="260" cy="12" r="70"  fill="url(#sunGlowG3)" opacity="0.18"/>
        <!-- L2 mid bloom -->
        <circle id="sunL2" cx="260" cy="12" r="42"  fill="url(#sunGlowG2)" opacity="0.32"/>
        <!-- L1 bright inner halo -->
        <circle id="sunL1" cx="260" cy="12" r="24"  fill="url(#sunGlowG1)" opacity="0.70"/>
        <!-- Brilliant white core -->
        <circle id="sunCore" cx="260" cy="12" r="14" fill="url(#sunCoreGD)"/>
      </g>
      <g id="moonGroup" opacity="0"></g>
      <!-- Moon rendered directly in SVG space on the arc -->
      <g id="moonSvgGroup" opacity="0" transform="translate(260,161)">
        <g id="moonSvgInner" transform="scale(0.85)"></g>
      </g>
      <!-- PV animated flow wave (sun → house) -->
      <g id="pvFlowGroup"></g>
      <!-- PV power bubble: sharp bottom-left, rounded top-left/top-right/bottom-right (r=13) -->
      <g id="pvBubbleGroup" opacity="0">
        <path id="pvBubbleBg"
              d="M 0,28 L 0,13 A 13,13 0 0,1 13,0 L 91,0 A 13,13 0 0,1 104,13 L 104,15 A 13,13 0 0,1 91,28 Z"
              fill="rgba(10,10,10,0.20)" stroke="#ffe040" stroke-width="1.5"/>
        <text id="pvBubbleVal" x="52" y="19" text-anchor="middle"
              font-size="12" font-weight="700" fill="#ffe040">-- kW ⚡</text>
      </g>
      <!-- ── ANIMATED FLOW LINES ── L-shaped, cyan=grid, green=battery ──

      <!-- GRID IN (importing, cyan): grid → house -->
      <path id="flowGridIn"  d="M 81,305 H 167 V 322 H 195" fill="none" stroke="rgba(0,240,255,0.28)" stroke-width="3" stroke-dasharray="6 5" stroke-linecap="round" opacity="0" style="display:none"><animate attributeName="stroke-dashoffset" from="11" to="0" dur="0.8s" repeatCount="indefinite" calcMode="linear"/></path>
      <path id="flowGridInC" d="M 81,305 H 167 V 322 H 195" fill="none" stroke="#00f0ff" stroke-width="1.5" stroke-dasharray="6 5" stroke-linecap="round" opacity="0" style="display:none" marker-end="url(#arrowCyan)"><animate attributeName="stroke-dashoffset" from="11" to="0" dur="0.8s" repeatCount="indefinite" calcMode="linear"/></path>

      <!-- GRID OUT (exporting, cyan): house → grid -->
      <path id="flowGridOut"  d="M 195,322 H 167 V 305 H 81" fill="none" stroke="rgba(0,240,255,0.28)" stroke-width="3" stroke-dasharray="6 5" stroke-linecap="round" opacity="0" style="display:none"><animate attributeName="stroke-dashoffset" from="11" to="0" dur="0.8s" repeatCount="indefinite" calcMode="linear"/></path>
      <path id="flowGridOutC" d="M 195,322 H 167 V 305 H 81" fill="none" stroke="#00f0ff" stroke-width="1.5" stroke-dasharray="6 5" stroke-linecap="round" opacity="0" style="display:none" marker-end="url(#arrowCyan)"><animate attributeName="stroke-dashoffset" from="11" to="0" dur="0.8s" repeatCount="indefinite" calcMode="linear"/></path>

      <!-- Grid watt label mid-line -->
      <text id="fcGridFlowVal" x="124" y="298" text-anchor="middle" font-size="13" font-weight="700" fill="#00f0ff">0 W</text>

      ${showBatt1 ? `
      <!-- BATT IN (charging, green): house → battery -->
      <path id="flowBattIn"  d="M 335,322 H 360 V 305 H 462" fill="none" stroke="rgba(57,255,20,0.28)" stroke-width="3" stroke-dasharray="6 5" stroke-linecap="round" opacity="0" style="display:none"><animate attributeName="stroke-dashoffset" from="11" to="0" dur="4.0s" repeatCount="indefinite" calcMode="linear"/></path>
      <path id="flowBattInC" d="M 335,322 H 360 V 305 H 462" fill="none" stroke="#39ff14" stroke-width="1.5" stroke-dasharray="6 5" stroke-linecap="round" opacity="0" style="display:none" marker-end="url(#arrowGreen)"><animate attributeName="stroke-dashoffset" from="11" to="0" dur="4.0s" repeatCount="indefinite" calcMode="linear"/></path>

      <!-- BATT OUT (discharging, green): battery → house -->
      <path id="flowBattOut"  d="M 462,305 H 360 V 322 H 335" fill="none" stroke="rgba(57,255,20,0.28)" stroke-width="3" stroke-dasharray="6 5" stroke-linecap="round" opacity="0" style="display:none"><animate attributeName="stroke-dashoffset" from="11" to="0" dur="4.0s" repeatCount="indefinite" calcMode="linear"/></path>
      <path id="flowBattOutC" d="M 462,305 H 360 V 322 H 335" fill="none" stroke="#39ff14" stroke-width="1.5" stroke-dasharray="6 5" stroke-linecap="round" opacity="0" style="display:none" marker-end="url(#arrowGreen)"><animate attributeName="stroke-dashoffset" from="11" to="0" dur="4.0s" repeatCount="indefinite" calcMode="linear"/></path>

      <!-- Batt watt label mid-line -->
      <text id="fcBattFlowVal" x="400" y="298" text-anchor="middle" font-size="13" font-weight="700" fill="#39ff14">0 W</text>
      ` : ''}

      <!-- ── BATTERY SVG CYLINDER ── -->
      ${battIconSection}


      <!-- ── TINY INV BADGE � centred above chimney/roofline ── -->
      <rect id="fcInvRect" x="216" y="285" width="88" height="38" rx="10" fill="rgba(8,14,28,0.18)" stroke="rgba(244,169,59,0.65)" stroke-width="1.2"/>
      <text id="invNameLabel" x="260" y="298" text-anchor="middle" font-size="8" font-weight="700" fill="#f4a93b" letter-spacing="1.5">INV</text>
      <text id="invTempFlow" x="260" y="311" text-anchor="middle" font-size="9.5" font-weight="600" fill="#f0883e">-- °C</text>
      <text id="invLoadPctFlow" x="260" y="320" text-anchor="middle" font-size="9" font-weight="600" fill="#58a6ff">-- %</text>


      <!-- ── CROSS LABELS: PV center · GRID left · BATTERY right � all inline ── -->
      <!-- Vertical dividers � 30% less visible -->
      <line x1="182" y1="419" x2="182" y2="445" stroke="rgba(255,255,255,0.13)" stroke-width="1"/>
      <line x1="327" y1="419" x2="327" y2="445" stroke="rgba(255,255,255,0.13)" stroke-width="1"/>
      <!-- PV GENERATION � center column, inline with GRID/BATT -->
      <text x="260" y="418" text-anchor="middle" font-size="8" fill="#ffffff" letter-spacing="1.2" font-weight="500">PV GENERATION</text>
      <text id="fcPvGenBelowVal" x="260" y="436.5" text-anchor="middle" font-size="15" font-weight="700" fill="#ffe83c">-- kW</text>
      <!-- Horizontal rule � 30% less visible -->
      <line x1="10" y1="449" x2="510" y2="449" stroke="rgba(255,255,255,0.13)" stroke-width="1"/>
      <!-- GRID col � left aligned with grid pole -->
      <text x="63" y="418" text-anchor="middle" font-size="8" fill="#ffffff" letter-spacing="1.5" font-weight="500">GRID</text>
      <text id="fcGridVal" x="63" y="436.5" text-anchor="middle" font-size="15" font-weight="700" fill="#58a6ff">0 W</text>
      <!-- BATTERY col -->
      <text id="fcBattVoltBelow" x="472" y="405" text-anchor="middle" font-size="10" font-weight="600" fill="rgba(255,255,255,0.92)">-- V</text>
      <text x="472" y="418" text-anchor="middle" font-size="8" fill="#ffffff" letter-spacing="1.5" font-weight="500">BATTERY</text>
      <text id="fcBattSocPct" x="472" y="436.5" text-anchor="middle" font-size="15" font-weight="700" fill="#00f0ff">--%</text>

      ${evtxt}
      </svg></div>`+

      `<div class="kfc-bars-row">
        <div class="kfc-bar-col">
          <span class="kfc-bar-lbl">&#x2014; PV</span>
          <div class="kfc-bar-meter-wrap"><div id="pvBlocks" class="kfc-bar-meter"></div></div>
        </div>
        <div class="kfc-bar-col">
          <span class="kfc-bar-lbl">PWR</span>
          <div class="kfc-bar-pwr-slot">
            <div class="kfc-bar-meter-wrap">
              <div class="kfc-bar-meter kfc-bar-meter-pwr">
                <div class="kfc-pwr-fill-area"><div id="pwrBar"></div></div>
              </div>
            </div>
            <span id="pwrPct" class="kfc-bar-pct">0%</span>
          </div>
        </div>
      </div>
      <div class="dv"></div>

      <!-- Row 1: MODE | BMS TEMP | TOTAL PV GEN -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div class="st">
          <div style="display:flex;align-items:center;gap:7px">
            <span style="font-size:1.0rem;line-height:1;flex-shrink:0;color:#ffffff">⟳</span>
            <div style="min-width:0">
              <div class="l">${this.config.label_cell_temp_minmax||'MODE'}</div>
              <div class="v" id="bTemp1" style="color:#ffffff">--</div>
            </div>
          </div>
        </div>
        <div class="st stm">
          <div style="display:flex;align-items:center;gap:7px">
            <span style="font-size:1.0rem;line-height:1;flex-shrink:0">&#x1F321;&#xFE0F;</span>
            <div style="min-width:0">
              <div class="l">${this.config.label_bms_temp||'BMS TEMP'}</div>
              <div class="v" id="bTemp2" style="color:#f39c4b">-- &#x00B0;C</div>
            </div>
          </div>
        </div>
        <div class="st">
          <div style="display:flex;align-items:center;gap:7px">
            <span style="font-size:1.0rem;line-height:1;flex-shrink:0">☀️</span>
            <div style="min-width:0">
              <div class="l">${this.config.label_total_pv_gen||'TOTAL PV GEN.'}</div>
              <div class="v" id="bTotalPvGen" style="color:#f4d03f">-- kWh</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Row 2: MIN CELL | MAX CELL | BATT DIS -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px">
        <div class="st">
          <div style="display:flex;align-items:center;gap:7px">
            <span style="font-size:1.0rem;line-height:1;flex-shrink:0">🔋</span>
            <div style="min-width:0">
              <div class="l">${this.config.label_min_cell||'MIN CELL'}</div>
              <div class="v" id="bMinCell" style="color:#3fb950">-- V</div>
            </div>
          </div>
        </div>
        <div class="st stm">
          <div style="display:flex;align-items:center;gap:7px">
            <span style="font-size:1.0rem;line-height:1;flex-shrink:0">🔋</span>
            <div style="min-width:0">
              <div class="l">${this.config.label_max_cell||'MAX CELL'}</div>
              <div class="v" id="bMaxCell" style="color:#3fb950">-- V</div>
            </div>
          </div>
        </div>
        <div class="st">
          <div style="display:flex;align-items:center;gap:7px">
            <span style="font-size:1.0rem;line-height:1;flex-shrink:0">💠</span>
            <div style="min-width:0">
              <div class="l">${this.config.label_batt_dis||'BATT DIS.'}</div>
              <div class="v" id="bBattDis" style="color:#dde8f8">-- kWh</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Endurance row -->
      <div style="margin-top:8px">
        <div class="st" style="display:flex;align-items:center;justify-content:space-between;padding:9px 11px">
          <div style="display:flex;align-items:center;gap:7px">
            <span style="font-size:1.43rem;line-height:1;flex-shrink:0;color:#ffffff">⏱</span>
            <span class="l" style="margin-bottom:0" id="bEnduStatLbl">${this.config.label_endurance||'ENDURANCE'}</span>
          </div>
          <div style="display:flex;align-items:center;gap:14px">
            <span class="v" id="bEnduranceStat" style="color:#3ce878">--</span>
            <span id="bEnduranceTime" style="font-size:.62rem;font-weight:400;color:rgba(160,185,220,0.60);letter-spacing:.4px;white-space:nowrap">Till --</span>
          </div>
        </div>
      </div>
      <div class="ct">&#x2014; INVERTER</div>
      <div class="pvf">
        <div class="pvi">
          <span class="ico">☀️</span>
          <span class="lbl">TODAY PV</span>
          <span class="val yw" id="invTodayPv">-- kWh</span>
        </div>
        <div class="pvi">
          <span class="ico">🔋</span>
          <span class="lbl">CHG / DIS</span>
          <span class="val" id="invTodayBattChg" style="color:#3fb950">-- kWh</span>
          <span style="font-size:.70rem;font-weight:400;color:#f39c4b;margin-top:2px;text-align:center;display:block" id="invTodayBattDis">-- kWh</span>
        </div>
        <div class="pvi">
          <span class="ico">⚡</span>
          <span class="lbl">REMAINING</span>
          <span class="val" id="invRemCap" style="color:#3ce878">-- Ah</span>
          <span style="font-size:.70rem;font-weight:400;color:rgba(160,185,220,0.55);margin-top:2px;text-align:center;display:block" id="invRemKwh">-- kWh</span>
        </div>
        <div class="pvi">
          <span class="ico">🏡</span>
          <span class="lbl">TODAY LOAD</span>
          <span class="val" id="invTodayLoad" style="color:#29b6f6">-- kWh</span>
        </div>
      </div>
      </div><!-- /kfc-content -->
    </div><!-- /kfc-shell -->`;
  }

  // ─────────────────────────────────────────────────────────────
  // SKY SYSTEM � image-based background with dynamic sun, moon, stars, weather overlays
  // Images live at: /local/community/khan-skycard/sky/
  // Falls back to procedural CSS gradient if any image is missing (404).
  // ─────────────────────────────────────────────────────────────

  _skyImageKey(condition, isDay, bell) {
    // Dawn/dusk: elevation in 0-12 degree band → separate images
    const isDawn = isDay && bell < 0.22 && this._sunData().t < 0.5;
    const isDusk = isDay && bell < 0.22 && this._sunData().t >= 0.5;
    if (condition === 'clear' || condition === 'sunny') {
      if (isDawn) return 'sky-clear-dawn';
      if (isDusk) return 'sky-clear-dusk';
      return isDay ? 'sky-clear-day' : 'sky-night-clear';
    }
    if (condition === 'partlycloudy') return isDay ? 'sky-partlycloudy-day' : 'sky-partlycloudy-night';
    if (condition === 'cloudy')       return isDay ? 'sky-cloudy-day'       : 'sky-cloudy-night';
    if (condition === 'rainy')        return isDay ? 'sky-rainy-day'        : 'sky-rainy-night';
    if (condition === 'thunderstorm') return 'sky-thunderstorm';
    if (condition === 'snowy')        return 'sky-snowy-day';
    if (condition === 'fog')          return 'sky-fog-day';
    return isDay ? 'sky-clear-day' : 'sky-night-clear';
  }

  _renderSky(sun, condition = 'clear') {
    const skyDiv = this.shadowRoot?.getElementById('kfcSkyDiv');
    if (!skyDiv) return;
    const isDay = !sun.night;
    const bell  = sun.bell ?? 0.5;
    const BASE  = '/local/community/khan-skycard/sky';
    const key   = this._skyImageKey(condition, isDay, bell);

    // Skip full rebuild if key unchanged (saves DOM thrash every hass update)
    if (this._prevSkyKey === key) {
      this._updateSkyOverlays(skyDiv, sun, isDay, bell, condition, key);
      return;
    }
    this._prevSkyKey = key;

    // ── Base image layer ──
    // Two img elements for crossfade: A/B swap
    const prev = this._skySlot === 'A' ? 'B' : 'A';
    const curr = this._skySlot === 'A' ? 'A' : 'B';
    this._skySlot = curr;

    let html = `
      <!-- Fallback gradient (visible until image loads or if image 404s) -->
      <div id="kfcSkyGrad" style="position:absolute;inset:0;background:${this._fallbackGrad(isDay, bell, condition)};transition:background 1.4s ease"></div>
      <!-- Image layers A + B for crossfade -->
      <img id="kfcSkyImgA" alt="" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center;border-radius:12px;opacity:0;transition:opacity 1.4s ease;pointer-events:none">
      <img id="kfcSkyImgB" alt="" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center;border-radius:12px;opacity:0;transition:opacity 1.4s ease;pointer-events:none">
      <!-- Neutral dark fade � no colour tint on sky image bottom -->
      <div id="kfcSkyFade" style="position:absolute;bottom:0;left:0;right:0;height:70%;pointer-events:none;z-index:2;background:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,0.10) 100%)"></div>
      <!-- Star field (night only, SVG) -->
      <svg id="kfcStarSvg" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:58%;pointer-events:none;opacity:${isDay ? 0 : 1};transition:opacity 1.4s ease">
        ${isDay ? '' : this._starField(55)}
      </svg>
      <!-- Weather particle layer (rain/snow/lightning CSS) -->
      <div id="kfcWxLayer" style="position:absolute;inset:0;overflow:hidden;pointer-events:none;border-radius:12px"></div>
      <!-- Time-of-day colour tint -->
      <div id="kfcTint" style="position:absolute;inset:0;pointer-events:none;border-radius:12px"></div>
      <!-- Sun orb handled by SVG arcSunGroup � div hidden -->
      <div id="kfcSunOrb" style="display:none"></div>`;
    skyDiv.innerHTML = html;

    // Neutral dark fade � no colour tint on sky image bottom
    const fadeEl = skyDiv.querySelector('#kfcSkyFade');
    if (fadeEl) {
      fadeEl.style.background = `linear-gradient(to bottom,transparent 0%,rgba(0,0,0,0.10) 100%)`;
    }
    // Load image with crossfade
    const imgEl = skyDiv.querySelector('#kfcSkyImgA');
    if (imgEl) {
      imgEl.onload  = () => { imgEl.style.opacity = '1'; };
      imgEl.onerror = () => { imgEl.style.opacity = '0'; }; // fallback gradient shows through
      imgEl.src = `${BASE}/${key}.png`;
    }

    // Weather particle overlay
    this._buildWxLayer(skyDiv.querySelector('#kfcWxLayer'), condition, isDay);
    this._updateSkyOverlays(skyDiv, sun, isDay, bell, condition, key);
  }

  // Bottom-edge RGB sampled from actual PNG files (bottom 2%, center 60% width). PNGs are never modified.
  _skyEdgeRgb(skyKey) {
    const MAP = {
      'sky-clear-dawn':          [7, 30, 57],
      'sky-clear-day':           [0, 25, 56],
      'sky-clear-dusk':          [11, 33, 67],
      'sky-cloudy-day':          [35, 43, 51],
      'sky-cloudy-night':        [0, 12, 30],
      'sky-fog-day':             [119, 127, 139],
      'sky-night-clear':         [1, 8, 21],
      'sky-partlycloudy-day':    [2, 30, 65],
      'sky-partlycloudy-night':  [1, 6, 25],
      'sky-rainy-day':           [15, 19, 21],
      'sky-rainy-night':         [0, 5, 14],
      'sky-snowy-day':           [138, 146, 160],
      'sky-thunderstorm':        [1, 7, 16],
    };
    return MAP[skyKey] || [0, 25, 56];
  }

  _darkenRgb([r, g, b], amount = 0.10) {
    const f = 1 - amount;
    return [Math.round(r * f), Math.round(g * f), Math.round(b * f)];
  }

  _applySkyBottomFill(skyKey) {
    const edge = this._skyEdgeRgb(skyKey);
    const dark = this._darkenRgb(edge, 0.10);
    const e = edge.join(',');
    const d = dark.join(',');
    const bottomGrad = this.shadowRoot?.getElementById('kfcBottomGrad');
    if (bottomGrad) {
      bottomGrad.style.background = `linear-gradient(180deg,rgb(${e}) 0%,rgb(${d}) 100%)`;
    }
    const shell = this.shadowRoot?.getElementById('kfcShell');
    if (shell) shell.style.background = `rgb(${d})`;
  }

  _updateSkyOverlays(skyDiv, sun, isDay, bell, condition, skyKey) {
    // Update fade overlay � neutral dark fade, no colour tint
    const fadeEl2 = skyDiv.querySelector('#kfcSkyFade');
    const key = skyKey || this._skyImageKey(condition, isDay, bell);
    const e = this._skyEdgeRgb(key).join(',');
    if (fadeEl2) {
      fadeEl2.style.background = `linear-gradient(to bottom,transparent 0%,rgba(${e},0.25) 72%,rgba(${e},0.92) 100%)`;
    }
    // ── Dynamic lower-section background � seamless match to PNG bottom ──
    this._applySkyBottomFill(key);
    // Sun orb position
    const sunOrb = skyDiv.querySelector('#kfcSunOrb');
    if (sunOrb) sunOrb.style.display = 'none';
    // Time-of-day colour tint over image
    const tint = skyDiv.querySelector('#kfcTint');
    if (tint) {
      if (isDay && bell < 0.28) {
        // Dawn / dusk warm tint � stronger near horizon
        const warmA = (0.18 - bell * 0.45).toFixed(3);
        const col   = sun.t < 0.5 ? `rgba(255,110,30,${warmA})` : `rgba(255,80,20,${warmA})`;
        tint.style.background = `linear-gradient(0deg,${col} 0%,rgba(255,90,20,${(parseFloat(warmA)*0.4).toFixed(3)}) 35%,transparent 68%)`;
      } else if (!isDay) {
        tint.style.background = 'linear-gradient(180deg,rgba(0,0,15,0.22) 0%,transparent 55%)';
      } else {
        tint.style.background = '';
      }
    }
  }


 
   _moonPhase() {
    // Exact new moon: 16 May 2026, 10:01 UTC
    const known = new Date('2026-05-16T10:01:00Z').getTime();
    const cycle = 29.530588853 * 24 * 3600 * 1000;
    return ((Date.now() - known) % cycle + cycle) % cycle / cycle;
}
   _moonSVG(phase) {
    const p     = ((phase % 1) + 1) % 1;
    const illum = 0.5 - 0.5 * Math.cos(p * Math.PI * 2);
    const r     = 26;
    const uid   = 'ms' + Math.abs(Math.round(p * 1000));

    if (illum < 0.01) {
      return `<circle cx="0" cy="0" r="${r}" fill="rgba(10,18,45,0.55)"/>`;
    }

    const full   = illum > 0.93;
    const waxing = p < 0.5;

    // CORRECT shadow geometry:
    // The dark region is a circle of the SAME radius r as the disc.
    // Its centre is offset along the x-axis so that its leading edge
    // lands exactly on the terminator of the moon phase.
    //   waxing (right side lit)  → shadow centre at NEGATIVE x
    //     cx_s = -r × (1 − cos(2πp))   [0 at new, −2r at full]
    //   waning (left side lit)   → shadow centre at POSITIVE x
    //     cx_s = +r × (1 − cos(2πp))
    // This is the geometrically exact formula; the original code used
    // −cos(p·π)·r which placed the shadow at the wrong position and
    // produced an inverted / wrong-phase crescent.
    const cx_s = (waxing ? -1 : 1) * r * (1 - Math.cos(p * Math.PI * 2));

    // Gradient highlight: shift to the lit side
    const gxPct = waxing ? '64%' : '36%';

    if (full) {
      return `
        <defs>
          <radialGradient id="${uid}sg" cx="50%" cy="28%" r="68%">
            <stop offset="0%" stop-color="#f8faff"/>
            <stop offset="45%" stop-color="#c8d0e0"/>
            <stop offset="100%" stop-color="#7a8090"/>
          </radialGradient>
        </defs>
        <circle cx="0" cy="0" r="${r}" fill="rgba(8,15,45,0.60)"/>
        <circle cx="0" cy="0" r="${r}" fill="url(#${uid}sg)"/>
        <circle cx="0" cy="0" r="${r}" fill="none" stroke="rgba(220,235,255,0.65)" stroke-width="1.5"/>`;
    }

    return `
      <defs>
        <radialGradient id="${uid}sg" cx="${gxPct}" cy="28%" r="68%">
          <stop offset="0%" stop-color="#f0f4ff"/>
          <stop offset="40%" stop-color="#c8d0e0"/>
          <stop offset="100%" stop-color="#7a8090"/>
        </radialGradient>
        <mask id="${uid}lm">
          <rect x="-50" y="-50" width="100" height="100" fill="black"/>
          <circle cx="0" cy="0" r="${r}" fill="white"/>
          <circle cx="${cx_s.toFixed(2)}" cy="0" r="${r}" fill="black"/>
        </mask>
      </defs>
      <circle cx="0" cy="0" r="${r}" fill="rgba(8,15,45,0.60)"/>
      <circle cx="0" cy="0" r="${r}" fill="url(#${uid}sg)" mask="url(#${uid}lm)"/>
      <circle cx="0" cy="0" r="${r}" fill="none" stroke="rgba(220,235,255,0.55)" stroke-width="1.5" mask="url(#${uid}lm)"/>`;
}

  _starField(count) {
    let seed = Math.floor(Date.now() / 86400000);
    const rng = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
    const COLORS = ['#ffffff','#ffffff','#e8eeff','#ffe8d0','#ffd0a0','#ccdeff','#fff8e8','#d0e8ff'];
    let svg = '';
    for (let i = 0; i < count; i++) {
      const x   = (rng() * 100).toFixed(2);
      const y   = (rng() * 92).toFixed(2);
      const r   = (0.4 + rng() * 1.5).toFixed(2);
      const op  = (0.18 + rng() * 0.70).toFixed(2);
      const col = COLORS[Math.floor(rng() * COLORS.length)];
      const twk = rng() > 0.80;
      const dur = (1.6 + rng() * 2.8).toFixed(1);
      svg += `<circle cx="${x}%" cy="${y}%" r="${r}" fill="${col}" opacity="${op}"${twk ? ` style="animation:kfcTwinkle ${dur}s ease-in-out infinite;animation-delay:-${(rng()*parseFloat(dur)).toFixed(1)}s"` : ''}/>`;
    }
    return svg;
  }

  _buildWxLayer(el, condition, isDay) {
    if (!el) return;
    let html = '';
    if (condition === 'rainy' || condition === 'thunderstorm') {
      const count = condition === 'thunderstorm' ? 55 : 38;
      for (let i = 0; i < count; i++) {
        const l = (i * 79 % 100).toFixed(1);
        const h = (1 + (i % 3) * 0.5).toFixed(1);
        const d = (0.45 + (i % 6) * 0.08).toFixed(2);
        const op = (0.25 + (i % 4) * 0.08).toFixed(2);
        const delay = -((i * 0.11) % parseFloat(d)).toFixed(2);
        html += `<div style="position:absolute;top:0;left:${l}%;width:${h}px;height:14px;background:rgba(180,210,255,${op});border-radius:1px;animation:kfcRain ${d}s linear ${delay}s infinite"></div>`;
      }
      if (condition === 'thunderstorm') {
        html += `<div style="position:absolute;inset:0;background:rgba(200,220,255,0.04);animation:kfcLightning 5.8s ease-in-out infinite"></div>`;
      }
    }
    if (condition === 'snowy') {
      for (let i = 0; i < 38; i++) {
        const l = (i * 83 % 100).toFixed(1);
        const s = 2 + (i % 4);
        const d = (2.8 + (i % 5) * 0.6).toFixed(1);
        const delay = -((i * 0.4) % parseFloat(d)).toFixed(1);
        const op = (0.35 + (i % 3) * 0.12).toFixed(2);
        html += `<div style="position:absolute;top:0;left:${l}%;width:${s}px;height:${s}px;border-radius:50%;background:rgba(228,240,255,${op});animation:kfcSnow ${d}s ease-in-out ${delay}s infinite"></div>`;
      }
    }
    if (condition === 'fog') {
      const fc = isDay ? 'rgba(172,198,212,' : 'rgba(88,118,142,';
      for (let i = 0; i < 5; i++) {
        const top  = 8 + i * 9;
        const dur  = (7 + i * 2).toFixed(1);
        const ddur = (parseFloat(dur) * 2.8).toFixed(0);
        const op   = (0.22 + (i % 3) * 0.07).toFixed(2);
        const h    = 14 + (i % 3) * 8;
        html += `<div style="position:absolute;top:${top}%;left:-10%;right:-10%;height:${h}px;background:linear-gradient(90deg,transparent,${fc}${op}),${fc}${op}),transparent);filter:blur(${2+i}px);animation:kfcFogDrift ${ddur}s ease-in-out -${(i*2.1).toFixed(1)}s infinite alternate"></div>`;
      }
    }
    el.innerHTML = html;
  }


  _fallbackGrad(isDay, bell, condition) {
    if (!isDay) return 'linear-gradient(180deg,#000308 0%,#010818 28%,#020c28 55%,#050f38 78%,#0a1545 100%)';
    if (condition === 'rainy' || condition === 'thunderstorm') return 'linear-gradient(180deg,#0e1820 0%,#182838 40%,#243a4c 68%,#304858 100%)';
    if (condition === 'cloudy') return 'linear-gradient(180deg,#1a3a50 0%,#2e5870 32%,#4a80a0 58%,#78b0cc 78%,#aaced8 100%)';
    if (bell < 0.22) return 'linear-gradient(180deg,#001a50 0%,#0a3070 20%,#3060a0 45%,#e0703a 72%,#f0a050 88%,#f8d080 100%)';
    return 'linear-gradient(180deg,#003a8c 0%,#0055b3 18%,#1470cc 40%,#3d9de8 62%,#8ac8f5 80%,#c8e8fa 92%,#f0d8a0 100%)';
  }

  _updateDynamic() {
    if (!this._hass || !this.config) return;
    const root = this.shadowRoot;
    const getEl = (id) => root.getElementById(id);
    const setText = (id, txt) => { const el = getEl(id); if (el) el.textContent = txt; };
    const setAttr = (id, attr, val) => { const el = getEl(id); if (el) el.setAttribute(attr, val); };
    const setDisplay = (id, visible) => { const el = getEl(id); if (!el) return; el.style.display = visible ? '' : 'none'; };

    // Fix #4: use null-aware helper so unavailable/unknown sensors show '--' not '0'
    const _n = (v, fallback = 0) => (v !== null && !isNaN(v)) ? v : fallback;
    const _nullOr0 = (v) => (v !== null && !isNaN(v)) ? v : 0; // for flow/direction values where 0 is valid

    const pv1 = _n(this._val(this.config.pv1_power, true));
    const pv2 = _n(this._val(this.config.pv2_power, true));
    const pv3 = this.config._show_pv_extra ? _n(this._val(this.config.pv3_power, true)) : 0;
    const pv4 = this.config._show_pv_extra ? _n(this._val(this.config.pv4_power, true)) : 0;
    const totalPvSensor = this._val(this.config.pv_total_power, true);
    const pvTotal = (totalPvSensor !== null && !isNaN(totalPvSensor) && totalPvSensor > 0) ? totalPvSensor : pv1 + pv2 + pv3 + pv4;
    const _gridPrimary = this._val(this.config.grid_active_power, true);
    let gridActive = _gridPrimary !== null ? _gridPrimary : _nullOr0(this._val(this.config.grid_power_alt, true));
    if (this.config.invert_grid_power) gridActive = -gridActive;
    const gridImport = _n(this._val(this.config.grid_import_energy));
    const gridExport = _n(this._val(this.config.grid_export_energy));
    const load = _n(this._val(this.config.consump, true));
    // Fix #9: store raw null so we can show '--' and use toFixed(2) to avoid float artefacts
    const _todayPvRaw = this._val(this.config.today_pv);
    const _todayBattChgRaw = this._val(this.config.today_batt_chg);
    const _todayLoadRaw = this._val(this.config.today_load);
    const todayPv = _n(_todayPvRaw);
    const todayBattChg = _n(_todayBattChgRaw);
    const todayLoad = _n(_todayLoadRaw);
    const battSoc1 = _n(this._val(this.config.battery_soc) ?? this._val(this.config.goodwe_battery_soc));
    let battPwr1 = _nullOr0(this._val(this.config.battery_power, true));
    if (this.config.invert_battery_power) battPwr1 = -battPwr1;
    let battCurr1 = _nullOr0(this._val(this.config.battery_current) ?? this._val(this.config.goodwe_battery_curr));
    if (this.config.invert_battery_power) battCurr1 = -battCurr1;
    const battVolt1 = _n(this._val(this.config.battery_voltage));
    const temp1_1 = _n(this._val(this.config.battery_temp1));
    const temp2_1 = _n(this._val(this.config.battery_temp2));
    const mos1 = _n(this._val(this.config.battery_mos));
    const minCell1 = _n(this._val(this.config.battery_min_cell));
    const maxCell1 = _n(this._val(this.config.battery_max_cell));
    const battDis1Raw = this._val(this.config.batt_dis);
    const battDis1 = _n(battDis1Raw);
    const invTemp = _n(this._val(this.config.inv_temp));

    // System limits – direct numbers
    // battery_cap_unit: 'ah' uses battery_full_ah; 'kwh' uses battery_full_wh (stored as kWh, converted to Wh internally)
    const capUnit = this.config.battery_cap_unit || 'ah';
    const fullAh  = capUnit === 'ah'  ? (Number(this.config.battery_full_ah)  || 0) : 0;
    // battery_full_wh entered in kWh (×1000 for internal Wh). In Ah mode, derive Wh from Ah × live voltage.
    // battVolt1 is read below � forward-declare safe because JS hoists var, but we use const so we
    // must read voltage first. We re-read it inline here before battVolt1 is const-declared.
    const _voltForCap = _n(this._val(this.config.battery_voltage));
    const fullWh  = capUnit === 'kwh' ? (Number(this.config.battery_full_wh) || 0) * 1000
                                      : (fullAh > 0 && _voltForCap > 0 ? fullAh * _voltForCap : 0);
    const invMax = Number(this.config.inverter_max_power) || 6000;
    const pvMax  = Number(this.config.pv_max_power)       || 7500;

    const remCap1 = fullAh > 0 ? (battSoc1 / 100) * fullAh : 0;
    // Fix #14: dual-battery charging ETA � battery2_full_wh entered in kWh, ×1000 for internal Wh
    const fullWh2 = Number(this.config.battery2_full_wh) > 0 ? Number(this.config.battery2_full_wh) * 1000 : fullWh;

    const dual = !!(this.config._show_battery2);
    const battSoc2 = dual ? _n(this._val(this.config.battery2_soc)) : 0;
    let battPwr2 = dual ? _nullOr0(this._val(this.config.battery2_power, true)) : 0;
    let battCurr2 = dual ? _nullOr0(this._val(this.config.battery2_current)) : 0;
    if (dual && this.config.invert_battery_power) { battPwr2 = -battPwr2; battCurr2 = -battCurr2; }
    const battVolt2 = dual ? _n(this._val(this.config.battery2_voltage)) : 0;
    const mos2 = dual ? _n(this._val(this.config.battery2_mos)) : 0;

    const chargerPower = _n(this._val(this.config.charger_power, true));
    const chargerCurrent = _n(this._val(this.config.charger_current));
    const chargerSoc = _n(this._val(this.config.charger_soc));
    const chargerEtaSensor = this._val(this.config.charger_eta);
    const chargerBattCapWh = Number(this.config.charger_battery_capacity_wh) || 0;
    const chargerStateStr = this._strVal(this.config.charger_state);

    const sun = this._sunData();
    const auraEl = getEl('skyAura');
    if (auraEl) auraEl.setAttribute('cy', (94 - Math.round((sun.bell || 0.5) * 22)).toString());

    // ── Sun arc labels, sun dot position & night dimming ──
    const sunRiseLbl = getEl('sunRiseLabel');
    const sunSetLbl  = getEl('sunSetLabel');
    if (sunRiseLbl) sunRiseLbl.textContent = sun.rise;
    if (sunSetLbl)  sunSetLbl.textContent  = sun.set;
    const arcEl = getEl('sunArcTrack');
    if (arcEl) arcEl.setAttribute('opacity', sun.night ? '0.15' : '0.50');

    // ── Pure-SVG sun: update position + scale per elevation, zero square artefact ──
    getEl('arcSunGroup')?.setAttribute('opacity', sun.night ? '0' : '1');
    if (!sun.night) {
      const bell = sun.bell ?? 0.5;
      const coreR   = Math.round(14 + bell * 8);         // 14 (horizon) → 22 (zenith)
      const rL1     = Math.round(coreR * 1.7);
      const rL2     = Math.round(coreR * 2.9);
      const rL3     = Math.round(coreR * 5.8);
      const rL4     = Math.round(coreR * 11);
      // Colour temperature: deep orange at horizon → white at zenith
      // Radial gradient stop colors (center color; outer fades to transparent via gradient)
      const c1stop = bell < 0.15 ? 'rgba(255,220,120,1)'  : 'rgba(255,255,220,1)';
      const c2stop = bell < 0.15 ? 'rgba(255,180,60,1)'   : 'rgba(255,240,160,1)';
      const c3stop = bell < 0.15 ? 'rgba(255,120,20,1)'   : 'rgba(255,210,80,1)';
      const c4stop = bell < 0.15 ? 'rgba(255,80,0,1)'     : 'rgba(255,170,30,1)';
      const o1 = (0.75 + bell * 0.20).toFixed(2);
      const o2 = (0.45 + bell * 0.20).toFixed(2);
      const o3 = (0.22 + bell * 0.12).toFixed(2);
      const o4 = (0.10 + bell * 0.08).toFixed(2);
      const coreInner = bell < 0.15 ? '#fff4d0' : '#ffffff';
      const coreMid   = bell < 0.15 ? '#ffd060' : '#fffbe8';
      const coreOuter = bell < 0.15 ? '#ff8020' : '#ffe090';
      // Move all layers to current sun position
      ['sunL4','sunL3','sunL2','sunL1','sunCore'].forEach(id => {
        const e = getEl(id); if (!e) return;
        e.setAttribute('cx', sun.bx); e.setAttribute('cy', sun.by);
      });
      const sl4 = getEl('sunL4');
      if (sl4) { sl4.setAttribute('r', rL4); sl4.setAttribute('opacity', o4); }
      const sl3 = getEl('sunL3');
      if (sl3) { sl3.setAttribute('r', rL3); sl3.setAttribute('opacity', o3); }
      const sl2 = getEl('sunL2');
      if (sl2) { sl2.setAttribute('r', rL2); sl2.setAttribute('opacity', o2); }
      const sl1 = getEl('sunL1');
      if (sl1) { sl1.setAttribute('r', rL1); sl1.setAttribute('opacity', o1); }
      const sCore = getEl('sunCore');
      if (sCore) { sCore.setAttribute('r', coreR); }
      // Update radial gradient stop colours per elevation/time
      const _updGrad = (gradId, centerColor) => {
        const g = root.getElementById(gradId);
        if (!g) return;
        const stops = g.querySelectorAll('stop');
        if (stops[0]) stops[0].setAttribute('stop-color', centerColor);
        // stop[1] always transparent version of same hue — derive it
        const transparentVer = centerColor.replace(/,1\)$/, ',0)');
        if (stops[1]) stops[1].setAttribute('stop-color', transparentVer);
      };
      _updGrad('sunGlowG1', c1stop);
      _updGrad('sunGlowG2', c2stop);
      _updGrad('sunGlowG3', c3stop);
      _updGrad('sunGlowG4', c4stop);
      // Update core gradient stop colours
      const sg = root.getElementById('sunCoreGD');
      if (sg) {
        const stops = sg.querySelectorAll('stop');
        if (stops[0]) stops[0].setAttribute('stop-color', coreInner);
        if (stops[1]) stops[1].setAttribute('stop-color', coreMid);
        if (stops[2]) stops[2].setAttribute('stop-color', coreOuter);
      }
    }

    // Moon position � rendered inside flowSvg on the night arc
    const moonSvgGroup = getEl('moonSvgGroup');
    if (sun.night) {
      if (moonSvgGroup) {
        moonSvgGroup.setAttribute('transform', `translate(${sun.mx},${sun.my})`);
        moonSvgGroup.setAttribute('opacity', '1');
        const inner = this.shadowRoot.getElementById('moonSvgInner');
        if (inner) { inner.innerHTML = this._moonSVG(this._moonPhase()); }
      }
    } else {
      if (moonSvgGroup) moonSvgGroup.setAttribute('opacity', '0');
    }

    if (pvTotal !== this._prevPvTotal || sun.bx !== this._prevSunPos.bx || sun.by !== this._prevSunPos.by) {
      this._prevPvTotal = pvTotal; this._prevSunPos = { bx: sun.bx, by: sun.by };
      const pvGroup = getEl('pvFlowGroup');
      if (pvGroup) pvGroup.innerHTML = this._buildPvWaveHTML(sun.bx, sun.by, pvTotal);
    }

    // ── PV power bubble: floats just right of sun, shows live kW ──
    const pvBubbleG = getEl('pvBubbleGroup');
    if (pvBubbleG) {
      const pvKw = pvTotal >= 1000 ? (pvTotal / 1000).toFixed(2) + ' kW' : pvTotal.toFixed(0) + ' W';
      const pvShow = pvTotal > 10 && !sun.night;
      pvBubbleG.setAttribute('opacity', pvShow ? '1' : '0');
      if (pvShow) {
        // Banner is 104×28, sharp bottom-left. Position so it clears the sun glow.
        const bx = Math.min(sun.bx + 22, 406);
        const by = Math.max(sun.by - 28, 0);
        pvBubbleG.setAttribute('transform', `translate(${bx},${by})`);
        const txtEl = getEl('pvBubbleVal');
        if (txtEl) txtEl.textContent = pvKw + ' ⚡';
      }
    }

    const flowDur = (w) => Math.max(0.5, 3.0 - (Math.min(Math.abs(w), 8000) / 8000) * 2.5).toFixed(2) + 's';
    const setFlow = (id, show, watts, durStr, color) => {
      const el = getEl(id); if (!el) return;
      el.setAttribute('opacity', show ? '1' : '0'); el.style.display = show ? '' : 'none';
      if (show && durStr !== undefined) { const anim = el.querySelector('animate'); if (anim) anim.setAttribute('dur', durStr); }
      if (color !== undefined) el.setAttribute('stroke', color);
    };

    const absPwr1 = Math.abs(battPwr1);
    const isCharging1 = battPwr1 > 49;
    const showBattIn = battPwr1 > 49;
    const showBattOut = battPwr1 < -49;
    const battLineColor = '#39ff14';  // green matching model
    let battDur = '4.0s', battShowIn = false, battShowOut = false;
    if (absPwr1 < 10) { battShowIn = false; battShowOut = false; }
    else if (absPwr1 < 50) { battShowIn = showBattIn; battShowOut = showBattOut; }
    else { battShowIn = showBattIn; battShowOut = showBattOut; battDur = flowDur(absPwr1); }

    setFlow('flowBattIn',   battShowIn,  absPwr1, battDur, battLineColor);
    setFlow('flowBattInC',  battShowIn,  absPwr1, battDur, battLineColor);
    setFlow('flowBattOut',  battShowOut, absPwr1, battDur, battLineColor);
    setFlow('flowBattOutC', battShowOut, absPwr1, battDur, battLineColor);
    // Grid: cyan for both import and export (matches model)
    setFlow('flowGridIn',   gridActive > 10,   gridActive,           flowDur(gridActive),            '#00f0ff');
    setFlow('flowGridInC',  gridActive > 10,   gridActive,           flowDur(gridActive),            '#00f0ff');
    setFlow('flowGridOut',  gridActive < -10,  Math.abs(gridActive), flowDur(Math.abs(gridActive)),  '#00f0ff');
    setFlow('flowGridOutC', gridActive < -10,  Math.abs(gridActive), flowDur(Math.abs(gridActive)),  '#00f0ff');

    const absGrid = Math.abs(gridActive > 10 ? gridActive : 0);
    const absBattOut = battPwr1 < -10 ? Math.abs(battPwr1) : 0;
    const absPvLoad = pvTotal > 10 ? pvTotal : 0;
    let loadFlowColor = '#ffe83c';
    if (absGrid >= absPvLoad && absGrid >= absBattOut && absGrid > 10) {
      loadFlowColor = '#FF2929';
    } else if (absBattOut >= absPvLoad && absBattOut >= absGrid && absBattOut > 10) {
      loadFlowColor = absBattOut < 1000 ? '#f39c4b' : absBattOut < 2500 ? '#e67e22' : '#f85149';
    }

    const _battFlowW = absPwr1 >= 1000 ? (absPwr1 / 1000).toFixed(2) + ' kW' : absPwr1.toFixed(0) + ' W';
    const _battFlowColor = absPwr1 < 10 ? '#8b949e' : '#39ff14';
    const fcBattFlowEl = getEl('fcBattFlowVal');
    if (fcBattFlowEl) { fcBattFlowEl.textContent = _battFlowW; fcBattFlowEl.setAttribute('fill', _battFlowColor); }

    const _gridFlowW = Math.abs(gridActive) >= 1000 ? (Math.abs(gridActive) / 1000).toFixed(2) + ' kW' : Math.abs(gridActive).toFixed(0) + ' W';
    const _gridFlowColor = Math.abs(gridActive) < 10 ? '#8b949e' : '#00f0ff';
    const fcGridFlowEl = getEl('fcGridFlowVal');
    if (fcGridFlowEl) { fcGridFlowEl.textContent = _gridFlowW; fcGridFlowEl.setAttribute('fill', _gridFlowColor); }
    const gridFlowBg = getEl('gridFlowLabelBg');
    if (gridFlowBg) gridFlowBg.setAttribute('stroke', Math.abs(gridActive) < 10 ? 'rgba(139,148,158,0.4)' : gridActive > 10 ? 'rgba(255,41,41,0.55)' : 'rgba(46,204,113,0.55)');

    const battIconWrap = getEl('battIconWrap');
    if (battIconWrap) { battIconWrap.setAttribute('filter', absPwr1 >= 50 ? 'url(#iconGlowBlue)' : ''); }

    // Battery fill & stats
    if (dual) {
      const fill1 = this._battFill(battSoc1); const fill2 = this._battFill(battSoc2);
      const bf1 = getEl('battFillBar1'); if (bf1) { bf1.setAttribute('y', fill1.y); bf1.setAttribute('height', fill1.height); bf1.setAttribute('fill', fill1.color); bf1.setAttribute('filter', fill1.filter); }
      const bh1 = getEl('battFillHL1'); if (bh1) { bh1.setAttribute('y', fill1.y); bh1.setAttribute('height', fill1.height); }
      const bf2 = getEl('battFillBar2'); if (bf2) { bf2.setAttribute('y', fill2.y); bf2.setAttribute('height', fill2.height); bf2.setAttribute('fill', fill2.color); bf2.setAttribute('filter', fill2.filter); }
      const bh2 = getEl('battFillHL2'); if (bh2) { bh2.setAttribute('y', fill2.y); bh2.setAttribute('height', fill2.height); }
      setText('fcBattVal1', battSoc1 + '%'); setAttr('fcBattVal1', 'fill', fill1.textColor);
      setText('fcBattVal2', battSoc2 + '%'); setAttr('fcBattVal2', 'fill', fill2.textColor);
      // Update external labels below battery cylinder (average SOC for dual)
      const avgSoc = Math.round((battSoc1 + battSoc2) / 2);
      const socPctElD = getEl('fcBattSocPct'); if (socPctElD) { socPctElD.textContent = battSoc1 + '% / ' + battSoc2 + '%'; socPctElD.setAttribute('fill', this._socColor(avgSoc)); socPctElD.setAttribute('font-size', '11'); }
      const voltBelowElD = getEl('fcBattVoltBelow'); if (voltBelowElD) voltBelowElD.textContent = battVolt1.toFixed(1) + ' / ' + battVolt2.toFixed(1) + ' V';
      // Current & power shown in pill badge — no separate SVG text needed for dual
      const bolt1 = getEl('battBoltGroup1'), bolt2 = getEl('battBoltGroup2');
      if (bolt1) bolt1.setAttribute('opacity', battPwr1 > 10 ? '1' : '0');
      if (bolt2) bolt2.setAttribute('opacity', battPwr2 > 10 ? '1' : '0');
      // Fix #16: bTemp1/bTemp2 written once below in the label override block — skip early write
      // bMinCell, bMaxCell, bBattDis handled by label override block below
    } else {
      const fill = this._battFill(battSoc1);
      const bf = getEl('battFillBar'); if (bf) { bf.setAttribute('y', fill.y); bf.setAttribute('height', fill.height); bf.setAttribute('fill', fill.color); bf.setAttribute('filter', fill.filter); }
      const bh = getEl('battFillHL'); if (bh) { bh.setAttribute('y', fill.y); bh.setAttribute('height', fill.height); }
      setText('fcBattVal', battSoc1 + '%'); setAttr('fcBattVal', 'fill', fill.textColor);
      setText('battVoltageFlow', battVolt1.toFixed(1) + ' V');
      const bolt = getEl('battBoltGroup'); if (bolt) bolt.setAttribute('opacity', battPwr1 > 10 ? '1' : '0');
      // Update external SOC/voltage labels below battery cylinder
      const socPctEl = getEl('fcBattSocPct'); if (socPctEl) { socPctEl.textContent = battSoc1 + '%'; socPctEl.setAttribute('fill', this._socColor(battSoc1)); }
      const voltBelowEl = getEl('fcBattVoltBelow'); if (voltBelowEl) voltBelowEl.textContent = battVolt1.toFixed(1) + ' V';
      // Fix #16: bTemp1/bTemp2 written once below in the label override block � skip early write
      // bMinCell, bMaxCell, bBattDis handled by label override block below
    }

    // Color and value for cell tiles � handled by label override block below

    // Endurance � works in both Ah mode (needs voltage to get Wh) and kWh mode (direct)
    let endHours = null, endText = '--', endColor = '#8b949e', isETA = false;
    const _socPct = battSoc1;  // use SOC directly for colour
    if (dual) {
      const totalRemWh = (battSoc1 / 100) * fullWh + (battSoc2 / 100) * fullWh2;
      const totalCapWh = fullWh + fullWh2;
      const totalPower = battPwr1 + battPwr2;
      if (totalCapWh > 0) {
        if (totalPower < -10) {
          endHours = totalRemWh / Math.abs(totalPower);
          endText = this._fmtEndurance(endHours); endColor = this._remCapColor(_socPct);
        } else if (totalPower > 10) {
          const missingWh = totalCapWh - totalRemWh;
          endHours = Math.max(0, missingWh / totalPower);
          endText = this._fmtEndurance(endHours); endColor = '#00d7ff'; isETA = true;
        }
      }
    } else {
      // simpler: remWh from SOC × fullWh; if fullWh=0 (not configured), try Ah×V fallback
      const remWhFinal = fullWh > 0 ? (battSoc1 / 100) * fullWh
                                    : (fullAh > 0 && battVolt1 > 0 ? remCap1 * battVolt1 : 0);
      if (battPwr1 < -10 && remWhFinal > 0) {
        endHours = remWhFinal / Math.abs(battPwr1);
        endText = this._fmtEndurance(endHours); endColor = this._remCapColor(_socPct);
      } else if (battPwr1 > 10) {
        const capWh = fullWh > 0 ? fullWh : (fullAh > 0 && battVolt1 > 0 ? fullAh * battVolt1 : 0);
        if (capWh > 0) {
          const missingWh = capWh - remWhFinal;
          endHours = Math.max(0, missingWh / Math.abs(battPwr1));
          endText = this._fmtEndurance(endHours); endColor = '#00d7ff'; isETA = true;
        }
      }
    }
    // Total PV Generation stat tile
    const _totalPvGenEl = getEl('bTotalPvGen');
    if (_totalPvGenEl) {
      const totalPvGenEntity = this.config.total_pv_gen_entity || 'sensor.goodwe_total_pv_generation';
      const totalPvGenState = this._hass && this._hass.states[totalPvGenEntity];
      if (totalPvGenState && totalPvGenState.state !== 'unavailable' && totalPvGenState.state !== 'unknown') {
        const val = parseFloat(totalPvGenState.state);
        const unit = totalPvGenState.attributes?.unit_of_measurement || 'kWh';
        _totalPvGenEl.textContent = isNaN(val) ? '--' : val.toFixed(2) + ' ' + unit;
        _totalPvGenEl.style.color = '#f4d03f';
      } else {
        _totalPvGenEl.textContent = '-- kWh';
        _totalPvGenEl.style.color = '#8b949e';
      }
    }
    const pwrPct = Math.min(absPwr1 / invMax * 100, 100);
    const pwrBar = getEl('pwrBar');
    if (pwrBar) {
      pwrBar.style.width = pwrPct.toFixed(1) + '%';
      pwrBar.style.background = absPwr1 < 50 ? '#8b949e' : isCharging1 ? '#2b59ff' :
        `linear-gradient(to right, #f4d03f, #f39c4b ${(pwrPct * 0.5).toFixed(0)}%, #f85149)`;
    }
    const pwrPctEl = getEl('pwrPct');
    if (pwrPctEl) {
      pwrPctEl.textContent = pwrPct.toFixed(0) + '%';
      pwrPctEl.style.color = absPwr1 < 50 ? '#8b949e' : isCharging1 ? '#2b59ff' : '#f39c4b';
    }
    const badge = getEl('battStatusBadge');
    if (badge) { badge.textContent = absPwr1 < 50 ? 'IDLE' : isCharging1 ? 'CHG' : 'DISCHG'; badge.style.color = absPwr1 < 50 ? '#8b949e' : isCharging1 ? '#00d7ff' : '#3ce878'; }

    // Direction arrows above flow bars
    const gridDirEl = getEl('fcGridFlowDir');
    if (gridDirEl) gridDirEl.textContent = gridActive > 10 ? 'GRID' : gridActive < -10 ? 'GRID' : 'GRID';
    const battDirEl = getEl('fcBattFlowDir');
    if (battDirEl) battDirEl.textContent = '';
    setText('invTempFlow', invTemp.toFixed(1) + ' °C');
    setText('invNameLabel', this.config.inverter_name || 'INV');
    setAttr('invTempFlow', 'fill', invTemp <= 45 ? '#58a6ff' : invTemp <= 55 ? '#f39c4b' : '#f85149');
    const invLoadPct = Math.min(load / invMax * 100, 100).toFixed(0);
    // Fix #8: toFixed() returns a string; use Number() for the colour comparison
    setText('invLoadPctFlow', invLoadPct + '%');
    setAttr('invLoadPctFlow', 'fill', load > 10 ? loadFlowColor : '#8b949e');

    const gridDir = gridActive > 10 ? '▼ ' : gridActive < -10 ? '▲ ' : '';
    const absGrid2 = Math.abs(gridActive);
    const gridTxtFmt = absGrid2 >= 1000 ? (absGrid2 / 1000).toFixed(2) + ' kW' : absGrid2.toFixed(0) + ' W';
    const gridCol = gridActive > 10 ? '#FF2929' : gridActive < -10 ? '#2ecc71' : '#8b949e';
    setText('fcGridVal', gridDir + gridTxtFmt);     setAttr('fcGridVal', 'fill', gridCol);
    setText('fcGridFlowVal', gridTxtFmt);           setAttr('fcGridFlowVal', 'fill', gridCol);
    // Update flow label pill border colour
    // pill badge removed

    // PV generation label below house
    const pvGenBelowEl = getEl('fcPvGenBelowVal');
    if (pvGenBelowEl) {
      pvGenBelowEl.textContent = pvTotal >= 1000 ? (pvTotal / 1000).toFixed(2) + ' kW' : pvTotal.toFixed(0) + ' W';
      pvGenBelowEl.setAttribute('fill', pvTotal > 10 ? loadFlowColor : '#8b949e');
    }

    if (this.config._show_pv_extra) {
      setText('pv3FlowVal', pv3 >= 1000 ? (pv3 / 1000).toFixed(2) + ' kW' : pv3.toFixed(0) + ' W');
      setText('pv4FlowVal', pv4 >= 1000 ? (pv4 / 1000).toFixed(2) + ' kW' : pv4.toFixed(0) + ' W');
    }

    const invTempEl2 = getEl('invTempFlow'); if (invTempEl2) invTempEl2.style.display = '';
    const invLoadEl2 = getEl('invLoadPctFlow'); if (invLoadEl2) invLoadEl2.style.display = '';
    // Fix #9: use toFixed(2) to prevent floating-point artefacts; show '--' when sensor unavailable
    setText('invTodayPv',      _todayPvRaw      !== null ? todayPv.toFixed(2)      + ' kWh' : '-- kWh');
    setText('invTodayBattChg', _todayBattChgRaw !== null ? todayBattChg.toFixed(2) + ' kWh' : '-- kWh');
    setText('invTodayBattDis', battDis1Raw      !== null ? battDis1.toFixed(2)     + ' kWh' : '-- kWh');
    setText('invTodayLoad',    _todayLoadRaw    !== null ? todayLoad.toFixed(2)    + ' kWh' : '-- kWh');
    // ── Remaining Ah + kWh ──
    // Each battery uses its OWN Ah capacity; battery2_full_ah defaults to fullAh if not set
    const fullAh2 = capUnit === 'ah'
      ? (Number(this.config.battery2_full_ah) > 0 ? Number(this.config.battery2_full_ah) : fullAh)
      : 0;
    const remCap2 = fullAh2 > 0 ? (battSoc2 / 100) * fullAh2 : 0;
    const totalRemAh = fullAh > 0 ? remCap1 + (dual ? remCap2 : 0) : null;
    // kWh remaining: always SOC-based from configured capacity � never voltage-dependent
    const totalRemKwh = fullWh > 0
      ? ((battSoc1 / 100) * fullWh + (dual ? (battSoc2 / 100) * fullWh2 : 0)) / 1000
      : null;
    const invRemCapEl = getEl('invRemCap');
    const invRemKwhEl = getEl('invRemKwh');
    const remColor = this._remCapColor(battSoc1);
    if (capUnit === 'ah') {
      // Ah mode: integer, no decimal, left-padded with plain spaces to 3 chars wide
      if (invRemCapEl) {
        const ahInt = totalRemAh !== null ? Math.round(totalRemAh) : null;
        invRemCapEl.textContent = ahInt !== null ? String(ahInt).padStart(3, ' ') + ' Ah' : '-- Ah';
        invRemCapEl.style.color = remColor;
        invRemCapEl.style.display = '';
        invRemCapEl.style.fontVariantNumeric = 'tabular-nums';
      }
      if (invRemKwhEl) invRemKwhEl.style.display = 'none';
    } else {
      // kWh mode: always 2 decimal places, e.g. "15.92 kWh"
      if (invRemCapEl) invRemCapEl.style.display = 'none';
      if (invRemKwhEl) {
        invRemKwhEl.textContent = totalRemKwh !== null ? totalRemKwh.toFixed(2) + ' kWh' : '-- kWh';
        invRemKwhEl.style.color = remColor;
        invRemKwhEl.style.display = '';
      }
    }

    // ── Label entity overrides for stat tiles ──
    // Per-row: override active only when global gate ON AND label text ≠ its default
    const labelsOn = !!(this.config._labels_custom_entities);
    const _rowActive = (labelKey, def) => labelsOn && (this.config[labelKey] || def) !== def;

    // Read value from a custom entity key.
    // Returns {val: number, text: string, isText: false} for numeric entities.
    // Returns {val: null, text: stateString, isText: true} for text-state entities (e.g. "idle", "charging").
    // Returns null when entity is unavailable/unknown/missing.
    const _readVal = (entityKey) => {
      const eid = this.config[entityKey];
      if (!eid) return null;
      const s = this._hass && this._hass.states[eid];
      if (!s || s.state === 'unavailable' || s.state === 'unknown') return null;
      const v = parseFloat(s.state);
      if (!isNaN(v)) return { val: v, text: null, isText: false };
      // Non-numeric state (e.g. "idle", "charging", "on grid backup mode")
      return { val: null, text: String(s.state), isText: true };
    };
    // Keep _readNum as numeric-only shortcut (returns number or null)
    const _readNum = (entityKey) => {
      const r = _readVal(entityKey);
      return (r && !r.isText) ? r.val : null;
    };

    // Read the HA unit_of_measurement for a custom entity key.
    const _readUnit = (entityKey) =>
      this._hass?.states[this.config[entityKey]]?.attributes?.unit_of_measurement || '';

    // Smart value formatter: respects the entity's own unit.
    //   W / kW  → auto-range to kW at ≥1000 W
    //   V       → 3 decimal places
    //   °C / °F → 1 decimal place
    //   %       → 1 decimal place
    //   kWh / Wh / MWh → 2 decimal places
    //   anything else  → 2 decimal places
    // Also returns a colour appropriate for the unit.
    const _fmtCustom = (val, unit) => {
      const u = (unit || '').trim();
      let text, color;
      if (u === 'W') {
        if (Math.abs(val) >= 1000) { text = (val / 1000).toFixed(2) + ' kW'; }
        else                        { text = val.toFixed(0) + ' W'; }
        color = '#58a6ff';
      } else if (u === 'kW') {
        text = val.toFixed(2) + ' kW';
        color = '#58a6ff';
      } else if (u === 'V') {
        text = val.toFixed(3) + ' V';
        color = this._cellVoltColor(val);
      } else if (u === '°C' || u === '°F' || u === 'C' || u === 'F') {
        text = val.toFixed(1) + ' ' + (u.startsWith('°') ? u : '°' + u);
        color = this._cellTempColor(val);
      } else if (u === '%') {
        text = val.toFixed(1) + ' %';
        color = this._socColor(val);
      } else if (u === 'kWh' || u === 'Wh' || u === 'MWh') {
        text = val.toFixed(2) + ' ' + u;
        color = '#f4d03f';
      } else if (u === 'A') {
        text = val.toFixed(1) + ' A';
        color = '#cde';
      } else {
        // Unknown unit � show value + unit as-is
        text = val.toFixed(2) + (u ? ' ' + u : '');
        color = '#cde';
      }
      return { text, color };
    };

    // Cell temp tile
    const cellTempCustom = _rowActive('label_cell_temp_minmax', 'CELL TEMP MIN/MAX') && this.config.label_entity_cell_temp;
    const _cellTempRaw = cellTempCustom ? _readVal('label_entity_cell_temp') : null;
    const temp1Final = (_cellTempRaw && !_cellTempRaw.isText) ? _cellTempRaw.val : temp1_1;
    const cellTempUnit = cellTempCustom ? _readUnit('label_entity_cell_temp') : '°C';

    // BMS temp tile
    const bmsTempCustom = _rowActive('label_bms_temp', 'BMS TEMP') && this.config.label_entity_bms_temp;
    const _bmsTempRaw = bmsTempCustom ? _readVal('label_entity_bms_temp') : null;
    const mosFinal = (_bmsTempRaw && !_bmsTempRaw.isText) ? _bmsTempRaw.val : mos1;
    const bmsTempUnit = bmsTempCustom ? _readUnit('label_entity_bms_temp') : '°C';

    // Min cell tile
    const minCellCustom = _rowActive('label_min_cell', 'Min Cell') && this.config.label_entity_min_cell;
    const _minCellRaw = minCellCustom ? _readVal('label_entity_min_cell') : null;
    const minCellFinal = (_minCellRaw && !_minCellRaw.isText) ? _minCellRaw.val : minCell1;
    const minCellUnit  = minCellCustom ? _readUnit('label_entity_min_cell') : 'V';

    // Max cell tile
    const maxCellCustom = _rowActive('label_max_cell', 'Max Cell') && this.config.label_entity_max_cell;
    const _maxCellRaw = maxCellCustom ? _readVal('label_entity_max_cell') : null;
    const maxCellFinal = (_maxCellRaw && !_maxCellRaw.isText) ? _maxCellRaw.val : maxCell1;
    const maxCellUnit  = maxCellCustom ? _readUnit('label_entity_max_cell') : 'V';

    // Batt dis tile
    const battDisCustom = _rowActive('label_batt_dis', 'Batt Dis.') && this.config.label_entity_batt_dis;
    const _battDisRaw = battDisCustom ? _readVal('label_entity_batt_dis') : null;
    const battDisFinal = (_battDisRaw && !_battDisRaw.isText) ? _battDisRaw.val : battDis1;
    const battDisUnit  = battDisCustom ? _readUnit('label_entity_batt_dis') : 'kWh';

    // ── Apply overrides to stat tiles ──
    const _bT1o = getEl('bTemp1');
    if (_bT1o) {
      if (cellTempCustom) {
        if (!_cellTempRaw) { _bT1o.textContent = '--'; _bT1o.style.color = '#8b949e'; }
        else if (_cellTempRaw.isText) { _bT1o.textContent = _cellTempRaw.text; _bT1o.style.color = '#c9d1d9'; }
        else { const fmt = _fmtCustom(_cellTempRaw.val, cellTempUnit); _bT1o.textContent = fmt.text; _bT1o.style.color = fmt.color; }
      } else {
        _bT1o.textContent = temp1_1.toFixed(1) + ' / ' + temp2_1.toFixed(1) + ' °C';
        _bT1o.style.color = this._cellTempColor(Math.max(temp1_1, temp2_1));
      }
    }
    const _bT2o = getEl('bTemp2');
    if (_bT2o) {
      if (bmsTempCustom) {
        if (!_bmsTempRaw) { _bT2o.textContent = '--'; _bT2o.style.color = '#8b949e'; }
        else if (_bmsTempRaw.isText) { _bT2o.textContent = _bmsTempRaw.text; _bT2o.style.color = '#c9d1d9'; }
        else { const fmt = _fmtCustom(_bmsTempRaw.val, bmsTempUnit); _bT2o.textContent = fmt.text; _bT2o.style.color = fmt.color; }
      } else {
        _bT2o.textContent = mos1.toFixed(1) + (dual ? ' / ' + mos2.toFixed(1) : '') + ' °C';
        _bT2o.style.color = this._cellTempColor(dual ? Math.max(mos1, mos2) : mos1);
      }
    }
    const _bMno = getEl('bMinCell');
    if (_bMno) {
      if (minCellCustom) {
        if (!_minCellRaw) { _bMno.textContent = '--'; _bMno.style.color = '#8b949e'; }
        else if (_minCellRaw.isText) { _bMno.textContent = _minCellRaw.text; _bMno.style.color = '#c9d1d9'; }
        else { const fmt = _fmtCustom(_minCellRaw.val, minCellUnit); _bMno.textContent = fmt.text; _bMno.style.color = fmt.color; }
      } else {
        _bMno.textContent = minCell1.toFixed(3) + ' V';
        _bMno.style.color = this._cellVoltColor(minCell1);
      }
    }
    const _bMxo = getEl('bMaxCell');
    if (_bMxo) {
      if (maxCellCustom) {
        if (!_maxCellRaw) { _bMxo.textContent = '--'; _bMxo.style.color = '#8b949e'; }
        else if (_maxCellRaw.isText) { _bMxo.textContent = _maxCellRaw.text; _bMxo.style.color = '#c9d1d9'; }
        else { const fmt = _fmtCustom(_maxCellRaw.val, maxCellUnit); _bMxo.textContent = fmt.text; _bMxo.style.color = fmt.color; }
      } else {
        _bMxo.textContent = maxCell1.toFixed(3) + ' V';
        _bMxo.style.color = this._cellVoltColor(maxCell1);
      }
    }
    const _bDiso = getEl('bBattDis');
    if (_bDiso) {
      if (battDisCustom) {
        if (!_battDisRaw) { _bDiso.textContent = '--'; _bDiso.style.color = '#8b949e'; }
        else if (_battDisRaw.isText) { _bDiso.textContent = _battDisRaw.text; _bDiso.style.color = '#c9d1d9'; }
        else { const fmt = _fmtCustom(_battDisRaw.val, battDisUnit); _bDiso.textContent = fmt.text; _bDiso.style.color = fmt.color; }
      } else {
        _bDiso.textContent = battDis1Raw !== null ? battDis1.toFixed(2) + ' kWh' : '-- kWh';
        _bDiso.style.color = '';
      }
    }

    // ── HTML stat tile � endurance ──
    // Fix #13: remove ETA duplication � label says ETA, value shows only the duration
    const _tillStr = this._fmtTill(endHours);
    const _bEnduStat = getEl('bEnduranceStat');
    if (_bEnduStat) { _bEnduStat.textContent = endText; _bEnduStat.style.color = endColor; }
    const _bEnduStatLbl = getEl('bEnduStatLbl');
    if (_bEnduStatLbl) _bEnduStatLbl.textContent = isETA ? 'ETA' : (this.config.label_endurance || 'ENDURANCE');
    const _bEnduTimeEl = getEl('bEnduranceTime');
    if (_bEnduTimeEl) { _bEnduTimeEl.textContent = _tillStr; _bEnduTimeEl.style.color = endHours !== null ? endColor : '#8b949e'; }

    const pvBlocks = getEl('pvBlocks');
    const pvBlocksKey = pvTotal + '|' + pvMax;
    if (pvBlocks && pvBlocksKey !== this._prevPvBlocksKey) {
      this._prevPvBlocksKey = pvBlocksKey;
      pvBlocks.innerHTML = this._buildPvBlocksHTML(pvTotal, pvMax);
    }

    // EV
    const evGroup = getEl('evGroup');
    if (evGroup) {
      if (!this.config._show_ev) {
        evGroup.style.display = 'none';
        // Fix #12: removed early return here � was silently skipping any code added after this block
      } else {
        evGroup.style.display = '';
      const isChargingEV = chargerStateStr === 'charging';
      const isCompleted = chargerStateStr === 'completed' || chargerStateStr === 'finished';
      const evFlow = getEl('flowHomeEV');
      const evIcon = getEl('evIconImg');
      if (evFlow) {
        if (isChargingEV) {
          evFlow.setAttribute('opacity', '0.9'); evFlow.setAttribute('stroke', '#00aaff');
          // Fix #6: always reset opacity before applying filter (was stuck at 0.3 if previously disconnected)
          if (evIcon) { evIcon.style.opacity = '1'; evIcon.setAttribute('filter', 'url(#iconGlowBlue)'); }
        } else if (isCompleted) {
          evFlow.setAttribute('opacity', '0');
          if (evIcon) { evIcon.style.opacity = '1'; evIcon.setAttribute('filter', 'url(#iconGlowGreen)'); }
        } else {
          evFlow.setAttribute('opacity', '0');
          if (evIcon) { evIcon.setAttribute('filter', ''); evIcon.style.opacity = '0.35'; }
        }
      }
      if (isChargingEV || isCompleted) {
        setText('evPowerVal', chargerPower.toFixed(0) + ' W');
        setText('evCurrentVal', chargerCurrent.toFixed(1) + ' A');
        setText('evSocVal', chargerSoc.toFixed(0) + ' %');
        let evEta = '--';
        if (isChargingEV) {
          if (chargerEtaSensor !== null && !isNaN(chargerEtaSensor)) evEta = this._fmtTime(chargerEtaSensor / 60);
          else if (chargerBattCapWh && chargerSoc > 0 && chargerPower > 0) {
            const remainingWh = chargerBattCapWh * (100 - chargerSoc) / 100;
            const hours = remainingWh / chargerPower;
            evEta = this._fmtTime(hours);
          }
        } else if (isCompleted) {
          evEta = 'Full';
        }
        setText('evEtaVal', evEta);
      } else {
        setText('evPowerVal', '-- W');
        setText('evCurrentVal', '-- A');
        setText('evSocVal', '-- %');
        setText('evEtaVal', '--');
      }
      } // end else (_show_ev)
    }
  }
}
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'khan-skycard',
  name: 'Khan SkyCard',
  description: 'Real-time solar/battery/grid energy flow card with animated power paths, dual-battery support, EV charger integration, and per-tile label overrides.',
  preview: true,
  version: '2.0.0',
});
customElements.define('khan-skycard', KhanSkyCard);