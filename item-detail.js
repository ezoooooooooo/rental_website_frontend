/**
 * Handle displaying and interacting with item details
 */
class ItemDetailManager {
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");

    this.initItemDetailPage();
    
    // Disable conflicting rating systems to avoid issues
    this.disableConflictingSystems();
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
    this.forceRefresh = params.get("refresh") === "true";

    if (!this.listingId) {
      this.showErrorMessage("No listing ID provided");
      return;
    }

    // Add a small delay to ensure DOM is ready
    setTimeout(() => {
      this.loadItemDetails();
    }, 100);
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

      // Load owner ratings if there's an owner ID - with retries for reliability
      let ownerId = null;
      
      // Try to extract owner ID from various possible structures
      if (item.ownerId) {
        ownerId = item.ownerId;
      } else if (item.owner) {
        if (typeof item.owner === 'object') {
          ownerId = item.owner.id || item.owner._id;
        } else {
          ownerId = item.owner;
        }
      }
      
      // Ensure ownerId is a string, not an object
      if (typeof ownerId === "object") {
        ownerId = ownerId.id || ownerId._id || null;
      }
      
      if (ownerId) {
        console.log("Found owner ID for ratings:", ownerId);
        this.ownerId = ownerId; // Store for later use
        
        // Set the owner ID for the seller rating form
        const sellerOwnerIdInput = document.getElementById('sellerRatingOwnerId');
        if (sellerOwnerIdInput) {
          sellerOwnerIdInput.value = ownerId;
        }
        
        // Load owner ratings with retry mechanism
        this.loadOwnerRatingsWithRetry(ownerId);
      } else {
        console.warn("No owner ID found for item, seller ratings cannot be loaded");
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
   * Load and display item ratings
   */
  async loadItemRatings() {
    if (!this.listingId) return;

    try {
      console.log("Loading item ratings for listing:", this.listingId);
      
      // Try to use the enhanced rating system first
      if (window.enhancedRatingSystem) {
        try {
          const ratingsData = await this.loadItemRatingsFromAPI();
          if (ratingsData) {
            this.displayItemRatings(ratingsData);
            // Button connection is now handled inside displayItemRatings methods
            return;
          }
        } catch (enhancedError) {
          console.log("Enhanced rating system failed, using manual rendering:", enhancedError);
        }
      }

      // Fallback: Use existing rating system if available
      if (window.ratingSystem) {
        await window.ratingSystem.loadItemRatings(this.listingId);
        // Button connection will be handled by the rating system
      } else {
        // Final fallback: Manual API call and rendering
        const ratingsData = await this.loadItemRatingsFromAPI();
        this.renderItemRatingsManually(ratingsData);
        // Button connection is handled inside renderItemRatingsManually
      }
    } catch (error) {
      console.error("Error loading item ratings:", error);
      // Show error state with Add Review button
      const container = document.getElementById("itemRatingContainer");
      if (container) {
        container.innerHTML = `
          <div class="rating-header">
            <h3>Item Ratings & Reviews</h3>
            <button class="rating-toggle-btn" id="addReviewBtn">
              <i class="ri-star-line"></i>
              Add Review
            </button>
          </div>
          <div class="no-reviews" style="padding: 20px; text-align: center; color: #666;">
            Unable to load item reviews. Please try again later.
          </div>
        `;
        setTimeout(() => this.connectAddReviewButtonImmediate(), 50);
      }
    }
  }

  /**
   * Load item ratings from API
   * GET /api/ratings/listing/:listingId (No authentication required)
   */
  async loadItemRatingsFromAPI() {
    console.log("Loading item ratings from API for listing:", this.listingId);
    
    try {
      const response = await fetch(`${this.baseUrl}/ratings/listing/${this.listingId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // No ratings found
          return { success: true, count: 0, data: [] };
        }
        throw new Error(`Failed to load item ratings: ${response.status}`);
      }

      const data = await response.json();
      console.log("Item ratings data received:", data);
      
      // Validate response structure matches the provided specification
      if (data.success !== undefined && data.count !== undefined && Array.isArray(data.data)) {
        console.log(`✅ GET response matches specification: ${data.count} ratings loaded`);
        return data;
      } else {
        console.warn("⚠️ Response structure doesn't match expected specification:", data);
        // Try to adapt the response to expected format
        return {
          success: true,
          count: Array.isArray(data) ? data.length : 0,
          data: Array.isArray(data) ? data : []
        };
      }
    } catch (error) {
      console.error("Error loading item ratings from API:", error);
      return { success: true, count: 0, data: [] };
    }
  }

  /**
   * Display item ratings using enhanced rating system or fallback
   */
  displayItemRatings(ratingsData) {
    // Try enhanced system first
    if (window.enhancedRatingSystem && ratingsData && ratingsData.data) {
      try {
        this.displayItemRatingsEnhanced(ratingsData);
      return;
      } catch (error) {
        console.log("Enhanced display failed, using manual rendering:", error);
      }
    }
    
    // Fallback to manual rendering
    this.renderItemRatingsManually(ratingsData);
  }

  /**
   * Display item ratings using enhanced rating system
   */
  displayItemRatingsEnhanced(ratingsData) {
    const container = document.getElementById('itemRatingContainer');
    if (!container) return;

    const ratings = ratingsData.data || [];
    const count = ratingsData.count || ratings.length;
    
    // Calculate average
    const totalScore = ratings.reduce((sum, rating) => sum + (rating.score || 0), 0);
    const averageScore = count > 0 ? totalScore / count : 0;

    // Check if the current user has already reviewed this item
    const userId = window.enhancedRatingSystem ? window.enhancedRatingSystem.getUserId() : null;
    const userReview = userId ? ratings.find(rating => 
      rating.user === userId || 
      (rating.user && rating.user._id === userId) ||
      rating.userId === userId
    ) : null;
    
    const hasUserReviewed = !!userReview;
    const reviewBtnText = hasUserReviewed 
      ? '<i class="ri-edit-line"></i> Edit Review' 
      : '<i class="ri-star-line"></i> Add Review';
    const reviewBtnClass = hasUserReviewed ? 'rating-toggle-btn edit-mode' : 'rating-toggle-btn';

    let html = `
        <div class="rating-header">
        <h3><i class="ri-box-3-line"></i> Item Ratings & Reviews</h3>
        <button id="addReviewBtn" class="${reviewBtnClass}">
          ${reviewBtnText}
        </button>
        </div>
    `;

    // Show summary if there are ratings
    if (count > 0) {
      html += `
        <div class="rating-summary">
          <div class="rating-average">
            <div class="rating-average-value">${averageScore.toFixed(1)}</div>
            <div class="rating-average-stars">
              ${this.generateStarRatingHTML(averageScore)}
            </div>
            <div class="rating-count">${count} ${count === 1 ? 'review' : 'reviews'}</div>
          </div>
        </div>
      `;
    }

    // Add reviews list
    html += `<div class="review-list">`;
    
    if (ratings.length === 0) {
      html += `
        <div class="no-reviews" style="padding: 20px; text-align: center; color: #666;">
          <i class="ri-emotion-sad-line"></i>
          <p>No reviews yet for this item.</p>
          <small>Be the first to share your experience!</small>
        </div>
      `;
    } else {
      // Sort by date (newest first)
      const sortedRatings = ratings.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      sortedRatings.forEach(rating => {
        const reviewerName = rating.user?.firstName && rating.user?.lastName 
          ? `${rating.user.firstName} ${rating.user.lastName}`
          : rating.user?.username || 'Anonymous';
          
        const isUserReview = rating.user === userId || 
                           (rating.user && rating.user._id === userId) ||
                           rating.userId === userId;
        
        html += `
          <div class="review-item" data-rating-id="${rating._id}" data-user-id="${rating.user?._id || rating.user || rating.userId}" data-rating-type="item">
            <div class="review-header">
              <div class="reviewer-info">
                <div class="reviewer-name">
                  ${isUserReview ? '<i class="ri-user-line"></i> You' : `<i class="ri-user-3-line"></i> ${reviewerName}`}
                  ${isUserReview ? '<span class="user-review-badge"><i class="ri-shield-check-line"></i> Your Review</span>' : ''}
                </div>
                <div class="review-date"><i class="ri-calendar-line"></i> ${new Date(rating.createdAt).toLocaleDateString()}</div>
              </div>
              <div class="review-rating">
                ${this.generateStarRatingHTML(rating.score)}
                <span class="rating-score">${rating.score}/5</span>
              </div>
            </div>
            <div class="review-content">
              <p><i class="ri-chat-quote-line"></i> ${rating.comment || 'No comment provided.'}</p>
            </div>
            ${isUserReview ? `
              <div class="review-actions">
                <button class="review-action-btn edit-btn" onclick="window.enhancedRatingSystem.editReview('${rating._id}', 'item')">
                  <i class="ri-edit-line"></i> Edit
                </button>
                <button class="review-action-btn delete-btn" onclick="window.enhancedRatingSystem.deleteRating('${rating._id}', 'item')">
                  <i class="ri-delete-bin-line"></i> Delete
                </button>
              </div>
            ` : ''}
          </div>
        `;
      });
    }
    
    html += '</div>';
    container.innerHTML = html;
    
    console.log('Item ratings HTML generated and inserted');
    
    // Connect the Add Review button immediately after HTML insertion with proper timing
    setTimeout(() => {
      this.connectAddReviewButtonImmediate();
    }, 50);
  }

  /**
   * Manually render item ratings when enhanced system is not available
   */
  renderItemRatingsManually(data) {
    const container = document.getElementById("itemRatingContainer");
    if (!container) {
      console.error("Item rating container not found");
      return;
    }

    console.log("Rendering item ratings manually with data:", data);

    // Process ratings data
    let ratings = [];
    let averageScore = 0;
    let count = 0;

    if (data) {
      if (Array.isArray(data)) {
        ratings = data;
        count = data.length;
        averageScore = count > 0 ? data.reduce((sum, r) => sum + (r.score || r.rating || 0), 0) / count : 0;
      } else if (data.ratings || data.data) {
        ratings = data.ratings || data.data || [];
        count = data.count || ratings.length;
        averageScore = data.averageScore || (count > 0 ? ratings.reduce((sum, r) => sum + (r.score || r.rating || 0), 0) / count : 0);
      }
    }

    console.log(`Processed item ratings: ${ratings.length} items, average: ${averageScore}, count: ${count}`);

    // Check if the current user has already reviewed this item
    const userId = window.enhancedRatingSystem ? window.enhancedRatingSystem.getUserId() : null;
    const userReview = userId ? ratings.find(rating => 
      rating.user === userId || 
      (rating.user && rating.user._id === userId) ||
      rating.userId === userId
    ) : null;
    
    const hasUserReviewed = !!userReview;
    const reviewBtnText = hasUserReviewed 
      ? '<i class="ri-edit-line"></i> Edit Review' 
      : '<i class="ri-star-line"></i> Add Review';
    const reviewBtnClass = hasUserReviewed ? 'rating-toggle-btn edit-mode' : 'rating-toggle-btn';

    // Generate HTML
    let html = `
          <div class="rating-header">
        <h3>Item Ratings & Reviews</h3>
        <button class="${reviewBtnClass}" id="addReviewBtn">
          ${reviewBtnText}
            </button>
      </div>
    `;

    // Show summary if there are ratings
    if (count > 0) {
      html += `
        <div class="rating-summary">
          <div class="rating-average">
            <div class="rating-average-value">${averageScore.toFixed(1)}</div>
            <div class="rating-average-stars">
              ${this.generateStarRatingHTML(averageScore)}
            </div>
            <div class="rating-count">${count} ${count === 1 ? "review" : "reviews"}</div>
          </div>
          </div>
        `;
      }

    html += `<div class="review-list">`;

    if (ratings.length === 0) {
      html += `<div class="no-reviews" style="padding: 20px; text-align: center; color: #666;">No reviews yet for this item.</div>`;
    } else {
      // Sort ratings by date (newest first)
      const sortedRatings = ratings.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0);
        const dateB = new Date(b.createdAt || b.date || 0);
        return dateB - dateA;
      });

      sortedRatings.forEach((rating) => {
        const reviewerName = rating.user?.firstName && rating.user?.lastName 
          ? `${rating.user.firstName} ${rating.user.lastName}`
          : rating.user?.username || rating.user?.name || 'Anonymous';
          
        const reviewDate = rating.createdAt || rating.date;
        const reviewScore = rating.score || rating.rating || 0;
        const reviewComment = rating.comment || rating.review || rating.text || "No comment provided.";

        html += `
          <div class="review-item" style="border-bottom: 1px solid #eee; padding: 15px 0; margin-bottom: 15px;">
            <div class="review-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div class="reviewer-info">
                <div class="reviewer-name" style="font-weight: 600; color: #333;">${reviewerName}</div>
                ${reviewDate ? `<div class="review-date" style="font-size: 0.9em; color: #666;">${new Date(reviewDate).toLocaleDateString()}</div>` : ''}
              </div>
              <div class="review-rating">
                ${this.generateStarRatingHTML(reviewScore)}
              </div>
            </div>
            <div class="review-content">
              <p style="margin: 0; color: #555; line-height: 1.5;">${reviewComment}</p>
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;
    container.innerHTML = html;
    
    console.log("Item ratings rendered successfully");
    
    // Connect the Add Review button immediately after rendering
    setTimeout(() => {
      this.connectAddReviewButtonImmediate();
    }, 50);
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
   * Connect the Add Review button functionality
   */
  connectAddReviewButton() {
    // Use setTimeout to ensure this runs after any inline HTML JavaScript
    setTimeout(() => {
      this.forceConnectAddReviewButton(0);
    }, 500);
  }

  /**
   * Connect the Add Review button immediately after HTML generation
   */
  connectAddReviewButtonImmediate() {
    const addReviewBtn = document.getElementById('addReviewBtn');
    if (!addReviewBtn) {
      console.warn("Add Review button not found for immediate connection");
      return false;
    }
    
      console.log("Immediately connecting Add Review button for item:", this.listingId);
      
      // Preserve button text and class
      const buttonText = addReviewBtn.innerHTML;
      const buttonClass = addReviewBtn.className;
      const isEditMode = addReviewBtn.classList.contains('edit-mode');
      
      // Remove any existing event listeners by cloning the node
      const newAddReviewBtn = addReviewBtn.cloneNode(true);
      addReviewBtn.parentNode.replaceChild(newAddReviewBtn, addReviewBtn);
      
      // Add our custom click handler
      newAddReviewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Add Review button clicked (immediate handler)");
        
        // Use enhanced rating system if available
        if (window.enhancedRatingSystem) {
          console.log("Opening enhanced rating system for item");
          
          // If the button is in edit mode, find the user's review to edit
          if (isEditMode) {
            // Find the user's review
            const userId = window.enhancedRatingSystem.getUserId();
            if (userId) {
              const reviewItems = document.querySelectorAll('.review-item[data-rating-type="item"], .review-list .review-item');
              const userReview = Array.from(reviewItems).find(item => {
                const reviewUserId = item.dataset.userId;
                return reviewUserId === userId;
              });
              
              if (userReview) {
                const ratingId = userReview.dataset.ratingId;
                if (ratingId) {
                  // Call editReview instead of just opening the dialog
                  window.enhancedRatingSystem.editReview(ratingId, 'item');
                  return;
                }
              }
            }
          }
          
          // If not in edit mode or couldn't find the review, just open the dialog
          window.enhancedRatingSystem.openDialog('item');
        } else if (typeof openRatingDialog === 'function') {
          console.log("Opening fallback rating dialog");
          openRatingDialog();
        } else {
          console.warn("No rating dialog system found");
          this.showErrorMessage("Rating system not available. Please refresh the page and try again.");
        }
      });
      
      console.log("Add Review button connected immediately and successfully");
      return true;
  }

  /**
   * Force connect the Add Review button, overriding any existing handlers
   * @param {number} retryCount - Current retry attempt count
   */
  forceConnectAddReviewButton(retryCount = 0) {
    const addReviewBtn = document.getElementById('addReviewBtn');
    if (addReviewBtn) {
      console.log("Force connecting Add Review button for item:", this.listingId);
      
      // Create a completely new button element to ensure clean state
      const newAddReviewBtn = document.createElement('button');
      newAddReviewBtn.className = addReviewBtn.className;
      newAddReviewBtn.id = addReviewBtn.id;
      newAddReviewBtn.type = 'button';
      newAddReviewBtn.innerHTML = '<i class="ri-star-line"></i> Add Review';
      
      // Replace the old button
      addReviewBtn.parentNode.replaceChild(newAddReviewBtn, addReviewBtn);
      
      // Add our custom click handler
      newAddReviewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Add Review button clicked (custom handler)");
        
        // Set the listing ID for the item rating form
        const itemRatingListingIdInput = document.getElementById('itemRatingListingId');
        if (itemRatingListingIdInput) {
          itemRatingListingIdInput.value = this.listingId;
          console.log("Set item listing ID to:", this.listingId);
        }
        
        // Use enhanced rating system if available
        if (window.enhancedRatingSystem) {
          console.log("Opening enhanced rating system for item");
          window.enhancedRatingSystem.openDialog('item');
        } else if (typeof openRatingDialog === 'function') {
          console.log("Opening fallback rating dialog");
          openRatingDialog();
        } else {
          console.warn("No rating dialog system found");
          this.showErrorMessage("Rating system not available. Please refresh the page and try again.");
        }
      });
      
      console.log("Add Review button force connected successfully");
    } else {
      const maxRetries = 3;
      if (retryCount < maxRetries) {
        console.warn(`Add Review button not found in DOM (attempt ${retryCount + 1}/${maxRetries + 1})`);
        // Retry after a delay if button not found
        setTimeout(() => {
          this.forceConnectAddReviewButton(retryCount + 1);
        }, 1000);
      } else {
        console.error("Add Review button not found after maximum retries. Button may not exist or may be dynamically generated.");
        // Let's check if there are any buttons with similar names or if the button exists with a different selector
        this.debugAddReviewButton();
      }
    }
  }

