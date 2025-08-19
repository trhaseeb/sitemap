// Image Annotation Module
window.App = window.App || {};

App.ImageAnnotator = {
    init(imageUrl, saveCallback) {
        const modal = App.UI.elements.annotationModal;
        const canvas = document.getElementById('annotation-canvas');
        const ctx = canvas.getContext('2d');
        let isDrawing = false, lastX = 0, lastY = 0;
        const originalImage = new Image();
        originalImage.crossOrigin = "Anonymous";
        
        originalImage.onload = () => {
            const container = document.querySelector('#annotation-modal .canvas-container');
            canvas.width = originalImage.width;
            canvas.height = originalImage.height;
            ctx.drawImage(originalImage, 0, 0);
            modal.classList.remove('hidden');
        };
        originalImage.src = imageUrl;

        const getMousePos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY
            };
        };

        const draw = (e) => {
            if (!isDrawing) return;
            e.preventDefault();
            const { x, y } = getMousePos(e);
            ctx.strokeStyle = document.getElementById('annotation-color').value;
            ctx.lineWidth = document.getElementById('annotation-brush-size').value;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
            [lastX, lastY] = [x, y];
        };

        const startDrawing = (e) => {
            isDrawing = true;
            const { x, y } = getMousePos(e);
            [lastX, lastY] = [x, y];
        };

        const stopDrawing = () => isDrawing = false;

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);

        document.getElementById('annotation-clear-btn').onclick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(originalImage, 0, 0);
        };
        document.getElementById('annotation-cancel-btn').onclick = () => modal.classList.add('hidden');
        document.getElementById('annotation-save-btn').onclick = () => {
            saveCallback(canvas.toDataURL('image/png'));
            modal.classList.add('hidden');
        };
    }
};