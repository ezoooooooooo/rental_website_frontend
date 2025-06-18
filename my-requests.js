/**
 * Handle displaying and managing rental requests for owners
 */
class RequestsManager {
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");
    this.userId = localStorage.getItem("userId");

    this.initRequestsPage();
  }

  /**
   * Initialize the requests page
   */
  initRequestsPage() {
    if (!this.token) {
      window.location.href = "login.html";
      return;
    }

    this.loadOwnerRequests();
    this.loadNotifications();
    this.setupProfileDropdown();
  }

  /**
   * Load and display rental requests for items owned by the user
   */
  async loadOwnerRequests() {
    try {
      // Show loading indicator
      const loadingIndicator = document.getElementById("loadingIndicator");
      if (loadingIndicator) loadingIndicator.style.display = "block";

      const response = await fetch(`${this.baseUrl}/orders/owner-orders`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const requests = await response.json();
      console.log("Fetched requests:", requests);

      // Hide loading indicator
      if (loadingIndicator) loadingIndicator.style.display = "none";

      const requestsContainer = document.getElementById("requestsContainer");
      if (!requestsContainer) return;

      if (!requests || requests.length === 0) {
        requestsContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">
              <i class="ri-file-list-line"></i>
            </div>
            <h3>No Rental Requests</h3>
            <p>You haven't received any rental requests yet. When customers request to rent your items, they'll appear here.</p>
            <a href="./item.html" class="btn btn-primary">
              <i class="ri-add-line"></i> Add Your First Item
            </a>
          </div>
        `;
        return;
      }

      // Clear container
      requestsContainer.innerHTML = "";

      // Load existing ratings for all renters to show rating status
      const renterRatings = await this.loadRenterRatings(requests);
      
      // Load overall renter ratings (from all users) for decision making
      const renterOverallRatings = await this.loadRenterOverallRatings(requests);

      // Sort requests by date (newest first)
      requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      requests.forEach((request) => {
        const card = document.createElement("div");
        card.className = "request-card";
        card.setAttribute("data-request-id", request._id);

        const listing = request.listing || {};
        const renter = request.user || {};
        const statusClass = this.getStatusClass(request.status);
        const statusText = this.getStatusText(request.status);
        const statusIcon = this.getStatusIcon(request.status);
        
        // Format dates nicely
        const createdDate = new Date(request.createdAt);
        const formattedRequestDate = createdDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        
        let formattedStartDate = 'Not specified';
        let formattedEndDate = 'Not specified';
        let rentalDays = request.rentalDays || 1;
        
        if (request.startDate && request.endDate) {
          const startDate = new Date(request.startDate);
          const endDate = new Date(request.endDate);
          formattedStartDate = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          formattedEndDate = endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

          // Calculate rental duration if not provided
          if (!request.rentalDays) {
            rentalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
          }
        }
        
        // Format price with currency symbol
        const formattedPrice = new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD',
          minimumFractionDigits: 2
        }).format(request.totalPrice || 0);
        
        let imagesHTML = '';
        if (listing.images && listing.images.length > 0) {
          imagesHTML = listing.images.map(
            (imgUrl, idx) => `<img src="${typeof imgUrl === 'string' ? imgUrl : imgUrl.url}" alt="Listing image" class="request-img-thumb" data-img-idx="${idx}" data-request-id="${request._id}" onerror="this.onerror=null; this.src='https://via.placeholder.com/120';}" />`
          ).join('');
        } else {
          imagesHTML = `<img src="https://via.placeholder.com/120" alt="No image" class="request-img-thumb" data-img-idx="0" data-request-id="${request._id}" />`;
        }

        // Check if this renter has been rated by current user
        const existingRating = renterRatings[renter._id];
        const hasBeenRated = !!existingRating;
        
        // Get overall renter ratings for display
        const overallRating = renterOverallRatings[renter._id];
        
        card.innerHTML = `
          <div class="request-header">
            <div class="request-info">
              <h3>${listing.name || 'Item'}</h3>
              <div class="request-meta">
                <span><i class="ri-calendar-line"></i> ${formattedRequestDate}</span>
                <span class="request-id"><i class="ri-file-list-line"></i> Request #${request._id.substring(0, 8)}</span>
              </div>
            </div>
            <div class="request-status ${statusClass}">
              ${statusIcon} <span>${statusText}</span>
            </div>
          </div>
          <div class="request-body">
            <div class="request-images">
              ${imagesHTML}
            </div>
            <div class="request-details">
              <div class="detail-row">
                <span class="detail-label"><i class="ri-calendar-event-line"></i> Rental Period:</span>
                <span class="detail-value">${formattedStartDate} to ${formattedEndDate} <span class="rental-days">(${rentalDays} day${rentalDays !== 1 ? 's' : ''})</span></span>
              </div>
              <div class="detail-row">
                <span class="detail-label"><i class="ri-money-dollar-circle-line"></i> Total Price:</span>
                <span class="detail-value"><span class="request-price">${formattedPrice}</span></span>
              </div>
              <div class="detail-row">
                <span class="detail-label"><i class="ri-user-line"></i> Requested By:</span>
                <span class="detail-value">${renter.firstName || ''} ${renter.lastName || ''}</span>
              </div>
              
              <!-- Renter Rating Display for Decision Making -->
              ${this.generateRenterRatingDisplay(renter._id, renter.firstName, renter.lastName, overallRating, request.status)}
              
              ${request.status === 'completed' ? `
              <div class="rating-section">
                ${hasBeenRated ? `
                  <div class="existing-rating">
                    <span class="rating-status">
                      <i class="ri-star-fill"></i> Rated (${existingRating.score}/5)
                    </span>
                    <button class="btn btn-sm btn-outline" onclick="requestsManager.viewRenterRatings('${renter._id}', '${renter.firstName} ${renter.lastName}')">
                      <i class="ri-eye-line"></i> View Rating
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="requestsManager.editRenterRating('${existingRating._id}', '${renter._id}', '${renter.firstName} ${renter.lastName}')">
                      <i class="ri-edit-line"></i> Edit
                    </button>
                  </div>
                ` : `
                  <button class="btn btn-sm btn-outline" onclick="requestsManager.showRatingModal('${request._id}', '${renter._id}', '${renter.firstName} ${renter.lastName}')">
                    <i class="ri-star-line"></i> Rate this renter
                  </button>
                `}
              </div>` : ''}
            </div>
          </div>
          <div class="request-actions">
            ${this.getRequestActions(request)}
          </div>
        `;
        requestsContainer.appendChild(card);
      });
      
      // Add event listeners for action buttons
      this.setupRequestActionListeners();
      
      // Add animation to cards
      this.animateCards();
      
    } catch (error) {
      console.error("Error loading rental requests:", error);
      // Hide loading indicator
      if (loadingIndicator) loadingIndicator.style.display = "none";
      
      requestsContainer.innerHTML = `
        <div class="error-state">
          <i class="ri-error-warning-line"></i>
          <p>Failed to load rental requests. Please try again later.</p>
          <button class="btn btn-sm btn-outline" onclick="requestsManager.loadOwnerRequests()">Retry</button>
        </div>
      `;
    }
  }

  /**
   * Animate cards with staggered effect
   */
  animateCards() {
    const cards = document.querySelectorAll('.request-card');
    cards.forEach((card, index) => {
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, index * 100);
    });
  }

  /**
   * Get the appropriate CSS class for a request status
   */
  getStatusClass(status) {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      case 'completed':
        return 'status-completed';
      default:
        return 'status-pending';
    }
  }

  /**
   * Get the display text for a request status
   */
  getStatusText(status) {
    switch (status) {
      case 'pending':
        return 'Pending Action';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'completed':
        return 'Completed';
      default:
        return 'Processing';
    }
  }
  
  /**
   * Get the icon for a request status
   */
  getStatusIcon(status) {
    switch (status) {
      case 'pending':
        return '<i class="ri-time-line"></i>';
      case 'approved':
        return '<i class="ri-check-line"></i>';
      case 'rejected':
        return '<i class="ri-close-circle-line"></i>';
      case 'completed':
        return '<i class="ri-checkbox-circle-line"></i>';
      default:
        return '<i class="ri-question-line"></i>';
    }
  }

  /**
   * Get the appropriate action buttons based on request status
   */
  getRequestActions(request) {
    switch (request.status) {
      case 'pending':
        return `
          <div class="action-buttons">
            <button class="action-btn reject-btn" onclick="requestsManager.rejectRequest('${request._id}')">
              <i class="ri-close-line"></i> Reject
            </button>
            <button class="action-btn approve-btn" onclick="requestsManager.approveRequest('${request._id}')">
              <i class="ri-check-line"></i> Approve
            </button>
          </div>
        `;
      case 'approved':
        return `
          <a href="listing-details.html?id=${request.listing._id}" class="btn btn-outline">
            <i class="ri-eye-line"></i> View Item
          </a>
          <button class="btn btn-primary" onclick="requestsManager.completeRequest('${request._id}')">
            <i class="ri-check-double-line"></i> Mark as Completed
          </button>
        `;
      case 'rejected':
        return `
          <a href="listing-details.html?id=${request.listing._id}" class="btn btn-outline">
            <i class="ri-eye-line"></i> View Item
          </a>
        `;
      case 'completed':
        return `
          <a href="listing-details.html?id=${request.listing._id}" class="btn btn-outline">
            <i class="ri-eye-line"></i> View Item
          </a>
        `;
      default:
        return '';
    }
  }

  /**
   * Set up event listeners for request action buttons
   */
  setupRequestActionListeners() {
    // Event listeners will be added by the onclick attributes
  }

  /**
   * Approve a rental request
   */
  async approveRequest(requestId) {
    this.showConfirmationModal(
      "Approve Request",
      "Are you sure you want to approve this rental request? The renter will be notified.",
      "ri-check-line",
      "success",
      async () => {
        try {
          const response = await fetch(`${this.baseUrl}/orders/${requestId}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.token}`,
            },
            body: JSON.stringify({
              status: 'approved'
            })
          });

          if (!response.ok) {
            throw new Error("Failed to approve request");
          }

          // Reload requests to reflect changes
          this.loadOwnerRequests();
          
          // Show success message
          this.showToast("Request approved successfully", "success");
          
        } catch (error) {
          console.error("Error approving request:", error);
          this.showToast("Failed to approve request. Please try again.", "error");
        }
      }
    );
  }

  /**
   * Reject a rental request
   */
  async rejectRequest(requestId) {
    this.showConfirmationModal(
      "Reject Request",
      "Are you sure you want to reject this rental request? This action cannot be undone and the renter will be notified.",
      "ri-close-line",
      "error",
      async () => {
        try {
          const response = await fetch(`${this.baseUrl}/orders/${requestId}/status`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.token}`
            },
            body: JSON.stringify({ status: "rejected" })
          });

          if (!response.ok) {
            throw new Error("Failed to reject request");
          }

          this.showToast('Request rejected successfully', 'success');
          this.loadOwnerRequests();
          
        } catch (error) {
          console.error("Error rejecting request:", error);
          this.showToast('Failed to reject request', 'error');
        }
      }
    );
  }

  /**
   * Mark a rental as completed
   */
  async completeRequest(requestId) {
    // Show custom confirmation modal instead of basic confirm dialog
    this.showConfirmationModal(
      "Mark as Completed",
      "Are you sure you want to mark this rental as completed? This action cannot be undone.",
      "ri-check-double-line",
      "success",
      async () => {
        try {
          const response = await fetch(`${this.baseUrl}/orders/${requestId}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.token}`,
            },
            body: JSON.stringify({
              status: 'completed'
            })
          });

          if (!response.ok) {
            throw new Error("Failed to complete request");
          }

          // Reload requests to reflect changes
          this.loadOwnerRequests();
          
          // Show success message
          this.showToast("Rental marked as completed successfully", "success");
          
        } catch (error) {
          console.error("Error completing request:", error);
          this.showToast("Failed to complete request. Please try again.", "error");
        }
      }
    );
  }

  /**
   * Show the rating modal for a completed rental
   */
  showRatingModal(requestId, renterId, renterName) {
    const modalHTML = `
      <div class="rating-modal-backdrop">
        <div class="rating-modal">
          <div class="rating-modal-header">
            <h3>Rate This Renter</h3>
            <button class="close-btn" onclick="requestsManager.closeRatingModal()">×</button>
          </div>
          <div class="rating-modal-body">
            <p>How was your experience with <strong>${renterName}</strong>?</p>
            
            <!-- Overall Rating -->
            <div class="rating-group">
              <label>Overall Rating</label>
              <div class="star-rating" data-rating-type="overall">
                <i class="ri-star-line" data-rating="1"></i>
                <i class="ri-star-line" data-rating="2"></i>
                <i class="ri-star-line" data-rating="3"></i>
                <i class="ri-star-line" data-rating="4"></i>
                <i class="ri-star-line" data-rating="5"></i>
              </div>
            </div>

            <!-- Detailed Ratings -->
            <div class="detailed-ratings">
              <div class="rating-group">
                <label>Communication (Optional)</label>
                <div class="star-rating" data-rating-type="communication">
                  <i class="ri-star-line" data-rating="1"></i>
                  <i class="ri-star-line" data-rating="2"></i>
                  <i class="ri-star-line" data-rating="3"></i>
                  <i class="ri-star-line" data-rating="4"></i>
                  <i class="ri-star-line" data-rating="5"></i>
                </div>
              </div>

              <div class="rating-group">
                <label>Reliability (Optional)</label>
                <div class="star-rating" data-rating-type="reliability">
                  <i class="ri-star-line" data-rating="1"></i>
                  <i class="ri-star-line" data-rating="2"></i>
                  <i class="ri-star-line" data-rating="3"></i>
                  <i class="ri-star-line" data-rating="4"></i>
                  <i class="ri-star-line" data-rating="5"></i>
                </div>
              </div>

              <div class="rating-group">
                <label>Item Care (Optional)</label>
                <div class="star-rating" data-rating-type="itemCare">
                  <i class="ri-star-line" data-rating="1"></i>
                  <i class="ri-star-line" data-rating="2"></i>
                  <i class="ri-star-line" data-rating="3"></i>
                  <i class="ri-star-line" data-rating="4"></i>
                  <i class="ri-star-line" data-rating="5"></i>
                </div>
              </div>

              <div class="rating-group">
                <label>Timeliness (Optional)</label>
                <div class="star-rating" data-rating-type="timeliness">
                  <i class="ri-star-line" data-rating="1"></i>
                  <i class="ri-star-line" data-rating="2"></i>
                  <i class="ri-star-line" data-rating="3"></i>
                  <i class="ri-star-line" data-rating="4"></i>
                  <i class="ri-star-line" data-rating="5"></i>
                </div>
              </div>
            </div>

            <div class="comment-section">
              <label for="ratingComment">Comment (Optional)</label>
              <textarea id="ratingComment" placeholder="Share your experience with this renter (max 500 characters)" maxlength="500"></textarea>
              <div class="character-count">0/500</div>
            </div>
          </div>
          <div class="rating-modal-footer">
            <button class="btn btn-outline" onclick="requestsManager.closeRatingModal()">Cancel</button>
            <button class="btn btn-primary" onclick="requestsManager.submitRating('${requestId}', '${renterId}')">Submit Rating</button>
          </div>
        </div>
      </div>
    `;

    // Add modal to the DOM
    const modalContainer = document.createElement('div');
    modalContainer.id = 'ratingModalContainer';
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    // Set up star rating functionality for all rating types
    const allStarRatings = document.querySelectorAll('.star-rating');
    allStarRatings.forEach(starRating => {
      const stars = starRating.querySelectorAll('i');
      const ratingType = starRating.getAttribute('data-rating-type');
      
      stars.forEach(star => {
        star.addEventListener('click', () => {
          const rating = parseInt(star.getAttribute('data-rating'));
          this.setStarRating(starRating, rating);
        });

        star.addEventListener('mouseover', () => {
          const rating = parseInt(star.getAttribute('data-rating'));
          this.highlightStars(starRating, rating);
        });

        star.addEventListener('mouseout', () => {
          const selectedRating = starRating.getAttribute('data-selected') || 0;
          this.highlightStars(starRating, parseInt(selectedRating));
        });
      });
    });

    // Character counter for comment
    const commentTextarea = document.getElementById('ratingComment');
    const characterCount = document.querySelector('.character-count');
    
    commentTextarea.addEventListener('input', () => {
      const count = commentTextarea.value.length;
      characterCount.textContent = `${count}/500`;
      
      if (count > 450) {
        characterCount.style.color = '#ff6b6b';
      } else {
        characterCount.style.color = '#666';
      }
    });
  }

  /**
   * Close the rating modal
   */
  closeRatingModal() {
    const modalContainer = document.getElementById('ratingModalContainer');
    if (modalContainer) {
      document.body.removeChild(modalContainer);
    }
  }

  /**
   * Set the selected star rating
   */
  setStarRating(starRating, rating) {
    starRating.setAttribute('data-selected', rating);
    this.highlightStars(starRating, rating);
  }

  /**
   * Highlight stars up to the specified rating
   */
  highlightStars(starRating, rating) {
    const stars = starRating.querySelectorAll('i');
    stars.forEach(star => {
      if (parseInt(star.getAttribute('data-rating')) <= rating) {
        star.classList.remove('ri-star-line');
        star.classList.add('ri-star-fill');
      } else {
        star.classList.remove('ri-star-fill');
        star.classList.add('ri-star-line');
      }
    });
  }

  /**
   * Submit a rating for a renter
   */
  async submitRating(requestId, renterId) {
    // Get all rating values
    const overallRating = parseInt(document.querySelector('[data-rating-type="overall"]').getAttribute('data-selected') || 0);
    const communicationRating = parseInt(document.querySelector('[data-rating-type="communication"]').getAttribute('data-selected') || 0);
    const reliabilityRating = parseInt(document.querySelector('[data-rating-type="reliability"]').getAttribute('data-selected') || 0);
    const itemCareRating = parseInt(document.querySelector('[data-rating-type="itemCare"]').getAttribute('data-selected') || 0);
    const timelinessRating = parseInt(document.querySelector('[data-rating-type="timeliness"]').getAttribute('data-selected') || 0);
    const comment = document.getElementById('ratingComment').value.trim();

    // Validate required overall rating
    if (!overallRating) {
      this.showToast("Please select an overall rating", "error");
      return;
    }

    try {
      // Prepare request body according to API specification
      const requestBody = {
        renterId: renterId,
        score: overallRating,
      };

      // Add optional fields only if they have values
      if (comment) {
        requestBody.comment = comment;
      }
      if (communicationRating > 0) {
        requestBody.communication = communicationRating;
      }
      if (reliabilityRating > 0) {
        requestBody.reliability = reliabilityRating;
      }
      if (itemCareRating > 0) {
        requestBody.itemCare = itemCareRating;
      }
      if (timelinessRating > 0) {
        requestBody.timeliness = timelinessRating;
      }

      const response = await fetch(`${this.baseUrl}/renter-ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to submit rating");
      }

      this.closeRatingModal();
      this.showToast("Rating submitted successfully!", "success");
      
      // Refresh the requests to show updated state
      this.loadOwnerRequests();
      
    } catch (error) {
      console.error("Error submitting rating:", error);
      this.showToast(error.message || "Failed to submit rating. Please try again.", "error");
    }
  }

  /**
   * Load notifications for the current user
   */
  async loadNotifications() {
    try {
      const response = await fetch(`${this.baseUrl}/notifications`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const notifications = await response.json();
      
      // Update notification badge in the navbar
      this.updateNotificationBadge(notifications.filter(n => !n.read).length);
      
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  }

  /**
   * Update the notification badge in the navbar
   */
  updateNotificationBadge(count) {
    const notificationBadge = document.querySelector('.notification-badge');
    if (notificationBadge) {
      if (count > 0) {
        notificationBadge.textContent = count;
        notificationBadge.style.display = 'flex';
      } else {
        notificationBadge.style.display = 'none';
      }
    }
  }

  /**
   * Show a custom confirmation modal
   */
  showConfirmationModal(title, message, icon, type, onConfirm) {
    const modalHTML = `
      <div class="confirmation-modal-backdrop">
        <div class="confirmation-modal">
          <div class="confirmation-modal-header">
            <div class="confirmation-icon ${type}">
              <i class="${icon}"></i>
            </div>
            <h3>${title}</h3>
          </div>
          <div class="confirmation-modal-body">
            <p>${message}</p>
          </div>
          <div class="confirmation-modal-footer">
            <button class="btn btn-outline" onclick="requestsManager.closeConfirmationModal()">
              <i class="ri-close-line"></i> Cancel
            </button>
            <button class="btn btn-${type}" onclick="requestsManager.confirmAction()">
              <i class="${icon}"></i> Confirm
            </button>
          </div>
        </div>
      </div>
    `;

    // Store the callback function
    this.pendingConfirmAction = onConfirm;

    // Add modal to the DOM
    const modalContainer = document.createElement('div');
    modalContainer.id = 'confirmationModalContainer';
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    // Add click outside to close
    const backdrop = modalContainer.querySelector('.confirmation-modal-backdrop');
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.closeConfirmationModal();
      }
    });

    // Add escape key to close
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeConfirmationModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Close the confirmation modal
   */
  closeConfirmationModal() {
    const modalContainer = document.getElementById('confirmationModalContainer');
    if (modalContainer) {
      document.body.removeChild(modalContainer);
    }
    this.pendingConfirmAction = null;
  }

  /**
   * Execute the pending confirmation action
   */
  async confirmAction() {
    if (this.pendingConfirmAction) {
      await this.pendingConfirmAction();
    }
    this.closeConfirmationModal();
  }

  /**
   * Show a toast notification
   */
  showToast(message, type = 'success') {
    // Use global showToast if available, otherwise fallback to local implementation
    if (window.showToast) {
      window.showToast(message, type);
      return;
    }
    
    // Fallback implementation (should rarely be used)
    const toast = document.createElement('div');
    toast.className = `notification ${type}`;
    toast.innerHTML = `
      <div class="notification-icon">
        <i class="${type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'}"></i>
      </div>
      <div class="notification-content">
        <div class="notification-message">${message}</div>
      </div>
      <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 5000);
  }

  /**
   * Show a toast and redirect after pay/checkout
   */
  showSuccessAndRedirect(message, redirectUrl) {
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
        window.location.href = redirectUrl;
      }, 400);
    }, 1800);
  }

  /**
   * Set up the profile dropdown in the navbar
   */
  setupProfileDropdown() {
    const token = localStorage.getItem("token");
    const userActions = document.querySelector(".user-actions");
    if (!userActions) return;
    if (token) {
      fetch("http://localhost:3000/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => response.json())
        .then((userData) => {
          userActions.innerHTML = `
            <div class="user-profile-dropdown">
              <button class="profile-button">
                ${userData.profileImage ? `<img src="${userData.profileImage}" alt="Profile" class="avatar-img">` : userData.firstName ? `<div class="avatar-initial">${userData.firstName[0]}</div>` : `<i class="ri-user-line profile-icon"></i>`}
                <span class="username">${userData.firstName || "Profile"}</span>
                <i class="ri-arrow-down-s-line"></i>
              </button>
              <div class="dropdown-menu">
                <a href="favorite.html"><i class="ri-heart-3-line"></i> My Favorites</a>
                <a href="./item.html"><i class="ri-shopping-bag-3-line"></i> My Items</a>
                <a href="my-orders.html"><i class="ri-shopping-cart-2-line"></i> My Orders</a>
                <a href="my-requests.html"><i class="ri-file-list-3-line"></i> Requests</a>
                <div class="dropdown-divider"></div>
                <a href="#" data-action="logout"><i class="ri-logout-box-r-line"></i> Logout</a>
              </div>
            </div>
          `;
          this.setupDropdownListeners();
        })
        .catch(() => {
          userActions.innerHTML = `<button class="btn btn-login" onclick="redirectToLogin()">Login</button><button class="btn btn-signup" onclick="redirectToSignup()">Sign Up</button>`;
        });
    } else {
      userActions.innerHTML = `<button class="btn btn-login" onclick="redirectToLogin()">Login</button><button class="btn btn-signup" onclick="redirectToSignup()">Sign Up</button>`;
    }
  }

  /**
   * Set up dropdown listeners
   */
  setupDropdownListeners() {
    const profileButton = document.querySelector(".profile-button");
    const dropdown = document.querySelector(".dropdown-menu");
    if (!profileButton || !dropdown) return;
    profileButton.addEventListener("click", function (e) {
      e.stopPropagation();
      dropdown.classList.toggle("show");
    });
    document.addEventListener("click", function (e) {
      if (!dropdown.contains(e.target) && !profileButton.contains(e.target)) {
        dropdown.classList.remove("show");
      }
    });
  }

  /**
   * Load existing renter ratings for the current user
   */
  async loadRenterRatings(requests) {
    const renterRatings = {};
    
    try {
      // Get unique renter IDs from completed requests
      const renterIds = [...new Set(
        requests
          .filter(request => request.status === 'completed' && request.renter)
          .map(request => request.renter._id)
      )];

      // Fetch ratings for each renter
      for (const renterId of renterIds) {
        try {
          const response = await fetch(`${this.baseUrl}/renter-ratings/renter/${renterId}`, {
            headers: {
              Authorization: `Bearer ${this.token}`,
            },
          });

          if (response.ok) {
            const ratingsData = await response.json();
            // Find rating by current user
            const currentUserId = this.getUserId();
            const userRating = ratingsData.data?.find(rating => rating.rater._id === currentUserId);
            if (userRating) {
              renterRatings[renterId] = userRating;
            }
          }
        } catch (error) {
          console.error(`Error fetching ratings for renter ${renterId}:`, error);
        }
      }
    } catch (error) {
      console.error("Error loading renter ratings:", error);
    }

    return renterRatings;
  }

  /**
   * Get current user ID
   */
  getUserId() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.id;
    } catch (error) {
      console.error("Error getting user ID:", error);
      return null;
    }
  }

  /**
   * View all ratings for a specific renter
   */
  async viewRenterRatings(renterId, renterName) {
    try {
      const response = await fetch(`${this.baseUrl}/renter-ratings/renter/${renterId}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch renter ratings");
      }

      const ratingsData = await response.json();
      
      this.showRenterRatingsModal(renterName, ratingsData);
      
    } catch (error) {
      console.error("Error fetching renter ratings:", error);
      this.showToast("Failed to load renter ratings", "error");
    }
  }

  /**
   * Show modal with all ratings for a renter
   */
  showRenterRatingsModal(renterName, ratingsData) {
    const ratings = ratingsData.data || [];
    const averageScore = ratings.length > 0 ? 
      (ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length).toFixed(1) : 
      'No ratings';

    let ratingsHTML = '';
    if (ratings.length === 0) {
      ratingsHTML = '<p class="no-ratings">No ratings available for this renter.</p>';
    } else {
      ratingsHTML = ratings.map(rating => {
        const ratingDate = new Date(rating.createdAt).toLocaleDateString();
        const raterName = `${rating.rater.firstName} ${rating.rater.lastName}`;
        
        return `
          <div class="rating-item">
            <div class="rating-header">
              <div class="rating-score">
                <div class="stars">
                  ${this.generateStarsHTML(rating.score)}
                </div>
                <span class="score-text">${rating.score}/5</span>
              </div>
              <div class="rating-date">${ratingDate}</div>
            </div>
            <div class="rating-details">
              <div class="rater-info">Rated by: <strong>${raterName}</strong></div>
              ${rating.communication ? `<div class="detail-rating">Communication: ${this.generateStarsHTML(rating.communication)} (${rating.communication}/5)</div>` : ''}
              ${rating.reliability ? `<div class="detail-rating">Reliability: ${this.generateStarsHTML(rating.reliability)} (${rating.reliability}/5)</div>` : ''}
              ${rating.itemCare ? `<div class="detail-rating">Item Care: ${this.generateStarsHTML(rating.itemCare)} (${rating.itemCare}/5)</div>` : ''}
              ${rating.timeliness ? `<div class="detail-rating">Timeliness: ${this.generateStarsHTML(rating.timeliness)} (${rating.timeliness}/5)</div>` : ''}
              ${rating.comment ? `<div class="rating-comment">"${rating.comment}"</div>` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    const modalHTML = `
      <div class="rating-modal-backdrop">
        <div class="rating-modal large">
          <div class="rating-modal-header">
            <h3>Ratings for ${renterName}</h3>
            <button class="close-btn" onclick="requestsManager.closeRenterRatingsModal()">×</button>
          </div>
          <div class="rating-modal-body">
            <div class="ratings-summary">
              <div class="average-rating">
                <span class="average-score">${averageScore}</span>
                <div class="average-stars">
                  ${typeof averageScore === 'number' ? this.generateStarsHTML(parseFloat(averageScore)) : ''}
                </div>
                <span class="total-ratings">(${ratings.length} rating${ratings.length !== 1 ? 's' : ''})</span>
              </div>
            </div>
            <div class="ratings-list">
              ${ratingsHTML}
            </div>
          </div>
          <div class="rating-modal-footer">
            <button class="btn btn-outline" onclick="requestsManager.closeRenterRatingsModal()">Close</button>
          </div>
        </div>
      </div>
    `;

    // Add modal to the DOM
    const modalContainer = document.createElement('div');
    modalContainer.id = 'renterRatingsModalContainer';
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
  }

  /**
   * Close the renter ratings modal
   */
  closeRenterRatingsModal() {
    const modalContainer = document.getElementById('renterRatingsModalContainer');
    if (modalContainer) {
      document.body.removeChild(modalContainer);
    }
  }

  /**
   * Edit an existing renter rating
   */
  async editRenterRating(ratingId, renterId, renterName) {
    try {
      // First, fetch the existing rating data
      const response = await fetch(`${this.baseUrl}/renter-ratings/renter/${renterId}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch rating data");
      }

      const ratingsData = await response.json();
      const currentUserId = this.getUserId();
      const existingRating = ratingsData.data?.find(rating => 
        rating._id === ratingId && rating.rater._id === currentUserId
      );

      if (!existingRating) {
        this.showToast("Rating not found or not authorized to edit", "error");
        return;
      }

      this.showEditRatingModal(ratingId, renterId, renterName, existingRating);
      
    } catch (error) {
      console.error("Error fetching rating for edit:", error);
      this.showToast("Failed to load rating for editing", "error");
    }
  }

  /**
   * Show edit rating modal with pre-filled data
   */
  showEditRatingModal(ratingId, renterId, renterName, existingRating) {
    const modalHTML = `
      <div class="rating-modal-backdrop">
        <div class="rating-modal">
          <div class="rating-modal-header">
            <h3>Edit Rating for ${renterName}</h3>
            <button class="close-btn" onclick="requestsManager.closeEditRatingModal()">×</button>
          </div>
          <div class="rating-modal-body">
            <p>Update your experience with <strong>${renterName}</strong>:</p>
            
            <!-- Overall Rating -->
            <div class="rating-group">
              <label>Overall Rating</label>
              <div class="star-rating" data-rating-type="overall" data-selected="${existingRating.score}">
                <i class="ri-star-${existingRating.score >= 1 ? 'fill' : 'line'}" data-rating="1"></i>
                <i class="ri-star-${existingRating.score >= 2 ? 'fill' : 'line'}" data-rating="2"></i>
                <i class="ri-star-${existingRating.score >= 3 ? 'fill' : 'line'}" data-rating="3"></i>
                <i class="ri-star-${existingRating.score >= 4 ? 'fill' : 'line'}" data-rating="4"></i>
                <i class="ri-star-${existingRating.score >= 5 ? 'fill' : 'line'}" data-rating="5"></i>
              </div>
            </div>

            <!-- Detailed Ratings -->
            <div class="detailed-ratings">
              <div class="rating-group">
                <label>Communication (Optional)</label>
                <div class="star-rating" data-rating-type="communication" data-selected="${existingRating.communication || 0}">
                  <i class="ri-star-${(existingRating.communication || 0) >= 1 ? 'fill' : 'line'}" data-rating="1"></i>
                  <i class="ri-star-${(existingRating.communication || 0) >= 2 ? 'fill' : 'line'}" data-rating="2"></i>
                  <i class="ri-star-${(existingRating.communication || 0) >= 3 ? 'fill' : 'line'}" data-rating="3"></i>
                  <i class="ri-star-${(existingRating.communication || 0) >= 4 ? 'fill' : 'line'}" data-rating="4"></i>
                  <i class="ri-star-${(existingRating.communication || 0) >= 5 ? 'fill' : 'line'}" data-rating="5"></i>
                </div>
              </div>

              <div class="rating-group">
                <label>Reliability (Optional)</label>
                <div class="star-rating" data-rating-type="reliability" data-selected="${existingRating.reliability || 0}">
                  <i class="ri-star-${(existingRating.reliability || 0) >= 1 ? 'fill' : 'line'}" data-rating="1"></i>
                  <i class="ri-star-${(existingRating.reliability || 0) >= 2 ? 'fill' : 'line'}" data-rating="2"></i>
                  <i class="ri-star-${(existingRating.reliability || 0) >= 3 ? 'fill' : 'line'}" data-rating="3"></i>
                  <i class="ri-star-${(existingRating.reliability || 0) >= 4 ? 'fill' : 'line'}" data-rating="4"></i>
                  <i class="ri-star-${(existingRating.reliability || 0) >= 5 ? 'fill' : 'line'}" data-rating="5"></i>
                </div>
              </div>

              <div class="rating-group">
                <label>Item Care (Optional)</label>
                <div class="star-rating" data-rating-type="itemCare" data-selected="${existingRating.itemCare || 0}">
                  <i class="ri-star-${(existingRating.itemCare || 0) >= 1 ? 'fill' : 'line'}" data-rating="1"></i>
                  <i class="ri-star-${(existingRating.itemCare || 0) >= 2 ? 'fill' : 'line'}" data-rating="2"></i>
                  <i class="ri-star-${(existingRating.itemCare || 0) >= 3 ? 'fill' : 'line'}" data-rating="3"></i>
                  <i class="ri-star-${(existingRating.itemCare || 0) >= 4 ? 'fill' : 'line'}" data-rating="4"></i>
                  <i class="ri-star-${(existingRating.itemCare || 0) >= 5 ? 'fill' : 'line'}" data-rating="5"></i>
                </div>
              </div>

              <div class="rating-group">
                <label>Timeliness (Optional)</label>
                <div class="star-rating" data-rating-type="timeliness" data-selected="${existingRating.timeliness || 0}">
                  <i class="ri-star-${(existingRating.timeliness || 0) >= 1 ? 'fill' : 'line'}" data-rating="1"></i>
                  <i class="ri-star-${(existingRating.timeliness || 0) >= 2 ? 'fill' : 'line'}" data-rating="2"></i>
                  <i class="ri-star-${(existingRating.timeliness || 0) >= 3 ? 'fill' : 'line'}" data-rating="3"></i>
                  <i class="ri-star-${(existingRating.timeliness || 0) >= 4 ? 'fill' : 'line'}" data-rating="4"></i>
                  <i class="ri-star-${(existingRating.timeliness || 0) >= 5 ? 'fill' : 'line'}" data-rating="5"></i>
                </div>
              </div>
            </div>

            <div class="comment-section">
              <label for="editRatingComment">Comment (Optional)</label>
              <textarea id="editRatingComment" placeholder="Share your experience with this renter (max 500 characters)" maxlength="500">${existingRating.comment || ''}</textarea>
              <div class="character-count">${(existingRating.comment || '').length}/500</div>
            </div>
          </div>
          <div class="rating-modal-footer">
            <button class="btn btn-outline" onclick="requestsManager.closeEditRatingModal()">Cancel</button>
            <button class="btn btn-danger" onclick="requestsManager.deleteRenterRating('${ratingId}')">Delete Rating</button>
            <button class="btn btn-primary" onclick="requestsManager.updateRenterRating('${ratingId}')">Update Rating</button>
          </div>
        </div>
      </div>
    `;

    // Add modal to the DOM
    const modalContainer = document.createElement('div');
    modalContainer.id = 'editRatingModalContainer';
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    // Set up star rating functionality for all rating types
    const allStarRatings = document.querySelectorAll('.star-rating');
    allStarRatings.forEach(starRating => {
      const stars = starRating.querySelectorAll('i');
      
      stars.forEach(star => {
        star.addEventListener('click', () => {
          const rating = parseInt(star.getAttribute('data-rating'));
          this.setStarRating(starRating, rating);
        });

        star.addEventListener('mouseover', () => {
          const rating = parseInt(star.getAttribute('data-rating'));
          this.highlightStars(starRating, rating);
        });

        star.addEventListener('mouseout', () => {
          const selectedRating = starRating.getAttribute('data-selected') || 0;
          this.highlightStars(starRating, parseInt(selectedRating));
        });
      });
    });

    // Character counter for comment
    const commentTextarea = document.getElementById('editRatingComment');
    const characterCount = document.querySelector('.character-count');
    
    commentTextarea.addEventListener('input', () => {
      const count = commentTextarea.value.length;
      characterCount.textContent = `${count}/500`;
      
      if (count > 450) {
        characterCount.style.color = '#ff6b6b';
      } else {
        characterCount.style.color = '#666';
      }
    });
  }

  /**
   * Close the edit rating modal
   */
  closeEditRatingModal() {
    const modalContainer = document.getElementById('editRatingModalContainer');
    if (modalContainer) {
      document.body.removeChild(modalContainer);
    }
  }

  /**
   * Update an existing renter rating
   */
  async updateRenterRating(ratingId) {
    // Get all rating values
    const overallRating = parseInt(document.querySelector('[data-rating-type="overall"]').getAttribute('data-selected') || 0);
    const communicationRating = parseInt(document.querySelector('[data-rating-type="communication"]').getAttribute('data-selected') || 0);
    const reliabilityRating = parseInt(document.querySelector('[data-rating-type="reliability"]').getAttribute('data-selected') || 0);
    const itemCareRating = parseInt(document.querySelector('[data-rating-type="itemCare"]').getAttribute('data-selected') || 0);
    const timelinessRating = parseInt(document.querySelector('[data-rating-type="timeliness"]').getAttribute('data-selected') || 0);
    const comment = document.getElementById('editRatingComment').value.trim();

    // Validate required overall rating
    if (!overallRating) {
      this.showToast("Please select an overall rating", "error");
      return;
    }

    try {
      // Prepare request body according to API specification
      const requestBody = {
        score: overallRating,
      };

      // Add optional fields only if they have values
      if (comment) {
        requestBody.comment = comment;
      }
      if (communicationRating > 0) {
        requestBody.communication = communicationRating;
      }
      if (reliabilityRating > 0) {
        requestBody.reliability = reliabilityRating;
      }
      if (itemCareRating > 0) {
        requestBody.itemCare = itemCareRating;
      }
      if (timelinessRating > 0) {
        requestBody.timeliness = timelinessRating;
      }

      const response = await fetch(`${this.baseUrl}/renter-ratings/${ratingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to update rating");
      }

      this.closeEditRatingModal();
      this.showToast("Rating updated successfully!", "success");
      
      // Refresh the requests to show updated state
      this.loadOwnerRequests();
      
    } catch (error) {
      console.error("Error updating rating:", error);
      this.showToast(error.message || "Failed to update rating. Please try again.", "error");
    }
  }

  /**
   * Delete a renter rating
   */
  async deleteRenterRating(ratingId) {
    if (!confirm("Are you sure you want to delete this rating? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/renter-ratings/${ratingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to delete rating");
      }

      this.closeEditRatingModal();
      this.showToast("Rating deleted successfully!", "success");
      
      // Refresh the requests to show updated state
      this.loadOwnerRequests();
      
    } catch (error) {
      console.error("Error deleting rating:", error);
      this.showToast(error.message || "Failed to delete rating. Please try again.", "error");
    }
  }

  /**
   * Generate HTML for star display
   */
  generateStarsHTML(rating) {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        starsHTML += '<i class="ri-star-fill"></i>';
      } else {
        starsHTML += '<i class="ri-star-line"></i>';
      }
    }
    return starsHTML;
  }

  /**
   * Load overall renter ratings (from all users) for decision making
   */
  async loadRenterOverallRatings(requests) {
    const renterOverallRatings = {};
    
    try {
      // Get unique renter IDs from all requests
      const renterIds = [...new Set(
        requests
          .filter(request => request.user)
          .map(request => request.user._id)
      )];

      // Fetch overall ratings for each renter
      for (const renterId of renterIds) {
        try {
          const response = await fetch(`${this.baseUrl}/renter-ratings/renter/${renterId}`, {
            headers: {
              Authorization: `Bearer ${this.token}`,
            },
          });

          if (response.ok) {
            const ratingsData = await response.json();
            if (ratingsData.data && ratingsData.data.length > 0) {
              // Calculate overall statistics
              const ratings = ratingsData.data;
              const averageScore = ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length;
              const totalRatings = ratings.length;
              
              // Calculate category averages
              const categoryAverages = {
                communication: this.calculateCategoryAverage(ratings, 'communication'),
                reliability: this.calculateCategoryAverage(ratings, 'reliability'),
                itemCare: this.calculateCategoryAverage(ratings, 'itemCare'),
                timeliness: this.calculateCategoryAverage(ratings, 'timeliness')
              };
              
              renterOverallRatings[renterId] = {
                averageScore: averageScore,
                totalRatings: totalRatings,
                categoryAverages: categoryAverages,
                recentRatings: ratings.slice(0, 3) // Get 3 most recent ratings
              };
            }
          }
        } catch (error) {
          console.error(`Error fetching overall ratings for renter ${renterId}:`, error);
        }
      }
    } catch (error) {
      console.error("Error loading renter overall ratings:", error);
    }

    return renterOverallRatings;
  }

  /**
   * Calculate average for a specific rating category
   */
  calculateCategoryAverage(ratings, category) {
    const categoryRatings = ratings.filter(rating => rating[category] && rating[category] > 0);
    if (categoryRatings.length === 0) return null;
    
    return categoryRatings.reduce((sum, rating) => sum + rating[category], 0) / categoryRatings.length;
  }

  /**
   * Generate renter rating display for decision making
   */
  generateRenterRatingDisplay(renterId, firstName, lastName, overallRating, requestStatus) {
    const renterName = `${firstName} ${lastName}`;
    
    if (!overallRating) {
      return `
        <div class="renter-rating-info ${requestStatus === 'pending' ? 'pending-highlight' : ''}">
          <div class="renter-rating-header">
            <i class="ri-user-star-line"></i>
            <span class="rating-label">Renter Rating</span>
          </div>
          <div class="no-rating-info">
            <span class="no-rating-text">No ratings yet</span>
            <span class="new-renter-badge">New Renter</span>
          </div>
        </div>
      `;
    }

    const averageScore = overallRating.averageScore.toFixed(1);
    const totalRatings = overallRating.totalRatings;
    const isHighlyRated = overallRating.averageScore >= 4.5;
    const isGoodRated = overallRating.averageScore >= 4.0;
    
    return `
      <div class="renter-rating-info ${requestStatus === 'pending' ? 'pending-highlight' : ''} ${isHighlyRated ? 'highly-rated' : isGoodRated ? 'good-rated' : ''}">
        <div class="renter-rating-header">
          <i class="ri-user-star-line"></i>
          <span class="rating-label">Renter Rating</span>
          ${isHighlyRated ? '<span class="trusted-badge">✓ Trusted Renter</span>' : ''}
        </div>
        <div class="rating-summary">
          <div class="rating-score-display">
            <div class="stars-display">
              ${this.generateStarsHTML(overallRating.averageScore)}
            </div>
            <span class="score-number">${averageScore}/5</span>
            <span class="rating-count">(${totalRatings} rating${totalRatings !== 1 ? 's' : ''})</span>
          </div>
          
          ${overallRating.categoryAverages && Object.values(overallRating.categoryAverages).some(avg => avg !== null) ? `
          <div class="category-breakdown">
            ${overallRating.categoryAverages.communication ? `<span class="category-item">Communication: ${overallRating.categoryAverages.communication.toFixed(1)}/5</span>` : ''}
            ${overallRating.categoryAverages.reliability ? `<span class="category-item">Reliability: ${overallRating.categoryAverages.reliability.toFixed(1)}/5</span>` : ''}
            ${overallRating.categoryAverages.itemCare ? `<span class="category-item">Item Care: ${overallRating.categoryAverages.itemCare.toFixed(1)}/5</span>` : ''}
            ${overallRating.categoryAverages.timeliness ? `<span class="category-item">Timeliness: ${overallRating.categoryAverages.timeliness.toFixed(1)}/5</span>` : ''}
          </div>
          ` : ''}
        </div>
        
        <div class="rating-actions">
          <button class="btn btn-sm btn-link" onclick="requestsManager.viewRenterRatings('${renterId}', '${renterName}')">
            <i class="ri-eye-line"></i> View All Reviews
          </button>
        </div>
      </div>
    `;
  }
}

// Initialize the requests manager when the page loads
document.addEventListener("DOMContentLoaded", () => {
  window.requestsManager = new RequestsManager();
});

// Toast styles are now handled by the global toast-notifications.css file