  /**
   * Debug method to find out what's happening with the Add Review button
   */
  debugAddReviewButton() {
    console.log("=== Debugging Add Review Button ===");
    
    // Check if button exists with different selectors
    const buttonById = document.getElementById('addReviewBtn');
    const buttonsByClass = document.querySelectorAll('.rating-toggle-btn');
    const buttonsWithText = Array.from(document.querySelectorAll('button')).filter(btn => 
      btn.textContent.includes('Add Review') || btn.textContent.includes('Review')
    );
    
    console.log("Button by ID 'addReviewBtn':", buttonById);
    console.log("All buttons with class 'rating-toggle-btn':", buttonsByClass);
    console.log("All buttons containing 'Review' text:", buttonsWithText);
    
    // Check for duplicate buttons
    if (buttonsWithText.length > 1) {
      console.warn(`WARNING: Found ${buttonsWithText.length} buttons with 'Review' text - this may cause conflicts!`);
      buttonsWithText.forEach((btn, index) => {
        console.log(`Button ${index + 1}:`, {
          element: btn,
          id: btn.id,
          className: btn.className,
          textContent: btn.textContent.trim(),
          parentElement: btn.parentElement,
          eventListeners: (typeof getEventListeners === 'function') ? getEventListeners(btn) : 'Cannot detect listeners'
        });
      });
    }
    
    // Check if the item ratings container exists
    const itemRatingContainer = document.getElementById('itemRatingContainer');
    console.log("Item rating container:", itemRatingContainer);
    
    // Check which rating systems are active
    const ratingSystems = {
      ratingSystem: window.ratingSystem,
      enhancedRatingSystem: window.enhancedRatingSystem,
      consolidatedRating: window.consolidatedRating,
      itemDetailManager: window.itemDetailManager
    };
    
    console.log("Active rating systems:", ratingSystems);
    
    // Check for conflicting event handlers
    this.checkForConflictingHandlers();
    
    // If we find buttons with similar text, try to connect to ALL of them
          if (buttonsWithText.length > 0) {
        console.log("Connecting to ALL Review buttons found...");
        buttonsWithText.forEach((reviewBtn, index) => {
          // Skip tab buttons and modal buttons
          if (reviewBtn.classList.contains('tab-btn') || 
              reviewBtn.id === 'itemSubmitBtn' || 
              reviewBtn.id === 'sellerSubmitBtn') {
            console.log(`Skipping tab/modal button ${index + 1}: "${reviewBtn.textContent.trim()}"`);
            return;
          }
          
          console.log(`Connecting to button ${index + 1}...`);
          this.connectToReviewButton(reviewBtn);
        });
      }
  }

