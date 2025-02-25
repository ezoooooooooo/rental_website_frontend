class RentEaseApp {
    constructor() {
        this.baseUrl = 'http://localhost:3000/api';
        this.token = localStorage.getItem('token');
        this.initializeApp();
    }

    initializeApp() {
        this.setupModalInteractions();
        this.checkAuthStatus();
        this.setupListingsToggle();
        this.setupSearch();

        const token = this.getToken();
        if (token) {
            this.fetchUserListings();
            this.fetchAllListings();
        } else {
            this.fetchAllListings();
        }
    }
    handleFileUpload(event) {
        const files = event.target.files;
        console.log('Files uploaded:', files);
        // Placeholder implementation
    }
    checkAuthStatus() {
        const token = this.getToken();
        const addItemBtn = document.getElementById('addItemBtn');
        const userActions = document.querySelector('.user-actions');

        if (addItemBtn) {
            addItemBtn.style.display = 'block'; // "Add Item" button is always visible
        }

        if (token) {
            // User is logged in
            if (userActions) {
                userActions.innerHTML = `
                    <button class="btn btn-login" onclick="rentEaseApp.logout()">Logout</button>
                `;
            }
        } else {
            // User not logged in
            if (userActions) {
                userActions.innerHTML = `
                    <button class="btn btn-login" onclick="redirectToLogin()">Login</button>
                    <button class="btn btn-signup" onclick="redirectToSignup()">Sign Up</button>
                `;
            }
        }
    }
    setupSearch() {
        const searchInput = document.querySelector('.search-input');
        const searchBtn = document.querySelector('.search-btn');

        if (searchInput && searchBtn) {
            // Handle search button click
            searchBtn.addEventListener('click', () => {
                this.performSearch(searchInput.value);
            });

            // Handle enter key press
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(searchInput.value);
                }
            });

            // Optional: Real-time search as user types (with debounce)
            let debounceTimer;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.performSearch(searchInput.value);
                }, 500); // Wait 500ms after user stops typing
            });
        }
    }

    // Add this new method
    async performSearch(searchTerm) {
        const listingsContainer = document.getElementById('listingsContainer');
        
        if (!listingsContainer) return;

        try {
            // Build URL with search parameter
            const url = new URL(`${this.baseUrl}/listings`);
            if (searchTerm.trim()) {
                url.searchParams.append('search', searchTerm.trim());
            }

            const response = await fetch(url, {
                method: 'GET',
            });

            if (response.ok) {
                const listings = await response.json();
                this.renderListings(listings, listingsContainer);
            } else {
                console.error('Failed to fetch listings');
            }
        } catch (error) {
            console.error('Error performing search:', error);
        }
    }

    setupListingImageCarousel() {
        const listingsContainers = [
            document.getElementById('listingsContainer'),
            document.getElementById('userListingsContainer')
        ];

        listingsContainers.forEach(container => {
            if (!container) return;

            const listingCards = container.querySelectorAll('.listing-card');
            
            listingCards.forEach(card => {
                const images = card.querySelectorAll('.listing-image img');
                
                if (images.length <= 1) return; // No need for carousel if only one image
                
                let currentImageIndex = 0;
                
                // Hide all images except the first
                images.forEach((img, index) => {
                    img.style.display = index === 0 ? 'block' : 'none';
                });
                
                // Create carousel interval
                const carouselInterval = setInterval(() => {
                    // Hide current image
                    images[currentImageIndex].style.display = 'none';
                    
                    // Move to next image
                    currentImageIndex = (currentImageIndex + 1) % images.length;
                    
                    // Show next image
                    images[currentImageIndex].style.display = 'block';
                }, 10000); // Change image every 10 seconds
                
                // Store interval to allow potential cleanup
                card.dataset.carouselInterval = carouselInterval;
            });
        });
    }

    setupModalInteractions() {
        const addItemBtn = document.getElementById('addItemBtn');
        const addItemModal = document.getElementById('addItemModal');
        const closeModal = document.getElementById('closeModal');
        const editItemForm = document.getElementById('editItemForm');
        const closeEditModal = document.getElementById('closeEditModal');
    
        if (addItemBtn && this.handleAddItemClick) {
            addItemBtn.addEventListener('click', (e) => this.handleAddItemClick());
        }
    
        if (closeModal && this.closeAddItemModal) {
            closeModal.addEventListener('click', (e) => this.closeAddItemModal());
        }
        if (closeEditModal) {
            closeEditModal.addEventListener('click', () => this.closeEditModal());
        }
        if (editItemForm) {
            editItemForm.addEventListener('submit', (e) => this.handleEditItem(e));
        }

        // Close modal when clicking outside
        if (addItemModal) {
            addItemModal.addEventListener('click', (e) => {
                if (e.target === addItemModal) {
                    this.closeAddItemModal();
                }
            });
        }
    
        // Setup form submission
        const listItemForm = document.querySelector('.item-listing-form');
        if (listItemForm) {
            listItemForm.addEventListener('submit', (e) => this.handleItemListing(e));
        }
    
        // File upload handler
        const fileUpload = document.querySelector('.file-upload input[type="file"]');
        if (fileUpload) {
            fileUpload.addEventListener('change', (e) => this.handleFileUpload(e));
        }
    }
    async fetchAllListings() {
        // Simply call performSearch with empty string to get all listings
        await this.performSearch('');
    }

    async fetchUserListings() {
        const token = this.getToken();
        const listingsContainer = document.getElementById('userListingsContainer');

        if (!token || !listingsContainer) return;

        try {
            const response = await fetch(`${this.baseUrl}/listings/user`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const listings = await response.json();
                this.renderListings(listings, listingsContainer, true);
            } else {
                console.error('Failed to fetch user listings');
            }
        } catch (error) {
            console.error('Error fetching user listings:', error);
        }
    }

    

    renderListings(listings, container, isUserListings = false) {
        if (!container) return;

        container.innerHTML = listings.map(listing => {
            // Ensure images are properly formatted with the full URL
            const images = listing.images && listing.images.length > 0 
                ? listing.images.map(img => img.url)
                : ['./pets.jpeg'];

                const showAddToCart = !isUserListings && this.getToken();

            return `
            <div class="listing-card" data-id="${listing._id}">
                <div class="listing-image">
                    ${images.map((imageUrl, index) => `
                        <img 
                            src="${imageUrl}" 
                            alt="${listing.name} - Image ${index + 1}" 
                            loading="lazy"
                            style="display: ${index === 0 ? 'block' : 'none'};"
                            onerror="this.onerror=null; this.src='./pets.jpeg';"
                        >
                    `).join('')}
                </div>
                <div class="listing-details">
                    <h3>${listing.name}</h3>
                    <p class="listing-category">Category: ${listing.category}</p>
                    <p class="listing-price">Price: $${listing.rentalRate}/day</p>
                    <p class="listing-description">${listing.description}</p>
                    ${isUserListings ? `
                        <div class="listing-actions">
                            <button class="btn btn-edit" onclick="rentEaseApp.openEditModal('${listing._id}')">Edit</button>
                            <button class="btn btn-delete" onclick="rentEaseApp.deleteListing('${listing._id}')">Delete</button>
                        </div>` : 
                        showAddToCart ? `
                        <div class="listing-actions">
                            <button class="btn btn-cart" onclick="rentEaseApp.addToCart('${listing._id}')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="cart-icon">
                                    <circle cx="9" cy="21" r="1"></circle>
                                    <circle cx="20" cy="21" r="1"></circle>
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                </svg>
                            Add to Cart
                            </button>
                        </div>` : ''
                        
                    }
                </div>
            </div>
        `}).join('');

        // Setup image carousel after rendering
        this.setupListingImageCarousel();
    }

    async addToCart(listingId) {
        const token = this.getToken();
        
        if (!token) {
            this.showAuthRedirectModal();
            return;
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/cart`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    listingId,
                    rentalDays: 1  // Default to 1 day, will be adjustable on cart page
                })
            });
        
            const data = await response.json(); // Parse JSON instead of text
            
            if (!response.ok) {
                throw new Error(data.message || 'Error adding item to cart');
            }
            
            // Check if the item was already in the cart
            if (data.alreadyInCart) {
                this.showMessage(data.message || 'This item is already in your cart');
            } else {
                this.showMessage(data.message || 'Item added to cart');
            }
        
        } catch (error) {
            console.error('🚨 Error adding to cart:', error);
            this.showErrorMessage(error.message || 'Error adding item to cart');
        }
    }       
    handleAddItemClick() {
        const token = this.getToken();

        if (!token) {
            this.showAuthRedirectModal();
        } else {
            const addItemModal = document.getElementById('addItemModal');
            if (addItemModal) {
                addItemModal.classList.remove('hidden');
            }
        }
    }
    setupListingsToggle() {
        const allListingsBtn = document.getElementById('allListingsBtn');
        const userListingsBtn = document.getElementById('userListingsBtn');
        const listingsContainer = document.getElementById('listingsContainer');
        const userListingsContainer = document.getElementById('userListingsContainer');
    
        if (allListingsBtn && userListingsBtn) {
            allListingsBtn.addEventListener('click', () => {
                // Toggle active class on buttons
                allListingsBtn.classList.add('active');
                userListingsBtn.classList.remove('active');
    
                // Toggle visibility of containers
                listingsContainer.classList.add('active');
                userListingsContainer.classList.remove('active');
            });
    
            userListingsBtn.addEventListener('click', () => {
                // Check if user is logged in
                const token = this.getToken();
                if (!token) {
                    this.showAuthRedirectModal();
                    return;
                }
    
                // Toggle active class on buttons
                userListingsBtn.classList.add('active');
                allListingsBtn.classList.remove('active');
    
                // Toggle visibility of containers
                userListingsContainer.classList.add('active');
                listingsContainer.classList.remove('active');
            });
        }
    }
    cleanUpListingCarousels() {
        const listingsContainers = [
            document.getElementById('listingsContainer'),
            document.getElementById('userListingsContainer')
        ];

        listingsContainers.forEach(container => {
            if (!container) return;

            const listingCards = container.querySelectorAll('.listing-card');
            
            listingCards.forEach(card => {
                const intervalId = card.dataset.carouselInterval;
                if (intervalId) {
                    clearInterval(intervalId);
                }
            });
        });
    }
    
    showAuthRedirectModal() {
        // Create and show authentication redirect modal
        const modalHtml = `
            <div id="authRedirectModal" class="modal auth-redirect-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Access Restricted</h2>
                        <button class="modal-close" onclick="rentEaseApp.closeAuthRedirectModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>You need to be logged in to add an item.</p>
                        <div class="modal-actions">
                            <button class="btn btn-login" onclick="redirectToLogin()">Login</button>
                            <button class="btn btn-signup" onclick="redirectToSignup()">Sign Up</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove any existing modal first
        const existingModal = document.getElementById('authRedirectModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }


    async handleItemListing(event) {
        event.preventDefault();
    const token = this.getToken();

    if (!token) {
        alert('Please log in to add a listing');
        return;
    }

    const form = event.target;
    const nameInput = form.querySelector('input[placeholder="Enter item name"]');
    const categorySelect = form.querySelector('select');
    const rentalRateInput = form.querySelector('input[placeholder="Enter price per day"]');
    const descriptionTextarea = form.querySelector('textarea');
    const fileInput = form.querySelector('input[type="file"]');

    // Validation checks
    if (!nameInput.value.trim()) {
        alert('Please enter an item name');
        nameInput.focus();
        return;
    }

    const rentalRate = Number(rentalRateInput.value);
    if (isNaN(rentalRate) || rentalRate <= 0) {
        alert('Please enter a valid rental rate (must be a positive number)');
        rentalRateInput.focus();
        return;
    }

    const listingData = {
        name: nameInput.value.trim(),
        category: categorySelect.value,
        rentalRate: rentalRate,
        description: descriptionTextarea.value.trim(),
    };

    const formData = new FormData();

    // Append the listing data to the formData object
    formData.append('name', listingData.name);
    formData.append('category', listingData.category);
    formData.append('rentalRate', listingData.rentalRate);
    formData.append('description', listingData.description);

    // Append images (if any)
    if (fileInput.files.length > 0) {
        Array.from(fileInput.files).forEach(file => formData.append('images', file));
    }

    
        try {
            const response = await fetch(`${this.baseUrl}/listings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData // Send the formData directly without JSON stringification
            });
    
            if (response.ok) {
                this.fetchUserListings();
                this.fetchAllListings(); 
                this.closeAddItemModal();
                form.reset();
            } else {
                const errorData = await response.json();
                alert(errorData.message || 'Failed to add listing');
            }
        } catch (error) {
            console.error('Failed to add listing:', error);
            alert('Failed to add listing. Please try again.');
        }
    }
    
    async openEditModal(listingId) {
        const token = this.getToken();
        if (!token) {
            this.showAuthRedirectModal();
            return;
        }

        const loader = this.showLoadingIndicator();

        try {
            const response = await fetch(`${this.baseUrl}/listings/${listingId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch listing details');
            }

            const listing = await response.json();
            
            // Clear any existing removed images
            const removedImagesInput = document.getElementById('removedImages');
            if (removedImagesInput) {
                removedImagesInput.value = '[]';
            }

            // Reset file input
            const fileInput = document.getElementById('editItemImages');
            if (fileInput) {
                fileInput.value = '';
            }

            this.populateEditForm(listing);
            this.displayCurrentImages(listing.images);
            document.getElementById('editItemModal').classList.remove('hidden');

        } catch (error) {
            this.showErrorMessage('Error fetching listing details: ' + error.message);
        } finally {
            loader.remove();
        }
    }

    
    populateEditForm(listing) {
        const form = document.getElementById('editItemForm');
        if (!form) return;

        const fields = {
            'editItemId': listing._id,
            'editItemName': listing.name,
            'editItemCategory': listing.category,
            'editItemRate': listing.rentalRate,
            'editItemDescription': listing.description
        };

        Object.entries(fields).forEach(([id, value]) => {
            const input = form.querySelector(`#${id}`);
            if (input) input.value = value;
        });
    }
    
    
    displayCurrentImages(images) {
        const currentImagesContainer = document.getElementById('currentImages');
        if (!currentImagesContainer || !images || images.length === 0) {
            currentImagesContainer.innerHTML = '<p>No images available</p>';
            return;
        }

        currentImagesContainer.innerHTML = images.map((image, index) => {
            // Clean the image path and ensure proper URL construction
            const imageUrl = image.url || image;
            return `
                <div class="current-image-container" data-image="${imageUrl}">
                    <img 
                        src="${imageUrl}" 
                        alt="Current image ${index + 1}"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                >
                <div class="loading-container" style="display: none;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="loading-spinner">
                        <line x1="12" y1="2" x2="12" y2="6"></line>
                        <line x1="12" y1="18" x2="12" y2="22"></line>
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                        <line x1="2" y1="12" x2="6" y2="12"></line>
                        <line x1="18" y1="12" x2="22" y2="12"></line>
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                    </svg>
                </div>
                    <button type="button" class="remove-image-btn" data-image="${imageUrl}" 
                            aria-label="Remove image ${index + 1}">&times;</button>
                </div>
            `;
        }).join('');

        // Add click handlers for remove buttons
        currentImagesContainer.querySelectorAll('.remove-image-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleImageRemoval(button.dataset.image);
            });
        });
    }
    
    handleImageRemoval(imagePath) {
        // Get the input field for removed images
        const removedImagesInput = document.getElementById('removedImages');
        if (!removedImagesInput) {
            console.error('Removed images input not found');
            return;
        }

        // Parse current removed images array
        let removedImages = [];
        try {
            removedImages = JSON.parse(removedImagesInput.value || '[]');
        } catch (e) {
            console.error('Error parsing removed images:', e);
            removedImages = [];
        }

        // // Normalize the image path (replace backslashes with forward slashes)
        // const normalizedImagePath = imagePath.replace(/\\/g, '/');

        // Add the image to removed images if not already there
        if (!removedImages.includes(imagePath)) {
            removedImages.push(imagePath);
            removedImagesInput.value = JSON.stringify(removedImages);
        }

        // Remove the image container from display
        const imageContainer = document.querySelector(`.current-image-container[data-image="${imagePath}"]`);
        if (imageContainer) {
            imageContainer.remove();
        } else {
            console.error('Image container not found for path:', imagePath);
        }

        // Get the current images container
        const currentImagesContainer = document.getElementById('currentImages');
        
        // If no images remain, show the "No images" message
        const remainingImages = currentImagesContainer.querySelectorAll('.current-image-container');
    if (currentImagesContainer && remainingImages.length === 0) {
        currentImagesContainer.innerHTML = '<p>No images available</p>';
    }

        // Log the current state for debugging
        console.log('Currently removed images:', removedImages);
        console.log('Remaining image containers:', remainingImages.length);
    }

    
    async handleEditItem(event) {
        event.preventDefault();
        const token = this.getToken();
        if (!token) {
            this.showAuthRedirectModal();
            return;
        }

        const form = event.target;
        const listingId = form.querySelector('#editItemId')?.value.trim();
        
        if (!listingId) {
            this.showErrorMessage('Error: No listing ID found.');
            return;
        }

        const loader = this.showLoadingIndicator();

        try {
            // Validate form data
            const name = form.querySelector('#editItemName').value.trim();
            const category = form.querySelector('#editItemCategory').value.trim();
            const rentalRate = parseFloat(form.querySelector('#editItemRate').value);
            const description = form.querySelector('#editItemDescription').value.trim();

            if (!name || !category || isNaN(rentalRate) || !description) {
                throw new Error('Please fill in all required fields');
            }

            const formData = new FormData();
            formData.append('name', name);
            formData.append('category', category);
            formData.append('rentalRate', rentalRate);
            formData.append('description', description);

            // Handle new image uploads
            const fileInput = form.querySelector('#editItemImages');
            if (fileInput && fileInput.files.length > 0) {
                Array.from(fileInput.files).forEach(file => {
                    if (file.size > 5 * 1024 * 1024) { // 5MB limit
                        throw new Error('Image files must be less than 5MB');
                    }
                    formData.append('images', file);
                });
            }

            // Handle removed images
            const removedImagesInput = form.querySelector('#removedImages');
            if (removedImagesInput && removedImagesInput.value) {
                const removedImages = JSON.parse(removedImagesInput.value);
                if (removedImages.length > 0) {
                    // Extract just the filenames if needed by your backend
                    const removedFilenames = removedImages.map(url => {
                        try {
                            return new URL(url).pathname.split('/').pop();
                        } catch {
                            return url;
                        }
                    });
                    formData.append('removedImages', JSON.stringify(removedFilenames));
                }
            }

            const response = await fetch(`${this.baseUrl}/listings/${listingId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update listing');
            }

            // Fetch the updated listing to get the new image paths
            const updatedResponse = await fetch(`${this.baseUrl}/listings/${listingId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!updatedResponse.ok) {
                throw new Error('Failed to fetch updated listing');
            }

            const updatedListing = await updatedResponse.json();

            // Reset the file input and removed images
            if (fileInput) fileInput.value = '';
            if (removedImagesInput) removedImagesInput.value = '[]';

            // Update the images in the modal
            this.displayCurrentImages(updatedListing.images);

            // Refresh all listings
            await this.fetchUserListings();
            await this.fetchAllListings();
            
            this.showMessage('Listing updated successfully');

        } catch (error) {
            console.error('Error updating listing:', error);
            this.showErrorMessage(error.message || 'Error updating listing');
        } finally {
            loader.remove();
        }
    }

    
    checkForChanges(originalData, formData) {
        // Check text fields
        const textFieldsChanged = Object.keys(originalData).some(key => {
            const newValue = formData.get(key);
            return originalData[key].toString() !== newValue.toString();
        });
    
        // Check image changes
        const removedImages = JSON.parse(document.getElementById('removedImages').value || '[]');
        const newImages = formData.getAll('images');
    
        return textFieldsChanged || removedImages.length > 0 || newImages.length > 0;
    }
    
    showLoadingIndicator() {
        const loader = document.createElement('div');
        loader.className = 'loading-indicator';
        loader.innerHTML = '<span>Updating...</span>';
        document.body.appendChild(loader);
        return loader;
    }

    showMessage(message, isError = false) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isError ? 'error' : 'success'}`;
        messageElement.textContent = message;
        document.body.appendChild(messageElement);

        setTimeout(() => {
            messageElement.remove();
        }, 3000);
    }

    showErrorMessage(message) {
        this.showMessage(message, true);
    }
    closeEditModal() {
        const editItemModal = document.getElementById('editItemModal');
        if (editItemModal) {
            editItemModal.classList.add('hidden');
        }
    }
    async deleteListing(listingId) {
        const token = this.getToken();
    
        if (!token) {
            alert('Please log in to delete a listing');
            return;
        }
    
        try {
            const response = await fetch(`${this.baseUrl}/listings/${listingId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
    
            if (response.ok) {
                this.fetchUserListings();
                this.fetchAllListings();
            } else {
                // Add error handling to get more information
                const errorText = await response.text();
                console.error('Delete error response:', errorText);
                alert('Failed to delete listing');
            }
        } catch (error) {
            console.error('Failed to delete listing:', error);
            alert('Failed to delete listing. Please try again.');
        }
    }
    closeAddItemModal() {
        const addItemModal = document.getElementById('addItemModal');
        if (addItemModal) {
            addItemModal.classList.add('hidden');
        }
    }
    closeAuthRedirectModal() {
        const modal = document.getElementById('authRedirectModal');
        if (modal) {
            modal.remove();
        }
    }
    getToken() {
        return localStorage.getItem('token');
    }

    logout() {
        localStorage.removeItem('token');
        redirectToLogin();
    }
}


function redirectToLogin() {
    window.location.href = 'login.html'
}

function redirectToSignup() {
    window.location.href = 'signup.html';
}

// Initialize the app
const rentEaseApp = new RentEaseApp();
