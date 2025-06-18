/**
 * Enhanced Dual-Tab Rating System with Full CRUD Operations
 * Extends the existing rating system with comprehensive functionality
 */

class EnhancedRatingSystem {
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");
    this.currentEditingId = null;
    this.currentTab = 'item';
    this.currentItemRating = 0;
    this.currentSellerRating = 0;
    this.currentCommunicationRating = 0;
    this.currentReliabilityRating = 0;
    this.currentItemConditionRating = 0;
    this.sellerRatingsAvailable = null; // Will be checked on first use
    
    this.init();
  }

  /**
   * Initialize the enhanced rating system
   */
  init() {
    this.createRatingModal();
    this.loadRatingsFromParams();
    this.setupEventListeners();
    this.enhanceExistingButtons();
    
    // Check existing reviews and update button text
    setTimeout(() => this.updateButtonTexts(), 2000);
  }

  /**
   * Create the dual-tab rating modal (item and seller)
   */
  createRatingModal() {
    console.log('Creating enhanced rating modal');
    
    const modalHTML = `
      <div id="enhancedRatingDialog" class="enhanced-rating-dialog" style="display: none;">
        <div class="rating-dialog-content">
          <button type="button" class="close-btn" onclick="enhancedRatingSystem.closeDialog()">
            <i class="ri-close-line"></i>
          </button>
          
          <div class="rating-tabs">
            <button type="button" class="tab-btn active" onclick="enhancedRatingSystem.switchTab('item')">
              <i class="ri-box-3-line"></i> Item Review
            </button>
            <button type="button" class="tab-btn" onclick="enhancedRatingSystem.switchTab('seller')">
              <i class="ri-user-line"></i> Seller Review
            </button>
          </div>
          
          <!-- Item Rating Tab -->
          <div id="itemRatingTab" class="rating-tab-content active">
            <div class="tab-header">
              <h3><i class="ri-box-3-line"></i> Rate this Item</h3>
              <p>Share your experience with this item to help other renters</p>
            </div>
            
            <div class="rating-form">
              <!-- Overall Rating -->
              <div class="star-rating-section">
                <label>Overall Rating</label>
                <div id="itemRatingStars" class="star-rating interactive large">
                  <i class="ri-star-line" data-value="1"></i>
                  <i class="ri-star-line" data-value="2"></i>
                  <i class="ri-star-line" data-value="3"></i>
                  <i class="ri-star-line" data-value="4"></i>
                  <i class="ri-star-line" data-value="5"></i>
                </div>
                <span class="rating-description" id="itemRatingDescription">Click to rate</span>
              </div>
              
              <div class="comment-section">
                <label for="itemRatingComment">Your Review</label>
                <textarea id="itemRatingComment" 
                         placeholder="Share your experience with this item..."
                         maxlength="500"></textarea>
                <div class="char-count">
                  <span id="itemCharCount">0</span>/500 characters
                </div>
              </div>
              
              <div class="form-actions">
                <button type="button" onclick="enhancedRatingSystem.closeDialog()" 
                        class="btn-secondary">Cancel</button>
                <button type="button" onclick="enhancedRatingSystem.submitItemRating()" 
                        class="btn-primary" id="itemSubmitBtn">Submit Review</button>
              </div>
            </div>
          </div>
          
          <!-- Seller Rating Tab -->
          <div id="sellerRatingTab" class="rating-tab-content">
            <div class="tab-header">
              <h3><i class="ri-user-line"></i> Rate this Seller</h3>
              <p>Help other renters by rating your experience with this seller</p>
            </div>
            
            <div class="rating-form">
              <!-- Overall Rating -->
              <div class="star-rating-section">
                <label>Overall Rating</label>
                <div id="sellerRatingStars" class="star-rating interactive large">
                  <i class="ri-star-line" data-value="1"></i>
                  <i class="ri-star-line" data-value="2"></i>
                  <i class="ri-star-line" data-value="3"></i>
                  <i class="ri-star-line" data-value="4"></i>
                  <i class="ri-star-line" data-value="5"></i>
                </div>
                <span class="rating-description" id="sellerRatingDescription">Click to rate</span>
              </div>

              <!-- Detailed Rating Categories -->
              <div class="detailed-ratings">
                <h4>Rate Specific Aspects (Optional)</h4>
                
                <!-- Communication Rating -->
                <div class="rating-category">
                  <label>Communication</label>
                  <div id="communicationRatingStars" class="star-rating interactive">
                    <i class="ri-star-line" data-value="1"></i>
                    <i class="ri-star-line" data-value="2"></i>
                    <i class="ri-star-line" data-value="3"></i>
                    <i class="ri-star-line" data-value="4"></i>
                    <i class="ri-star-line" data-value="5"></i>
                  </div>
                  <span class="rating-category-desc">How responsive and clear was the seller?</span>
                </div>

                <!-- Reliability Rating -->
                <div class="rating-category">
                  <label>Reliability</label>
                  <div id="reliabilityRatingStars" class="star-rating interactive">
                    <i class="ri-star-line" data-value="1"></i>
                    <i class="ri-star-line" data-value="2"></i>
                    <i class="ri-star-line" data-value="3"></i>
                    <i class="ri-star-line" data-value="4"></i>
                    <i class="ri-star-line" data-value="5"></i>
                  </div>
                  <span class="rating-category-desc">Did the seller follow through on commitments?</span>
                </div>

                <!-- Item Condition Rating -->
                <div class="rating-category">
                  <label>Item Condition</label>
                  <div id="itemConditionRatingStars" class="star-rating interactive">
                    <i class="ri-star-line" data-value="1"></i>
                    <i class="ri-star-line" data-value="2"></i>
                    <i class="ri-star-line" data-value="3"></i>
                    <i class="ri-star-line" data-value="4"></i>
                    <i class="ri-star-line" data-value="5"></i>
                  </div>
                  <span class="rating-category-desc">Was the item as described?</span>
                </div>
              </div>
              
              <div class="comment-section">
                <label for="sellerRatingComment">Your Review</label>
                <textarea id="sellerRatingComment" 
                         placeholder="Share your experience with this seller's communication, reliability, and service..."
                         maxlength="500"></textarea>
                <div class="char-count">
                  <span id="sellerCharCount">0</span>/500 characters
                </div>
              </div>
              
              <div class="form-actions">
                <button type="button" onclick="enhancedRatingSystem.closeDialog()" 
                        class="btn-secondary">Cancel</button>
                <button type="button" onclick="enhancedRatingSystem.submitSellerRating()" 
                        class="btn-primary" id="sellerSubmitBtn">Submit Review</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Custom Confirmation Dialog -->
      <div id="confirmationDialog" class="confirmation-dialog">
        <div class="confirmation-dialog-content">
          <div class="confirmation-dialog-header">
            <i class="ri-delete-bin-line"></i>
            <h3>Delete Review</h3>
          </div>
          <div class="confirmation-dialog-body">
            <p>Are you sure you want to delete this review? This action cannot be undone.</p>
          </div>
          <div class="confirmation-dialog-actions">
            <button class="cancel-btn" id="cancelDeleteBtn">Cancel</button>
            <button class="delete-btn" id="confirmDeleteBtn">Delete</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.setupModalEventListeners();
  }

  /**
   * Setup event listeners for the modal
   */
  setupModalEventListeners() {
    // Star rating interactions for items
    this.makeStarsInteractive('#itemRatingStars', (rating) => {
      this.currentItemRating = rating;
      this.updateRatingDescription('item', rating);
    });
    
    // Star rating interactions for sellers
    this.makeStarsInteractive('#sellerRatingStars', (rating) => {
      this.currentSellerRating = rating;
      this.updateRatingDescription('seller', rating);
    });

    // Detailed seller rating interactions
    this.makeStarsInteractive('#communicationRatingStars', (rating) => {
      this.currentCommunicationRating = rating;
    });
    
    this.makeStarsInteractive('#reliabilityRatingStars', (rating) => {
      this.currentReliabilityRating = rating;
    });
    
    this.makeStarsInteractive('#itemConditionRatingStars', (rating) => {
      this.currentItemConditionRating = rating;
    });

    // Character count for textareas
    this.setupCharacterCount('#itemRatingComment', '#itemCharCount');
    this.setupCharacterCount('#sellerRatingComment', '#sellerCharCount');

    // Close dialog when clicking outside
    document.getElementById('enhancedRatingDialog').addEventListener('click', (e) => {
      if (e.target.id === 'enhancedRatingDialog') {
        this.closeDialog();
      }
    });
  }

  /**
   * Make star rating interactive
   */
  makeStarsInteractive(containerSelector, callback) {
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.warn(`⚠️ Star container not found: ${containerSelector}`);
      return;
    }
    
    const stars = container.querySelectorAll('i');
    if (stars.length === 0) {
      console.warn(`⚠️ No stars found in container: ${containerSelector}`);
      return;
    }
    
    console.log(`✅ Making ${stars.length} stars interactive in ${containerSelector}`);
    
    let currentRating = 0;
    
    stars.forEach((star, index) => {
      // Remove existing event listeners to prevent duplicates
      star.removeEventListener('click', star.clickHandler);
      star.removeEventListener('mouseenter', star.mouseenterHandler);
      
      // Create new handlers and store references
      star.clickHandler = () => {
        currentRating = index + 1;
        console.log(`⭐ Star clicked: ${currentRating} stars in ${containerSelector}`);
        this.updateStars(stars, currentRating);
        if (callback) {
          console.log(`📞 Calling callback with rating: ${currentRating}`);
          callback(currentRating);
        }
      };
      
      star.mouseenterHandler = () => {
        this.updateStars(stars, index + 1);
      };
      
      star.addEventListener('click', star.clickHandler);
      star.addEventListener('mouseenter', star.mouseenterHandler);
      
      // Add visual feedback
      star.style.cursor = 'pointer';
      star.style.transition = 'color 0.2s ease';
    });
    
    container.addEventListener('mouseleave', () => {
      this.updateStars(stars, currentRating);
    });
    
    console.log(`✅ Stars interactive setup complete for ${containerSelector}`);
  }

  /**
   * Update star display
   */
  updateStars(stars, rating) {
    stars.forEach((star, index) => {
      if (index < rating) {
        star.className = 'ri-star-fill';
      } else {
        star.className = 'ri-star-line';
      }
    });
  }

  /**
   * Update rating description text
   */
  updateRatingDescription(type, rating) {
    const descriptions = {
      1: 'Poor',
      2: 'Fair', 
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    };
    
    const descriptionElement = document.getElementById(`${type}RatingDescription`);
    if (descriptionElement) {
      descriptionElement.textContent = `${rating} ${rating === 1 ? 'star' : 'stars'} - ${descriptions[rating]}`;
    }
  }

  /**
   * Setup character count for textarea
   */
  setupCharacterCount(textareaSelector, countSelector) {
    const textarea = document.querySelector(textareaSelector);
    const counter = document.querySelector(countSelector);
    
    if (textarea && counter) {
      textarea.addEventListener('input', () => {
        const count = textarea.value.length;
        counter.textContent = count;
        
        // Change color when approaching limit
        if (count > 400) {
          counter.style.color = '#e74c3c';
        } else if (count > 300) {
          counter.style.color = '#f39c12';
        } else {
          counter.style.color = '#7f8c8d';
        }
      });
    }
  }

  /**
   * Switch between tabs
   */
  switchTab(tab) {
    this.currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Update tab content
    document.querySelectorAll('.rating-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tab}RatingTab`);
    });
  }

  /**
   * Open rating dialog with specified tab
   */
  openDialog(tab = 'item') {
    this.switchTab(tab);
    this.resetForm();
    
    // If opening seller tab, ensure the owner ID is populated
    if (tab === 'seller') {
      const ownerId = this.extractOwnerIdFromPage();
      const sellerOwnerIdInput = document.getElementById('sellerRatingOwnerId');
      if (sellerOwnerIdInput && ownerId) {
        sellerOwnerIdInput.value = ownerId;
        console.log('Populated sellerRatingOwnerId with:', ownerId);
      }
    }
    
    document.getElementById('enhancedRatingDialog').style.display = 'flex';
    
    // Load existing user ratings
    this.loadUserExistingRatings();
  }

  /**
   * Close rating dialog
   */
  closeDialog() {
    document.getElementById('enhancedRatingDialog').style.display = 'none';
    this.resetForm();
    this.currentEditingId = null;
  }

  /**
   * Reset form to initial state
   */
  resetForm() {
    // Clear editing state
    this.currentEditingId = null;
    this.currentEditingType = null;
    
    // Reset item rating
    const itemStars = document.querySelectorAll('#itemRatingStars i');
    this.updateStars(itemStars, 0);
    this.currentItemRating = 0;
    document.getElementById('itemRatingComment').value = '';
    document.getElementById('itemCharCount').textContent = '0';
    document.getElementById('itemRatingDescription').textContent = 'Click to rate';
    
    // Reset item submit button
    const itemSubmitBtn = document.getElementById('itemSubmitBtn');
    if (itemSubmitBtn) {
      itemSubmitBtn.textContent = 'Submit Review';
      itemSubmitBtn.innerHTML = '<i class="ri-star-line"></i> Submit Review';
    }
    
    // Reset seller rating
    const sellerStars = document.querySelectorAll('#sellerRatingStars i');
    this.updateStars(sellerStars, 0);
    this.currentSellerRating = 0;
    this.currentCommunicationRating = 0;
    this.currentReliabilityRating = 0;
    this.currentItemConditionRating = 0;
    
    // Reset detailed ratings
    const commStars = document.querySelectorAll('#communicationRatingStars i');
    const relStars = document.querySelectorAll('#reliabilityRatingStars i');
    const condStars = document.querySelectorAll('#itemConditionRatingStars i');
    if (commStars.length) this.updateStars(commStars, 0);
    if (relStars.length) this.updateStars(relStars, 0);
    if (condStars.length) this.updateStars(condStars, 0);
    
    document.getElementById('sellerRatingComment').value = '';
    document.getElementById('sellerCharCount').textContent = '0';
    document.getElementById('sellerRatingDescription').textContent = 'Click to rate';
    
    // Reset seller submit button
    const sellerSubmitBtn = document.getElementById('sellerSubmitBtn');
    if (sellerSubmitBtn) {
      sellerSubmitBtn.textContent = 'Submit Review';
      sellerSubmitBtn.innerHTML = '<i class="ri-user-star-line"></i> Submit Review';
    }
  }

  /**
   * Load user's existing ratings for editing
   */
  async loadUserExistingRatings() {
    if (!this.token) return;

    const params = new URLSearchParams(window.location.search);
    const listingId = params.get('listingId') || params.get('itemId') || params.get('id');
    const ownerId = this.extractOwnerIdFromPage();

    try {
      // Check for existing item rating
      if (listingId) {
        try {
          await this.loadItemRatingsForUser(listingId);
        } catch (itemError) {
          console.log('Item rating endpoints not available:', itemError);
          // Continue without item rating functionality
        }
      }
      
      // Check for existing seller rating
      if (ownerId) {
        try {
          await this.loadSellerRatingsForUser(ownerId);
        } catch (sellerError) {
          console.log('Seller rating endpoints not available:', sellerError);
          // Continue without seller rating functionality
        }
      }
    } catch (error) {
      console.error('Error loading existing ratings:', error);
    }
  }

  /**
   * Load item ratings and check for user's existing rating
   */
  async loadItemRatingsForUser(listingId) {
    try {
      // Use the correct endpoint according to your backend specification
      const response = await fetch(`${this.baseUrl}/ratings/listing/${listingId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('No ratings found for this item');
          return { success: true, count: 0, data: [] };
        }
        throw new Error(`Failed to load item ratings: ${response.status}`);
      }

      const ratingsData = await response.json();
      console.log('Item ratings data received:', ratingsData);
      
      // Normalize response format
      const ratings = ratingsData.data || (Array.isArray(ratingsData) ? ratingsData : []);
      
      if (Array.isArray(ratings)) {
        // Look for current user's rating
        const userId = this.getUserId();
        if (userId) {
          const userRating = ratings.find(rating => {
            // Check different possible user ID formats
            return rating.user === userId || 
                   rating.userId === userId ||
                   (rating.user && rating.user._id === userId) ||
                   (rating.user && rating.user.id === userId);
          });
          
          if (userRating && userRating._id) {
            console.log('Found existing user item rating:', userRating);
            this.populateItemForm(userRating);
          }
        }
      }
      
      return ratingsData;
    } catch (error) {
      console.error('Error loading item ratings for user:', error);
      throw error;
    }
  }
  
  /**
   * Populate item form with existing rating
   */
  populateItemForm(rating) {
    // Overall rating
    const stars = document.querySelectorAll('#itemRatingStars i');
    const ratingValue = rating.score || rating.rating || 0;
    this.updateStars(stars, ratingValue);
    this.currentItemRating = ratingValue;
    this.updateRatingDescription('item', ratingValue);
    
    // Comment
    document.getElementById('itemRatingComment').value = rating.comment || '';
    document.getElementById('itemCharCount').textContent = (rating.comment || '').length;
    
    // Update button text
    document.getElementById('itemSubmitBtn').innerHTML = '<i class="ri-edit-line"></i> Update Review';
    
    // Store rating ID for updating
    this.currentEditingId = rating._id || rating.id;
    this.currentEditingType = 'item';
  }

  /**
   * Load seller ratings from API (public endpoint)
   */
  async loadSellerRatings(ownerId) {
    if (!ownerId) {
      console.error('Owner ID is required to load seller ratings');
      return null;
    }

    try {
      console.log(`Loading seller ratings for owner: ${ownerId}`);
      
      // Use the correct endpoint according to your backend specification
      const response = await fetch(`${this.baseUrl}/owner-ratings/owner/${ownerId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('No ratings found for this seller');
          return { success: true, count: 0, data: [] };
        }
        throw new Error(`Failed to load seller ratings: ${response.status}`);
      }

      const data = await response.json();
      console.log('Seller ratings data received:', data);
      
      // Validate response format matches your backend specification
      if (data.success !== undefined && typeof data.count === 'number' && Array.isArray(data.data)) {
        return data;
      } else {
        console.warn('Response format does not match expected specification:', data);
        // Try to normalize the response
        return {
          success: true,
          count: Array.isArray(data) ? data.length : 0,
          data: Array.isArray(data) ? data : (data.data || [])
        };
      }
      
    } catch (error) {
      console.error('Error loading seller ratings:', error);
      throw error;
    }
  }

  /**
   * Load seller ratings and check for user's existing rating
   */
  async loadSellerRatingsForUser(ownerId) {
    try {
      const ratingsData = await this.loadSellerRatings(ownerId);
      
      if (ratingsData && ratingsData.data && Array.isArray(ratingsData.data)) {
        // Look for current user's rating
        const userId = this.getUserId();
        if (userId) {
          const userRating = ratingsData.data.find(rating => {
            // Check different possible user ID formats
            return rating.rater === userId || 
                   rating.userId === userId ||
                   (rating.rater && rating.rater._id === userId) ||
                   (rating.rater && rating.rater.id === userId);
          });
          
          if (userRating && userRating._id) {
            console.log('Found existing user rating:', userRating);
            this.populateSellerForm(userRating);
          }
        }
      }
      
      return ratingsData;
    } catch (error) {
      console.error('Error loading seller ratings for user:', error);
      throw error;
    }
  }

  /**
   * Populate seller form with existing rating
   */
  populateSellerForm(rating) {
    // Overall rating
    const stars = document.querySelectorAll('#sellerRatingStars i');
    const ratingValue = rating.score || rating.rating || 0;
    this.updateStars(stars, ratingValue);
    this.currentSellerRating = ratingValue;
    this.updateRatingDescription('seller', ratingValue);
    
    // Detailed ratings if available
    if (rating.communication) {
      const commStars = document.querySelectorAll('#communicationRatingStars i');
      if (commStars.length) {
        this.updateStars(commStars, rating.communication);
        this.currentCommunicationRating = rating.communication;
      }
    }
    
    if (rating.reliability) {
      const relStars = document.querySelectorAll('#reliabilityRatingStars i');
      if (relStars.length) {
        this.updateStars(relStars, rating.reliability);
        this.currentReliabilityRating = rating.reliability;
      }
    }
    
    if (rating.itemCondition) {
      const condStars = document.querySelectorAll('#itemConditionRatingStars i');
      if (condStars.length) {
        this.updateStars(condStars, rating.itemCondition);
        this.currentItemConditionRating = rating.itemCondition;
      }
    }
    
    document.getElementById('sellerRatingComment').value = rating.comment || '';
    document.getElementById('sellerCharCount').textContent = (rating.comment || '').length;
    document.getElementById('sellerSubmitBtn').textContent = 'Update Review';
    
    this.currentEditingId = rating._id || rating.id;
  }

  /**
   * Submit seller rating
   */
  async submitSellerRating() {
    if (!this.token) {
      this.showLoginRequired();
      return;
    }

    const rating = this.currentSellerRating;
    const comment = document.getElementById('sellerRatingComment').value.trim();

    if (!rating || rating === 0) {
      this.showError('Please select an overall star rating');
      return;
    }

    if (!comment) {
      this.showError('Please write a review comment');
      return;
    }

    const ownerId = this.extractOwnerIdFromPage();
    if (!ownerId) {
      this.showError('Owner ID not found');
      return;
    }

    this.setLoading('seller', true);

    try {
      // Build payload with required and optional fields
      const payload = {
        ownerId,
        score: rating,
        comment
      };

      // Add optional detailed ratings if provided
      if (this.currentCommunicationRating > 0) {
        payload.communication = this.currentCommunicationRating;
      }
      if (this.currentReliabilityRating > 0) {
        payload.reliability = this.currentReliabilityRating;
      }
      if (this.currentItemConditionRating > 0) {
        payload.itemCondition = this.currentItemConditionRating;
      }

      let response;
      if (this.currentEditingId) {
        // Update existing rating
        const updatePayload = { 
          score: rating, 
          comment 
        };
        
        // Add optional fields for update too
        if (this.currentCommunicationRating > 0) {
          updatePayload.communication = this.currentCommunicationRating;
        }
        if (this.currentReliabilityRating > 0) {
          updatePayload.reliability = this.currentReliabilityRating;
        }
        if (this.currentItemConditionRating > 0) {
          updatePayload.itemCondition = this.currentItemConditionRating;
        }
        
        response = await fetch(`${this.baseUrl}/owner-ratings/${this.currentEditingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`
          },
          body: JSON.stringify(updatePayload)
        });
      } else {
        // Create new rating
        response = await fetch(`${this.baseUrl}/owner-ratings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific backend error messages
        if (response.status === 400) {
          if (errorData.message === 'You have already rated this owner') {
            throw new Error('You have already rated this seller. Please edit your existing review instead.');
          } else if (errorData.message === 'You cannot rate yourself') {
            throw new Error('You cannot rate yourself.');
          } else {
            throw new Error(errorData.message || 'Invalid request. Please check your input.');
          }
        } else if (response.status === 401) {
          if (errorData.message === 'Invalid token') {
            throw new Error('Your session has expired. Please log in again.');
          } else {
            throw new Error('Authentication required. Please log in and try again.');
          }
        } else if (response.status === 403) {
          throw new Error('You are not authorized to update this rating. You can only edit your own reviews.');
        } else if (response.status === 404) {
          if (this.currentEditingId) {
            throw new Error('Rating not found. It may have been deleted by another action.');
          } else {
            throw new Error(errorData.message || 'Seller not found.');
          }
        } else if (response.status === 500) {
          throw new Error('Server error occurred. Please try again later.');
        } else {
          throw new Error(errorData.message || 'Failed to submit rating');
        }
      }

      const result = await response.json();
      console.log('Rating operation result:', result);
      
      // Validate response format matches backend specification
      const ratingData = result.data || result;
      
      if (!ratingData._id) {
        console.warn('Response does not contain expected _id field:', result);
      }
      
      const wasUpdate = this.currentEditingId !== null;
      this.showSuccess(wasUpdate ? 'Seller review updated successfully!' : 'Seller review submitted successfully!');
      this.closeDialog();
      
      // Clear editing state
      this.currentEditingId = null;
      
      // Reload ratings to show updated data
      setTimeout(() => {
        this.reloadRatings().catch(error => {
          console.log('Ratings reload failed:', error);
          // Fallback: manually add/update the review display
          if (wasUpdate) {
            this.updateSellerReviewInDisplay(ratingData, rating, comment);
          } else {
            this.addSellerReviewToDisplay(ratingData, rating, comment);
          }
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error submitting seller rating:', error);
      this.showError(error.message || 'Failed to submit seller rating');
    } finally {
      this.setLoading('seller', false);
    }
  }

  /**
   * Update existing review in the UI after editing
   */
  updateSellerReviewInDisplay(result, rating, comment) {
    const ratingId = result._id || result.id;
    if (!ratingId) {
      console.log('No rating ID found, falling back to add review');
      this.addSellerReviewToDisplay(result, rating, comment);
      return;
    }

    // Find and update the existing review
    const existingReview = document.querySelector(`[data-rating-id="${ratingId}"]`);
    if (existingReview) {
      // Update the rating display
      const ratingElement = existingReview.querySelector('.review-rating');
      if (ratingElement) {
        ratingElement.innerHTML = this.generateStarHTML(rating);
      }
      
      // Update the comment
      const commentElement = existingReview.querySelector('.review-content p');
      if (commentElement) {
        commentElement.textContent = comment;
      }
      
      // Update the date to show it was recently modified
      const dateElement = existingReview.querySelector('.review-date');
      if (dateElement) {
        dateElement.textContent = 'Just updated';
      }
      
      console.log('Updated existing review in display');
      return;
    }
    
    // If review not found, add it as new
    console.log('Existing review not found, adding as new');
    this.addSellerReviewToDisplay(result, rating, comment);
  }

  /**
   * Add seller review to display manually when API reload fails
   */
  addSellerReviewToDisplay(result, rating, comment) {
    const container = document.getElementById("ownerRatingContainer");
    if (!container) {
      console.log('Owner rating container not found');
      return;
    }
    
    const userId = this.getUserId();
    const userName = "You"; // Since it's the current user's review
    
    // Create the review HTML that matches the existing structure
    const reviewHTML = `
      <div class="review-item" data-rating-id="${result._id || result.id}" data-user-id="${userId}" data-rating-type="seller">
        <div class="review-header">
          <div class="reviewer-info">
            <div class="reviewer-name">${userName}</div>
            <div class="review-date">Just now</div>
          </div>
          <div class="review-rating">
            ${this.generateStarHTML(rating)}
          </div>
        </div>
        <div class="review-content">
          <p>${comment}</p>
        </div>
        <div class="review-actions">
          <button class="review-action-btn edit-btn" onclick="window.enhancedRatingSystem.editReview('${result._id || result.id}', 'seller')">
            <i class="ri-edit-line"></i> Edit
          </button>
          <button class="review-action-btn delete-btn" onclick="window.enhancedRatingSystem.deleteRating('${result._id || result.id}', 'seller')">
            <i class="ri-delete-bin-line"></i> Delete
          </button>
        </div>
      </div>
    `;
    
    // Find the seller reviews container
    let reviewsContainer = container.querySelector('.seller-reviews');
    if (!reviewsContainer) {
      console.log('Seller reviews container not found');
      return;
    }
    
    // Remove any "no reviews" message
    const noReviews = reviewsContainer.querySelector('.no-reviews');
    if (noReviews) {
      noReviews.remove();
    }
    
    // Add the new review at the beginning
    reviewsContainer.insertAdjacentHTML('afterbegin', reviewHTML);
    
    // Update the "Rate Seller" button text if user now has a review
    const rateSellerButton = document.getElementById('rateSellerBtn');
    if (rateSellerButton) {
      rateSellerButton.innerHTML = '<i class="ri-edit-line"></i> Edit Review';
    }
    
    console.log('Added seller review to display manually');
  }
  
  /**
   * Generate star HTML for display
   */
  generateStarHTML(rating) {
    let html = '<div class="star-rating readonly">';
    for (let i = 1; i <= 5; i++) {
      html += i <= rating 
        ? '<i class="ri-star-fill"></i>' 
        : '<i class="ri-star-line"></i>';
    }
    html += '</div>';
    return html;
  }

  /**
   * Delete a rating
   * @param {string} ratingId - ID of the rating to delete
   * @param {string} ratingType - Type of rating ('item' or 'seller')
   */
  async deleteRating(ratingId, ratingType = 'item') {
    if (!this.token) {
      this.showLoginRequired();
      return;
    }

    console.log(`Deleting ${ratingType} rating:`, ratingId);

    // Show custom confirmation dialog
    this.showConfirmationDialog(async () => {
      // Find the review element to show loading state
      const reviewElement = document.querySelector(`[data-rating-id="${ratingId}"]`);
      if (reviewElement) {
        reviewElement.style.opacity = '0.5';
        reviewElement.style.pointerEvents = 'none';
      }

      try {
        const response = await fetch(`${this.baseUrl}/ratings/${ratingId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Handle specific backend error messages from your API
          if (response.status === 403) {
            if (errorData.message === 'User is not authorized to delete this rating') {
              throw new Error('You are not authorized to delete this rating.');
            } else if (errorData.message === "User hasn't completed/paid for an order for this listing") {
              throw new Error('You cannot delete this rating because you have not completed a paid order for this item.');
            } else {
              throw new Error('You are not authorized to delete this rating.');
            }
          } else if (response.status === 404) {
            throw new Error('Rating not found. It may have already been deleted.');
          } else if (response.status === 401) {
            throw new Error('Authentication required. Please log in and try again.');
          } else {
            throw new Error(errorData.message || 'Failed to delete rating');
          }
        }

        const result = await response.json();
        console.log(`${ratingType} rating deletion result:`, result);
        
        // Validate response format matches the provided specification
        if (result.success && result.message) {
          console.log('✅ DELETE response matches specification');
          this.showSuccess('Review deleted successfully!');
          
          // Remove the review from display immediately
          if (reviewElement) {
            reviewElement.remove();
          }
          
          // Check if there are any remaining reviews by this user
          setTimeout(() => {
            const hasReviewed = this.hasUserReviewedItem();
            this.updateAddReviewButtonText(hasReviewed);
            
            // Reload ratings to update averages and counts
            this.reloadRatings().catch(error => {
              console.log('Ratings reload failed after deletion:', error);
              // Even if reload fails, the element was already removed above
            });
          }, 500);
          
        } else {
          console.warn('Response format does not match expected specification:', result);
          this.showSuccess('Review deleted successfully!');
          
          // Remove the review from display
          if (reviewElement) {
            reviewElement.remove();
          }
          
          // Check if there are any remaining reviews by this user
          const hasReviewed = this.hasUserReviewedItem();
          this.updateAddReviewButtonText(hasReviewed);
        }
        
      } catch (error) {
        console.error(`Error deleting ${ratingType} rating:`, error);
        this.showError(error.message || 'Failed to delete review');
        
        // Restore the review element on error
        if (reviewElement) {
          reviewElement.style.opacity = '1';
          reviewElement.style.pointerEvents = 'auto';
        }
      }
    });
  }
  
  /**
   * Show confirmation dialog for delete action
   * @param {Function} confirmCallback - Function to call when delete is confirmed
   */
  showConfirmationDialog(confirmCallback) {
    const dialog = document.getElementById('confirmationDialog');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const cancelBtn = document.getElementById('cancelDeleteBtn');
    
    // Show the dialog
    dialog.classList.add('show');
    
    // Set up event listeners
    const handleConfirm = () => {
      dialog.classList.remove('show');
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      confirmCallback();
    };
    
    const handleCancel = () => {
      dialog.classList.remove('show');
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    
    // Close on click outside
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        handleCancel();
      }
    }, { once: true });
  }
  
  /**
   * Update the Add Review button text based on whether user has already reviewed
   * @param {boolean} hasReviewed - Whether the user has already reviewed
   */
  updateAddReviewButtonText(hasReviewed) {
    const addReviewBtn = document.getElementById('addReviewBtn');
    if (addReviewBtn) {
      if (hasReviewed) {
        addReviewBtn.innerHTML = '<i class="ri-edit-line"></i> Edit Review';
        addReviewBtn.classList.add('edit-mode');
      } else {
        addReviewBtn.innerHTML = '<i class="ri-star-line"></i> Add Review';
        addReviewBtn.classList.remove('edit-mode');
      }
    }
  }

  /**
   * Update button texts based on existing reviews
   */
  async updateButtonTexts() {
    if (!this.token) return;
    
    const params = new URLSearchParams(window.location.search);
    const listingId = params.get('listingId') || params.get('itemId') || params.get('id');
    const ownerId = this.extractOwnerIdFromPage();
    
    // Check for existing seller review
    if (ownerId) {
      try {
        // Try to find if the user already has a seller review
        const reviewItems = document.querySelectorAll('.review-item[data-rating-type="seller"], .seller-reviews .review-item');
        const userId = this.getUserId();
        
        const userReview = Array.from(reviewItems).find(item => 
          item.dataset.userId === userId
        );
        
        if (userReview) {
          const rateSellerBtn = document.getElementById('rateSellerBtn');
          if (rateSellerBtn) {
            rateSellerBtn.innerHTML = '<i class="ri-edit-line"></i> Edit Review';
          }
        }
      } catch (error) {
        console.log('Could not check existing seller review:', error);
      }
    }
  }

  /**
   * Load ratings from URL parameters
   */
  loadRatingsFromParams() {
    const params = new URLSearchParams(window.location.search);
    const listingId = params.get('listingId') || params.get('itemId') || params.get('id');
    
    if (listingId) {
      // Initialize the enhanced display for existing ratings
      setTimeout(() => {
        this.enhanceExistingRatingDisplay();
      }, 2000);
    }
  }

  /**
   * Enhance existing rating display with edit/delete functionality
   */
  enhanceExistingRatingDisplay() {
    // Add edit/delete buttons to user's own reviews
    const reviews = document.querySelectorAll('.review-item, .review');
    const userId = this.getUserId();
    
    if (!userId) return;
    
    reviews.forEach(review => {
      // Try to find user ID in various ways
      const reviewUserId = review.dataset.userId || 
                          review.querySelector('[data-user-id]')?.dataset.userId ||
                          review.querySelector('.reviewer-info')?.dataset.userId;
      
      if (reviewUserId === userId) {
        // Add action buttons if not already present
        if (!review.querySelector('.review-actions')) {
          const ratingId = review.dataset.ratingId || review.querySelector('[data-rating-id]')?.dataset.ratingId;
          const ratingType = review.dataset.ratingType || 'item';
          
          if (ratingId) {
            const actionsHTML = `
              <div class="review-actions">
                <button class="review-action-btn edit-btn" onclick="window.enhancedRatingSystem.editReview('${ratingId}', '${ratingType}')">
                  <i class="ri-edit-line"></i> Edit
                </button>
                <button class="review-action-btn delete-btn" onclick="window.enhancedRatingSystem.deleteRating('${ratingId}', '${ratingType}')">
                  <i class="ri-delete-bin-line"></i> Delete
                </button>
              </div>
            `;
            review.insertAdjacentHTML('beforeend', actionsHTML);
          }
        }
      }
    });
  }

  /**
   * Edit an existing review
   * @param {string} ratingId - ID of the rating to edit
   * @param {string} ratingType - Type of rating ('item' or 'seller')
   */
  editReview(ratingId, ratingType = 'item') {
    if (!this.token) {
      this.showLoginRequired();
      return;
    }

    console.log(`Editing ${ratingType} review:`, ratingId);
    
    // Store the editing information
    this.currentEditingId = ratingId;
    this.currentEditingType = ratingType;
    
    // Find the review data to populate the form
    const reviewElement = document.querySelector(`[data-rating-id="${ratingId}"]`);
    if (!reviewElement) {
      this.showError('Review not found');
      return;
    }
    
    // Extract current rating and comment from the DOM
    const ratingStars = reviewElement.querySelectorAll('.review-rating .ri-star-fill, .review-rating .ri-star-line');
    let currentRating = 0;
    ratingStars.forEach((star, index) => {
      if (star.classList.contains('ri-star-fill')) {
        currentRating = Math.max(currentRating, index + 1);
      }
    });
    
    const commentElement = reviewElement.querySelector('.review-content p');
    const currentComment = commentElement ? commentElement.textContent.replace(/^["""]/, '').replace(/["""]$/, '') : '';
    
    // Open the dialog with the appropriate tab
    this.openDialog(ratingType);
    
    // Wait for dialog to be ready, then populate with current values
    setTimeout(() => {
      // Populate the form based on rating type
      if (ratingType === 'item') {
        // Set item rating stars
        this.setStarRating('#itemRatingStars', currentRating);
        this.currentItemRating = currentRating;
        
        // Set comment
        const commentTextarea = document.getElementById('itemRatingComment');
        if (commentTextarea) {
          commentTextarea.value = currentComment;
          // Update character count
          const charCount = document.getElementById('itemCharCount');
          if (charCount) {
            charCount.textContent = currentComment.length;
          }
        }
        
        // Update button text
        const submitBtn = document.getElementById('itemSubmitBtn');
        if (submitBtn) {
          submitBtn.textContent = 'Update Review';
          submitBtn.innerHTML = '<i class="ri-edit-line"></i> Update Review';
        }
        
        // Update description
        this.updateRatingDescription('item', currentRating);
        
      } else if (ratingType === 'seller') {
        // Set seller rating stars
        this.setStarRating('#sellerRatingStars', currentRating);
        this.currentSellerRating = currentRating;
        
        // Set comment
        const commentTextarea = document.getElementById('sellerRatingComment');
        if (commentTextarea) {
          commentTextarea.value = currentComment;
          // Update character count
          const charCount = document.getElementById('sellerCharCount');
          if (charCount) {
            charCount.textContent = currentComment.length;
          }
        }
        
        // Update button text
        const submitBtn = document.getElementById('sellerSubmitBtn');
        if (submitBtn) {
          submitBtn.textContent = 'Update Review';
          submitBtn.innerHTML = '<i class="ri-edit-line"></i> Update Review';
        }
        
        // Update description
        this.updateRatingDescription('seller', currentRating);
      }
    }, 300);
  }

  /**
   * Set star rating for a specific star container
   * @param {string} selector - CSS selector for the star container
   * @param {number} rating - Rating value (1-5)
   */
  setStarRating(selector, rating) {
    const stars = document.querySelectorAll(`${selector} i`);
    if (!stars.length) return;
    
    stars.forEach((star, index) => {
      if (index < rating) {
        star.className = 'ri-star-fill';
      } else {
        star.className = 'ri-star-line';
      }
    });
  }

  /**
   * Enhance existing buttons to use enhanced dialog
   * DISABLED - buttons are now handled in item-detail.html
   */
  enhanceExistingButtons() {
    console.log("🚫 Enhanced button override disabled - buttons handled in item-detail.html");
    // Button handling is now done in item-detail.html setupRatingButtons()
  }

  /**
   * Reload both item and seller ratings to keep displays current
   */
  async reloadRatings() {
    console.log('Reloading all ratings...');
    
    try {
      // Reload item ratings if we're on an item detail page
      if (window.itemDetailManager) {
        await window.itemDetailManager.loadItemRatings();
      }
      
      // Reload seller ratings if we have an owner ID
      if (window.itemDetailManager && window.itemDetailManager.ownerId) {
        await window.itemDetailManager.loadOwnerRatingsWithRetry(window.itemDetailManager.ownerId);
      }
      
      console.log('✅ All ratings reloaded successfully');
    } catch (error) {
      console.error('❌ Error reloading ratings:', error);
    }
  }

  /**
   * Display seller ratings in the UI
   */
  displaySellerRatings(ratingsData, ownerId) {
    const container = document.getElementById('ownerRatingContainer');
    if (!container) {
      console.log('Owner rating container not found');
      return;
    }

    console.log('displaySellerRatings called with:', ratingsData);

    // Handle different data structures
    let ratings = [];
    let count = 0;

    if (!ratingsData) {
      console.log('No ratings data provided');
      ratings = [];
      count = 0;
    } else if (ratingsData.data && Array.isArray(ratingsData.data)) {
      ratings = ratingsData.data;
      count = ratingsData.count || ratings.length;
    } else if (Array.isArray(ratingsData)) {
      ratings = ratingsData;
      count = ratings.length;
    } else if (ratingsData.ratings && Array.isArray(ratingsData.ratings)) {
      ratings = ratingsData.ratings;
      count = ratingsData.count || ratings.length;
    } else {
      console.log('Unrecognized ratings data structure:', ratingsData);
      ratings = [];
      count = 0;
    }

    console.log(`Processed ratings: ${ratings.length} items, count: ${count}`);
    
    // Calculate averages
    let totalScore = 0;
    let totalCommunication = 0;
    let totalReliability = 0;
    let totalItemCondition = 0;
    let communicationCount = 0;
    let reliabilityCount = 0;
    let itemConditionCount = 0;

    ratings.forEach(rating => {
      totalScore += rating.score || 0;
      if (rating.communication) {
        totalCommunication += rating.communication;
        communicationCount++;
      }
      if (rating.reliability) {
        totalReliability += rating.reliability;
        reliabilityCount++;
      }
      if (rating.itemCondition) {
        totalItemCondition += rating.itemCondition;
        itemConditionCount++;
      }
    });

    const averageScore = count > 0 ? totalScore / count : 0;
    const avgCommunication = communicationCount > 0 ? totalCommunication / communicationCount : 0;
    const avgReliability = reliabilityCount > 0 ? totalReliability / reliabilityCount : 0;
    const avgItemCondition = itemConditionCount > 0 ? totalItemCondition / itemConditionCount : 0;

    console.log(`Calculated averages: overall=${averageScore}, comm=${avgCommunication}, rel=${avgReliability}, cond=${avgItemCondition}`);

    // Generate HTML
    let html = `
      <div class="rating-header">
        <h3><i class="ri-user-star-line"></i> Seller Ratings & Reviews</h3>
        <button id="rateSellerBtn" class="rating-toggle-btn">
          <i class="ri-user-star-line"></i> Rate Seller
        </button>
      </div>
    `;

    // Show summary only if there are ratings
    if (count > 0) {
      html += `
        <div class="rating-summary">
          <div class="rating-average">
            <div class="rating-average-value">${averageScore.toFixed(1)}</div>
            <div class="rating-average-stars">
              ${this.generateStarHTML(averageScore)}
            </div>
            <div class="rating-count">${count} ${count === 1 ? 'review' : 'reviews'}</div>
          </div>
        </div>
      `;

      // Add detailed averages if available
      if (avgCommunication > 0 || avgReliability > 0 || avgItemCondition > 0) {
        html += `
          <div class="detailed-averages">
            <h4><i class="ri-bar-chart-line"></i> Detailed Ratings</h4>
            ${avgCommunication > 0 ? `
              <div class="avg-category">
                <span>Communication</span>
                ${this.generateStarHTML(avgCommunication)}
                <span class="avg-category-score">${avgCommunication.toFixed(1)}</span>
              </div>
            ` : ''}
            ${avgReliability > 0 ? `
              <div class="avg-category">
                <span>Reliability</span>
                ${this.generateStarHTML(avgReliability)}
                <span class="avg-category-score">${avgReliability.toFixed(1)}</span>
              </div>
            ` : ''}
            ${avgItemCondition > 0 ? `
              <div class="avg-category">
                <span>Item Condition</span>
                ${this.generateStarHTML(avgItemCondition)}
                <span class="avg-category-score">${avgItemCondition.toFixed(1)}</span>
              </div>
            ` : ''}
          </div>
        `;
      }
    }

    // Add reviews list
    html += `
      <div class="seller-reviews">
        <div class="reviews-header">
          <h4><i class="ri-chat-1-line"></i> Customer Reviews</h4>
        </div>
    `;
    
    if (ratings.length === 0) {
      html += `
        <div class="no-reviews">
          <i class="ri-emotion-sad-line"></i>
          <p>No reviews yet for this seller.</p>
          <small>Be the first to share your experience!</small>
        </div>
      `;
    } else {
      ratings.forEach(rating => {
        const reviewerName = rating.rater?.firstName && rating.rater?.lastName 
          ? `${rating.rater.firstName} ${rating.rater.lastName}`
          : rating.rater?.username || 'Anonymous';
          
        const userId = this.getUserId();
        const isUserReview = rating.rater === userId || 
                           (rating.rater && rating.rater._id === userId) ||
                           rating.userId === userId;
        
        html += `
          <div class="review-item" data-rating-id="${rating._id}" data-user-id="${rating.rater?._id || rating.rater || rating.userId}" data-rating-type="seller">
            <div class="review-header">
              <div class="reviewer-info">
                <div class="reviewer-name">
                  ${isUserReview ? '<i class="ri-user-line"></i> You' : `<i class="ri-user-3-line"></i> ${reviewerName}`}
                  ${isUserReview ? '<span class="trusted-seller-badge"><i class="ri-shield-check-line"></i> Your Review</span>' : ''}
                </div>
                <div class="review-date"><i class="ri-calendar-line"></i> ${new Date(rating.createdAt).toLocaleDateString()}</div>
              </div>
              <div class="review-rating">
                ${this.generateStarHTML(rating.score)}
                <span class="rating-score">${rating.score}/5</span>
              </div>
            </div>
            <div class="review-content">
              <p><i class="ri-chat-quote-line"></i> ${rating.comment || 'No comment provided.'}</p>
            </div>
            ${isUserReview ? `
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
    
    console.log('Seller ratings HTML generated and inserted');
    
    // Update button text if user has already reviewed
    this.updateButtonTexts();
    
    // Ensure Rate Seller button is connected
    setTimeout(() => {
      if (window.itemDetailManager) {
        window.itemDetailManager.connectRateSellerButton();
      }
    }, 100);
  }

  /**
   * Helper methods
   */
  ensureSellerReviewsContainer(container) {
    if (!container) return;
    
    let sellerReviews = container.querySelector('.seller-reviews');
    if (!sellerReviews) {
      // Create the seller reviews container if it doesn't exist
      sellerReviews = document.createElement('div');
      sellerReviews.className = 'seller-reviews';
      sellerReviews.innerHTML = '<div class="no-reviews">No reviews yet for this seller.</div>';
      container.appendChild(sellerReviews);
    }
    
    return sellerReviews;
  }

  /**
   * Extract owner ID from page elements
   */
  extractOwnerIdFromPage() {
    console.log('🔍 Extracting owner ID from page...');
    
    // Try multiple methods to get owner ID
    const params = new URLSearchParams(window.location.search);
    let ownerId = params.get('ownerId') || params.get('sellerId');
    console.log('📋 Owner ID from URL params:', ownerId);
    
    if (!ownerId) {
      // Try to extract from page elements
      const ownerIdInput = document.getElementById('sellerRatingOwnerId');
      if (ownerIdInput) {
        ownerId = ownerIdInput.value;
        console.log('Owner ID from input element:', ownerId);
      }
    }
    
    // Try to extract from window.itemDetailManager if available
    if (!ownerId && window.itemDetailManager && window.itemDetailManager.ownerId) {
      ownerId = window.itemDetailManager.ownerId;
      console.log('Owner ID from itemDetailManager:', ownerId);
    }
    
    // Additional fallback: try to extract from the owner info section
    if (!ownerId) {
      const ownerSection = document.getElementById('ownerInfo');
      if (ownerSection) {
        const ownerData = ownerSection.dataset.ownerId;
        if (ownerData) {
          ownerId = ownerData;
          console.log('Owner ID from owner section data:', ownerId);
        }
      }
    }
    
    console.log('Final extracted owner ID:', ownerId);
    return ownerId;
  }

  getUserId() {
    if (!this.token) return null;
    
    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      return payload.userId || payload.id || payload.sub;
    } catch (error) {
      console.error('Error extracting user ID from token:', error);
      return null;
    }
  }

  setLoading(type, isLoading) {
    const btn = document.getElementById(`${type}SubmitBtn`);
    if (btn) {
      btn.disabled = isLoading;
      btn.innerHTML = isLoading 
        ? '<i class="ri-loader-4-line spin"></i> Submitting...' 
        : (this.currentEditingId ? 'Update Review' : 'Submit Review');
    }
  }

  setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const dialog = document.getElementById('enhancedRatingDialog');
        if (dialog && dialog.style.display === 'flex') {
          this.closeDialog();
        }
      }
    });
  }

  // Message display methods
  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showMessage(message, type = 'info') {
    // Use existing toast system if available
    if (window.itemDetailManager && window.itemDetailManager.showMessage) {
      window.itemDetailManager.showMessage(message, type === 'error');
    } else if (window.showToast) {
      window.showToast(message, type);
    } else {
      // Fallback to simple notification
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      // Set background color based on type
      let bgColor;
      switch(type) {
        case 'error':
          bgColor = '#e74c3c'; // Red
          break;
        case 'success':
          bgColor = '#27ae60'; // Green
          break;
        case 'warning':
          bgColor = '#f39c12'; // Orange
          break;
        case 'info':
          bgColor = '#3498db'; // Blue
          break;
        default:
          bgColor = '#3498db'; // Default to blue for info
      }
      
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${bgColor};
        color: white;
        border-radius: 5px;
        z-index: 3000;
        font-weight: 500;
      `;
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 5000);
    }
  }

  showLoginRequired() {
    this.showError('Please log in to rate this item');
    setTimeout(() => {
      if (typeof redirectToLogin === 'function') {
        redirectToLogin();
      } else {
        window.location.href = 'login.html';
      }
    }, 2000);
  }

  /**
   * Submit item rating
   */
  async submitItemRating() {
    if (!this.token) {
      this.showLoginRequired();
      return;
    }

    const rating = this.currentItemRating;
    const comment = document.getElementById('itemRatingComment').value.trim();

    if (!rating || rating === 0) {
      this.showError('Please select a star rating');
      return;
    }

    if (!comment) {
      this.showError('Please write a review comment');
      return;
    }

    this.setLoading('item', true);

    try {
      const params = new URLSearchParams(window.location.search);
      const listingId = params.get('listingId') || params.get('itemId') || params.get('id');

      if (!listingId) {
        throw new Error('Item ID not found');
      }

      let response;
      let result;

      if (this.currentEditingId) {
        // Update existing rating
        console.log(`Updating item rating ${this.currentEditingId} with score ${rating}`);
        
        response = await fetch(`${this.baseUrl}/ratings/${this.currentEditingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify({
            score: rating,
            comment: comment
          })
        });
      } else {
        // Create new rating
        console.log(`Creating new item rating for listing ${listingId} with score ${rating}`);
        
        response = await fetch(`${this.baseUrl}/ratings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify({
            listingId: listingId,
            score: rating,
            comment: comment
          })
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to submit review');
      }

      result = await response.json();
      console.log('Rating submission result:', result);

      // Update UI based on whether this was an edit or a new review
      if (this.currentEditingId) {
        this.updateItemReviewInDisplay(result, rating, comment);
        this.showSuccess('Your review has been updated!');
      } else {
        this.addItemReviewToDisplay(result, rating, comment);
        this.showSuccess('Your review has been submitted!');
      }

      // Update the Add Review button to show "Edit Review"
      this.updateAddReviewButtonText(true);
      
      // Close the dialog
      this.closeDialog();
      
      // Reset form for next use
      this.resetForm();

    } catch (error) {
      console.error('Error submitting item rating:', error);
      this.showError(error.message || 'Failed to submit review');
    } finally {
      this.setLoading('item', false);
    }
  }

  /**
   * Update item review in display manually when API reload fails
   */
  updateItemReviewInDisplay(result, rating, comment) {
    const reviewElement = document.querySelector(`[data-rating-id="${result._id}"]`);
    if (!reviewElement) {
      console.log('Review element not found for update');
      return;
    }
    
    // Update the rating stars
    const ratingContainer = reviewElement.querySelector('.review-rating');
    if (ratingContainer) {
      ratingContainer.innerHTML = this.generateStarHTML(rating);
    }
    
    // Update the comment
    const commentElement = reviewElement.querySelector('.review-content p');
    if (commentElement) {
      commentElement.innerHTML = `<i class="ri-chat-quote-line"></i> ${comment}`;
    }
    
    // Update the date to show it was recently updated
    const dateElement = reviewElement.querySelector('.review-date');
    if (dateElement) {
      dateElement.innerHTML = '<i class="ri-calendar-line"></i> Just updated';
    }
    
    console.log('Updated item review in display manually');
  }

  /**
   * Add item review to display manually when API reload fails
   */
  addItemReviewToDisplay(result, rating, comment) {
    const container = document.getElementById("itemRatingContainer");
    if (!container) {
      console.log('Item rating container not found');
      return;
    }
    
    const userId = this.getUserId();
    const userName = "You"; // Since it's the current user's review
    
    // Create the review HTML that matches the existing structure
    const reviewHTML = `
      <div class="review-item" data-rating-id="${result._id}" data-user-id="${userId}" data-rating-type="item">
        <div class="review-header">
          <div class="reviewer-info">
            <div class="reviewer-name">${userName}</div>
            <div class="review-date">Just now</div>
          </div>
          <div class="review-rating">
            ${this.generateStarHTML(rating)}
          </div>
        </div>
        <div class="review-content">
          <p>${comment}</p>
        </div>
        <div class="review-actions">
          <button class="review-action-btn edit-btn" onclick="window.enhancedRatingSystem.editReview('${result._id}', 'item')">
            <i class="ri-edit-line"></i> Edit
          </button>
          <button class="review-action-btn delete-btn" onclick="window.enhancedRatingSystem.deleteRating('${result._id}', 'item')">
            <i class="ri-delete-bin-line"></i> Delete
          </button>
        </div>
      </div>
    `;
    
    // Find the item reviews container
    let reviewsContainer = container.querySelector('.review-list, .item-reviews');
    if (!reviewsContainer) {
      // Create reviews container if it doesn't exist
      reviewsContainer = document.createElement('div');
      reviewsContainer.className = 'review-list';
      container.appendChild(reviewsContainer);
    }
    
    // Remove any "no reviews" message
    const noReviews = reviewsContainer.querySelector('.no-reviews');
    if (noReviews) {
      noReviews.remove();
    }
    
    // Add the new review at the beginning
    reviewsContainer.insertAdjacentHTML('afterbegin', reviewHTML);
    
    console.log('Added item review to display manually');
  }

  /**
   * Check if the user has already reviewed the item
   * @returns {boolean} Whether the user has already reviewed
   */
  hasUserReviewedItem() {
    const userId = this.getUserId();
    if (!userId) return false;
    
    const reviewItems = document.querySelectorAll('.review-item[data-rating-type="item"], .review-list .review-item');
    return Array.from(reviewItems).some(item => {
      const reviewUserId = item.dataset.userId;
      return reviewUserId === userId;
    });
  }
}

// Initialize the enhanced rating system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.enhancedRatingSystem = new EnhancedRatingSystem();
});

// Global functions for backward compatibility
window.openRatingDialog = () => {
  if (window.enhancedRatingSystem) {
    window.enhancedRatingSystem.openDialog('item');
  }
};

window.openSellerRatingDialog = () => {
  if (window.enhancedRatingSystem) {
    window.enhancedRatingSystem.openDialog('seller');
  }
};

window.closeRatingDialog = () => {
  if (window.enhancedRatingSystem) {
    window.enhancedRatingSystem.closeDialog();
  }
};

// CSS Animation for loading spinner
const spinStyle = document.createElement('style');
spinStyle.textContent = `
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(spinStyle); 