/**
 * Item Rating System Extension for RatingSystem
 * Handles rendering and UI generation for item ratings
 */

// Extend the base RatingSystem class
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
          <button type="submit" class="submit-review-btn">${
            userHasRated ? "Update Review" : "Submit Review"
          }</button>
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
          : ratings.map((rating) => this.generateReviewHTML(rating)).join("")
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
 * Generate HTML for a star rating display
 * @param {number} rating - The rating value (0-5)
 * @param {boolean} readonly - Whether this is a readonly display
 * @returns {string} HTML for star rating
 */
RatingSystem.prototype.generateStarRatingHTML = function (
  rating,
  readonly = false
) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return `
    <div class="star-rating ${readonly ? "readonly" : ""}">
      ${Array(fullStars)
        .fill()
        .map(
          () => `
        <i class="ri-star-fill" style="color: var(--star-filled);"></i>
      `
        )
        .join("")}
      ${
        halfStar
          ? `<i class="ri-star-half-fill" style="color: var(--star-filled);"></i>`
          : ""
      }
      ${Array(emptyStars)
        .fill()
        .map(
          () => `
        <i class="ri-star-line" style="color: var(--star-empty);"></i>
      `
        )
        .join("")}
    </div>
  `;
};

/**
 * Generate HTML for rating distribution bars
 * @param {Object} distribution - Object with keys 1-5 and values as counts
 * @returns {string} HTML for distribution bars
 */
RatingSystem.prototype.generateRatingDistributionHTML = function (
  distribution
) {
  let html = "";
  console.log("Rating distribution data:", distribution);

  // Make sure distribution is an object
  if (!distribution || typeof distribution !== "object") {
    distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    console.warn("Distribution is not valid, using default empty distribution");
  }

  // Calculate total across all ratings
  const total = Object.values(distribution).reduce(
    (sum, val) => sum + (parseInt(val) || 0),
    0
  );

  console.log("Total ratings for distribution:", total);

  // Create a bar for each rating level (5 to 1)
  for (let i = 5; i >= 1; i--) {
    // Get count for this rating, default to 0 if missing
    const count = parseInt(distribution[i]) || 0;

    // Calculate percentage width for the bar
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

    html += `
      <div class="rating-bar">
        <span class="rating-bar-label">${i}</span>
        <div class="rating-bar-outer">
          <div class="rating-bar-inner" style="width: ${percentage}%"></div>
        </div>
        <span class="rating-bar-count">${count}</span>
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
  // Debug the review object structure
  console.log("Processing review:", review);

  const isCurrentUser = this.token && review.userId === this.getUserId();

  // Handle different date formats
  let createdAt = "Unknown date";
  if (review.createdAt) {
    try {
      createdAt = new Date(review.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      console.error("Error formatting date:", e);
    }
  }

  // Use score instead of rating field, with fallbacks
  const score = review.score || review.rating || 0;

  // Handle different user data structures
  let userName = "Anonymous";
  let userInitial = "U";
  let userImage = null;

  // Check for user object
  if (review.user) {
    userName =
      review.user.firstName ||
      review.user.name ||
      review.user.username ||
      "Anonymous";
    userInitial = userName.charAt(0).toUpperCase();
    userImage = review.user.profileImage || review.user.avatar;
  }
  // Check for userName property
  else if (review.userName) {
    userName = review.userName;
    userInitial = userName.charAt(0).toUpperCase();
  }
  // Check for author property
  else if (review.author) {
    if (typeof review.author === "object") {
      userName =
        review.author.name ||
        review.author.firstName ||
        review.author.username ||
        "Anonymous";
      userInitial = userName.charAt(0).toUpperCase();
      userImage = review.author.profileImage || review.author.avatar;
    } else {
      userName = review.author;
      userInitial = userName.charAt(0).toUpperCase();
    }
  }

  return `
    <div class="review" data-id="${review._id || review.id || ""}">
      <div class="review-header">
        <div class="reviewer-info">
          ${
            userImage
              ? `<img src="${userImage}" alt="${userName}" class="reviewer-avatar">`
              : `<div class="avatar-initial">${userInitial}</div>`
          }
          <div>
            <div class="reviewer-name">${userName}</div>
            <div class="review-date">${createdAt}</div>
          </div>
        </div>
        <div class="review-rating">
          ${this.generateStarRatingHTML(score, true)}
        </div>
      </div>
      <div class="review-content">
        ${
          review.comment ||
          review.text ||
          review.content ||
          "No comment provided."
        }
      </div>
      ${
        isCurrentUser
          ? `
        <div class="review-actions">
          <button class="review-action-btn delete-review-btn" onclick="ratingSystem.deleteRating('${
            review._id
          }', 'item', '${review.listingId || review.itemId}')">
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
  const userId = this.getUserId();
  const userReview = ratings.find((rating) => rating.userId === userId);

  if (userReview) {
    return `
      <input type="hidden" name="ratingId" value="${
        userReview._id || userReview.id
      }">
    `;
  }

  return "";
};

/**
 * Initialize the review form with user's existing review data if they've already rated
 * @param {HTMLElement} form - The review form element
 * @param {Array} ratings - Array of ratings
 */
RatingSystem.prototype.initializeReviewForm = function (form, ratings) {
  const userId = this.getUserId();
  const userReview = ratings.find((rating) => rating.userId === userId);

  if (userReview && form) {
    // Set the rating
    const ratingInput = form.querySelector('input[name="rating"]');
    if (ratingInput) {
      ratingInput.value = userReview.score || userReview.rating || 0;
    }

    // Set the comment
    const commentInput = form.querySelector('textarea[name="comment"]');
    if (commentInput) {
      commentInput.value =
        userReview.comment || userReview.text || userReview.content || "";
    }

    // Highlight the stars
    const score = userReview.score || userReview.rating || 0;
    const stars = form.querySelectorAll(".star-rating label");
    stars.forEach((star) => {
      const value = parseInt(star.dataset.value);
      if (value <= score) {
        star.classList.add("active");
        const icon = star.querySelector("i");
        if (icon) icon.style.color = "var(--star-filled)";
      }
    });
  }
};

/**
 * Setup event listeners for item rating container
 * @param {HTMLElement} container - The rating container element
 */
RatingSystem.prototype.setupItemRatingEvents = function (container) {
  // Initialize star ratings in the container
  const starRatings = container.querySelectorAll(".star-rating:not(.readonly)");

  starRatings.forEach((ratingContainer) => {
    const stars = ratingContainer.querySelectorAll("label");
    const hiddenInput = ratingContainer.querySelector('input[type="hidden"]');

    stars.forEach((star) => {
      star.addEventListener("click", () => {
        const value = star.dataset.value;
        if (hiddenInput) hiddenInput.value = value;

        // Update visual state
        stars.forEach((s) => {
          if (parseInt(s.dataset.value) <= parseInt(value)) {
            s.classList.add("active");
            if (s.querySelector("i"))
              s.querySelector("i").style.color = "var(--star-filled)";
          } else {
            s.classList.remove("active");
            if (s.querySelector("i"))
              s.querySelector("i").style.color = "var(--star-empty)";
          }
        });
      });
    });
  });
};

/**
 * Get the current user ID from token
 * @returns {string} The user ID or null if not logged in
 */
RatingSystem.prototype.getUserId = function () {
  if (!this.token) return null;

  try {
    // Extract user ID from JWT token
    const payload = this.token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.id || decoded.userId || decoded._id;
  } catch (error) {
    console.error("Error extracting user ID from token:", error);
    return null;
  }
};