  /**
   * Check for conflicting event handlers and systems
   */
  checkForConflictingHandlers() {
    console.log("=== Checking for Conflicting Systems ===");
    
    // Check if HTML inline functions exist
    const inlineFunctions = {
      handleAddReviewClick: typeof window.handleAddReviewClick,
      updateAddReviewButtonText: typeof window.updateAddReviewButtonText,
      toggleReviewForm: typeof window.toggleReviewForm,
      showRatingDialog: typeof window.showRatingDialog
    };
    
    console.log("Inline HTML functions:", inlineFunctions);
    
    // Check if consolidated rating systems exist
    const consolidatedFunctions = {
      openRatingDialog: typeof window.openRatingDialog,
      closeRatingDialog: typeof window.closeRatingDialog
    };
    
    console.log("Consolidated rating functions:", consolidatedFunctions);
    
    // Recommend solutions
    if (inlineFunctions.handleAddReviewClick === 'function') {
      console.warn("⚠️ CONFLICT: HTML inline 'handleAddReviewClick' function detected!");
      console.log("💡 SOLUTION: This function may be overriding our custom handler.");
    }
    
    if (inlineFunctions.updateAddReviewButtonText === 'function') {
      console.warn("⚠️ CONFLICT: HTML inline 'updateAddReviewButtonText' function detected!");
      console.log("💡 SOLUTION: This function may be recreating the button and removing our handlers.");
    }
  }

