/**
 * RatingSystem - Manages the item rating functionality
 * Handles displaying, submitting, and deleting ratings
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
   * Load ratings based on URL parameters
   */
  loadRatingsFromParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const itemId =
      urlParams.get("listingId") ||
      urlParams.get("itemId") ||
      urlParams.get("id");

    if (itemId) {
      this.loadItemRatings(itemId);
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
      this.renderItemRatings(data);
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
      this.showErrorMessage(
        error.message || "Failed to submit rating. Please try again later."
      );
    }
  }

  /**
   * Delete a rating
   * @param {string} ratingId - ID of the rating to delete
   * @param {string} type - Type of rating ('item')
   * @param {string} itemId - ID of the item
   */
  async deleteRating(ratingId, type, itemId) {
    if (!this.token) {
      this.showLoginRequired();
      return;
    }

    if (!confirm("Are you sure you want to delete this review?")) {
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/ratings/${ratingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete rating");
      }

      // Refresh ratings after deletion
      this.loadItemRatings(itemId);

      this.showMessage("Your review has been deleted successfully!");
    } catch (error) {
      console.error("Error deleting rating:", error);
      this.showErrorMessage(
        error.message || "Failed to delete review. Please try again later."
      );
    }
  }

  /**
   * Get the current user ID from token
   * @returns {string} The user ID or null if not logged in
   */
  getUserId = function () {
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

  /**
   * Show a message to the user
   * @param {string} message - Message to display
   * @param {boolean} isError - Whether this is an error message
   */
  showMessage(message, isError = false) {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${isError ? "error" : "success"}`;
    messageElement.textContent = message;
    document.body.appendChild(messageElement);

    setTimeout(() => {
      messageElement.remove();
    }, 3000);
  }

  /**
   * Show an error message
   * @param {string} message - Error message to display
   */
  showErrorMessage(message) {
    this.showMessage(message, true);
  }

  /**
   * Show login required message
   */
  showLoginRequired() {
    const messageElement = document.createElement("div");
    messageElement.className = "message error";

    messageElement.innerHTML = `
      You need to be logged in to perform this action. 
      <a href="login.html" style="color: white; text-decoration: underline;">Login here</a>
    `;

    document.body.appendChild(messageElement);

    setTimeout(() => {
      messageElement.remove();
    }, 5000);
  }
}

// Initialize the rating system when the page loads
document.addEventListener("DOMContentLoaded", () => {
  window.ratingSystem = new RatingSystem();
});
