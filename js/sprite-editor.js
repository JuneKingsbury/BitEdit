import { InputHandler } from './input-handler.js';
import { ColorSystem } from './color-system.js';
import { ProjectManager } from './project-manager.js';

const CANVAS_SIZES = [8, 16, 32, 64, 128];
const CHECKERBOARD_LIGHT = '#3a3a3a';
const CHECKERBOARD_DARK = '#2a2a2a';
const MIN_ZOOM = 2;
const MAX_ZOOM = 64;
const MAX_UNDO = 50;

class SpriteEditor {
    constructor() {
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvasWidth = 16;
        this.canvasHeight = 16;
        this.layers = [{ name: 'Layer 1', pixels: new Uint8ClampedArray(16 * 16 * 4), opacity: 1, visible: true }];
        this.activeLayerIndex = 0;
        Object.defineProperty(this, 'pixels', {
            get() { return this.layers[this.activeLayerIndex].pixels; },
            set(v) { this.layers[this.activeLayerIndex].pixels = v; }
        });
        this.zoom = 8;
        Object.defineProperty(this, 'canvasSize', {
            get() { return Math.max(this.canvasWidth, this.canvasHeight); },
            set(v) { this.canvasWidth = v; this.canvasHeight = v; }
        });
        this.panX = 0;
        this.panY = 0;
        this.tool = 'draw';
        this.brushSize = 1;
        this.mirrorMode = null;
        this.transparencyLock = false;
        this.showGrid = true;
        this.gridColor = 'rgba(255,255,255,0.1)';
        this.hoveredPixel = null;
        this.selection = null;
        this._selPixels = null;
        this._selMoving = false;
        this._selMoveStart = null;
        this._selOrigPos = null;
        this._selStart = null;
        this._shapeStart = null;
        this._shapePreview = [];
        this._strokeSnapshot = null;
        this._undoStack = [];
        this._redoStack = [];
        this._clipboard = null;
        this._regionClipboard = null;
        this._openPanel = null;

        this.previewCanvas = document.getElementById('preview-canvas');
        this.previewCtx = this.previewCanvas.getContext('2d');
        this.tilePreview = false;
        this.refImage = null;
        this.refVisible = false;
        this.refOpacity = 0.3;

        this.colorSystem = new ColorSystem(this);
        this.input = new InputHandler(this);
        this.projectManager = new ProjectManager(this);
        this.sheetPicker = new SheetPicker(this);

        this._bindUI();
        this._resize();
        window.addEventListener('resize', () => this._resize());

        const sprite = this.projectManager.getSprite();
        if (sprite) this.loadSprite(sprite);
        this._updateStatusBar();
        this._updateUndoRedoState();
        this._startLoop();
    }

    // --- Public API for InputHandler ---

    beginStroke() {
        this._strokeSnapshot = this._snapshotLayers();
    }

    endStroke() {
        this._pushUndo();
        this.autoSave();
        this._updateUndoRedoState();
    }

    cancelStroke() {
        if (this._strokeSnapshot) {
            this._restoreSnapshot(this._strokeSnapshot);
            this._strokeSnapshot = null;
        }
    }

    toolDown(x, y, e) {
        if (this.tool === 'select') {
            if (this.selection && this._posInSelection({ x, y })) {
                this._selMoving = true;
                this._selMoveStart = { x, y };
                this._selOrigPos = { x: this.selection.x, y: this.selection.y };
                if (!this._selPixels) this._liftSelection();
            } else {
                this._commitSelection();
                this._selStart = { x, y };
                this.selection = null;
            }
            return;
        }

        if (this.tool === 'line' || this.tool === 'circle' || this.tool === 'gradient') {
            this._shapeStart = { x, y };
            this._shapePreview = [];
            return;
        }

        this._applyTool(x, y);
    }

    toolMove(x, y, e) {
        this.hoveredPixel = { x, y };
        this._updateStatusBar();

        if (this.tool === 'select') {
            if (this._selMoving) {
                const dx = x - this._selMoveStart.x;
                const dy = y - this._selMoveStart.y;
                this.selection.x = this._selOrigPos.x + dx;
                this.selection.y = this._selOrigPos.y + dy;
            } else if (this._selStart) {
                const sx = Math.min(this._selStart.x, x);
                const sy = Math.min(this._selStart.y, y);
                const ex = Math.max(this._selStart.x, x);
                const ey = Math.max(this._selStart.y, y);
                this.selection = { x: sx, y: sy, w: ex - sx + 1, h: ey - sy + 1 };
            }
            return;
        }

        if (this._shapeStart && (this.tool === 'line' || this.tool === 'circle' || this.tool === 'gradient')) {
            if (this.tool === 'line') {
                this._shapePreview = this._computeLinePixels(this._shapeStart.x, this._shapeStart.y, x, y);
            } else if (this.tool === 'circle') {
                this._shapePreview = this._computeCirclePixels(this._shapeStart.x, this._shapeStart.y, x, y);
            } else if (this.tool === 'gradient') {
                this._shapePreview = this._computeGradientPixels(this._shapeStart.x, this._shapeStart.y, x, y);
            }
            return;
        }

        this._applyToolContinuous(x, y);
    }

    toolUp(pos) {
        if (this.tool === 'select') {
            this._selMoving = false;
            this._selStart = null;
            this._updateSelectionUI();
            return;
        }

        if (this._shapeStart && this._shapePreview.length > 0) {
            for (const p of this._shapePreview) {
                if (p.x >= 0 && p.x < this.canvasWidth && p.y >= 0 && p.y < this.canvasHeight) {
                    if (p.r !== undefined) {
                        this._setPixel(p.x, p.y, p.r, p.g, p.b, p.a);
                    } else {
                        const c = this.colorSystem.color;
                        this._setPixel(p.x, p.y, c.r, c.g, c.b, c.a);
                    }
                }
            }
            this._shapeStart = null;
            this._shapePreview = [];
            this.colorSystem.addRecentColor();
        }
    }

    eraseAt(x, y) {
        this._eraseBrush(x, y);
    }

    pickColor(x, y) {
        const { r, g, b, a } = this._getPixel(x, y);
        this.colorSystem.secondaryColor = { ...this.colorSystem.color };
        this.colorSystem.color = { r, g, b, a };
        this.colorSystem.syncUI();
        this.setTool('draw');
    }

    updateHover(pos) {
        this.hoveredPixel = pos;
        this._updateStatusBar();
    }

    pan(dx, dy) {
        this.panX += dx;
        this.panY += dy;
    }

