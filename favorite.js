class FavoritesManager {
 constructor() {
     this.baseUrl = 'http://localhost:3000/api';
     
     this.isLoading = true;
     this.token = localStorage.getItem('token');
     
     // DOM elements
     this.favoritesGrid = document.getElementById('favorites-grid');
     this.emptyFavorites = document.getElementById('empty-favorites');
     this.loadingSpinner = document.getElementById('loading-spinner');
     this.favoritesCount = document.getElementById('favorites-count');
     this.toastContainer = document.getElementById('toast-container');
     this.favorites = [];
     // Initialize
     this.init();
 }
 
 /**
  * Initialize favorites manager
  */
 async init() {
     if (!this.getToken()) {
         window.location.href = 'login.html';
         return;
     }
     
     // Check auth status and update UI
     this.checkAuthStatus();
     
     // Load favorites
     try {
      // Simulate fetching favorites data
      
      
      // Update UI
      this.updateFavoritesCount();
      this.renderFavorites();
      
      // Hide loading spinner
      if (this.loadingSpinner) {
          this.loadingSpinner.style.display = 'none';
      }
      
      // Show appropriate content
      if (this.favorites.length > 0) {
          this.favoritesGrid.style.display = 'grid';
      } else if (this.emptyFavorites) {
          this.emptyFavorites.style.display = 'block';
      }
  } catch (error) {
      console.error('Error initializing favorites:', error);
      this.showToast('Error loading favorites. Please try again.', 'error');
      
      // Hide loading spinner and show empty state on error
      if (this.loadingSpinner) {
          this.loadingSpinner.style.display = 'none';
      }
      if (this.emptyFavorites) {
          this.emptyFavorites.style.display = 'block';
      }
  }
     await this.loadFavorites();
     
     // Set up event listeners for dropdown
     this.setupDropdownListeners();
 }
 
 /**
  * Get authentication token from localStorage
  * @returns {string|null} Authentication token
  */
 getToken() {
     return localStorage.getItem('token');
 }
 
 /**
  * Check if user is authenticated
  * @returns {boolean} True if authenticated
  */
 isAuthenticated() {
     return !!this.getToken();
 }
 
 /**
  * Check authentication status and update UI accordingly
  */
 checkAuthStatus() {
     const token = this.getToken();
     const userActions = document.querySelector('.user-actions');
 
     if (token) {
         // User is logged in - fetch profile data
         fetch(`${this.baseUrl}/profile`, {
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
                        <a href="#" data-action="logout"><i class="ri-logout-box-r-line"></i> Logout</a>
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
                         <button class="pill-profile-button">
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
  * Load favorites from API
  */
 async loadFavorites() {
     this.isLoading = true;
     this.showLoading();
     
     try {
         const response = await fetch(`${this.baseUrl}/favorites/my-favorites`, {
             method: 'GET',
             headers: {
                 'Authorization': `Bearer ${this.getToken()}`
             }
         });
         
         if (!response.ok) {
             throw new Error('Failed to fetch favorites');
         }
         
         const data = await response.json();
         this.favorites = data.favorites || [];
         
         // Update count
         this.updateFavoritesCount();
         
         // Render favorites
         this.renderFavorites();
     } catch (error) {
         console.error('Error loading favorites:', error);
         this.showToast('Error loading favorites', 'error');
         this.favorites = [];
         this.renderFavorites();
     } finally {
         this.isLoading = false;
         this.hideLoading();
     }
 }
 
 /**
  * Update favorites count in UI
  */
 updateFavoritesCount() {
     if (this.favoritesCount) {
         const count = this.favorites.length;
         this.favoritesCount.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
     }
 }
 
 /**
  * Show loading spinner
  */
 showLoading() {
     if (this.loadingSpinner) {
         this.loadingSpinner.style.display = 'flex';
     }
     if (this.favoritesGrid) {
         this.favoritesGrid.style.display = 'none';
     }
     if (this.emptyFavorites) {
         this.emptyFavorites.style.display = 'none';
     }
 }
 
 /**
  * Hide loading spinner
  */
 hideLoading() {
     if (this.loadingSpinner) {
         this.loadingSpinner.style.display = 'none';
     }
 }
 
 /**
  * Render favorites in the grid
  */
 renderFavorites() {
     if (!this.favoritesGrid) return;
     
     // Clear grid
     this.favoritesGrid.innerHTML = '';
     
     if (this.favorites.length === 0) {
         // Show empty state
         if (this.emptyFavorites) {
             this.emptyFavorites.style.display = 'block';
         }
         return;
     }
     
     // Show grid and hide empty state
     this.favoritesGrid.style.display = 'grid';
     if (this.emptyFavorites) {
         this.emptyFavorites.style.display = 'none';
     }
     
     // Create card for each favorite
     for (const favorite of this.favorites) {
         const listing = favorite.listing;
         if (!listing) continue;
         
         const card = this.createListingCard(listing, favorite._id);
         this.favoritesGrid.appendChild(card);
     }
     
     // Setup image carousel and event listeners after rendering
     this.setupListingImageCarousel();
 }
 
 /**
  * Create a listing card element
  * @param {Object} listing - Listing data
  * @param {string} favoriteId - Favorite ID
  * @returns {HTMLElement} Listing card element
  */
 createListingCard(listing, favoriteId) {
     const card = document.createElement('div');
     card.className = 'listing-card';
     card.dataset.id = listing._id;
     card.dataset.favoriteId = favoriteId;
     
     // Format images correctly
     const images = listing.images && listing.images.length > 0 
         ? listing.images.map(img => img.url || img)
         : ['./pets.jpeg'];
         
     // Format price to 2 decimal places if needed
     const formattedPrice = parseFloat(listing.rentalRate).toFixed(2);
     
     // Truncate description if too long
     const shortDescription = listing.description && listing.description.length > 120 
         ? `${listing.description.substring(0, 120)}...` 
         : (listing.description || 'No description available');
         
     // Create image dots for carousel
     const imageDots = images.length > 1 
         ? `<div class="image-controls">
             ${images.map((_, index) => 
                 `<div class="image-dot ${index === 0 ? 'active' : ''}" 
                       data-index="${index}"></div>`
             ).join('')}
           </div>` 
         : '';
     
     card.innerHTML = `
         <div class="listing-image">
             <div class="listing-category-tag">${listing.category || 'Uncategorized'}</div>
             <div class="favorite-button active" onclick="event.stopPropagation(); favoritesManager.removeFavorite('${listing._id}', this)">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#6c5ce7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="favorite-icon">
                     <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                 </svg>
             </div>
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
             <p class="listing-category">${listing.category || 'Uncategorized'}</p>
             <p class="listing-price">${formattedPrice}</p>
             <p class="listing-description">${shortDescription}</p>
             <div class="listing-actions">
                 <button class="btn btn-cart" onclick="favoritesManager.addToCart('${listing._id}')">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="cart-icon">
                         <circle cx="9" cy="21" r="1"></circle>
                         <circle cx="20" cy="21" r="1"></circle>
                         <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                     </svg>
                     Add to Cart
                 </button>
             </div>
         </div>
     `;
     
     return card;
 }
 
 /**
  * Set up image carousel for listings with multiple images
  */
 setupListingImageCarousel() {
     const listingCards = document.querySelectorAll('.listing-card');
     
     listingCards.forEach(card => {
         const images = card.querySelectorAll('.listing-image img');
         const dots = card.querySelectorAll('.image-dot');
         
         // Set up image dot controls
         if (images.length > 1 && dots.length > 0) {
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
         }
         
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
             
             // Update dots
             if (dots.length > 0) {
                 dots.forEach((dot, index) => {
                     dot.classList.toggle('active', index === currentImageIndex);
                 });
             }
             
         }, 10000); // Change image every 10 seconds
         
         // Store interval to allow potential cleanup
         card.dataset.carouselInterval = carouselInterval;
     });
 }
 
 /**
  * Clean up carousel intervals to prevent memory leaks
  */
 cleanUpListingCarousels() {
     const listingCards = document.querySelectorAll('.listing-card');
     
     listingCards.forEach(card => {
         const intervalId = card.dataset.carouselInterval;
         if (intervalId) {
             clearInterval(intervalId);
         }
     });
 }
 
 /**
  * Remove a listing from favorites
  * @param {string} listingId - Listing ID
  * @param {HTMLElement} buttonElement - Button element
  */
 async removeFavorite(listingId, buttonElement) {
     const token = this.getToken();
     
     if (!token) {
         this.showToast('Please log in to manage favorites', 'error');
         return;
     }
     
     try {
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
         
         // Find the card parent element
         const card = buttonElement.closest('.listing-card');
         
         // Remove with fade-out animation
         if (card) {
             card.style.opacity = '0';
             card.style.transform = 'scale(0.8)';
             card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
             
             setTimeout(() => {
                 card.remove();
                 
                 // Update favorites array
                 this.favorites = this.favorites.filter(fav => 
                     fav.listing && fav.listing._id !== listingId
                 );
                 
                 // Update count
                 this.updateFavoritesCount();
                 
                 // Check if we now have empty state
                 if (this.favorites.length === 0) {
                     if (this.emptyFavorites) {
                         this.emptyFavorites.style.display = 'block';
                     }
                     if (this.favoritesGrid) {
                         this.favoritesGrid.style.display = 'none';
                     }
                 }
             }, 300);
         }
         
         this.showToast('Removed from favorites', 'success');
         
     } catch (error) {
         console.error('Error removing favorite:', error);
         this.showToast(error.message || 'Error removing from favorites', 'error');
     }
 }
 
 /**
  * Add a listing to cart
  * @param {string} listingId - Listing ID
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
         
         const data = await response.json();
         
         if (!response.ok) {
             throw new Error(data.message || 'Error adding item to cart');
         }
         
         // Check if the item was already in the cart
         if (data.alreadyInCart) {
             this.showToast(data.message || 'This item is already in your cart', 'success');
         } else {
             this.showToast(data.message || 'Item added to cart', 'success');
         }
         updateCartBadgeWithAnimation();
         
     } catch (error) {
         console.error('Error adding to cart:', error);
         this.showToast(error.message || 'Error adding to cart', 'error');
     }
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
                     <button class="modal-close" onclick="favoritesManager.closeAuthRedirectModal()">&times;</button>
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
 
 /**
  * Show a toast notification
  * @param {string} message - Message to display
  * @param {string} type - Type of toast (success or error)
  */
 showToast(message, type = 'success') {
     // Check if notification container exists, create if not
     let toastContainer = document.getElementById("toast-container");
     if (!toastContainer) {
         toastContainer = document.createElement("div");
         toastContainer.id = "toast-container";
         toastContainer.className = "notification-container";
         document.body.appendChild(toastContainer);
     }
     
     // Create toast element
     const toast = document.createElement("div");
     toast.className = `notification ${type}`;
     
     // Set icon based on type
     const icon = type === "success" 
         ? '<i class="ri-check-line notification-icon"></i>' 
         : '<i class="ri-error-warning-line notification-icon"></i>';
     
     // Create toast content
     toast.innerHTML = `
         ${icon}
         <div class="notification-content">
             <div class="notification-message">${message}</div>
         </div>
         <button class="notification-close">&times;</button>
     `;
     
     // Add to container
     toastContainer.appendChild(toast);
     
     // Trigger animation
     setTimeout(() => toast.classList.add("show"), 10);
     
     // Add event listener to close button
     const closeBtn = toast.querySelector(".notification-close");
     closeBtn.addEventListener("click", () => {
         toast.classList.remove("show");
         setTimeout(() => toast.remove(), 300);
     });
     
     // Auto remove after 5 seconds
     setTimeout(() => {
         if (document.body.contains(toast)) {
             toast.classList.remove("show");
             setTimeout(() => toast.remove(), 300);
         }
     }, 5000);
 }
 
 /**
  * Show a message (uses same method as RentEaseApp for consistency)
  * @param {string} message - Message to display
  * @param {boolean} isError - Whether this is an error message
  */
 showMessage(message, isError = false) {
     this.showToast(message, isError ? 'error' : 'success');
 }
 
 /**
  * Show an error message
  * @param {string} message - Error message to display
  */
 showErrorMessage(message) {
     this.showMessage(message, true);
 }
 
 /**
  * Logout user
  */
 logout() {
     localStorage.removeItem('token');
     localStorage.removeItem('user');
     window.location.href = 'login.html';
 }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
 window.favoritesManager = new FavoritesManager();
 
 // Make showToast available globally
 window.showToast = (message, type) => window.favoritesManager.showToast(message, type);
});

// Helper functions for redirect
function redirectToLogin() {
 window.location.href = 'login.html';
}

function redirectToSignup() {
 window.location.href = 'signup.html';
}