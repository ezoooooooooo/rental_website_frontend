/**
 * Handle displaying and interacting with item details
 */
class ItemDetailManager {
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");

    this.initItemDetailPage();
  }

  /**
   * Initialize the item detail page
   */
  initItemDetailPage() {
    // Get the listing ID from URL
    const params = new URLSearchParams(window.location.search);
    this.listingId =
      params.get("listingId") || params.get("itemId") || params.get("id");
    this.showRating = params.get("showRating") === "true";

    if (!this.listingId) {
      this.showErrorMessage("No listing ID provided");
      return;
    }

    this.loadItemDetails();
  }

  /**
   * Load and display item details
   */
  async loadItemDetails() {
    try {
      const response = await fetch(
        `${this.baseUrl}/listings/${this.listingId}`
      );

      if (!response.ok) {
        throw new Error("Failed to load item details");
      }

      const item = await response.json();
      console.log("Item details loaded:", item);
      
      // Render item details in the existing HTML structure
      this.renderItemDetails(item);

      // Also load ratings
      this.loadItemRatings();

      // Load owner ratings if there's an owner ID
      if (item.ownerId) {
        this.loadOwnerRatings(item.ownerId);
      }

      // If we're supposed to show the rating form, do so after a short delay
      if (this.showRating && window.ratingSystem) {
        setTimeout(() => {
          window.ratingSystem.toggleAddReviewForm();

          // Scroll to the rating form
          const ratingContainer = document.getElementById(
            "itemRatingContainer"
          );
          if (ratingContainer) {
            ratingContainer.scrollIntoView({ behavior: "smooth" });
          }
        }, 1000);
      }
    } catch (error) {
      console.error("Error loading item details:", error);
      const errorMessage = document.createElement('div');
      errorMessage.className = 'error-message';
      errorMessage.innerHTML = `<p>Failed to load item details. Please try again later.</p>`;
      document.querySelector('.item-detail-info').appendChild(errorMessage);
    }
  }

  /**
   * Load ratings for the current item
   */
  async loadItemRatings() {
    if (!this.listingId) return;

    try {
      // Use the rating system to load ratings if available
      if (window.ratingSystem) {
        await window.ratingSystem.loadItemRatings(this.listingId);
        
        // Connect the Add Review button to the rating dialog
        const addReviewBtn = document.getElementById('addReviewBtn');
        if (addReviewBtn) {
          // Remove any existing click listeners by replacing the node
          const newAddReviewBtn = addReviewBtn.cloneNode(true);
          addReviewBtn.parentNode.replaceChild(newAddReviewBtn, addReviewBtn);
          newAddReviewBtn.addEventListener('click', () => {
            openRatingDialog();
          });
        }
      } else {
        // Fallback to direct API call
        const response = await fetch(
          `${this.baseUrl}/ratings/listing/${this.listingId}`
        );
        if (!response.ok) {
          throw new Error(
            `Failed to load item ratings. Status: ${response.status}`
          );
        }
        const data = await response.json();
        this.renderItemRatingsManually(data);
      }
    } catch (error) {
      console.error("Error loading item ratings:", error);
    }
  }

  /**
   * Load ratings for the item owner
   * @param {string} ownerId - ID of the owner
   */
  async loadOwnerRatings(ownerId) {
    if (!ownerId) return;

    // Ensure ownerId is a string, not an object
    if (typeof ownerId === "object") {
      // Try to extract the ID from the owner object
      ownerId = ownerId.id || ownerId._id || null;
      console.log("Extracted owner ID from object:", ownerId);
      if (!ownerId) {
        console.error(
          "Could not extract a valid owner ID from the owner object"
        );
        return;
      }
    }

    try {
      // Use the rating system to load owner ratings if available
      if (
        window.ratingSystem &&
        typeof window.ratingSystem.loadOwnerRatings === "function"
      ) {
        await window.ratingSystem.loadOwnerRatings(ownerId);
      } else {
        // Fallback to direct API call
        const response = await fetch(
          `${this.baseUrl}/ratings/owner/${ownerId}`
        );
        if (!response.ok) {
          throw new Error(
            `Failed to load owner ratings. Status: ${response.status}`
          );
        }
        const data = await response.json();
        this.renderOwnerRatingsManually(data);
      }
    } catch (error) {
      console.error("Error loading owner ratings:", error);
    }
  }
  
  /**
   * Load and display owner details
   * @param {string} ownerId - ID of the owner
   */
  async loadOwnerDetails(ownerId) {
    if (!ownerId) return;
    
    // Ensure ownerId is a string, not an object
    if (typeof ownerId === "object") {
      // Try to extract the ID from the owner object
      ownerId = ownerId.id || ownerId._id || null;
      if (!ownerId) {
        console.error("Could not extract a valid owner ID from the owner object");
        return;
      }
    }
    
    const ownerInfoContainer = document.getElementById("ownerInfo");
    if (!ownerInfoContainer) return;
    
    try {
      console.log(`Loading owner details for ID: ${ownerId}`);
      
      // Use the endpoint from the API documentation
      const response = await fetch(`${this.baseUrl}/users/${ownerId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load owner details. Status: ${response.status}`);
      }
      
      const ownerData = await response.json();
      console.log("Owner data received:", ownerData);
      
      // Render the owner information
      this.renderOwnerInfo(ownerData, ownerInfoContainer);
    } catch (error) {
      console.error("Error loading owner details:", error);
      ownerInfoContainer.innerHTML = `
        <div class="owner-error">
          <p>Could not load owner information.</p>
        </div>
      `;
    }
  }
  
  /**
   * Render owner information in the container
   * @param {Object} owner - Owner details object
   * @param {HTMLElement} container - Container to render in
   */
  renderOwnerInfo(owner, container) {
    if (!owner || !container) return;
    
    // Extract owner information
    const ownerName = owner.firstName && owner.lastName 
      ? `${owner.firstName} ${owner.lastName}`
      : owner.username || owner.name || "Unknown Owner";
      
    const ownerJoinDate = owner.createdAt 
      ? new Date(owner.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        })
      : "";
      
    const ownerRating = owner.rating && owner.rating.averageScore
      ? owner.rating.averageScore
      : 0;
      
    const ownerReviewCount = owner.rating && owner.rating.count
      ? owner.rating.count
      : 0;
    
    // Determine if owner is "Trusted Seller" (4.5+ stars with at least 5 reviews)
    const isTrustedSeller = ownerRating >= 4.5 && ownerReviewCount >= 5;
    
    // Create avatar/profile image
    const avatarHtml = owner.profileImage
      ? `<img src="${owner.profileImage}" alt="${ownerName}" class="owner-avatar">`
      : `<div class="owner-avatar owner-initial">${ownerName.charAt(0).toUpperCase()}</div>`;
    
    // Generate HTML for owner information
    container.innerHTML = `
      <div class="owner-profile">
        ${avatarHtml}
        <div class="owner-details">
          <div class="owner-name">${ownerName}</div>
          ${ownerJoinDate ? `<div class="owner-join-date">Member since ${ownerJoinDate}</div>` : ''}
          ${ownerRating > 0 ? `
            <div class="owner-rating">
              ${this.generateStarRatingHTML(ownerRating)}
              <span class="owner-review-count">(${ownerReviewCount} ${ownerReviewCount === 1 ? 'review' : 'reviews'})</span>
            </div>
          ` : ''}
          ${isTrustedSeller ? `<div class="trusted-seller-badge">✓ Trusted Seller</div>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Manually render owner ratings when rating system is not available
   * @param {Object} data - Owner ratings data
   */
  renderOwnerRatingsManually(data) {
    const container = document.getElementById("ownerRatingContainer");
    if (!container) return;

    // Process ratings data
    const ratings = data.ratings || [];
    const averageScore = data.averageScore || 0;
    const count = data.count || 0;

    // Generate HTML for owner ratings
    let html = `
      <div class="rating-header">
        <h3>Seller Ratings & Reviews</h3>
      </div>
      <div class="rating-summary">
        <div class="rating-average">
          <div class="rating-average-value">${averageScore.toFixed(1)}</div>
          <div class="rating-average-stars">
            ${this.generateStarRatingHTML(averageScore)}
          </div>
          <div class="rating-count">${count} ${
      count === 1 ? "review" : "reviews"
    }</div>
        </div>
      </div>
      <div class="review-list">
    `;

    if (ratings.length === 0) {
      html += `<div class="no-reviews">No reviews yet for this seller.</div>`;
    } else {
      ratings.forEach((rating) => {
        html += `
          <div class="review-item">
            <div class="review-header">
              <div class="reviewer-info">
                <div class="reviewer-name">${
                  rating.userName || "Anonymous"
                }</div>
                <div class="review-date">${new Date(
                  rating.createdAt
                ).toLocaleDateString()}</div>
              </div>
              <div class="review-rating">
                ${this.generateStarRatingHTML(rating.score || 0)}
              </div>
            </div>
            <div class="review-content">
              <p>${rating.comment || "No comment provided."}</p>
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  /**
   * Render item details in the existing HTML structure
   * @param {Object} item - Item details object
   */
  renderItemDetails(item) {
    console.log("Rendering item details:", item);
    
    // Update item name, category, price, and description
    document.getElementById("itemName").textContent = item.name || "Item Name";
    document.getElementById("itemCategory").textContent = item.category || "Category";
  
    // Format price
    let formattedPrice = item.rentalRate;
    if (typeof formattedPrice === "string") {
      formattedPrice = formattedPrice.replace(/[^\d.]/g, "");
    }
    formattedPrice = `$${parseFloat(formattedPrice).toFixed(2)}`;
    document.getElementById("itemPrice").textContent = formattedPrice;
  
    // Add status label if item is reserved or rented
    const itemStatusContainer = document.getElementById("itemStatusContainer");
    if (itemStatusContainer) {
      if (item.status && (item.status === 'reserved' || item.status === 'rented')) {
        itemStatusContainer.innerHTML = `<div class="item-status-label ${item.status}">${item.status === 'reserved' ? 'Reserved' : 'Rented'}</div>`;
        itemStatusContainer.style.display = 'block';
        
        // Disable the Add to Cart button if the item is not available
        const addToCartBtn = document.getElementById("addToCartBtn");
        if (addToCartBtn) {
          addToCartBtn.disabled = true;
          addToCartBtn.classList.add("disabled");
          addToCartBtn.title = `This item is currently ${item.status} and not available for rent`;
        }
      } else {
        itemStatusContainer.style.display = 'none';
      }
    }
    
    // Update description
    document.getElementById("itemDescription").textContent = item.description || "No description available.";
    
    // Update main image
    const mainImage = document.getElementById("mainImage");
    if (mainImage && item.images && item.images.length > 0) {
      mainImage.src = item.images[0].url || item.images[0];
      mainImage.alt = item.name;
    }
    
    // Update thumbnails
    const thumbnailContainer = document.getElementById("thumbnailContainer");
    if (thumbnailContainer && item.images && item.images.length > 1) {
      let thumbnailsHtml = '';
      item.images.forEach((image, index) => {
        const imageUrl = image.url || image;
        thumbnailsHtml += `
          <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="setMainImage('${imageUrl}', this)">
            <img src="${imageUrl}" alt="Thumbnail ${index + 1}">
          </div>
        `;
      });
      thumbnailContainer.innerHTML = thumbnailsHtml;
    }
    
    // Extract owner information - first try to get from the listing response
    const ownerId = item.ownerId || (item.owner && (item.owner.id || item.owner._id)) || item.owner;
    
    // Try to get owner name directly from the listing response
    let ownerName = "";
    let ownerInitial = "";
    let ownerProfileImage = null;
    
    // Check if owner info is populated in the listing response
    if (item.owner && typeof item.owner === 'object') {
      console.log("Owner info found in listing response:", item.owner);
      if (item.owner.firstName && item.owner.lastName) {
        ownerName = `${item.owner.firstName} ${item.owner.lastName}`;
        ownerInitial = item.owner.firstName.charAt(0).toUpperCase();
      } else if (item.owner.name) {
        ownerName = item.owner.name;
        ownerInitial = item.owner.name.charAt(0).toUpperCase();
      } else if (item.owner.username) {
        ownerName = item.owner.username;
        ownerInitial = item.owner.username.charAt(0).toUpperCase();
      }
      
      // Check for profile image
      if (item.owner.profileImage) {
        ownerProfileImage = item.owner.profileImage;
      }
    }
    
    // Update owner information
    const ownerInfoContainer = document.getElementById("ownerInfo");
    if (ownerInfoContainer) {
      if (ownerName) {
        // We have owner info from the listing response
        const avatarHtml = ownerProfileImage
          ? `<img src="${ownerProfileImage}" alt="${ownerName}" class="owner-avatar">`
          : `<div class="owner-avatar owner-initial">${ownerInitial}</div>`;
          
        ownerInfoContainer.innerHTML = `
          <div class="owner-profile">
            ${avatarHtml}
            <div class="owner-details">
              <div class="owner-name">${ownerName}</div>
            </div>
          </div>
        `;
      } else {
        // Need to load owner info
        ownerInfoContainer.innerHTML = `<div class="owner-loading">Loading owner information...</div>`;
        
        // Load additional owner details only if we don't already have them
        if (ownerId) {
          this.loadOwnerDetails(ownerId);
        }
      }
    }
    
    // Update cart and favorites buttons
    const addToCartBtn = document.getElementById("addToCartBtn");
    if (addToCartBtn) {
      addToCartBtn.onclick = () => this.addToCart(item._id || item.id);
    }
    
    const addToFavoritesBtn = document.getElementById("addToFavoritesBtn");
    if (addToFavoritesBtn) {
      addToFavoritesBtn.onclick = () => this.toggleFavorite(item._id || item.id);
    }
  }

  /**
   * Create HTML for the image gallery
   * @param {Array} images - Array of image objects
   * @returns {string} HTML for the image gallery
   */
  createImageGalleryHtml(images) {
    // Default image if none provided
    if (!images || images.length === 0) {
      return `
        <div class="gallery-main">
          <img src="./pets.jpeg" alt="Item image" class="main-image">
        </div>
      `;
    }

    // Create HTML for main image
    const mainImageHtml = `
      <div class="gallery-main">
        <img src="${images[0].url}" alt="Item image" class="main-image">
      </div>
    `;

    // Create HTML for thumbnails if more than one image
    const thumbnailsHtml =
      images.length > 1
        ? `
      <div class="gallery-thumbnails">
        ${images
          .map(
            (image, index) => `
          <div class="thumbnail ${
            index === 0 ? "active" : ""
          }" data-index="${index}">
            <img src="${image.url}" alt="Thumbnail">
          </div>
        `
          )
          .join("")}
      </div>
    `
        : "";

    return mainImageHtml + thumbnailsHtml;
  }

  /**
   * Generate HTML for star rating
   * @param {number} rating - Rating value (0-5)
   * @returns {string} HTML for star rating
   */
  generateStarRatingHTML(rating) {
    if (!rating) return "";

    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    let html = '<div class="star-rating readonly">';

    // Add full stars first
    for (let i = 0; i < fullStars; i++) {
      html += '<i class="ri-star-fill"></i>';
    }

    // Add half star if needed
    if (halfStar) {
      html += '<i class="ri-star-half-fill"></i>';
    }

    // Add empty stars last
    for (let i = 0; i < emptyStars; i++) {
      html += '<i class="ri-star-line"></i>';
    }

    html += "</div>";
    return html;
  }

  /**
   * Setup image gallery functionality
   */
  setupImageGallery() {
    const thumbnails = document.querySelectorAll(".thumbnail");
    const mainImage = document.querySelector(".main-image");

    if (!thumbnails.length || !mainImage) return;

    thumbnails.forEach((thumbnail) => {
      thumbnail.addEventListener("click", () => {
        // Remove active class from all thumbnails
        thumbnails.forEach((t) => t.classList.remove("active"));

        // Add active class to clicked thumbnail
        thumbnail.classList.add("active");

        // Update main image
        const imageUrl = thumbnail.querySelector("img").src;
        mainImage.src = imageUrl;
      });
    });
  }

  /**
   * Update the quantity input
   * @param {number} change - Amount to change by
   */
  updateQuantity(change) {
    const input = document.getElementById("rentalDays");
    if (!input) return;

    let value = parseInt(input.value) || 1;
    value += change;

    // Ensure value is at least 1
    if (value < 1) value = 1;

    input.value = value;
  }

  /**
   * Add the current item to cart
   */
  async addToCart() {
    if (!this.token) {
      redirectToLogin();
      return;
    }

    const rentalDaysInput = document.getElementById("rentalDays");
    const rentalDays = parseInt(rentalDaysInput?.value) || 1;

    try {
      const response = await fetch(`${this.baseUrl}/cart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          listingId: this.listingId,
          rentalDays,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error adding item to cart");
      }

      this.showMessage(data.message || "Item added to cart");

      // Update cart badge if function exists
      if (typeof updateCartBadgeWithAnimation === "function") {
        updateCartBadgeWithAnimation();
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      this.showErrorMessage(error.message || "Error adding item to cart");
    }
  }

  /**
   * Toggle favorite status for current item
   */
  async toggleFavorite() {
    if (!this.token) {
      redirectToLogin();
      return;
    }

    try {
      // First check if item is already in favorites
      const checkResponse = await fetch(
        `${this.baseUrl}/favorites/check/${this.listingId}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        }
      );

      if (!checkResponse.ok) {
        throw new Error("Error checking favorite status");
      }

      const { isFavorite } = await checkResponse.json();

      if (isFavorite) {
        // Remove from favorites
        const response = await fetch(
          `${this.baseUrl}/favorites/remove/${this.listingId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${this.token}`,
            },
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Error removing from favorites");
        }

        this.showMessage("Removed from favorites");

        // Update button appearance
        const favoriteBtn = document.querySelector(".btn-favorite");
        if (favoriteBtn) {
          favoriteBtn.innerHTML =
            '<i class="ri-heart-line"></i> Add to Favorites';
        }
      } else {
        // Add to favorites
        const response = await fetch(`${this.baseUrl}/favorites/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({
            listingId: this.listingId,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Error adding to favorites");
        }

        this.showMessage("Added to favorites");

        // Update button appearance
        const favoriteBtn = document.querySelector(".btn-favorite");
        if (favoriteBtn) {
          favoriteBtn.innerHTML =
            '<i class="ri-heart-fill"></i> Remove from Favorites';
        }
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      this.showErrorMessage(error.message || "Error updating favorites");
    }
  }

  /**
   * Show a message to the user
   * @param {string} message - Message to display
   * @param {boolean} isError - Whether this is an error message
   */
  showMessage(message, isError = false) {
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
    toast.className = `notification ${isError ? 'error' : 'success'}`;
    
    // Set icon based on type
    const icon = !isError
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
  window.location.href = "login.html";
}

/**
 * Redirect to signup page
 */
function redirectToSignup() {
  window.location.href = "signup.html";
}

/**
 * Set owner ID for rating form
 * @param {string} ownerId - ID of the owner
 */
function setOwnerIdForRating(ownerId) {
  console.log('Setting owner ID for rating:', ownerId);
  const ownerIdInput = document.getElementById('sellerRatingOwnerId');
  if (ownerIdInput) {
    ownerIdInput.value = ownerId;
  }
}

// Make the function globally available
window.setOwnerIdForRating = setOwnerIdForRating;

/**
 * Initialize the rating dialog functionality
 */
function initRatingDialog() {
  console.log("Initializing rating dialog");
  const baseUrl = "http://localhost:3000/api";
  const token = localStorage.getItem("token");
  const params = new URLSearchParams(window.location.search);
  const listingId =
    params.get("listingId") || params.get("itemId") || params.get("id");

  // Get references to elements
  const addReviewBtn = document.getElementById("addReviewBtn");
  const ratingDialog = document.getElementById("ratingDialog");
  const closeBtn = document.getElementById("closeRatingDialog");
  const cancelBtn = document.getElementById("cancelDialogBtn"); // Updated to match HTML
  const submitBtn = document.getElementById("submitDialogBtn"); // Updated to match HTML
  const rateSellerBtn = document.getElementById("rateSellerBtn");
  const sellerRatingForm = document.getElementById("sellerRatingForm");
  const dialogStarRating = document.getElementById("dialogStarRating");
  const dialogComment = document.getElementById("dialogComment");
  
  console.log("Rating dialog elements:", {
    addReviewBtn,
    ratingDialog,
    closeBtn,
    cancelBtn,
    submitBtn,
    dialogStarRating,
    dialogComment
  });

  // Check if user is logged in
  if (!token && addReviewBtn) {
    addReviewBtn.addEventListener("click", () => {
      showNotification(
        "Please log in to rate this item",
        "error"
      );
    });
    return;
  }

  let ratingId = null;
  let selectedRating = 0;

  // Function to check if user has already rated this item
  async function checkExistingRating() {
    const listingId = getUrlParam("listingId") || getUrlParam("itemId") || getUrlParam("id");
    const token = localStorage.getItem("token");

    if (!token || !listingId) return null;

    try {
      const response = await fetch(
        `http://localhost:3000/api/ratings/user/listing/${listingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      return data.rating || null;
    } catch (error) {
      console.error("Error checking existing rating:", error);
      return null;
    }
  }

  // Function to generate stars for the dialog
  function generateStars() {
    dialogStarRating.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const label = document.createElement("label");
      label.dataset.value = i;
      label.innerHTML = `<i class="ri-star-fill"></i>`;
      dialogStarRating.appendChild(label);

      // Add click event to each star
      label.addEventListener("click", () => {
        selectedRating = i;
        updateStars();
      });
    }
  }

  // Update stars based on selection
  function updateStars() {
    const stars = dialogStarRating.querySelectorAll("label");
    stars.forEach((star) => {
      const value = parseInt(star.getAttribute("data-value"));
      if (value <= selectedRating) {
        star.classList.add("active");
      } else {
        star.classList.remove("active");
      }
    });
  }

  // Check if user has already rated this item
  async function checkExistingRating() {
    const listingId = getUrlParam("listingId") || getUrlParam("itemId");
    const token = localStorage.getItem("token");

    if (!token || !listingId) return null;

    try {
      const response = await fetch(
        `http://localhost:3000/api/ratings/user/listing/${listingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      return data.rating || null;
    } catch (error) {
      }
    }
    starLabels.forEach((label, index) => {
      const ratingValue = index + 1;
      label.addEventListener("click", () => {
        starLabels.forEach(l => l.classList.remove("active"));
        for (let i = 0; i <= index; i++) {
          starLabels[i].classList.add("active");
        }
        selectedRating = ratingValue;
      });
    });
    const closeDialog = () => {
      dialog.classList.add("fade-out");
      setTimeout(() => document.body.removeChild(dialog), 300);
    if (ratingDialog) {
      ratingDialog.style.display = "none";
    }
  }

  // Submit the rating
  async function submitRating() {
    const baseUrl = "http://localhost:3000/api";
    const token = localStorage.getItem("token");

    console.log("Submitting rating", { selectedRating, dialogComment });
    
    if (selectedRating === 0) {
      alert("Please select a rating");
      return;
    }

    const comment = dialogComment ? dialogComment.value.trim() : "";
    if (!comment) {
      showNotification("Please enter a comment", "error");
      return;
    }

    const listingId = getUrlParam("listingId") || getUrlParam("itemId") || getUrlParam("id");
    if (!listingId) {
      console.error("No listing ID found in URL");
      alert("Error: Could not determine which item to rate");
      return;
    }

    // Prepare request body
    const body = {
      score: selectedRating,
      comment: comment,
    };

    let url, method;
    if (ratingId) {
      // Update existing rating
      url = `${baseUrl}/ratings/${ratingId}`;
      method = "PUT";
    } else {
      // Create new rating
      url = `${baseUrl}/ratings`;
      method = "POST";
      body.listingId = listingId;
    }

    try {
      console.log(`Submitting ${method} request to ${url} with body:`, body);
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit rating");
      }

      const responseData = await response.json();
      console.log("Rating submitted successfully:", responseData);

      // Close dialog and refresh ratings
      closeRatingDialog();

      // Reload ratings to show the new/updated rating
      if (window.ratingSystem) {
        window.ratingSystem.loadItemRatings(listingId);
      } else {
        // Fallback: reload the page
        location.reload();
      }

      // Show success message
      const message = ratingId
        ? "Rating updated successfully!"
        : "Thank you for your rating!";
      showNotification(message);
    } catch (error) {
      console.error("Error submitting rating:", error);
      showNotification(
        error.message || "Failed to submit rating",
        "error"
      );
    }
  }

  // Generate stars for the dialog if needed
  if (dialogStarRating && dialogStarRating.children.length === 0) {
    generateStars();
  }

  // Add event listeners
  if (addReviewBtn) {
    console.log("Adding click listener to Add Review button");
    // Remove any existing listeners to prevent duplicates
    addReviewBtn.removeEventListener("click", openRatingDialog);
    addReviewBtn.addEventListener("click", openRatingDialog);
  } else {
    console.warn("Add Review button not found");
  }
  
  // Add event listener for Rate Seller button
  if (rateSellerBtn && window.ratingSystem) {
    console.log("Adding click listener to Rate Seller button");
    rateSellerBtn.addEventListener("click", function() {
      window.ratingSystem.toggleAddReviewForm();
    });
  } else {
    console.warn("Rate Seller button not found or rating system not available");
  }
  
  // Add event listener for seller rating form submission
  if (sellerRatingForm && window.ratingSystem) {
    console.log("Adding submit listener to Seller Rating form");
    sellerRatingForm.addEventListener("submit", function(event) {
      event.preventDefault();
      window.ratingSystem.submitOwnerRating(event);
    });
  } else {
    console.warn("Seller Rating form not found or rating system not available");
  }

  if (closeBtn) {
    closeBtn.removeEventListener("click", closeRatingDialog);
    closeBtn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeRatingDialog();
    });
    console.log("Close button event listener added");
  } else {
    console.warn("Close button not found");
  }

  if (cancelBtn) {
    cancelBtn.removeEventListener("click", closeRatingDialog);
    cancelBtn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeRatingDialog();
    });
    console.log("Cancel button event listener added");
  } else {
    console.warn("Cancel button not found");
  }

  if (submitBtn) {
    console.log("Adding click listener to Submit button");
    submitBtn.removeEventListener("click", submitRating);
    submitBtn.addEventListener("click", submitRating);
  } else {
    console.warn("Submit button not found");
  }

  // Close dialog when clicking outside
  if (ratingDialog) {
    ratingDialog.removeEventListener("click", null);
    ratingDialog.addEventListener("click", function (event) {
      if (event.target === ratingDialog) {
        console.log("Clicked outside dialog content, closing dialog");
        closeRatingDialog();
      }
    });
    console.log("Dialog background click listener added");
  }
  
  // Expose functions globally for direct access
  window.openItemRatingDialog = openRatingDialog;
  window.submitItemRating = submitRating;
  window.closeItemRatingDialog = closeRatingDialog;
}

/**
 * Helper function to show notifications
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (success, error)
 */
function showNotification(message, type = "success") {
  // Check if the notification function exists in the global scope
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    // Fallback to alert
    alert(message);
  }
}

/**
 * Helper function to get URL parameters
 * @param {string} name - Parameter name
 * @returns {string} Parameter value
 */
function getUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// Initialize the manager when the page loads
document.addEventListener("DOMContentLoaded", () => {
  window.itemDetailManager = new ItemDetailManager();
  initRatingDialog();
  
  // Make showMessage available globally
  window.showToast = (message, type) => {
    window.itemDetailManager.showMessage(message, type === 'error');
  };
});
