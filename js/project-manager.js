const STORAGE_KEY = 'sprite_editor_projects';

export class ProjectManager {
    constructor(editor) {
        this.editor = editor;
        this.projects = {};
        this.currentProject = null;
        this.currentSpriteId = null;
        this._load();
        this._bindUI();
    }

    _load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) this.projects = JSON.parse(saved);
        } catch {}

        if (Object.keys(this.projects).length === 0) {
            this._createProject('My Project');
        }

        const lastProject = localStorage.getItem('sprite_editor_last_project');
        this.currentProject = lastProject && this.projects[lastProject] ? lastProject : Object.keys(this.projects)[0];
        const proj = this.projects[this.currentProject];
        this.currentSpriteId = proj.lastEdited || Object.keys(proj.sprites)[0] || null;
    }

    _save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.projects));
        localStorage.setItem('sprite_editor_last_project', this.currentProject);
    }

    _createProject(name) {
        const id = 'proj_' + Date.now().toString(36);
        const spriteId = 'spr_' + Date.now().toString(36);
        this.projects[id] = {
            name,
            sprites: {
                [spriteId]: { name: 'Sprite 1', size: 16, data: null }
            },
            lastEdited: spriteId
        };
        this.currentProject = id;
        this.currentSpriteId = spriteId;
        this._save();
        return id;
    }

    getProject() {
        return this.projects[this.currentProject];
    }

    getSprite() {
        const proj = this.getProject();
        if (!proj || !this.currentSpriteId) return null;
        return proj.sprites[this.currentSpriteId];
    }

    saveCurrentSprite(pixels, canvasWidth, canvasHeight, layers, activeLayerIndex) {
        const proj = this.getProject();
        if (!proj || !this.currentSpriteId) return;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = canvasHeight;
        const ctx = tempCanvas.getContext('2d');

        if (layers && layers.length > 1) {
            const tmpLayer = document.createElement('canvas');
            tmpLayer.width = canvasWidth;
            tmpLayer.height = canvasHeight;
            const tmpCtx = tmpLayer.getContext('2d');
            for (const l of layers) {
                if (!l.visible) continue;
                tmpCtx.clearRect(0, 0, canvasWidth, canvasHeight);
                tmpCtx.putImageData(new ImageData(new Uint8ClampedArray(l.pixels), canvasWidth, canvasHeight), 0, 0);
                ctx.globalAlpha = l.opacity;
                ctx.drawImage(tmpLayer, 0, 0);
            }
            ctx.globalAlpha = 1;
        } else {
            const imageData = new ImageData(new Uint8ClampedArray(pixels), canvasWidth, canvasHeight);
            ctx.putImageData(imageData, 0, 0);
        }
        const data = tempCanvas.toDataURL('image/png');

        const sprite = proj.sprites[this.currentSpriteId];
        sprite.data = data;
        sprite.w = canvasWidth;
        sprite.h = canvasHeight;
        sprite.size = Math.max(canvasWidth, canvasHeight);

        if (layers && layers.length > 1) {
            sprite.layers = layers.map(l => {
                const lCanvas = document.createElement('canvas');
                lCanvas.width = canvasWidth;
                lCanvas.height = canvasHeight;
                const lCtx = lCanvas.getContext('2d');
                lCtx.putImageData(new ImageData(new Uint8ClampedArray(l.pixels), canvasWidth, canvasHeight), 0, 0);
                return {
                    name: l.name,
                    opacity: l.opacity,
                    visible: l.visible,
                    data: lCanvas.toDataURL('image/png')
                };
            });
            sprite.activeLayer = activeLayerIndex;
        } else {
            delete sprite.layers;
            delete sprite.activeLayer;
        }

        proj.lastEdited = this.currentSpriteId;
        this._save();
    }

    selectSprite(id) {
        const proj = this.getProject();
        if (!proj || !proj.sprites[id]) return;
        this.editor.autoSave();
        this.currentSpriteId = id;
        proj.lastEdited = id;
        this._save();
        this.editor.loadSprite(proj.sprites[id]);
        this.renderGallery();
    }

    addSprite(name, w, h) {
        const proj = this.getProject();
        if (!proj) return;
        const id = 'spr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        const count = Object.keys(proj.sprites).length + 1;
        const sw = w || this.editor.canvasWidth;
        const sh = h || this.editor.canvasHeight;
        proj.sprites[id] = { name: name || `Sprite ${count}`, w: sw, h: sh, size: Math.max(sw, sh), data: null };
        this._save();
        this.selectSprite(id);
    }

    deleteSprite(id) {
        const proj = this.getProject();
        if (!proj) return;
        const keys = Object.keys(proj.sprites);
        if (keys.length <= 1) return;
        delete proj.sprites[id];
        if (this.currentSpriteId === id) {
            this.currentSpriteId = Object.keys(proj.sprites)[0];
            proj.lastEdited = this.currentSpriteId;
            this.editor.loadSprite(proj.sprites[this.currentSpriteId]);
        }
        this._save();
        this.renderGallery();
    }

    renameSprite(id, name) {
        const proj = this.getProject();
        if (!proj || !proj.sprites[id]) return;
        proj.sprites[id].name = name;
        this._save();
        this.renderGallery();
    }

    exportPNG() {
        this.editor.autoSave();
        const sprite = this.getSprite();
        if (!sprite || !sprite.data) return;
        const link = document.createElement('a');
        link.download = `${sprite.name || 'sprite'}.png`;
        link.href = sprite.data;
        link.click();
    }

    async exportZIP() {
        const proj = this.getProject();
        if (!proj) return;
        this.editor.autoSave();

        const zip = new JSZip();
        const manifest = { name: proj.name, sprites: {} };

        for (const [id, sprite] of Object.entries(proj.sprites)) {
            if (!sprite.data) continue;
            const safeName = sprite.name.replace(/[^a-zA-Z0-9_-]/g, '_');
            const filename = `${safeName}.png`;
            const base64 = sprite.data.split(',')[1];
            zip.file(filename, base64, { base64: true });

            const entry = { name: sprite.name, w: sprite.w || sprite.size, h: sprite.h || sprite.size, size: sprite.size, file: filename };

            if (sprite.layers && sprite.layers.length > 1) {
                entry.layers = [];
                entry.activeLayer = sprite.activeLayer || 0;
                for (let li = 0; li < sprite.layers.length; li++) {
                    const layer = sprite.layers[li];
                    const layerFile = `${safeName}_layer${li}.png`;
                    if (layer.data) {
                        zip.file(layerFile, layer.data.split(',')[1], { base64: true });
                    }
                    entry.layers.push({
                        name: layer.name,
                        opacity: layer.opacity,
                        visible: layer.visible,
                        file: layerFile
                    });
                }
            }

            manifest.sprites[id] = entry;
        }

        zip.file('manifest.json', JSON.stringify(manifest, null, 2));
        const blob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.download = `${proj.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    }

    async importZIP(file) {
        const zip = await JSZip.loadAsync(file);
        const manifestFile = zip.file('manifest.json');
        if (!manifestFile) return;

        const manifest = JSON.parse(await manifestFile.async('string'));
        const projectName = manifest.name || file.name.replace(/\.zip$/, '');
        const projectId = this._createProject(projectName);
        const proj = this.projects[projectId];
        proj.sprites = {};

        for (const [id, info] of Object.entries(manifest.sprites)) {
            const imgFile = zip.file(info.file);
            if (!imgFile) continue;
            const base64 = await imgFile.async('base64');
            const spriteId = 'spr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
            const spriteObj = {
                name: info.name,
                w: info.w || info.size,
                h: info.h || info.size,
                size: info.size,
                data: `data:image/png;base64,${base64}`
            };

            if (info.layers && info.layers.length > 1) {
                spriteObj.layers = [];
                spriteObj.activeLayer = info.activeLayer || 0;
                for (const layerInfo of info.layers) {
                    const layerFile = zip.file(layerInfo.file);
                    const layerData = layerFile ? `data:image/png;base64,${await layerFile.async('base64')}` : null;
                    spriteObj.layers.push({
                        name: layerInfo.name,
                        opacity: layerInfo.opacity !== undefined ? layerInfo.opacity : 1,
                        visible: layerInfo.visible !== undefined ? layerInfo.visible : true,
                        data: layerData
                    });
                }
            }

            proj.sprites[spriteId] = spriteObj;
        }

        if (Object.keys(proj.sprites).length === 0) {
            const spriteId = 'spr_' + Date.now().toString(36);
            proj.sprites[spriteId] = { name: 'Sprite 1', size: 16, data: null };
        }

        this.currentProject = projectId;
        this.currentSpriteId = Object.keys(proj.sprites)[0];
        proj.lastEdited = this.currentSpriteId;
        this._save();
        this.editor.loadSprite(proj.sprites[this.currentSpriteId]);
        this.renderGallery();
        this._updateProjectName();
    }

    importImage(file) {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const maxDim = Math.max(img.width, img.height);
                const clamped = Math.min(128, Math.max(8, maxDim));
                const rounded = [8, 16, 32, 64, 128].reduce((prev, curr) =>
                    Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev
                );
                const scale = rounded / maxDim;
                const w = Math.max(1, Math.round(img.width * scale));
                const h = Math.max(1, Math.round(img.height * scale));
                this.addSprite(file.name.replace(/\.[^.]+$/, ''), w, h);
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = w;
                tempCanvas.height = h;
                const ctx = tempCanvas.getContext('2d');
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, 0, 0, w, h);
                const imageData = ctx.getImageData(0, 0, w, h);
                this.editor.setPixelsFromData(imageData.data, w, h);
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    }

    renderGallery() {
        const proj = this.getProject();
        if (!proj) return;
        const gallery = document.getElementById('sprite-gallery');
        gallery.innerHTML = '';

        for (const [id, sprite] of Object.entries(proj.sprites)) {
            const thumb = document.createElement('div');
            thumb.className = 'sprite-thumb' + (id === this.currentSpriteId ? ' active' : '');
            thumb.dataset.id = id;

            const canvas = document.createElement('canvas');
            canvas.width = sprite.w || sprite.size;
            canvas.height = sprite.h || sprite.size;
            if (sprite.data) {
                const img = new Image();
                img.onload = () => {
                    canvas.getContext('2d').drawImage(img, 0, 0);
                };
                img.src = sprite.data;
            }

            const label = document.createElement('span');
            label.textContent = sprite.name;

            thumb.appendChild(canvas);
            thumb.appendChild(label);

            thumb.addEventListener('click', () => this.selectSprite(id));

            let pressTimer = null;
            thumb.addEventListener('pointerdown', () => {
                pressTimer = setTimeout(() => {
                    pressTimer = null;
                    const newName = prompt('Rename sprite:', sprite.name);
                    if (newName) this.renameSprite(id, newName);
                }, 600);
            });
            thumb.addEventListener('pointerup', () => { if (pressTimer) clearTimeout(pressTimer); });
            thumb.addEventListener('pointerleave', () => { if (pressTimer) clearTimeout(pressTimer); });

            gallery.appendChild(thumb);
        }
    }

    exportPNGScaled(scale) {
        this.editor.autoSave();
        const sprite = this.getSprite();
        if (!sprite || !sprite.data) return;
        const outW = (sprite.w || sprite.size) * scale;
        const outH = (sprite.h || sprite.size) * scale;
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = outW;
            canvas.height = outH;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, outW, outH);
            const link = document.createElement('a');
            link.download = `${sprite.name || 'sprite'}_${outW}x${outH}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        img.src = sprite.data;
    }

    _bindUI() {
        document.getElementById('btn-new-sprite').addEventListener('click', () => {
            this.addSprite(null, this.editor.canvasWidth, this.editor.canvasHeight);
        });

        document.getElementById('btn-delete-sprite').addEventListener('click', () => {
            const proj = this.getProject();
            if (!proj || Object.keys(proj.sprites).length <= 1) return;
            if (confirm('Delete this sprite?')) {
                this.deleteSprite(this.currentSpriteId);
            }
        });

        document.getElementById('project-name').addEventListener('change', (e) => {
            const proj = this.getProject();
            if (proj) {
                proj.name = e.target.value;
                this._save();
            }
        });

        document.getElementById('btn-sprites').addEventListener('click', () => {
            this.renderGallery();
            this._updateProjectName();
            this.editor.togglePanel('sprites-panel');
        });

        document.getElementById('btn-save-png').addEventListener('click', () => this.exportPNG());
        document.getElementById('btn-save-png-scaled').addEventListener('click', () => {
            const scaleStr = document.getElementById('export-scale-select').value;
            this.exportPNGScaled(parseInt(scaleStr));
        });
        document.getElementById('btn-export-zip').addEventListener('click', () => this.exportZIP());

        document.getElementById('btn-import-zip').addEventListener('click', () => {
            document.getElementById('file-import-zip').click();
        });
        document.getElementById('file-import-zip').addEventListener('change', (e) => {
            if (e.target.files[0]) this.importZIP(e.target.files[0]);
            e.target.value = '';
        });

        document.getElementById('btn-import-image').addEventListener('click', () => {
            document.getElementById('file-import-image').click();
        });
        document.getElementById('file-import-image').addEventListener('change', (e) => {
            if (e.target.files[0]) this.importImage(e.target.files[0]);
            e.target.value = '';
        });
    }

    _updateProjectName() {
        const proj = this.getProject();
        if (proj) document.getElementById('project-name').value = proj.name;
    }
}