  /**
   * Connect to any review button we find
   */
  connectToReviewButton(button) {
    if (!button) return;
    
    console.log("Connecting to review button:", button);
    
    // Remove existing listeners
    const newBtn = button.cloneNode(true);
    button.parentNode.replaceChild(newBtn, button);
    
    // Add our handler
    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Review button clicked (fallback handler)");
      
      // Use enhanced rating system if available
      if (window.enhancedRatingSystem) {
        console.log("Opening enhanced rating system for item");
        window.enhancedRatingSystem.openDialog('item');
      } else if (typeof openRatingDialog === 'function') {
        console.log("Opening fallback rating dialog");
        openRatingDialog();
              } else {
          console.warn("No rating dialog system found");
          this.showErrorMessage("Rating system not available. Please refresh the page and try again.");
        }
    });
    
    console.log("Review button connected successfully (fallback)");
  }

  /**
   * Disable conflicting systems to ensure our button handler takes priority
   */
  disableConflictingSystems() {
    console.log("🔧 Disabling conflicting rating systems...");
    
    // Disable HTML inline functions by overriding them
    if (typeof window.handleAddReviewClick === 'function') {
      console.log("Disabling HTML handleAddReviewClick function");
      const originalFunction = window.handleAddReviewClick;
      window.handleAddReviewClick = (event) => {
        event.preventDefault();
        console.log("HTML handleAddReviewClick disabled - using enhanced system instead");
        // Use our enhanced system instead
        if (window.enhancedRatingSystem) {
          window.enhancedRatingSystem.openDialog('item');
        }
      };
    }
    
    // Disable updateAddReviewButtonText to prevent button recreation
    if (typeof window.updateAddReviewButtonText === 'function') {
      console.log("Disabling HTML updateAddReviewButtonText function");
      window.updateAddReviewButtonText = (userHasRated) => {
        console.log("HTML updateAddReviewButtonText disabled - preserving custom button");
        // Do nothing to preserve our custom button
      };
    }
    
    // Override showRatingDialog if it exists to use our system
    if (typeof window.showRatingDialog === 'function') {
      console.log("Overriding showRatingDialog to use enhanced system");
      const originalShowRatingDialog = window.showRatingDialog;
      window.showRatingDialog = (event, element) => {
        event.preventDefault();
        console.log("showRatingDialog overridden - using enhanced system");
        if (window.enhancedRatingSystem) {
          window.enhancedRatingSystem.openDialog('item');
        } else {
          // Fallback to original if enhanced system not available
          originalShowRatingDialog.call(this, event, element);
        }
      };
    }
    
    // Override toggleReviewForm to use our system
    if (typeof window.toggleReviewForm === 'function') {
      console.log("Overriding toggleReviewForm to use enhanced system");
      window.toggleReviewForm = (event) => {
        event?.preventDefault();
        console.log("toggleReviewForm overridden - using enhanced system");
        if (window.enhancedRatingSystem) {
          window.enhancedRatingSystem.openDialog('item');
        }
      };
    }
    
    // Override submitItemReview to use our system
    if (typeof window.submitItemReview === 'function') {
      console.log("Overriding submitItemReview to use enhanced system");
      window.submitItemReview = (event) => {
        event?.preventDefault();
        console.log("submitItemReview overridden - using enhanced system");
        // This function should not be called directly anymore
        this.showErrorMessage("Please use the rating dialog to submit your review");
      };
    }
    
    console.log("✅ Conflicting systems disabled");
  }

  /**
   * Alternative method to connect Add Review button using different approaches
   */
  alternativeConnectAddReviewButton() {
    setTimeout(() => {
      console.log("Trying alternative Add Review button connection methods...");
      
      // First, disable conflicting systems
      this.disableConflictingSystems();
      
      // Method 1: Try by class and text content
      const ratingToggleBtns = document.querySelectorAll('.rating-toggle-btn');
      ratingToggleBtns.forEach(btn => {
        if (btn.textContent.includes('Add Review') || btn.textContent.includes('Review')) {
          console.log("Found Add Review button by class and text, connecting...");
          this.connectToReviewButton(btn);
          return;
        }
      });
      
      // Method 2: Try to find in item rating container
      const itemContainer = document.querySelector('[data-tab="item-ratings"]');
      if (itemContainer) {
        const reviewBtn = itemContainer.querySelector('button');
        if (reviewBtn && (reviewBtn.textContent.includes('Review') || reviewBtn.textContent.includes('Add'))) {
          console.log("Found Add Review button in item container, connecting...");
          this.connectToReviewButton(reviewBtn);
          return;
        }
      }
      
      // Method 3: Check if rating systems have created the button
      if (window.ratingSystem && typeof window.ratingSystem.connectAddReviewButton === 'function') {
        console.log("Using rating system's connect method");
        window.ratingSystem.connectAddReviewButton();
      }
      
      // Method 4: Create the button if it doesn't exist
      this.createAddReviewButtonIfMissing();
      
    }, 2000); // Wait longer for other systems to finish loading
  }

  /**
   * Create the Add Review button if it's missing
   */
  createAddReviewButtonIfMissing() {
    // We no longer want to create buttons in the title tab
    // The enhanced rating system will handle this
    console.log("Skipping Add Review button creation - using enhanced rating system popup only");
  }

  /**
   * Ensure permanent control over all review buttons
   */
  ensurePermanentButtonControl() {
    // Set up a periodic check to maintain control
    const maintainControl = () => {
      console.log("🔄 Maintaining control over review buttons...");
      
      // Find ALL buttons that might be review buttons
      const allReviewButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
        const text = btn.textContent.toLowerCase();
        return text.includes('review') || text.includes('add review') || text.includes('rate');
      });
      
      // Connect our handler to each one, but skip tab buttons
      allReviewButtons.forEach((btn, index) => {
        // Skip tab navigation buttons
        if (btn.classList.contains('tab-btn')) {
          console.log(`Skipping tab button: "${btn.textContent.trim()}"`);
          return;
        }
        
        // Skip submit buttons in modal
        if (btn.id === 'itemSubmitBtn' || btn.id === 'sellerSubmitBtn') {
          console.log(`Skipping modal submit button: "${btn.textContent.trim()}"`);
          return;
        }
        
        if (btn.textContent.toLowerCase().includes('review') && !btn.textContent.toLowerCase().includes('seller')) {
          // This is an item review button
          const hasOurHandler = btn.dataset.customHandler === 'true';
          
          if (!hasOurHandler) {
            console.log(`Taking control of review button ${index + 1}: "${btn.textContent.trim()}"`);
            this.forceConnectToReviewButton(btn);
            btn.dataset.customHandler = 'true';
          }
        }
      });
    };
    
    // Run immediately
    maintainControl();
    
    // Run every 5 seconds to maintain control
    setInterval(maintainControl, 5000);
    
    // Also run when DOM changes
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any added nodes contain buttons
          Array.from(mutation.addedNodes).forEach(node => {
            if (node.nodeType === 1) { // Element node
              const buttons = node.querySelectorAll ? node.querySelectorAll('button') : [];
              if (buttons.length > 0 || node.tagName === 'BUTTON') {
                shouldCheck = true;
              }
            }
          });
        }
      });
      
      if (shouldCheck) {
        setTimeout(maintainControl, 100);
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    console.log("✅ Permanent button control system activated");
  }

  /**
   * Force connect to any review button with our handler
   */
  forceConnectToReviewButton(button) {
    if (!button) return;
    
    // Remove ALL existing event listeners by cloning
    const newBtn = button.cloneNode(true);
    button.parentNode.replaceChild(newBtn, button);
    
    // Mark as ours
    newBtn.dataset.customHandler = 'true';
    
    // Add our exclusive handler
    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      console.log(`🎯 Custom handler activated for: "${newBtn.textContent.trim()}"`);
      
      // Use enhanced rating system
      if (window.enhancedRatingSystem) {
        window.enhancedRatingSystem.openDialog('item');
      } else if (typeof openRatingDialog === 'function') {
        openRatingDialog();
      } else {
        this.showErrorMessage("Rating system not available. Please refresh the page.");
      }
    }, true); // Use capture phase for higher priority
    
    console.log(`✅ Force connected to button: "${newBtn.textContent.trim()}"`);
  }

  /**
   * Connect the Rate Seller button functionality
   */
  connectRateSellerButton() {
    const rateSellerBtn = document.getElementById('rateSellerBtn');
    
    if (!rateSellerBtn) {
      console.warn("Rate Seller button not found in DOM");
      return;
    }

    // Try to get owner ID from multiple sources if not already set
    if (!this.ownerId) {
      const params = new URLSearchParams(window.location.search);
      this.ownerId = params.get('ownerId') || params.get('sellerId');
      
      if (!this.ownerId) {
        const sellerOwnerIdInput = document.getElementById('sellerRatingOwnerId');
        if (sellerOwnerIdInput && sellerOwnerIdInput.value) {
          this.ownerId = sellerOwnerIdInput.value;
        }
      }
      
      if (!this.ownerId) {
        console.warn("No owner ID available for Rate Seller button from any source");
      }
    }
    
    console.log("Connecting Rate Seller button for owner:", this.ownerId);
    
    // Remove any existing click listeners by replacing the node
    const newRateSellerBtn = rateSellerBtn.cloneNode(true);
    rateSellerBtn.parentNode.replaceChild(newRateSellerBtn, rateSellerBtn);
    
    newRateSellerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Rate Seller button clicked");
      
      // Get the current owner ID (might have been updated since connection)
      const currentOwnerId = this.ownerId || document.getElementById('sellerRatingOwnerId')?.value;
      
      if (!currentOwnerId) {
        console.error("No owner ID available when Rate Seller button clicked");
        this.showErrorMessage("Owner information not available. Please refresh the page and try again.");
        return;
      }
      
      // Set the owner ID for the seller rating form
      const sellerOwnerIdInput = document.getElementById('sellerRatingOwnerId');
      if (sellerOwnerIdInput) {
        sellerOwnerIdInput.value = currentOwnerId;
        console.log("Set seller owner ID to:", currentOwnerId);
      }
      
      // Use enhanced rating system with seller tab
      if (window.enhancedRatingSystem) {
        window.enhancedRatingSystem.openDialog('seller');
              } else if (typeof openSellerRatingDialog === 'function') {
          openSellerRatingDialog();
        } else {
          console.warn("No rating dialog system found");
          this.showErrorMessage("Rating system not available. Please refresh the page and try again.");
        }
    });
    
    console.log("Rate Seller button connected successfully");
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
  
    // Add featured badge if item is featured
    const itemHeaderContainer = document.querySelector(".item-detail-info h1") || document.getElementById("itemName");
    if (itemHeaderContainer && item.featured) {
      // Check if featured badge already exists to avoid duplicates
      if (!itemHeaderContainer.querySelector('.featured-badge-detail')) {
        const featuredBadge = document.createElement('span');
        featuredBadge.className = 'featured-badge-detail';
        featuredBadge.innerHTML = '⭐ Featured';
        itemHeaderContainer.after(featuredBadge);
      }
    }

    // Add status label if item is reserved or rented
    const itemStatusContainer = document.getElementById("itemStatusContainer");
    if (itemStatusContainer) {
      if (item.status && (item.status === 'reserved' || item.status === 'rented')) {
        itemStatusContainer.innerHTML = `<div class="item-status-label ${item.status}">${item.status === 'reserved' ? 'Reserved' : 'Rented'}</div>`;
        itemStatusContainer.style.display = 'block';
        
        // Keep the Add to Cart button enabled but add a data attribute to indicate status
        const addToCartBtn = document.getElementById("addToCartBtn");
        if (addToCartBtn) {
          // Instead of disabling, store the status as a data attribute
          addToCartBtn.dataset.itemStatus = item.status;
          addToCartBtn.title = `This item is currently ${item.status} and not available for rent`;
          
          // Add a click handler to show a message when clicked
          addToCartBtn.onclick = (e) => {
            e.preventDefault();
            this.showErrorMessage(`This item is currently ${item.status}. It's not available for rent at the moment.`);
            return false;
          };
        }
      } else {
        itemStatusContainer.style.display = 'none';
      }
    }
    
    // Update description
    document.getElementById("itemDescription").textContent = item.description || "No description available.";
    
    // Add average rating to the item rating summary
    const ratingSnapshot = document.getElementById("ratingSnapshot");
    if (ratingSnapshot) {
      // First try to load the ratings directly from the API
      this.loadItemRatingsForSnapshot(ratingSnapshot);
    }
    
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

    // Store owner ID for the enhanced rating system
    this.ownerId = ownerId;
    
    // Connect the Rate Seller button with the owner ID
    this.connectRateSellerButton();
    
    // The enhanced rating system popup handles item reviews
    // No need to connect title tab buttons anymore
    console.log("Item review functionality handled by enhanced rating system popup");
  }
  
  /**
   * Load item ratings specifically for the snapshot in the item detail info
   * @param {HTMLElement} container - The container to render the rating snapshot
   */
  async loadItemRatingsForSnapshot(container) {
    if (!container || !this.listingId) return;
    
    try {
      // Show loading state
      container.innerHTML = `
        <div class="star-rating readonly loading">
          <i class="ri-star-line"></i>
          <i class="ri-star-line"></i>
          <i class="ri-star-line"></i>
          <i class="ri-star-line"></i>
          <i class="ri-star-line"></i>
        </div>
        <span class="review-count">Loading ratings...</span>
      `;
      
      // Fetch ratings from API
      const response = await fetch(`${this.baseUrl}/ratings/listing/${this.listingId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // No ratings found
          container.innerHTML = `
            <div class="star-rating readonly">
              <i class="ri-star-line"></i>
              <i class="ri-star-line"></i>
              <i class="ri-star-line"></i>
              <i class="ri-star-line"></i>
              <i class="ri-star-line"></i>
            </div>
            <span class="review-count">No reviews yet</span>
          `;
          return;
        }
        throw new Error(`Failed to load ratings: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Ratings data for snapshot:", data);
      
      // Calculate average rating and count
      let ratings = [];
      let averageRating = 0;
      let count = 0;
      
      // Handle different API response formats
      if (Array.isArray(data)) {
        ratings = data;
        count = data.length;
        averageRating = count > 0 ? data.reduce((sum, r) => sum + (r.score || r.rating || 0), 0) / count : 0;
      } else if (data && typeof data === 'object') {
        ratings = data.data || data.ratings || [];
        count = data.count || ratings.length;
        averageRating = data.averageScore || data.average || 
          (count > 0 ? ratings.reduce((sum, r) => sum + (r.score || r.rating || 0), 0) / count : 0);
      }
      
      // Render the rating snapshot - only stars, no numeric rating
      if (averageRating > 0) {
        container.innerHTML = `
          ${this.generateStarRatingHTML(averageRating)}
          <span class="review-count">${count} ${count === 1 ? 'review' : 'reviews'}</span>
        `;
      } else {
        container.innerHTML = `
          <div class="star-rating readonly">
            <i class="ri-star-line"></i>
            <i class="ri-star-line"></i>
            <i class="ri-star-line"></i>
            <i class="ri-star-line"></i>
            <i class="ri-star-line"></i>
          </div>
          <span class="review-count">No reviews yet</span>
        `;
      }
    } catch (error) {
      console.error("Error loading ratings for snapshot:", error);
      container.innerHTML = `
        <div class="star-rating readonly">
          <i class="ri-star-line"></i>
          <i class="ri-star-line"></i>
          <i class="ri-star-line"></i>
          <i class="ri-star-line"></i>
          <i class="ri-star-line"></i>
        </div>
        <span class="review-count">Unable to load ratings</span>
      `;
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
  
      // This is the key part: Always show the message from the backend
      // if the response is not ok (includes 400 status for reserved/rented items)
      if (!response.ok) {
        this.showErrorMessage(data.message || "Error adding item to cart");
        return;
      }
  
      this.showMessage(data.message || "Item added to cart");
  
      // Update cart badge if function exists
      if (typeof updateCartBadgeWithAnimation === "function") {
        updateCartBadgeWithAnimation();
      }
    } catch (error) {
      console.error("Exception caught while adding to cart:", error);
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
   * @param {boolean|string} typeOrIsError - Type of notification ('success', 'error', 'info', 'warning') or boolean for backward compatibility
   */
  showMessage(message, typeOrIsError = false) {
    // Check if notification container exists, create if not
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      toastContainer.className = "notification-container";
      document.body.appendChild(toastContainer);
    }
    
    // Handle both string types and boolean isError for backward compatibility
    let type;
    if (typeof typeOrIsError === 'string') {
      type = typeOrIsError;
    } else {
      type = typeOrIsError ? 'error' : 'success';
    }
    
    // Create toast element
    const toast = document.createElement("div");
    toast.className = `notification ${type}`;
    
    // Set icon based on type
    let icon;
    switch(type) {
      case 'success':
        icon = '<i class="ri-check-line notification-icon"></i>';
        break;
      case 'error':
        icon = '<i class="ri-error-warning-line notification-icon"></i>';
        break;
      case 'warning':
        icon = '<i class="ri-alert-line notification-icon"></i>';
        break;
      case 'info':
        icon = '<i class="ri-information-line notification-icon"></i>';
        break;
      default:
        icon = '<i class="ri-information-line notification-icon"></i>';
    }
    
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

  /**
   * Set the owner ID for this item
   * @param {string} ownerId - ID of the owner
   */
  setOwnerId(ownerId) {
    if (ownerId) {
      console.log("Setting owner ID to:", ownerId);
      this.ownerId = ownerId;
      
      // Also update the hidden input field
      const sellerOwnerIdInput = document.getElementById('sellerRatingOwnerId');
      if (sellerOwnerIdInput) {
        sellerOwnerIdInput.value = ownerId;
      }
      
      // Reconnect the Rate Seller button with the new owner ID
      this.connectRateSellerButton();
    }
  }

  /**
   * Force reload seller ratings for current item
   */
  async forceReloadSellerRatings() {
    if (!this.ownerId) {
      console.log("No owner ID available for force reload");
      return;
    }
    
    console.log("Force reloading seller ratings for owner:", this.ownerId);
    
    // Clear any cached data
    delete this.cachedOwnerRatings;
    
    // Reload with retry mechanism
    await this.loadOwnerRatingsWithRetry(this.ownerId);
  }

  /**
   * Load owner ratings with retry mechanism
   * @param {string} ownerId - ID of the owner to load ratings for
   * @param {number} retryCount - Current retry attempt
   */
  async loadOwnerRatingsWithRetry(ownerId, retryCount = 0) {
    if (!ownerId) {
      console.warn("No owner ID provided for loadOwnerRatingsWithRetry");
      this.displayEmptySellerRatings(null);
      return { success: false, count: 0, data: [] };
    }
    
    const maxRetries = 3;
    
    try {
      console.log(`Loading owner ratings for ID: ${ownerId} (attempt ${retryCount + 1})`);
      return await this.loadOwnerRatings(ownerId);
    } catch (error) {
      console.error(`Error loading owner ratings (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < maxRetries) {
        console.log(`Retrying owner ratings load in ${(retryCount + 1) * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return this.loadOwnerRatingsWithRetry(ownerId, retryCount + 1);
      } else {
        console.error("Max retries reached for loading owner ratings");
        
        // Show error in container if available
        const container = document.getElementById("ownerRatingContainer");
        if (container) {
          container.innerHTML = `
            <div class="rating-header">
              <h3><i class="ri-user-star-line"></i> Seller Ratings & Reviews</h3>
              <button id="rateSellerBtn" class="rating-toggle-btn">
                <i class="ri-user-star-line"></i> Rate Seller
              </button>
            </div>
            <div class="no-reviews" style="padding: 20px; text-align: center; color: #666;">
              <i class="ri-emotion-sad-line"></i>
              <p>Unable to load seller reviews. Please try again later.</p>
            </div>
          `;
          
          // Connect the Rate Seller button even in error state
          setTimeout(() => {
            this.connectRateSellerButton();
          }, 100);
        }
        
        // Return empty data instead of throwing error
        return { success: false, count: 0, data: [] };
      }
    }
  }

  /**
   * Load owner/seller ratings
   * @param {string} ownerId - ID of the owner to load ratings for
   */
  async loadOwnerRatings(ownerId) {
    if (!ownerId) {
      console.warn("No owner ID provided for loadOwnerRatings");
      this.displayEmptySellerRatings(null);
      return { success: true, count: 0, data: [] };
    }

    console.log("Loading owner ratings for ID:", ownerId);

    try {
      // Use the enhanced rating system if available
      if (window.enhancedRatingSystem) {
        try {
        const ratingsData = await window.enhancedRatingSystem.loadSellerRatings(ownerId);
        if (ratingsData) {
          window.enhancedRatingSystem.displaySellerRatings(ratingsData, ownerId);
          return ratingsData;
          }
        } catch (enhancedError) {
          console.log("Enhanced rating system failed to load seller ratings:", enhancedError);
          // Continue with fallback approach
        }
      }

      // Fallback: Load ratings manually
      const response = await fetch(`${this.baseUrl}/owner-ratings/owner/${ownerId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log("No owner ratings found");
          this.displayEmptySellerRatings(ownerId);
          return { success: true, count: 0, data: [] };
        }
        throw new Error(`Failed to load owner ratings: ${response.status}`);
      }

      const ratingsData = await response.json();
      console.log("Owner ratings loaded:", ratingsData);
      
             // Display using enhanced system if available
       if (window.enhancedRatingSystem) {
         window.enhancedRatingSystem.displaySellerRatings(ratingsData, ownerId);
      } else {
        this.displaySellerRatings(ratingsData, ownerId);
       }
       
       // Ensure Rate Seller button is connected
       setTimeout(() => {
         this.connectRateSellerButton();
       }, 100);
       
       return ratingsData;
      
    } catch (error) {
      console.error("Error loading owner ratings:", error);
      // Even on error, display empty ratings UI so the tab isn't blank
      this.displayEmptySellerRatings(ownerId);
      return { success: false, count: 0, data: [] };
    }
  }

  /**
   * Display empty seller ratings with a Rate Seller button
   * @param {string} ownerId - ID of the owner
   */
  displayEmptySellerRatings(ownerId) {
    const container = document.getElementById("ownerRatingContainer");
    if (!container) {
      console.warn("Owner rating container not found");
      return;
    }
    
    // Determine message based on whether we have an owner ID
    const noReviewsMessage = ownerId 
      ? `<p>No reviews yet for this seller.</p><small>Be the first to share your experience!</small>`
      : `<p>Seller information not available.</p><small>Cannot load reviews without seller ID.</small>`;
    
    // Determine whether to show the Rate Seller button
    const showRateSellerButton = ownerId !== null;
    
           container.innerHTML = `
             <div class="rating-header">
               <h3><i class="ri-user-star-line"></i> Seller Ratings & Reviews</h3>
        ${showRateSellerButton ? `
               <button id="rateSellerBtn" class="rating-toggle-btn">
                 <i class="ri-user-star-line"></i> Rate Seller
               </button>
        ` : ''}
             </div>
             <div class="no-reviews" style="padding: 20px; text-align: center; color: #666;">
               <i class="ri-emotion-sad-line"></i>
        ${noReviewsMessage}
             </div>
           `;
           
    // Store owner ID for rating form if available
    if (ownerId) {
      this.ownerId = ownerId;
      const sellerOwnerIdInput = document.getElementById('sellerRatingOwnerId');
      if (sellerOwnerIdInput) {
        sellerOwnerIdInput.value = ownerId;
      }
      
      // Connect the Rate Seller button
           setTimeout(() => {
             this.connectRateSellerButton();
           }, 100);
    }
  }

  /**
   * Display seller ratings
   * @param {Object} ratingsData - Seller ratings data
   * @param {string} ownerId - ID of the owner
   */
  displaySellerRatings(ratingsData, ownerId) {
    const container = document.getElementById("ownerRatingContainer");
    if (!container) return;
    
    const ratings = ratingsData.data || ratingsData.ratings || [];
    const count = ratingsData.count || ratings.length;
    
    // Calculate average
    const totalScore = ratings.reduce((sum, rating) => sum + (rating.score || 0), 0);
    const averageScore = count > 0 ? totalScore / count : 0;
    
    // Store owner ID for rating form
    this.ownerId = ownerId;
    const sellerOwnerIdInput = document.getElementById('sellerRatingOwnerId');
    if (sellerOwnerIdInput) {
      sellerOwnerIdInput.value = ownerId;
    }
    
    let html = `
      <div class="rating-header">
        <h3><i class="ri-user-star-line"></i> Seller Ratings & Reviews</h3>
        <button id="rateSellerBtn" class="rating-toggle-btn">
          <i class="ri-user-star-line"></i> Rate Seller
        </button>
      </div>
    `;
    
    // Show summary if there are ratings
    if (count > 0) {
      html += `
        <div class="rating-summary">
          <div class="rating-average">
            <div class="rating-average-value">${averageScore.toFixed(1)}</div>
            <div class="rating-average-stars">
              ${this.generateStarRatingHTML(averageScore)}
            </div>
            <div class="rating-count">${count} ${count === 1 ? 'review' : 'reviews'}</div>
          </div>
        </div>
      `;
    }
    
    // Add reviews list
    html += `<div class="seller-reviews">`;
    
    if (ratings.length === 0) {
      html += `
        <div class="no-reviews" style="padding: 20px; text-align: center; color: #666;">
          <i class="ri-emotion-sad-line"></i>
          <p>No reviews yet for this seller.</p>
          <small>Be the first to share your experience!</small>
        </div>
      `;
    } else {
      // Sort by date (newest first)
      const sortedRatings = ratings.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      sortedRatings.forEach(rating => {
        const reviewerName = rating.user?.firstName && rating.user?.lastName 
          ? `${rating.user.firstName} ${rating.user.lastName}`
          : rating.user?.username || 'Anonymous';
          
        const userId = this.getUserId();
        const isUserReview = rating.user === userId || 
                           (rating.user && rating.user._id === userId) ||
                           rating.userId === userId;
        
        html += `
          <div class="review-item" data-rating-id="${rating._id}" data-user-id="${rating.user?._id || rating.user || rating.userId}" data-rating-type="seller">
            <div class="review-header">
              <div class="reviewer-info">
                <div class="reviewer-name">
                  ${isUserReview ? '<i class="ri-user-line"></i> You' : `<i class="ri-user-3-line"></i> ${reviewerName}`}
                  ${isUserReview ? '<span class="user-review-badge"><i class="ri-shield-check-line"></i> Your Review</span>' : ''}
                </div>
                <div class="review-date"><i class="ri-calendar-line"></i> ${new Date(rating.createdAt).toLocaleDateString()}</div>
              </div>
              <div class="review-rating">
                ${this.generateStarRatingHTML(rating.score)}
                <span class="rating-score">${rating.score}/5</span>
              </div>
            </div>
            <div class="review-content">
              <p><i class="ri-chat-quote-line"></i> ${rating.comment || 'No comment provided.'}</p>
            </div>
            ${isUserReview && window.enhancedRatingSystem ? `
              <div class="review-actions">
                <button class="review-action-btn edit-btn" onclick="window.enhancedRatingSystem.editReview('${rating._id}', 'seller')">
                  <i class="ri-edit-line"></i> Edit
                </button>
                <button class="review-action-btn delete-btn" onclick="window.enhancedRatingSystem.deleteRating('${rating._id}', 'seller')">
                  <i class="ri-delete-bin-line"></i> Delete
                </button>
              </div>
            ` : ''}
          </div>
        `;
      });
    }
    
    html += '</div>';
    container.innerHTML = html;
    
    // Connect the Rate Seller button
    setTimeout(() => {
      this.connectRateSellerButton();
    }, 100);
  }

  /**
   * Get the current user ID from local storage
   */
  getUserId() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || payload.userId || payload._id || null;
    } catch (error) {
      console.error('Error extracting user ID from token:', error);
      return null;
    }
  }
}

/**
 * Immediately disable conflicting systems before they can interfere
 */
function immediatelyDisableConflicts() {
  console.log("🚨 IMMEDIATELY disabling ALL conflicting systems...");
  
  // Override ALL HTML inline functions that might interfere
  const conflictingFunctions = [
    'handleAddReviewClick',
    'updateAddReviewButtonText', 
    'toggleReviewForm',
    'showRatingDialog',
    'initReviewForms',
    'submitItemReview'
  ];
  
  conflictingFunctions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
      console.log(`🔥 Disabling ${funcName}`);
      try {
      window[funcName] = function(...args) {
        console.log(`❌ ${funcName} intercepted and redirected to enhanced system`);
        
        // All review-related functions now use our enhanced system
        if (window.enhancedRatingSystem) {
            window.enhancedRatingSystem.openDialog();
        } else {
          console.warn("Enhanced rating system not available");
        }
        return false;
      };
      } catch (error) {
        console.log(`Could not override ${funcName}:`, error);
      }
    }
  });
  
  console.log("✅ ALL conflicting systems immediately disabled");
}

 /**
  * Connect item review functionality to our actual review system
  */
 function connectItemReviewFunctionality() {
   console.log("🔗 Connecting item review popup functionality...");
   
   // Ensure enhanced rating system connects to our actual review functions
   if (window.enhancedRatingSystem) {
     // Override the submit function to use our actual item review API
     const originalSubmitItemRating = window.enhancedRatingSystem.submitItemRating;
     
     window.enhancedRatingSystem.submitItemRating = async function() {
       console.log("🎯 Using our custom item review submission");
       
       // Use the enhanced rating system's internal rating values
       const rating = this.currentItemRating;
       const comment = document.getElementById('itemRatingComment')?.value || '';
       
       console.log('📊 Enhanced system rating data:', {
         currentItemRating: this.currentItemRating,
         rating: rating,
         comment: comment,
         commentLength: comment.length
       });
       
       if (!rating || rating === 0) {
         console.error('❌ Star rating validation failed:', { rating, currentItemRating: this.currentItemRating });
         this.showError('Please select a star rating');
         return;
       }
       
       if (!comment.trim()) {
         console.error('❌ Comment validation failed:', { comment });
         this.showError('Please write a review comment');
         return;
       }
       
       const token = localStorage.getItem("token");
       if (!token) {
         this.showError("Please log in to submit a review");
         return;
       }
       
       const params = new URLSearchParams(window.location.search);
       const listingId = params.get('listingId') || params.get('itemId') || params.get('id');
       
       if (!listingId) {
         this.showError('Item ID not found');
         return;
       }
       
       console.log('📤 Submitting rating:', { listingId, rating, comment: comment.substring(0, 50) + '...' });
       
       try {
         const response = await fetch(`http://localhost:3000/api/ratings`, {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
             Authorization: `Bearer ${token}`,
           },
           body: JSON.stringify({
             listingId: listingId,
             score: parseInt(rating),
             comment: comment.trim()
           }),
         });
         
         if (!response.ok) {
           const errorData = await response.json();
           throw new Error(errorData.message || "Failed to submit review");
         }
         
         const result = await response.json();
         console.log('✅ Rating submitted successfully:', result);
         
         // Show success message
         this.showSuccess("Your review has been submitted successfully!");
         
         // Close the dialog
         this.closeDialog();
         
         // Reload ratings to show the new review
         setTimeout(() => {
           if (window.itemDetailManager) {
             window.itemDetailManager.loadItemRatings();
           }
         }, 1000);
         
       } catch (error) {
         console.error("Error submitting review:", error);
         this.showError(error.message || "Failed to submit review. Please try again.");
       }
     };
     
     console.log("✅ Enhanced rating system connected to our item review API");
   }
   
   // Also ensure any remaining buttons in title tab are removed
   setTimeout(() => {
     const titleTabButtons = document.querySelectorAll('[data-tab="item-ratings"] #addReviewBtn');
     titleTabButtons.forEach(btn => {
       console.log("🗑️ Removing title tab Add Review button");
       btn.remove();
     });
   }, 500);
   
   console.log("🔗 Item review functionality connected successfully");
 }

