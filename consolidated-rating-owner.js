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
    <div class="reviews-list">
      ${
        ratings.length > 0
          ? ratings
              .map((review) => this.generateOwnerReviewHTML(review))
              .join("")
          : '<div class="no-reviews">No reviews yet. Be the first to leave a review!</div>'
      }
    </div>
  `;

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
  // Format date
  const date = new Date(review.createdAt || review.date);
  const formattedDate = isNaN(date.getTime())
    ? "Unknown date"
    : date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  // Get user info
  const userName = review.user?.firstName || review.userName || "Anonymous";
  const firstChar = userName.charAt(0).toUpperCase();
  const userImageHtml = review.user?.profileImage 
    ? `<img src="${review.user.profileImage}" alt="${userName}" class="reviewer-avatar">` 
    : `<div class="avatar-initial">${firstChar}</div>`;

  // Check if this is the current user's review
  const isCurrentUserReview = this.token && review.userId === this.getUserId();

  // Get category ratings
  const communication = review.communication || 0;
  const reliability = review.reliability || 0;
  const itemCondition = review.itemCondition || 0;

  // Generate HTML
  return `
    <div class="review-item ${isCurrentUserReview ? "current-user-review" : ""}">
      <div class="review-header">
        <div class="reviewer-info">
          ${userImageHtml}
          <div class="reviewer-details">
            <div class="reviewer-name">${userName}</div>
            <div class="review-date">${formattedDate}</div>
          </div>
        </div>
        <div class="review-rating">
          ${this.generateStarRatingHTML(review.score || review.rating, true)}
        </div>
      </div>
      
      <div class="review-category-ratings">
        <div class="review-category">
          <span class="category-label">Communication:</span>
          <div class="category-stars">
            ${this.generateStarRatingHTML(communication, true)}
          </div>
        </div>
        <div class="review-category">
          <span class="category-label">Reliability:</span>
          <div class="category-stars">
            ${this.generateStarRatingHTML(reliability, true)}
          </div>
        </div>
        <div class="review-category">
          <span class="category-label">Item Condition:</span>
          <div class="category-stars">
            ${this.generateStarRatingHTML(itemCondition, true)}
          </div>
        </div>
      </div>
      
      <div class="review-content">
        <p>${review.comment || review.text || ""}</p>
      </div>
      
      ${
        isCurrentUserReview
          ? `
        <div class="review-actions">
          <button class="edit-review-btn" onclick="ratingSystem.editOwnerReview('${review._id}')">
            <i class="ri-edit-line"></i> Edit
          </button>
          <button class="delete-review-btn" onclick="ratingSystem.deleteOwnerRating('${review._id}', '${review.ownerId}')">
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
  // Toggle review form
  const toggleBtn = container.querySelector(".rating-toggle-btn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => this.toggleAddReviewForm());
  }

  // Initialize star ratings
  const starRatings = container.querySelectorAll(".star-rating:not(.readonly)");
  starRatings.forEach((ratingContainer) => {
    const stars = ratingContainer.querySelectorAll("label");
    const input = ratingContainer.querySelector('input[type="hidden"]');

    stars.forEach((star) => {
      star.addEventListener("click", () => {
        const value = star.dataset.value;
        input.value = value;

        // Update visual state
        stars.forEach((s) => {
          s.classList.toggle("active", parseInt(s.dataset.value) <= parseInt(value));
        });
      });
    });
  });
};

/**
 * Get owner ID from the page
 * @returns {string} Owner ID or null if not found
 */
RatingSystem.prototype.getOwnerIdFromPage = function () {
  // Try to get from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const ownerId =
    urlParams.get("ownerId") ||
    urlParams.get("sellerId");

  if (ownerId) return ownerId;

  // Try to get from hidden input
  const ownerIdInput = document.querySelector('input[name="ownerId"]');
  if (ownerIdInput) return ownerIdInput.value;

  // Try to get from data attribute
  const ownerElement = document.querySelector('[data-owner-id]');
  if (ownerElement) return ownerElement.dataset.ownerId;

  return null;
};

/**
 * Load owner ratings from the API
 * @param {string} ownerId - ID of the owner to load ratings for
 */
RatingSystem.prototype.loadOwnerRatings = function (ownerId) {
  if (!ownerId) {
    ownerId = this.getOwnerIdFromPage();
    if (!ownerId) {
      console.error("Owner ID not found");
      return;
    }
  }

  console.log(`Loading ratings for owner ${ownerId}`);

  fetch(`${this.baseUrl}/owner-ratings/${ownerId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load owner ratings. Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Owner rating data received:", data);
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

  if (!this.token) {
    this.showLoginRequired();
    return;
  }

  const form = event.target;
  const ownerId = form.elements.ownerId.value;
  const overallRating = parseInt(form.elements.overallRating.value);
  const communicationRating = parseInt(form.elements.communicationRating.value);
  const reliabilityRating = parseInt(form.elements.reliabilityRating.value);
  const itemConditionRating = parseInt(form.elements.itemConditionRating.value);
  const comment = form.elements.comment.value;

  // Validate inputs
  if (!overallRating || overallRating === 0) {
    this.showErrorMessage("Please select an overall star rating before submitting.");
    return;
  }

  if (!communicationRating || communicationRating === 0) {
    this.showErrorMessage("Please rate the seller's communication.");
    return;
  }

  if (!reliabilityRating || reliabilityRating === 0) {
    this.showErrorMessage("Please rate the seller's reliability.");
    return;
  }

  if (!itemConditionRating || itemConditionRating === 0) {
    this.showErrorMessage("Please rate the item condition.");
    return;
  }

  if (!comment.trim()) {
    this.showErrorMessage("Please write a comment before submitting.");
    return;
  }

  // Create rating data
  const ratingData = {
    ownerId,
    score: overallRating,
    comment,
    communication: communicationRating,
    reliability: reliabilityRating,
    itemCondition: itemConditionRating
  };

  console.log("Submitting owner rating:", ratingData);

  // Submit to API
  fetch(`${this.baseUrl}/owner-ratings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`
    },
    body: JSON.stringify(ratingData)
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errorData) => {
          throw new Error(errorData.message || "Failed to submit rating");
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log("Rating submitted successfully:", data);
      
      // Refresh ratings
      this.loadOwnerRatings(ownerId);
      
      // Reset form and hide it
      form.reset();
      this.toggleAddReviewForm();
      
      this.showMessage("Your rating has been submitted successfully!");
    })
    .catch((error) => {
      console.error("Error submitting owner rating:", error);
      this.showErrorMessage(`Failed to submit rating: ${error.message}`);
    });
};

/**
 * Delete an owner rating
 * @param {string} ratingId - ID of the rating to delete
 * @param {string} ownerId - ID of the owner
 */
RatingSystem.prototype.deleteOwnerRating = function (ratingId, ownerId) {
  if (!this.token) {
    this.showLoginRequired();
    return;
  }

  if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
    return;
  }

  fetch(`${this.baseUrl}/owner-ratings/${ratingId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${this.token}`
    }
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errorData) => {
          throw new Error(errorData.message || "Failed to delete rating");
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log("Rating deleted successfully:", data);
      
      // Refresh ratings
      this.loadOwnerRatings(ownerId);
      
      this.showMessage("Your rating has been deleted successfully!");
    })
    .catch((error) => {
      console.error("Error deleting owner rating:", error);
      this.showErrorMessage(`Failed to delete rating: ${error.message}`);
    });
};
