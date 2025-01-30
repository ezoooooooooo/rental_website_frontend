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
    
        if (addItemBtn && this.handleAddItemClick) {
            addItemBtn.addEventListener('click', (e) => this.handleAddItemClick());
        }
    
        if (closeModal && this.closeAddItemModal) {
            closeModal.addEventListener('click', (e) => this.closeAddItemModal());
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
            // Ensure multiple images or fallback
            const images = listing.images && listing.images.length > 0 
                ? listing.images.map(img => `http://localhost:3000/${img}`)
                : ['./pets.jpeg'];

            return `
            <div class="listing-card" data-id="${listing._id}">
                <div class="listing-image">
                    ${images.map((imageUrl, index) => `
                        <img 
                            src="${imageUrl}" 
                            alt="${listing.name} - Image ${index + 1}" 
                            loading="lazy"
                            style="display: ${index === 0 ? 'block' : 'none'};"
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
                            <button class="btn btn-delete" onclick="rentEaseApp.deleteListing('${listing._id}')">Delete</button>
                        </div>` : ''
                    }
                </div>
            </div>
        `}).join('');

        // Setup image carousel after rendering
        this.setupListingImageCarousel();
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
