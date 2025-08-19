// PDF Export Functionality - Simplified version
window.App = window.App || {};

App.PDFExport = {
    // Configuration constants
    cfg: {
        a4: { w: 210, h: 297 },
        ledgerLandscape: { w: 431.8, h: 279.4 },
        captureScale: 3, 
        mapScale: 3,
        paddingMM: 15,
        mapFitPadding: 0.05,
    },

    async generatePDF() {
        App.UI.showLoader('Preparing PDF...');
        try {
            // Check if PDF libraries are available
            if (!window.jspdf || !window.jspdf.jsPDF) {
                throw new Error('PDF generation library not loaded');
            }
            
            const features = App.state.data.geojson?.data?.features || [];
            if (!features.length) {
                throw new Error('No features to export');
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });

            // Add title page
            const title = document.getElementById('main-title')?.childNodes[0]?.nodeValue?.trim() || 'Site Analysis Report';
            const desc = document.getElementById('main-description')?.innerHTML || '';
            
            doc.setFontSize(24);
            doc.text(title, this.cfg.a4.w / 2, 100, { align: 'center' });
            doc.setFontSize(12);
            doc.text(desc, this.cfg.a4.w / 2, 120, { align: 'center' });

            // Add project information page
            doc.addPage();
            doc.setFontSize(18);
            doc.text('Project Information', this.cfg.paddingMM, 30);
            
            const reportInfo = App.state.data.reportInfo || {};
            let yPos = 50;
            const lineHeight = 8;
            
            Object.entries(reportInfo).forEach(([key, value]) => {
                if (value) {
                    doc.setFontSize(10);
                    doc.text(`${key}: ${value}`, this.cfg.paddingMM, yPos);
                    yPos += lineHeight;
                }
            });

            // Add legend page
            doc.addPage();
            doc.setFontSize(18);
            doc.text('Legend', this.cfg.paddingMM, 30);
            
            yPos = 50;
            const categories = App.state.data.categories || {};
            Object.keys(categories).forEach(categoryName => {
                const categoryFeatures = features.filter(f => f.properties.category === categoryName);
                if (categoryFeatures.length > 0) {
                    doc.setFontSize(12);
                    doc.text(`${categoryName} (${categoryFeatures.length} features)`, this.cfg.paddingMM, yPos);
                    yPos += lineHeight;
                }
            });

            // Add feature details pages
            const featuresByCategory = features.reduce((acc, feature) => {
                const category = feature.properties.category || 'Uncategorized';
                if (!acc[category]) acc[category] = [];
                acc[category].push(feature);
                return acc;
            }, {});

            for (const [categoryName, categoryFeatures] of Object.entries(featuresByCategory)) {
                doc.addPage();
                doc.setFontSize(16);
                doc.text(`Feature Details: ${categoryName}`, this.cfg.paddingMM, 30);
                
                yPos = 50;
                categoryFeatures.forEach(feature => {
                    if (yPos > this.cfg.a4.h - 50) {
                        doc.addPage();
                        yPos = 30;
                    }
                    
                    doc.setFontSize(12);
                    doc.text(feature.properties.Name || 'Unnamed Feature', this.cfg.paddingMM, yPos);
                    yPos += lineHeight;
                    
                    if (feature.properties.Description) {
                        doc.setFontSize(10);
                        const splitDescription = doc.splitTextToSize(feature.properties.Description, this.cfg.a4.w - (this.cfg.paddingMM * 2));
                        doc.text(splitDescription, this.cfg.paddingMM, yPos);
                        yPos += splitDescription.length * 4;
                    }
                    
                    yPos += 10; // Space between features
                });
            }

            // Add page numbers
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.text(`Page ${i} of ${pageCount}`, this.cfg.a4.w - this.cfg.paddingMM, this.cfg.a4.h - 10, { align: 'right' });
            }

            // Save the PDF
            const filename = `${title.replace(/\s+/g,'_')}_${App.Utils.formatDate(new Date())}.pdf`;
            doc.save(filename);
            
            App.UI.showMessage('Success', 'PDF report generated successfully');
        } catch(err) {
            console.error('PDF generation error:', err);
            App.UI.showMessage('PDF Export Error', err.message || String(err));
        } finally {
            App.UI.hideLoader();
        }
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
    }
};