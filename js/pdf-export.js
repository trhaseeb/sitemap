// PDF Export Functionality
window.App = window.App || {};

App.PDFExport = {
    // Configuration constants
    cfg: {
        a4: { w: 210, h: 297 },
        ledgerLandscape: { w: 431.8, h: 279.4 },
        captureScale: 3, 
        mapScale: 3,
        paddingMM: 15,
        // MODIFICATION: New configuration property for map zoom level
        mapFitPadding: 0.05, // Lower value means more zoomed in. 0.1 is default leaflet behavior.
    },

    // Utility helpers
    mmToPx(mm, dpi = 96) { return Math.round(mm * dpi / 25.4); },
    updateProgress(msg) {
        try {
            App.UI.elements.loaderText.innerText = msg;
            console.log("PDF Export Progress:", msg);
        } catch(e){
            console.warn("Could not update progress:", e);
        }
    },
    safeText(text) {
        if (text === null || typeof text === 'undefined') return '';
        if (text instanceof Event || (typeof text === 'string' && text.includes('[object Event]'))) {
            console.warn("Event object detected in text - replacing with safe value");
            return '[Event]';
        }
        let safeString = '';
        try {
            safeString = String(text);
        } catch (e) {
            console.warn("Error converting value to safe string:", e);
            return '';
        }
        return App.Utils.stripHtml(safeString);
    },
    getSvgDefs() { return App.state.svgPatternDefs ? App.state.svgPatternDefs.innerHTML : ''; },

    async ensureLibraries() {
        if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('jsPDF not loaded');
        if (typeof domtoimage === 'undefined') throw new Error('dom-to-image not loaded');
    },

    // DOM page builder & capture
    buildPage(html, wMM, hMM, opts = {}) {
        const dpi = 96;
        const w = this.mmToPx(wMM, dpi);
        const h = this.mmToPx(hMM, dpi);
        const el = document.createElement('div');
        el.className = 'pdf-page';
        const padding = opts.paddingPx === 0 ? 0 : (opts.paddingPx || this.mmToPx(this.cfg.paddingMM));

        el.style.cssText = `
            width:${w}px;
            height:${h}px;
            box-sizing:border-box;
            font-family:Inter,Arial,sans-serif;
            background:${opts.bg||'#fff'};
            color:#111;
            position:relative;
            display: flex;
            flex-direction: column;
            border:1px solid transparent;
        `;

        const svgDefs = opts.svgDefs ? `<svg width="0" height="0" style="position:absolute;left:-1000px;"><defs>${opts.svgDefs}</defs></svg>` : '';

        el.innerHTML = `
        <style>
            *{box-sizing:border-box}
            body,html{margin:0;padding:0;font-family:Inter,sans-serif;font-size:10px;color:#333}
            h1,h2,h3,h4{margin:0 0 10px 0;font-weight:700;line-height:1.2;color:#1a202c}
            h1{font-size:28px;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin-bottom:16px}
            h2{font-size:16px;margin-top:0;color:#2d3748;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
            h3{font-size:14px; margin:0 0 8px 0}
            p{margin:0 0 12px 0;line-height:1.6}
            table{border-collapse:collapse;width:100%;font-size:9px;margin-bottom:12px}
            th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;vertical-align:top}
            th{background:#f8fafc;font-weight:600;color:#4a5568}
            .small{font-size:9px;color:#718096}

            /* MODIFICATION: Removed fixed height, relying on flexbox */
            .content-wrapper {
                flex-grow: 1;
                padding: ${padding}px;
                overflow: hidden;
            }
            .footer-placeholder {
                flex-shrink: 0;
                height: 20px;
            }
            
            .category-block{break-inside:avoid;margin-bottom:12px}
            .legend-features{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;font-size:10px}
            .legend-item{display:flex;align-items:center;gap:6px;padding:4px;border-radius:3px;background:#fff}
            .legend-swatch{width:20px;height:20px;border:1px solid #ccc;border-radius:3px;flex:0 0 auto}
            .map-title{position:absolute;top:12px;left:50%;transform:translateX(-50%);font-size:18px;background:rgba(255,255,255,0.9);padding:8px 16px;border:1px solid #718096;border-radius:4px;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.1);z-index:1000}

            .feature-map{width:100%;height:150px;border:1px solid #000;margin-top:8px;border-radius:4px;overflow:hidden;position:relative}
            .feature-info-section{border:1px solid #e2e8f0;border-radius:4px;padding:8px;background:#f8fafc;margin-bottom:8px}
            .observation-list{margin:8px 0;padding-left:12px;border-left:3px solid #cbd5e0}
            .observation-item{margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #edf2f7}
            .observation-item:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
            .observation-images{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:8px;margin-top:8px}
            .observation-images img{width:100%;height:auto;border-radius:3px;border:1px solid #cbd5e0}
            .severity-tag{display:inline-block;padding:2px 8px;border-radius:99px;font-size:9px;font-weight:600;margin-left:8px;vertical-align:middle}
            .severity-low{background-color:#dbeafe;color:#1e40af}
            .severity-medium{background-color:#fef9c3;color:#854d0e}
            .severity-high{background-color:#fee2e2;color:#991b1b}
            .severity-critical{background-color:#fca5a5;color:#7f1d1d}

            /* MODIFICATION: New layout for feature details page */
            .feature-blocks-container {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            .feature-block {
                page-break-inside: avoid;
                border-bottom: 1px dashed #e2e8f0;
                padding-bottom: 10px;
            }
            .feature-block:last-child {
                border-bottom: none;
                padding-bottom: 0;
            }
            .feature-block-top {
                display: flex;
                gap: 15px;
                align-items: flex-start;
            }
            .feature-block-top > div {
                flex: 1 1 50%;
            }
            .feature-block-top .feature-map {
                height: 250px;
            }
            .feature-block-observations {
                margin-top: 15px;
            }
            .feature-block-images {
                margin-top: 15px;
            }
            .feature-block-images .observation-images {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
            }
            /* FIX: Added new CSS to ensure tables fill their containers */
            .feature-info-section table {
                width: 100%;
            }

        </style>
        ${svgDefs}
        <div class="content-wrapper">${html}</div>
        <div class="footer-placeholder"></div>
        `;
        document.body.appendChild(el);
        return el;
    },

    async captureElement(el, wMM, hMM, scale) {
        const widthPx = this.mmToPx(wMM, 96 * scale);
        const heightPx = this.mmToPx(hMM, 96 * scale);

        try {
            this.updateProgress("Preparing page elements for capture...");
            const images = el.querySelectorAll('img');
            const imagePromises = Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = (err) => {
                        console.error(`PDF Export: Image failed to load. SRC: ${img.src}`, err);
                        // Still resolve so that one broken image doesn't stop the whole PDF export
                        resolve();
                    };
                    setTimeout(resolve, 1500); // Timeout
                });
            });

            await new Promise(r => setTimeout(r, 500)); // Wait for maps to render
            await Promise.all(imagePromises);
            
            const options = {
                width: widthPx, height: heightPx,
                style: {
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    width: `${widthPx/scale}px`,
                    height: `${heightPx/scale}px`
                },
                cacheBust: true, quality: 1, bgcolor: '#ffffff',
            };

            const dataUrl = await domtoimage.toPng(el, options);
            if (document.body.contains(el)) document.body.removeChild(el);
            return dataUrl;
        } catch(error) {
            console.error("Capture error:", error);
            this.updateProgress(`Capture error: ${error.message}`);
            if (document.body.contains(el)) document.body.removeChild(el);
            throw error;
        }
    },

    buildLegendContent() {
        const categories = App.state.data.categories || {};
        const feats = App.state.data.geojson?.data?.features || [];
        const catNames = Object.keys(categories);
        const blocks = catNames.map(cat => {
            const catFeatures = feats.filter(f => f.properties.category === cat);
            if (catFeatures.length === 0) return '';

            const inner = catFeatures.map(f => {
                let swatchHtml = '<div class="legend-swatch" style="background:#ccc"></div>';
                try {
                    const sw = App.Legend.createSwatch(f);
                    const wrap = document.createElement('div'); wrap.appendChild(sw); swatchHtml = wrap.innerHTML;
                } catch(_){}

                const highestSeverity = f.properties._cachedSeverity;
                const hasObservations = !!highestSeverity;
                const obsIndicator = hasObservations ?
                    `<span class="severity-tag severity-${(highestSeverity || 'low').toLowerCase()}">!</span>` : '';

                return `<div class="legend-item">${swatchHtml}<span>${(f.properties.Name||'Unnamed').slice(0,35)}</span>${obsIndicator}</div>`;
            }).join('');
            
            return `<div class="category-block">
                <h3>${cat}</h3>
                <div class="legend-features">${inner}</div>
            </div>`;
        }).filter(Boolean);

        return `
            <h1>Legend</h1>
            <p>The following categories and features are included in this site analysis report:</p>
            <div>${blocks.join('')}</div>
        `;
    },

    async buildAndCaptureMapPage(doc, title, mode) {
        const { w, h } = this.cfg.ledgerLandscape;
        const pageEl = this.buildPage(`<div id="map-wrapper" style="position:relative;width:100%;height:100%;padding:0;margin:0; border: 1px solid #000;">
            <div class="map-title">${title}</div>
            <div id="pdf-map" style="position:absolute;inset:0"></div>
        </div>`, w, h, { paddingPx: 0, svgDefs: this.getSvgDefs() });

        const mapDiv = pageEl.querySelector('#pdf-map');
        const map = L.map(mapDiv, {
            zoomControl: false, attributionControl: false, zoomAnimation: false,
            fadeAnimation: false, markerZoomAnimation: false, inertia: false,
            renderer: L.svg(),
            rotate: true,
            bearing: App.state.map.getBearing()
        });

        if (mode === 'default') {
            mapDiv.style.backgroundColor = 'white';
        } else if (mode === 'ortho' && App.state.data.ortho?.georaster) {
            new GeoRasterLayer({ georaster: App.state.data.ortho.georaster, opacity: 1, resolution: 256 }).addTo(map);
        } else if (mode === 'dsm' && App.state.data.dsm?.georaster) {
            const { georaster } = App.state.data.dsm;
            const { mins, maxs, noDataValue } = georaster;
            const colorScale = chroma.scale(['#3b82f6', '#6ee7b7', '#fde047', '#f97316', '#ef4444']).domain([mins[0], maxs[0]]);
            new GeoRasterLayer({ georaster, opacity: 0.9, resolution: 256, pixelValuesToColorFn: values => (values[0] === noDataValue) ? null : colorScale(values[0]).hex() }).addTo(map);
        } else {
            L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { maxZoom: 22, subdomains:['mt0','mt1','mt2','mt3'], crossOrigin: 'anonymous' }).addTo(map);
        }

        const allGeo = App.state.data.geojson?.data;
        if (allGeo && allGeo.features.length > 0) {
            const vecLayer = L.geoJSON(allGeo, {
                style: f => App.CategoryManager.getCategoryStyleForFeature(f),
                pointToLayer: (f, latlng) => App.CategoryManager.createPointMarker(f, latlng),
                onEachFeature: (f, l) => {
                    const hasObservations = f.properties.observations && f.properties.observations.length > 0;
                    const showLabel = f.properties.showLabel || (hasObservations && f.properties.Name);
                    if (f.properties.Name && showLabel) {
                        let labelContent = '';
                        let tooltipClass = 'leaflet-tooltip-label';
                        if (f.properties.showLabel) {
                            labelContent += `<span>${f.properties.Name}</span>`;
                        }
                        if (hasObservations) {
                            const highestSeverity = f.properties._cachedSeverity;
                            const color = App.Utils.getColorForSeverity(highestSeverity);
                            const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="${color}" style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5));"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2V7h2v7z"/></svg>`;
                            labelContent += iconSvg;
                            if (!f.properties.showLabel) {
                                tooltipClass += ' leaflet-tooltip-icon-only';
                            }
                        }
                        l.bindTooltip(labelContent, { permanent: true, direction: 'top', offset: [0, -10], className: tooltipClass });
                    }
                    const style = App.CategoryManager.getCategoryStyleForFeature(f);
                    if (f.geometry.type.includes('LineString') && style.linePattern === 'arrows') {
                        L.polylineDecorator(l, {
                            patterns: [{ offset: '15%', repeat: style.lineSpacing * 2, symbol: L.Symbol.arrowHead({ pixelSize: 12, polygon: false, pathOptions: { stroke: true, color: style.color, weight: style.weight, opacity: style.opacity }}) }]
                        }).addTo(map);
                    }
                }
            }).addTo(map);
            
            const bounds = App.state.projectBoundary.geojson ? L.geoJSON(App.state.projectBoundary.geojson).getBounds() : vecLayer.getBounds();
            if (bounds.isValid()) {
                try {
                    // MODIFICATION: Use the new configurable map padding for more zoom
                    map.fitBounds(bounds.pad(this.cfg.mapFitPadding));
                } catch (e) {
                   console.warn("Could not fit bounds for PDF map", e);
                   if (App.state.map) map.setView(App.state.map.getCenter(), App.state.map.getZoom());
                }
            }
        } else if (App.state.map) {
            map.setView(App.state.map.getCenter(), App.state.map.getZoom());
        }

        await new Promise(r => setTimeout(r, 2500)); // Wait for tiles
        const img = await this.captureElement(pageEl, w, h, this.cfg.mapScale);
        doc.addPage([w, h], 'landscape');
        doc.addImage(img, 'PNG', 0, 0, w, h, undefined, 'FAST');
    },

    // MODIFICATION: Rewriting this function to combine all images into a single grid at the bottom.
    buildFeatureDetailBlockHTML(feature) {
        try {
            if (!feature || !feature.properties) {
                return `<div class="feature-block"><h3>Invalid Feature Data</h3><p>Missing feature properties</p></div>`;
            }
            
            let rows = '<tr><td colspan="2" class="small">No geometry stats</td></tr>';
            try {
                const geoData = feature.properties._cachedGeoData || [];
                if (geoData.length > 0) {
                    rows = geoData.map(g => `<tr><th>${this.safeText(g.label)}</th><td>${this.safeText(g.value)}</td></tr>`).join('');
                }
            } catch (geoError) { console.error("Error calculating geometry data:", geoError); }

            const obs = Array.isArray(feature.properties.observations) ? feature.properties.observations : [];
            let observationsHtml = '';
            // MODIFICATION: Flatten all images from all observations into a single array
            let allImages = [];

            if (obs.length > 0) {
                try {
                    const obsItems = obs.map(o => {
                        // Collect images to be rendered separately
                        if (Array.isArray(o.images) && o.images.length > 0) {
                            allImages.push(...o.images);
                        }
                        const safeType = this.safeText(o.observationType || 'Observation');
                        const safeSeverity = this.safeText(String(o.severity || 'low').toLowerCase());
                        const safeSeverityLabel = this.safeText(o.severity || 'Low');
                        const safeRecommendation = this.safeText(o.recommendation || 'N/A');

                        return `<div class="observation-item">
                            <div><strong>${safeType}</strong><span class="severity-tag severity-${safeSeverity}">${safeSeverityLabel}</span></div>
                            <div class="small" style="margin:4px 0;"><strong>Recommendation:</strong> ${safeRecommendation}</div>
                        </div>`;
                    }).join('');
                    observationsHtml = `<div class="observation-list">${obsItems}</div>`;
                } catch (obsErr) { console.error("Error processing observations:", obsErr); }
            }

            // MODIFICATION: Generate a single image grid after the observations section
            let imagesHtml = '';
            if (allImages.length > 0) {
                imagesHtml = `<div class="feature-block-images">
                    <h4>Annotated Images</h4>
                    <div class="observation-images">
                        ${allImages.map(img => `<div><img src="${this.safeText(img.src)}" alt="${this.safeText(img.caption)}"><p class="small">${this.safeText(img.caption)}</p></div>`).join('')}
                    </div>
                </div>`;
            }

            const featureId = feature.properties._internalId || (typeof feature.id !== 'undefined' ? feature.id : Math.random().toString(36).substring(2, 9));
            const snapshotId = `feature-snapshot-${String(featureId).replace(/[^a-zA-Z0-9-_]/g, '')}`;
            const safeName = this.safeText(feature.properties.Name || 'Unnamed Feature');
            const safeCategory = this.safeText(feature.properties.category || 'Uncategorized');
            const safeDescription = this.safeText(feature.properties.Description || 'N/A');

            const hasObservations = obs.length > 0;
            const observationTitle = hasObservations ? 'Observations' : 'No Observations';
            
            return `
                <div class="feature-block">
                    <div class="feature-block-top">
                        <div>
                            <h3>${safeName}</h3>
                            <h4>Feature Details & Geodata</h4>
                            <div class="feature-info-section">
                                <table>
                                    <tr><th>Category</th><td>${safeCategory}</td></tr>
                                    <tr><th>Description</th><td>${safeDescription}</td></tr>
                                    ${rows}
                                </table>
                            </div>
                        </div>
                        <div>
                            <h4>Feature Snapshot</h4>
                            <div class="feature-map" id="${snapshotId}"></div>
                        </div>
                    </div>
                    <div class="feature-block-observations">
                        <h4>${observationTitle}</h4>
                        ${observationsHtml || '<div class="small" style="font-style:italic">No observations were recorded for this feature.</div>'}
                    </div>
                    ${imagesHtml}
                </div>
            `;
        } catch (error) {
            console.error("Error building feature detail block:", error);
            return `<div class="feature-block"><h3>Error Rendering Feature</h3><p>${this.safeText(feature?.properties?.Name || 'Unknown feature')}</p></div>`;
        }
    },

    renderMiniMap(container, feature) {
        return new Promise((resolve) => {
            try {
                if (!container || !feature || !feature.geometry) {
                    this.fallbackMapDisplay(container, "Missing required elements");
                    return resolve();
                }
                if (!feature.geometry.type || !Array.isArray(feature.geometry.coordinates)) {
                    console.error("Malformed geometry for feature:", feature.properties.Name, feature.geometry);
                    this.fallbackMapDisplay(container, "Malformed geometry");
                    return resolve();
                }
                if (feature.geometry.type === 'Point') {
                    const coords = feature.geometry.coordinates;
                    if (!Array.isArray(coords) || coords.length < 2 || !isFinite(coords[0]) || !isFinite(coords[1])) {
                         console.error("Invalid coordinates for point feature:", feature.properties.Name, coords);
                         this.fallbackMapDisplay(container, "Invalid feature coordinates");
                         return resolve();
                    }
                } else if (feature.geometry.coordinates.length === 0) {
                    console.error("Empty coordinates for feature:", feature.properties.Name);
                    this.fallbackMapDisplay(container, "Empty feature coordinates");
                    return resolve();
                }

                const map = L.map(container, {
                    zoomControl: false, attributionControl: false, dragging: false,
                    scrollWheelZoom: false, renderer: L.svg(), keyboard: false,
                    touchZoom: false, doubleClickZoom: false
                });

                map.createPane('basemap');
                map.getPane('basemap').style.zIndex = 200;
                map.createPane('vectors');
                map.getPane('vectors').style.zIndex = 450;

                const svg = map.getRenderer(map)._container;
                if (svg && App.state.svgPatternDefs) {
                    svg.appendChild(App.state.svgPatternDefs.cloneNode(true));
                }

                let isBaseLayerLoaded = false;
                const onBaseLoad = () => {
                    if (isBaseLayerLoaded) return;
                    isBaseLayerLoaded = true;
                    setTimeout(() => {
                        try {
                            map.invalidateSize();
                        } catch(e) {
                            console.warn("Error during invalidateSize on mini-map", e);
                        }
                        resolve();
                    }, 300);
                };
                setTimeout(() => { if (!isBaseLayerLoaded) { onBaseLoad(); } }, 4000);

                if (App.state.data.ortho?.georaster) {
                    new GeoRasterLayer({ georaster: App.state.data.ortho.georaster, opacity: 1, resolution: 256, pane: 'basemap' }).on('load', onBaseLoad).addTo(map);
                } else {
                    L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { maxZoom: 22, subdomains:['mt0','mt1','mt2','mt3'], crossOrigin: 'anonymous', pane: 'basemap' }).on('load', onBaseLoad).addTo(map);
                }

                const vectorLayer = L.geoJSON(feature, {
                    pane: 'vectors',
                    style: f => App.CategoryManager.getCategoryStyleForFeature(f),
                    pointToLayer: (f, latlng) => App.CategoryManager.createPointMarker(f, latlng),
                    onEachFeature: (f, l) => {
                        l.off(); // Remove interactivity
                        const style = App.CategoryManager.getCategoryStyleForFeature(f);
                        if (f.geometry.type.includes('LineString') && style.linePattern === 'arrows') {
                            L.polylineDecorator(l, {
                                patterns: [{ offset: '15%', repeat: style.lineSpacing * 2, symbol: L.Symbol.arrowHead({ pixelSize: 12, polygon: false, pathOptions: { stroke: true, color: style.color, weight: style.weight, opacity: style.opacity }}) }]
                            }).addTo(map);
                        }
                    }
                }).addTo(map);

                if (feature.geometry.type === 'Point') {
                    const coords = feature.geometry.coordinates;
                    map.setView([coords[1], coords[0]], 18);
                } else {
                    const bounds = vectorLayer.getBounds();
                    if (bounds.isValid()) {
                        // MODIFICATION: Use the new configurable map padding for more zoom
                        map.fitBounds(bounds.pad(this.cfg.mapFitPadding));
                    } else {
                        console.warn("Could not determine valid bounds for non-point feature:", feature.properties.Name);
                        map.setView([0, 0], 2);
                    }
                }

            } catch (e) {
                console.error("Error rendering mini map:", e, feature?.properties?.Name);
                this.fallbackMapDisplay(container, "Map rendering error");
                resolve();
            }
        });
    },

    fallbackMapDisplay(container, message = "Map unavailable") {
        if (!container) return;
        container.innerHTML = `<div style="background:#f0f0f0;border:1px solid #ccc;color:#666;display:flex;align-items:center;justify-content:center;height:100%;font-size:12px;">${message}</div>`;
    },

    async generatePDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });

        App.UI.showLoader('Preparing PDF...');
        try {
            this.updateProgress('Loading libraries...');
            await this.ensureLibraries();

            const features = App.state.data.geojson?.data?.features || [];
            if (!features.length) throw new Error('No features to export');

            this.updateProgress('Building title page...');
            const title = this.safeText(document.getElementById('main-title')?.childNodes[0]?.nodeValue || 'Site Analysis Report');
            const desc = this.safeText(document.getElementById('main-description')?.innerHTML || '');
            const logoSrc = document.getElementById('logo-img')?.src;
            const logoImg = (logoSrc && !logoSrc.includes('placehold.co')) ? `<img src="${logoSrc}" style="max-width:100px;max-height:100px;margin-bottom:16px" />` : '';
            const titlePage = this.buildPage(`<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;">${logoImg}<h1 style="font-size:32px;">${title}</h1><p style="font-size:14px">${desc}</p></div>`, this.cfg.a4.w, this.cfg.a4.h);
            const titleImg = await this.captureElement(titlePage, this.cfg.a4.w, this.cfg.a4.h, this.cfg.captureScale);
            doc.addImage(titleImg, 'PNG', 0, 0, this.cfg.a4.w, this.cfg.a4.h);

            this.updateProgress('Adding project team...');
            const reportInfo = App.state.data.reportInfo;
            const infoRows = `
                <tr><th>Client Name</th><td>${this.safeText(reportInfo.clientName)}</td></tr>
                <tr><th>Client Contact</th><td>${this.safeText(reportInfo.clientContact)}</td></tr>
                <tr><th>Client Address</th><td>${this.safeText(reportInfo.clientAddress)}</td></tr>
                <tr><th>Project ID</th><td>${this.safeText(reportInfo.projectId)}</td></tr>
                <tr><th>Report Date</th><td>${this.safeText(reportInfo.reportDate)}</td></tr>
                <tr><th>Report Status</th><td>${this.safeText(reportInfo.reportStatus)}</td></tr>
            `;
            const contribs = App.state.data.contributors || [];
            const contribRows = contribs.map(c => `<tr><td><div style="width:50px;height:50px;border-radius:50%;overflow:hidden;"><img src="${c.image || 'https://placehold.co/50x50/e2e8f0/334155?text=NA'}" style="width:100%;height:100%;object-fit:cover;"/></div></td><td><strong>${this.safeText(c.name)}</strong><br><span class="small">${this.safeText(c.role)}</span></td><td>${c.bio || ''}</td></tr>`).join('');
            const teamPageHTML = `
                <h1>Project Information</h1>
                <h2>Project Details</h2>
                <table><tbody>${infoRows}</tbody></table>
                <h2 style="margin-top: 20px;">Contributors</h2>
                <table><thead><tr><th style="width:60px">Image</th><th>Contributor</th><th>Bio</th></tr></thead><tbody>${contribRows}</tbody></table>
            `;
            const teamPage = this.buildPage(teamPageHTML, this.cfg.a4.w, this.cfg.a4.h);
            const teamImg = await this.captureElement(teamPage, this.cfg.a4.w, this.cfg.a4.h, this.cfg.captureScale);
            doc.addPage(); doc.addImage(teamImg, 'PNG', 0, 0, this.cfg.a4.w, this.cfg.a4.h);

            this.updateProgress('Building legend...');
            const legendPage = this.buildPage(this.buildLegendContent(), this.cfg.a4.w, this.cfg.a4.h, { svgDefs: this.getSvgDefs() });
            const legendImg = await this.captureElement(legendPage, this.cfg.a4.w, this.cfg.a4.h, this.cfg.captureScale);
            doc.addPage(); doc.addImage(legendImg, 'PNG', 0, 0, this.cfg.a4.w, this.cfg.a4.h);

            this.updateProgress('Capturing maps...');
            await this.buildAndCaptureMapPage(doc, 'Site Features Overview', 'default');
            if (App.state.data.ortho?.georaster) await this.buildAndCaptureMapPage(doc, 'Site Features with Orthophoto', 'ortho');
            if (App.state.data.dsm?.georaster) await this.buildAndCaptureMapPage(doc, 'Site Features with Elevation Model', 'dsm');

            const featuresByCategory = features.reduce((acc, feature) => {
                const category = feature.properties.category || 'Uncategorized';
                if (!acc[category]) acc[category] = [];
                acc[category].push(feature);
                return acc;
            }, {});

            for (const categoryName in featuresByCategory) {
                featuresByCategory[categoryName].sort((a, b) => (a.properties.Name || '').localeCompare(b.properties.Name || ''));
            }
            const sortedCategoryNames = Object.keys(featuresByCategory).sort((a, b) => a.localeCompare(b));

            const processAndCapturePage = async (featuresForPage, categoryName, isContinuation) => {
                if (featuresForPage.length === 0) return;
                
                this.updateProgress(`Processing page for ${categoryName} with ${featuresForPage.length} feature(s)...`);

                const pageHeader = isContinuation
                    ? `<h1>Feature Details: ${categoryName} (continued)</h1>`
                    : `<h1>Feature Details: ${categoryName}</h1>`;

                const featureBlocksHTML = featuresForPage.map(f => this.buildFeatureDetailBlockHTML(f)).join('');
                const finalHtml = `${pageHeader}<div class="feature-blocks-container">${featureBlocksHTML}</div>`;

                const page = this.buildPage(finalHtml, this.cfg.a4.w, this.cfg.a4.h, {
                    svgDefs: this.getSvgDefs()
                });

                this.updateProgress(`Rendering maps for ${featuresForPage.length} feature(s)...`);
                const mapPromises = featuresForPage.map(f => {
                    const featureId = f.properties._internalId || (typeof f.id !== 'undefined' ? f.id : Math.random().toString(36).substring(2, 9));
                    const snapshotId = `feature-snapshot-${String(featureId).replace(/[^a-zA-Z0-9-_]/g, '')}`;
                    const mapContainer = page.querySelector(`#${snapshotId}`);
                    return mapContainer ? this.renderMiniMap(mapContainer, f) : Promise.resolve();
                });

                await Promise.all(mapPromises);
                this.updateProgress(`Capturing page image...`);

                const img = await this.captureElement(page, this.cfg.a4.w, this.cfg.a4.h, this.cfg.captureScale);
                doc.addPage('a4', 'portrait');
                doc.addImage(img, 'PNG', 0, 0, this.cfg.a4.w, this.cfg.a4.h);
            };

            const maxContentHeight = this.mmToPx(this.cfg.a4.h - (this.cfg.paddingMM * 2.5));

            for (const categoryName of sortedCategoryNames) {
                const categoryFeatures = featuresByCategory[categoryName];
                let featuresOnThisPage = [];
                let isFirstPageOfCategory = true;

                for (let i = 0; i < categoryFeatures.length; i++) {
                    const feature = categoryFeatures[i];
                    featuresOnThisPage.push(feature);

                    const pageHeader = `<h1>Feature Details: ${categoryName}</h1>`;
                    const featureBlocksHTML = featuresOnThisPage.map(f => this.buildFeatureDetailBlockHTML(f)).join('');
                    const tempHtml = `${pageHeader}<div class="feature-blocks-container">${featureBlocksHTML}</div>`;
                    
                    const tempPage = this.buildPage(tempHtml, this.cfg.a4.w, this.cfg.a4.h, { svgDefs: this.getSvgDefs() });
                    tempPage.style.position = 'absolute';
                    tempPage.style.left = '-9999px';
                    tempPage.style.top = '-9999px';

                    const contentContainer = tempPage.querySelector('.feature-blocks-container');
                    const currentHeight = contentContainer.getBoundingClientRect().height;
                    
                    document.body.removeChild(tempPage);

                    if (currentHeight > maxContentHeight) {
                        const featuresToPrint = featuresOnThisPage.slice(0, -1);
                        await processAndCapturePage(featuresToPrint, categoryName, !isFirstPageOfCategory);

                        featuresOnThisPage = [feature];
                        isFirstPageOfCategory = false;
                    }
                }

                if (featuresOnThisPage.length > 0) {
                    await processAndCapturePage(featuresOnThisPage, categoryName, !isFirstPageOfCategory);
                }
            }

            this.updateProgress('Adding page numbers...');
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(100);

                const pageNumText = `Page ${i} of ${pageCount}`;
                const pageSize = doc.internal.pageSize;
                const y = pageSize.getHeight() - (this.cfg.paddingMM / 2);
                const isLandscape = pageSize.getWidth() > pageSize.getHeight();

                const footerTitle = isLandscape ? "Site Map" : title;
                const titleX = this.cfg.paddingMM;
                const pageNumX = pageSize.getWidth() - this.cfg.paddingMM;
                const lineY = y - 3;

                if (i > 1) {
                    doc.setDrawColor(226, 232, 240);
                    doc.line(titleX, lineY, pageNumX, lineY);
                    doc.text(footerTitle, titleX, y, { align: 'left' });
                }
                doc.text(pageNumText, pageNumX, y, { align: 'right' });
            }

            this.updateProgress('Finalizing PDF...');
            doc.setProperties({ title, subject: desc, creator: 'Advanced Geospatial Data Viewer' });
            const filename = `${title.replace(/\s+/g,'_')}_${App.Utils.formatDate(new Date())}.pdf`;
            doc.save(filename);
            App.UI.showMessage('Success', 'PDF report generated successfully');
        } catch(err) {
            console.error('PDF generation error:', err);
            App.UI.showMessage('PDF Export Error', err.message || String(err));
        } finally {
            App.UI.hideLoader();
        }
    }
};