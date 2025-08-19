// Snapshot Module - Renders feature details and snapshots
window.App = window.App || {};

App.Snapshot = {
    render(feature) {
        const container = document.getElementById('snapshot-container');
        if (!feature) {
            container.innerHTML = '<p>Select a feature from the legend or map to view its details and a visual snapshot.</p>';
            return;
        }

        const hasObservations = feature.properties.observations && feature.properties.observations.length > 0;
        const geoData = App.Utils.calculateGeoData(feature) || [];
        
        let geoDataHtml = '';
        if (geoData.length > 0) {
            geoDataHtml = `
                <div class="bg-gray-50 p-3 rounded-lg mb-4">
                    <h4 class="font-semibold mb-2">Geometry Information</h4>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        ${geoData.map(item => `<div><span class="font-medium">${item.label}:</span> ${item.value}</div>`).join('')}
                    </div>
                </div>
            `;
        }

        let observationsHtml = '';
        if (hasObservations) {
            const obsItems = feature.properties.observations.map(obs => `
                <div class="border-l-4 border-red-400 pl-3 py-2">
                    <div class="font-semibold">${obs.observationType || 'General'}</div>
                    <div class="text-sm text-gray-600">Severity: ${obs.severity || 'Low'}</div>
                    ${obs.recommendation ? `<div class="text-sm mt-1">${obs.recommendation}</div>` : ''}
                </div>
            `).join('');
            
            observationsHtml = `
                <div class="mb-4">
                    <h4 class="font-semibold mb-2 text-red-700">Observations</h4>
                    <div class="space-y-2">${obsItems}</div>
                </div>
            `;
        }

        container.innerHTML = `
            <div>
                <h3 class="text-lg font-bold mb-2">${feature.properties.Name || 'Unnamed Feature'}</h3>
                <div class="mb-4">
                    <span class="inline-block bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">
                        ${feature.properties.category || 'Uncategorized'}
                    </span>
                </div>
                
                ${feature.properties.Description ? `
                    <div class="mb-4">
                        <h4 class="font-semibold mb-1">Description</h4>
                        <div class="text-sm text-gray-700">${feature.properties.Description}</div>
                    </div>
                ` : ''}
                
                ${geoDataHtml}
                ${observationsHtml}
                
                <div class="mt-4">
                    <div class="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                        Feature Map Snapshot
                        <br><small>(Would render interactive mini-map)</small>
                    </div>
                </div>
            </div>
        `;
    }
};