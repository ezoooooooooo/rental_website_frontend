/**
 * Owner Rating System Extension for RatingSystem
 * Handles rendering and UI generation for owner ratings
 */

// Extend the base RatingSystem class
RatingSystem.prototype.renderOwnerRatings = function (data) {
  const container = document.getElementById("ownerRatingContainer");
  if (!container) return;
  
  // Adapt to the actual API response format
  const ratings = data.ratings || [];
  const averageScore = data.averageScore || 0;
  const count = data.count || 0;
  
  // Get category scores
  const communication = data.categoryScores?.communication || 0;
  const reliability = data.categoryScores?.reliability || 0;
  const itemCondition = data.categoryScores?.itemCondition || 0;
  
  const userHasRated = data.userHasRated || false;

  // Clear the container
  container.innerHTML = "";

  // Create the main structure
  container.innerHTML = this.generateOwnerRatingHTML(
    averageScore,
    count,
    communication,
    reliability,
    itemCondition,
    ratings,
    userHasRated
  );

  // Add event listeners
  this.setupOwnerRatingEvents(container);
};

/**
 * Generate HTML for owner ratings
 */
RatingSystem.prototype.generateOwnerRatingHTML = function (
  averageScore,
  count,
  communication,
  reliability,
  itemCondition,
  ratings,
  userHasRated
) {
  const ownerId =
    new URLSearchParams(window.location.search).get("ownerId") ||
    new URLSearchParams(window.location.search).get("sellerId");

  // Determine if owner is "Trusted Seller" (4.5+ stars with at least 5 reviews)
  const isTrustedSeller = averageScore >= 4.5 && count >= 5;
  const trustedBadge = isTrustedSeller 
    ? `<div class="trusted-seller-badge">✓ Trusted Seller</div>` 
    : '';

  // Generate the rating summary HTML
  const ratingSummaryHTML = `
    <div class="rating-header">
      <div class="rating-title">
        <h3>Owner Ratings & Reviews</h3>
        ${trustedBadge}
      </div>
      ${
        this.token && !userHasRated
          ? `<button class="rating-toggle-btn">+ Add Review</button>`
          : ""
      }
    </div>
    <div class="rating-summary">
      <div class="rating-average">
        <div class="rating-average-value">${averageScore.toFixed(1)}</div>
        <div class="rating-average-stars">
          ${this.generateStarRatingHTML(averageScore, true)}
        </div>
        <div class="rating-count">${count} ${
    count === 1 ? "review" : "reviews"
  }</div>
      </div>
      <div class="category-ratings">
        <div class="category-rating">
          <span class="category-label">Communication:</span>
          <div class="category-stars">
            ${this.generateStarRatingHTML(communication, true)}
          </div>
          <span class="category-score">${communication.toFixed(1)}</span>
        </div>
        <div class="category-rating">
          <span class="category-label">Reliability:</span>
          <div class="category-stars">
            ${this.generateStarRatingHTML(reliability, true)}
          </div>
          <span class="category-score">${reliability.toFixed(1)}</span>
        </div>
        <div class="category-rating">
          <span class="category-label">Item Condition:</span>
          <div class="category-stars">
            ${this.generateStarRatingHTML(itemCondition, true)}
          </div>
          <span class="category-score">${itemCondition.toFixed(1)}</span>
        </div>
      </div>
    </div>
  `;

  // Generate the review form HTML if user is logged in and hasn't rated yet
  const reviewFormHTML =
    this.token && !userHasRated
      ? `
    <div class="add-review-form" style="display: none;">
      <h4 class="form-title">Rate This Owner</h4>
      <form id="ownerRatingForm" onsubmit="ratingSystem.submitOwnerRating(event)">
        <input type="hidden" name="ownerId" value="${ownerId}">
        
        <div class="rating-categories">
          <div class="rating-category">
            <label class="rating-category-label">Communication</label>
            <div class="star-rating">
              <input type="hidden" name="communicationRating" value="0">
              ${[5, 4, 3, 2, 1]
                .map(
                  (i) => `
                <label data-value="${i}">
                  <i class="ri-star-fill"></i>
                </label>
              `
                )
                .join("")}
            </div>
          </div>
          
          <div class="rating-category">
            <label class="rating-category-label">Reliability</label>
            <div class="star-rating">
              <input type="hidden" name="reliabilityRating" value="0">
              ${[5, 4, 3, 2, 1]
                .map(
                  (i) => `
                <label data-value="${i}">
                  <i class="ri-star-fill"></i>
                </label>
              `
                )
                .join("")}
            </div>
          </div>
          
          <div class="rating-category">
            <label class="rating-category-label">Item Condition</label>
            <div class="star-rating">
              <input type="hidden" name="itemConditionRating" value="0">
              ${[5, 4, 3, 2, 1]
                .map(
                  (i) => `
                <label data-value="${i}">
                  <i class="ri-star-fill"></i>
                </label>
              `
                )
                .join("")}
            </div>
          </div>
          
          <div class="rating-category">
            <label class="rating-category-label">Overall Rating</label>
            <div class="star-rating">
              <input type="hidden" name="overallRating" value="0">
              ${[5, 4, 3, 2, 1]
                .map(
                  (i) => `
                <label data-value="${i}">
                  <i class="ri-star-fill"></i>
                </label>
              `
                )
                .join("")}
            </div>
          </div>
        </div>
        
        <div class="rating-input">
          <label for="comment">Your Review</label>
          <textarea name="comment" id="comment" class="review-text" placeholder="Share your experience with this owner..."></textarea>
        </div>
        
        <div class="review-form-actions">
          <button type="button" class="cancel-review-btn" onclick="ratingSystem.toggleAddReviewForm()">Cancel</button>
          <button type="submit" class="submit-review-btn">Submit Review</button>
        </div>
      </form>
    </div>
  `
      : "";

  // Generate the reviews list HTML
  const reviewsListHTML = `
    <div class="review-list">
      ${
        ratings.length === 0
          ? '<div class="no-reviews">No reviews yet. Be the first to leave a review!</div>'
          : ratings.map((rating) => this.generateOwnerReviewHTML(rating)).join("")
      }
    </div>
  `;

  // Combine all sections
  return `
    ${ratingSummaryHTML}
    ${reviewFormHTML}
    ${reviewsListHTML}
  `;
};

