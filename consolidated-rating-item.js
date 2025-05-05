/**
 * Item Rating System Extension for RatingSystem
 * Handles rendering and UI generation for item ratings
 */

// Extend the base RatingSystem class with item rating functionality
RatingSystem.prototype.renderItemRatings = function (data) {
  const container = document.getElementById("itemRatingContainer");
  if (!container) return;

  console.log("Rendering item ratings with data:", data);

  // Adapt to the actual API response format
  // Handle different possible response structures
  let ratings = [];
  let averageScore = 0;
  let count = 0;
  let distribution = {};
  let userHasRated = false;

  // Check if data is directly an array of ratings
  if (Array.isArray(data)) {
    console.log("Data is an array of ratings");
    ratings = data;

    // Calculate average score
    if (ratings.length > 0) {
      const sum = ratings.reduce(
        (total, rating) => total + (rating.score || 0),
        0
      );
      averageScore = sum / ratings.length;
      count = ratings.length;
    }

    // Build distribution manually
    distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((rating) => {
      const score = Math.floor(rating.score || 0);
      if (score >= 1 && score <= 5) {
        distribution[score] = (distribution[score] || 0) + 1;
      }
    });
    console.log("Manually built distribution:", distribution);

    // Check if current user has rated
    if (this.token) {
      const userId = this.getUserId();
      userHasRated = ratings.some((rating) => rating.userId === userId);
    }
  }
  // Handle object response format with ratings property
  else if (data && typeof data === "object") {
    console.log("Data is an object with properties");
    // Check for data array in the response (API returns {success: true, count: X, data: Array})
    if (data.data && Array.isArray(data.data)) {
      ratings = data.data;
      console.log("Extracted ratings from data property:", ratings.length);
    } else {
      ratings = data.ratings || [];
    }

    averageScore = data.averageScore || data.average || 0;
    count = data.count || 0;

    // Make sure distribution is properly formatted
    if (data.distribution && typeof data.distribution === "object") {
      distribution = data.distribution;
      console.log("Using API-provided distribution:", distribution);

      // Ensure all star levels exist in distribution
      for (let i = 1; i <= 5; i++) {
        if (distribution[i] === undefined) {
          distribution[i] = 0;
        }
      }
    } else {
      // Build distribution manually if not provided
      distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratings.forEach((rating) => {
        const score = Math.floor(rating.score || 0);
        if (score >= 1 && score <= 5) {
          distribution[score] = (distribution[score] || 0) + 1;
        }
      });
      console.log("Manually built distribution (fallback):", distribution);
    }

    userHasRated = data.userHasRated || false;

    // Calculate average score if not provided but we have ratings
    if ((!averageScore || averageScore === 0) && ratings.length > 0) {
      const sum = ratings.reduce(
        (total, rating) => total + (rating.score || 0),
        0
      );
      averageScore = sum / ratings.length;
    }
  }

  console.log("Processed rating data:", {
    ratings: ratings.length,
    averageScore,
    count,
    distribution,
    userHasRated,
  });

  // Clear the container
  container.innerHTML = "";

  // Create the main structure
  container.innerHTML = this.generateItemRatingHTML(
    averageScore,
    count,
    distribution,
    ratings,
    userHasRated
  );

  // Initialize the review form if user has rated
  const form = container.querySelector("#itemRatingForm");
  if (form) {
    this.initializeReviewForm(form, ratings);
  }

  // Add event listeners
  this.setupItemRatingEvents(container);
};

/**
 * Generate HTML for item ratings
 */
