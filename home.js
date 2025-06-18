/**
 * RentEaseApp - Main application class for the rental platform
 * Handles user authentication, listing display, search functionality, and cart operations
 */
class RentEaseApp {
  /**
   * Initialize the application
   */
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");

    this.initializeApp();
  }

  /**
   * Main initialization method that sets up the application
   */
  initializeApp() {
    this.checkAuthStatus();
    this.setupSearch();
    this.fetchAllListings();
    this.setupCategoryNavigation();
  }
  
  /**
   * Setup category navigation with arrow buttons
   */
  setupCategoryNavigation() {
    const leftArrow = document.getElementById('categoryNavLeft');
    const rightArrow = document.getElementById('categoryNavRight');
    const categoryContainer = document.getElementById('categoryContainer');
    
    if (!leftArrow || !rightArrow || !categoryContainer) return;
    
    // Set initial visibility of arrows
    this.updateCategoryArrowsVisibility();
    
    // Add event listeners to arrows
    leftArrow.addEventListener('click', () => {
      // Scroll left by 300px
      categoryContainer.scrollBy({ left: -300, behavior: 'smooth' });
    });
    
    rightArrow.addEventListener('click', () => {
      // Scroll right by 300px
      categoryContainer.scrollBy({ left: 300, behavior: 'smooth' });
    });
    
    // Update arrow visibility on scroll
    categoryContainer.addEventListener('scroll', () => {
      this.updateCategoryArrowsVisibility();
    });
    
    // Update arrow visibility on window resize
    window.addEventListener('resize', () => {
      this.updateCategoryArrowsVisibility();
    });
  }
  
  /**
   * Update the visibility of category navigation arrows based on scroll position
   */
  updateCategoryArrowsVisibility() {
    const leftArrow = document.getElementById('categoryNavLeft');
    const rightArrow = document.getElementById('categoryNavRight');
    const categoryContainer = document.getElementById('categoryContainer');
    
    if (!leftArrow || !rightArrow || !categoryContainer) return;
    
    // Hide left arrow if at the beginning
    leftArrow.style.display = categoryContainer.scrollLeft <= 10 ? 'none' : 'flex';
    
    // Hide right arrow if at the end
    const isAtEnd = categoryContainer.scrollLeft + categoryContainer.clientWidth >= categoryContainer.scrollWidth - 10;
    rightArrow.style.display = isAtEnd ? 'none' : 'flex';
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
    const userActions = document.querySelector(".user-actions");

    if (token) {
      // User is logged in - fetch profile data
      fetch(`${this.baseUrl}/profile`, {
        // This URL should match your backend route
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            console.error("Profile response error:", response.status);
            throw new Error(`Failed to fetch profile: ${response.status}`);
          }
          return response.json();
        })
        .then((userData) => {
          console.log("Profile data received:", userData);

          // Store user data for use elsewhere in the app
          this.userData = userData;

          // Create profile UI with actual user data
          if (userActions) {
            userActions.innerHTML = `
                    <div class="user-profile-dropdown">
                        <button class="profile-button">
                            ${
                              userData.profileImage
                                ? `<img src="${userData.profileImage}" alt="Profile" class="avatar-img">`
                                : userData.firstName
                                ? `<div class="avatar-initial">${userData.firstName[0]}</div>`
                                : `<i class="ri-user-line profile-icon"></i>`
                            }
                            <span class="username">${
                              userData.firstName || "Profile"
                            }</span>
                            <i class="ri-arrow-down-s-line"></i>
                        </button>
                        <div class="dropdown-menu">
                            <a href="favorite.html"><i class="ri-heart-3-line"></i> My Favorites</a>
                            <a href="./item.html"><i class="ri-shopping-bag-3-line"></i> My Items</a>
                            <a href="my-orders.html"><i class="ri-shopping-cart-2-line"></i> My Orders</a>
                            <a href="my-requests.html"><i class="ri-file-list-3-line"></i> Requests</a>
                            <div class="dropdown-divider"></div>
                            <a href="#" onclick="rentEaseApp.logout()"><i class="ri-logout-box-r-line"></i> Logout</a>
                        </div>
                    </div>
                `;

            this.setupDropdownListeners();
          }
        })
        .catch((error) => {
          console.error("Profile fetch error:", error);

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
                                <a href="my-requests.html"><i class="ri-file-list-line"></i> Requests</a>
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
    const profileButton = document.querySelector(".profile-button");
    const dropdownMenu = document.querySelector(".dropdown-menu");

    if (profileButton && dropdownMenu) {
      // Remove any existing listeners first to avoid duplicates
      profileButton.removeEventListener("click", this.toggleDropdown);

      // Define the toggle function
      this.toggleDropdown = (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle("show");
      };

      // Add the listener
      profileButton.addEventListener("click", this.toggleDropdown);

      // Close dropdown when clicking outside
      document.addEventListener("click", () => {
        dropdownMenu.classList.remove("show");
      });
    }
  }

  /**
   * Get authentication token from local storage
   * @returns {string|null} Authentication token or null if not logged in
   */
  getToken() {
    return localStorage.getItem("token");
  }

  /**
   * Log out the current user and redirect to login page
   */
  logout() {
    localStorage.removeItem("token");
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
    const existingModal = document.getElementById("authRedirectModal");
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML("beforeend", modalHtml);
  }

  /**
   * Close the authentication redirect modal
   */
  closeAuthRedirectModal() {
    const modal = document.getElementById("authRedirectModal");
    if (modal) {
      modal.remove();
    }
  }

  /**
   * Get the current user ID from the JWT token
   * @returns {string|null} User ID or null if not logged in
   */
  getUserId() {
    const token = this.getToken();
    if (!token) return null;

    try {
      // JWT tokens are in format: header.payload.signature
      // We need to decode the payload (second part)
      const payload = token.split(".")[1];
      // Decode base64
      const decodedPayload = JSON.parse(atob(payload));
      // Return user ID from token
      return (
        decodedPayload.userId || decodedPayload.id || decodedPayload.sub || null
      );
    } catch (error) {
      console.error("Error extracting user ID from token:", error);
      return null;
    }
  }

  /**
   * Check if user is logged in
   * @returns {boolean} True if user is logged in
   */
  isLoggedIn() {
    return !!this.getToken();
  }

  // =============================================
  // SEARCH FUNCTIONALITY
  // =============================================

  /**
   * Set up search input and button event listeners
   */
  setupSearch() {
    const searchInput = document.querySelector(".search-input");
    const searchBtn = document.querySelector(".search-btn");

    if (searchInput && searchBtn) {
      // Handle search button click
      searchBtn.addEventListener("click", () => {
        this.performSearch(searchInput.value);
      });

      // Handle enter key press
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.performSearch(searchInput.value);
        }
      });

      // Optional: Real-time search as user types (with debounce)
      let debounceTimer;
      searchInput.addEventListener("input", () => {
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
    const listingsContainer = document.getElementById("listingsContainer");

    if (!listingsContainer) return;

    try {
      // Build URL with search parameter
      const url = new URL(`${this.baseUrl}/listings`);
      if (searchTerm.trim()) {
        url.searchParams.append("search", searchTerm.trim());
      }

      const response = await fetch(url, {
        method: "GET",
      });

      if (response.ok) {
        const listings = await response.json();

        // Fetch ratings for listings if needed
        await this.fetchRatingsForListings(listings);

        // Sort listings to prioritize featured items first
        const sortedListings = this.sortListingsByPriority(listings);

        this.renderListings(sortedListings, listingsContainer);
      } else {
        console.error("Failed to fetch listings");
      }
    } catch (error) {
      console.error("Error performing search:", error);
    }
  }

  /**
   * Fetch ratings for each listing
   * @param {Array} listings - Array of listing objects
   */
  async fetchRatingsForListings(listings) {
    if (!listings || !listings.length) return;

    console.log("Fetching ratings for listings:", listings.length);

    // Get current user ID if logged in
    const currentUserId = this.getUserId();
    console.log("Current user ID:", currentUserId);

    // Use Promise.all to fetch ratings in parallel
    const ratingPromises = listings.map(async (listing) => {
      if (!listing._id) return;

      try {
        // Fetch item ratings
        const response = await fetch(
          `${this.baseUrl}/ratings/listing/${listing._id}`
        );

        if (response.ok) {
          const ratingData = await response.json();
          console.log(
            `Full rating data for ${listing._id}:`,
            JSON.stringify(ratingData, null, 2)
          );

          // Attach rating data to the listing object
          listing.rating = ratingData;

          // Check if current user has rated this item
          if (
            currentUserId &&
            ratingData.data &&
            Array.isArray(ratingData.data)
          ) {
            console.log(`Looking for user rating in data:`, ratingData.data);
            const userRating = ratingData.data.find(
              (r) => r.user && r.user._id === currentUserId
            );
            if (userRating) {
              console.log(`Found user rating:`, userRating);
              listing.userRating = {
                id: userRating._id,
                score: userRating.score,
                comment: userRating.comment || "",
              };
              console.log(
                `User has rated listing ${listing._id}:`,
                listing.userRating
              );
            } else {
              console.log(`No user rating found for listing ${listing._id}`);
            }
          } else {
            console.log(
              `No rating data or invalid format for listing ${listing._id}`
            );
          }
        } else {
          console.log(
            `No ratings found for listing ${listing._id} - using mock data`
          );
          listing.rating = this.generateMockRatingData(listing._id);
        }
      } catch (error) {
        console.error(
          `Error fetching rating for listing ${listing._id}:`,
          error
        );
        listing.rating = this.generateMockRatingData(listing._id);
      }
    });

    // Wait for all rating requests to complete
    await Promise.all(ratingPromises);
  }

  /**
   * Sort listings by priority: Featured first, then by rating, then by date
   * @param {Array} listings - Array of listing objects
   * @returns {Array} Sorted listings array
   */
  sortListingsByPriority(listings) {
    return listings.sort((a, b) => {
      // First priority: Featured status (featured listings come first)
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;

      // Second priority: Average rating (higher ratings first)
      const aRating = a.rating?.averageScore || a.rating?.average || 0;
      const bRating = b.rating?.averageScore || b.rating?.average || 0;
      if (aRating !== bRating) return bRating - aRating;

      // Third priority: Creation date (newer first) - fallback if ratings are equal
      const aDate = new Date(a.createdAt || a.dateAdded || 0);
      const bDate = new Date(b.createdAt || b.dateAdded || 0);
      return bDate - aDate;
    });
  }

  /**
   * Generate mock rating data for testing purposes
   * @param {string} listingId - The listing ID
   * @returns {Object} Mock rating data
   */
  generateMockRatingData(listingId) {
    // Use the last character of the ID to seed a somewhat random rating
    const lastChar = listingId.charAt(listingId.length - 1);
    const seed = parseInt(lastChar, 16) || 5; // Convert to number, default to 5

    // Generate a score between 3 and 5 with decimal
    const baseScore = 3 + (seed % 3) * 0.5;

    // Generate count between 0 and 15
    const count = seed % 16;

    // Create a distribution object
    const distribution = {};
    for (let i = 1; i <= 5; i++) {
      distribution[i] = Math.floor((seed + i) % 8);
    }

    // Ensure the distribution adds up to count
    const totalDist = Object.values(distribution).reduce(
      (sum, val) => sum + val,
      0
    );
    if (totalDist !== count && count > 0) {
      // Adjust the distribution to match count
      const diff = count - totalDist;
      distribution[5] += diff;
    }

    return {
      success: true,
      count: count,
      data: [],
      averageScore: baseScore,
      distribution: distribution,
    };
  }

  // =============================================
  // LISTINGS MANAGEMENT
  // =============================================

  /**
   * Fetch all listings (no search filter)
   */
  async fetchAllListings() {
    // Simply call performSearch with empty string to get all listings
    await this.performSearch("");
  }

  /**
   * Generate star rating HTML
   * @param {number} rating - Rating value (0-5)
   * @param {string} listingId - ID of the listing
   * @returns {string} HTML for star rating
   */
  generateStarRating(rating, listingId) {
    if (!rating) return "";

    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    let html = '';

    // Add full stars first
    for (let i = 0; i < fullStars; i++) {
      html += '<i class="ri-star-fill" style="color: var(--star-filled);"></i>';
    }

    // Add half star if needed
    if (halfStar) {
      html +=
        '<i class="ri-star-half-fill" style="color: var(--star-filled);"></i>';
    }

    // Add empty stars last
    for (let i = 0; i < emptyStars; i++) {
      html += '<i class="ri-star-line" style="color: var(--star-empty);"></i>';
    }

    return html;
  }

  /**
   * Render listings in the specified container
   * @param {Array} listings - Array of listing objects to display
   * @param {HTMLElement} container - Container element to render listings in
   */
  renderListings(listings, container) {
    if (!container) return;

    if (listings.length === 0) {
      container.innerHTML = `
        <div class="empty-listings">
          <h3>No items found</h3>
          <p>Try adjusting your search or browse all categories</p>
        </div>
      `;
      return;
    }

    container.innerHTML = listings
      .map((listing) => {
        const images =
          listing.images && listing.images.length > 0
            ? listing.images.map
              ? listing.images.map((img) => img.url || img)
              : listing.images
            : ["./pets.jpeg"];
        let formattedPrice = listing.price || listing.rentalRate || 0;
        if (typeof formattedPrice === "string") {
          formattedPrice = formattedPrice.replace(/[^\d.]/g, "");
        }
        formattedPrice = `$${parseFloat(formattedPrice).toFixed(2)}`;
        const shortDescription =
          listing.description && listing.description.length > 120
            ? `${listing.description.substring(0, 120)}...`
            : listing.description || "";
        const showFavoriteButton = this.getToken();
        const imageDots =
          images.length > 1
            ? `<div class="image-controls">
                ${images
                  .map(
                    (_, index) =>
                      `<div class="image-dot ${
                        index === 0 ? "active" : ""
                      }" data-index="${index}"></div>`
                  )
                  .join("")}
              </div>`
            : "";
        // Calculate the average score from the rating data
        let averageScore = 0;
        if (listing.rating && listing.rating.data && listing.rating.data.length > 0) {
          // Calculate average from the actual rating data
          const sum = listing.rating.data.reduce((total, rating) => total + rating.score, 0);
          averageScore = sum / listing.rating.data.length;
        } else if (listing.rating) {
          // Fallback to any provided average
          averageScore = listing.rating.averageScore || listing.rating.average || 0;
        }
        const reviewCount = listing.rating ? listing.rating.count || 0 : 0;
        const isTopRated = averageScore >= 4.5 && reviewCount >= 3;
        const topRatedBadge = isTopRated
          ? `<div class="top-rated-badge">⭐ Top Rated</div>`
          : "";

        // Featured badge for promoted listings
        const featuredBadge = listing.featured
          ? `<div class="featured-badge">⭐ Featured</div>`
          : "";

        // Calculate rating breakdown percentages
        let highRatingPercentage = 0;
        if (reviewCount > 0 && listing.rating && listing.rating.distribution) {
          const distribution = listing.rating.distribution;
          const highRatings =
            (distribution["5"] || 0) + (distribution["4"] || 0);
          highRatingPercentage = Math.round((highRatings / reviewCount) * 100);
        }

        // Check if user has rated this item
        const hasUserRated = !!listing.userRating;

        // Using SVG stars instead of Remix icons for better color control
        // Adding support for half stars
        const generateStarSVG = (value) => {
          // Full star
          if (value >= 1) {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#f1c40f" stroke="#f1c40f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="star-svg">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>`;
          }
          // Half star
          else if (value >= 0.5) {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="star-svg half-star">
              <defs>
                <linearGradient id="halfGradient${value}" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="50%" stop-color="#f1c40f" />
                  <stop offset="50%" stop-color="#ecf0f1" stop-opacity="0" />
                </linearGradient>
              </defs>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="url(#halfGradient${value})" stroke="#f1c40f" stroke-width="1.5" />
            </svg>`;
          }
          // Empty star
          else {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ecf0f1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="star-svg">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>`;
          }
        };
        
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
          // Calculate the star value (0, 0.5, or 1)
          const starValue = Math.max(0, Math.min(1, averageScore - (i - 1)));
          starsHtml += generateStarSVG(starValue);
        }
        
        const ratingDisplay = `
          <div class="product-rating">
            <div class="star-rating ${hasUserRated ? "user-rated" : ""}" 
                data-listing-id="${listing._id}" 
                data-user-rating="${hasUserRated ? listing.userRating.score : "0"}"
                ${hasUserRated ? `data-rating-id="${listing.userRating.id}" data-user-comment="${listing.userRating.comment || ""}"` : ""}
                title="Average rating: ${averageScore.toFixed(1)}"
                onclick="rentEaseApp.showRatingDialog(event, this)">
              ${starsHtml}
            </div>
            <span class="review-count">(${reviewCount})</span>
          </div>
        `;

        // Check if the item is reserved or rented
        const statusLabel = listing.status && (listing.status === 'reserved' || listing.status === 'rented') ? 
          `<div class="status-label ${listing.status}">${listing.status === 'reserved' ? 'Reserved' : 'Rented'}</div>` : 
          '';
          
        return `
          <div class="listing-card" data-id="${
            listing._id
          }" data-rating="${averageScore}">
            <div class="listing-image" style="position: relative;">
              <img src="${images[0]}" alt="${
          listing.name
        }" loading="lazy" onerror="this.onerror=null; this.src='./pets.jpeg';">
              ${imageDots}
              ${featuredBadge}
              ${topRatedBadge}
              ${statusLabel}
              ${
                showFavoriteButton
                  ? `<div class="favorite-button${
                      listing.isFavorite ? " active" : ""
                    }" onclick="event.stopPropagation(); rentEaseApp.toggleFavorite('${
                      listing._id
                    }', this)">
                    <svg class='favorite-icon' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
                      <path d='M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'></path>
                    </svg>
                   </div>`
                  : ""
              }
            </div>
            <div class="listing-details">
              <h3>${listing.name}</h3>
              <p class="listing-category">${listing.category}</p>
              <p class="listing-price">${formattedPrice}</p>
              ${ratingDisplay}
              <p class="listing-description">${shortDescription}</p>
              <div class="listing-actions">
                <a href="item-detail.html?listingId=${listing._id}" class="btn btn-primary">View Details</a>
                <button onclick="event.preventDefault(); event.stopPropagation(); rentEaseApp.addToCart('${listing._id}')" class="btn btn-cart">
                  <i class="ri-shopping-cart-line"></i> Add to Cart
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    this.setupListingImageCarousel();
    this.setupImageDotControls();
    this.initCategoryFilters();
    this.checkFavoriteStatus();
  }

  setupImageDotControls() {
    const listingCards = document.querySelectorAll(".listing-card");

    listingCards.forEach((card) => {
      const images = card.querySelectorAll(".listing-image img");
      const dots = card.querySelectorAll(".image-dot");

      if (images.length <= 1 || dots.length === 0) return;

      dots.forEach((dot) => {
        dot.addEventListener("click", (e) => {
          e.stopPropagation();

          // Hide all images
          images.forEach((img) => (img.style.display = "none"));

          // Remove active class from all dots
          dots.forEach((d) => d.classList.remove("active"));

          // Show selected image
          const index = parseInt(dot.dataset.index);
          images[index].style.display = "block";

          // Add active class to selected dot
          dot.classList.add("active");
        });
      });
    });
  }

  /**
   * Set up image carousel for listings with multiple images
   */
  setupListingImageCarousel() {
    const listingsContainer = document.getElementById("listingsContainer");

    if (!listingsContainer) return;

    const listingCards = listingsContainer.querySelectorAll(".listing-card");

    listingCards.forEach((card) => {
      const images = card.querySelectorAll(".listing-image img");

      if (images.length <= 1) return; // No need for carousel if only one image

      let currentImageIndex = 0;

      // Hide all images except the first
      images.forEach((img, index) => {
        img.style.display = index === 0 ? "block" : "none";
      });

      // Create carousel interval
      const carouselInterval = setInterval(() => {
        // Hide current image
        images[currentImageIndex].style.display = "none";

        // Move to next image
        currentImageIndex = (currentImageIndex + 1) % images.length;

        // Show next image
        images[currentImageIndex].style.display = "block";
      }, 10000); // Change image every 10 seconds

      // Store interval to allow potential cleanup
      card.dataset.carouselInterval = carouselInterval;
    });
  }

  /**
   * Clean up carousel intervals to prevent memory leaks
   */
  cleanUpListingCarousels() {
    const listingsContainer = document.getElementById("listingsContainer");

    if (!listingsContainer) return;

    const listingCards = listingsContainer.querySelectorAll(".listing-card");

    listingCards.forEach((card) => {
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
    const listingsContainer = document.getElementById("listingsContainer");

    if (!listingsContainer) return;

    const listingCards = listingsContainer.querySelectorAll(".listing-card");

    listingCards.forEach((card) => {
      const categoryElement = card.querySelector(".listing-category");
      const itemCategory = categoryElement
        ? categoryElement.textContent.replace("Category: ", "")
        : "";

      if (category === "All" || itemCategory === category) {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    });
  }

  /**
   * Sort listings by rating (highest first)
   */
  sortListingsByRating() {
    const listingsContainer = document.getElementById("listingsContainer");
    if (!listingsContainer) return;

    const listingCards = Array.from(
      listingsContainer.querySelectorAll(".listing-card")
    );

    // Sort the cards based on their rating
    listingCards.sort((a, b) => {
      const aRating = this.getListingRating(a);
      const bRating = this.getListingRating(b);
      return bRating - aRating; // Sort in descending order
    });

    // Re-append the cards in the new order
    listingCards.forEach((card) => {
      listingsContainer.appendChild(card);
    });
  }

  /**
   * Filter listings by minimum rating
   * @param {number} minRating - Minimum rating to show (e.g., 4)
   */
  filterListingsByRating(minRating) {
    const listingsContainer = document.getElementById("listingsContainer");
    if (!listingsContainer) return;

    const listingCards = listingsContainer.querySelectorAll(".listing-card");

    listingCards.forEach((card) => {
      const rating = this.getListingRating(card);
      if (rating >= minRating || isNaN(rating)) {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    });
  }

  /**
   * Helper to get the rating of a listing card
   * @param {HTMLElement} card - The listing card element
   * @returns {number} - The rating value or 0 if not found
   */
  getListingRating(card) {
    const ratingElement = card.querySelector(".product-rating");
    if (!ratingElement) return 0;

    // Try to extract the rating value from the stars or data attributes
    const dataRating = card.dataset.rating;
    if (dataRating) {
      return parseFloat(dataRating);
    }

    // Fallback: count the filled stars
    const filledStars = ratingElement.querySelectorAll(".ri-star-fill").length;
    const halfStars =
      ratingElement.querySelectorAll(".ri-star-half-fill").length;
    return filledStars + halfStars * 0.5;
  }

  /**
   * Initialize category filtering
   */
  initCategoryFilters() {
    const categoryLinks = document.querySelectorAll(".category-link");

    categoryLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();

        // Remove 'active' class from all links
        categoryLinks.forEach((l) => l.classList.remove("active"));

        // Add 'active' class to clicked link
        link.classList.add("active");

        // Get the category name
        const categoryName = link.querySelector(".category-name").textContent;

        // Filter listings by category
        this.filterListingsByCategory(categoryName);
      });
    });

    // Add rating filter and sort controls to the page
    this.addRatingControlsToPage();
  }

  /**
   * Add rating filter and sort controls to the page
   */
  addRatingControlsToPage() {
    const filtersContainer = document.querySelector(".category-filters");
    if (!filtersContainer) return;

    // Create rating controls
    const ratingControlsHtml = `
      <div class="rating-controls">
        <div class="rating-filters">
          <label>Filter by:</label>
          <button class="rating-filter-btn" data-min-rating="0">All Ratings</button>
          <button class="rating-filter-btn" data-min-rating="4">4+ Stars</button>
          <button class="rating-filter-btn" data-min-rating="3">3+ Stars</button>
        </div>
        <div class="rating-sort">
          <button class="rating-sort-btn">Sort by Highest Rating</button>
        </div>
      </div>
    `;

    // Add controls after the category filters
    filtersContainer.insertAdjacentHTML("afterend", ratingControlsHtml);

    // Add event listeners to the new buttons
    document.querySelectorAll(".rating-filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        // Update active state
        document
          .querySelectorAll(".rating-filter-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // Apply filter
        const minRating = parseFloat(btn.dataset.minRating);
        this.filterListingsByRating(minRating);
      });
    });

    // Add sort button listener
    const sortBtn = document.querySelector(".rating-sort-btn");
    if (sortBtn) {
      sortBtn.addEventListener("click", () => {
        sortBtn.classList.toggle("active");
        this.sortListingsByRating();
      });
    }
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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId,
          rentalDays: 1, // Default to 1 day, will be adjustable on cart page
        }),
      });

      const data = await response.json(); // Parse JSON instead of text

      if (!response.ok) {
        throw new Error(data.message || "Error adding item to cart");
      }

      // Check if the item was already in the cart
      if (data.alreadyInCart) {
        this.showMessage(data.message || "This item is already in your cart");
      } else {
        this.showMessage(data.message || "Item added to cart");
      }

      updateCartBadgeWithAnimation();
    } catch (error) {
      console.error("🚨 Error adding to cart:", error);
      this.showErrorMessage(error.message || "Error adding item to cart");
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
      const addItemModal = document.getElementById("addItemModal");
      if (addItemModal) {
        addItemModal.classList.remove("hidden");
      }
    }
  }

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================

  /**
   * Show message to the user
   * @param {string} message - Message to show
   * @param {string} type - Message type (success, error, info)
   */
  showMessage(message, type = "info") {
    const messageContainer = document.createElement("div");
    messageContainer.className = `message-container ${type}`;
    messageContainer.innerHTML = `
      <div class="message-content">
        <i class="ri-${
          type === "success"
            ? "check-line"
            : type === "error"
            ? "error-warning-line"
            : "information-line"
        }"></i>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(messageContainer);

    // Show animation
    setTimeout(() => {
      messageContainer.classList.add("show");
    }, 10);

    // Hide after 3 seconds
    setTimeout(() => {
      messageContainer.classList.remove("show");
      setTimeout(() => {
        document.body.removeChild(messageContainer);
      }, 300);
    }, 3000);
  }

  /**
   * Show success message (alias for showMessage with type=success)
   * @param {string} message - Message to show
   */
  showSuccessMessage(message) {
    this.showMessage(message, "success");
  }

  /**
   * Show error message (alias for showMessage with type=error)
   * @param {string} message - Message to show
   */
  showErrorMessage(message) {
    this.showMessage(message, "error");
  }

  /**
   * Initialize the app with all required functionality
   */
  init() {
    this.setupEventListeners();
    this.fetchAllListings();
    this.setupSearchFilters();
    this.setupFavorites();
    this.checkLoginStatus();
    this.setupRatingClickHandlers();

    // Initialize the message container if it doesn't exist
    if (!document.querySelector(".message-container-wrapper")) {
      const messageWrapper = document.createElement("div");
      messageWrapper.className = "message-container-wrapper";
      document.body.appendChild(messageWrapper);
    }

    console.log("RentEase application initialized");
  }

  /**
   * Set up event handlers for rating stars
   */
  setupRatingClickHandlers() {
    // Use event delegation to handle clicks on star ratings
    document.addEventListener("click", (event) => {
      // Check if the click is on a star icon or on the star rating container
      const starIcon = event.target.closest(
        ".ri-star-fill, .ri-star-line, .ri-star-half-fill"
      );
      const starRating = event.target.closest(".star-rating[data-listing-id]");

      if (starIcon && starRating) {
        // If clicked on a star icon within a star rating container
        this.showRatingDialog(event, starRating);
      } else if (starRating && event.target === starRating) {
        // If clicked directly on the star rating container
        this.showRatingDialog(event, starRating);
      }
    });

    console.log("Rating click handlers initialized");
  }

  /**
   * Test the ratings API endpoint to see if it's working properly
   */
  async testRatingsEndpoint() {
    try {
      // Get the first listing ID
      const response = await fetch(`${this.baseUrl}/listings?limit=1`);

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const firstListing = data[0];
          console.log("First listing:", firstListing);

          // Try to fetch ratings for this listing
          const ratingsResponse = await fetch(
            `${this.baseUrl}/ratings/listing/${firstListing._id}`
          );

          console.log("Ratings API response status:", ratingsResponse.status);

          if (ratingsResponse.ok) {
            const ratingsData = await ratingsResponse.json();
            console.log("Ratings data for first listing:", ratingsData);
          } else {
            console.error(
              "Rating API response not OK:",
              ratingsResponse.statusText
            );
          }
        }
      }
    } catch (error) {
      console.error("Error testing ratings endpoint:", error);
    }
  }

  /**
   * Show a dialog to rate a listing when a user clicks on the stars
   * @param {Event} event - The click event
   * @param {HTMLElement} starElement - The star rating element that was clicked
   */
  showRatingDialog(event, starElement) {
    event.preventDefault();
    event.stopPropagation();

    // Check if user is logged in
    if (!this.isLoggedIn()) {
      this.showMessage("Please log in to rate items", "error");
      return;
    }

    // Get listing data
    const listingId = starElement.getAttribute("data-listing-id");
    if (!listingId) {
      console.error("No listing ID found on star element");
      return;
    }

    // Check if user has already rated this item
    const userRating = parseInt(
      starElement.getAttribute("data-user-rating") || "0"
    );
    const isUpdate = userRating > 0;
    const ratingId = isUpdate
      ? starElement.getAttribute("data-rating-id")
      : null;
    const userComment = isUpdate
      ? starElement.getAttribute("data-user-comment") || ""
      : "";

    console.log("Rating dialog data:", {
      listingId,
      userRating,
      isUpdate,
      ratingId,
      userComment,
    });

    // Create the rating dialog with conditional title and prefilled values if it's an update
    const dialog = document.createElement("div");
    dialog.className = "rating-dialog";
    dialog.innerHTML = `
      <div class="rating-dialog-content">
        <div class="rating-dialog-header">
          <h3>${isUpdate ? "Edit Your Rating" : "Rate This Item"}</h3>
          <button class="close-dialog-btn">&times;</button>
        </div>
        <div class="rating-dialog-body">
          <div class="rating-stars">
            <p>How would you rate this item?</p>
            <div class="star-rating-large">
              ${this.generateLargeStarRating(isUpdate ? userRating : 0)}
            </div>
          </div>
          <div class="comment-field">
            <p>${
              isUpdate
                ? "Update your comment (optional):"
                : "Add a comment (optional):"
            }</p>
            <textarea rows="4" placeholder="Share your experience with this item...">${
              isUpdate ? userComment : ""
            }</textarea>
          </div>
          <div class="dialog-actions">
            <button class="cancel-btn">Cancel</button>
            <button class="submit-btn">${
              isUpdate ? "Update Rating" : "Submit Rating"
            }</button>
          </div>
        </div>
      </div>
    `;

    // Add the dialog to the page
    document.body.appendChild(dialog);

    // Set up event listeners
    const closeBtn = dialog.querySelector(".close-dialog-btn");
    const cancelBtn = dialog.querySelector(".cancel-btn");
    const submitBtn = dialog.querySelector(".submit-btn");
    const starLabels = dialog.querySelectorAll(".star-rating-large label");
    const commentField = dialog.querySelector("textarea");

    // Close dialog functions
    const closeDialog = () => {
      dialog.classList.add("fade-out");
      setTimeout(() => {
        document.body.removeChild(dialog);
      }, 300);
    };

    closeBtn.addEventListener("click", closeDialog);
    cancelBtn.addEventListener("click", closeDialog);

    // Star rating selection
    let selectedRating = isUpdate ? userRating : 0;

    // Pre-select stars if updating
    if (isUpdate) {
      for (let i = 0; i < userRating; i++) {
        starLabels[i].classList.add("active");
      }
    }

    starLabels.forEach((label, index) => {
      const ratingValue = index + 1;

      label.addEventListener("click", () => {
        // Reset all stars
        starLabels.forEach((l) => l.classList.remove("active"));

        // Activate stars up to the clicked one
        for (let i = 0; i <= index; i++) {
          starLabels[i].classList.add("active");
        }

        selectedRating = ratingValue;
      });
    });

    // Submit rating
    submitBtn.addEventListener("click", async () => {
      if (selectedRating === 0) {
        this.showMessage("Please select a rating", "error");
        return;
      }

      const comment = commentField.value.trim();

      // Disable the submit button to prevent multiple submissions
      submitBtn.disabled = true;
      submitBtn.textContent = isUpdate ? "Updating..." : "Submitting...";

      try {
        // Submit the rating - pass ratingId only if this is an update
        const result = await this.submitRating(
          listingId,
          selectedRating,
          comment,
          isUpdate ? ratingId : null
        );

        if (result.success) {
          closeDialog();
          this.showMessage(result.message, "success");

          // Update the UI
          this.updateListingRatingUI(
            listingId,
            selectedRating,
            comment,
            isUpdate ? ratingId : result.ratingId
          );
        } else {
          this.showMessage(
            result.message ||
              `Error ${isUpdate ? "updating" : "submitting"} rating`,
            "error"
          );
          // Re-enable the submit button
          submitBtn.disabled = false;
          submitBtn.textContent = isUpdate ? "Update Rating" : "Submit Rating";
        }
      } catch (error) {
        console.error(
          `Error ${isUpdate ? "updating" : "submitting"} rating:`,
          error
        );
        this.showMessage(
          `An error occurred while ${
            isUpdate ? "updating" : "submitting"
          } your rating`,
          "error"
        );
        // Re-enable the submit button
        submitBtn.disabled = false;
        submitBtn.textContent = isUpdate ? "Update Rating" : "Submit Rating";
      }
    });
  }

  /**
   * Generate large star rating HTML for the rating dialog
   * @param {number} currentRating - Current rating value (0-5)
   * @returns {string} HTML for star rating
   */
  generateLargeStarRating(currentRating = 0) {
    let starsHtml = "";

    for (let i = 1; i <= 5; i++) {
      starsHtml += `
        <label class="${i <= currentRating ? "active" : ""}" data-value="${i}">
          <i class="ri-star-fill"></i>
        </label>
      `;
    }

    return starsHtml;
  }

  /**
   * Submit a rating to the API
   * @param {string} listingId - ID of the listing to rate
   * @param {number} score - Rating score (1-5)
   * @param {string} comment - Optional comment
   * @param {string} ratingId - Optional existing rating ID for updates
   * @returns {Promise<Object>} Result object with success status and message
   */
  async submitRating(listingId, score, comment, ratingId = null) {
    if (!this.isLoggedIn()) {
      return { success: false, message: "Please log in to rate items" };
    }

    if (!listingId) {
      return { success: false, message: "Invalid listing ID" };
    }

    if (score < 1 || score > 5) {
      return { success: false, message: "Rating must be between 1 and 5" };
    }

    try {
      let response;
      let responseData;

      // Determine if this is an update or a new rating
      const isUpdate = !!ratingId;

      if (isUpdate) {
        // Update existing rating - correct endpoint according to API docs
        response = await fetch(`${this.baseUrl}/ratings/${ratingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.getToken()}`,
          },
          body: JSON.stringify({
            score: score,
            comment: comment,
          }),
        });
      } else {
        // Create new rating
        response = await fetch(`${this.baseUrl}/ratings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.getToken()}`,
          },
          body: JSON.stringify({
            listingId: listingId,
            score: score,
            comment: comment,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.message || "Failed to submit rating",
        };
      }

      responseData = await response.json();

      // Get the rating ID from the response
      const newRatingId = responseData.id || responseData._id || ratingId;

      // Immediately update the UI without waiting for a full refresh
      this.updateListingRatingUI(
        listingId,
        score,
        comment,
        newRatingId
      );

      // Also trigger a refresh of all listings to get updated data from server
      setTimeout(() => {
        console.log("Refreshing listings after rating submission");
        this.fetchAllListings();
      }, 500);

      return {
        success: true,
        message: isUpdate
          ? "Rating updated successfully!"
          : "Thank you for your rating!",
        ratingId: newRatingId,
      };
    } catch (error) {
      console.error("Error submitting rating:", error);
      return {
        success: false,
        message: "An error occurred while submitting your rating",
      };
    }
  }

  /**
   * Update the UI to reflect a new or updated rating without refreshing
   * @param {string} listingId - ID of the listing that was rated
   * @param {number} score - Rating score (1-5)
   * @param {string} comment - Optional comment
   * @param {string} ratingId - Rating ID
   */
  updateListingRatingUI(listingId, score, comment, ratingId) {
    console.log(`Updating UI for listing ${listingId} with rating ${score}`);

    // Find all listing cards with this ID
    const listingCards = document.querySelectorAll(
      `.listing-card[data-id="${listingId}"]`
    );
    console.log(
      `Found ${listingCards.length} listing cards for ID ${listingId}`
    );

    if (listingCards.length === 0) {
      console.warn(`No listing cards found for ID ${listingId}`);
      return;
    }

    listingCards.forEach((card) => {
      // Find the star rating element
      const starRating = card.querySelector(".star-rating");
      if (starRating) {
        console.log("Found star rating element, updating attributes");

        // Update data attributes
        starRating.setAttribute("data-user-rating", score);
        starRating.setAttribute("data-rating-id", ratingId);
        starRating.setAttribute("data-user-comment", comment);
        starRating.classList.add("user-rated");

        // Update or add user rated indicator
        let indicator = card.querySelector(".user-rated-indicator");
        if (!indicator) {
          indicator = document.createElement("div");
          indicator.className = "user-rated-indicator";
          card.prepend(indicator); // Add to the beginning of the card
        } else {
          console.log("Updating existing user rated indicator");
        }

        indicator.innerHTML = `<i class="ri-check-line"></i> You rated ${score}`;

        // Force a redraw of the card
        card.style.display = "none";
        setTimeout(() => {
          card.style.display = "";
        }, 10);

        console.log("UI update complete for card");
      } else {
        console.warn("Star rating element not found in card");
      }
    });

    // Also update any standalone rating elements with this listing ID
    const standaloneRatings = document.querySelectorAll(
      `.star-rating[data-listing-id="${listingId}"]`
    );

    // Convert NodeList to Array to use includes method
    const listingCardsArray = Array.from(listingCards);

    standaloneRatings.forEach((rating) => {
      const parentCard = rating.closest(".listing-card");
      // Skip if this rating is inside a card we already updated
      if (parentCard && !listingCardsArray.includes(parentCard)) {
        rating.setAttribute("data-user-rating", score);
        rating.setAttribute("data-rating-id", ratingId);
        rating.setAttribute("data-user-comment", comment);
        rating.classList.add("user-rated");
      }
    });
  }

  // --- SELLER/OWNER RATING BADGE IN LISTINGS ---
  // This function renders a seller/owner rating badge on each listing card
  renderOwnerRatingBadge(owner, container) {
    if (!container) return;
    if (!owner || !owner.rating) {
      container.innerHTML = '<span class="no-ratings">No seller ratings</span>';
      return;
    }
    const average = owner.rating.average || owner.rating.averageScore || 0;
    const count = owner.rating.count || 0;
    let stars = "";
    for (let i = 1; i <= 5; i++) {
      stars += `<i class="ri-star-fill" style="color: ${
        i <= Math.round(average) ? "#ffcc33" : "#ccc"
      }"></i>`;
    }
    container.innerHTML = `
      <span class="seller-rating-badge">
        ${stars}
        <span class="review-count">(${count})</span>
      </span>
    `;
  }

  /**
   * Toggle favorite status for a listing
   * @param {string} listingId - ID of the listing to toggle favorite status
   * @param {HTMLElement} buttonElement - The favorite button element that was clicked
   */
  async toggleFavorite(listingId, buttonElement) {
    const token = this.getToken();

    if (!token) {
      this.showErrorMessage("Please log in to add items to favorites");
      return;
    }

    try {
      const isFavorite = buttonElement.classList.contains("active");

      if (isFavorite) {
        // Remove from favorites
        const response = await fetch(
          `${this.baseUrl}/favorites/remove/${listingId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Error removing from favorites");
        }

        buttonElement.classList.remove("active");
        const favoriteIcon = buttonElement.querySelector(".favorite-icon");
        if (favoriteIcon) {
          favoriteIcon.setAttribute("fill", "none");
        }

        this.showMessage("Removed from favorites");
      } else {
        // Add to favorites
        const response = await fetch(`${this.baseUrl}/favorites/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            listingId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Error adding to favorites");
        }

        buttonElement.classList.add("active");
        const favoriteIcon = buttonElement.querySelector(".favorite-icon");
        if (favoriteIcon) {
          favoriteIcon.setAttribute("fill", "#6c5ce7");
        }

        this.showMessage("Added to favorites");
      }
    } catch (error) {
      console.error("🚨 Error updating favorites:", error);
      this.showErrorMessage(error.message || "Error updating favorites");
    }
  }

  /**
   * Check favorite status for all listings on the page
   */
  async checkFavoriteStatus() {
    if (!this.getToken()) return;

    const listingCards = document.querySelectorAll(".listing-card");

    for (const card of listingCards) {
      const listingId = card.dataset.id;
      if (!listingId) continue;

      try {
        const response = await fetch(
          `${this.baseUrl}/favorites/check/${listingId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.getToken()}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const favoriteButton = card.querySelector(".favorite-button");

          if (favoriteButton && data.isFavorite) {
            favoriteButton.classList.add("active");
            const favoriteIcon = favoriteButton.querySelector(".favorite-icon");
            if (favoriteIcon) {
              favoriteIcon.setAttribute("fill", "#6c5ce7");
            }
          }
        }
      } catch (error) {
        console.error("Error checking favorite status:", error);
      }
    }
  }

  /**
   * Set up all event listeners for the application
   */
  setupEventListeners() {
    // Check if we're on the home page
    if (document.querySelector(".hero-section")) {
      this.setupSearch();

      // Test the ratings API endpoint
      this.testRatingsEndpoint();
    }

    // Check for specific pages and initialize accordingly
    if (document.getElementById("rentalsContainer")) {
      this.initRentalPage();
    }

    // Add product to cart for dynamic "Add to Cart" buttons
    document.addEventListener("click", (e) => {
      const addToCartBtn = e.target.closest("[data-add-to-cart]");
      if (addToCartBtn) {
        e.preventDefault();
        const itemId = addToCartBtn.dataset.itemId;
        if (itemId) {
          this.addToCart(itemId);
        }
      }
    });

    // Check for auth and update UI
    this.updateAuthUI();

    // Set up category filter buttons event listeners
    this.initCategoryFilters();

    console.log("Event listeners initialized");
  }
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
  window.location.href = "login.html";
}

/**
 * Redirect to signup page
 */
function redirectToSignup() {
  window.location.href = "signup.html";
}

// Initialize the app
const rentEaseApp = new RentEaseApp();