    zoomAt(cx, cy, scale) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = cx - rect.left;
        const canvasY = cy - rect.top;
        const pixelX = (canvasX - this.panX) / this.zoom;
        const pixelY = (canvasY - this.panY) / this.zoom;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(this.zoom * scale)));
        if (newZoom === this.zoom) return;
        this.zoom = newZoom;
        this.panX = canvasX - pixelX * newZoom;
        this.panY = canvasY - pixelY * newZoom;
        this._updateStatusBar();
    }

    zoomIn(cx, cy) {
        if (cx === undefined) {
            cx = this.canvas.width / 2;
            cy = this.canvas.height / 2;
        }
        const pixelX = (cx - this.panX) / this.zoom;
        const pixelY = (cy - this.panY) / this.zoom;
        const newZoom = Math.min(MAX_ZOOM, this.zoom + Math.max(1, Math.floor(this.zoom * 0.25)));
        if (newZoom === this.zoom) return;
        this.zoom = newZoom;
        this.panX = cx - pixelX * newZoom;
        this.panY = cy - pixelY * newZoom;
        this._updateStatusBar();
    }

    zoomOut(cx, cy) {
        if (cx === undefined) {
            cx = this.canvas.width / 2;
            cy = this.canvas.height / 2;
        }
        const pixelX = (cx - this.panX) / this.zoom;
        const pixelY = (cy - this.panY) / this.zoom;
        const newZoom = Math.max(MIN_ZOOM, this.zoom - Math.max(1, Math.floor(this.zoom * 0.25)));
        if (newZoom === this.zoom) return;
        this.zoom = newZoom;
        this.panX = cx - pixelX * newZoom;
        this.panY = cy - pixelY * newZoom;
        this._updateStatusBar();
    }

    resetZoom() {
        const rect = this.canvas.getBoundingClientRect();
        const zoomX = (rect.width - 4) / this.canvasWidth;
        const zoomY = (rect.height - 4) / this.canvasHeight;
        this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.floor(Math.min(zoomX, zoomY))));
        this.panX = (rect.width - this.canvasWidth * this.zoom) / 2;
        this.panY = (rect.height - this.canvasHeight * this.zoom) / 2;
        this._updateStatusBar();
    }

    setTool(tool) {
        if (this.tool === 'select' && tool !== 'select') {
            this._commitSelection();
            this.selection = null;
        }
        this.tool = tool;
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
            btn.setAttribute('aria-pressed', btn.dataset.tool === tool ? 'true' : 'false');
        });
        const toolNames = { draw: 'Draw', erase: 'Erase', fill: 'Fill', dither: 'Dither', pick: 'Pick', select: 'Select', line: 'Line', circle: 'Circle', gradient: 'Gradient', lighten: 'Lighten', darken: 'Darken' };
        document.getElementById('tool-info').textContent = toolNames[tool] || tool;
        this._updateSelectionUI();
    }

    adjustBrushSize(delta) {
        this.brushSize = Math.max(1, Math.min(16, this.brushSize + delta));
        document.getElementById('brush-size').value = this.brushSize;
        document.getElementById('brush-size-val').textContent = this.brushSize;
    }

    cycleMirror() {
        const modes = [null, 'h', 'v', 'both'];
        const idx = modes.indexOf(this.mirrorMode);
        this.mirrorMode = modes[(idx + 1) % modes.length];
        const btn = document.getElementById('btn-mirror');
        const labels = { null: 'Off', h: 'H', v: 'V', both: 'HV' };
        btn.textContent = labels[this.mirrorMode] || 'Off';
        btn.classList.toggle('active', this.mirrorMode !== null);
    }

    toggleTransparencyLock() {
        this.transparencyLock = !this.transparencyLock;
        const btn = document.getElementById('btn-tlock');
        btn.textContent = this.transparencyLock ? 'On' : 'Off';
        btn.classList.toggle('active', this.transparencyLock);
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        const btn = document.getElementById('btn-grid');
        btn.textContent = this.showGrid ? 'On' : 'Off';
        btn.classList.toggle('active', this.showGrid);
    }

    undo() {
        if (this._undoStack.length === 0) return;
        this._redoStack.push(this._snapshotLayers());
        this._restoreSnapshot(this._undoStack.pop());
        this.autoSave();
        this._updateUndoRedoState();
    }

    redo() {
        if (this._redoStack.length === 0) return;
        this._undoStack.push(this._snapshotLayers());
        this._restoreSnapshot(this._redoStack.pop());
        this.autoSave();
        this._updateUndoRedoState();
    }

    copySprite() {
        this._clipboard = { w: this.canvasWidth, h: this.canvasHeight, pixels: new Uint8ClampedArray(this.pixels) };
    }

    pasteSprite() {
        if (!this._clipboard) return;
        this._pushUndoSnapshot();
        if (this._clipboard.w !== this.canvasWidth || this._clipboard.h !== this.canvasHeight) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this._clipboard.w;
            tempCanvas.height = this._clipboard.h;
            const tempCtx = tempCanvas.getContext('2d');
            const imageData = new ImageData(new Uint8ClampedArray(this._clipboard.pixels), this._clipboard.w, this._clipboard.h);
            tempCtx.putImageData(imageData, 0, 0);
            const destCanvas = document.createElement('canvas');
            destCanvas.width = this.canvasWidth;
            destCanvas.height = this.canvasHeight;
            const destCtx = destCanvas.getContext('2d');
            destCtx.imageSmoothingEnabled = false;
            destCtx.drawImage(tempCanvas, 0, 0, this.canvasWidth, this.canvasHeight);
            const destData = destCtx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
            this.pixels = new Uint8ClampedArray(destData.data);
        } else {
            this.pixels = new Uint8ClampedArray(this._clipboard.pixels);
        }
        this.autoSave();
    }

    copySelection() {
        if (!this.selection) return;
        const s = this.selection;
        const data = new Uint8ClampedArray(s.w * s.h * 4);
        const src = this._selPixels || this.pixels;
        for (let dy = 0; dy < s.h; dy++) {
            for (let dx = 0; dx < s.w; dx++) {
                let srcI;
                if (this._selPixels) {
                    srcI = (dy * s.w + dx) * 4;
                } else {
                    const sx = s.x + dx, sy = s.y + dy;
                    if (sx < 0 || sx >= this.canvasWidth || sy < 0 || sy >= this.canvasHeight) continue;
                    srcI = (sy * this.canvasWidth + sx) * 4;
                }
                const dstI = (dy * s.w + dx) * 4;
                data[dstI] = src[srcI];
                data[dstI + 1] = src[srcI + 1];
                data[dstI + 2] = src[srcI + 2];
                data[dstI + 3] = src[srcI + 3];
            }
        }
        this._regionClipboard = { w: s.w, h: s.h, pixels: data };
    }

    pasteSelection() {
        if (!this._regionClipboard) return;
        this._commitSelection();
        const clip = this._regionClipboard;
        this._strokeSnapshot = this._snapshotLayers();
        this.selection = { x: 0, y: 0, w: clip.w, h: clip.h };
        this._selPixels = new Uint8ClampedArray(clip.pixels);
        this.setTool('select');
    }

    deleteSelection() {
        if (!this.selection) return;
        if (this._selPixels) {
            this._selPixels = null;
            this._pushUndo();
            this.autoSave();
            this.selection = null;
            this._updateSelectionUI();
            return;
        }
        const s = this.selection;
        this._strokeSnapshot = this._snapshotLayers();
        for (let dy = 0; dy < s.h; dy++) {
            for (let dx = 0; dx < s.w; dx++) {
                const tx = s.x + dx, ty = s.y + dy;
                if (tx < 0 || tx >= this.canvasWidth || ty < 0 || ty >= this.canvasHeight) continue;
                this._erasePixel(tx, ty);
            }
        }
        this.selection = null;
        this._pushUndo();
        this.autoSave();
        this._updateSelectionUI();
    }

    fillSelection() {
        if (!this.selection) return;
        const s = this.selection;
        const c = this.colorSystem.color;
        this._strokeSnapshot = this._snapshotLayers();
        if (this._selPixels) {
            for (let dy = 0; dy < s.h; dy++) {
                for (let dx = 0; dx < s.w; dx++) {
                    const i = (dy * s.w + dx) * 4;
                    this._selPixels[i] = c.r;
                    this._selPixels[i + 1] = c.g;
                    this._selPixels[i + 2] = c.b;
                    this._selPixels[i + 3] = c.a;
                }
            }
        } else {
            for (let dy = 0; dy < s.h; dy++) {
                for (let dx = 0; dx < s.w; dx++) {
                    const tx = s.x + dx, ty = s.y + dy;
                    if (tx < 0 || tx >= this.canvasWidth || ty < 0 || ty >= this.canvasHeight) continue;
                    this._setPixel(tx, ty, c.r, c.g, c.b, c.a);
                }
            }
        }
        this._pushUndo();
        this.autoSave();
    }

    handleEscape() {
        if (this._openPanel) {
            this.closePanel();
        } else if (this.selection) {
            this._commitSelection();
            this.selection = null;
        }
    }

    togglePanel(panelId) {
        if (this._openPanel === panelId) {
            this.closePanel();
        } else {
            this.closePanel();
            this._openPanel = panelId;
            document.getElementById(panelId).classList.add('open');
            this._getBackdrop().classList.add('visible');
        }
    }

    closePanel() {
        if (this._openPanel) {
            document.getElementById(this._openPanel).classList.remove('open');
            this._openPanel = null;
        }
        this._getBackdrop().classList.remove('visible');
    }

    autoSave() {
        this.projectManager.saveCurrentSprite(this.pixels, this.canvasWidth, this.canvasHeight, this.layers, this.activeLayerIndex);
    }

    loadSprite(sprite) {
        if (!sprite) return;
        this._undoStack.length = 0;
        this._redoStack.length = 0;
        this._strokeSnapshot = null;

        const w = sprite.w || sprite.size || 16;
        const h = sprite.h || sprite.size || 16;
        this.canvasWidth = w;
        this.canvasHeight = h;

        if (sprite.layers && sprite.layers.length > 0) {
            this.layers = sprite.layers.map(l => ({
                name: l.name,
                pixels: new Uint8ClampedArray(w * h * 4),
                opacity: l.opacity !== undefined ? l.opacity : 1,
                visible: l.visible !== undefined ? l.visible : true
            }));
            this.activeLayerIndex = Math.min(sprite.activeLayer || 0, this.layers.length - 1);
        } else {
            this.layers = [{ name: 'Layer 1', pixels: new Uint8ClampedArray(w * h * 4), opacity: 1, visible: true }];
            this.activeLayerIndex = 0;
        }

        this._updateSizeUI();

        if (sprite.layers && sprite.layers.length > 0) {
            let loaded = 0;
            const total = sprite.layers.filter(l => l.data).length;
            for (let li = 0; li < sprite.layers.length; li++) {
                const layerData = sprite.layers[li];
                if (!layerData.data) { loaded++; continue; }
                const img = new Image();
                img.onload = ((idx) => () => {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = w;
                    tempCanvas.height = h;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.imageSmoothingEnabled = false;
                    tempCtx.drawImage(img, 0, 0, w, h);
                    const imageData = tempCtx.getImageData(0, 0, w, h);
                    this.layers[idx].pixels = new Uint8ClampedArray(imageData.data);
                    loaded++;
                    if (loaded === total) this._renderLayersList();
                })(li);
                img.src = layerData.data;
            }
        } else if (sprite.data) {
            const img = new Image();
            img.onload = () => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = this.canvasWidth;
                tempCanvas.height = this.canvasHeight;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.imageSmoothingEnabled = false;
                tempCtx.drawImage(img, 0, 0, this.canvasWidth, this.canvasHeight);
                const imageData = tempCtx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
                this.pixels = new Uint8ClampedArray(imageData.data);
            };
            img.src = sprite.data;
        }

        this._renderLayersList();
        this._updateStatusBar();
        this.resetZoom();
    }

    setPixelsFromData(data, w, h) {
        this.canvasWidth = w;
        this.canvasHeight = h || w;
        this.pixels = new Uint8ClampedArray(data);
        this._updateSizeUI();
        this.resetZoom();
        this.autoSave();
    }

    // --- Private methods ---

    _bindUI() {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => this.setTool(btn.dataset.tool));
        });

        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
        document.getElementById('btn-redo').addEventListener('click', () => this.redo());
        document.getElementById('btn-pan').addEventListener('click', () => {
            this.input.panMode = !this.input.panMode;
        });

        document.getElementById('btn-settings').addEventListener('click', () => this.togglePanel('settings-panel'));

        document.getElementById('canvas-size-select').addEventListener('change', (e) => {
            const v = parseInt(e.target.value);
            this._setCanvasDimensions(v, v);
        });

        document.getElementById('btn-custom-size').addEventListener('click', () => {
            const input = prompt('Enter dimensions (WxH):', `${this.canvasWidth}x${this.canvasHeight}`);
            if (!input) return;
            const match = input.match(/^(\d+)\s*[x×,]\s*(\d+)$/i);
            if (!match) return;
            const w = Math.max(1, Math.min(512, parseInt(match[1])));
            const h = Math.max(1, Math.min(512, parseInt(match[2])));
            this._setCanvasDimensions(w, h);
        });

        document.getElementById('brush-size').addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            document.getElementById('brush-size-val').textContent = this.brushSize;
        });

        document.getElementById('btn-grid').addEventListener('click', () => this.toggleGrid());
        document.getElementById('grid-color').addEventListener('input', (e) => {
            const hex = e.target.value;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            this.gridColor = `rgba(${r},${g},${b},0.25)`;
        });
        document.getElementById('btn-mirror').addEventListener('click', () => this.cycleMirror());
        document.getElementById('btn-tlock').addEventListener('click', () => this.toggleTransparencyLock());

        document.getElementById('btn-flip-h').addEventListener('click', () => this._flipHorizontal());
        document.getElementById('btn-flip-v').addEventListener('click', () => this._flipVertical());
        document.getElementById('btn-rotate').addEventListener('click', () => this._rotateCW());
        document.getElementById('btn-outline').addEventListener('click', () => this._generateOutline());
        document.getElementById('btn-replace-color').addEventListener('click', () => this._replaceColor());
        document.getElementById('btn-extract-palette').addEventListener('click', () => {
            this.colorSystem.extractPalette(this.pixels);
        });
        document.getElementById('btn-clear').addEventListener('click', () => {
            this._pushUndoSnapshot();
            this.pixels = new Uint8ClampedArray(this.canvasWidth * this.canvasHeight * 4);
            this.autoSave();
        });

        document.getElementById('btn-sel-fill').addEventListener('click', () => this.fillSelection());
        document.getElementById('btn-sel-delete').addEventListener('click', () => this.deleteSelection());

        document.getElementById('touch-offset').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.input.touchOffset = -val;
            document.getElementById('touch-offset-val').textContent = val;
        });

        document.getElementById('btn-tile-preview').addEventListener('click', () => {
            this.tilePreview = !this.tilePreview;
            document.getElementById('btn-tile-preview').classList.toggle('active', this.tilePreview);
            document.getElementById('btn-tile-preview').setAttribute('aria-pressed', this.tilePreview);
            document.getElementById('preview-container').classList.toggle('tiling', this.tilePreview);
        });

        document.getElementById('btn-load-ref').addEventListener('click', () => {
            document.getElementById('file-ref-image').click();
        });
        document.getElementById('file-ref-image').addEventListener('change', (e) => {
            if (!e.target.files[0]) return;
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    this.refImage = img;
                    this.refVisible = true;
                    const btn = document.getElementById('btn-toggle-ref');
                    btn.textContent = 'Hide';
                    btn.classList.add('active');
                    btn.setAttribute('aria-pressed', 'true');
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(e.target.files[0]);
            e.target.value = '';
        });
        document.getElementById('btn-toggle-ref').addEventListener('click', () => {
            if (!this.refImage) return;
            this.refVisible = !this.refVisible;
            const btn = document.getElementById('btn-toggle-ref');
            btn.textContent = this.refVisible ? 'Hide' : 'Show';
            btn.classList.toggle('active', this.refVisible);
            btn.setAttribute('aria-pressed', this.refVisible);
        });
        document.getElementById('btn-clear-ref').addEventListener('click', () => {
            this.refImage = null;
            this.refVisible = false;
            const btn = document.getElementById('btn-toggle-ref');
            btn.textContent = 'Show';
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });
        document.getElementById('ref-opacity').addEventListener('input', (e) => {
            this.refOpacity = parseInt(e.target.value) / 100;
            document.getElementById('ref-opacity-val').textContent = e.target.value + '%';
        });

        document.getElementById('btn-import-sheet').addEventListener('click', () => {
            document.getElementById('file-import-sheet').click();
        });
        document.getElementById('file-import-sheet').addEventListener('change', (e) => {
            if (e.target.files[0]) this.sheetPicker.open(e.target.files[0]);
            e.target.value = '';
        });

        document.getElementById('btn-layers').addEventListener('click', () => {
            this._renderLayersList();
            this.togglePanel('layers-panel');
        });
        document.getElementById('btn-add-layer').addEventListener('click', () => this._addLayer());
        document.getElementById('btn-duplicate-layer').addEventListener('click', () => this._duplicateLayer());
        document.getElementById('btn-merge-layer').addEventListener('click', () => this._mergeDown());
        document.getElementById('btn-delete-layer').addEventListener('click', () => this._deleteLayer());
        document.getElementById('layer-opacity').addEventListener('input', (e) => {
            this._setLayerOpacity(parseInt(e.target.value));
            document.getElementById('layer-opacity-val').textContent = e.target.value + '%';
        });

        document.getElementById('btn-help').addEventListener('click', () => {
            document.getElementById('help-modal').hidden = false;
        });
        document.getElementById('help-modal-close').addEventListener('click', () => {
            document.getElementById('help-modal').hidden = true;
        });
        document.getElementById('help-modal').querySelector('.modal-backdrop').addEventListener('click', () => {
            document.getElementById('help-modal').hidden = true;
        });

        document.getElementById('btn-credits').addEventListener('click', () => {
            document.getElementById('credits-modal').hidden = false;
        });
        document.getElementById('credits-modal-close').addEventListener('click', () => {
            document.getElementById('credits-modal').hidden = true;
        });
        document.getElementById('credits-modal').querySelector('.modal-backdrop').addEventListener('click', () => {
            document.getElementById('credits-modal').hidden = true;
        });

        const backdrop = document.createElement('div');
        backdrop.className = 'sheet-backdrop';
        backdrop.addEventListener('click', () => this.closePanel());
        document.getElementById('app').appendChild(backdrop);
    }

    _updateUndoRedoState() {
        document.getElementById('btn-undo').disabled = this._undoStack.length === 0;
        document.getElementById('btn-redo').disabled = this._redoStack.length === 0;
    }

    _updateSelectionUI() {
        const hasSelection = this.tool === 'select' && this.selection !== null;
        document.getElementById('btn-sel-fill').hidden = !hasSelection;
        document.getElementById('btn-sel-delete').hidden = !hasSelection;
    }

    _getBackdrop() {
        return document.querySelector('.sheet-backdrop');
    }

    _resize() {
        const area = document.getElementById('canvas-area');
        const rect = area.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.resetZoom();
    }

    _updateStatusBar() {
        document.getElementById('canvas-info').textContent = `${this.canvasWidth}x${this.canvasHeight}`;
        document.getElementById('zoom-info').textContent = `${this.zoom}x`;
        const sprite = this.projectManager.getSprite();
        document.getElementById('sprite-name').textContent = sprite?.name || 'Untitled';
        if (this.hoveredPixel) {
            const { x, y } = this.hoveredPixel;
            const px = this._getPixel(x, y);
            document.getElementById('cursor-info').textContent = `${x},${y} rgba(${px.r},${px.g},${px.b},${px.a})`;
        } else {
            document.getElementById('cursor-info').textContent = '';
        }
    }

    _updateSizeUI() {
        const sel = document.getElementById('canvas-size-select');
        if (this.canvasWidth === this.canvasHeight && CANVAS_SIZES.includes(this.canvasWidth)) {
            sel.value = this.canvasWidth;
        } else {
            sel.value = '';
        }
    }

    _setCanvasDimensions(newW, newH) {
        if (newW === this.canvasWidth && newH === this.canvasHeight) return;
        this._pushUndoSnapshot();
        const oldW = this.canvasWidth;
        const oldH = this.canvasHeight;
        const copyW = Math.min(oldW, newW);
        const copyH = Math.min(oldH, newH);
        for (const layer of this.layers) {
            const oldPixels = layer.pixels;
            layer.pixels = new Uint8ClampedArray(newW * newH * 4);
            for (let y = 0; y < copyH; y++) {
                for (let x = 0; x < copyW; x++) {
                    const oldI = (y * oldW + x) * 4;
                    const newI = (y * newW + x) * 4;
                    layer.pixels[newI] = oldPixels[oldI];
                    layer.pixels[newI + 1] = oldPixels[oldI + 1];
                    layer.pixels[newI + 2] = oldPixels[oldI + 2];
                    layer.pixels[newI + 3] = oldPixels[oldI + 3];
                }
            }
        }
        this.canvasWidth = newW;
        this.canvasHeight = newH;
        this._updateSizeUI();
        this.resetZoom();
        this.autoSave();
    }

    // --- Layer Management ---

    _renderLayersList() {
        const list = document.getElementById('layers-list');
        if (!list) return;
        list.innerHTML = '';
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            const item = document.createElement('div');
            item.className = 'layer-item' + (i === this.activeLayerIndex ? ' active' : '');
            item.dataset.index = i;
            item.draggable = true;

            const visBtn = document.createElement('button');
            visBtn.className = 'layer-item-visibility' + (layer.visible ? '' : ' hidden-layer');
            visBtn.textContent = layer.visible ? '👁' : '—';
            visBtn.addEventListener('click', (e) => { e.stopPropagation(); this._toggleLayerVisibility(i); });

            const thumb = document.createElement('canvas');
            thumb.className = 'layer-item-thumb';
            thumb.width = this.canvasWidth;
            thumb.height = this.canvasHeight;
            const tCtx = thumb.getContext('2d');
            tCtx.putImageData(new ImageData(new Uint8ClampedArray(layer.pixels), this.canvasWidth, this.canvasHeight), 0, 0);

            const name = document.createElement('span');
            name.className = 'layer-item-name';
            name.textContent = layer.name;
            name.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const newName = prompt('Rename layer:', layer.name);
                if (newName) { layer.name = newName; this._renderLayersList(); }
            });

            const reorder = document.createElement('div');
            reorder.className = 'layer-item-reorder';
            const upBtn = document.createElement('button');
            upBtn.textContent = '▲';
            upBtn.addEventListener('click', (e) => { e.stopPropagation(); this._moveLayerUp(i); });
            const downBtn = document.createElement('button');
            downBtn.textContent = '▼';
            downBtn.addEventListener('click', (e) => { e.stopPropagation(); this._moveLayerDown(i); });
            reorder.appendChild(upBtn);
            reorder.appendChild(downBtn);

            item.appendChild(visBtn);
            item.appendChild(thumb);
            item.appendChild(name);
            item.appendChild(reorder);

            item.addEventListener('click', () => this._setActiveLayer(i));

            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', i.toString());
                e.dataTransfer.effectAllowed = 'move';
            });
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                item.classList.add('drag-over');
            });
            item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                const toIdx = i;
                if (fromIdx !== toIdx) this._reorderLayer(fromIdx, toIdx);
            });

            list.appendChild(item);
        }

        const opacitySlider = document.getElementById('layer-opacity');
        const opacityVal = document.getElementById('layer-opacity-val');
        if (opacitySlider) {
            opacitySlider.value = Math.round(this.layers[this.activeLayerIndex].opacity * 100);
            opacityVal.textContent = opacitySlider.value + '%';
        }
    }

    _setActiveLayer(idx) {
        if (idx < 0 || idx >= this.layers.length) return;
        this.activeLayerIndex = idx;
        this._renderLayersList();
    }

    _addLayer() {
        this._pushUndoSnapshot();
        const w = this.canvasWidth, h = this.canvasHeight;
        const name = 'Layer ' + (this.layers.length + 1);
        this.layers.splice(this.activeLayerIndex + 1, 0, {
            name, pixels: new Uint8ClampedArray(w * h * 4), opacity: 1, visible: true
        });
        this.activeLayerIndex = this.activeLayerIndex + 1;
        this._renderLayersList();
        this.autoSave();
    }

    _duplicateLayer() {
        this._pushUndoSnapshot();
        const src = this.layers[this.activeLayerIndex];
        this.layers.splice(this.activeLayerIndex + 1, 0, {
            name: src.name + ' copy',
            pixels: new Uint8ClampedArray(src.pixels),
            opacity: src.opacity,
            visible: src.visible
        });
        this.activeLayerIndex = this.activeLayerIndex + 1;
        this._renderLayersList();
        this.autoSave();
    }

    _deleteLayer() {
        if (this.layers.length <= 1) return;
        this._pushUndoSnapshot();
        this.layers.splice(this.activeLayerIndex, 1);
        if (this.activeLayerIndex >= this.layers.length) {
            this.activeLayerIndex = this.layers.length - 1;
        }
        this._renderLayersList();
        this.autoSave();
    }

    _mergeDown() {
        if (this.activeLayerIndex <= 0) return;
        this._pushUndoSnapshot();
        const top = this.layers[this.activeLayerIndex];
        const bot = this.layers[this.activeLayerIndex - 1];
        const w = this.canvasWidth, h = this.canvasHeight;

        const merged = document.createElement('canvas');
        merged.width = w;
        merged.height = h;
        const ctx = merged.getContext('2d');

        const botData = new ImageData(new Uint8ClampedArray(bot.pixels), w, h);
        ctx.putImageData(botData, 0, 0);

        const topCanvas = document.createElement('canvas');
        topCanvas.width = w;
        topCanvas.height = h;
        const topCtx = topCanvas.getContext('2d');
        topCtx.putImageData(new ImageData(new Uint8ClampedArray(top.pixels), w, h), 0, 0);
        ctx.globalAlpha = top.opacity;
        ctx.drawImage(topCanvas, 0, 0);

        bot.pixels = new Uint8ClampedArray(ctx.getImageData(0, 0, w, h).data);
        this.layers.splice(this.activeLayerIndex, 1);
        this.activeLayerIndex = this.activeLayerIndex - 1;
        this._renderLayersList();
        this.autoSave();
    }

    _moveLayerUp(idx) {
        if (idx >= this.layers.length - 1) return;
        this._pushUndoSnapshot();
        const tmp = this.layers[idx];
        this.layers[idx] = this.layers[idx + 1];
        this.layers[idx + 1] = tmp;
        if (this.activeLayerIndex === idx) this.activeLayerIndex = idx + 1;
        else if (this.activeLayerIndex === idx + 1) this.activeLayerIndex = idx;
        this._renderLayersList();
        this.autoSave();
    }

    _moveLayerDown(idx) {
        if (idx <= 0) return;
        this._pushUndoSnapshot();
        const tmp = this.layers[idx];
        this.layers[idx] = this.layers[idx - 1];
        this.layers[idx - 1] = tmp;
        if (this.activeLayerIndex === idx) this.activeLayerIndex = idx - 1;
        else if (this.activeLayerIndex === idx - 1) this.activeLayerIndex = idx;
        this._renderLayersList();
        this.autoSave();
    }

    _reorderLayer(fromIdx, toIdx) {
        this._pushUndoSnapshot();
        const layer = this.layers.splice(fromIdx, 1)[0];
        this.layers.splice(toIdx, 0, layer);
        if (this.activeLayerIndex === fromIdx) {
            this.activeLayerIndex = toIdx;
        } else if (fromIdx < this.activeLayerIndex && toIdx >= this.activeLayerIndex) {
            this.activeLayerIndex--;
        } else if (fromIdx > this.activeLayerIndex && toIdx <= this.activeLayerIndex) {
            this.activeLayerIndex++;
        }
        this._renderLayersList();
        this.autoSave();
    }

    _toggleLayerVisibility(idx) {
        this.layers[idx].visible = !this.layers[idx].visible;
        this._renderLayersList();
    }

    _setLayerOpacity(val) {
        this.layers[this.activeLayerIndex].opacity = val / 100;
        this._renderLayersList();
    }

    // --- Pixel Operations ---

    _setPixel(x, y, r, g, b, a) {
        const i = (y * this.canvasWidth + x) * 4;
        if (this.transparencyLock && this.pixels[i + 3] === 0) return;
        this.pixels[i] = r;
        this.pixels[i + 1] = g;
        this.pixels[i + 2] = b;
        this.pixels[i + 3] = a;
    }

    _getPixel(x, y) {
        const i = (y * this.canvasWidth + x) * 4;
        return { r: this.pixels[i], g: this.pixels[i + 1], b: this.pixels[i + 2], a: this.pixels[i + 3] };
    }

    _erasePixel(x, y) {
        const i = (y * this.canvasWidth + x) * 4;
        this.pixels[i] = 0;
        this.pixels[i + 1] = 0;
        this.pixels[i + 2] = 0;
        this.pixels[i + 3] = 0;
    }

    // --- Drawing Tools ---

    _getMirrorPoints(cx, cy) {
        const points = [[cx, cy]];
        const w = this.canvasWidth, h = this.canvasHeight;
        if (this.mirrorMode === 'h' || this.mirrorMode === 'both') points.push([w - 1 - cx, cy]);
        if (this.mirrorMode === 'v' || this.mirrorMode === 'both') points.push([cx, h - 1 - cy]);
        if (this.mirrorMode === 'both') points.push([w - 1 - cx, h - 1 - cy]);
        return points;
    }

    _drawBrush(cx, cy) {
        const c = this.colorSystem.color;
        const bs = this.brushSize;
        const r = Math.floor(bs / 2);
        for (const [mx, my] of this._getMirrorPoints(cx, cy)) {
            for (let dy = -r; dy < bs - r; dy++) {
                for (let dx = -r; dx < bs - r; dx++) {
                    const px = mx + dx, py = my + dy;
                    if (px >= 0 && px < this.canvasWidth && py >= 0 && py < this.canvasHeight) {
                        this._setPixel(px, py, c.r, c.g, c.b, c.a);
                    }
                }
            }
        }
    }

    _eraseBrush(cx, cy) {
        const bs = this.brushSize;
        const r = Math.floor(bs / 2);
        for (const [mx, my] of this._getMirrorPoints(cx, cy)) {
            for (let dy = -r; dy < bs - r; dy++) {
                for (let dx = -r; dx < bs - r; dx++) {
                    const px = mx + dx, py = my + dy;
                    if (px >= 0 && px < this.canvasWidth && py >= 0 && py < this.canvasHeight) {
                        this._erasePixel(px, py);
                    }
                }
            }
        }
    }

    _lightenBrush(cx, cy) {
        const bs = this.brushSize;
        const r = Math.floor(bs / 2);
        for (const [mx, my] of this._getMirrorPoints(cx, cy)) {
            for (let dy = -r; dy < bs - r; dy++) {
                for (let dx = -r; dx < bs - r; dx++) {
                    const px = mx + dx, py = my + dy;
                    if (px >= 0 && px < this.canvasWidth && py >= 0 && py < this.canvasHeight) {
                        this._shiftBrightness(px, py, 20);
                    }
                }
            }
        }
    }

    _darkenBrush(cx, cy) {
        const bs = this.brushSize;
        const r = Math.floor(bs / 2);
        for (const [mx, my] of this._getMirrorPoints(cx, cy)) {
            for (let dy = -r; dy < bs - r; dy++) {
                for (let dx = -r; dx < bs - r; dx++) {
                    const px = mx + dx, py = my + dy;
                    if (px >= 0 && px < this.canvasWidth && py >= 0 && py < this.canvasHeight) {
                        this._shiftBrightness(px, py, -20);
                    }
                }
            }
        }
    }

    _shiftBrightness(x, y, amount) {
        const i = (y * this.canvasWidth + x) * 4;
        if (this.pixels[i + 3] === 0) return;
        this.pixels[i] = Math.max(0, Math.min(255, this.pixels[i] + amount));
        this.pixels[i + 1] = Math.max(0, Math.min(255, this.pixels[i + 1] + amount));
        this.pixels[i + 2] = Math.max(0, Math.min(255, this.pixels[i + 2] + amount));
    }

    _floodFill(startX, startY) {
        const c = this.colorSystem.color;
        const target = this._getPixel(startX, startY);
        if (target.r === c.r && target.g === c.g && target.b === c.b && target.a === c.a) return;

        const w = this.canvasWidth, h = this.canvasHeight;
        const stack = [[startX, startY]];
        const visited = new Set();

        while (stack.length > 0) {
            const [x, y] = stack.pop();
            if (x < 0 || x >= w || y < 0 || y >= h) continue;
            const key = y * w + x;
            if (visited.has(key)) continue;
            visited.add(key);

            const px = this._getPixel(x, y);
            if (px.r !== target.r || px.g !== target.g || px.b !== target.b || px.a !== target.a) continue;

            this._setPixel(x, y, c.r, c.g, c.b, c.a);
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
    }

    _ditherFill(startX, startY) {
        const c1 = this.colorSystem.color;
        const c2 = this.colorSystem.secondaryColor;
        const target = this._getPixel(startX, startY);
        if (target.r === c1.r && target.g === c1.g && target.b === c1.b && target.a === c1.a) return;

        const w = this.canvasWidth, h = this.canvasHeight;
        const stack = [[startX, startY]];
        const visited = new Set();

        while (stack.length > 0) {
            const [x, y] = stack.pop();
            if (x < 0 || x >= w || y < 0 || y >= h) continue;
            const key = y * w + x;
            if (visited.has(key)) continue;
            visited.add(key);

            const px = this._getPixel(x, y);
            if (px.r !== target.r || px.g !== target.g || px.b !== target.b || px.a !== target.a) continue;

            const c = (x + y) % 2 === 0 ? c1 : c2;
            this._setPixel(x, y, c.r, c.g, c.b, c.a);
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
    }

    _applyTool(x, y) {
        const c = this.colorSystem.color;
        switch (this.tool) {
            case 'draw':
                this._drawBrush(x, y);
                this.colorSystem.addRecentColor();
                break;
            case 'erase':
                this._eraseBrush(x, y);
                break;
            case 'fill':
                this._floodFill(x, y);
                this.colorSystem.addRecentColor();
                break;
            case 'pick':
                this.pickColor(x, y);
                break;
            case 'lighten':
                this._lightenBrush(x, y);
                break;
            case 'darken':
                this._darkenBrush(x, y);
                break;
            case 'dither':
                this._ditherFill(x, y);
                break;
        }
    }

    _applyToolContinuous(x, y) {
        if (this.tool === 'draw') this._drawBrush(x, y);
        else if (this.tool === 'erase') this._eraseBrush(x, y);
        else if (this.tool === 'lighten') this._lightenBrush(x, y);
        else if (this.tool === 'darken') this._darkenBrush(x, y);
    }

    // --- Shape Tools ---

    _computeLinePixels(x0, y0, x1, y1) {
        const points = [];
        const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        let cx = x0, cy = y0;
        while (true) {
            points.push({ x: cx, y: cy });
            if (cx === x1 && cy === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; cx += sx; }
            if (e2 < dx) { err += dx; cy += sy; }
        }
        return points;
    }

    _computeCirclePixels(cx, cy, ex, ey) {
        const points = [];
        const r = Math.round(Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2));
        if (r === 0) return [{ x: cx, y: cy }];
        let x = r, y = 0, d = 1 - r;
        const addSymmetric = (px, py) => {
            points.push({ x: cx + px, y: cy + py });
            points.push({ x: cx - px, y: cy + py });
            points.push({ x: cx + px, y: cy - py });
            points.push({ x: cx - px, y: cy - py });
            points.push({ x: cx + py, y: cy + px });
            points.push({ x: cx - py, y: cy + px });
            points.push({ x: cx + py, y: cy - px });
            points.push({ x: cx - py, y: cy - px });
        };
        while (x >= y) {
            addSymmetric(x, y);
            y++;
            if (d <= 0) {
                d += 2 * y + 1;
            } else {
                x--;
                d += 2 * (y - x) + 1;
            }
        }
        return points;
    }

    _computeGradientPixels(x0, y0, x1, y1) {
        const c1 = this.colorSystem.color;
        const c2 = this.colorSystem.secondaryColor;
        const pixels = [];
        const dx = x1 - x0, dy = y1 - y0;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return [{ x: x0, y: y0, r: c1.r, g: c1.g, b: c1.b, a: c1.a }];

        const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
        const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);

        for (let py = minY; py <= maxY; py++) {
            for (let px = minX; px <= maxX; px++) {
                const proj = ((px - x0) * dx + (py - y0) * dy) / (len * len);
                const t = Math.max(0, Math.min(1, proj));
                pixels.push({
                    x: px, y: py,
                    r: Math.round(c1.r + (c2.r - c1.r) * t),
                    g: Math.round(c1.g + (c2.g - c1.g) * t),
                    b: Math.round(c1.b + (c2.b - c1.b) * t),
                    a: Math.round(c1.a + (c2.a - c1.a) * t),
                });
            }
        }
        return pixels;
    }

    // --- Transforms ---

    _flipHorizontal() {
        this._pushUndoSnapshot();
        const w = this.canvasWidth, h = this.canvasHeight;
        const flipped = new Uint8ClampedArray(this.pixels.length);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const srcI = (y * w + x) * 4;
                const dstI = (y * w + (w - 1 - x)) * 4;
                flipped[dstI] = this.pixels[srcI];
                flipped[dstI + 1] = this.pixels[srcI + 1];
                flipped[dstI + 2] = this.pixels[srcI + 2];
                flipped[dstI + 3] = this.pixels[srcI + 3];
            }
        }
        this.pixels = flipped;
        this.autoSave();
    }

    _flipVertical() {
        this._pushUndoSnapshot();
        const w = this.canvasWidth, h = this.canvasHeight;
        const flipped = new Uint8ClampedArray(this.pixels.length);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const srcI = (y * w + x) * 4;
                const dstI = ((h - 1 - y) * w + x) * 4;
                flipped[dstI] = this.pixels[srcI];
                flipped[dstI + 1] = this.pixels[srcI + 1];
                flipped[dstI + 2] = this.pixels[srcI + 2];
                flipped[dstI + 3] = this.pixels[srcI + 3];
            }
        }
        this.pixels = flipped;
        this.autoSave();
    }

    _rotateCW() {
        this._pushUndoSnapshot();
        const w = this.canvasWidth, h = this.canvasHeight;
        for (const layer of this.layers) {
            const rotated = new Uint8ClampedArray(h * w * 4);
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const srcI = (y * w + x) * 4;
                    const dstI = (x * h + (h - 1 - y)) * 4;
                    rotated[dstI] = layer.pixels[srcI];
                    rotated[dstI + 1] = layer.pixels[srcI + 1];
                    rotated[dstI + 2] = layer.pixels[srcI + 2];
                    rotated[dstI + 3] = layer.pixels[srcI + 3];
                }
            }
            layer.pixels = rotated;
        }
        this.canvasWidth = h;
        this.canvasHeight = w;
        this._updateSizeUI();
        this.resetZoom();
        this.autoSave();
    }

    _replaceColor() {
        const target = this.colorSystem.secondaryColor;
        const fill = this.colorSystem.color;
        if (target.r === fill.r && target.g === fill.g && target.b === fill.b && target.a === fill.a) return;
        this._pushUndoSnapshot();
        const total = this.canvasWidth * this.canvasHeight * 4;
        for (let i = 0; i < total; i += 4) {
            if (this.pixels[i] === target.r && this.pixels[i + 1] === target.g &&
                this.pixels[i + 2] === target.b && this.pixels[i + 3] === target.a) {
                this.pixels[i] = fill.r;
                this.pixels[i + 1] = fill.g;
                this.pixels[i + 2] = fill.b;
                this.pixels[i + 3] = fill.a;
            }
        }
        this.autoSave();
    }

    _generateOutline() {
        const w = this.canvasWidth, h = this.canvasHeight;
        const hasPixel = (x, y) => {
            if (x < 0 || x >= w || y < 0 || y >= h) return false;
            return this.pixels[(y * w + x) * 4 + 3] > 0;
        };
        this._pushUndoSnapshot();
        const outlinePixels = [];
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (hasPixel(x, y)) continue;
                if (hasPixel(x - 1, y) || hasPixel(x + 1, y) || hasPixel(x, y - 1) || hasPixel(x, y + 1)) {
                    outlinePixels.push([x, y]);
                }
            }
        }
        const c = this.colorSystem.color;
        for (const [x, y] of outlinePixels) {
            this._setPixel(x, y, c.r, c.g, c.b, c.a);
        }
        this.autoSave();
    }

    // --- Selection ---

    _posInSelection(pos) {
        if (!this.selection) return false;
        const s = this.selection;
        return pos.x >= s.x && pos.x < s.x + s.w && pos.y >= s.y && pos.y < s.y + s.h;
    }

    _liftSelection() {
        const s = this.selection;
        this._selPixels = new Uint8ClampedArray(s.w * s.h * 4);
        for (let dy = 0; dy < s.h; dy++) {
            for (let dx = 0; dx < s.w; dx++) {
                const sx = s.x + dx, sy = s.y + dy;
                if (sx < 0 || sx >= this.canvasWidth || sy < 0 || sy >= this.canvasHeight) continue;
                const srcI = (sy * this.canvasWidth + sx) * 4;
                const dstI = (dy * s.w + dx) * 4;
                this._selPixels[dstI] = this.pixels[srcI];
                this._selPixels[dstI + 1] = this.pixels[srcI + 1];
                this._selPixels[dstI + 2] = this.pixels[srcI + 2];
                this._selPixels[dstI + 3] = this.pixels[srcI + 3];
                this.pixels[srcI] = 0;
                this.pixels[srcI + 1] = 0;
                this.pixels[srcI + 2] = 0;
                this.pixels[srcI + 3] = 0;
            }
        }
    }

    _commitSelection() {
        if (!this._selPixels || !this.selection) return;
        const s = this.selection;
        for (let dy = 0; dy < s.h; dy++) {
            for (let dx = 0; dx < s.w; dx++) {
                const tx = s.x + dx, ty = s.y + dy;
                if (tx < 0 || tx >= this.canvasWidth || ty < 0 || ty >= this.canvasHeight) continue;
                const srcI = (dy * s.w + dx) * 4;
                if (this._selPixels[srcI + 3] === 0) continue;
                const dstI = (ty * this.canvasWidth + tx) * 4;
                this.pixels[dstI] = this._selPixels[srcI];
                this.pixels[dstI + 1] = this._selPixels[srcI + 1];
                this.pixels[dstI + 2] = this._selPixels[srcI + 2];
                this.pixels[dstI + 3] = this._selPixels[srcI + 3];
            }
        }
        this._selPixels = null;
        this._pushUndo();
        this.autoSave();
    }

    // --- Undo/Redo ---

    _pushUndo() {
        if (!this._strokeSnapshot) return;
        let changed = false;
        const snapPixels = this._strokeSnapshot.layers[this._strokeSnapshot.activeLayerIndex].pixels;
        for (let i = 0; i < snapPixels.length; i++) {
            if (snapPixels[i] !== this.pixels[i]) { changed = true; break; }
        }
        if (!changed) { this._strokeSnapshot = null; return; }
        this._undoStack.push(this._strokeSnapshot);
        if (this._undoStack.length > MAX_UNDO) this._undoStack.shift();
        this._redoStack.length = 0;
        this._strokeSnapshot = null;
    }

    _pushUndoSnapshot() {
        this._undoStack.push(this._snapshotLayers());
        if (this._undoStack.length > MAX_UNDO) this._undoStack.shift();
        this._redoStack.length = 0;
        this._updateUndoRedoState();
    }

    _snapshotLayers() {
        return {
            layers: this.layers.map(l => ({
                name: l.name,
                pixels: new Uint8ClampedArray(l.pixels),
                opacity: l.opacity,
                visible: l.visible
            })),
            activeLayerIndex: this.activeLayerIndex
        };
    }

    _restoreSnapshot(snapshot) {
        if (snapshot.layers) {
            this.layers = snapshot.layers.map(l => ({
                name: l.name,
                pixels: new Uint8ClampedArray(l.pixels),
                opacity: l.opacity,
                visible: l.visible
            }));
            this.activeLayerIndex = snapshot.activeLayerIndex;
            this._renderLayersList();
        } else {
            this.pixels = snapshot;
        }
    }

    // --- Rendering ---

    _startLoop() {
        const loop = () => {
            this._render();
            this._renderPreview();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    _renderPreview() {
        const w = this.canvasWidth, h = this.canvasHeight;
        const ctx = this.previewCtx;

        const composited = this._getCompositedCanvas(w, h);

        if (this.tilePreview) {
            const tw = w * 3, th = h * 3;
            if (this.previewCanvas.width !== tw || this.previewCanvas.height !== th) {
                this.previewCanvas.width = tw;
                this.previewCanvas.height = th;
            }
            ctx.clearRect(0, 0, tw, th);
            for (let ty = 0; ty < 3; ty++) {
                for (let tx = 0; tx < 3; tx++) {
                    ctx.drawImage(composited, tx * w, ty * h);
                }
            }
        } else {
            if (this.previewCanvas.width !== w || this.previewCanvas.height !== h) {
                this.previewCanvas.width = w;
                this.previewCanvas.height = h;
            }
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(composited, 0, 0);
        }
    }

    _getCompositedCanvas(w, h) {
        if (!this._compCanvas || this._compCanvas.width !== w || this._compCanvas.height !== h) {
            this._compCanvas = document.createElement('canvas');
            this._compCanvas.width = w;
            this._compCanvas.height = h;
        }
        const cCtx = this._compCanvas.getContext('2d');
        cCtx.clearRect(0, 0, w, h);
        if (!this._compTmp || this._compTmp.width !== w || this._compTmp.height !== h) {
            this._compTmp = document.createElement('canvas');
            this._compTmp.width = w;
            this._compTmp.height = h;
        }
        const tmpCtx = this._compTmp.getContext('2d');
        for (const layer of this.layers) {
            if (!layer.visible) continue;
            tmpCtx.clearRect(0, 0, w, h);
            tmpCtx.putImageData(new ImageData(new Uint8ClampedArray(layer.pixels), w, h), 0, 0);
            cCtx.globalAlpha = layer.opacity;
            cCtx.drawImage(this._compTmp, 0, 0);
        }
        cCtx.globalAlpha = 1;
        return this._compCanvas;
    }

    _render() {
        const ctx = this.ctx;
        const w = this.canvasWidth, h = this.canvasHeight;
        const z = this.zoom;
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const ox = this.panX;
        const oy = this.panY;

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, cw, ch);

        const gridW = w * z;
        const gridH = h * z;

        const rox = Math.round(ox), roy = Math.round(oy);
        ctx.save();
        ctx.beginPath();
        ctx.rect(rox, roy, gridW, gridH);
        ctx.clip();
        for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
                ctx.fillStyle = (px + py) % 2 === 0 ? CHECKERBOARD_LIGHT : CHECKERBOARD_DARK;
                ctx.fillRect(rox + px * z, roy + py * z, z, z);
            }
        }
        ctx.restore();

        if (this.refImage && this.refVisible) {
            ctx.save();
            ctx.globalAlpha = this.refOpacity;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(this.refImage, ox, oy, gridW, gridH);
            ctx.restore();
        }

        if (!this._pixelCanvas || this._pixelCanvas.width !== w || this._pixelCanvas.height !== h) {
            this._pixelCanvas = document.createElement('canvas');
            this._pixelCanvas.width = w;
            this._pixelCanvas.height = h;
        }
        const pCtx = this._pixelCanvas.getContext('2d');
        pCtx.clearRect(0, 0, w, h);
        for (const layer of this.layers) {
            if (!layer.visible) continue;
            const layerImageData = new ImageData(new Uint8ClampedArray(layer.pixels), w, h);
            if (!this._layerTmp || this._layerTmp.width !== w || this._layerTmp.height !== h) {
                this._layerTmp = document.createElement('canvas');
                this._layerTmp.width = w;
                this._layerTmp.height = h;
            }
            const tmpCtx = this._layerTmp.getContext('2d');
            tmpCtx.clearRect(0, 0, w, h);
            tmpCtx.putImageData(layerImageData, 0, 0);
            pCtx.globalAlpha = layer.opacity;
            pCtx.drawImage(this._layerTmp, 0, 0);
        }
        pCtx.globalAlpha = 1;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this._pixelCanvas, 0, 0, w, h, rox, roy, gridW, gridH);

        if (this.showGrid && z >= 4) {
            ctx.strokeStyle = this.gridColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i <= w; i++) {
                ctx.moveTo(rox + i * z + 0.5, roy);
                ctx.lineTo(rox + i * z + 0.5, roy + gridH);
            }
            for (let i = 0; i <= h; i++) {
                ctx.moveTo(rox, roy + i * z + 0.5);
                ctx.lineTo(rox + gridW, roy + i * z + 0.5);
            }
            ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rox - 0.5, roy - 0.5, gridW + 1, gridH + 1);

        if (this._selPixels && this.selection) {
            const s = this.selection;
            for (let dy = 0; dy < s.h; dy++) {
                for (let dx = 0; dx < s.w; dx++) {
                    const i = (dy * s.w + dx) * 4;
                    const a = this._selPixels[i + 3];
                    if (a === 0) continue;
                    const px = s.x + dx, py = s.y + dy;
                    ctx.fillStyle = `rgba(${this._selPixels[i]},${this._selPixels[i + 1]},${this._selPixels[i + 2]},${a / 255})`;
                    ctx.fillRect(rox + px * z, roy + py * z, z, z);
                }
            }
        }

        if (this._shapePreview && this._shapePreview.length > 0) {
            for (const p of this._shapePreview) {
                if (p.x >= 0 && p.x < w && p.y >= 0 && p.y < h) {
                    if (p.r !== undefined) {
                        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.a / 255})`;
                    } else {
                        const c = this.colorSystem.color;
                        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${c.a / 255})`;
                    }
                    ctx.fillRect(rox + p.x * z, roy + p.y * z, z, z);
                }
            }
        }

        if (this.selection) {
            const s = this.selection;
            ctx.strokeStyle = 'rgba(0,200,255,0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(rox + s.x * z, roy + s.y * z, s.w * z, s.h * z);
            ctx.setLineDash([]);
        }

        if (this.hoveredPixel) {
            const { x, y } = this.hoveredPixel;
            const bs = this.brushSize;
            const r = Math.floor(bs / 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 2;
            if (bs === 1) {
                ctx.strokeRect(rox + x * z + 1, roy + y * z + 1, z - 2, z - 2);
            } else {
                ctx.strokeRect(rox + (x - r) * z + 1, roy + (y - r) * z + 1, bs * z - 2, bs * z - 2);
            }
        }
    }
}

