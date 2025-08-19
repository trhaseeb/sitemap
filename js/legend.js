// Legend Module - Displays and manages the feature legend
window.App = window.App || {};

App.Legend = {
    render() {
        const container = document.getElementById('legend-content');
        container.innerHTML = '';
        const { categories, geojson } = App.state.data;
        const allFeatures = geojson?.data?.features || []; 
        
        if (Object.keys(categories).length === 0) { 
            container.innerHTML = `<div class="text-center text-gray-500 p-4">
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
            
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'legend-category';
            const header = document.createElement('div');
            header.className = 'legend-category-header';
            
            const categoryNameSpan = document.createElement('span');
            categoryNameSpan.className = 'font-semibold';
            categoryNameSpan.innerText = categoryName;
            header.appendChild(categoryNameSpan);

            const featureCountSpan = document.createElement('span');
            featureCountSpan.className = 'text-sm text-gray-500';
            featureCountSpan.innerText = `(${visibleFeaturesInCategory.length})`;
            header.appendChild(featureCountSpan);

            const itemList = document.createElement('div');
            itemList.className = 'legend-item-list space-y-1 mt-1';
            
            visibleFeaturesInCategory.forEach(feature => {
                const item = document.createElement('div');
                const hasObservations = feature.properties.observations && feature.properties.observations.length > 0;
                item.className = 'legend-item';
                if (hasObservations) item.classList.add('has-observations');
                item.dataset.featureId = feature.properties._internalId;
                
                const swatch = this.createSwatch(feature);
                item.appendChild(swatch);
                
                const nameSpan = document.createElement('span');
                nameSpan.className = 'text-sm flex-grow';
                nameSpan.innerText = feature.properties.Name || 'Unnamed';
                item.appendChild(nameSpan);
                
                item.onclick = () => App.Events.selectFeature(feature.properties._internalId);
                itemList.appendChild(item);
            });

            header.onclick = () => {
                categoryDiv.classList.toggle('open');
            };

            categoryDiv.appendChild(header);
            categoryDiv.appendChild(itemList);
            container.appendChild(categoryDiv);
        }
    },
    createSwatch(feature) {
        const swatch = document.createElement('div');
        swatch.className = 'legend-swatch';
        swatch.style.backgroundColor = '#ccc'; // Default color
        
        try {
            // Get category style and apply to swatch
            const style = App.CategoryManager ? App.CategoryManager.getCategoryStyleForFeature(feature) : {};
            if (style.fillColor) {
                swatch.style.backgroundColor = style.fillColor;
            } else if (style.color) {
                swatch.style.backgroundColor = style.color;
            }
        } catch (e) {
            console.warn('Error creating swatch:', e);
        }
        
        return swatch;
    }
};