/**
 * Force control over a specific button
 */
function forceControlButton(button, index) {
  if (!button || button.dataset.forceControlled === 'true') return;
  
  console.log(`🎯 Force controlling button ${index}: "${button.textContent.trim()}"`);
  
  // Remove ALL possible event listeners
  const newBtn = button.cloneNode(true);
  button.parentNode.replaceChild(newBtn, button);
  
  // Remove any inline onclick
  newBtn.removeAttribute('onclick');
  
  // Mark as controlled
  newBtn.dataset.forceControlled = 'true';
  newBtn.dataset.originalText = newBtn.textContent.trim();
  
  // Add our exclusive handler with highest priority
  newBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    console.log(`🚀 Enhanced handler triggered for: "${this.textContent.trim()}"`);
    
          if (window.enhancedRatingSystem) {
        window.enhancedRatingSystem.openDialog('item');
      } else if (window.itemDetailManager) {
        window.itemDetailManager.showMessage("Opening item rating...");
      } else {
        console.log("Rating system loading...");
      }
    
    return false;
  }, { capture: true, passive: false });
  
  // Also override the button's click method
  newBtn.click = function() {
    console.log("🎯 Button.click() method overridden");
    if (window.enhancedRatingSystem) {
      window.enhancedRatingSystem.openDialog('item');
    }
  };
  
  console.log(`✅ Button ${index} force controlled successfully`);
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
 * Helper function to show notifications
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (success, error)
 */
