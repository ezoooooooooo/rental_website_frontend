/**
 * Notifications Manager to handle user notifications
 */
class NotificationsManager {
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");
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
      this.updateNotificationBadge(notifications.filter((n) => !n.read).length);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  }

  /**
   * Update the notification badge in the navbar
   */
  updateNotificationBadge(count) {
    const notificationBadge = document.querySelector(".notification-badge");
    if (notificationBadge) {
      if (count > 0) {
        notificationBadge.textContent = count;
        notificationBadge.style.display = "flex";
      } else {
        notificationBadge.style.display = "none";
      }
    }
  }
}

/**
 * Handle displaying and managing user orders
 */
class OrdersManager {
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");
    this.userId = localStorage.getItem("userId");
    this.ordersList = document.getElementById("ordersList");
    this.loadingIndicator = document.getElementById("loadingIndicator");
    this.emptyState = document.getElementById("emptyState");
    this.errorState = document.getElementById("errorState");
    this.retryButton = document.getElementById("retryButton");
    this.notificationsManager = new NotificationsManager();

    this.initOrdersPage();
  }

  /**
   * Initialize the orders page
   */
  async initOrdersPage() {
    if (!this.token) {
      window.location.href = "login.html";
      return;
    }

    try {
      this.showLoading();
      await this.loadUserOrders();
      await this.notificationsManager.loadNotifications();
      this.setupProfileDropdown();
    } catch (error) {
      console.error("Error initializing orders page:", error);
      this.showError();
    }
  }

  /**
   * Load and display user orders
   */
  async loadUserOrders() {
    try {
      const response = await fetch(`${this.baseUrl}/orders/my-orders`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const orders = await response.json();

      if (orders.length === 0) {
        this.showEmptyState();
        return;
      }

      this.displayOrders(orders);
    } catch (error) {
      console.error("Error loading orders:", error);
      this.showError();
    }
  }

  displayOrders(orders) {
    this.ordersList.innerHTML = "";

    // Sort orders by date (newest first)
    const sortedOrders = orders.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    sortedOrders.forEach((order) => {
      const card = document.createElement("div");
      card.className = "order-card";
      const statusText = this.getStatusText(order.status);
      const statusIcon = this.getStatusIcon(order.status);
      const statusClass = `status-${order.status.toLowerCase()}`;
      let imagesHTML = "";
      if (order.listing && order.listing.images && order.listing.images.length > 0) {
        imagesHTML = order.listing.images.map(
          (imgUrl, idx) => `<img src="${typeof imgUrl === 'string' ? imgUrl : imgUrl.url}" alt="Listing image" class="order-img-thumb" data-img-idx="${idx}" data-order-id="${order._id}" onerror="this.onerror=null; this.src='https://via.placeholder.com/120';}" />`
        ).join("");
      } else {
        imagesHTML = `<img src="https://via.placeholder.com/120" alt="No image" class="order-img-thumb" data-img-idx="0" data-order-id="${order._id}" />`;
      }
      
      // Format dates nicely
      const createdDate = new Date(order.createdAt);
      const formattedCreatedDate = createdDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      
      const startDate = new Date(order.startDate);
      const endDate = new Date(order.endDate);
      const formattedStartDate = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const formattedEndDate = endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      
      // Calculate rental duration
      const rentalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      // Cancel button only for pending orders
      const cancelButton = order.status === "pending" ? `<button class="btn btn-danger cancel-order-btn" data-order-id="${order._id}"><i class="ri-close-line"></i> Cancel Order</button>` : "";
      
      // Rate button only for completed/approved orders with completed payment
      const rateButton = (order.status === "completed" || order.status === "approved") && order.paymentStatus === "completed" ? 
        `<button class="btn btn-primary rate-item-btn" data-listing-id="${order.listing?._id || ''}" onclick="window.location.href='item-detail.html?id=${order.listing?._id || ''}&scrollToRating=true'"><i class="ri-star-line"></i> Rate This Item</button>` : "";
      
      // View details button for all orders
      const viewDetailsButton = `<button class="btn btn-outline" onclick="window.location.href='item-detail.html?id=${order.listing?._id || ''}';"><i class="ri-eye-line"></i> View Item</button>`;
      
      card.innerHTML = `
        <div class="order-header">
          <div class="order-info">
            <h3 class="order-title">${order.listing?.name || "Item"}</h3>
            <div class="order-meta">
              <span><i class="ri-calendar-line"></i> ${formattedCreatedDate}</span>
              <span><i class="ri-file-list-line"></i> Order #${order._id.substring(0, 8)}</span>
            </div>
          </div>
          <div class="order-status ${statusClass}">${statusIcon} ${statusText}</div>
        </div>
        <div class="order-body">
          <div class="order-images">${imagesHTML}</div>
          <div class="order-details">
            <div class="order-info-row">
              <i class="ri-calendar-event-line"></i>
              <span class="order-date">${formattedStartDate} - ${formattedEndDate}</span>
              <span class="order-duration">(${rentalDays} day${rentalDays !== 1 ? 's' : ''})</span>
            </div>
            <div class="order-info-row">
              <i class="ri-money-dollar-circle-line"></i>
              <span class="order-price">$${order.totalPrice ? order.totalPrice.toFixed(2) : "0.00"}</span>
            </div>
            <div class="order-info-row">
              <i class="ri-user-line"></i>
              <span>Owner: ${order.owner?.firstName ? order.owner.firstName + ' ' + order.owner.lastName : order.owner?.username || 'Unknown'}</span>
            </div>
          </div>
          <div class="order-actions">
            ${viewDetailsButton}
            ${cancelButton}
            ${rateButton}
          </div>
        </div>
      `;
      this.ordersList.appendChild(card);
    });
    // Attach cancel button listeners
    this.attachCancelListeners();
    this.hideLoading();
  }

  attachCancelListeners() {
    const cancelButtons = document.querySelectorAll('.cancel-order-btn');
    const rateButtons = document.querySelectorAll('.rate-item-btn');
    
    // Add event listeners to rate buttons
    rateButtons.forEach(btn => {
      // We're now handling this with direct onclick in the HTML
      // The button now redirects to item-detail.html with scrollToRating=true
    });
    cancelButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = btn.getAttribute('data-order-id');
        this.cancelOrder(orderId);
      });
    });
  }

  cancelOrder(orderId) {
    const token = localStorage.getItem('token');
    fetch(`http://localhost:3000/api/orders/${orderId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status: "cancelled" })
    })
      .then(res => res.json())
      .then(data => {
        this.showToast('Order cancelled successfully', 'success');
        this.loadUserOrders();
      })
      .catch(err => {
        this.showToast('Failed to cancel order', 'error');
      });
  }

  /**
   * Get the appropriate CSS class for an order status
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
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  }

  /**
   * Get the display text for an order status
   */
  getStatusText(status) {
    switch (status) {
      case 'pending':
        return 'Pending Approval';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Processing';
    }
  }
  
  /**
   * Get the icon for an order status
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
      case 'cancelled':
        return '<i class="ri-indeterminate-circle-line"></i>';
      default:
        return '<i class="ri-question-line"></i>';
    }
  }

  /**
   * Get the appropriate action buttons based on order status
   */
  getOrderActions(order) {
    let buttons = "";

    if (order.status === "pending") {
      buttons += `
        <button class="btn btn-sm btn-outline cancel-order" data-order-id="${order._id}">
          <i class="fas fa-times"></i> Cancel Order
        </button>
      `;
    }

    if (order.status === "completed" && !order.rating) {
      buttons += `
        <button class="btn btn-sm btn-primary submit-rating" data-order-id="${order._id}" data-listing-id="${order.listing._id}">
          <i class="fas fa-star"></i> Rate this item
        </button>
      `;
    }

    buttons += `
      <button class="btn btn-sm btn-outline view-details" data-order-id="${order._id}">
        <i class="fas fa-eye"></i> View Details
      </button>
    `;

    return buttons;
  }

  /**
   * Set up event listeners for order action buttons
   */
  attachEventListeners(card, order) {
    const cancelButton = card.querySelector(".cancel-order");
    if (cancelButton) {
      cancelButton.addEventListener("click", () => this.cancelOrder(order._id));
    }

    const ratingButton = card.querySelector(".submit-rating");
    if (ratingButton) {
      ratingButton.addEventListener("click", () => this.showRatingModal(order));
    }

    const viewDetailsButton = card.querySelector(".view-details");
    if (viewDetailsButton) {
      viewDetailsButton.addEventListener("click", () =>
        this.viewOrderDetails(order._id)
      );
    }
  }

  /**
   * Cancel a pending order
   */
  async cancelOrder(orderId) {
    this.showConfirmationModal(
      "Cancel Order",
      "Are you sure you want to cancel this order? This action cannot be undone.",
      "ri-close-line",
      "error",
      async () => {
        try {
          const response = await fetch(`${this.baseUrl}/orders/${orderId}/cancel`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.token}`,
            },
          });

          if (!response.ok) {
            throw new Error("Failed to cancel order");
          }

          // Reload orders to reflect changes
          await this.loadUserOrders();

          // Show success message
          this.showNotification("Order cancelled successfully", "success");
        } catch (error) {
          console.error("Error cancelling order:", error);
          this.showNotification(
            "Failed to cancel order. Please try again.",
            "error"
          );
        }
      }
    );
  }

  /**
   * Show the rating modal for a completed order
   */
  showRatingModal(order) {
    const modal = document.createElement("div");
    modal.className = "rating-modal";
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Rate ${order.listing.name || "Item"}</h3>
        <div class="rating-stars">
          ${Array(5)
            .fill()
            .map(
              (_, i) => `
            <i class="fas fa-star" data-rating="${i + 1}"></i>
          `
            )
            .join("")}
        </div>
        <textarea placeholder="Write a review (optional)" class="review-text"></textarea>
        <div class="modal-actions">
          <button class="btn btn-outline cancel-rating">Cancel</button>
          <button class="btn btn-primary submit-rating">Submit Rating</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    let selectedRating = 0;
    const stars = modal.querySelectorAll(".fa-star");

    stars.forEach((star) => {
      star.addEventListener("click", () => {
        const rating = parseInt(star.dataset.rating);
        selectedRating = rating;
        stars.forEach((s, i) => {
          s.classList.toggle("active", i < rating);
        });
      });
    });

    modal.querySelector(".cancel-rating").addEventListener("click", () => {
      modal.remove();
    });

    modal
      .querySelector(".submit-rating")
      .addEventListener("click", async () => {
        if (selectedRating === 0) {
          this.showNotification("Please select a rating", "error");
          return;
        }

        const reviewText = modal.querySelector(".review-text").value;

        try {
          await this.submitRating(
            order._id,
            order.listing._id,
            selectedRating,
            reviewText
          );
          modal.remove();
          await this.loadUserOrders();
          this.showNotification("Rating submitted successfully", "success");
        } catch (error) {
          console.error("Error submitting rating:", error);
          this.showNotification("Failed to submit rating", "error");
        }
      });
  }

  /**
   * Submit a rating for an order
   */
  async submitRating(orderId, listingId, rating, review) {
    const response = await fetch(`${this.baseUrl}/ratings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        orderId,
        listingId,
        rating,
        review,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to submit rating");
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
            <button class="btn btn-outline" onclick="ordersManager.closeConfirmationModal()">
              <i class="ri-close-line"></i> Cancel
            </button>
            <button class="btn btn-${type}" onclick="ordersManager.confirmAction()">
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
  showToast(message, type = "success") {
    // Use global showToast if available, otherwise fallback to local implementation
    if (window.showToast) {
      window.showToast(message, type);
      return;
    }
    
    // Fallback implementation (should rarely be used)
    const toast = document.createElement("div");
    toast.className = `notification ${type}`;
    toast.innerHTML = `
      <div class="notification-icon">
        <i class="${type === "success" ? "ri-check-line" : "ri-error-warning-line"}"></i>
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

  showLoading() {
    this.loadingIndicator.style.display = "block";
    this.ordersList.style.display = "none";
    this.emptyState.style.display = "none";
    this.errorState.style.display = "none";
  }

  hideLoading() {
    this.loadingIndicator.style.display = "none";
    this.ordersList.style.display = "block";
  }

  showEmptyState() {
    this.loadingIndicator.style.display = "none";
    this.ordersList.style.display = "none";
    this.emptyState.style.display = "block";
    this.errorState.style.display = "none";
  }

  showError() {
    this.loadingIndicator.style.display = "none";
    this.ordersList.style.display = "none";
    this.emptyState.style.display = "none";
    this.errorState.style.display = "block";
  }

  showNotification(message, type = "info") {
    // Use global showToast if available, otherwise fallback to local implementation
    if (window.showToast) {
      window.showToast(message, type);
      return;
    }
    
    // Fallback implementation (should rarely be used)
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-icon">
        <i class="${type === 'success' ? 'ri-check-line' : type === 'error' ? 'ri-error-warning-line' : 'ri-information-line'}"></i>
      </div>
      <div class="notification-content">
        <div class="notification-message">${message}</div>
      </div>
      <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  viewOrderDetails(orderId) {
    window.location.href = `/order-details.html?id=${orderId}`;
  }
}

// Initialize the orders manager when the page loads
document.addEventListener("DOMContentLoaded", () => {
  window.ordersManager = new OrdersManager();
});

// We're now using the global toast notification system from nav-utils.js
