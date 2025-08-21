// Event handling
window.App = window.App || {};

App.Events = {
    activeEditor: null,
    activeLayer: null,
    originalGeometry: null, // For custom edit sessions
    finishControlInstance: null,
    init() {
        document.getElementById('logo-input').addEventListener('change', async e => { 
            if (e.target.files[0]) { 
                App.state.data.logo = await App.Utils.readFile(e.target.files[0], 'dataURL'); 
                document.getElementById('logo-img').src = App.state.data.logo; 
            } 
        });
        document.getElementById('logo-img').onclick = () => App.Events.showEditReportInfoModal();
        document.getElementById('open-geodata-modal-btn').onclick = () => App.UI.elements.geodataModal.classList.remove('hidden');
        document.getElementById('close-geodata-modal-btn').onclick = () => App.UI.elements.geodataModal.classList.add('hidden');
        document.getElementById('ortho-input').addEventListener('change', e => App.Data.handleRasterUpload(e, 'ortho'));
        document.getElementById('dsm-input').addEventListener('change', e => App.Data.handleRasterUpload(e, 'dsm'));
        document.getElementById('import-project-input').addEventListener('change', e => App.ImportExport.importProjectOrFeatures(e));
        document.getElementById('export-project-btn').addEventListener('click', () => App.ImportExport.showExportDataModal()); 
        document.getElementById('manage-categories-btn').onclick = () => App.UI.elements.categoryManagerPanel.classList.add('open');
        document.getElementById('close-category-manager-btn').onclick = () => App.UI.elements.categoryManagerPanel.classList.remove('open');
        document.getElementById('add-category-btn').onclick = () => App.CategoryManager.addCategory();
        document.getElementById('export-categories-btn').onclick = () => App.ImportExport.exportCategories();
        document.getElementById('import-categories-input').addEventListener('change', e => App.ImportExport.importCategories(e));
        document.getElementById('manage-contributors-btn').onclick = () => App.UI.elements.contributorManagerPanel.classList.add('open');
        document.getElementById('close-contributor-manager-btn').onclick = () => App.UI.elements.contributorManagerPanel.classList.remove('open');
        document.getElementById('add-contributor-btn').onclick = () => App.ContributorManager.addContributor();
        document.getElementById('show-only-with-observations-toggle').addEventListener('change', e => {
            App.state.showOnlyWithObservations = e.target.checked;
            App.Map.refreshFeaturesVisibility();
        });
        App.UI.elements.defineBoundaryBtn.onclick = () => this.startBoundaryDraw();
        App.UI.elements.clearBoundaryBtn.onclick = () => App.Map.clearBoundary();
    },
    startBoundaryDraw() {
        App.UI.showMessage('Define Boundary', 'Draw a polygon on the map to define the project boundary. Click the first point to finish.');
        App.state.boundaryDrawer = new L.Draw.Polygon(App.state.map, {
            allowIntersection: false,
            showArea: true,
            shapeOptions: {
                color: '#0ea5e9',
                weight: 3,
            }
        });
        App.state.boundaryDrawer.enable();

        App.state.map.once(L.Draw.Event.CREATED, (e) => {
            const layer = e.layer;
            // When user draws a boundary, zoom to it
            App.Map.setBoundary(layer.toGeoJSON(), true);
            if (App.state.boundaryDrawer) {
                App.state.boundaryDrawer.disable();
                App.state.boundaryDrawer = null;
            }
        });
    },
    showEditReportInfoModal() {
        const info = App.state.data.reportInfo;
        const titleElement = document.getElementById('main-title');
        const descriptionElement = document.getElementById('main-description');
        const reportTitle = titleElement.childNodes[0].nodeValue.trim();

        App.UI.showPrompt('Edit Report Information', [
            { id: 'logoFile', label: 'Change Report Logo', type: 'file', accept: 'image/*' },
            { id: 'newTitle', label: 'Report Title', value: reportTitle, type: 'text' },
            { id: 'Description', label: 'Report Description', value: descriptionElement.innerHTML, type: 'quill' },
            { id: 'clientName', label: 'Client Name', value: info.clientName, type: 'text' },
            { id: 'clientContact', label: 'Client Contact', value: info.clientContact, type: 'text' },
            { id: 'clientAddress', label: 'Client Address', value: info.clientAddress, type: 'text' },
            { id: 'projectId', label: 'Project ID', value: info.projectId, type: 'text' },
            { id: 'reportDate', label: 'Report Date', value: App.Utils.formatDate(info.reportDate || new Date()), type: 'date' },
            { id: 'reportStatus', label: 'Report Status', value: info.reportStatus, type: 'select', 
                options: [{label:'Draft',value:'Draft'},{label:'Under Review',value:'Under Review'},{label:'Final',value:'Final'},{label:'Archived',value:'Archived'}] }
        ], async (results) => { 
            if (results.newTitle) {
                titleElement.childNodes[0].nodeValue = results.newTitle + ' ';
            }
            if (results.Description) descriptionElement.innerHTML = results.Description;
            
            if (results.logoFile) { 
                App.state.data.logo = await App.Utils.readFile(results.logoFile, 'dataURL');
                document.getElementById('logo-img').src = App.state.data.logo;
            }

            App.state.data.reportInfo = {
                clientName: results.clientName, clientContact: results.clientContact, clientAddress: results.clientAddress,
                projectId: results.projectId, reportDate: results.reportDate, reportStatus: results.reportStatus
            };
            App.UI.updateReportStatusDisplay();
        }, 'edit-report-info-modal'); 
    },
    handleDrawNewFeature(e) {
        // Ignore if this was a boundary draw
        if (App.state.boundaryDrawer) return;

        const categoryOptions = Object.keys(App.state.data.categories).map(name => ({ label: name, value: name }));
        if (categoryOptions.length === 0) { 
            App.UI.showMessage('No Categories', 'Please create a category first using the "Manage Categories" button.'); 
            App.state.map.removeLayer(e.layer);
            return; 
        }
        
        const newFeature = e.layer.toGeoJSON();
        const validation = App.Utils.validateFeatureGeometry(newFeature);
        if (!validation.isValid) {
            App.UI.showMessage('Invalid Geometry', validation.message);
            App.state.map.removeLayer(e.layer); // Remove the invalid layer
            return;
        }

        App.UI.showPrompt('New Feature Details', [
            { id: 'Name', label: 'Name', value: 'New Feature', type: 'text' },
            { id: 'Description', label: 'Description', value: '', type: 'quill' },
            { id: 'category', label: 'Category', value: categoryOptions[0].value, type: 'select', options: categoryOptions },
            { id: 'showLabel', label: 'Show Label on Map', value: true, type: 'checkbox' },
        ], (results) => {
            newFeature.properties = results;
            newFeature.properties._internalId = crypto.randomUUID(); 
            newFeature.properties.observations = [];

            // Update the cache for the new feature
            App.Data.updateFeatureCalculations(newFeature);

            if (!App.state.data.geojson.data) App.state.data.geojson.data = { type: 'FeatureCollection', features: [] };
            App.state.data.geojson.data.features.push(newFeature);
            App.Map.addFeature(newFeature);
            App.Legend.render();
            App.Events.selectFeature(newFeature.properties._internalId);
        });
    },
    handleFeaturesEdited(e) {
        const featuresToUpdate = [];
        e.layers.eachLayer(layer => {
            const feature = App.Data.getFeatureById(layer.feature_internal_id);
            if (feature) { 
                feature.geometry = layer.toGeoJSON().geometry; 
                featuresToUpdate.push(feature);
            }
        });

        App.Data.updateFeatures(featuresToUpdate);
        featuresToUpdate.forEach(f => App.Map.updateFeature(f));

        const selected = document.querySelector('.legend-item.selected');
        if (selected) { App.Snapshot.render(App.Data.getFeatureById(selected.dataset.featureId)); }
        App.Legend.render();
    },
    selectFeature(featureId) {
        const feature = App.Data.getFeatureById(featureId);
        if (!feature) return;
        const layer = App.state.featureIdToLayerMap.get(featureId);
        if (layer) {
            if (layer.getBounds) App.state.map.fitBounds(layer.getBounds(), { paddingTopLeft: [350, 20], paddingBottomRight: [20, 20], maxZoom: 19 });
            else if (layer.getLatLng) App.state.map.setView(layer.getLatLng(), Math.max(App.state.map.getZoom(), 18));
            if (layer.openPopup) layer.openPopup();
        }
        document.querySelectorAll('.legend-item.selected').forEach(item => item.classList.remove('selected'));
        const listItem = document.querySelector(`.legend-item[data-feature-id="${featureId}"]`);
        if (listItem) { listItem.classList.add('selected'); listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
        App.Snapshot.render(feature);
    },
    editFeatureProperties(feature) {
        App.state.map.closePopup();
        
        const fields = [
            { id: 'Name', label: 'Name', value: feature.properties.Name || '', type: 'text' },
            { id: 'Description', label: 'Description', value: feature.properties.Description || '', type: 'quill' },
            { id: 'category', label: 'Category', value: feature.properties.category, type: 'select', options: Object.keys(App.state.data.categories).map(name => ({ label: name, value: name })) },
            { id: 'showLabel', label: 'Show Label on Map', value: !!feature.properties.showLabel, type: 'checkbox' },
        ];

        App.UI.showPrompt('Edit Feature', fields, (results) => {
            Object.assign(feature.properties, results);

            // Recalculate data as properties (like category) might affect styling
            App.Data.updateFeatureCalculations(feature);
            App.Map.updateFeature(feature);
            App.Legend.render();
            this.selectFeature(feature.properties._internalId);
        });

        // After showing the main prompt, inject the observations section
        const modalBody = document.getElementById('modal-body');
        const obsContainer = document.createElement('div');
        obsContainer.className = 'mt-6 border-t pt-4';
        obsContainer.innerHTML = `<h4 class="text-lg font-semibold mb-2">Observations</h4><div id="observation-list" class="space-y-3"></div><button id="add-observation-btn" class="mt-4 bg-green-500 hover:bg-green-600 text-white text-sm py-1 px-3 rounded">Add Observation</button>`;
        modalBody.appendChild(obsContainer);

        this.renderObservationsList(feature, obsContainer.querySelector('#observation-list'));

        obsContainer.querySelector('#add-observation-btn').onclick = () => {
            this.showObservationModal(feature);
        };
    },
    editFeatureShape(layer) {
        if (this.activeEditor) {
            this.finishEditing(); // Finish any previous edit before starting a new one
        }
        App.state.map.closePopup();
        layer.editing.enable();
        this.activeEditor = layer.editing;
        this.activeLayer = layer;
        this.showFinishEditingControl();
    },
    showFinishEditingControl() {
        if (this.finishControlInstance) return; // Already showing

        const FinishControl = L.Control.extend({
            onAdd: map => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                container.style.background = 'white';
                container.style.padding = '5px';
                container.innerHTML = '<button id="finish-edit-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded-md text-sm">Finish Editing</button>';
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.on(container.querySelector('#finish-edit-btn'), 'click', () => {
                    App.Events.finishEditing();
                });
                return container;
            }
        });
        this.finishControlInstance = new FinishControl({ position: 'topright' }).addTo(App.state.map);
    },
    finishEditing() {
        if (!this.activeEditor) return;

        this.activeEditor.disable();
        const layer = this.activeLayer;

        if (this.finishControlInstance) {
            App.state.map.removeControl(this.finishControlInstance);
            this.finishControlInstance = null;
        }

        const feature = App.Data.getFeatureById(layer.feature_internal_id);
        if (feature) {
            if (layer instanceof L.Marker) {
                const newLatLng = layer.getLatLng();
                feature.geometry.coordinates = [newLatLng.lng, newLatLng.lat];
            } else {
                feature.geometry = layer.toGeoJSON().geometry;
            }
            // Recalculate data after geometry change
            App.Data.updateFeatureCalculations(feature);
        }

        this.activeEditor = null;
        this.activeLayer = null;

        if (feature) {
            App.Map.updateFeature(feature);
            App.Events.selectFeature(feature.properties._internalId);
        }
        App.Legend.render();
    },
    renderObservationsList(feature, container) {
        container.innerHTML = '';
        if (!feature.properties.observations || feature.properties.observations.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-500">No observations for this feature.</p>';
            return;
        }

        feature.properties.observations.forEach((obs, index) => {
            const obsDiv = document.createElement('div');
            obsDiv.className = 'p-3 border rounded-lg bg-gray-50';
            const contributor = App.state.data.contributors.find(c => c.name === obs.contributor);
            obsDiv.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-bold">${obs.observationType || 'General Observation'}</p>
                        <p class="text-sm text-gray-600">Severity: ${obs.severity}</p>
                        ${contributor ? `<p class="text-sm text-gray-600">By: ${contributor.name}</p>` : ''}
                    </div>
                    <div>
                        <button class="edit-obs-btn text-sm text-blue-600 hover:underline mr-2" data-index="${index}">Edit</button>
                        <button class="delete-obs-btn text-sm text-red-600 hover:underline" data-index="${index}">Delete</button>
                    </div>
                </div>
            `;
            container.appendChild(obsDiv);
        });

        container.querySelectorAll('.edit-obs-btn').forEach(btn => {
            btn.onclick = () => this.showObservationModal(feature, parseInt(btn.dataset.index));
        });
        container.querySelectorAll('.delete-obs-btn').forEach(btn => {
            btn.onclick = () => {
                const index = parseInt(btn.dataset.index);
                App.UI.showConfirm('Delete Observation?', 'Are you sure you want to delete this observation?', () => {
                    feature.properties.observations.splice(index, 1);

                    // Recalculate data as observations have changed
                    App.Data.updateFeatureCalculations(feature);
                    this.renderObservationsList(feature, container);
                    App.Map.updateFeature(feature);
                    App.Legend.render();
                    App.Snapshot.render(feature);
                });
            };
        });
    },
    showObservationModal(feature, obsIndex = -1) {
        const isEditing = obsIndex > -1;
        const observation = isEditing ? feature.properties.observations[obsIndex] : {};
        const title = isEditing ? 'Edit Observation' : 'Add Observation';

        const contributorOptions = App.state.data.contributors.map(c => ({ label: `${c.name} (${c.role || 'N/A'})`, value: c.name }));
        contributorOptions.unshift({ label: 'None', value: '' });

        const fields = [
            { id: 'observationType', label: 'Observation Type (e.g., Stormwater, Waste)', value: observation.observationType || '', type: 'text' },
            { id: 'severity', label: 'Severity', value: observation.severity || 'Low', type: 'select', options: [{label:'Low',value:'Low'},{label:'Medium',value:'Medium'},{label:'High',value:'High'},{label:'Critical',value:'Critical'}] },
            { id: 'contributor', label: 'Observed By', value: observation.contributor || '', type: 'select', options: contributorOptions },
            { id: 'recommendation', label: 'Recommendation', value: observation.recommendation || '', type: 'quill' },
            { id: 'images', label: 'Images', value: observation.images || [], type: 'images' }
        ];

        App.UI.showPrompt(title, fields, (results) => {
            const newObservation = {
                id: observation.id || crypto.randomUUID(),
                ...results
            };
            if (isEditing) {
                feature.properties.observations[obsIndex] = newObservation;
            } else {
                feature.properties.observations.push(newObservation);
            }

            // Recalculate data as observations have changed
            App.Data.updateFeatureCalculations(feature);
            App.Map.updateFeature(feature);

            // Re-render the list in the main edit modal
            this.renderObservationsList(feature, document.getElementById('observation-list'));
            App.Legend.render();
            App.Snapshot.render(feature);
        }, 'observation-modal');
    },
    deleteFeature(featureToDelete) {
        App.state.map.closePopup();
        App.UI.showConfirm('Delete Feature', `Are you sure you want to delete "${featureToDelete.properties.Name || 'this feature'}"?`, () => {
            const featureId = featureToDelete.properties._internalId;
            App.state.data.geojson.data.features = App.state.data.geojson.data.features.filter(f => f.properties._internalId !== featureId);

            App.Map.removeFeature(featureId);
            App.Legend.render();
            // Reset the snapshot panel to its initial state
            App.Snapshot.render(null);
        });
    },
    handleOverlayToggle(e) {
        if (e.name === 'Digital Surface Model' && App.state.dsmLegendControl) {
            if (e.type === 'overlayadd') App.state.dsmLegendControl.addTo(App.state.map);
            else App.state.map.removeControl(App.state.dsmLegendControl);
        }
    },
    handlePopupOpen(e) {
        const popup = e.popup;
        setTimeout(() => {
            const map = App.state.map;
            const popupSize = L.point(popup._container.offsetWidth, popup._container.offsetHeight);
            const popupAnchor = map.latLngToContainerPoint(popup.getLatLng());
            const mapSize = map.getSize();
            
            let panOffset = L.point(0, 0);

            if (popupAnchor.x < 0) {
                panOffset.x = popupAnchor.x - 10; // Pan right
            }
            if (popupAnchor.x + popupSize.x > mapSize.x) {
                panOffset.x = popupAnchor.x + popupSize.x - mapSize.x + 10; // Pan left
            }
            if (popupAnchor.y < 0) {
                panOffset.y = popupAnchor.y - 10; // Pan down
            }
            if (popupAnchor.y + popupSize.y > mapSize.y) {
                panOffset.y = popupAnchor.y + popupSize.y - mapSize.y + 10; // Pan up
            }

            if (panOffset.x !== 0 || panOffset.y !== 0) {
                map.panBy(panOffset, { animate: true });
            }
        }, 10); // Short delay to allow popup to render
    }
};