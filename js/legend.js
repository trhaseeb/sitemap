// Legend Module
window.App = window.App || {};

App.Legend = {
    render() {
        const container = document.getElementById('legend-content');
        container.innerHTML = '';
        const { categories, geojson } = App.state.data;
        const allFeatures = geojson?.data?.features || []; 
        if (Object.keys(categories).length === 0) { 
            container.innerHTML = `<div class="text-center text-gray-500 p-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m-6 3l6-3m0 0l-6 3m6-3v10" /></svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">No Categories</h3>
                <p class="mt-1 text-sm text-gray-500">Use the Category Manager to create categories for your features.</p>
            </div>`;
            return; 
        }
        
        for (const categoryName in categories) {
            const allFeaturesInCategory = allFeatures.filter(f => f.properties.category === categoryName);
            if (allFeaturesInCategory.length === 0) continue;

            const visibleFeaturesInCategory = allFeaturesInCategory.filter(f => !App.state.showOnlyWithObservations || (f.properties.observations && f.properties.observations.length > 0));
            
            if (visibleFeaturesInCategory.length === 0 && App.state.showOnlyWithObservations) {
                continue;
            }
            
            const categorySeverities = allFeaturesInCategory.map(f => f.properties._cachedSeverity).filter(Boolean);
            const hasObservation = categorySeverities.length > 0;

            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'legend-category';
            const header = document.createElement('div');
            header.className = 'legend-category-header';
            
            const innerFlexDiv = document.createElement('div');
            innerFlexDiv.className = 'flex items-center';

            const categoryVisibilityToggle = document.createElement('input');
            categoryVisibilityToggle.type = 'checkbox';
            categoryVisibilityToggle.className = 'h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2 category-visibility-toggle';
            categoryVisibilityToggle.checked = App.state.categoryVisibility[categoryName] !== false;

            const categoryNameSpan = document.createElement('span');
            categoryNameSpan.className = 'font-semibold';
            categoryNameSpan.innerText = categoryName;

            innerFlexDiv.appendChild(categoryVisibilityToggle);
            innerFlexDiv.appendChild(categoryNameSpan);

            if (hasObservation) {
                const indicator = document.createElement('span');
                indicator.className = 'category-observation-indicator';
                // Create a dummy array of objects for getHighestSeverity, as it expects a specific structure
                const dummyObservations = categorySeverities.map(s => ({ severity: s }));
                const highestSeverity = App.Utils.getHighestSeverity(dummyObservations);
                indicator.style.backgroundColor = App.Utils.getColorForSeverity(highestSeverity);
                indicator.title = `This category's highest observation severity is ${highestSeverity}.`;
                innerFlexDiv.appendChild(indicator);
            }
            header.appendChild(innerFlexDiv);

            const featureCountSpan = document.createElement('span');
            featureCountSpan.className = 'text-sm text-gray-500';
            featureCountSpan.innerText = `(${visibleFeaturesInCategory.length})`;
            header.appendChild(featureCountSpan);

            const itemList = document.createElement('div');
            itemList.className = 'legend-item-list space-y-1 mt-1';
            
            visibleFeaturesInCategory.forEach(feature => {
                const item = document.createElement('div');
                const highestSeverity = feature.properties._cachedSeverity;
                const hasObservations = !!highestSeverity;

                item.className = 'legend-item';
                if (hasObservations) item.classList.add('has-observations');
                item.dataset.featureId = feature.properties._internalId;
                
                let observationIcon = '';
                if (hasObservations) {
                    const color = App.Utils.getColorForSeverity(highestSeverity);
                    observationIcon = `<span class="observation-icon" title="Highest severity: ${highestSeverity}" style="background-color: ${color};"></span>`;
                }
                
                item.innerHTML = `${observationIcon}<span class="truncate">${feature.properties.Name || 'Unnamed'}</span>`;
                item.prepend(this.createSwatch(feature));
                item.onclick = () => App.Events.selectFeature(feature.properties._internalId);
                itemList.appendChild(item);
            });

            categoryDiv.append(header, itemList);
            container.appendChild(categoryDiv);

            header.onclick = e => { if (e.target.type !== 'checkbox') { categoryDiv.classList.toggle('open'); itemList.style.display = categoryDiv.classList.contains('open') ? 'block' : 'none'; }};

            categoryVisibilityToggle.onchange = e => {
                App.state.categoryVisibility[categoryName] = e.target.checked;
                App.Map.refreshFeaturesVisibility();
            };
        }
    },
    createSwatch(feature) {
        const swatch = document.createElement('div');
        swatch.className = 'legend-swatch';
        const style = App.CategoryManager.getCategoryStyleForFeature(feature);
        if (!style) { swatch.style.backgroundColor = '#808080'; return swatch; }
        
        const geomType = feature.geometry.type;
        let svgContent = '';
        const svgSize = 32;

        if (geomType.includes('Polygon')) {
            const safeCategoryName = (feature.properties.category || '').replace(/[^a-zA-Z0-9]/g, '-');
            const patternId = `${style.fillPattern}-${safeCategoryName}`;
            const fill = (style.fillPattern === 'solid') ? chroma(style.fillColor).hex() : `url(#${patternId})`;
            const sw = Math.min(4, style.weight);
            svgContent = `<rect x="0" y="0" width="${svgSize}" height="${svgSize}" fill="${fill}" fill-opacity="${style.fillOpacity}" stroke="${style.color}" stroke-opacity="${style.opacity}" stroke-width="${sw}" stroke-dasharray="${style.dashArray === 'solid' ? '' : style.dashArray}"/>`;
        } else if (geomType.includes('LineString')) {
            const sw = Math.min(svgSize / 2, style.weight);
            svgContent = `<line x1="0" y1="${svgSize/2}" x2="${svgSize}" y2="${svgSize/2}" stroke="${style.color}" stroke-opacity="${style.opacity}" stroke-width="${sw}" stroke-dasharray="${style.dashArray || ''}" stroke-linecap="${style.lineCap}"/>`;
            if (style.linePattern === 'arrows') {
                svgContent += `<path d="M ${svgSize - 8} ${svgSize/2 - 5} L ${svgSize - 2} ${svgSize/2} L ${svgSize - 8} ${svgSize/2 + 5}" fill="none" stroke="${style.color}" stroke-opacity="${style.opacity}" stroke-width="${Math.min(sw, 2)}"/>`;
            }
        } else if (geomType.includes('Point')) {
            if (style.shape === 'svg' && style.svg) {
                swatch.innerHTML = style.svg.replace(/currentColor/g, style.fillColor);
                swatch.style.width = `${style.svgSize}px`;
                swatch.style.height = `${style.svgSize}px`;
                swatch.style.opacity = style.fillOpacity;
                return swatch;
            }
            const r = (style.size || 16) / 2 * (svgSize / 16);
            const sw = Math.min(r / 2, style.weight);
            const cx = svgSize / 2;
            const cy = svgSize / 2;
            const commonAttrs = `fill="${style.fillColor}" fill-opacity="${style.fillOpacity}" stroke="${style.color}" stroke-opacity="${style.opacity}" stroke-width="${sw}"`;
            if (style.shape === 'square') svgContent = `<rect x="${cx-r}" y="${cy-r}" width="${r*2}" height="${r*2}" ${commonAttrs}/>`;
            else if (style.shape === 'triangle') svgContent = `<path d="M${cx} ${cy-r} L${cx+r*0.866} ${cy+r*0.5} L${cx-r*0.866} ${cy+r*0.5} Z" ${commonAttrs}/>`;
            else svgContent = `<circle cx="${cx}" cy="${cy}" r="${r}" ${commonAttrs}/>`;
        }
        
        if (svgContent) {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute('viewBox', `0 0 ${svgSize} ${svgSize}`);
            svg.innerHTML = svgContent;
            swatch.appendChild(svg);
        } else {
            swatch.style.backgroundColor = '#808080';
        }
        return swatch;
    }
};