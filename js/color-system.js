const PRESET_PALETTES = {
    'PICO-8': [
        {r:0,g:0,b:0,a:255},{r:29,g:43,b:83,a:255},{r:126,g:37,b:83,a:255},{r:0,g:135,b:81,a:255},
        {r:171,g:82,b:54,a:255},{r:95,g:87,b:79,a:255},{r:194,g:195,b:199,a:255},{r:255,g:241,b:232,a:255},
        {r:255,g:0,b:77,a:255},{r:255,g:163,b:0,a:255},{r:255,g:236,b:39,a:255},{r:0,g:228,b:54,a:255},
        {r:41,g:173,b:255,a:255},{r:131,g:118,b:156,a:255},{r:255,g:119,b:168,a:255},{r:255,g:204,b:170,a:255}
    ],
    'Game Boy': [
        {r:15,g:56,b:15,a:255},{r:48,g:98,b:48,a:255},{r:139,g:172,b:15,a:255},{r:155,g:188,b:15,a:255}
    ],
    'NES': [
        {r:0,g:0,b:0,a:255},{r:252,g:252,b:252,a:255},{r:188,g:188,b:188,a:255},{r:124,g:124,b:124,a:255},
        {r:168,g:0,b:32,a:255},{r:228,g:0,b:88,a:255},{r:248,g:56,b:0,a:255},{r:228,g:92,b:16,a:255},
        {r:172,g:124,b:0,a:255},{r:0,g:184,b:0,a:255},{r:0,g:168,b:0,a:255},{r:0,g:168,b:68,a:255},
        {r:0,g:136,b:136,a:255},{r:0,g:120,b:248,a:255},{r:104,g:68,b:252,a:255},{r:152,g:0,b:240,a:255}
    ],
    'Endesga 32': [
        {r:190,g:74,b:47,a:255},{r:215,g:118,b:67,a:255},{r:234,g:212,b:170,a:255},{r:228,g:166,b:114,a:255},
        {r:184,g:111,b:80,a:255},{r:115,g:62,b:57,a:255},{r:62,g:39,b:49,a:255},{r:162,g:38,b:51,a:255},
        {r:228,g:59,b:68,a:255},{r:247,g:118,b:34,a:255},{r:254,g:174,b:52,a:255},{r:254,g:231,b:97,a:255},
        {r:99,g:199,b:77,a:255},{r:62,g:137,b:72,a:255},{r:38,g:92,b:66,a:255},{r:25,g:60,b:62,a:255},
        {r:18,g:78,b:137,a:255},{r:0,g:153,b:219,a:255},{r:44,g:232,b:245,a:255},{r:192,g:203,b:220,a:255},
        {r:139,g:155,b:180,a:255},{r:90,g:105,b:136,a:255},{r:58,g:68,b:102,a:255},{r:38,g:43,b:68,a:255},
        {r:24,g:20,b:37,a:255},{r:255,g:0,b:68,a:255},{r:104,g:56,b:108,a:255},{r:181,g:80,b:136,a:255},
        {r:246,g:117,b:122,a:255},{r:232,g:183,b:150,a:255},{r:194,g:133,b:105,a:255},{r:143,g:77,b:87,a:255}
    ],
    'Sweetie 16': [
        {r:26,g:28,b:44,a:255},{r:93,g:39,b:93,a:255},{r:177,g:62,b:83,a:255},{r:239,g:125,b:87,a:255},
        {r:255,g:205,b:117,a:255},{r:167,g:240,b:112,a:255},{r:56,g:183,b:100,a:255},{r:37,g:113,b:121,a:255},
        {r:41,g:54,b:111,a:255},{r:59,g:93,b:201,a:255},{r:65,g:166,b:246,a:255},{r:115,g:239,b:247,a:255},
        {r:244,g:244,b:244,a:255},{r:148,g:176,b:194,a:255},{r:86,g:108,b:134,a:255},{r:51,g:60,b:87,a:255}
    ],
    'Resurrect 64': [
        {r:46,g:34,b:47,a:255},{r:62,g:53,b:70,a:255},{r:80,g:73,b:89,a:255},{r:101,g:97,b:109,a:255},
        {r:117,g:113,b:120,a:255},{r:140,g:135,b:137,a:255},{r:164,g:159,b:153,a:255},{r:186,g:182,b:174,a:255},
        {r:208,g:205,b:193,a:255},{r:230,g:228,b:218,a:255},{r:252,g:252,b:240,a:255},{r:255,g:230,b:167,a:255},
        {r:255,g:199,b:119,a:255},{r:247,g:160,b:88,a:255},{r:230,g:122,b:69,a:255},{r:206,g:85,b:69,a:255},
        {r:170,g:58,b:68,a:255},{r:131,g:40,b:66,a:255},{r:94,g:33,b:63,a:255},{r:76,g:40,b:64,a:255},
        {r:103,g:56,b:76,a:255},{r:140,g:68,b:82,a:255},{r:182,g:86,b:92,a:255},{r:214,g:117,b:114,a:255},
        {r:238,g:157,b:143,a:255},{r:255,g:198,b:163,a:255},{r:232,g:158,b:132,a:255},{r:198,g:118,b:109,a:255},
        {r:162,g:82,b:93,a:255},{r:126,g:58,b:84,a:255},{r:94,g:44,b:81,a:255},{r:66,g:38,b:78,a:255},
        {r:90,g:50,b:97,a:255},{r:119,g:63,b:119,a:255},{r:152,g:78,b:140,a:255},{r:187,g:99,b:158,a:255},
        {r:222,g:128,b:172,a:255},{r:249,g:163,b:186,a:255},{r:248,g:200,b:200,a:255},{r:244,g:159,b:159,a:255},
        {r:228,g:117,b:128,a:255},{r:202,g:80,b:104,a:255},{r:166,g:52,b:92,a:255},{r:120,g:38,b:86,a:255},
        {r:75,g:37,b:85,a:255},{r:52,g:47,b:95,a:255},{r:60,g:67,b:120,a:255},{r:70,g:93,b:146,a:255},
        {r:80,g:123,b:168,a:255},{r:95,g:156,b:188,a:255},{r:120,g:191,b:206,a:255},{r:154,g:222,b:219,a:255},
        {r:189,g:243,b:227,a:255},{r:164,g:225,b:186,a:255},{r:128,g:200,b:145,a:255},{r:93,g:171,b:113,a:255},
        {r:63,g:140,b:95,a:255},{r:44,g:107,b:87,a:255},{r:37,g:76,b:80,a:255},{r:38,g:55,b:70,a:255},
        {r:51,g:73,b:88,a:255},{r:74,g:101,b:113,a:255},{r:103,g:133,b:138,a:255},{r:138,g:166,b:162,a:255}
    ]
};

