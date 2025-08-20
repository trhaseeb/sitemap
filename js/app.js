// Main Application Namespace and State Management
window.App = {
    state: {
        map: null, snapshotMap: null, layersControl: null, geojsonLayer: null,
        decoratorLayers: [], dsmLegendControl: null, svgPatternDefs: null,
        projectBoundary: { layer: null, geojson: null },
        boundaryDrawer: null,
        data: {
            ortho: { georaster: null, fileBuffer: null, layer: null },
            dsm: { georaster: null, fileBuffer: null, layer: null },
            geojson: { data: { type: 'FeatureCollection', features: [] }, fileContent: null }, 
            logo: null, 
            categories: {}, 
            contributors: [{ name: 'Default User', role: 'Project Lead', bio: '<p>Initial user for this project.</p>', image: null }],
            reportInfo: { 
                clientName: '', clientContact: '', clientAddress: '',
                projectId: '', reportDate: '', reportStatus: 'Draft'
            },
        },
        featureIdToLayerMap: new Map(),
        categoryVisibility: {},
        showOnlyWithObservations: false, 
        quillInstances: {
            contributorBio: null
        }
    },
    init() {
        // Initialize modules in dependency order
        this.Utils = window.AppUtils;
        // Also expose Utils globally for module compatibility
        App.Utils = window.AppUtils;
        this.UI.init(); 
        
        // Try to initialize Map, but continue if it fails (e.g., due to missing Leaflet)
        try {
            this.Map.init(); 
        } catch(e) {
            console.warn('Map initialization failed (likely due to missing external dependencies):', e.message);
        }
        
        this.Events.init();
        this.CategoryManager.render(); 
        this.Legend.render(); 
        
        // Try to initialize ContributorManager, but continue if it fails (e.g., due to missing Quill)
        try {
            this.ContributorManager.init();
        } catch(e) {
            console.warn('ContributorManager initialization failed (likely due to missing external dependencies):', e.message);
        }
        
        this.UI.updateReportStatusDisplay();
    }
};

// Initialization will be called after all modules are loaded