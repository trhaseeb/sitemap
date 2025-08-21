// Map management
window.App = window.App || {};

App.Map = {
    init() {
        const map = L.map('map', { 
            maxZoom: 22, 
            renderer: L.svg(),
            fadeAnimation: false,
            zoomAnimation: false,
            rotate: true, // Enable rotation
            rotateControl: {
                closeOnZeroBearing: false
            }
        });
        
        map.setView([29.7604, -95.3698], 13);
        
        const googleSatHybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { maxZoom: 22, subdomains:['mt0','mt1','mt2','mt3'], attribution: '&copy; Google Maps', crossOrigin: 'anonymous' });
        const plainWhite = L.tileLayer('', { attribution: 'Plain White', maxZoom: 22, minZoom: 0,
            createTile: (coords, done) => {
                const tile = document.createElement('canvas');
                tile.width = tile.height = 256;
                const ctx = tile.getContext('2d');
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, 256, 256);
                setTimeout(() => { done(null, tile); }, 0);
                return tile;
            }
        });

        const baseLayers = { "Satellite Hybrid": googleSatHybrid, "Plain White": plainWhite };
        googleSatHybrid.addTo(map); 
        App.state.map = map;
        
        const svg = map.getRenderer(map)._container;
        App.state.svgPatternDefs = L.SVG.create('defs');
        svg.appendChild(App.state.svgPatternDefs);
        
        new L.Control.Measure({ position: 'topleft', primaryLengthUnit: 'feet', secondaryLengthUnit: 'meters', primaryAreaUnit: 'acres', secondaryAreaUnit: 'sqmeters' }).addTo(map);
        
        App.state.projectBoundary.layer = new L.FeatureGroup().addTo(map);
        App.state.geojsonLayer = new L.FeatureGroup().addTo(map);
        
        const overlayMaps = { "Features": App.state.geojsonLayer };
        App.state.layersControl = L.control.layers(baseLayers, overlayMaps, { collapsed: false }).addTo(map); 

        App.state.drawControl = new L.Control.Draw({ 
            edit: { featureGroup: App.state.geojsonLayer, edit: false, remove: true },
            draw: { polygon: true, polyline: true, rectangle: true, circle: false, marker: true, circlemarker: false } 
        });
        map.addControl(App.state.drawControl);

        // Event listeners
        map.on(L.Draw.Event.CREATED, App.Events.handleDrawNewFeature);
        map.on(L.Draw.Event.EDITED, App.Events.handleFeaturesEdited);
        map.on('overlayadd overlayremove', App.Events.handleOverlayToggle);
        map.on('popupopen', App.Events.handlePopupOpen);
    },

    /**
     * Creates a Leaflet layer for a single feature and adds it to the map.
     * @param {object} feature - The GeoJSON feature to add.
     */
    addFeature(feature) {
        if (!feature || !feature.properties) return;
        const featureId = feature.properties._internalId;
        if (App.state.featureIdToLayerMap.has(featureId)) return; // Already on map

        const layer = L.geoJSON(feature, {
            style: f => App.CategoryManager.getCategoryStyleForFeature(f),
            onEachFeature: (f, l) => {
                l.feature_internal_id = f.properties._internalId;
                App.state.featureIdToLayerMap.set(f.properties._internalId, l);
                this.bindFeatureInteractions(f, l);
                this.updateFeatureDecorator(l);
            },
            pointToLayer: (f, latlng) => App.CategoryManager.createPointMarker(f, latlng)
        });
        
        layer.addTo(App.state.geojsonLayer);
    },

    /**
     * Removes a feature's layer from the map.
     * @param {string} featureId - The ID of the feature to remove.
     */
    removeFeature(featureId) {
        if (!App.state.featureIdToLayerMap.has(featureId)) return;

        const layer = App.state.featureIdToLayerMap.get(featureId);
        App.state.geojsonLayer.removeLayer(layer);

        // Also remove any associated decorators
        const decoratorIndex = App.state.decoratorLayers.findIndex(d => d.layer === layer);
        if (decoratorIndex > -1) {
            App.state.decoratorLayers[decoratorIndex].remove();
            App.state.decoratorLayers.splice(decoratorIndex, 1);
        }

        App.state.featureIdToLayerMap.delete(featureId);
    },

    /**
     * Updates an existing feature on the map by removing the old layer and adding a new one.
     * @param {object} feature - The GeoJSON feature to update.
     */
    updateFeature(feature) {
        if (!feature || !feature.properties) return;
        this.removeFeature(feature.properties._internalId);
        this.addFeature(feature);
    },

    /**
     * Iterates through all features and shows or hides them based on current filter settings.
     * This is the main function for granularly updating the map view.
     */
    refreshFeaturesVisibility() {
        const allFeatures = App.state.data.geojson.data?.features || [];
        allFeatures.forEach(feature => {
            const featureId = feature.properties._internalId;
            const isVisibleByCategory = App.state.categoryVisibility[feature.properties.category] !== false;
            const matchesObservationFilter = !App.state.showOnlyWithObservations || (feature.properties.observations && feature.properties.observations.length > 0);

            const shouldBeVisible = isVisibleByCategory && matchesObservationFilter;
            const isCurrentlyVisible = App.state.featureIdToLayerMap.has(featureId);

            if (shouldBeVisible && !isCurrentlyVisible) {
                this.addFeature(feature);
            } else if (!shouldBeVisible && isCurrentlyVisible) {
                this.removeFeature(featureId);
            }
        });
        App.Legend.render(); // Re-render legend to update counts
    },

    /**
     * DEPRECATED: This function redraws the entire layer. Use granular methods instead.
     * Kept for reference during refactoring, will be removed later.
     */
    _renderGeoJSONLayer_DEPRECATED() {
        App.state.geojsonLayer.clearLayers();
        App.state.decoratorLayers.forEach(d => d.remove());
        App.state.decoratorLayers = [];
        App.state.featureIdToLayerMap.clear();

        const allFeatures = App.state.data.geojson.data?.features || [];
        allFeatures.forEach(feature => this.addFeature(feature));

        App.Legend.render();
    },

    updateFeatureDecorator(layer) {
        // First, remove any old decorator associated with this layer
        const oldDecoratorIndex = App.state.decoratorLayers.findIndex(d => d.layer === layer);
        if (oldDecoratorIndex > -1) {
            App.state.decoratorLayers[oldDecoratorIndex].remove();
            App.state.decoratorLayers.splice(oldDecoratorIndex, 1);
        }

        const feature = layer.feature;
        if (feature.geometry.type.includes('LineString')) {
            const style = App.CategoryManager.getCategoryStyleForFeature(feature);
            if (style.linePattern === 'arrows') {
                const decorator = L.polylineDecorator(layer, {
                    patterns: [{ offset: '15%', repeat: style.lineSpacing * 2, symbol: L.Symbol.arrowHead({ pixelSize: 12, polygon: false, pathOptions: { stroke: true, color: style.color, weight: style.weight, opacity: style.opacity }}) }]
                });
                decorator.layer = layer; // Associate decorator with layer
                App.state.decoratorLayers.push(decorator);
                // Only add to map if the main layer is on the map
                if (App.state.geojsonLayer.hasLayer(layer)) {
                    decorator.addTo(App.state.map);
                }
            }
        }
    },

    bindFeatureInteractions(feature, layer) {
        const container = L.DomUtil.create('div', 'font-sans max-w-xs');
        const hasObservations = feature.properties.observations && feature.properties.observations.length > 0;
        let observationBadge = hasObservations ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mr-2">Observation</span>` : '';
        container.innerHTML = `<strong class="text-base">${observationBadge}${feature.properties.Name || 'Unnamed Feature'}</strong><div class="text-sm mt-1 prose max-w-none">${feature.properties.Description || ''}</div>`;
        
        if (hasObservations) {
            const obsSummary = feature.properties.observations.map(obs => `<li>${obs.observationType || 'General'} (${obs.severity})</li>`).join('');
            container.innerHTML += `<div class="text-sm mt-2"><strong class="font-medium">Observations:</strong><ul class="list-disc list-inside">${obsSummary}</ul></div>`;
        }

        const buttons = L.DomUtil.create('div', 'mt-2 flex gap-2', container);
        const editBtn = L.DomUtil.create('button', 'bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded', buttons);
        editBtn.innerText = 'Edit Props';
        const editShapeBtn = L.DomUtil.create('button', 'bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded', buttons);
        editShapeBtn.innerText = 'Edit Shape';
        const delBtn = L.DomUtil.create('button', 'bg-red-500 hover:red-600 text-white text-xs py-1 px-2 rounded', buttons);
        delBtn.innerText = 'Delete';

        L.DomEvent.on(editBtn, 'click', e => { L.DomEvent.stop(e); App.Events.editFeatureProperties(feature); });
        L.DomEvent.on(editShapeBtn, 'click', e => { L.DomEvent.stop(e); App.Events.editFeatureShape(layer); });
        L.DomEvent.on(delBtn, 'click', e => { L.DomEvent.stop(e); App.Events.deleteFeature(feature); });

        layer.bindPopup(container);
        layer.on('click', e => { L.DomEvent.stopPropagation(e); App.Events.selectFeature(feature.properties._internalId); });

        const showLabel = feature.properties.showLabel || (hasObservations && feature.properties.Name);
        if (feature.properties.Name && showLabel) {
            let labelContent = '';
            let tooltipClass = 'leaflet-tooltip-label';
            if (feature.properties.showLabel) labelContent += `<span>${feature.properties.Name}</span>`;

            if (hasObservations) {
                const highestSeverity = feature.properties._cachedSeverity;
                const color = App.Utils.getColorForSeverity(highestSeverity);
                const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="${color}" style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5));"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2V7h2v7z"/></svg>`;
                labelContent += iconSvg;
                if (!feature.properties.showLabel) tooltipClass += ' leaflet-tooltip-icon-only';
            }
            
            layer.bindTooltip(labelContent, { permanent: true, direction: 'top', offset: [0, -10], className: tooltipClass });
        }
    },

    setBoundary(boundaryGeoJSON, fitView = false) {
        if (!App.state.map || !App.state.projectBoundary.layer) return;
        this.clearBoundary();
        if (!boundaryGeoJSON) return;

        const boundaryLayer = L.geoJSON(boundaryGeoJSON, { style: { className: 'project-boundary-style' } });
        App.state.projectBoundary.layer.addLayer(boundaryLayer).bringToBack();
        App.state.projectBoundary.geojson = boundaryGeoJSON;

        const bounds = boundaryLayer.getBounds();
        if (bounds.isValid()) {
            const paddedBounds = bounds.pad(0.30);
            App.state.map.setMaxBounds(paddedBounds);
            App.state.map.setMinZoom(App.state.map.getBoundsZoom(bounds));
            if (fitView) App.state.map.fitBounds(bounds.pad(0.1));
        }
        
        App.UI.elements.defineBoundaryBtn.classList.add('hidden');
        App.UI.elements.clearBoundaryBtn.classList.remove('hidden');
    },

    clearBoundary() {
        if (App.state.projectBoundary.layer) App.state.projectBoundary.layer.clearLayers();
        App.state.projectBoundary.geojson = null;
        if (App.state.map) {
            App.state.map.setMaxBounds(null);
            App.state.map.setMinZoom(0);
        }
        App.UI.elements.defineBoundaryBtn.classList.remove('hidden');
        App.UI.elements.clearBoundaryBtn.classList.add('hidden');
    }
};