// Import and Export functionality
window.App = window.App || {};

App.ImportExport = {
    exportCategories() {
        try {
            const dataStr = JSON.stringify(App.state.data.categories, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'categories.json';
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
        } catch (e) { App.UI.showMessage("Export Error", `Could not export categories: ${e.message}`); }
    },
    async importCategories(e) {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const imported = JSON.parse(await App.Utils.readFile(file, 'text'));
            if (typeof imported === 'object' && imported !== null && imported[Object.keys(imported)[0]]?.styles) {
                Object.assign(App.state.data.categories, imported);
                Object.keys(imported).forEach(catName => {
                    if (typeof App.state.categoryVisibility[catName] === 'undefined') {
                         App.state.categoryVisibility[catName] = true;
                    }
                });
                App.CategoryManager.updateSvgPatternDefs(); 
                App.CategoryManager.render(); 
                App.Map.renderGeoJSONLayer();
                App.UI.showMessage('Success', 'Categories imported successfully.');
            } else throw new Error("File does not appear to be a valid category JSON.");
        } catch (e) { App.UI.showMessage("Import Error", `Could not import categories: ${e.message}`); }
        e.target.value = '';
    },
    exportProject() {
        try {
            const geojsonToSave = App.state.data.geojson.data ? JSON.parse(JSON.stringify(App.state.data.geojson.data)) : { type: 'FeatureCollection', features: [] };
            if (geojsonToSave.features) {
                geojsonToSave.features.forEach(f => { if (f.properties) delete f.properties._internalId; });
            }
            const center = App.state.map.getCenter();
            const projectData = {
                version: "1.9.2",
                title: document.getElementById('main-title').childNodes[0].nodeValue.trim(),
                description: document.getElementById('main-description').innerHTML,
                logo: App.state.data.logo,
                categories: App.state.data.categories,
                contributors: App.state.data.contributors, 
                reportInfo: App.state.data.reportInfo, 
                geojson: geojsonToSave,
                projectBoundary: App.state.projectBoundary.geojson,
                mapView: { center: { lat: center.lat, lng: center.lng }, zoom: App.state.map.getZoom() },
                categoryVisibility: App.state.categoryVisibility,
                showOnlyWithObservations: App.state.showOnlyWithObservations,
                exportTimestamp: new Date().toISOString() 
            };

            const dataStr = JSON.stringify(projectData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `map_project_${App.Utils.formatDate(new Date())}.json`; 
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);

        } catch (e) { App.UI.showMessage("Export Error", `Could not export project: ${e.message}`); }
    },
    exportGeoJSON() {
        if (!App.state.data.geojson.data?.features?.length) { App.UI.showMessage('Export Error', 'No features to export.'); return; }
        try {
            const geojsonToSave = JSON.parse(JSON.stringify(App.state.data.geojson.data));
            geojsonToSave.features.forEach(f => { if (f.properties) delete f.properties._internalId; });
            geojsonToSave.properties = { 
                ...geojsonToSave.properties, 
                categories: App.state.data.categories, 
                contributors: App.state.data.contributors,
                reportInfo: App.state.data.reportInfo 
            }; 
            const dataStr = JSON.stringify(geojsonToSave, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'features_with_categories.geojson';
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
        } catch (e) { App.UI.showMessage("Export Error", `Could not export GeoJSON: ${e.message}`); }
    },
    showExportDataModal() {
        const modalTitle = 'Export Data';
        const modalBody = `
            <div class="border rounded-lg p-4 mb-4">
                <h4 class="font-bold text-lg">Project File (.json)</h4>
                <p class="text-sm text-gray-600 mt-1">Best for saving your work and reopening it in this application later. Includes all categories, features, and report settings.</p>
                <button id="modal-export-project" class="mt-3 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg w-full">Download Project File</button>
            </div>
            <div class="border rounded-lg p-4 mb-4">
                <h4 class="font-bold text-lg">PDF Report (.pdf)</h4>
                <p class="text-sm text-gray-600 mt-1">Generate a professionally formatted report with maps, legend, and feature details. Perfect for sharing with clients and stakeholders.</p>
                <button id="modal-export-pdf" class="mt-3 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg w-full">Generate PDF Report</button>
            </div>
            <div class="border rounded-lg p-4">
                <h4 class="font-bold text-lg">Standard GeoJSON (.geojson)</h4>
                <p class="text-sm text-gray-600 mt-1">Best for using your feature data in other GIS software like QGIS or ArcGIS. Categories are included but may not be compatible.</p>
                <button id="modal-export-geojson" class="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg w-full">Download GeoJSON</button>
            </div>
        `;
        const modalFooter = `
            <button id="modal-cancel-btn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg">Close</button>
        `;
        
        document.getElementById('modal-title').innerText = modalTitle;
        document.getElementById('modal-body').innerHTML = modalBody;
        document.getElementById('modal-footer').innerHTML = modalFooter;
        document.getElementById('modal').classList.remove('hidden');

        const closeModal = () => document.getElementById('modal').classList.add('hidden');
        document.getElementById('modal-cancel-btn').onclick = closeModal;
        document.getElementById('modal-export-project').onclick = () => { 
            try { this.exportProject(); } catch(e) { console.error(e); }
            closeModal(); 
        };
        document.getElementById('modal-export-geojson').onclick = () => { 
            try { this.exportGeoJSON(); } catch(e) { console.error(e); }
            closeModal(); 
        };
        document.getElementById('modal-export-pdf').onclick = () => { 
            try { App.PDFExport ? App.PDFExport.generatePDF() : App.UI.showMessage('Error', 'PDF Export not available'); } catch(e) { console.error(e); }
            closeModal(); 
        };
    },
    async importProjectOrFeatures(e) {
        const file = e.target.files[0];
        if (!file) return;
        App.UI.showLoader('Reading file...');
        try {
            const content = await App.Utils.readFile(file, 'text');
            const data = JSON.parse(content);
            App.UI.hideLoader();

            const isProjectFile = data.version && data.categories && data.geojson;
            const isGeoJSONFile = data.type === 'FeatureCollection' && Array.isArray(data.features);

            if (isProjectFile) {
                let confirmMessage = 'This will overwrite all current data. Continue?';
                if (data.exportTimestamp) {
                    confirmMessage += `\n\nProject exported on: ${new Date(data.exportTimestamp).toLocaleString()}`;
                }
                App.UI.showConfirm('Import Project', confirmMessage, () => this.loadProject(data));
            } else if (isGeoJSONFile) {
                App.UI.showConfirm('Import GeoJSON Features', 'This will REPLACE current vector features. Continue?', () => this.loadGeoJSON(data, content));
            } else {
                throw new Error('The file is not a valid Project or GeoJSON file.');
            }
        } catch (err) { App.UI.showMessage("Import Error", `Could not import file: ${err.message}`); } 
        finally { e.target.value = ''; App.UI.hideLoader(); }
    },
    loadProject(data) {
        App.UI.showLoader('Importing Project...');
        try {
            App.Data.resetAppState();
            
            document.getElementById('main-title').childNodes[0].nodeValue = (data.title || 'Site Analysis Report') + ' ';
            document.getElementById('main-description').innerHTML = data.description || '';
            if (data.logo) { App.state.data.logo = data.logo; document.getElementById('logo-img').src = data.logo; }
            App.state.data.categories = data.categories || {};
            App.state.categoryVisibility = data.categoryVisibility || {};
            App.state.showOnlyWithObservations = data.showOnlyWithObservations || false;
            document.getElementById('show-only-with-observations-toggle').checked = App.state.showOnlyWithObservations;
            if (data.contributors && Array.isArray(data.contributors)) {
                App.state.data.contributors = data.contributors;
            }
            if (data.reportInfo) {
                Object.assign(App.state.data.reportInfo, data.reportInfo);
            }
            
            App.Data.processAndInitializeFeatures(data.geojson); 
            App.state.data.geojson.data = data.geojson || { type: 'FeatureCollection', features: [] };
            
            // Render everything
            App.CategoryManager.updateSvgPatternDefs(); 
            App.CategoryManager.render(); 
            App.Map.renderGeoJSONLayer();
            App.ContributorManager.render(); 
            App.UI.updateReportStatusDisplay();

            // Set map view last, after layers are on the map
            if (data.projectBoundary) {
                App.Map.setBoundary(data.projectBoundary, true); // This will fit the view
            } else if (App.state.geojsonLayer.getLayers().length > 0) {
                const bounds = App.state.geojsonLayer.getBounds();
                if (bounds.isValid()) App.state.map.fitBounds(bounds.pad(0.1));
            } else if (data.mapView?.center) {
                App.state.map.setView(data.mapView.center, data.mapView.zoom);
            }

            App.UI.showMessage('Import Complete', 'Project loaded successfully. Re-select raster files if they were part of the original project.');
        } catch (err) { App.UI.showMessage("Import Error", `Could not import project: ${err.message}`); } 
        finally { App.UI.hideLoader(); }
    },
    loadGeoJSON(data, content) {
        App.UI.showLoader('Importing GeoJSON...');
        try {
            // Only reset the features, not the whole project
            App.state.data.geojson = { data: data, fileContent: content };
            App.Data.processAndInitializeFeatures(data); 
            
            // Re-render map and legend
            App.CategoryManager.updateSvgPatternDefs(); 
            App.CategoryManager.render(); 
            App.Map.renderGeoJSONLayer();
            
            // Zoom to new features
            if (App.state.geojsonLayer.getLayers().length > 0) {
                const bounds = App.state.geojsonLayer.getBounds();
                if (bounds.isValid()) {
                    App.state.map.fitBounds(bounds.pad(0.1));
                }
            }

            App.UI.showMessage('Import Complete', 'GeoJSON features loaded.');
        } catch (err) { App.UI.showMessage('File Error', `Failed to process GeoJSON: ${err.message}`); } 
        finally { App.UI.hideLoader(); }
    }
};