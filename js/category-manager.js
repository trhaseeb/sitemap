// Category Manager - Handles feature categorization and styling
window.App = window.App || {};

App.CategoryManager = {
    render() {
        const container = document.getElementById('category-manager-content');
        if (!container) return;
        
        container.innerHTML = '';
        const categories = App.state.data.categories || {};
        
        if (Object.keys(categories).length === 0) {
            container.innerHTML = '<p class="text-gray-500">No categories defined. Click "Add New Category" to create one.</p>';
            return;
        }
        
        Object.keys(categories).forEach(categoryName => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-item';
            
            const header = document.createElement('div');
            header.className = 'category-item-header';
            header.innerHTML = `
                <span class="font-semibold">${categoryName}</span>
                <button class="text-red-500 hover:text-red-700 delete-category-btn" data-category="${categoryName}">&times;</button>
            `;
            
            const body = document.createElement('div');
            body.className = 'category-item-body';
            body.innerHTML = '<p>Category styling controls would go here...</p>';
            
            header.onclick = () => categoryDiv.classList.toggle('open');
            categoryDiv.appendChild(header);
            categoryDiv.appendChild(body);
            container.appendChild(categoryDiv);
        });
        
        // Add delete handlers
        container.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const categoryName = btn.dataset.category;
                App.UI.showConfirm('Delete Category', `Delete category "${categoryName}"?`, () => {
                    delete App.state.data.categories[categoryName];
                    this.render();
                    App.Map.renderGeoJSONLayer();
                });
            };
        });
    },
    addCategory() {
        App.UI.showPrompt('Add New Category', [
            { id: 'name', label: 'Category Name', value: '', type: 'text' }
        ], (results) => {
            if (!results.name) return;
            const categoryName = results.name.trim();
            if (App.state.data.categories[categoryName]) {
                App.UI.showMessage('Error', 'A category with that name already exists.');
                return;
            }
            App.state.data.categories[categoryName] = this.getDefaultCategory();
            App.state.categoryVisibility[categoryName] = true;
            this.render();
            App.Legend.render();
        });
    },
    getCategoryStyleForFeature(feature) {
        const categoryName = feature.properties.category;
        const category = App.state.data.categories[categoryName];
        if (!category) return this.getDefaultStyle();
        
        const geomType = feature.geometry.type;
        if (geomType.includes('Point')) {
            return category.styles?.point || this.getDefaultStyle().point;
        } else if (geomType.includes('LineString')) {
            return category.styles?.line || this.getDefaultStyle().line;
        } else if (geomType.includes('Polygon')) {
            return category.styles?.polygon || this.getDefaultStyle().polygon;
        }
        return this.getDefaultStyle();
    },
    createPointMarker(feature, latlng) {
        const style = this.getCategoryStyleForFeature(feature);
        return L.circleMarker(latlng, {
            radius: style.size || 8,
            fillColor: style.fillColor || '#ff8c00',
            color: style.color || '#000000',
            weight: style.weight || 1,
            opacity: style.opacity || 1,
            fillOpacity: style.fillOpacity || 0.8
        });
    },
    getDefaultCategory() {
        return { 
            styles: { 
                point: { fillColor: '#ff8c00', fillOpacity: 0.8, color: '#000000', weight: 1, opacity: 1, size: 16, shape: 'circle', svg: '', svgSize: 24 },
                line: { color: '#ff4500', weight: 3, opacity: 1, linePattern: 'solid', lineSpacing: 10, lineCap: 'round', lineJoin: 'round' },
                polygon: { fillColor: '#ff6347', fillOpacity: 0.2, color: '#ff6347', weight: 3, opacity: 1, dashArray: 'solid', fillPattern: 'solid', patternDensity: 10, patternRotation: 0 }
            } 
        };
    },
    getDefaultStyle() {
        return this.getDefaultCategory().styles;
    },
    updateSvgPatternDefs() {
        // Simplified - would normally update SVG pattern definitions for advanced styling
        console.log('SVG pattern definitions updated');
    }
};