function showNotification(message, type = "success") {
  // Check if the notification function exists in the global scope
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    // Fallback to console
    console.log(message);
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

// 2. Add this JavaScript function to make stars interactive
function makeStarsInteractive(containerSelector, callback) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  
  const stars = container.querySelectorAll('i');
  let currentRating = 0;
  
  stars.forEach((star, index) => {
    star.addEventListener('click', () => {
      currentRating = index + 1;
      updateStars(stars, currentRating);
      if (callback) callback(currentRating);
    });
    
    star.addEventListener('mouseenter', () => {
      updateStars(stars, index + 1);
    });
  });
  
  container.addEventListener('mouseleave', () => {
    updateStars(stars, currentRating);
  });
}

function updateStars(stars, rating) {
  stars.forEach((star, index) => {
    if (index < rating) {
      star.className = 'ri-star-fill';
    } else {
      star.className = 'ri-star-line';
    }
  });
}

// 3. Update the rating dialog initialization
function initRatingDialog() {
  // Initialize item rating stars
  makeStarsInteractive('#itemRatingStars', (rating) => {
    const ratingInput = document.getElementById('itemRatingValue');
    if (ratingInput) {
      ratingInput.value = rating;
    }
  });
  
  // Initialize seller rating stars
  makeStarsInteractive('#sellerRatingStars', (rating) => {
    const ratingInput = document.getElementById('sellerRatingValue');
    if (ratingInput) {
      ratingInput.value = rating;
    }
  });
}

