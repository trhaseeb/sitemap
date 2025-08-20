// Utility functions
window.App = window.App || {};

App.Utils = {
    debounce(func, delay = 250) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => { func.apply(this, args); }, delay);
        };
    },
    readFile: (file, readAs) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        if (readAs === 'arrayBuffer') reader.readAsArrayBuffer(file);
        else if (readAs === 'text') reader.readAsText(file);
        else if (readAs === 'dataURL') reader.readAsDataURL(file);
    }),
    calculateGeoData(feature) {
        const data = [];
        try {
            if (!feature || !feature.geometry || !feature.geometry.coordinates || feature.geometry.coordinates.length === 0) return null;
            const center = turf.centroid(feature);
            const [lon, lat] = center.geometry.coordinates;
            data.push({ label: 'Latitude', value: lat.toFixed(6) });
            data.push({ label: 'Longitude', value: lon.toFixed(6) });
            if (feature.geometry.type.includes('LineString') || feature.geometry.type.includes('Polygon')) {
                const lengthMeters = turf.length(feature, { units: 'meters' });
                data.push({ label: feature.geometry.type.includes('Polygon') ? 'Perimeter' : 'Length', value: `${(lengthMeters * 3.28084).toLocaleString(undefined, {maximumFractionDigits: 2})} ft` });
            }
            if (feature.geometry.type.includes('Polygon')) {
                const areaMeters = turf.area(feature);
                const areaAcres = areaMeters / 4046.86;
                data.push({ label: 'Area (sq ft)', value: (areaMeters * 10.7639).toLocaleString(undefined, {maximumFractionDigits: 2}) });
                data.push({ label: 'Area (acres)', value: areaAcres.toLocaleString(undefined, {maximumFractionDigits: 4}) });
            }
            return data;
        } catch(e) { console.error("GeoData Error:", e); return null; }
    },
    stripHtml(html) {
        try {
            // Handle non-string inputs safely
            if (html === null || html === undefined) return "";
            
            // Special handling for Event objects
            if (html instanceof Event) {
                console.warn("Event object detected in stripHtml");
                return "[Event]";
            }
            
            // Handle objects that might contain Events
            if (typeof html === 'object') {
                // Try to get a meaningful string representation
                if (html.toString && html.toString() !== '[object Object]') {
                    html = html.toString();
                } else {
                    return "[Object]";
                }
            }
            
            // Convert to string and check for [object Event]
            const str = String(html);
            if (str.includes('[object Event]')) {
                return str.replace(/\[object Event\]/g, '[Event]');
            }
            
            const doc = new DOMParser().parseFromString(str, 'text/html');
            return doc.body.textContent || "";
        } catch (e) {
            console.error("Error in stripHtml:", e);
            return "";
        }
    },
    formatDate(date) {
        if (!date) return '';
        if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return date;
        }
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    },
    /**
     * MODIFICATION: This function now crops images to a 1:1 square aspect ratio.
     * It finds the largest possible square in the center of the original image.
     */
    cropAndResizeImage: (imageUrl) => new Promise((resolve) => {
        const originalImage = new Image();
        originalImage.crossOrigin = "Anonymous";
        originalImage.onload = () => {
            let sourceX = 0, sourceY = 0;
            let sourceSize = Math.min(originalImage.width, originalImage.height);

            if (originalImage.width > originalImage.height) {
                // Landscape image
                sourceX = (originalImage.width - sourceSize) / 2;
            } else if (originalImage.height > originalImage.width) {
                // Portrait image
                sourceY = (originalImage.height - sourceSize) / 2;
            }

            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            // Using a fixed size for consistency in the report
            const finalSize = 800; 
            tempCanvas.width = finalSize;
            tempCanvas.height = finalSize;

            tempCtx.drawImage(
                originalImage,
                sourceX, sourceY,
                sourceSize, sourceSize, // Crop to the centered square
                0, 0, finalSize, finalSize // Draw that square onto the final canvas
            );
            resolve(tempCanvas.toDataURL('image/jpeg', 0.9));
        };
        originalImage.src = imageUrl;
    }),
    getHighestSeverity(observations) {
        if (!observations || observations.length === 0) return null;
        const severityOrder = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 };
        return observations.reduce((max, obs) => {
            const currentSeverity = severityOrder[obs.severity] || 0;
            const maxSeverity = severityOrder[max] || 0;
            return currentSeverity > maxSeverity ? obs.severity : max;
        }, 'Low');
    },
    getColorForSeverity(severity) {
        switch (severity) {
            case 'Critical': return '#ef4444'; // red-500
            case 'High': return '#f97316';     // orange-500
            case 'Medium': return '#eab308';   // yellow-500
            case 'Low': return '#3b82f6';      // blue-500
            default: return '#6b7280';         // gray-500
        }
    }
};