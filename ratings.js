/**
 * Ratings system for handling both item and owner ratings
 */
class RatingsManager {
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");
  }

  /**
   * Initialize rating forms and listeners
   * @param {string} type - Type of rating ('item' or 'owner')
   * @param {string} targetId - ID of the listing or owner to rate
   * @param {HTMLElement} container - Container element for the rating form
   */
  initRatingForm(type, targetId, container) {
    if (!this.token) {
      container.innerHTML = `<p class="login-required">Please <a href="login.html">login</a> to leave a rating.</p>`;
      return;
    }

    // Create the rating form based on type
    if (type === 'item') {
      this.createItemRatingForm(targetId, container);
    } else if (type === 'owner') {
      this.createOwnerRatingForm(targetId, container);
    }
  }

  /**
   * Create a form for rating an item/listing
   * @param {string} listingId - ID of the listing to rate
   * @param {HTMLElement} container - Container element for the form
   */
  createItemRatingForm(listingId, container) {
    container.innerHTML = `
      <div class="rating-form">
        <h3>Rate This Item</h3>
        <div class="rating-stars">
          <div class="stars-container">
            ${this.generateStarInputs('item-rating')}
          </div>
        </div>
        <div class="form-group">
          <label for="item-comment">Your Review</label>
          <textarea id="item-comment" placeholder="Share your experience with this item..."></textarea>
        </div>
        <button id="submit-item-rating" class="btn btn-primary">Submit Rating</button>
      </div>
    `;

    // Add event listener for the submit button
    document.getElementById('submit-item-rating').addEventListener('click', () => {
      const score = document.querySelector('input[name="item-rating"]:checked')?.value || 0;
      const comment = document.getElementById('item-comment').value;
      
      if (score === 0) {
        alert('Please select a star rating');
        return;
      }
      
      this.submitItemRating(listingId, parseInt(score), comment);
    });
  }

  /**
   * Create a form for rating an owner
   * @param {string} ownerId - ID of the owner to rate
   * @param {HTMLElement} container - Container element for the form
   */
  createOwnerRatingForm(ownerId, container) {
    container.innerHTML = `
      <div class="rating-form">
        <h3>Rate This Owner</h3>
        <div class="rating-category">
          <label>Overall Rating</label>
          <div class="stars-container">
            ${this.generateStarInputs('owner-overall')}
          </div>
        </div>
        <div class="rating-category">
          <label>Communication</label>
          <div class="stars-container">
            ${this.generateStarInputs('owner-communication')}
          </div>
        </div>
        <div class="rating-category">
          <label>Reliability</label>
          <div class="stars-container">
            ${this.generateStarInputs('owner-reliability')}
          </div>
        </div>
        <div class="rating-category">
          <label>Item Condition</label>
          <div class="stars-container">
            ${this.generateStarInputs('owner-condition')}
          </div>
        </div>
        <div class="form-group">
          <label for="owner-comment">Your Review</label>
          <textarea id="owner-comment" placeholder="Share your experience with this owner..."></textarea>
        </div>
        <button id="submit-owner-rating" class="btn btn-primary">Submit Rating</button>
      </div>
    `;

    // Add event listener for the submit button
    document.getElementById('submit-owner-rating').addEventListener('click', () => {
      const score = document.querySelector('input[name="owner-overall"]:checked')?.value || 0;
      const communication = document.querySelector('input[name="owner-communication"]:checked')?.value || 0;
      const reliability = document.querySelector('input[name="owner-reliability"]:checked')?.value || 0;
      const itemCondition = document.querySelector('input[name="owner-condition"]:checked')?.value || 0;
      const comment = document.getElementById('owner-comment').value;
      
      if (score === 0) {
        alert('Please select an overall star rating');
        return;
      }
      
      this.submitOwnerRating(ownerId, parseInt(score), comment, 
        parseInt(communication), parseInt(reliability), parseInt(itemCondition));
    });
  }

  /**
   * Generate star rating inputs
   * @param {string} name - Name attribute for the radio inputs
   * @returns {string} HTML for star rating inputs
   */
  generateStarInputs(name) {
    let starsHtml = '';
    for (let i = 5; i >= 1; i--) {
      starsHtml += `
        <input type="radio" id="${name}-${i}" name="${name}" value="${i}" />
        <label for="${name}-${i}"><i class="ri-star-fill"></i></label>
      `;
    }
    return starsHtml;
  }

  /**
   * Submit a rating for an item/listing
   * @param {string} listingId - ID of the listing to rate
   * @param {number} score - Rating score (1-5)
   * @param {string} comment - Rating comment
   */
  async submitItemRating(listingId, score, comment) {
    try {
      const response = await fetch(`${this.baseUrl}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          listingId,
          score,
          comment
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit rating');
      }

      alert('Thank you! Your rating has been submitted.');
      
      // Refresh the page or update the UI as needed
      window.location.reload();
    } catch (error) {
      console.error('Error submitting item rating:', error);
      alert(`Failed to submit rating: ${error.message}`);
    }
  }

  /**
   * Submit a rating for an owner
   * @param {string} ownerId - ID of the owner to rate
   * @param {number} score - Overall rating score (1-5)
   * @param {string} comment - Rating comment
   * @param {number} communication - Communication score (1-5)
   * @param {number} reliability - Reliability score (1-5)
   * @param {number} itemCondition - Item condition score (1-5)
   */
  async submitOwnerRating(ownerId, score, comment, communication, reliability, itemCondition) {
    try {
      const response = await fetch(`${this.baseUrl}/owner-ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          ownerId,
          score,
          comment,
          communication,
          reliability,
          itemCondition
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit owner rating');
      }

      alert('Thank you! Your owner rating has been submitted.');
      
      // Refresh the page or update the UI as needed
      window.location.reload();
    } catch (error) {
      console.error('Error submitting owner rating:', error);
      alert(`Failed to submit owner rating: ${error.message}`);
    }
  }

  /**
   * Load and display ratings for a listing
   * @param {string} listingId - ID of the listing
   * @param {HTMLElement} container - Container to display ratings
   */
  async loadListingRatings(listingId, container) {
    try {
      const response = await fetch(`${this.baseUrl}/ratings/listing/${listingId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load ratings: ${response.status}`);
      }
      
      const ratings = await response.json();
      
      if (!ratings || ratings.length === 0) {
        container.innerHTML = `<p class="no-ratings">No ratings yet for this item.</p>`;
        return;
      }
      
      this.renderRatings(ratings, container);
    } catch (error) {
      console.error('Error loading ratings:', error);
      container.innerHTML = `<p class="error-message">Failed to load ratings. Please try again later.</p>`;
    }
  }

  /**
   * Load and display ratings for an owner
   * @param {string} ownerId - ID of the owner
   * @param {HTMLElement} container - Container to display ratings
   */
  async loadOwnerRatings(ownerId, container) {
    try {
      const response = await fetch(`${this.baseUrl}/owner-ratings/owner/${ownerId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load owner ratings: ${response.status}`);
      }
      
      const ratings = await response.json();
      
      if (!ratings || ratings.length === 0) {
        container.innerHTML = `<p class="no-ratings">No ratings yet for this owner.</p>`;
        return;
      }
      
      this.renderOwnerRatings(ratings, container);
    } catch (error) {
      console.error('Error loading owner ratings:', error);
      container.innerHTML = `<p class="error-message">Failed to load owner ratings. Please try again later.</p>`;
    }
  }

  /**
   * Render ratings in the container
   * @param {Array} ratings - List of rating objects
   * @param {HTMLElement} container - Container to render in
   */
  renderRatings(ratings, container) {
    // Calculate average rating
    const totalScore = ratings.reduce((sum, rating) => sum + rating.score, 0);
    const averageScore = (totalScore / ratings.length).toFixed(1);
    
    container.innerHTML = `
      <div class="ratings-summary">
        <div class="average-rating">
          <span class="rating-number">${averageScore}</span>
          <div class="rating-stars">
            ${this.generateStarDisplay(averageScore)}
          </div>
          <span class="rating-count">${ratings.length} ${ratings.length === 1 ? 'review' : 'reviews'}</span>
        </div>
      </div>
      <div class="ratings-list">
        ${ratings.map(rating => `
          <div class="rating-item">
            <div class="rating-header">
              <div class="rating-user">
                <span class="user-name">${rating.user?.firstName || 'Anonymous'}</span>
              </div>
              <div class="rating-date">
                ${new Date(rating.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div class="rating-stars">
              ${this.generateStarDisplay(rating.score)}
            </div>
            <div class="rating-comment">
              ${rating.comment || 'No comment provided.'}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render owner ratings in the container
   * @param {Array} ratings - List of owner rating objects
   * @param {HTMLElement} container - Container to render in
   */
  renderOwnerRatings(ratings, container) {
    // Calculate average ratings
    const totalScore = ratings.reduce((sum, rating) => sum + rating.score, 0);
    const totalComm = ratings.reduce((sum, rating) => sum + rating.communication, 0);
    const totalRel = ratings.reduce((sum, rating) => sum + rating.reliability, 0);
    const totalCond = ratings.reduce((sum, rating) => sum + rating.itemCondition, 0);
    
    const averageScore = (totalScore / ratings.length).toFixed(1);
    const averageComm = (totalComm / ratings.length).toFixed(1);
    const averageRel = (totalRel / ratings.length).toFixed(1);
    const averageCond = (totalCond / ratings.length).toFixed(1);
    
    container.innerHTML = `
      <div class="ratings-summary">
        <div class="average-rating">
          <span class="rating-number">${averageScore}</span>
          <div class="rating-stars">
            ${this.generateStarDisplay(averageScore)}
          </div>
          <span class="rating-count">${ratings.length} ${ratings.length === 1 ? 'review' : 'reviews'}</span>
        </div>
        <div class="rating-categories">
          <div class="rating-category">
            <span class="category-name">Communication:</span>
            <div class="category-stars">
              ${this.generateStarDisplay(averageComm)}
            </div>
            <span class="category-score">${averageComm}</span>
          </div>
          <div class="rating-category">
            <span class="category-name">Reliability:</span>
            <div class="category-stars">
              ${this.generateStarDisplay(averageRel)}
            </div>
            <span class="category-score">${averageRel}</span>
          </div>
          <div class="rating-category">
            <span class="category-name">Item Condition:</span>
            <div class="category-stars">
              ${this.generateStarDisplay(averageCond)}
            </div>
            <span class="category-score">${averageCond}</span>
          </div>
        </div>
      </div>
      <div class="ratings-list">
        ${ratings.map(rating => `
          <div class="rating-item">
            <div class="rating-header">
              <div class="rating-user">
                <span class="user-name">${rating.user?.firstName || 'Anonymous'}</span>
              </div>
              <div class="rating-date">
                ${new Date(rating.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div class="rating-stars">
              ${this.generateStarDisplay(rating.score)}
            </div>
            <div class="rating-details">
              <div class="rating-category">
                <span>Communication:</span>
                ${this.generateStarDisplay(rating.communication)}
              </div>
              <div class="rating-category">
                <span>Reliability:</span>
                ${this.generateStarDisplay(rating.reliability)}
              </div>
              <div class="rating-category">
                <span>Item Condition:</span>
                ${this.generateStarDisplay(rating.itemCondition)}
              </div>
            </div>
            <div class="rating-comment">
              ${rating.comment || 'No comment provided.'}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Generate star display for a rating
   * @param {number} score - Rating score
   * @returns {string} HTML for star display
   */
  generateStarDisplay(score) {
    const fullStars = Math.floor(score);
    const halfStar = score % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let starsHtml = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
      starsHtml += '<i class="ri-star-fill"></i>';
    }
    
    // Half star
    if (halfStar) {
      starsHtml += '<i class="ri-star-half-fill"></i>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
      starsHtml += '<i class="ri-star-line"></i>';
    }
    
    return starsHtml;
  }
}

// Create a global instance for use across pages
window.ratingsManager = new RatingsManager();