RatingSystem.prototype.generateItemRatingHTML = function (
  averageScore,
  count,
  distribution,
  ratings,
  userHasRated
) {
  const listingId =
    new URLSearchParams(window.location.search).get("listingId") ||
    new URLSearchParams(window.location.search).get("itemId") ||
    new URLSearchParams(window.location.search).get("id");

  // Generate the rating summary HTML
  const ratingSummaryHTML = `
    <div class="rating-header">
      <h3>Item Ratings & Reviews</h3>
      ${
        this.token && ratings.length > 0 && userHasRated
          ? `<button class="rating-toggle-btn">Edit Your Review</button>`
          : this.token && !userHasRated
          ? `<button class="rating-toggle-btn">+ Add Review</button>`
          : ""
      }
    </div>
    <div class="rating-summary">
      <div class="rating-average">
        <div class="rating-average-value">${averageScore.toFixed(1)}</div>
        <div class="rating-average-stars">
          ${
            ratings.length > 0
              ? this.generateStarRatingHTML(averageScore, true)
              : '<span class="no-ratings">No ratings yet</span>'
          }
        </div>
        <div class="rating-count">${count} ${
    count === 1 ? "review" : "reviews"
  }</div>
      </div>
      <div class="rating-distribution">
        ${this.generateRatingDistributionHTML(distribution)}
      </div>
    </div>
  `;

  // Show review form only if user hasn't rated yet or is editing their review
  const reviewFormHTML =
    this.token &&
    (!userHasRated || ratings.some((r) => r.userId === this.getUserId()))
      ? `
    <div class="add-review-form" style="display: none;">
      <h4 class="form-title">${
        userHasRated ? "Edit Your Review" : "Write a Review"
      }</h4>
      <form id="itemRatingForm" onsubmit="ratingSystem.submitItemRating(event)">
        <input type="hidden" name="itemId" value="${listingId}">
        ${this.getUserReviewData(ratings)}
        <div class="rating-input">
          <label>Your Rating</label>
          <div class="star-rating">
            <input type="hidden" name="rating" value="0">
            ${[1, 2, 3, 4, 5]
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
        <div class="rating-input">
          <label for="comment">Your Review</label>
          <textarea name="comment" id="comment" class="review-text" placeholder="Share your experience with this item..."></textarea>
        </div>
        <div class="review-form-actions">
          <button type="button" class="cancel-review-btn" onclick="ratingSystem.toggleAddReviewForm()">Cancel</button>
          <button type="submit" class="submit-review-btn">Submit Review</button>
        </div>
      </form>
    </div>
  `
      : "";

  // Generate reviews list HTML
  const reviewsListHTML = `
    <div class="reviews-list">
      ${
        ratings.length > 0
          ? ratings
              .map((review) => this.generateReviewHTML(review))
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
 * Generate HTML for a star rating display
 * @param {number} rating - The rating value (0-5)
 * @param {boolean} readonly - Whether this is a readonly display
 * @returns {string} HTML for star rating
 */
RatingSystem.prototype.generateStarRatingHTML = function (rating, readonly = false) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  let html = `<div class="star-rating ${readonly ? "readonly" : ""}">`;

  // Full stars
  for (let i = 0; i < fullStars; i++) {
    html += '<i class="ri-star-fill"></i>';
  }

  // Half star
  if (hasHalfStar) {
    html += '<i class="ri-star-half-fill"></i>';
  }

  // Empty stars
  for (let i = 0; i < emptyStars; i++) {
    html += '<i class="ri-star-line"></i>';
  }

  html += "</div>";
  return html;
};

/**
 * Generate HTML for rating distribution bars
 * @param {Object} distribution - Object with keys 1-5 and values as counts
 * @returns {string} HTML for distribution bars
 */
RatingSystem.prototype.generateRatingDistributionHTML = function (distribution) {
  // Calculate total ratings for percentage
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);

  // Generate HTML for each star level
  let html = "";
  for (let i = 5; i >= 1; i--) {
    const count = distribution[i] || 0;
    const percentage = total > 0 ? (count / total) * 100 : 0;

    html += `
      <div class="rating-bar">
        <div class="rating-bar-label">${i}</div>
        <div class="rating-bar-outer">
          <div class="rating-bar-inner" style="width: ${percentage}%;"></div>
        </div>
        <div class="rating-bar-count">${count}</div>
      </div>
    `;
  }

  return html;
};

/**
 * Generate HTML for a single review
 * @param {Object} review - The review object
 * @returns {string} HTML for the review
 */
RatingSystem.prototype.generateReviewHTML = function (review) {
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
      <div class="review-content">
        <p>${review.comment || review.text || ""}</p>
      </div>
      ${
        isCurrentUserReview
          ? `
        <div class="review-actions">
          <button class="edit-review-btn" onclick="ratingSystem.editReview('${review._id}')">
            <i class="ri-edit-line"></i> Edit
          </button>
          <button class="delete-review-btn" onclick="ratingSystem.deleteRating('${review._id}', 'item', '${review.listingId}')">
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
 * Get user review data to populate the review form
 * @param {Array} ratings - Array of ratings
 * @returns {string} HTML for user review data
 */
RatingSystem.prototype.getUserReviewData = function (ratings) {
  if (!this.token) return "";

  const userId = this.getUserId();
  const userRating = ratings.find((rating) => rating.userId === userId);

  if (!userRating) return "";

  return `
    <input type="hidden" name="ratingId" value="${userRating._id}">
  `;
};

/**
 * Initialize the review form with user's existing review data if they've already rated
 * @param {HTMLElement} form - The review form element
 * @param {Array} ratings - Array of ratings
 */
RatingSystem.prototype.initializeReviewForm = function (form, ratings) {
  if (!this.token) return;

  const userId = this.getUserId();
  const userRating = ratings.find((rating) => rating.userId === userId);

  if (!userRating) return;

  // Set the rating
  const ratingInput = form.querySelector('input[name="rating"]');
  if (ratingInput) {
    ratingInput.value = userRating.score || userRating.rating || 0;
  }

  // Update the star visuals
  const stars = form.querySelectorAll(".star-rating label");
  stars.forEach((star) => {
    const value = parseInt(star.dataset.value);
    star.classList.toggle(
      "active",
      value <= (userRating.score || userRating.rating || 0)
    );
  });

  // Set the comment
  const commentInput = form.querySelector('textarea[name="comment"]');
  if (commentInput) {
    commentInput.value = userRating.comment || userRating.text || "";
  }
};

/**
 * Setup event listeners for item rating container
 * @param {HTMLElement} container - The rating container element
 */
RatingSystem.prototype.setupItemRatingEvents = function (container) {
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
          s.classList.toggle("active", parseInt(s.dataset.value) <= value);
        });
      });
    });
  });
};
