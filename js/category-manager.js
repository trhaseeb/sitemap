// Category Manager - Handles feature categorization and styling
window.App = window.App || {};

App.CategoryManager = {
    debouncedCategoryUpdate: null, // Will be initialized lazily
    
    getDebouncedCategoryUpdate() {
        if (!this.debouncedCategoryUpdate && App.Utils?.debounce) {
            this.debouncedCategoryUpdate = App.Utils.debounce((categoryName, styleType, prop, value) => {
                if (!App.state.data.categories[categoryName]) return;
                App.state.data.categories[categoryName].styles[styleType][prop] = value;
                App.CategoryManager.updateSvgPatternDefs();
                App.Map.renderGeoJSONLayer();
            }, 250);
        }
        return this.debouncedCategoryUpdate;
    },
    handleCategoryInputChange(e) {
        const target = e.target;
        const categoryName = target.closest('.category-item').querySelector('.category-item-header span').innerText;
        const styleType = target.closest('.category-section').dataset.type;
        const prop = target.id.split('-').pop();
        let value = (target.type === 'number' || target.type === 'range') ? parseFloat(target.value) : target.value;
        if (prop === 'shape') {
            const section = target.closest('.category-section');
            section.querySelector('.svg-controls-container').classList.toggle('hidden', value !== 'svg');
            section.querySelector('.point-size-container').classList.toggle('hidden', value === 'svg');
        } else if (prop === 'fillPattern') {
            target.closest('.category-section').querySelector('.pattern-density-control').classList.toggle('hidden', value === 'solid');
        }
        const debouncedUpdate = this.getDebouncedCategoryUpdate();
        if (debouncedUpdate) {
            debouncedUpdate(categoryName, styleType, prop, value);
        }
    },
    render() {
        const container = document.getElementById('category-manager-content');
        if (!container) return;
        
        container.innerHTML = '';
        const categories = App.state.data.categories || {};
        
        if (Object.keys(categories).length === 0) {
            container.innerHTML = '<p class="text-gray-500">No categories defined. Click "Add New Category" to create one.</p>';
            return;
        }
        
        Object.keys(categories).forEach((categoryName, catIndex) => {
            const category = categories[categoryName];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'category-item';
            itemDiv.id = `cat-item-${catIndex}`;
            itemDiv.innerHTML = `
                <div class="category-item-header"><span class="font-bold">${categoryName}</span><div><button class="rename-cat-btn text-sm text-blue-600 hover:underline mr-2">Rename</button><button class="delete-cat-btn text-sm text-red-600 hover:underline">&times; Delete</button></div></div>
                <div class="category-item-body">
                    ${this.createCategorySectionHTML(catIndex, 'point', 'Point Style', category.styles.point)}
                    ${this.createCategorySectionHTML(catIndex, 'line', 'Line Style', category.styles.line)}
                    ${this.createCategorySectionHTML(catIndex, 'polygon', 'Polygon Style', category.styles.polygon)}
                </div>`;
            container.appendChild(itemDiv);
        });
        this.addEventListeners();
    },
    createCategorySectionHTML(catIndex, type, title, style) {
        const idPrefix = `cat${catIndex}-${type}`;
        let controls = '';
        if (type === 'point') {
            controls = `
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-fillColor" class="w-1/2 text-sm">Fill Color</label><input type="color" id="${idPrefix}-fillColor" value="${style.fillColor || '#ff8c00'}" class="w-1/2 h-8"></div>
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-fillOpacity" class="w-1/2 text-sm">Fill Opacity</label><input type="range" id="${idPrefix}-fillOpacity" value="${style.fillOpacity||0.8}" min="0" max="1" step="0.1" class="w-1/2"></div>
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-shape" class="w-1/2 text-sm">Symbol</label><select id="${idPrefix}-shape" class="w-1/2 p-1 border rounded text-sm">${['circle','square','triangle','svg'].map(s=>`<option value="${s}" ${style.shape===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}</select></div>
                <div class="point-size-container ${style.shape==='svg'?'hidden':''} flex items-center gap-4 mb-2"><label for="${idPrefix}-size" class="w-1/2 text-sm">Size (px)</label><input type="number" id="${idPrefix}-size" value="${style.size||16}" min="1" class="w-1/2 p-1 border rounded text-sm"></div>
                <div class="svg-controls-container ${style.shape!=='svg'?'hidden':''}">
                    <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-svgSize" class="w-1/2 text-sm">SVG Size (px)</label><input type="number" id="${idPrefix}-svgSize" value="${style.svgSize||24}" min="1" class="w-1/2 p-1 border rounded text-sm"></div>
                    <div class="mb-2"><label for="${idPrefix}-svg" class="block text-sm font-medium text-gray-700 mb-1">SVG Code</label><textarea id="${idPrefix}-svg" rows="3" class="block w-full border-gray-300 rounded-md shadow-sm p-2 text-sm">${style.svg||''}</textarea></div>
                </div>
                <h4 class="text-sm font-semibold mt-4 pt-2 border-t">Outline</h4>
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-color" class="w-1/2 text-sm">Outline Color</label><input type="color" id="${idPrefix}-color" value="${style.color||'#000000'}" class="w-1/2 h-8"></div>
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-weight" class="w-1/2 text-sm">Outline Width</label><input type="number" id="${idPrefix}-weight" value="${style.weight||1}" min="0" class="w-1/2 p-1 border rounded text-sm"></div>
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-opacity" class="w-1/2 text-sm">Outline Opacity</label><input type="range" id="${idPrefix}-opacity" value="${style.opacity||1}" min="0" max="1" step="0.1" class="w-1/2"></div>`;
        } else if (type === 'line') {
            controls = `
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-color" class="w-1/2 text-sm">Line Color</label><input type="color" id="${idPrefix}-color" value="${style.color||'#ff4500'}" class="w-1/2 h-8"></div>
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-opacity" class="w-1/2 text-sm">Line Opacity</label><input type="range" id="${idPrefix}-opacity" value="${style.opacity||1}" min="0" max="1" step="0.1" class="w-1/2"></div>
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-weight" class="w-1/2 text-sm">Line Width</label><input type="number" id="${idPrefix}-weight" value="${style.weight||3}" min="0" class="w-1/2 p-1 border rounded text-sm"></div>
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-linePattern" class="w-1/2 text-sm">Line Style</label><select id="${idPrefix}-linePattern" class="w-1/2 p-1 border rounded text-sm">${['solid','dashed','dotted','dash-dot','arrows'].map(s=>`<option value="${s}" ${style.linePattern===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}</select></div>
                <div class="flex items-center gap-4 mb-2 line-spacing-control"><label for="${idPrefix}-lineSpacing" class="w-1/2 text-sm">Spacing</label><input type="range" id="${idPrefix}-lineSpacing" value="${style.lineSpacing||10}" min="2" max="50" step="1" class="w-1/2"></div>
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-lineCap" class="w-1/2 text-sm">Line Ends</label><select id="${idPrefix}-lineCap" class="w-1/2 p-1 border rounded text-sm">${['round','butt','square'].map(s=>`<option value="${s}" ${style.lineCap===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}</select></div>
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-lineJoin" class="w-1/2 text-sm">Line Corners</label><select id="${idPrefix}-lineJoin" class="w-1/2 p-1 border rounded text-sm">${['round','miter','bevel'].map(s=>`<option value="${s}" ${style.lineJoin===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}</select></div>`;
        } else if (type === 'polygon') {
            controls = `
                <h4 class="text-sm font-semibold">Fill</h4>
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-fillPattern" class="w-1/2 text-sm">Fill Style</label><select id="${idPrefix}-fillPattern" class="w-1/2 p-1 border rounded text-sm">${['solid','h-lines','v-lines','diag-lines','crosshatch','dots','squares','triangles','hexagons','wave'].map(p=>`<option value="${p}" ${style.fillPattern===p?'selected':''}>${p.charAt(0).toUpperCase()+p.slice(1).replace('-',' ')}</option>`).join('')}</select></div>
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-fillColor" class="w-1/2 text-sm">${style.fillPattern==='solid'?'Fill Color':'Pattern Color'}</label><input type="color" id="${idPrefix}-fillColor" value="${style.fillColor||'#ff6347'}" class="w-1/2 h-8"></div>
                <div class="flex items-center gap-4 mb-2 pattern-density-control ${style.fillPattern==='solid'?'hidden':''}"><label for="${idPrefix}-patternDensity" class="w-1/2 text-sm">Pattern Density</label><input type="range" id="${idPrefix}-patternDensity" value="${style.patternDensity||10}" min="4" max="24" step="1" class="w-1/2"></div>
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-patternRotation" class="w-1/2 text-sm">Pattern Rotation</label><input type="range" id="${idPrefix}-patternRotation" value="${style.patternRotation||0}" min="0" max="360" step="1" class="w-1/2"></div>
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-fillOpacity" class="w-1/2 text-sm">Fill Opacity</label><input type="range" id="${idPrefix}-fillOpacity" value="${style.fillOpacity||0.2}" min="0" max="1" step="0.1" class="w-1/2"></div>
                <h4 class="text-sm font-semibold mt-4 pt-2 border-t">Outline</h4>
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-color" class="w-1/2 text-sm">Outline Color</label><input type="color" id="${idPrefix}-color" value="${style.color||'#ff6347'}" class="w-1/2 h-8"></div>
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-opacity" class="w-1/2 text-sm">Outline Opacity</label><input type="range" id="${idPrefix}-opacity" value="${style.opacity||1}" min="0" max="1" step="0.1" class="w-1/2"></div>
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-weight" class="w-1/2 text-sm">Outline Width</label><input type="number" id="${idPrefix}-weight" value="${style.weight||3}" min="0" class="w-1/2 p-1 border rounded text-sm"></div>
                <div class="flex items-center gap-4 mb-2"><label for="${idPrefix}-dashArray" class="w-1/2 text-sm">Outline Style</label><select id="${idPrefix}-dashArray" class="w-1/2 p-1 border rounded text-sm"><option value="solid" ${style.dashArray==='solid'?'selected':''}>Solid</option><option value="10 5" ${style.dashArray==='10 5'?'selected':''}>Dashed</option><option value="2 5" ${style.dashArray==='2 5'?'selected':''}>Dotted</option></select></div>`;
        }
        return `<div class="category-section" data-type="${type}"><h4>${title}</h4>${controls}</div>`;
    },
    addEventListeners() {
        document.querySelectorAll('#category-manager-content .category-item-header').forEach(h => h.onclick = e => { if (e.target.tagName !== 'BUTTON') h.parentElement.classList.toggle('open'); });
        document.querySelectorAll('#category-manager-content .delete-cat-btn').forEach(btn => btn.onclick = e => {
            const name = e.target.closest('.category-item-header').querySelector('span').innerText;
            App.UI.showConfirm('Delete Category?', `This will delete the "${name}" category and all its features. This cannot be undone.`, () => {
                App.state.data.geojson.data.features = App.state.data.geojson.data.features.filter(f => f.properties.category !== name);
                delete App.state.data.categories[name];
                delete App.state.categoryVisibility[name];
                this.updateSvgPatternDefs(); this.render(); App.Map.renderGeoJSONLayer();
            });
        });
        document.querySelectorAll('#category-manager-content .rename-cat-btn').forEach(btn => btn.onclick = e => {
            const currentName = e.target.closest('.category-item-header').querySelector('span').innerText;
            App.UI.showPrompt('Rename Category', [{ id: 'name', label: 'New Category Name', value: currentName, type: 'text' }], (results) => {
                if (!results.name || results.name.trim() === currentName) return;
                const newName = results.name.trim();
                if (App.state.data.categories[newName]) { App.UI.showMessage('Error', 'A category with that name already exists.'); return; }
                App.state.data.categories[newName] = App.state.data.categories[currentName];
                delete App.state.data.categories[currentName];
                App.state.categoryVisibility[newName] = App.state.categoryVisibility[currentName];
                delete App.state.categoryVisibility[currentName];
                App.state.data.geojson.data.features.forEach(f => { if (f.properties.category === currentName) f.properties.category = newName; });
                this.updateSvgPatternDefs(); this.render(); App.Map.renderGeoJSONLayer();
            });
        });
        document.querySelectorAll('#category-manager-content .category-section input, #category-manager-content .category-section select, #category-manager-content .category-section textarea').forEach(input => {
            input.addEventListener('input', this.handleCategoryInputChange.bind(this));
        });
    },
    addCategory() {
        App.UI.showPrompt('Add New Category', [
            { id: 'name', label: 'Category Name', value: '', type: 'text' }
        ], (results) => {
            if (!results.name) return;
            const categoryName = results.name.trim();
            if (App.state.data.categories[categoryName]) {
                App.UI.showMessage('Error', 'A category with that name already exists.');
                return;
            }
            App.state.data.categories[categoryName] = this.getDefaultCategory();
            App.state.categoryVisibility[categoryName] = true;
            this.render();
            App.Legend.render();
        });
    },
    getCategoryStyleForFeature(feature) {
        const categoryName = feature.properties.category;
        const category = App.state.data.categories[categoryName];
        if (!category) return this.getDefaultStyle();
        
        const geomType = feature.geometry.type;
        if (geomType.includes('Point')) {
            return category.styles?.point || this.getDefaultStyle().point;
        } else if (geomType.includes('LineString')) {
            return category.styles?.line || this.getDefaultStyle().line;
        } else if (geomType.includes('Polygon')) {
            return category.styles?.polygon || this.getDefaultStyle().polygon;
        }
        return this.getDefaultStyle();
    },
    createPointMarker(feature, latlng) {
        const style = this.getCategoryStyleForFeature(feature);
        const size = style.size || 16;
        
        if (style.shape === 'svg' && style.svg) {
            try {
                const svgSize = style.svgSize || 32;
                const iconHtml = `<div style="opacity: ${style.fillOpacity};">${style.svg.replace(/currentColor/g, style.fillColor)}</div>`;
                // Basic validation
                if (!iconHtml.includes('<svg')) throw new Error("Invalid SVG content");
                // Since L.marker isn't available, we'll fall back to circle marker
                console.warn('SVG markers not supported without Leaflet - falling back to circle marker');
                return { 
                    _latlng: latlng, 
                    options: { ...style, radius: size/2 },
                    type: 'circle'
                };
            } catch (e) {
                console.error("Failed to render custom SVG icon, falling back to default.", e);
            }
        }
        
        // Handle different shapes
        if (style.shape === 'square') {
            const iconHtml = `<div style="width: ${size}px; height: ${size}px; background-color: ${style.fillColor}; opacity: ${style.fillOpacity}; border: ${style.weight}px solid ${style.color}; border-radius: 2px;"></div>`;
            return {
                _latlng: latlng,
                options: { iconHtml, iconSize: [size, size], iconAnchor: [size/2, size/2] },
                type: 'marker'
            };
        }
        
        if (style.shape === 'triangle') {
            const iconHtml = `<div style="width: 0; height: 0; border-left: ${size/2}px solid transparent; border-right: ${size/2}px solid transparent; border-bottom: ${size}px solid ${style.fillColor}; opacity: ${style.fillOpacity};"></div>`;
            return {
                _latlng: latlng,
                options: { iconHtml, iconSize: [size, size], iconAnchor: [size/2, size*0.9] },
                type: 'marker'
            };
        }
        
        // Default to circle marker
        return {
            _latlng: latlng,
            options: { 
                radius: size/2,
                fillColor: style.fillColor || '#ff8c00',
                color: style.color || '#000000',
                weight: style.weight || 1,
                opacity: style.opacity || 1,
                fillOpacity: style.fillOpacity || 0.8
            },
            type: 'circle'
        };
    },
    getDefaultCategory() {
        return { 
            styles: { 
                point: { fillColor: '#ff8c00', fillOpacity: 0.8, color: '#000000', weight: 1, opacity: 1, size: 16, shape: 'circle', svg: '', svgSize: 24 },
                line: { color: '#ff4500', weight: 3, opacity: 1, linePattern: 'solid', lineSpacing: 10, lineCap: 'round', lineJoin: 'round' },
                polygon: { fillColor: '#ff6347', fillOpacity: 0.2, color: '#ff6347', weight: 3, opacity: 1, dashArray: 'solid', fillPattern: 'solid', patternDensity: 10, patternRotation: 0 }
            } 
        };
    },
    getDefaultStyle() {
        return this.getDefaultCategory().styles;
    },
    updateSvgPatternDefs() {
        const defsEl = App.state.svgPatternDefs;
        if (!defsEl) return;
        defsEl.innerHTML = '';
        for (const categoryName in App.state.data.categories) {
            const style = App.state.data.categories[categoryName].styles.polygon;
            const pattern = style.fillPattern;
            if (pattern !== 'solid') {
                const safeCategoryName = categoryName.replace(/[^a-zA-Z0-9]/g, '-');
                // Create SVG pattern element
                const p = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
                p.setAttribute('id', `${pattern}-${safeCategoryName}`);
                p.setAttribute('patternUnits', 'userSpaceOnUse');
                const size = style.patternDensity || 10;
                p.setAttribute('width', size); 
                p.setAttribute('height', size);
                
                const rotation = style.patternRotation || 0;
                if (rotation !== 0) p.setAttribute('patternTransform', `rotate(${rotation} 0 0)`);

                let shape;
                const strokeWidth = Math.max(1, size / 8);
                const color = style.fillColor;
                switch (pattern) {
                    case 'h-lines': 
                        shape = document.createElementNS('http://www.w3.org/2000/svg', 'path'); 
                        shape.setAttribute('d', `M 0 ${size/2} L ${size} ${size/2}`); 
                        break;
                    case 'v-lines': 
                        shape = document.createElementNS('http://www.w3.org/2000/svg', 'path'); 
                        shape.setAttribute('d', `M ${size/2} 0 L ${size/2} ${size}`); 
                        break;
                    case 'diag-lines': 
                        shape = document.createElementNS('http://www.w3.org/2000/svg', 'path'); 
                        shape.setAttribute('d', `M 0 ${size} L ${size} 0`); 
                        break;
                    case 'crosshatch': 
                        shape = document.createElementNS('http://www.w3.org/2000/svg', 'path'); 
                        shape.setAttribute('d', `M 0 ${size/2} L ${size} ${size/2} M ${size/2} 0 L ${size/2} ${size}`); 
                        break;
                    case 'dots': 
                        shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); 
                        shape.setAttribute('cx', size/2); 
                        shape.setAttribute('cy', size/2); 
                        shape.setAttribute('r', Math.max(1, size/5)); 
                        break;
                    case 'squares': 
                        const sqSize = Math.max(2, size/2); 
                        shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); 
                        shape.setAttribute('x', (size-sqSize)/2); 
                        shape.setAttribute('y', (size-sqSize)/2); 
                        shape.setAttribute('width', sqSize); 
                        shape.setAttribute('height', sqSize); 
                        break;
                    case 'triangles': 
                        shape = document.createElementNS('http://www.w3.org/2000/svg', 'path'); 
                        shape.setAttribute('d', `M${size/2} 0 L${size} ${size} L0 ${size} Z`); 
                        break;
                    case 'hexagons': 
                        const h = size * 0.866; 
                        shape = document.createElementNS('http://www.w3.org/2000/svg', 'path'); 
                        shape.setAttribute('d', `M${size/2} 0 L${size} ${h/4} L${size} ${h*3/4} L${size/2} ${h} L0 ${h*3/4} L0 ${h/4} Z`); 
                        p.setAttribute('height', h); 
                        break;
                    case 'wave': 
                        shape = document.createElementNS('http://www.w3.org/2000/svg', 'path'); 
                        shape.setAttribute('d', `M 0 ${size/2} C ${size/4} 0, ${size*3/4} ${size}, ${size} ${size/2}`); 
                        shape.setAttribute('fill', 'transparent'); 
                        break;
                }
                if (shape) {
                    if (pattern.includes('lines') || pattern === 'crosshatch' || pattern === 'wave') { 
                        shape.setAttribute('stroke', color); 
                        shape.setAttribute('stroke-width', strokeWidth); 
                    }
                    else { shape.setAttribute('fill', color); }
                    p.appendChild(shape); 
                    defsEl.appendChild(p);
                }
            }
        }
    }
};