// 4. Add these functions to handle the rating buttons
function openRatingDialog() {
  const dialog = document.getElementById('ratingDialog');
  if (dialog) {
    dialog.style.display = 'block';
    // Switch to item rating tab by default
    showRatingTab('item');
  }
}

function openSellerRatingDialog() {
  const dialog = document.getElementById('ratingDialog');
  if (dialog) {
    dialog.style.display = 'block';
    // Switch to seller rating tab
    showRatingTab('seller');
  }
}

function showRatingTab(tab) {
  // Hide all tab contents
  const itemTab = document.getElementById('itemRatingTab');
  const sellerTab = document.getElementById('sellerRatingTab');
  
  if (itemTab) itemTab.style.display = tab === 'item' ? 'block' : 'none';
  if (sellerTab) sellerTab.style.display = tab === 'seller' ? 'block' : 'none';
  
  // Update tab buttons
  const itemTabBtn = document.querySelector('[onclick="showRatingTab(\'item\')"]');
  const sellerTabBtn = document.querySelector('[onclick="showRatingTab(\'seller\')"]');
  
  if (itemTabBtn) {
    itemTabBtn.classList.toggle('active', tab === 'item');
  }
  if (sellerTabBtn) {
    sellerTabBtn.classList.toggle('active', tab === 'seller');
  }
}

