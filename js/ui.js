// UI management
window.App = window.App || {};

App.UI = {
    elements: {}, 
    init() {
        this.elements.modal = document.getElementById('modal'); 
        this.elements.loader = document.getElementById('loader');
        this.elements.loaderText = document.getElementById('loader-text');
        this.elements.categoryManagerPanel = document.getElementById('category-manager-panel');
        this.elements.contributorManagerPanel = document.getElementById('contributor-manager-panel');
        this.elements.geodataModal = document.getElementById('geodata-modal');
        this.elements.editReportInfoModal = document.getElementById('edit-report-info-modal'); 
        this.elements.reportStatusBadge = document.getElementById('report-status-badge');
        this.elements.annotationModal = document.getElementById('annotation-modal');
        this.elements.observationModal = document.getElementById('observation-modal');
        this.elements.defineBoundaryBtn = document.getElementById('define-boundary-btn');
        this.elements.clearBoundaryBtn = document.getElementById('clear-boundary-btn');
    },
    showLoader(text = 'Loading...') { this.elements.loaderText.innerText = text; this.elements.loader.classList.remove('hidden'); },
    hideLoader() { this.elements.loader.classList.add('hidden'); },
    showMessage(title, message) {
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-body').innerHTML = `<p>${message.replace(/\n/g, '<br>')}</p>`;
        document.getElementById('modal-footer').innerHTML = `<button id="modal-ok-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">OK</button>`;
        this.elements.modal.classList.remove('hidden');
        document.getElementById('modal-ok-btn').onclick = () => this.elements.modal.classList.add('hidden');
    },
    showConfirm(title, message, callback) {
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-body').innerHTML = `<p>${message.replace(/\n/g, '<br>')}</p>`; 
        document.getElementById('modal-footer').innerHTML = `
            <button id="modal-cancel-btn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg">Cancel</button>
            <button id="modal-confirm-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Confirm</button>`;
        this.elements.modal.classList.remove('hidden');
        document.getElementById('modal-cancel-btn').onclick = () => this.elements.modal.classList.add('hidden');
        document.getElementById('modal-confirm-btn').onclick = () => { callback(); this.elements.modal.classList.add('hidden'); };
    },
    showPrompt(title, fields, callback, targetModalId = 'modal') { 
        let currentModal, currentModalBody, currentModalFooter;
        const quillInstances = new Map();

        if (targetModalId === 'edit-report-info-modal') {
            currentModal = this.elements.editReportInfoModal;
            currentModalBody = currentModal.querySelector('#edit-report-info-modal-body');
            currentModalFooter = currentModal.querySelector('#edit-report-info-modal-footer');
        } else if (targetModalId === 'observation-modal') {
            currentModal = this.elements.observationModal;
            currentModalBody = currentModal.querySelector('#observation-modal-body');
            currentModalFooter = currentModal.querySelector('#observation-modal-footer');
        } else {
            currentModal = this.elements.modal;
            currentModalBody = currentModal.querySelector('#modal-body');
            currentModalFooter = currentModal.querySelector('#modal-footer');
        }
        
        const titleEl = currentModal.querySelector('h3');
        if(titleEl) titleEl.innerText = title;
        
        currentModalBody.innerHTML = '';
        
        fields.forEach(field => {
            let html = '';
            const fieldWrapperDiv = document.createElement('div');
            if (field.className) fieldWrapperDiv.className = field.className;

            if (field.type === 'quill') {
                html = `<label class="block text-sm font-medium text-gray-700 mb-1">${field.label}</label><div id="quill-editor-${field.id}" class="quill-editor-container"></div>`;
            } else if (field.type === 'select') {
                const optionsHtml = field.options?.map(opt => `<option value="${opt.value}" ${opt.value == field.value ? 'selected' : ''}>${opt.label}</option>`).join('') || '';
                html = `<label for="${field.id}" class="block text-sm font-medium text-gray-700 mb-1">${field.label}</label><select id="${field.id}" class="block w-full border-gray-300 rounded-md shadow-sm mb-4 p-2 border">${optionsHtml}</select>`;
            } else if (field.type === 'images') {
                html = `<div id="images-section" class="mt-4 border-t pt-4"><h4 class="text-md font-semibold mb-2">Attached Images</h4><div id="image-list" class="space-y-2 mb-2"></div><label class="bg-green-500 hover:bg-green-600 text-white text-sm py-1 px-2 rounded cursor-pointer">Add Image<input type="file" id="image-upload-input" class="hidden" accept="image/*"></label></div>`;
            } else if (field.type === 'checkbox') {
                html = `<div class="flex items-center my-4"><input type="checkbox" id="${field.id}" ${field.value ? 'checked' : ''} class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"><label for="${field.id}" class="ml-2 block text-sm text-gray-900">${field.label}</label></div>`;
            } else if (field.type === 'date') { 
                html = `<label for="${field.id}" class="block text-sm font-medium text-gray-700 mb-1">${field.label}</label><input type="date" id="${field.id}" value="${field.value}" class="block w-full border-gray-300 rounded-md shadow-sm mb-4 p-2 border">`;
            } else if (field.type === 'file') { 
                html = `<label for="${field.id}" class="block text-sm font-medium text-gray-700 mb-1">${field.label}</label><input type="file" id="${field.id}" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" accept="${field.accept || '*/*'}">`;
            } else {
                html = `<label for="${field.id}" class="block text-sm font-medium text-gray-700 mb-1">${field.label}</label><input type="text" id="${field.id}" value="${field.value || ''}" class="block w-full border-gray-300 rounded-md shadow-sm mb-4 p-2 border">`;
            }
            fieldWrapperDiv.innerHTML = html;
            currentModalBody.appendChild(fieldWrapperDiv); 
        });

        currentModalFooter.innerHTML = `<button id="modal-cancel-btn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg">Cancel</button><button id="modal-save-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Save</button>`;
        currentModal.classList.remove('hidden'); 

        fields.filter(f => f.type === 'quill').forEach(field => {
            const editorEl = currentModalBody.querySelector(`#quill-editor-${field.id}`);
            if (editorEl) {
                const quillInstance = new Quill(editorEl, { theme: 'snow', modules: { toolbar: [['bold', 'italic', 'underline'], ['link'], [{ 'list': 'ordered'}, { 'list': 'bullet' }]] } });
                if (field.value) quillInstance.root.innerHTML = field.value;
                quillInstances.set(field.id, quillInstance);
            }
        });

        const imageField = fields.find(f => f.type === 'images');
        if (imageField) {
            let currentImages = JSON.parse(JSON.stringify(imageField.value || []));
            const imageList = currentModalBody.querySelector('#image-list');
            const renderImages = () => {
                imageList.innerHTML = '';
                currentImages.forEach((img, index) => {
                    const div = document.createElement('div');
                    div.className = 'flex items-center gap-2';
                    div.innerHTML = `<img src="${img.src}" onerror="this.src='https://placehold.co/40x40/f87171/ffffff?text=Error'" class="w-10 h-10 object-cover rounded"><input type="text" value="${img.caption || ''}" data-index="${index}" class="image-caption-input flex-grow border-gray-300 rounded-md shadow-sm p-2 border text-sm" placeholder="Caption..."><button data-index="${index}" class="remove-image-btn text-red-500 hover:text-red-700 text-lg font-bold">&times;</button>`;
                    imageList.appendChild(div);
                });
            };
            imageList.addEventListener('click', e => { if (e.target.classList.contains('remove-image-btn')) { currentImages.splice(e.target.dataset.index, 1); renderImages(); } });
            imageList.addEventListener('input', e => { if (e.target.classList.contains('image-caption-input')) { currentImages[e.target.dataset.index].caption = e.target.value; } });
            
            currentModalBody.querySelector('#image-upload-input').onchange = async e => {
                const file = e.target.files[0];
                if (!file) return;
                App.UI.showLoader('Processing Image...');
                const originalSrc = await App.Utils.readFile(file, 'dataURL');
                e.target.value = '';
                
                const croppedSrc = await App.Utils.cropAndResizeImage(originalSrc);
                App.UI.hideLoader();

                App.ImageAnnotator.init(croppedSrc, (annotatedSrc) => {
                    currentImages.push({ src: annotatedSrc, caption: '' });
                    renderImages();
                });
            };

            renderImages();
            imageField.getImages = () => currentImages;
        }
        const closeModal = () => currentModal.classList.add('hidden');
        currentModalFooter.querySelector('#modal-cancel-btn').onclick = closeModal;
        currentModalFooter.querySelector('#modal-save-btn').onclick = () => {
            const results = {};
            fields.forEach(field => {
                if (field.type === 'quill') results[field.id] = quillInstances.get(field.id)?.root.innerHTML || '';
                else if (field.type === 'images') results[field.id] = field.getImages();
                else if (field.type === 'checkbox') results[field.id] = document.getElementById(field.id).checked;
                else if (field.type === 'file') { 
                    const fileInput = document.getElementById(field.id);
                    results[field.id] = (fileInput.files && fileInput.files[0]) ? fileInput.files[0] : null; 
                }
                else results[field.id] = document.getElementById(field.id)?.value;
            });
            callback(results);
            closeModal();
        };
    },
    updateReportStatusDisplay() {
        // Ensure reportInfo and its status property exist before trying to access them
        const status = App.state.data.reportInfo?.reportStatus || 'Draft';
        const badge = this.elements.reportStatusBadge;
        badge.innerText = status;
        badge.className = 'ml-3 px-3 py-1 rounded-full text-sm font-semibold';
        switch (status) {
            case 'Draft': badge.classList.add('bg-yellow-100', 'text-yellow-800'); break;
            case 'Under Review': badge.classList.add('bg-blue-100', 'text-blue-800'); break;
            case 'Final': badge.classList.add('bg-green-100', 'text-green-800'); break;
            case 'Archived': badge.classList.add('bg-gray-100', 'text-gray-800'); break;
            default: badge.classList.add('bg-gray-100', 'text-gray-800'); break;
        }
    }
};