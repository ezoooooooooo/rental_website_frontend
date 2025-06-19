/**
 * Consolidated Rating System
 * This file combines functionality from:
 * - rating.js
 * - item-rating.js
 * - owner-rating.js
 * - item-rating-modal.js
 */

class RatingSystem {
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");

    // Initialize the rating system
    this.init();
  }

  /**
   * Initialize the rating system
   */
  init() {
    // Inject CSS for avatar letters if not already present
    this.injectAvatarLetterStyles();
    // Add event listener to rating toggle button
    const toggleBtn = document.querySelector(".rating-toggle-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        this.toggleAddReviewForm();
      });
    }

    // Initialize star ratings for all existing rating inputs
    this.initializeStarRatings();

    // Check for URL parameters for item ID
    this.loadRatingsFromParams();
    
    // Initialize rating tabs if they exist
    this.initRatingTabs();
    
    // Initialize rating modal if on item detail page
    this.initRatingModal();
  }

  /**
   * Initialize star rating inputs
   */
  initializeStarRatings() {
    const starRatings = document.querySelectorAll(
      ".star-rating:not(.readonly)"
    );

    starRatings.forEach((container) => {
      const stars = container.querySelectorAll("label");
      const hiddenInput = container.querySelector('input[type="hidden"]');

      stars.forEach((star) => {
        star.addEventListener("click", () => {
          const value = star.dataset.value;
          hiddenInput.value = value;

          // Update visual state
          stars.forEach((s) => {
            s.classList.toggle("active", s.dataset.value <= value);
          });
        });
      });
    });
  }

  /**
   * Initialize rating tabs (item/owner)
   */
  initRatingTabs() {
    const tabs = document.querySelectorAll('.rating-tab');
    if (tabs.length === 0) return;
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Show the corresponding content
        const tabType = tab.dataset.tab;
        
        if (tabType === 'item') {
          document.getElementById('itemRatingContainer').style.display = 'block';
          document.getElementById('ownerRatingContainer').style.display = 'none';
        } else if (tabType === 'owner') {
          document.getElementById('itemRatingContainer').style.display = 'none';
          document.getElementById('ownerRatingContainer').style.display = 'block';
        }
      });
    });
  }

  /**
   * Load ratings based on URL parameters
   */
  loadRatingsFromParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const itemId =
      urlParams.get("listingId") ||
      urlParams.get("itemId") ||
      urlParams.get("id");
    
    const ownerId = 
      urlParams.get("ownerId") ||
      urlParams.get("sellerId");

    if (itemId) {
      this.loadItemRatings(itemId);
    }
    
    if (ownerId) {
      this.loadOwnerRatings(ownerId);
    }
  }

  /**
   * Toggle the add review form visibility
   */
  toggleAddReviewForm() {
    const formContainer = document.querySelector(".add-review-form");
    if (!formContainer) return;

    const isVisible = formContainer.style.display !== "none";
    formContainer.style.display = isVisible ? "none" : "block";

    // Update button text
    const toggleBtn = document.querySelector(".rating-toggle-btn");
    if (toggleBtn) {
      toggleBtn.textContent = isVisible ? "+ Add Review" : "Cancel";
    }

    // Scroll to form if showing
    if (!isVisible) {
      formContainer.scrollIntoView({ behavior: "smooth" });
    }
  }

  /**
   * Load item ratings from the API
   * @param {string} itemId - ID of the item to load ratings for
   */
  async loadItemRatings(itemId) {
    try {
      console.log(`Loading ratings for item ${itemId}`);
      const response = await fetch(`${this.baseUrl}/ratings/listing/${itemId}`);

      if (!response.ok) {
        throw new Error(
          `Failed to load item ratings. Status: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Rating data received:", data);
      
      // Use the item detail manager to render ratings if available
      if (window.itemDetailManager && window.itemDetailManager.renderItemRatingsManually) {
        window.itemDetailManager.renderItemRatingsManually(data);
      } else {
        this.renderItemRatingsBasic(data);
      }
    } catch (error) {
      console.error("Error loading item ratings:", error);
      this.showErrorMessage("Failed to load ratings. Please try again later.");
    }
  }

  /**
   * Submit an item rating
   * @param {Event} event - Form submission event
   */
  async submitItemRating(event) {
    event.preventDefault();

    if (!this.token) {
      this.showLoginRequired();
      return;
    }

    const form = event.target;
    const listingId = form.elements.itemId.value;
    const score = form.elements.rating.value;
    const comment = form.elements.comment.value;
    const ratingId = form.elements.ratingId ? form.elements.ratingId.value : null;
    const isUpdate = !!ratingId;

    if (!score || score === "0") {
      this.showErrorMessage("Please select a star rating before submitting.");
      return;
    }

    if (!comment.trim()) {
      this.showErrorMessage("Please write a comment before submitting.");
      return;
    }

    try {
      let response;
      
      if (isUpdate) {
        // Update existing rating
        response = await fetch(`${this.baseUrl}/ratings/${ratingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({
            score: parseInt(score),
            comment,
          }),
        });
      } else {
        // Create new rating
        response = await fetch(`${this.baseUrl}/ratings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({
            listingId,
            score: parseInt(score),
            comment,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.message === "You can only rate items you have paid for and ordered") {
          this.showErrorMessage("You can only rate items you have paid for and ordered. Please complete a rental first.");
        } else {
          throw new Error(errorData.message || "Failed to submit rating");
        }
        return;
      }

      // Refresh ratings after submission
      this.loadItemRatings(listingId);

      // Hide the form and reset it
      form.reset();
      this.toggleAddReviewForm();

      this.showMessage(isUpdate ? "Your rating has been updated successfully!" : "Your rating has been submitted successfully!");
    } catch (error) {
      console.error("Error submitting item rating:", error);
      this.showErrorMessage("Failed to submit rating. Please try again later.");
    }
  }

  /**
   * Show login required message
   */
  showLoginRequired() {
    this.showErrorMessage(
      "Please <a href='login.html'>log in</a> to submit a rating."
    );
  }

  /**
   * Show error message
   * @param {string} message - Error message to show
   */
  showErrorMessage(message) {
    this.showMessage(message, true);
  }

  /**
   * Show message
   * @param {string} message - Message to show
   * @param {boolean} isError - Whether this is an error message
   */
  showMessage(message, isError = false) {
    const messageContainer = document.createElement("div");
    messageContainer.className = `message ${isError ? "error" : "success"}`;
    messageContainer.innerHTML = message;

    // Find a good place to show the message
    const container = document.querySelector(".rating-container") || document.body;
    container.prepend(messageContainer);

    // Remove the message after a few seconds
    setTimeout(() => {
      messageContainer.remove();
    }, 5000);
  }
  
  /**
   * Inject CSS for avatar letters if not already present
   */
  injectAvatarLetterStyles() {
    // Check if styles are already injected
    if (document.getElementById('avatar-letter-styles')) return;
    
    // Create style element
    const style = document.createElement('style');
    style.id = 'avatar-letter-styles';
    style.textContent = `
      .avatar-letter {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: var(--primary-color, #4CAF50);
        color: white;
        font-weight: bold;
        font-size: 18px;
        text-transform: uppercase;
      }
      
      .distribution-bar {
        background-color: var(--primary-color, #4CAF50) !important;
      }
    `;
    
    // Append to document head
    document.head.appendChild(style);
  }

  /**
   * Basic rendering fallback for item ratings
   * @param {Object} data - Rating data to render
   */
  renderItemRatingsBasic(data) {
    const container = document.getElementById("itemRatingContainer");
    if (!container) return;

    let ratings = [];
    let count = 0;
    let averageScore = 0;

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

    let html = `
      <div class="rating-header">
        <h3>Item Ratings & Reviews</h3>
        <button class="rating-toggle-btn" id="addReviewBtn">
          <i class="ri-star-line"></i> Add Review
        </button>
      </div>
    `;

    if (count > 0) {
      html += `
        <div class="rating-summary">
          <div class="rating-average">
            <div class="rating-average-value">${averageScore.toFixed(1)}</div>
            <div class="rating-count">${count} ${count === 1 ? "review" : "reviews"}</div>
          </div>
        </div>
      `;
    }

    html += `<div class="review-list">`;

    if (ratings.length === 0) {
      html += `<div class="no-reviews">No reviews yet for this item.</div>`;
    } else {
      ratings.forEach((rating) => {
        const reviewerName = rating.user?.firstName && rating.user?.lastName 
          ? `${rating.user.firstName} ${rating.user.lastName}`
          : rating.user?.username || rating.user?.name || 'Anonymous';
          
        const reviewDate = rating.createdAt || rating.date;
        const reviewScore = rating.score || rating.rating || 0;
        const reviewComment = rating.comment || rating.review || rating.text || "No comment provided.";

        html += `
          <div class="review-item">
            <div class="review-header">
              <div class="reviewer-info">
                <div class="reviewer-name">${reviewerName}</div>
                ${reviewDate ? `<div class="review-date">${new Date(reviewDate).toLocaleDateString()}</div>` : ''}
              </div>
              <div class="review-rating">★ ${reviewScore}</div>
            </div>
            <div class="review-content">
              <p>${reviewComment}</p>
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  /**
   * Get user ID from token
   * @returns {string|null} User ID or null if not logged in
   */
  getUserId() {
    if (!this.token) return null;

    try {
      // Simple JWT token parsing (assumes token has standard JWT format)
      const base64Url = this.token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );

      const payload = JSON.parse(jsonPayload);
      return payload.userId || payload.sub;
    } catch (error) {
      console.error("Error parsing token:", error);
      return null;
    }
  }

  /**
   * Get user's existing rating for an item
   * @param {string} itemId - ID of the item
   * @returns {Object|null} User's rating or null if not found
   */
  getUserRating(itemId) {
    // This would need to be implemented based on your data structure
    // For now, return null as a placeholder
    return null;
  }

  /**
   * Initialize the rating modal
   */
  initRatingModal() {
    // Check if we're on a page that needs the modal
    if (!document.getElementById('addReviewBtn')) return;
    
    // Create modal if it doesn't exist
    if (!document.getElementById('ratingDialog')) {
      const modalHTML = `
        <div id="ratingDialog" class="rating-dialog" style="display:none;">
          <div class="rating-dialog-content">
            <div class="rating-dialog-header">
              <h3>Rate This Item</h3>
              <button class="close-dialog-btn" id="closeRatingDialog">&times;</button>
            </div>
            <div class="rating-dialog-body">
              <div class="rating-stars star-rating-large" id="dialogStarRating">
                <!-- Stars will be generated by JS -->
              </div>
              <div class="comment-field">
                <textarea id="dialogComment" placeholder="Share your experience..."></textarea>
              </div>
              <div class="dialog-actions">
                <button class="cancel-btn" id="cancelDialogBtn">Cancel</button>
                <button class="submit-btn" id="submitDialogBtn">Submit</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      
      // Add event listeners for the modal
      const addReviewBtn = document.getElementById('addReviewBtn');
      const ratingDialog = document.getElementById('ratingDialog');
      const closeDialogBtn = document.getElementById('closeRatingDialog');
      const cancelDialogBtn = document.getElementById('cancelDialogBtn');
      const submitDialogBtn = document.getElementById('submitDialogBtn');
      
      if (addReviewBtn) {
        addReviewBtn.addEventListener('click', () => this.openRatingDialog());
      }
      
      if (closeDialogBtn) {
        closeDialogBtn.addEventListener('click', () => this.closeRatingDialog());
      }
      
      if (cancelDialogBtn) {
        cancelDialogBtn.addEventListener('click', () => this.closeRatingDialog());
      }
      
      if (submitDialogBtn) {
        submitDialogBtn.addEventListener('click', () => this.submitRatingFromDialog());
      }
    }
  }

  /**
   * Open the rating dialog
   */
  openRatingDialog() {
    const ratingDialog = document.getElementById('ratingDialog');
    if (!ratingDialog) return;
    
    ratingDialog.style.display = 'flex';
    
    // Generate stars
    const dialogStarRating = document.getElementById('dialogStarRating');
    dialogStarRating.innerHTML = '';
    
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('label');
      star.className = 'star';
      star.dataset.value = i;
      star.innerHTML = '<i class="ri-star-fill"></i>';
      star.addEventListener('click', () => this.setDialogRating(i));
      dialogStarRating.appendChild(star);
    }
  }

  /**
   * Close the rating dialog
   */
  closeRatingDialog() {
    const ratingDialog = document.getElementById('ratingDialog');
    if (ratingDialog) {
      ratingDialog.style.display = 'none';
    }
  }

  /**
   * Set the rating in the dialog
   * @param {number} rating - Rating value (1-5)
   */
  setDialogRating(rating) {
    const stars = document.querySelectorAll('#dialogStarRating .star');
    stars.forEach(star => {
      star.classList.toggle('active', parseInt(star.dataset.value) <= rating);
    });
  }

  /**
   * Submit rating from the dialog
   */
  submitRatingFromDialog() {
    const stars = document.querySelectorAll('#dialogStarRating .star.active');
    const rating = stars.length;
    const comment = document.getElementById('dialogComment').value;
    
    if (rating === 0) {
      if (window.showToast) {
        window.showToast('Please select a star rating', 'error');
      } else {
        alert('Please select a star rating');
      }
      return;
    }
    
    if (!comment.trim()) {
      if (window.showToast) {
        window.showToast('Please write a comment', 'error');
      } else {
        alert('Please write a comment');
      }
      return;
    }
    
    const itemId = new URLSearchParams(window.location.search).get('id') || 
                  new URLSearchParams(window.location.search).get('itemId');
    
    // Create a form submission
    const formData = new FormData();
    formData.append('itemId', itemId);
    formData.append('rating', rating);
    formData.append('comment', comment);
    
    // Submit the rating
    this.submitItemRating({
      preventDefault: () => {},
      target: {
        elements: {
          itemId: { value: itemId },
          rating: { value: rating },
          comment: { value: comment }
        }
      }
    });
    
    // Close the dialog
    this.closeRatingDialog();
  }
}

// Initialize the rating system when the page loads
document.addEventListener("DOMContentLoaded", () => {
  window.ratingSystem = new RatingSystem();
});