export class ColorSystem {
    constructor(editor) {
        this.editor = editor;
        this.color = { r: 255, g: 255, b: 255, a: 255 };
        this.secondaryColor = { r: 0, g: 0, b: 0, a: 255 };
        this.customPalette = Array.from({ length: 16 }, () => ({ r: 128, g: 128, b: 128, a: 255 }));
        this.recentColors = [];
        this.paletteLock = false;
        this.indexedMode = false;
        this.hue = 0;
        this.sat = 0;
        this.val = 100;
        this._svDragging = false;
        this._hueDragging = false;
        this._loadPalette();
        this._initPicker();
        this._bindUI();
        this.syncUI();
    }

    _loadPalette() {
        try {
            const saved = localStorage.getItem('sprite_editor_palette');
            if (saved) this.customPalette = JSON.parse(saved);
        } catch {}
    }

    _savePalette() {
        localStorage.setItem('sprite_editor_palette', JSON.stringify(this.customPalette));
    }

    _initPicker() {
        this._drawHueStrip();
        this._drawSVCanvas();
    }

    _drawHueStrip() {
        const canvas = document.getElementById('hue-canvas');
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        for (let x = 0; x < w; x++) {
            ctx.fillStyle = `hsl(${(x / w) * 360}, 100%, 50%)`;
            ctx.fillRect(x, 0, 1, 1);
        }
    }

