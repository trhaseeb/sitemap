// Contributor Manager - Handles project contributors
window.App = window.App || {};

App.ContributorManager = {
    init() {
        // Initialize Quill editor for the 'add new' form
        const editorElement = document.getElementById('new-contributor-bio-editor');
        if (editorElement && !App.state.quillInstances.contributorBio) {
            App.state.quillInstances.contributorBio = new Quill(editorElement, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline'],
                        ['link'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }]
                    ]
                }
            });
        }
        this.render();
    },
    render() {
        const container = document.getElementById('contributor-list');
        if (!container) return;
        
        container.innerHTML = '';
        const contributors = App.state.data.contributors || [];
        
        contributors.forEach((contributor, index) => {
            const contributorDiv = document.createElement('div');
            contributorDiv.className = 'contributor-item border rounded-lg p-4 mb-4';
            
            contributorDiv.innerHTML = `
                <div class="contributor-item-display">
                    <img src="${contributor.image || 'https://placehold.co/64x64/e2e8f0/334155?text=NA'}" 
                         alt="${contributor.name}" class="contributor-image">
                    <div class="contributor-item-details">
                        <div class="contributor-item-name">${contributor.name}</div>
                        <div class="contributor-item-role">${contributor.role || 'No role specified'}</div>
                        <div class="contributor-item-bio">${contributor.bio || 'No bio provided'}</div>
                    </div>
                    <button class="text-red-500 hover:text-red-700 delete-contributor-btn" 
                            data-index="${index}">&times;</button>
                </div>
            `;
            
            container.appendChild(contributorDiv);
        });
        
        // Add delete handlers
        container.querySelectorAll('.delete-contributor-btn').forEach(btn => {
            btn.onclick = () => {
                const index = parseInt(btn.dataset.index);
                const contributor = contributors[index];
                App.UI.showConfirm('Remove Contributor?', `Are you sure you want to remove "${contributor.name}"?`, () => {
                    App.state.data.contributors.splice(index, 1);
                    this.render();
                });
            };
        });
    },
    async addContributor() {
        const nameInput = document.getElementById('new-contributor-name');
        const roleInput = document.getElementById('new-contributor-role');
        const imageInput = document.getElementById('new-contributor-image');
        
        const name = nameInput.value.trim();
        const role = roleInput.value.trim();
        const bio = App.state.quillInstances.contributorBio.root.innerHTML;
        const imageFile = imageInput.files[0];

        if (!name) {
            App.UI.showMessage('Error', 'Contributor name cannot be empty.');
            return;
        }

        if (App.state.data.contributors.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            App.UI.showMessage('Error', 'A contributor with that name already exists.');
            return;
        }

        let imageDataUrl = null;
        if (imageFile) {
            try {
                imageDataUrl = await App.Utils.readFile(imageFile, 'dataURL');
            } catch (e) {
                console.error('Error reading image file:', e);
            }
        }

        App.state.data.contributors.push({
            name,
            role,
            bio: (bio === '<p><br></p>') ? '' : bio, // Don't save empty quill content
            image: imageDataUrl
        });

        // Clear inputs
        nameInput.value = '';
        roleInput.value = '';
        imageInput.value = '';
        App.state.quillInstances.contributorBio.root.innerHTML = '';
        
        this.render();
    }
};