/**
 * Generate HTML for a single owner review
 * @param {Object} review - The review object
 * @returns {string} HTML for the review
 */
RatingSystem.prototype.generateOwnerReviewHTML = function (review) {
  const isCurrentUser = this.token && review.userId === this.getUserId();
  const createdAt = new Date(review.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Use score instead of rating field
  const score = review.score || 0;
  const communication = review.communication || 0;
  const reliability = review.reliability || 0;
  const itemCondition = review.itemCondition || 0;

  return `
    <div class="review" data-id="${review._id}">
      <div class="review-header">
        <div class="reviewer-info">
          ${
            review.user && review.user.profileImage
              ? `<img src="${review.user.profileImage}" alt="${
                  review.user.firstName || "User"
                }" class="reviewer-avatar">`
              : `<div class="avatar-initial">${
                  review.user && review.user.firstName
                    ? review.user.firstName[0]
                    : "U"
                }</div>`
          }
          <div>
            <div class="reviewer-name">${
              review.user && review.user.firstName
                ? review.user.firstName
                : "Anonymous"
            }</div>
            <div class="review-date">${createdAt}</div>
          </div>
        </div>
        <div class="review-rating">
          ${this.generateStarRatingHTML(score, true)}
        </div>
      </div>
      
      <div class="review-details">
        <div class="review-detail-item">
          <div class="detail-label">Communication</div>
          <div class="detail-value">
            ${this.generateStarRatingHTML(communication, true)}
          </div>
        </div>
        <div class="review-detail-item">
          <div class="detail-label">Reliability</div>
          <div class="detail-value">
            ${this.generateStarRatingHTML(reliability, true)}
          </div>
        </div>
        <div class="review-detail-item">
          <div class="detail-label">Item Condition</div>
          <div class="detail-value">
            ${this.generateStarRatingHTML(itemCondition, true)}
          </div>
        </div>
      </div>
      
      <div class="review-content">
        ${review.comment || ""}
      </div>
      ${
        isCurrentUser
          ? `
        <div class="review-actions">
          <button class="review-action-btn delete-review-btn" onclick="ratingSystem.deleteRating('${
            review._id
          }', 'owner', '${review.ownerId}')">
            <i class="ri-delete-bin-line"></i> Delete
          </button>
        </div>
      `
          : ""
      }
    </div>
  `;
};

/**
 * Setup event listeners for owner rating container
 * @param {HTMLElement} container - The rating container element
 */
RatingSystem.prototype.setupOwnerRatingEvents = function (container) {
  if (!container) return;

  // Find the toggle button
  const toggleBtn = container.querySelector(".rating-toggle-btn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      this.toggleAddReviewForm();
    });
  }

  // Find delete buttons
  const deleteButtons = container.querySelectorAll(".delete-review-btn");
  deleteButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const ratingId = btn.dataset.ratingId;
      const ownerId = btn.dataset.ownerId;
      if (ratingId && ownerId) {
        if (confirm("Are you sure you want to delete this review?")) {
          this.deleteOwnerRating(ratingId, ownerId);
        }
      }
    });
  });
};

/**
 * Toggle the add review form visibility
 */
RatingSystem.prototype.toggleAddReviewForm = function () {
  console.log('Toggle add review form called');
  
  // Check if we're in the owner rating tab
  const activeTab = document.querySelector('.tab-content.active');
  if (activeTab && activeTab.getAttribute('data-tab') === 'owner-ratings') {
    console.log('Toggling owner rating form');
    const formContainer = document.querySelector('#sellerReviewForm');
    if (!formContainer) {
      console.error('Owner rating form not found');
      return;
    }

    const isVisible = formContainer.style.display !== "none";
    formContainer.style.display = isVisible ? "none" : "block";

    // Update button text
    const toggleBtn = document.querySelector('#ownerRatingContainer .rating-toggle-btn');
    if (toggleBtn) {
      toggleBtn.textContent = isVisible ? "+ Rate Seller" : "Cancel";
    }

    // Set owner ID if available
    if (!isVisible) {
      const ownerId = this.getOwnerIdFromPage();
      if (ownerId) {
        const ownerIdInput = document.getElementById('sellerRatingOwnerId');
        if (ownerIdInput) {
          console.log('Setting owner ID:', ownerId);
          ownerIdInput.value = ownerId;
        }
      }
      
      // Scroll to form
      formContainer.scrollIntoView({ behavior: "smooth" });
    }
  } else {
    console.log('Toggling item rating form');
    // Handle item rating form toggle
    const formContainer = document.querySelector('#itemRatingContainer .add-review-form');
    if (!formContainer) {
      console.error('Item rating form not found');
      return;
    }

    const isVisible = formContainer.style.display !== "none";
    formContainer.style.display = isVisible ? "none" : "block";

    // Update button text
    const toggleBtn = document.querySelector('#itemRatingContainer .rating-toggle-btn');
    if (toggleBtn) {
      toggleBtn.textContent = isVisible ? "+ Add Review" : "Cancel";
    }

    // Scroll to form if showing
    if (!isVisible) {
      formContainer.scrollIntoView({ behavior: "smooth" });
    }
  }
};

/**
 * Get owner ID from the page
 * @returns {string} Owner ID or null if not found
 */
RatingSystem.prototype.getOwnerIdFromPage = function () {
  // Try to get owner ID from URL
  const params = new URLSearchParams(window.location.search);
  const ownerId = params.get('ownerId') || params.get('sellerId');
  if (ownerId) return ownerId;
  
  // Try to get owner ID from item detail manager
  if (window.itemDetailManager && window.itemDetailManager.item && window.itemDetailManager.item.ownerId) {
    return window.itemDetailManager.item.ownerId;
  }
  
  // Try to get owner ID from the DOM
  const ownerIdElement = document.querySelector('[data-owner-id]');
  if (ownerIdElement) {
    return ownerIdElement.getAttribute('data-owner-id');
  }
  
  return null;
};

/**
 * Load owner ratings from the API
 * @param {string} ownerId - ID of the owner to load ratings for
 */
RatingSystem.prototype.loadOwnerRatings = function (ownerId) {
  if (!ownerId) return;

  console.log(`Loading owner ratings for ${ownerId}`);

  // Using the correct endpoint from the API documentation
  fetch(`${this.baseUrl}/owner-ratings/owner/${ownerId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load owner ratings. Status: ${response.status}`);
      }
      return response.json();
    })
    .then((response) => {
      console.log("Owner rating response received:", response);
      
      // Handle API response format according to documentation
      // { "success": true, "count": number, "data": [ {...rating objects} ] }
      let data = {};
      
      if (response.success && Array.isArray(response.data)) {
        console.log(`Found ${response.count} owner ratings`);
        
        // Process the data into the format expected by renderOwnerRatings
        const ratings = response.data;
        
        // Calculate average scores
        let totalScore = 0;
        let totalCommunication = 0;
        let totalReliability = 0;
        let totalItemCondition = 0;
        
        ratings.forEach(rating => {
          totalScore += rating.score || 0;
          totalCommunication += rating.communication || 0;
          totalReliability += rating.reliability || 0;
          totalItemCondition += rating.itemCondition || 0;
        });
        
        const count = ratings.length;
        const averageScore = count > 0 ? totalScore / count : 0;
        
        // Check if current user has rated this owner
        const userId = this.getUserId();
        const userHasRated = userId ? ratings.some(r => r.rater === userId || r.rater._id === userId) : false;
        
        data = {
          ratings: ratings,
          averageScore: averageScore,
          count: count,
          categoryScores: {
            communication: count > 0 ? totalCommunication / count : 0,
            reliability: count > 0 ? totalReliability / count : 0,
            itemCondition: count > 0 ? totalItemCondition / count : 0
          },
          userHasRated: userHasRated
        };
      } else {
        console.warn("Unexpected response format for owner ratings", response);
        data = {
          ratings: [],
          averageScore: 0,
          count: 0,
          categoryScores: { communication: 0, reliability: 0, itemCondition: 0 },
          userHasRated: false
        };
      }
      
      this.renderOwnerRatings(data);
    })
    .catch((error) => {
      console.error("Error loading owner ratings:", error);
      this.showErrorMessage("Failed to load owner ratings. Please try again later.");
    });
};

/**
 * Submit an owner rating
 * @param {Event} event - Form submission event
 */
RatingSystem.prototype.submitOwnerRating = function (event) {
  event.preventDefault();
  console.log('Submit owner rating called');

  if (!this.token) {
    this.showLoginRequired();
    return;
  }

  const form = event.target;
  const ownerId = form.elements.ownerId.value;
  if (!ownerId) {
    this.showErrorMessage("Owner ID is missing. Cannot submit rating.");
    console.error("Owner ID is missing in the form");
    return;
  }
  
  console.log('Owner ID from form:', ownerId);
  
  const ratingId = form.elements.ratingId ? form.elements.ratingId.value : null;
  const isUpdate = !!ratingId;

  // Get values from the form
  const overallRating = parseInt(form.elements.overallRating.value) || 0;
  const communicationRating = parseInt(form.elements.communicationRating.value) || 0;
  const reliabilityRating = parseInt(form.elements.reliabilityRating.value) || 0;
  const itemConditionRating = parseInt(form.elements.itemConditionRating.value) || 0;
  const comment = form.elements.sellerComment ? form.elements.sellerComment.value.trim() : "";

  // Validate input
  if (overallRating === 0) {
    this.showErrorMessage("Please select an overall rating.");
    return;
  }

  if (communicationRating === 0 || reliabilityRating === 0 || itemConditionRating === 0) {
    this.showErrorMessage("Please rate all categories.");
    return;
  }

  if (!comment) {
    this.showErrorMessage("Please write a comment before submitting.");
    return;
  }

  // Prepare request data according to API documentation
  const ratingData = {
    ownerId,
    score: overallRating,
    comment,
    communication: communicationRating,
    reliability: reliabilityRating,
    itemCondition: itemConditionRating,
  };

  console.log(`${isUpdate ? 'Updating' : 'Creating'} owner rating:`, ratingData);

  // Make API request using the correct endpoints from the API documentation
  const url = isUpdate
    ? `${this.baseUrl}/owner-ratings/${ratingId}`
    : `${this.baseUrl}/owner-ratings`;

  const method = isUpdate ? "PUT" : "POST";

  fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
    },
    body: JSON.stringify(ratingData),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errorData) => {
          console.error("Owner rating submission error:", errorData);
          // Handle API error format according to documentation
          if (errorData.success === false) {
            throw new Error(errorData.message || "Failed to submit owner rating");
          } else {
            throw new Error("Failed to submit owner rating");
          }
        });
      }
      return response.json();
    })
    .then((result) => {
      console.log("Owner rating submission result:", result);
      
      // Handle API success response according to documentation
      // { "success": true, "data": {...rating object} }
      if (result.success && result.data) {
        console.log("Owner rating saved with ID:", result.data._id);
        
        // Reset form and hide it
        form.reset();
        const formContainer = form.closest(".add-review-form");
        if (formContainer) {
          formContainer.style.display = "none";
        }

        // Update button text
        const toggleBtn = document.querySelector(".rating-toggle-btn");
        if (toggleBtn) {
          toggleBtn.textContent = "+ Rate Seller";
        }

        // Show success message
        this.showMessage(
          isUpdate
            ? "Your rating has been updated successfully!"
            : "Your rating has been submitted successfully!"
        );

        // Reload ratings
        this.loadOwnerRatings(ownerId);
      } else {
        console.warn("Unexpected success response format:", result);
        this.showErrorMessage("Unexpected response from server. Please try again.");
      }
    })
    .catch((error) => {
      console.error("Error submitting owner rating:", error);
      this.showErrorMessage(error.message || "Failed to submit rating. Please try again.");
    });
};

/**
 * Delete an owner rating
 * @param {string} ratingId - ID of the rating to delete
 * @param {string} type - Type of rating ('owner')
 * @param {string} ownerId - ID of the owner
 */
RatingSystem.prototype.deleteOwnerRating = function (ratingId, ownerId) {
  if (!this.token) {
    this.showLoginRequired();
    return;
  }

  if (!confirm("Are you sure you want to delete this review?")) {
    return;
  }

  try {
    // Use the endpoint from the API documentation
    fetch(`${this.baseUrl}/owner-ratings/${ratingId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(errorData => {
            throw new Error(errorData.message || "Failed to delete rating");
          });
        }
        return response.json();
      })
      .then(data => {
        console.log("Rating deleted successfully:", data);
        
        // Refresh ratings after deletion
        this.loadOwnerRatings(ownerId);

        this.showMessage("Your review has been deleted successfully!");
      })
      .catch(error => {
        console.error("Error deleting owner rating:", error);
        this.showErrorMessage(
          error.message || "Failed to delete review. Please try again later."
        );
      });
  } catch (error) {
    console.error("Error in deleteOwnerRating:", error);
    this.showErrorMessage(
      error.message || "Failed to delete review. Please try again later."
    );
  }
}