    _drawSVCanvas() {
        const canvas = document.getElementById('sv-canvas');
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = `hsl(${this.hue}, 100%, 50%)`;
        ctx.fillRect(0, 0, w, h);
        const white = ctx.createLinearGradient(0, 0, w, 0);
        white.addColorStop(0, 'rgba(255,255,255,1)');
        white.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = white;
        ctx.fillRect(0, 0, w, h);
        const black = ctx.createLinearGradient(0, 0, 0, h);
        black.addColorStop(0, 'rgba(0,0,0,0)');
        black.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = black;
        ctx.fillRect(0, 0, w, h);
    }

    _bindUI() {
        const svCanvas = document.getElementById('color-picker-area');
        const hueRow = document.getElementById('hue-strip-row');

        svCanvas.addEventListener('pointerdown', (e) => {
            this._svDragging = true;
            svCanvas.setPointerCapture(e.pointerId);
            this._pickSV(e);
        });
        svCanvas.addEventListener('pointermove', (e) => {
            if (this._svDragging) this._pickSV(e);
        });
        svCanvas.addEventListener('pointerup', (e) => {
            this._svDragging = false;
        });
        svCanvas.addEventListener('pointercancel', () => {
            this._svDragging = false;
        });

        hueRow.addEventListener('pointerdown', (e) => {
            this._hueDragging = true;
            hueRow.setPointerCapture(e.pointerId);
            this._pickHue(e);
        });
        hueRow.addEventListener('pointermove', (e) => {
            if (this._hueDragging) this._pickHue(e);
        });
        hueRow.addEventListener('pointerup', () => {
            this._hueDragging = false;
        });
        hueRow.addEventListener('pointercancel', () => {
            this._hueDragging = false;
        });

        document.getElementById('alpha-slider').addEventListener('input', (e) => {
            this.color.a = parseInt(e.target.value);
            this.syncUI(true);
        });

        document.getElementById('native-picker').addEventListener('input', (e) => {
            this._setFromHex(e.target.value);
        });

        document.getElementById('hex-input').addEventListener('change', (e) => {
            const val = e.target.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                this._setFromHex(val);
            }
        });

        document.getElementById('btn-lighter').addEventListener('click', () => this.shiftLightness(10));
        document.getElementById('btn-darker').addEventListener('click', () => this.shiftLightness(-10));
        document.getElementById('btn-swap-colors').addEventListener('click', () => this.swap());

        document.getElementById('color-primary-large').addEventListener('click', () => {
            const picker = document.getElementById('picker-primary');
            picker.value = this._rgbToHex(this.color.r, this.color.g, this.color.b);
            picker.click();
        });
        document.getElementById('picker-primary').addEventListener('input', (e) => {
            this._setFromHex(e.target.value);
        });

        document.getElementById('color-secondary-large').addEventListener('click', () => {
            const picker = document.getElementById('picker-secondary');
            picker.value = this._rgbToHex(this.secondaryColor.r, this.secondaryColor.g, this.secondaryColor.b);
            picker.click();
        });
        document.getElementById('picker-secondary').addEventListener('input', (e) => {
            const hex = e.target.value;
            this.secondaryColor.r = parseInt(hex.slice(1, 3), 16);
            this.secondaryColor.g = parseInt(hex.slice(3, 5), 16);
            this.secondaryColor.b = parseInt(hex.slice(5, 7), 16);
            this.syncUI();
        });

        const swatchBtn = document.getElementById('color-swatch-btn');
        let swatchLongPress = null;
        swatchBtn.addEventListener('click', () => {
            this.editor.togglePanel('color-panel');
        });
        swatchBtn.addEventListener('touchstart', () => {
            swatchLongPress = setTimeout(() => {
                swatchLongPress = null;
                this.swap();
            }, 400);
        }, { passive: true });
        swatchBtn.addEventListener('touchend', () => {
            if (swatchLongPress) { clearTimeout(swatchLongPress); swatchLongPress = null; }
        });
        swatchBtn.addEventListener('touchmove', () => {
            if (swatchLongPress) { clearTimeout(swatchLongPress); swatchLongPress = null; }
        }, { passive: true });

