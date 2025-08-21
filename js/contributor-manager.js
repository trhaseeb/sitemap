// Contributor Manager
window.App = window.App || {};

App.ContributorManager = {
    init() {
        // Initialize Quill editor for the 'add new' form
        App.state.quillInstances.contributorBio = new Quill('#new-contributor-bio-editor', {
            theme: 'snow',
            modules: {
                toolbar: [['bold', 'italic'], [{ 'list': 'bullet' }]]
            },
            placeholder: 'Enter a short bio for the contributor...'
        });
        this.render();
    },
    render() {
        const container = document.getElementById('contributor-list');
        container.innerHTML = '';
        if (App.state.data.contributors.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">No contributors added yet.</p>';
            return;
        }
        App.state.data.contributors.forEach((contributor, index) => {
            const div = document.createElement('div');
            div.className = 'p-3 bg-gray-50 rounded-md border border-gray-200';
            const placeholderImg = 'https://placehold.co/64x64/e2e8f0/334155?text=...';
            div.innerHTML = `
                <div class="contributor-item-display">
                    <img src="${contributor.image || placeholderImg}" alt="Contributor Image">
                    <div class="contributor-item-details">
                        <div class="flex justify-between items-start">
                            <div>
                                <span class="contributor-item-name">${contributor.name}</span>
                                ${contributor.role ? `<div class="contributor-item-role">${contributor.role}</div>` : ''}
                            </div>
                            <button data-index="${index}" class="remove-contributor-btn text-red-500 hover:text-red-700 text-xl font-bold leading-none" title="Remove Contributor">&times;</button>
                        </div>
                        ${contributor.bio ? `<div class="contributor-item-bio ql-snow"><div class="ql-editor">${contributor.bio}</div></div>` : ''}
                    </div>
                </div>`;
            container.appendChild(div);
        });
        this.addEventListeners();
    },
    addEventListeners() {
        document.querySelectorAll('#contributor-manager-content .remove-contributor-btn').forEach(btn => {
            btn.onclick = (e) => {
                const index = parseInt(e.target.dataset.index);
                App.UI.showConfirm('Remove Contributor?', `Are you sure you want to remove "${App.state.data.contributors[index].name}"?`, () => {
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
            imageDataUrl = await App.Utils.readFile(imageFile, 'dataURL');
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