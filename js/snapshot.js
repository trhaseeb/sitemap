// Snapshot rendering
window.App = window.App || {};

App.Snapshot = {
    // Keep track of the feature layer currently on the snapshot map
    _currentFeatureLayer: null,
    _currentDecoratorLayer: null,

    /**
     * Initializes the snapshot map instance once when the application loads.
     */
    init() {
        const container = document.getElementById('snapshot-container');
        // Set up the initial message
        container.innerHTML = `<div class="text-center text-gray-500 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No Feature Selected</h3>
            <p class="mt-1 text-sm text-gray-500">Click a feature on the map or in the legend to see its details.</p>
        </div>`;

        // Create a hidden map container that will be shown when a feature is selected
        const mapDiv = document.createElement('div');
        mapDiv.id = 'snapshot-map';
        mapDiv.style.height = '300px';
        mapDiv.className = 'rounded-lg border border-gray-300 mt-4 bg-gray-50 hidden'; // Initially hidden

        // Prepend the map div to the container so it's ready
        container.prepend(mapDiv);

        // Initialize the map but don't add layers until render is called
        const snapshotMap = L.map('snapshot-map', {
            zoomControl: false,
            attributionControl: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            dragging: false,
            renderer: L.svg()
        });
        App.state.snapshotMap = snapshotMap;

        // Add base layers
        L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { maxZoom: 22, subdomains:['mt0','mt1','mt2','mt3'], crossOrigin: 'anonymous' }).addTo(snapshotMap);
        if (App.state.data.ortho.layer) {
            new GeoRasterLayer({ georaster: App.state.data.ortho.georaster, opacity: 1, resolution: 128 }).addTo(snapshotMap);
        }
    },

    /**
     * Renders the details of a feature and updates the persistent snapshot map.
     * @param {object} feature - The GeoJSON feature to display.
     */
    render(feature) {
        const container = document.getElementById('snapshot-container');
        const mapDiv = document.getElementById('snapshot-map');

        // Clear previous feature layer from the map
        if (this._currentFeatureLayer) {
            this._currentFeatureLayer.remove();
            this._currentFeatureLayer = null;
        }
        if (this._currentDecoratorLayer) {
            this._currentDecoratorLayer.remove();
            this._currentDecoratorLayer = null;
        }

        if (!feature || !feature.properties) {
            // Hide the map and show the placeholder text
            mapDiv.classList.add('hidden');
            container.querySelector('.text-center')?.classList.remove('hidden');
            // Clear the rest of the container
            container.querySelectorAll(':not(#snapshot-map):not(.text-center)').forEach(el => el.remove());
            return;
        }

        // A feature is selected, so prepare the UI
        container.querySelector('.text-center')?.classList.add('hidden');
        container.querySelectorAll(':not(#snapshot-map):not(.text-center)').forEach(el => el.remove());
        mapDiv.classList.remove('hidden');

        const wrapper = document.createElement('div');
        const detailsDiv = document.createElement('div');
        const hasObservations = feature.properties.observations && feature.properties.observations.length > 0;
        const obsCount = hasObservations ? feature.properties.observations.length : 0;
        let observationBadge = hasObservations ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mr-2">${obsCount} Observation${obsCount > 1 ? 's' : ''}</span>` : '';
        detailsDiv.innerHTML = `<h3 class="text-lg font-bold text-gray-900">${observationBadge}${feature.properties.Name || 'Unnamed Feature'}</h3><div class="text-gray-600 prose max-w-none mt-2">${feature.properties.Description || '<p>No description.</p>'}</div>`;
        wrapper.appendChild(detailsDiv);

        if (hasObservations) {
            const obsContainer = document.createElement('div');
            obsContainer.className = 'mt-4 border-t pt-4 space-y-2';
            obsContainer.innerHTML = `<h4 class="text-md font-bold text-gray-800 mb-2">Observations</h4>`;
            
            feature.properties.observations.forEach(obs => {
                const obsDiv = document.createElement('div');
                obsDiv.className = 'border rounded-lg bg-gray-50';
                const contributor = App.state.data.contributors.find(c => c.name === obs.contributor);
                
                const header = document.createElement('div');
                header.className = 'observation-header p-3 flex justify-between items-center';
                header.innerHTML = `<p class="font-bold">${obs.observationType || 'General Observation'}</p><span class="text-xs text-gray-400">Click to expand</span>`;

                const details = document.createElement('div');
                details.className = 'observation-details p-3 border-t border-gray-200';
                details.style.display = 'none'; // Initially collapsed
                let obsHTML = `<p><strong class="font-medium">Severity:</strong> ${obs.severity || 'N/A'}</p>${contributor ? `<p><strong class="font-medium">By:</strong> ${contributor.name}</p>` : ''}<div class="prose max-w-none text-sm mt-2"><strong class="font-medium">Recommendation:</strong> ${obs.recommendation || 'N/A'}</div>`;
                details.innerHTML = obsHTML;

                if (obs.images && obs.images.length > 0) {
                    const imagesDiv = document.createElement('div');
                    imagesDiv.className = 'mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2';
                    obs.images.forEach(img => {
                        const imgContainer = document.createElement('div');
                        imgContainer.innerHTML = `<div class="snapshot-image-container"><img src="${img.src}" onerror="this.src='https://placehold.co/120x120/f87171/ffffff?text=Error'" class="rounded-md w-full h-auto shadow"></div><p class="text-xs text-gray-500 italic text-center mt-1">${img.caption || ''}</p>`;
                        imagesDiv.appendChild(imgContainer);
                    });
                    details.appendChild(imagesDiv);
                }
                
                obsDiv.append(header, details);
                obsContainer.appendChild(obsDiv);
                header.onclick = () => { details.style.display = details.style.display === 'block' ? 'none' : 'block'; };
            });
            wrapper.appendChild(obsContainer);
        }

        const geoData = feature.properties._cachedGeoData;
        if (geoData) {
            const geoDataDiv = document.createElement('div');
            geoDataDiv.innerHTML = `<hr class="my-4"><h4 class="text-md font-bold text-gray-800 mb-2">Geospatial Data</h4><div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">${geoData.map(item => `<div><strong class="font-medium text-gray-600">${item.label}:</strong></div><div class="text-right">${item.value}</div>`).join('')}</div>`;
            wrapper.appendChild(geoDataDiv);
        }

        // This wrapper holds all the text content. Append it before the map div.
        container.insertBefore(wrapper, mapDiv);

        // Now handle the map layer
        if (!feature.geometry) {
            mapDiv.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">No geometry</div>';
            return;
        }

        try {
            // Ensure the map container is clean if it was previously text-filled
            if (mapDiv.firstChild && mapDiv.firstChild.nodeType !== Node.ELEMENT_NODE) mapDiv.innerHTML = '';

            const featureLayer = L.geoJSON(feature, {
                style: App.CategoryManager.getCategoryStyleForFeature(feature),
                pointToLayer: (f, latlng) => App.CategoryManager.createPointMarker(f, latlng)
            });

            // Add the new layer and store it
            featureLayer.addTo(App.state.snapshotMap);
            this._currentFeatureLayer = featureLayer;

            // Add decorators if necessary
            featureLayer.eachLayer(layer => {
                if (layer instanceof L.Polyline && feature.geometry.type.includes('LineString')) {
                    const style = App.CategoryManager.getCategoryStyleForFeature(feature);
                    if (style.linePattern === 'arrows') {
                        this._currentDecoratorLayer = L.polylineDecorator(layer, {
                            patterns: [{
                                offset: '15%', repeat: style.lineSpacing * 2,
                                symbol: L.Symbol.arrowHead({ pixelSize: 12, polygon: false, pathOptions: { stroke: true, color: style.color, weight: style.weight, opacity: style.opacity }})
                            }]
                        }).addTo(App.state.snapshotMap);
                    }
                }
            });

            // Copy SVG defs from main map to ensure patterns render correctly
            const svg = App.state.snapshotMap.getRenderer(App.state.snapshotMap)._container;
            if(svg) {
                const existingDefs = svg.querySelector('defs');
                if (existingDefs) existingDefs.remove();
                svg.appendChild(App.state.svgPatternDefs.cloneNode(true));
            }

            // Update map view
            App.state.snapshotMap.fitBounds(featureLayer.getBounds(), { padding: [20, 20], maxZoom: 19 });
            // Invalidate size is crucial after the container might have changed visibility
            setTimeout(() => App.state.snapshotMap.invalidateSize(), 100);

        } catch (e) {
            console.error("Snapshot map error:", e);
            mapDiv.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Error rendering map</div>';
        }
    }
};