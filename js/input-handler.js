const LONG_PRESS_MS = 500;

export class InputHandler {
    constructor(editor) {
        this.editor = editor;
        this.canvas = editor.canvas;
        this._pointers = new Map();
        this._drawing = false;
        this._panning = false;
        this._pinching = false;
        this._panMode = false;
        this._lastPinchDist = 0;
        this._lastPinchCenter = null;
        this._longPressTimer = null;
        this._strokeActive = false;
        this.touchOffset = -50;

        this._bind();
    }

    get panMode() { return this._panMode; }
    set panMode(v) {
        this._panMode = v;
        document.getElementById('btn-pan').classList.toggle('active', v);
    }

    _bind() {
        const el = this.canvas;
        el.addEventListener('pointerdown', (e) => this._onPointerDown(e));
        el.addEventListener('pointermove', (e) => this._onPointerMove(e));
        el.addEventListener('pointerup', (e) => this._onPointerUp(e));
        el.addEventListener('pointercancel', (e) => this._onPointerUp(e));
        el.addEventListener('pointerleave', (e) => this._onPointerLeave(e));

        el.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
        el.addEventListener('contextmenu', (e) => e.preventDefault());

        window.addEventListener('keydown', (e) => this._onKeyDown(e));
    }

    _onPointerDown(e) {
        e.preventDefault();
        this.canvas.setPointerCapture(e.pointerId);
        this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });

        if (this._pointers.size === 2) {
            this._cancelStroke();
            this._cancelLongPress();
            this._drawing = false;
            this._panning = true;
            this._pinching = true;
            const pts = [...this._pointers.values()];
            this._lastPinchDist = this._distance(pts[0], pts[1]);
            this._lastPinchCenter = this._midpoint(pts[0], pts[1]);
            this._hideTouchCursor();
            return;
        }

        if (this._pointers.size > 2) return;

        if (this._panMode) {
            this._panning = true;
            this._lastPanPos = { x: e.clientX, y: e.clientY };
            return;
        }

        if (e.pointerType === 'touch') {
            this._longPressTimer = setTimeout(() => {
                this._longPressTimer = null;
                const pos = this._eventToPixel(e, true);
                if (pos) {
                    this.editor.pickColor(pos.x, pos.y);
                }
            }, LONG_PRESS_MS);
        }

        this._drawing = true;
        this._strokeActive = true;
        this.editor.beginStroke();

        const pos = this._eventToPixel(e, e.pointerType === 'touch');
        if (pos) {
            if (e.pointerType === 'touch') this._showTouchCursor(e, pos);
            if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
                this.editor.eraseAt(pos.x, pos.y);
            } else {
                this.editor.toolDown(pos.x, pos.y, e);
            }
        }
        this._lastDrawPos = pos;
    }

    _onPointerMove(e) {
        e.preventDefault();
        const prev = this._pointers.get(e.pointerId);
        if (!prev) return;
        this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });

        if (this._pinching && this._pointers.size >= 2) {
            const pts = [...this._pointers.values()];
            const dist = this._distance(pts[0], pts[1]);
            const center = this._midpoint(pts[0], pts[1]);

            const scale = dist / this._lastPinchDist;
            if (Math.abs(scale - 1) > 0.01) {
                this.editor.zoomAt(center.x, center.y, scale);
                this._lastPinchDist = dist;
            }

            const dx = center.x - this._lastPinchCenter.x;
            const dy = center.y - this._lastPinchCenter.y;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                this.editor.pan(dx, dy);
                this._lastPinchCenter = center;
            }
            return;
        }

        if (this._panning) {
            const dx = e.clientX - (this._lastPanPos?.x ?? prev.x);
            const dy = e.clientY - (this._lastPanPos?.y ?? prev.y);
            this.editor.pan(dx, dy);
            this._lastPanPos = { x: e.clientX, y: e.clientY };
            return;
        }

        if (this._drawing) {
            if (this._longPressTimer) {
                this._cancelLongPress();
            }
            const pos = this._eventToPixel(e, e.pointerType === 'touch');
            if (pos) {
                if (e.pointerType === 'touch') this._showTouchCursor(e, pos);
                this.editor.toolMove(pos.x, pos.y, e);
            }
            this._lastDrawPos = pos;
            return;
        }

        const pos = this._eventToPixel(e, false);
        this.editor.updateHover(pos);
    }

    _onPointerUp(e) {
        e.preventDefault();
        this.canvas.releasePointerCapture(e.pointerId);
        this._pointers.delete(e.pointerId);
        this._cancelLongPress();

        if (this._pointers.size === 0) {
            if (this._drawing && this._strokeActive) {
                const pos = this._eventToPixel(e, e.pointerType === 'touch');
                this.editor.toolUp(pos);
                this.editor.endStroke();
                this._strokeActive = false;
            }
            this._drawing = false;
            this._panning = false;
            this._pinching = false;
            this._hideTouchCursor();
        } else if (this._pointers.size === 1) {
            this._pinching = false;
            if (this._panning) {
                const remaining = [...this._pointers.values()][0];
                this._lastPanPos = { x: remaining.x, y: remaining.y };
            }
        }
    }

    _onPointerLeave(e) {
        if (this._pointers.size === 0) {
            this.editor.updateHover(null);
            this._hideTouchCursor();
        }
    }

    _onWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        if (e.deltaY < 0) {
            this.editor.zoomIn(cx, cy);
        } else {
            this.editor.zoomOut(cx, cy);
        }
    }

    _onKeyDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        const ctrl = e.ctrlKey || e.metaKey;

        if (ctrl && e.key === 'z') { e.preventDefault(); this.editor.undo(); return; }
        if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); this.editor.redo(); return; }
        if (ctrl && e.key === 'c') { e.preventDefault(); this.editor.copySelection(); return; }
        if (ctrl && e.key === 'v') { e.preventDefault(); this.editor.pasteSelection(); return; }

        switch (e.key) {
            case '1': this.editor.setTool('draw'); break;
            case '2': this.editor.setTool('erase'); break;
            case '3': this.editor.setTool('fill'); break;
            case '4': this.editor.setTool('pick'); break;
            case '5': this.editor.setTool('select'); break;
            case '6': this.editor.setTool('line'); break;
            case '7': this.editor.setTool('circle'); break;
            case '8': this.editor.setTool('lighten'); break;
            case '9': this.editor.setTool('darken'); break;
            case '[': this.editor.adjustBrushSize(-1); break;
            case ']': this.editor.adjustBrushSize(1); break;
            case 'm': case 'M': this.editor.cycleMirror(); break;
            case 't': case 'T': this.editor.toggleTransparencyLock(); break;
            case 'g': case 'G': this.editor.toggleGrid(); break;
            case 'c': case 'C': if (!ctrl) this.editor.copySprite(); break;
            case 'v': case 'V': if (!ctrl) this.editor.pasteSprite(); break;
            case '+': case '=': this.editor.zoomIn(); break;
            case '-': this.editor.zoomOut(); break;
            case '0': this.editor.resetZoom(); break;
            case 'Delete': case 'Backspace': this.editor.deleteSelection(); break;
            case 'Escape': this.editor.handleEscape(); break;
        }
    }

    _eventToPixel(e, useTouchOffset) {
        const rect = this.canvas.getBoundingClientRect();
        let clientY = e.clientY;
        if (useTouchOffset) clientY += this.touchOffset;
        const x = Math.floor((e.clientX - rect.left - this.editor.panX) / this.editor.zoom);
        const y = Math.floor((clientY - rect.top - this.editor.panY) / this.editor.zoom);
        if (x < 0 || x >= this.editor.canvasWidth || y < 0 || y >= this.editor.canvasHeight) return null;
        return { x, y };
    }

    _showTouchCursor(e, pos) {
        const cursor = document.getElementById('touch-cursor');
        const rect = this.canvas.getBoundingClientRect();
        const screenX = rect.left + this.editor.panX + (pos.x + 0.5) * this.editor.zoom;
        const screenY = rect.top + this.editor.panY + (pos.y + 0.5) * this.editor.zoom;
        cursor.style.left = screenX + 'px';
        cursor.style.top = screenY + 'px';
        cursor.classList.remove('hidden');
    }

    _hideTouchCursor() {
        document.getElementById('touch-cursor').classList.add('hidden');
    }

    _cancelStroke() {
        if (this._strokeActive) {
            this.editor.cancelStroke();
            this._strokeActive = false;
        }
    }

    _cancelLongPress() {
        if (this._longPressTimer) {
            clearTimeout(this._longPressTimer);
            this._longPressTimer = null;
        }
    }

    _distance(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    _midpoint(a, b) {
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
}