class SheetPicker {
    constructor(editor) {
        this.editor = editor;
        this.modal = document.getElementById('sheet-picker');
        this.canvas = document.getElementById('sheet-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.wrap = document.getElementById('sheet-canvas-wrap');
        this.selEl = document.getElementById('sheet-selection');
        this.image = null;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.gridSize = 16;
        this.snap = true;
        this.selection = null;
        this._pointers = new Map();
        this._lastPinchDist = 0;
        this._lastPanPos = null;
        this._bind();
    }

    _bind() {
        document.getElementById('sheet-picker-close').addEventListener('click', () => this.close());
        this.modal.querySelector('.modal-backdrop').addEventListener('click', () => this.close());
        document.getElementById('sheet-grid-size').addEventListener('change', (e) => {
            this.gridSize = parseInt(e.target.value);
            this._drawSheet();
        });
        document.getElementById('btn-sheet-snap').addEventListener('click', (e) => {
            this.snap = !this.snap;
            e.currentTarget.textContent = this.snap ? 'On' : 'Off';
            e.currentTarget.classList.toggle('active', this.snap);
        });
        document.getElementById('btn-sheet-import').addEventListener('click', () => this._importSelection());

        this.wrap.addEventListener('pointerdown', (e) => this._onPointerDown(e));
        this.wrap.addEventListener('pointermove', (e) => this._onPointerMove(e));
        this.wrap.addEventListener('pointerup', (e) => this._onPointerUp(e));
        this.wrap.addEventListener('pointercancel', (e) => this._onPointerUp(e));
        this.wrap.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
            this.zoom = Math.max(0.25, Math.min(8, this.zoom * factor));
            this._drawSheet();
        }, { passive: false });
    }

    open(file) {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                this.zoom = 1;
                this.panX = 0;
                this.panY = 0;
                this.selection = null;
                this.selEl.style.display = 'none';
                this._drawSheet();
                this.modal.hidden = false;
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    }

    close() {
        this.modal.hidden = true;
        this.image = null;
    }

    _drawSheet() {
        if (!this.image) return;
        const w = Math.round(this.image.width * this.zoom);
        const h = Math.round(this.image.height * this.zoom);
        this.canvas.width = w;
        this.canvas.height = h;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.canvas.style.left = this.panX + 'px';
        this.canvas.style.top = this.panY + 'px';
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(this.image, 0, 0, w, h);

        const gs = this.gridSize * this.zoom;
        this.ctx.strokeStyle = 'rgba(0,200,255,0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let x = 0; x <= w; x += gs) {
            this.ctx.moveTo(x + 0.5, 0);
            this.ctx.lineTo(x + 0.5, h);
        }
        for (let y = 0; y <= h; y += gs) {
            this.ctx.moveTo(0, y + 0.5);
            this.ctx.lineTo(w, y + 0.5);
        }
        this.ctx.stroke();
        this._updateSelectionEl();
    }

    _updateSelectionEl() {
        if (!this.selection) { this.selEl.style.display = 'none'; return; }
        const s = this.selection;
        this.selEl.style.display = 'block';
        this.selEl.style.left = (this.panX + s.x * this.zoom) + 'px';
        this.selEl.style.top = (this.panY + s.y * this.zoom) + 'px';
        this.selEl.style.width = (s.w * this.zoom) + 'px';
        this.selEl.style.height = (s.h * this.zoom) + 'px';
    }

    _onPointerDown(e) {
        e.preventDefault();
        this.wrap.setPointerCapture(e.pointerId);
        this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (this._pointers.size === 2) {
            const pts = [...this._pointers.values()];
            this._lastPinchDist = Math.sqrt((pts[0].x - pts[1].x) ** 2 + (pts[0].y - pts[1].y) ** 2);
            this._lastPanPos = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
            return;
        }

        if (this._pointers.size === 1) {
            this._lastPanPos = { x: e.clientX, y: e.clientY };
            const rect = this.wrap.getBoundingClientRect();
            const imgX = (e.clientX - rect.left - this.panX) / this.zoom;
            const imgY = (e.clientY - rect.top - this.panY) / this.zoom;

            if (this.snap) {
                const gx = Math.floor(imgX / this.gridSize) * this.gridSize;
                const gy = Math.floor(imgY / this.gridSize) * this.gridSize;
                this.selection = { x: gx, y: gy, w: this.gridSize, h: this.gridSize };
            } else {
                this.selection = { x: Math.floor(imgX), y: Math.floor(imgY), w: this.editor.canvasWidth, h: this.editor.canvasHeight };
            }
            this._updateSelectionEl();
        }
    }

    _onPointerMove(e) {
        e.preventDefault();
        const prev = this._pointers.get(e.pointerId);
        if (!prev) return;
        this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (this._pointers.size === 2) {
            const pts = [...this._pointers.values()];
            const dist = Math.sqrt((pts[0].x - pts[1].x) ** 2 + (pts[0].y - pts[1].y) ** 2);
            const center = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
            const scale = dist / this._lastPinchDist;
            this.zoom = Math.max(0.25, Math.min(8, this.zoom * scale));
            this._lastPinchDist = dist;
            this.panX += center.x - this._lastPanPos.x;
            this.panY += center.y - this._lastPanPos.y;
            this._lastPanPos = center;
            this._drawSheet();
        } else if (this._pointers.size === 1 && !this.selection) {
            this.panX += e.clientX - this._lastPanPos.x;
            this.panY += e.clientY - this._lastPanPos.y;
            this._lastPanPos = { x: e.clientX, y: e.clientY };
            this._drawSheet();
        }
    }

    _onPointerUp(e) {
        this.wrap.releasePointerCapture(e.pointerId);
        this._pointers.delete(e.pointerId);
    }

    _importSelection() {
        if (!this.selection || !this.image) return;
        const s = this.selection;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = s.w;
        tempCanvas.height = s.h;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(this.image, s.x, s.y, s.w, s.h, 0, 0, s.w, s.h);

        const destW = this.editor.canvasWidth, destH = this.editor.canvasHeight;
        const destCanvas = document.createElement('canvas');
        destCanvas.width = destW;
        destCanvas.height = destH;
        const destCtx = destCanvas.getContext('2d');
        destCtx.imageSmoothingEnabled = false;
        destCtx.drawImage(tempCanvas, 0, 0, destW, destH);
        const imageData = destCtx.getImageData(0, 0, destW, destH);
        this.editor.setPixelsFromData(imageData.data, destW, destH);
        this.close();
    }
}

const editor = new SpriteEditor();
