export class ColorSystem {
    constructor(editor) {
        this.editor = editor;
        this.color = { r: 255, g: 255, b: 255, a: 255 };
        this.secondaryColor = { r: 0, g: 0, b: 0, a: 255 };
        this.customPalette = Array.from({ length: 6 }, () => ({ r: 128, g: 128, b: 128, a: 255 }));
        this.recentColors = [];
        this._loadPalette();
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

    _bindUI() {
        document.getElementById('hsl-h').addEventListener('input', (e) => this._onHSLChange());
        document.getElementById('hsl-s').addEventListener('input', (e) => this._onHSLChange());
        document.getElementById('hsl-l').addEventListener('input', (e) => this._onHSLChange());
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

        document.getElementById('color-swatch-btn').addEventListener('click', () => {
            this.editor.togglePanel('color-panel');
        });

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
            this.customPalette[idx] = { ...this.color };
            this._savePalette();
            this._renderCustomPalette();
        });

        let longPressTimer = null;
        document.getElementById('custom-palette').addEventListener('pointerdown', (e) => {
            const slot = e.target.closest('.palette-slot');
            if (!slot) return;
            longPressTimer = setTimeout(() => {
                const idx = parseInt(slot.dataset.idx);
                this.customPalette[idx] = { ...this.color };
                this._savePalette();
                this._renderCustomPalette();
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
    }

    _onHSLChange() {
        const h = parseInt(document.getElementById('hsl-h').value);
        const s = parseInt(document.getElementById('hsl-s').value);
        const l = parseInt(document.getElementById('hsl-l').value);
        const rgb = this.hslToRgb(h, s, l);
        this.color.r = rgb.r;
        this.color.g = rgb.g;
        this.color.b = rgb.b;
        this.syncUI(true);
    }

    _setFromHex(hex) {
        this.color.r = parseInt(hex.slice(1, 3), 16);
        this.color.g = parseInt(hex.slice(3, 5), 16);
        this.color.b = parseInt(hex.slice(5, 7), 16);
        this.syncUI();
    }

    _rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
    }

    syncUI(skipHSL) {
        const { r, g, b, a } = this.color;
        const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');

        document.getElementById('native-picker').value = hex;
        document.getElementById('hex-input').value = hex;
        document.getElementById('alpha-slider').value = a;
        document.getElementById('alpha-val').textContent = a;

        if (!skipHSL) {
            const hsl = this.rgbToHsl(r, g, b);
            document.getElementById('hsl-h').value = hsl.h;
            document.getElementById('hsl-s').value = hsl.s;
            document.getElementById('hsl-l').value = hsl.l;
            document.getElementById('hsl-h-val').textContent = hsl.h;
            document.getElementById('hsl-s-val').textContent = hsl.s;
            document.getElementById('hsl-l-val').textContent = hsl.l;
        }

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
        const colorSet = new Map();
        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] === 0) continue;
            const key = `${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${pixels[i + 3]}`;
            if (!colorSet.has(key)) {
                colorSet.set(key, { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2], a: pixels[i + 3] });
            }
        }
        const colors = [...colorSet.values()];
        if (colors.length === 0) return 0;
        for (let i = 0; i < 6 && i < colors.length; i++) {
            this.customPalette[i] = colors[i];
        }
        this._savePalette();
        this._renderCustomPalette();
        return Math.min(6, colors.length);
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