        document.getElementById('custom-palette').addEventListener('click', (e) => {
            const slot = e.target.closest('.palette-slot');
            if (!slot) return;
            const idx = parseInt(slot.dataset.idx);
            this.color = { ...this.customPalette[idx] };
            this.syncUI();
        });

        document.getElementById('custom-palette').addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const slot = e.target.closest('.palette-slot');
            if (!slot) return;
            const idx = parseInt(slot.dataset.idx);
            const oldColor = { ...this.customPalette[idx] };
            this.customPalette[idx] = { ...this.color };
            this._savePalette();
            this._renderCustomPalette();
            if (this.indexedMode) this._indexedRecolor(oldColor, this.color);
        });

        let longPressTimer = null;
        document.getElementById('custom-palette').addEventListener('pointerdown', (e) => {
            const slot = e.target.closest('.palette-slot');
            if (!slot) return;
            longPressTimer = setTimeout(() => {
                const idx = parseInt(slot.dataset.idx);
                const oldColor = { ...this.customPalette[idx] };
                this.customPalette[idx] = { ...this.color };
                this._savePalette();
                this._renderCustomPalette();
                if (this.indexedMode) this._indexedRecolor(oldColor, this.color);
                longPressTimer = null;
            }, 500);
        });
        document.getElementById('custom-palette').addEventListener('pointerup', () => {
            if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        });

        document.getElementById('recent-colors').addEventListener('click', (e) => {
            const swatch = e.target.closest('.recent-swatch');
            if (!swatch) return;
            this.color = JSON.parse(swatch.dataset.color);
            this.syncUI();
        });

        document.getElementById('btn-palette-lock').addEventListener('click', () => {
            this.paletteLock = !this.paletteLock;
            const btn = document.getElementById('btn-palette-lock');
            btn.textContent = this.paletteLock ? 'On' : 'Off';
            btn.classList.toggle('active', this.paletteLock);
        });

        document.getElementById('btn-gen-ramp').addEventListener('click', () => this._generateRamp());

        document.getElementById('preset-palette-select').addEventListener('change', (e) => {
            const name = e.target.value;
            if (!name) return;
            this.loadPreset(name);
            e.target.value = '';
        });

        document.getElementById('btn-indexed-mode').addEventListener('click', () => {
            this.indexedMode = !this.indexedMode;
            const btn = document.getElementById('btn-indexed-mode');
            btn.classList.toggle('active', this.indexedMode);
        });

        document.getElementById('btn-save-palette').addEventListener('click', () => this._exportPaletteFile());
        document.getElementById('btn-load-palette').addEventListener('click', () => {
            document.getElementById('file-load-palette').click();
        });
        document.getElementById('file-load-palette').addEventListener('change', (e) => {
            if (e.target.files[0]) this._importPaletteFile(e.target.files[0]);
            e.target.value = '';
        });
    }

    _pickSV(e) {
        const area = document.getElementById('color-picker-area');
        const rect = area.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        this.sat = x * 100;
        this.val = (1 - y) * 100;
        const rgb = this.hsvToRgb(this.hue, this.sat, this.val);
        this.color.r = rgb.r;
        this.color.g = rgb.g;
        this.color.b = rgb.b;
        if (this.paletteLock) this._snapToPalette();
        this.syncUI(true);
    }

    _pickHue(e) {
        const row = document.getElementById('hue-strip-row');
        const rect = row.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this.hue = x * 360;
        this._drawSVCanvas();
        const rgb = this.hsvToRgb(this.hue, this.sat, this.val);
        this.color.r = rgb.r;
        this.color.g = rgb.g;
        this.color.b = rgb.b;
        if (this.paletteLock) this._snapToPalette();
        this.syncUI(true);
    }

    _setFromHex(hex) {
        this.color.r = parseInt(hex.slice(1, 3), 16);
        this.color.g = parseInt(hex.slice(3, 5), 16);
        this.color.b = parseInt(hex.slice(5, 7), 16);
        if (this.paletteLock) this._snapToPalette();
        this.syncUI();
    }

    _snapToPalette() {
        let best = null, bestDist = Infinity;
        for (const c of this.customPalette) {
            const dr = this.color.r - c.r, dg = this.color.g - c.g, db = this.color.b - c.b;
            const dist = dr * dr + dg * dg + db * db;
            if (dist < bestDist) { bestDist = dist; best = c; }
        }
        if (best) {
            this.color.r = best.r;
            this.color.g = best.g;
            this.color.b = best.b;
            this.color.a = best.a;
        }
    }

    _rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
    }

    syncUI(skipHSV) {
        const { r, g, b, a } = this.color;
        const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');

        document.getElementById('native-picker').value = hex;
        document.getElementById('hex-input').value = hex;
        document.getElementById('alpha-slider').value = a;
        document.getElementById('alpha-val').textContent = a;

        if (!skipHSV) {
            const hsv = this.rgbToHsv(r, g, b);
            if (hsv.s > 0 || hsv.v > 0) this.hue = hsv.h;
            this.sat = hsv.s;
            this.val = hsv.v;
            this._drawSVCanvas();
        }

        const svArea = document.getElementById('color-picker-area');
        const svCursor = document.getElementById('sv-cursor');
        svCursor.style.left = (this.sat / 100) * svArea.clientWidth + 'px';
        svCursor.style.top = ((100 - this.val) / 100) * svArea.clientHeight + 'px';

        const hueRow = document.getElementById('hue-strip-row');
        const hueCursor = document.getElementById('hue-cursor');
        hueCursor.style.left = (this.hue / 360) * hueRow.clientWidth + 'px';

        document.getElementById('color-primary-large').style.background = `rgba(${r},${g},${b},${a / 255})`;
        document.getElementById('primary-swatch').style.background = `rgba(${r},${g},${b},${a / 255})`;

        const sc = this.secondaryColor;
        document.getElementById('color-secondary-large').style.background = `rgba(${sc.r},${sc.g},${sc.b},${sc.a / 255})`;
        document.getElementById('secondary-swatch').style.background = `rgba(${sc.r},${sc.g},${sc.b},${sc.a / 255})`;

        this._renderCustomPalette();
        this._renderRecentColors();
    }

    swap() {
        const tmp = { ...this.color };
        this.color = { ...this.secondaryColor };
        this.secondaryColor = tmp;
        this.syncUI();
    }

    shiftLightness(amount) {
        const hsl = this.rgbToHsl(this.color.r, this.color.g, this.color.b);
        hsl.l = Math.max(0, Math.min(100, hsl.l + amount));
        const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
        this.color.r = rgb.r;
        this.color.g = rgb.g;
        this.color.b = rgb.b;
        this.syncUI();
    }

    addRecentColor() {
        const c = { ...this.color };
        const key = `${c.r},${c.g},${c.b},${c.a}`;
        this.recentColors = this.recentColors.filter(rc => `${rc.r},${rc.g},${rc.b},${rc.a}` !== key);
        this.recentColors.unshift(c);
        if (this.recentColors.length > 16) this.recentColors.pop();
        this._renderRecentColors();
    }

    extractPalette(pixels) {
        const colorCount = new Map();
        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] === 0) continue;
            const key = `${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${pixels[i + 3]}`;
            colorCount.set(key, (colorCount.get(key) || 0) + 1);
        }
        const sorted = [...colorCount.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([key]) => {
                const [r, g, b, a] = key.split(',').map(Number);
                return { r, g, b, a };
            });
        if (sorted.length === 0) return 0;
        const count = Math.min(this.customPalette.length, sorted.length);
        for (let i = 0; i < count; i++) {
            this.customPalette[i] = sorted[i];
        }
        this._savePalette();
        this._renderCustomPalette();
        return count;
    }

    loadPreset(name) {
        const preset = PRESET_PALETTES[name];
        if (!preset) return;
        this.customPalette = preset.map(c => ({ ...c }));
        this._savePalette();
        this._renderCustomPalette();
    }

    _generateRamp() {
        const c1 = this.color;
        const c2 = this.secondaryColor;
        const steps = this.customPalette.length;
        const hsl1 = this.rgbToHsl(c1.r, c1.g, c1.b);
        const hsl2 = this.rgbToHsl(c2.r, c2.g, c2.b);
        for (let i = 0; i < steps; i++) {
            const t = steps === 1 ? 0 : i / (steps - 1);
            const h = Math.round(hsl1.h + (hsl2.h - hsl1.h) * t);
            const s = Math.round(hsl1.s + (hsl2.s - hsl1.s) * t);
            const l = Math.round(hsl1.l + (hsl2.l - hsl1.l) * t);
            const rgb = this.hslToRgb(h, s, l);
            this.customPalette[i] = { r: rgb.r, g: rgb.g, b: rgb.b, a: 255 };
        }
        this._savePalette();
        this._renderCustomPalette();
    }

    _exportPaletteFile() {
        const hex = this.customPalette.map(c => this._rgbToHex(c.r, c.g, c.b));
        const blob = new Blob([hex.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'palette.hex';
        a.click();
        URL.revokeObjectURL(url);
    }

    _importPaletteFile(file) {
        const reader = new FileReader();
        reader.onload = () => {
            const text = reader.result.trim();
            const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l);
            const colors = [];
            for (const line of lines) {
                const hex = line.startsWith('#') ? line : '#' + line;
                if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
                    colors.push({
                        r: parseInt(hex.slice(1, 3), 16),
                        g: parseInt(hex.slice(3, 5), 16),
                        b: parseInt(hex.slice(5, 7), 16),
                        a: 255
                    });
                }
            }
            if (colors.length > 0) {
                this.customPalette = colors;
                this._savePalette();
                this._renderCustomPalette();
            }
        };
        reader.readAsText(file);
    }

    _indexedRecolor(oldColor, newColor) {
        if (oldColor.r === newColor.r && oldColor.g === newColor.g && oldColor.b === newColor.b && oldColor.a === newColor.a) return;
        const pixels = this.editor.pixels;
        const total = pixels.length;
        for (let i = 0; i < total; i += 4) {
            if (pixels[i] === oldColor.r && pixels[i + 1] === oldColor.g &&
                pixels[i + 2] === oldColor.b && pixels[i + 3] === oldColor.a) {
                pixels[i] = newColor.r;
                pixels[i + 1] = newColor.g;
                pixels[i + 2] = newColor.b;
                pixels[i + 3] = newColor.a;
            }
        }
        this.editor.autoSave();
    }

    highlightPaletteSlots(count) {
        const slots = document.querySelectorAll('#custom-palette .palette-slot');
        slots.forEach((slot, i) => {
            if (i < count) {
                slot.classList.add('palette-highlight');
                setTimeout(() => slot.classList.remove('palette-highlight'), 2000);
            }
        });
    }

    _renderCustomPalette() {
        const el = document.getElementById('custom-palette');
        el.innerHTML = this.customPalette.map((c, i) =>
            `<div class="palette-slot" data-idx="${i}" style="background:rgba(${c.r},${c.g},${c.b},${c.a / 255})"></div>`
        ).join('');
    }

    _renderRecentColors() {
        const el = document.getElementById('recent-colors');
        el.innerHTML = this.recentColors.map(c =>
            `<div class="recent-swatch" data-color='${JSON.stringify(c)}' style="background:rgba(${c.r},${c.g},${c.b},${c.a / 255})"></div>`
        ).join('');
    }

    hsvToRgb(h, s, v) {
        s /= 100; v /= 100;
        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;
        let r, g, b;
        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const d = max - min;
        let h = 0, s = max === 0 ? 0 : d / max, v = max;
        if (d !== 0) {
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
                case g: h = ((b - r) / d + 2) * 60; break;
                case b: h = ((r - g) / d + 4) * 60; break;
            }
        }
        return { h, s: s * 100, v: v * 100 };
    }

    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    }
}
