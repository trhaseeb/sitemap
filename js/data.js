// Data handling
window.App = window.App || {};

App.Data = {
    getFeatureById: id => App.state.data.geojson.data?.features.find(f => f.properties._internalId === id),

    /**
     * Calculates and caches geospatial data and observation severity for a single feature.
     * This is the core of the pre-calculation optimization.
     * @param {object} feature - The GeoJSON feature to process.
     */
    updateFeatureCalculations(feature) {
        if (!feature || !feature.properties) return;

        // Cache geospatial data (area, perimeter, etc.)
        feature.properties._cachedGeoData = App.Utils.calculateGeoData(feature);

        // Cache observation severity
        feature.properties._cachedSeverity = App.Utils.getHighestSeverity(feature.properties.observations);

        // Mark the feature as having cached data. The version number can be used for future cache invalidation strategies.
        feature.properties._cacheVer = 1;
    },

    /**
     * A helper function to run the calculation update on an array of features.
     * @param {Array<object>} features - An array of GeoJSON features.
     */
    updateFeatures(features) {
        if (!Array.isArray(features)) return;
        features.forEach(feature => this.updateFeatureCalculations(feature));
    },

    /**
     * Recalculates cached data for all features in the project.
     * Useful for initial data load and large-scale updates.
     */
    recalculateAllFeatures() {
        const allFeatures = App.state.data.geojson.data?.features || [];
        this.updateFeatures(allFeatures);
    },

    async handleRasterUpload(event, type) {
        const file = event.target.files[0];
        if (!file) return;
        App.UI.showLoader(`Loading ${type.toUpperCase()}...`);
        try {
            const fileBuffer = await App.Utils.readFile(file, 'arrayBuffer');
            const georaster = await parseGeoraster(fileBuffer);
            App.state.data[type] = { georaster, fileBuffer, layer: App.state.data[type].layer };
            this.addOrUpdateRasterLayer(type);
        } catch (error) {
            console.error(`Raster Error (${type}):`, error);
            App.UI.showMessage('File Error', `Failed to load ${file.name}. Please ensure it's a valid GeoTIFF.`);
        } finally { App.UI.hideLoader(); }
    },
    processAndInitializeFeatures(geojson) {
        if (!geojson?.features) return;
        if (geojson.properties?.categories) Object.assign(App.state.data.categories, geojson.properties.categories);
        if (geojson.properties?.contributors) App.state.data.contributors = geojson.properties.contributors; 
        
        let defaultCategoryName = Object.keys(App.state.data.categories)[0];
        let assignedDefaultCount = 0;
        if (!defaultCategoryName) {
            defaultCategoryName = "Imported";
            App.state.data.categories[defaultCategoryName] = App.CategoryManager.getDefaultCategory();
        }
        geojson.features.forEach((feature) => {
            if (!feature.properties) feature.properties = {};
            feature.properties._internalId = feature.properties._internalId || crypto.randomUUID(); 
            if (!feature.properties.images) feature.properties.images = [];
            if (!feature.properties.observations) feature.properties.observations = [];

            if (!feature.properties.category || !App.state.data.categories[feature.properties.category]) {
                feature.properties.category = defaultCategoryName;
                assignedDefaultCount++;
            }
            if (typeof App.state.categoryVisibility[feature.properties.category] === 'undefined') {
                App.state.categoryVisibility[feature.properties.category] = true;
            }
            if (typeof feature.properties.showLabel === 'undefined') feature.properties.showLabel = true;
        });

        // Pre-calculate data for all features.
        this.recalculateAllFeatures();

        if (assignedDefaultCount > 0) {
            App.UI.showMessage('Import Note', `${assignedDefaultCount} feature(s) had missing or invalid categories and were assigned to the "${defaultCategoryName}" category.`);
        }
    },
    addOrUpdateRasterLayer(type) {
        const data = App.state.data[type];
        if (!data.georaster) return;
        if (data.layer) { App.state.layersControl.removeLayer(data.layer); App.state.map.removeLayer(data.layer); }
        const layerOptions = { georaster: data.georaster, opacity: 1.0, resolution: 256 };
        if (type === 'dsm') {
            const { mins, maxs, noDataValue } = data.georaster;
            if (isFinite(mins?.[0]) && isFinite(maxs?.[0])) {
                const colorScale = chroma.scale(['#3b82f6', '#6ee7b7', '#fde047', '#f97316', '#ef4444']).domain([mins[0], maxs[0]]);
                layerOptions.pixelValuesToColorFn = values => (values[0] === noDataValue) ? null : colorScale(values[0]).hex();
                this.createDSMLegend(mins[0], maxs[0]);
            } else App.UI.showMessage('DSM Info', 'Could not determine elevation range for DSM styling.');
        }
        data.layer = new GeoRasterLayer(layerOptions).addTo(App.state.map);
        App.state.layersControl.addOverlay(data.layer, type === 'ortho' ? 'Orthophoto' : 'Digital Surface Model');
        App.state.map.fitBounds(data.layer.getBounds());
    },
    createDSMLegend(min, max) {
        if (App.state.dsmLegendControl) App.state.map.removeControl(App.state.dsmLegendControl);
        App.state.dsmLegendControl = L.control({ position: 'bottomright' });
        App.state.dsmLegendControl.onAdd = () => {
            const div = L.DomUtil.create('div', 'dsm-legend');
            const colorScale = chroma.scale(['#3b82f6', '#6ee7b7', '#fde047', '#f97316', '#ef4444']).domain([min, max]);
            const gradientStyle = `linear-gradient(to top, ${colorScale.colors(10).join(',')})`;
            div.innerHTML = `<div class="dsm-legend-title">DSM Elevation (m)</div><div class="flex"><div class="dsm-legend-gradient" style="background: ${gradientStyle};"></div><div class="dsm-legend-labels ml-1">${[...Array(6)].map((_, i) => { const value = min + (i / 5) * (max - min); return `<span style="top: ${100 - (i/5)*100}%;">${value.toFixed(1)}</span>`; }).join('')}</div></div>`;
            return div;
        };
        if (App.state.data.dsm.layer && App.state.map.hasLayer(App.state.data.dsm.layer)) {
             App.state.dsmLegendControl.addTo(App.state.map);
        }
    },
    /**
     * This function resets the application to a clean state, ready for a new project import.
     * It surgically removes only the application-specific overlay layers and data,
     * preserving the base map and main controls for a smoother user experience.
    */
    resetAppState() {
        // 1. Remove overlay layers from map and control
        if (App.state.layersControl) {
            if (App.state.data.ortho.layer) App.state.layersControl.removeLayer(App.state.data.ortho.layer);
            if (App.state.data.dsm.layer) App.state.layersControl.removeLayer(App.state.data.dsm.layer);
        }
        if (App.state.data.ortho.layer) App.state.map.removeLayer(App.state.data.ortho.layer);
        if (App.state.data.dsm.layer) App.state.map.removeLayer(App.state.data.dsm.layer);

        // 2. Clear dynamic layer groups
        if (App.state.geojsonLayer) App.state.geojsonLayer.clearLayers();
        App.state.decoratorLayers.forEach(d => d.remove());
        
        // 3. Reset project boundary and associated map constraints
        App.Map.clearBoundary();

        // 4. Remove DSM legend if it exists
        if (App.state.dsmLegendControl) {
            App.state.map.removeControl(App.state.dsmLegendControl);
            App.state.dsmLegendControl = null;
        }

        // 5. Reset state data object to its default using a deep copy
        const defaultStateData = {
            ortho: { georaster: null, fileBuffer: null, layer: null },
            dsm: { georaster: null, fileBuffer: null, layer: null },
            geojson: { data: { type: 'FeatureCollection', features: [] }, fileContent: null },
            logo: null,
            categories: {},
            contributors: [{ name: 'Default User', role: 'Project Lead', bio: '<p>Initial user for this project.</p>', image: null }],
            reportInfo: { clientName: '', clientContact: '', clientAddress: '', projectId: '', reportDate: '', reportStatus: 'Draft' }
        };
        App.state.data = JSON.parse(JSON.stringify(defaultStateData));

        // 6. Clear helper maps and flags
        App.state.featureIdToLayerMap.clear();
        App.state.decoratorLayers = [];
        App.state.showOnlyWithObservations = false;
        App.state.categoryVisibility = {};

        // 7. Reset UI elements to their default state
        document.getElementById('show-only-with-observations-toggle').checked = false;
        document.getElementById('main-title').childNodes[0].nodeValue = 'Site Analysis Report ';
        document.getElementById('main-description').innerHTML = 'An interactive overview of the site features and raster data.';
        document.getElementById('logo-img').src = 'https://placehold.co/80x80/e2e8f0/334155?text=Logo';
        document.getElementById('snapshot-container').innerHTML = '<p>Select a feature from the legend or map to view its details and a visual snapshot.</p>';

        // 8. Clear file input values
        ['ortho-input', 'dsm-input', 'import-project-input', 'import-categories-input'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        // 9. Re-render UI components that depend on the cleared state
        App.Legend.render();
        App.CategoryManager.render();
        App.ContributorManager.render();
        App.UI.updateReportStatusDisplay();
    }
};