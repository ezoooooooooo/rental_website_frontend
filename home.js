/**
 * RentEaseApp - Main application class for the rental platform
 * Handles user authentication, listing display, search functionality, and cart operations
 */
class RentEaseApp {
    /**
     * Initialize the application
     */
    constructor() {
        this.baseUrl = 'http://localhost:3000/api';
        this.token = localStorage.getItem('token');
        
        this.initializeApp();
    }

    /**
     * Main initialization method that sets up the application
     */
    initializeApp() {
        this.checkAuthStatus();
        this.setupSearch();
        this.fetchAllListings();
    }

    // =============================================
    // AUTHENTICATION & USER MANAGEMENT
    // =============================================
    
    /**
     * Check if user is logged in and update UI accordingly
     */
    // `${this.baseUrl}/profile`
    checkAuthStatus() {
        const token = this.getToken();
        const userActions = document.querySelector('.user-actions');
    
        if (token) {
            // User is logged in - fetch profile data
            fetch(`${this.baseUrl}/profile`, {  // This URL should match your backend route
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => {
                if (!response.ok) {
                    console.error('Profile response error:', response.status);
                    throw new Error(`Failed to fetch profile: ${response.status}`);
                }
                return response.json();
            })
            .then(userData => {
                console.log('Profile data received:', userData);
                
                // Store user data for use elsewhere in the app
                this.userData = userData;
                
                // Create profile UI with actual user data
                if (userActions) {
                    userActions.innerHTML = `
                    <div class="user-profile-dropdown">
                        <button class="profile-button">
                            ${userData.profileImage 
                                ? `<img src="${userData.profileImage}" alt="Profile" class="avatar-img">` 
                                : userData.firstName 
                                    ? `<div class="avatar-initial">${userData.firstName[0]}</div>`
                                    : `<i class="ri-user-line profile-icon"></i>`
                            }
                            <span class="username">${userData.firstName || 'Profile'}</span>
                            <i class="ri-arrow-down-s-line"></i>
                        </button>
                        <div class="dropdown-menu">
                            <a href="favorite.html"><i class="ri-heart-3-line"></i> My Favorites</a>
                            <a href="./item.html"><i class="ri-shopping-bag-3-line"></i> My Items</a>
                            <a href="my-orders.html"><i class="ri-shopping-cart-2-line"></i> My Orders</a>
                            <a href="my-requests.html"><i class="ri-file-list-3-line"></i> My Requests</a>
                            <div class="dropdown-divider"></div>
                            <a href="#" onclick="favoritesManager.logout()"><i class="ri-logout-box-r-line"></i> Logout</a>
                        </div>
                    </div>
                `;
                    
                    this.setupDropdownListeners();
                }
            })
            .catch(error => {
                console.error('Profile fetch error:', error);
                
                if (userActions) {
                    userActions.innerHTML = `
                        <div class="user-profile-dropdown">
                            <button class="profile-button">
                                <div class="avatar-initial">U</div>
                                <span class="username">Profile</span>
                                <i class="ri-arrow-down-s-line"></i>
                            </button>
                            <div class="dropdown-menu">
                                <a href="./item.html"><i class="ri-shopping-bag-line"></i> My Items</a>
                                <a href="my-orders.html"><i class="ri-shopping-cart-line"></i> My Orders</a>
                                 <a href="favorite.html"><i class="ri-heart-line"></i> My Favorites</a>
                                <a href="my-requests.html"><i class="ri-file-list-line"></i> My Requests</a>
                                <div class="dropdown-divider"></div>
                                <a href="#" onclick="rentEaseApp.logout()"><i class="ri-logout-box-line"></i> Logout</a>
                            </div>
                        </div>
                    `;
                    
                    this.setupDropdownListeners();
                }
            });
        } else {
            // User not logged in - show login/signup buttons
            if (userActions) {
                userActions.innerHTML = `
                    <button class="btn btn-login" onclick="redirectToLogin()">Login</button>
                    <button class="btn btn-signup" onclick="redirectToSignup()">Sign Up</button>
                `;
            }
        }
    }
    
    
    // Extract the dropdown setup logic to avoid duplication
    setupDropdownListeners() {
        const profileButton = document.querySelector('.profile-button');
        const dropdownMenu = document.querySelector('.dropdown-menu');
        
        if (profileButton && dropdownMenu) {
            // Remove any existing listeners first to avoid duplicates
            profileButton.removeEventListener('click', this.toggleDropdown);
            
            // Define the toggle function
            this.toggleDropdown = (e) => {
                e.stopPropagation();
                dropdownMenu.classList.toggle('show');
            };
            
            // Add the listener
            profileButton.addEventListener('click', this.toggleDropdown);
            
            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                dropdownMenu.classList.remove('show');
            });
        }
    }

    /**
     * Get authentication token from local storage
     * @returns {string|null} Authentication token or null if not logged in
     */
    getToken() {
        return localStorage.getItem('token');
    }

    /**
     * Log out the current user and redirect to login page
     */
    logout() {
        localStorage.removeItem('token');
        redirectToLogin();
    }

    /**
     * Show authentication modal when user tries to access restricted features
     */
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

    /**
     * Close the authentication redirect modal
     */
    closeAuthRedirectModal() {
        const modal = document.getElementById('authRedirectModal');
        if (modal) {
            modal.remove();
        }
    }
    
    // =============================================
    // SEARCH FUNCTIONALITY
    // =============================================
    
    /**
     * Set up search input and button event listeners
     */
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
    
    /**
     * Perform search API call and update listings display
     * @param {string} searchTerm - Search term to filter listings
     */
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

    // =============================================
    // LISTINGS MANAGEMENT
    // =============================================
    
    /**
     * Fetch all listings (no search filter)
     */
    async fetchAllListings() {
        // Simply call performSearch with empty string to get all listings
        await this.performSearch('');
    }

    /**
     * Render listings in the specified container
     * @param {Array} listings - Array of listing objects to display
     * @param {HTMLElement} container - Container element to render listings in
     */
    renderListings(listings, container) {
        if (!container) return;
    
        // First, add the proper container class
        // container.className = 'listings-container';
    
        if (listings.length === 0) {
            container.innerHTML = `
                <div class="empty-listings">
                    <h3>No items found</h3>
                    <p>Try adjusting your search or browse all categories</p>
                    <button class="btn btn-cart" onclick="rentEaseApp.fetchAllListings()">View All Items</button>
                </div>
            `;
            return;
        }
    
        container.innerHTML = listings.map(listing => {
            // Ensure images are properly formatted with the full URL
            const images = listing.images && listing.images.length > 0 
                ? listing.images.map(img => img.url)
                : ['./pets.jpeg'];
            
            // Format price to 2 decimal places if needed
            const formattedPrice = parseFloat(listing.rentalRate).toFixed(2);
            
            // Truncate description if too long
            const shortDescription = listing.description.length > 120 
                ? `${listing.description.substring(0, 120)}...` 
                : listing.description;
                
            const showAddToCart = this.getToken();
            const showFavoriteButton = this.getToken();
            // Create image dots for carousel
            const imageDots = images.length > 1 
                ? `<div class="image-controls">
                    ${images.map((_, index) => 
                        `<div class="image-dot ${index === 0 ? 'active' : ''}" 
                              data-index="${index}"></div>`
                    ).join('')}
                  </div>` 
                : '';
    
            return `
            <div class="listing-card" data-id="${listing._id}">
                <div class="listing-image">
                    <div class="listing-category-tag">${listing.category}</div>
                      ${showFavoriteButton ? `
                <div class="favorite-button" onclick="event.stopPropagation(); rentEaseApp.toggleFavorite('${listing._id}', this)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="favorite-icon">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </div>` : ''
                }
                    ${images.map((imageUrl, index) => `
                        <img 
                            src="${imageUrl}" 
                            alt="${listing.name}" 
                            loading="lazy"
                            style="display: ${index === 0 ? 'block' : 'none'};"
                            onerror="this.onerror=null; this.src='./pets.jpeg';"
                        >
                    `).join('')}
                    ${imageDots}
                </div>
                <div class="listing-details">
                    <h3>${listing.name}</h3>
                    <p class="listing-category">${listing.category}</p>
                    <p class="listing-price">${formattedPrice}</p>
                    <p class="listing-description">${shortDescription}</p>
                    ${showAddToCart ? `
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
    
        // Setup image carousel and event listeners after rendering
        this.setupListingImageCarousel();
        this.setupImageDotControls();
        this.initCategoryFilters();
        this.checkFavoriteStatus();
    }
    // Add these methods to your class


/**
 * Toggle favorite status for a listing
 * @param {string} listingId - ID of the listing to toggle favorite status
 * @param {HTMLElement} buttonElement - The favorite button element that was clicked
 */
async toggleFavorite(listingId, buttonElement) {
    const token = this.getToken();
    
    if (!token) {
        this.showErrorMessage('Please log in to add items to favorites');
        return;
    }

    try {
        const isFavorite = buttonElement.classList.contains('active');
        
        if (isFavorite) {
            // Remove from favorites
            const response = await fetch(`${this.baseUrl}/favorites/remove/${listingId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Error removing from favorites');
            }
            
            buttonElement.classList.remove('active');
            const favoriteIcon = buttonElement.querySelector('.favorite-icon');
            if (favoriteIcon) {
                favoriteIcon.setAttribute('fill', 'none');
            }
            
            this.showMessage('Removed from favorites');
            
        } else {
            // Add to favorites
            const response = await fetch(`${this.baseUrl}/favorites/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    listingId
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Error adding to favorites');
            }
            
            buttonElement.classList.add('active');
            const favoriteIcon = buttonElement.querySelector('.favorite-icon');
            if (favoriteIcon) {
                favoriteIcon.setAttribute('fill', '#6c5ce7');
            }
            
            this.showMessage('Added to favorites');
        }
        
    } catch (error) {
        console.error('🚨 Error updating favorites:', error);
        this.showErrorMessage(error.message || 'Error updating favorites');
    }
}
/**
 * Check favorite status for all listings on the page
 */
async checkFavoriteStatus() {
    if (!this.getToken()) return;
    
    const listingCards = document.querySelectorAll('.listing-card');
    
    for (const card of listingCards) {
        const listingId = card.dataset.id;
        if (!listingId) continue;
        
        try {
            const response = await fetch(`${this.baseUrl}/favorites/check/${listingId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const favoriteButton = card.querySelector('.favorite-button');
                
                if (favoriteButton && data.isFavorite) {
                    favoriteButton.classList.add('active');
                    const favoriteIcon = favoriteButton.querySelector('.favorite-icon');
                    if (favoriteIcon) {
                        favoriteIcon.setAttribute('fill', '#6c5ce7');
                    }
                }
            }
        } catch (error) {
            console.error('Error checking favorite status:', error);
        }
    }
}
    setupImageDotControls() {
        const listingCards = document.querySelectorAll('.listing-card');
        
        listingCards.forEach(card => {
            const images = card.querySelectorAll('.listing-image img');
            const dots = card.querySelectorAll('.image-dot');
            
            if (images.length <= 1 || dots.length === 0) return;
            
            dots.forEach(dot => {
                dot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // Hide all images
                    images.forEach(img => img.style.display = 'none');
                    
                    // Remove active class from all dots
                    dots.forEach(d => d.classList.remove('active'));
                    
                    // Show selected image
                    const index = parseInt(dot.dataset.index);
                    images[index].style.display = 'block';
                    
                    // Add active class to selected dot
                    dot.classList.add('active');
                });
            });
        });
    }
    /**
     * Set up image carousel for listings with multiple images
     */
    setupListingImageCarousel() {
        const listingsContainer = document.getElementById('listingsContainer');
        
        if (!listingsContainer) return;

        const listingCards = listingsContainer.querySelectorAll('.listing-card');
        
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
    }

    /**
     * Clean up carousel intervals to prevent memory leaks
     */
    cleanUpListingCarousels() {
        const listingsContainer = document.getElementById('listingsContainer');
        
        if (!listingsContainer) return;

        const listingCards = listingsContainer.querySelectorAll('.listing-card');
        
        listingCards.forEach(card => {
            const intervalId = card.dataset.carouselInterval;
            if (intervalId) {
                clearInterval(intervalId);
            }
        });
    }
    /**
 * Filter listings by category
 * @param {string} category - Category to filter by
 */
