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
    const requestsContainer = document.getElementById("requestsContainer");
    if (!requestsContainer) return;

    try {
      const response = await fetch(`${this.baseUrl}/orders/owner-orders`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch rental requests");
      }

      const requests = await response.json();
      
      if (requests.length === 0) {
        requestsContainer.innerHTML = `
          <div class="empty-state">
            <i class="ri-inbox-line" style="font-size: 48px; color: #cbd5e0;"></i>
            <h3>No rental requests</h3>
            <p>You don't have any rental requests for your items yet.</p>
            <a href="item.html" class="btn btn-primary">Manage Your Items</a>
          </div>
        `;
        return;
      }

      // Sort requests by date (newest first)
      requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      requestsContainer.innerHTML = "";
      requests.forEach((request) => {
        const card = document.createElement("div");
        card.className = "request-card";
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
        
        let imagesHTML = '';
        if (listing.images && listing.images.length > 0) {
          imagesHTML = listing.images.map(
            (imgUrl, idx) => `<img src="${typeof imgUrl === 'string' ? imgUrl : imgUrl.url}" alt="Listing image" class="request-img-thumb" data-img-idx="${idx}" data-request-id="${request._id}" onerror="this.onerror=null; this.src='https://via.placeholder.com/120';}" />`
          ).join('');
        } else {
          imagesHTML = `<img src="https://via.placeholder.com/120" alt="No image" class="request-img-thumb" data-img-idx="0" data-request-id="${request._id}" />`;
        }
        
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
                <span class="detail-value"><span class="request-price">$${request.totalPrice ? request.totalPrice.toFixed(2) : '0.00'}</span></span>
              </div>
              <div class="detail-row">
                <span class="detail-label"><i class="ri-user-line"></i> Requested By:</span>
                <span class="detail-value">${renter.firstName || ''} ${renter.lastName || ''}</span>
              </div>
              ${request.status === 'completed' ? `
              <div class="rating-section">
                <button class="btn btn-sm btn-outline" onclick="requestsManager.showRatingModal('${request._id}', '${renter._id}', '${renter.firstName} ${renter.lastName}')">
                  <i class="ri-star-line"></i> Rate this renter
                </button>
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
      
    } catch (error) {
      console.error("Error loading rental requests:", error);
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
          <div class="action-buttons" style="display: flex; gap: 15px; justify-content: flex-end;">
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
          <a href="listing-details.html?id=${request.listing._id}" class="btn btn-sm btn-outline">
            <i class="ri-eye-line"></i> View Item
          </a>
        `;
      case 'completed':
        return `
          <a href="listing-details.html?id=${request.listing._id}" class="btn btn-sm btn-outline">
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
    if (!confirm("Are you sure you want to approve this rental request?")) {
      return;
    }

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
      this.showToast("Request approved successfully");
      
    } catch (error) {
      console.error("Error approving request:", error);
      this.showToast("Failed to approve request. Please try again.", "error");
    }
  }

  /**
   * Reject a rental request
   */
  async rejectRequest(requestId) {
    // Show confirmation dialog before rejecting
    if (confirm('Are you sure you want to reject this rental request?')) {
      const token = localStorage.getItem('token');
      fetch(`${this.baseUrl}/orders/${requestId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: "rejected" })
      })
        .then(res => res.json())
        .then(data => {
          this.showToast('Request rejected successfully', 'success');
          this.loadOwnerRequests();
        })
        .catch(err => {
          this.showToast('Failed to reject request', 'error');
        });
    }
  }

  /**
   * Mark a rental as completed
   */
  async completeRequest(requestId) {
    if (!confirm("Are you sure you want to mark this rental as completed?")) {
      return;
    }

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
      this.showToast("Rental marked as completed successfully");
      
    } catch (error) {
      console.error("Error completing request:", error);
      this.showToast("Failed to complete request. Please try again.", "error");
    }
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
            <div class="star-rating">
              <i class="ri-star-line" data-rating="1"></i>
              <i class="ri-star-line" data-rating="2"></i>
              <i class="ri-star-line" data-rating="3"></i>
              <i class="ri-star-line" data-rating="4"></i>
              <i class="ri-star-line" data-rating="5"></i>
            </div>
            <textarea id="ratingComment" placeholder="Share your experience (optional)"></textarea>
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

    // Set up star rating functionality
    const stars = document.querySelectorAll('.star-rating i');
    stars.forEach(star => {
      star.addEventListener('click', () => {
        const rating = parseInt(star.getAttribute('data-rating'));
        this.setStarRating(rating);
      });

      star.addEventListener('mouseover', () => {
        const rating = parseInt(star.getAttribute('data-rating'));
        this.highlightStars(rating);
      });

      star.addEventListener('mouseout', () => {
        const selectedRating = document.querySelector('.star-rating').getAttribute('data-selected') || 0;
        this.highlightStars(parseInt(selectedRating));
      });
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
  setStarRating(rating) {
    const starContainer = document.querySelector('.star-rating');
    starContainer.setAttribute('data-selected', rating);
    this.highlightStars(rating);
  }

  /**
   * Highlight stars up to the specified rating
   */
  highlightStars(rating) {
    const stars = document.querySelectorAll('.star-rating i');
    stars.forEach(star => {
      const starRating = parseInt(star.getAttribute('data-rating'));
      if (starRating <= rating) {
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
    const starContainer = document.querySelector('.star-rating');
    const rating = parseInt(starContainer.getAttribute('data-selected') || 0);
    const comment = document.getElementById('ratingComment').value;

    if (!rating) {
      alert("Please select a rating");
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/owner-ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          userId: renterId,
          orderId: requestId,
          rating,
          comment
        })
      });

      if (!response.ok) {
        throw new Error("Failed to submit rating");
      }

      this.closeRatingModal();
      this.showToast("Rating submitted successfully");
      
    } catch (error) {
      console.error("Error submitting rating:", error);
      this.showToast("Failed to submit rating. Please try again.", "error");
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
   * Show a toast notification
   */
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <i class="${type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'}"></i>
        <span>${message}</span>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
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
}

// Initialize the requests manager when the page loads
document.addEventListener("DOMContentLoaded", () => {
  window.requestsManager = new RequestsManager();
});

// --- Toast CSS for popout messages ---
const toastStyle = document.createElement('style');
toastStyle.innerHTML = `
.custom-toast {
  position: fixed;
  top: 32px;
  left: 50%;
  transform: translateX(-50%) scale(0.97);
  background: linear-gradient(135deg, #6c5ce7, #9982b1);
  color: #fff;
  padding: 18px 36px;
  border-radius: 14px;
  font-size: 1.2rem;
  font-weight: 600;
  opacity: 0;
  z-index: 9999;
  box-shadow: 0 4px 32px rgba(44,62,80,0.15);
  transition: opacity 0.3s, transform 0.3s;
  pointer-events: none;
}
.custom-toast.show {
  opacity: 1;
  transform: translateX(-50%) scale(1.02);
}
`;
document.head.appendChild(toastStyle);