// 7. Add these functions to handle form submissions
function submitItemRating() {
  const rating = document.getElementById('itemRatingValue')?.value;
  const comment = document.getElementById('itemRatingComment')?.value;
  
  if (!rating || rating === '0') {
    window.itemDetailManager?.showErrorMessage('Please select a rating before submitting.') || 
    console.error('Please select a rating before submitting.');
    return;
  }
  
  // Submit item rating using your existing rating system
  if (window.ratingSystem && window.ratingSystem.submitItemRating) {
    window.ratingSystem.submitItemRating(rating, comment);
  }
  closeRatingDialog();
}

function submitSellerRating() {
  const rating = document.getElementById('sellerRatingValue')?.value;
  const comment = document.getElementById('sellerRatingComment')?.value;
  const ownerId = document.getElementById('sellerRatingOwnerId')?.value;
  
  if (!rating || rating === '0') {
    window.itemDetailManager?.showErrorMessage('Please select a rating') || 
    console.error('Please select a rating');
    return;
  }
  
  if (!ownerId) {
    window.itemDetailManager?.showErrorMessage('Owner ID not found') || 
    console.error('Owner ID not found');
    return;
  }
  
  // Submit seller rating using your existing rating system
  if (window.ratingSystem && window.ratingSystem.submitSellerRating) {
    window.ratingSystem.submitSellerRating(ownerId, rating, comment);
  }
  closeRatingDialog();
}

function closeRatingDialog() {
  const dialog = document.getElementById('ratingDialog');
  if (dialog) {
    dialog.style.display = 'none';
  }
}

// 8. Make functions globally available
window.openRatingDialog = openRatingDialog;
window.openSellerRatingDialog = openSellerRatingDialog;
window.showRatingTab = showRatingTab;
window.submitItemRating = submitItemRating;
window.submitSellerRating = submitSellerRating;
window.closeRatingDialog = closeRatingDialog;
window.makeStarsInteractive = makeStarsInteractive;
window.updateStars = updateStars;

// Initialize the manager when the page loads
document.addEventListener("DOMContentLoaded", () => {
  // Initialize the enhanced rating system first if not already initialized
  if (!window.enhancedRatingSystem) {
    console.log("Initializing enhanced rating system");
    window.enhancedRatingSystem = new EnhancedRatingSystem();
  }
  
  // Initialize the item detail manager
  window.itemDetailManager = new ItemDetailManager();
  
  // IMMEDIATELY disable conflicting systems before anything else loads
  window.itemDetailManager.disableConflictingSystems();
  
  // Initialize tab navigation for rating sections
  initTabNavigation();
  
  // Make showMessage available globally
  window.showToast = (message, type) => {
    window.itemDetailManager.showMessage(message, type);
  };
  
  // Make force reload function globally available
  window.forceReloadSellerRatings = () => {
    if (window.itemDetailManager) {
      window.itemDetailManager.forceReloadSellerRatings();
    }
  };
  
  // Make owner ID setter globally available
  window.setOwnerId = (ownerId) => {
    if (window.itemDetailManager) {
      window.itemDetailManager.setOwnerId(ownerId);
    }
  };
  
  // Ensure tab content containers are visible when active
  const activeTabContent = document.querySelector('.tab-content.active');
  if (activeTabContent) {
    activeTabContent.style.display = 'block';
    console.log("Set active tab content display to block:", activeTabContent.id);
  }
  
  // Check if seller tab needs to be shown initially (from URL parameter)
  const params = new URLSearchParams(window.location.search);
  if (params.get('showSellerReviews') === 'true') {
    console.log("URL parameter requests showing seller reviews tab");
  setTimeout(() => {
      const sellerTab = document.querySelector('.tab-btn[data-tab="owner-ratings"]');
      if (sellerTab) {
        sellerTab.click();
        console.log("Auto-clicked seller reviews tab");
      }
    }, 1000);
  }
  
  console.log("Item detail page initialized successfully with enhanced rating system");
});

/**
 * Initialize tab navigation for rating sections
 */
function initTabNavigation() {
  console.log("🔗 Initializing tab navigation...");
  
  const tabButtons = document.querySelectorAll('.rating-tabs .tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  if (tabButtons.length === 0) {
    console.warn("No tab buttons found");
    return;
  }
  
  console.log(`Found ${tabButtons.length} tab buttons and ${tabContents.length} tab contents`);
  
  // Ensure the default tab (item-ratings) is visible on page load
  setTimeout(() => {
    const defaultTab = document.querySelector('[data-tab="item-ratings"]');
    if (defaultTab) {
      defaultTab.style.display = 'block';
      console.log("Made default item-ratings tab visible");
    } else {
      console.warn("Default tab content not found");
    }
  }, 100);
  
  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTabId = button.getAttribute('data-tab');
      console.log("Tab button clicked:", button.textContent.trim(), "Target tab ID:", targetTabId);
      
      if (!targetTabId) {
        console.warn("Tab button has no data-tab attribute");
        return;
      }
      
      // Remove active class from all tab buttons
      tabButtons.forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Add active class to clicked button
      button.classList.add('active');
      
      // Hide all tab contents
      tabContents.forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
        console.log(`Hiding tab content: ${content.id} with data-tab=${content.getAttribute('data-tab')}`);
      });
      
      // Show target tab content
      const targetContent = document.querySelector(`.tab-content[data-tab="${targetTabId}"]`);
      if (targetContent) {
        targetContent.classList.add('active');
        targetContent.style.display = 'block';
        console.log("Switched to tab:", targetTabId, "Element:", targetContent.id);
        
        // If switching to seller ratings, ensure they're loaded
        if (targetTabId === 'owner-ratings' && window.itemDetailManager && window.itemDetailManager.ownerId) {
          console.log("Loading seller ratings for tab switch");
          setTimeout(() => {
            window.itemDetailManager.loadOwnerRatingsWithRetry(window.itemDetailManager.ownerId);
          }, 100);
        }
        
        // If switching to item ratings, ensure they're loaded and Add Review button is connected
        if (targetTabId === 'item-ratings' && window.itemDetailManager) {
          console.log("Reconnecting item review button for tab switch");
          setTimeout(() => {
            window.itemDetailManager.connectAddReviewButton();
          }, 100);
        }
      } else {
        console.warn(`Target tab content not found for data-tab="${targetTabId}"`);
        // Fallback: Try to find by ID
        const targetById = document.getElementById(targetTabId === 'item-ratings' ? 'itemRatingContainer' : 'ownerRatingContainer');
        if (targetById) {
          console.log("Found tab content by ID instead:", targetById.id);
          targetById.classList.add('active');
          targetById.style.display = 'block';
          
          // Trigger appropriate loading
          if (targetTabId === 'owner-ratings' && window.itemDetailManager && window.itemDetailManager.ownerId) {
            window.itemDetailManager.loadOwnerRatingsWithRetry(window.itemDetailManager.ownerId);
          } else if (targetTabId === 'item-ratings' && window.itemDetailManager) {
            window.itemDetailManager.connectAddReviewButton();
          }
        } else {
          console.error("Could not find tab content by any method");
        }
      }
    });
  });
  
  console.log("✅ Tab navigation initialized successfully");
}