filterListingsByCategory(category) {
    const listingsContainer = document.getElementById('listingsContainer');
    
    if (!listingsContainer) return;
    
    const listingCards = listingsContainer.querySelectorAll('.listing-card');
    
    listingCards.forEach(card => {
        const categoryElement = card.querySelector('.listing-category');
        const itemCategory = categoryElement ? categoryElement.textContent.replace('Category: ', '') : '';
        
        if (category === 'All' || itemCategory === category) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * Initialize category filtering
 */
initCategoryFilters() {
    const categoryLinks = document.querySelectorAll('.category-link');
    
    categoryLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove 'active' class from all links
            categoryLinks.forEach(l => l.classList.remove('active'));
            
            // Add 'active' class to clicked link
            link.classList.add('active');
            
            // Get the category name
            const categoryName = link.querySelector('.category-name').textContent;
            
            // Filter listings by category
            this.filterListingsByCategory(categoryName);
        });
    });
}

    // =============================================
    // CART OPERATIONS
    // =============================================
    
    /**
     * Add an item to the user's cart
     * @param {string} listingId - ID of the listing to add to cart
     */
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

            updateCartBadgeWithAnimation();
        
        } catch (error) {
            console.error('🚨 Error adding to cart:', error);
            this.showErrorMessage(error.message || 'Error adding item to cart');
        }
    }

    // =============================================
    // ITEM MANAGEMENT
    // =============================================
    
    /**
     * Handle click on "Add Item" button
     * Shows login modal if user is not authenticated
     */
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

    // =============================================
    // UTILITY FUNCTIONS
    // =============================================
    
    /**
     * Show a message to the user (success or error)
     * @param {string} message - Message to display
     * @param {boolean} isError - Whether this is an error message
     */
    showMessage(message, isError = false) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isError ? 'error' : 'success'}`;
        messageElement.textContent = message;
        document.body.appendChild(messageElement);

        setTimeout(() => {
            messageElement.remove();
        }, 3000);
    }

    /**
     * Show an error message to the user
     * @param {string} message - Error message to display
     */
    showErrorMessage(message) {
        this.showMessage(message, true);
    }
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
    window.location.href = 'login.html';
}

/**
 * Redirect to signup page
 */
function redirectToSignup() {
    window.location.href = 'signup.html';
}

// Initialize the app
const rentEaseApp = new RentEaseApp();