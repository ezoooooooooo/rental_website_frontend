/**
 * Handle displaying and managing user notifications
 */
class NotificationsManager {
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");
    this.userId = localStorage.getItem("userId");

    this.initNotificationsPage();
  }

  /**
   * Initialize the notifications page
   */
  initNotificationsPage() {
    if (!this.token) {
      window.location.href = "login.html";
      return;
    }

    this.loadNotifications();
    this.setupProfileDropdown();
    this.setupMarkAllReadButton();
  }

  /**
   * Load and display user notifications
   */
  async loadNotifications() {
    const notificationsContainer = document.getElementById("notificationsContainer");
    if (!notificationsContainer) return;

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
      
      if (notifications.length === 0) {
        notificationsContainer.innerHTML = `
          <div class="empty-notifications">
            <i class="ri-notification-line"></i>
            <h3>No notifications</h3>
            <p>You don't have any notifications yet.</p>
          </div>
        `;
        
        // Hide the mark all as read button
        const markAllReadBtn = document.getElementById("markAllReadBtn");
        if (markAllReadBtn) {
          markAllReadBtn.style.display = "none";
        }
        
        return;
      }

      // Sort notifications by date (newest first)
      notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      let notificationsHTML = "";
      notifications.forEach((notification) => {
        const isUnread = !notification.read;
        const notificationTime = this.formatNotificationTime(notification.createdAt);
        const typeClass = `notification-type-${notification.type}`;
        const typeText = this.getNotificationTypeText(notification.type);
        
        notificationsHTML += `
          <div class="notification-card ${isUnread ? 'unread' : ''}" data-notification-id="${notification._id}">
            ${isUnread ? '<div class="unread-badge"></div>' : ''}
            <div class="notification-header">
              <span class="notification-type ${typeClass}">${typeText}</span>
              <span class="notification-time">${notificationTime}</span>
            </div>
            <div class="notification-content">
              <p>${notification.message}</p>
            </div>
            <div class="notification-actions">
              ${notification.order ? `
                <button onclick="notificationsManager.viewOrder('${notification.order}')">
                  <i class="ri-eye-line"></i> View Details
                </button>
              ` : ''}
              ${isUnread ? `
                <button onclick="notificationsManager.markAsRead('${notification._id}')">
                  <i class="ri-check-line"></i> Mark as Read
                </button>
              ` : ''}
              <button onclick="notificationsManager.deleteNotification('${notification._id}')">
                <i class="ri-delete-bin-line"></i> Delete
              </button>
            </div>
          </div>
        `;
      });

      notificationsContainer.innerHTML = notificationsHTML;
      
    } catch (error) {
      console.error("Error loading notifications:", error);
      notificationsContainer.innerHTML = `
        <div class="error-state">
          <i class="ri-error-warning-line"></i>
          <p>Failed to load notifications. Please try again later.</p>
          <button class="btn btn-sm btn-outline" onclick="notificationsManager.loadNotifications()">Retry</button>
        </div>
      `;
    }
  }

  /**
   * Format notification time to a user-friendly string
   */
  formatNotificationTime(timestamp) {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - notificationTime) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
    
    return notificationTime.toLocaleDateString();
  }

  /**
   * Get user-friendly text for notification type
   */
  getNotificationTypeText(type) {
    switch (type) {
      case 'order_request':
        return 'New Request';
      case 'order_approved':
        return 'Approved';
      case 'order_rejected':
        return 'Rejected';
      case 'order_completed':
        return 'Completed';
      default:
        return 'Notification';
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId) {
    try {
      const response = await fetch(`${this.baseUrl}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }

      // Update UI without reloading
      const notificationCard = document.querySelector(`.notification-card[data-notification-id="${notificationId}"]`);
      if (notificationCard) {
        notificationCard.classList.remove('unread');
        const unreadBadge = notificationCard.querySelector('.unread-badge');
        if (unreadBadge) {
          unreadBadge.remove();
        }
        
        const markAsReadBtn = notificationCard.querySelector('button[onclick*="markAsRead"]');
        if (markAsReadBtn) {
          markAsReadBtn.remove();
        }
      }
      
      this.showToast("Notification marked as read");
      
    } catch (error) {
      console.error("Error marking notification as read:", error);
      this.showToast("Failed to mark notification as read", "error");
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      const response = await fetch(`${this.baseUrl}/notifications/mark-all-read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }

      // Reload notifications to reflect changes
      this.loadNotifications();
      
      this.showToast("All notifications marked as read");
      
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      this.showToast("Failed to mark all notifications as read", "error");
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId) {
    if (!confirm("Are you sure you want to delete this notification?")) {
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }

      // Remove the notification card from the UI
      const notificationCard = document.querySelector(`.notification-card[data-notification-id="${notificationId}"]`);
      if (notificationCard) {
        notificationCard.remove();
      }
      
      // Check if there are any notifications left
      const notificationsContainer = document.getElementById("notificationsContainer");
      if (notificationsContainer && notificationsContainer.children.length === 0) {
        notificationsContainer.innerHTML = `
          <div class="empty-notifications">
            <i class="ri-notification-line"></i>
            <h3>No notifications</h3>
            <p>You don't have any notifications yet.</p>
          </div>
        `;
        
        // Hide the mark all as read button
        const markAllReadBtn = document.getElementById("markAllReadBtn");
        if (markAllReadBtn) {
          markAllReadBtn.style.display = "none";
        }
      }
      
      this.showToast("Notification deleted");
      
    } catch (error) {
      console.error("Error deleting notification:", error);
      this.showToast("Failed to delete notification", "error");
    }
  }

  /**
   * View the order associated with a notification
   */
  viewOrder(orderId) {
    // Check if the user is the owner or renter of the order
    fetch(`${this.baseUrl}/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })
      .then(response => response.json())
      .then(order => {
        if (order.owner && order.owner._id === this.userId) {
          // User is the owner, redirect to requests page
          window.location.href = "my-requests.html";
        } else {
          // User is the renter, redirect to orders page
          window.location.href = "my-orders.html";
        }
      })
      .catch(error => {
        console.error("Error fetching order details:", error);
        // Default to orders page if there's an error
        window.location.href = "my-orders.html";
      });
  }

  /**
   * Set up the mark all as read button
   */
  setupMarkAllReadButton() {
    const markAllReadBtn = document.getElementById("markAllReadBtn");
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener("click", () => {
        this.markAllAsRead();
      });
    }
  }

  /**
   * Set up the profile dropdown in the navbar
   */
  setupProfileDropdown() {
    // First, fetch user profile data to populate the dropdown
    fetch(`${this.baseUrl}/profile`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }
        return response.json();
      })
      .then(userData => {
        const userActions = document.querySelector(".user-actions");
        if (userActions) {
          userActions.innerHTML = `
            <div class="user-profile-dropdown">
              <button class="profile-button">
                ${
                  userData.profileImage
                    ? `<img src="${userData.profileImage}" alt="Profile" class="avatar-img">`
                    : userData.firstName
                    ? `<div class="avatar-initial">${userData.firstName[0]}</div>`
                    : `<i class="ri-user-line profile-icon"></i>`
                }
                <span class="username">${
                  userData.firstName || "Profile"
                }</span>
                <i class="ri-arrow-down-s-line"></i>
              </button>
              <div class="dropdown-menu">
                <a href="favorite.html"><i class="ri-heart-3-line"></i> My Favorites</a>
                <a href="./item.html"><i class="ri-shopping-bag-3-line"></i> My Items</a>
                <a href="my-orders.html"><i class="ri-shopping-cart-2-line"></i> My Orders</a>
                <a href="my-requests.html"><i class="ri-file-list-3-line"></i> My Requests</a>
                <a href="notifications.html"><i class="ri-notification-3-line"></i> Notifications</a>
                <div class="dropdown-divider"></div>
                <a href="#" onclick="notificationsManager.logout()"><i class="ri-logout-box-r-line"></i> Logout</a>
              </div>
            </div>
          `;

          // Set up dropdown toggle
          const profileButton = document.querySelector('.profile-button');
          if (profileButton) {
            profileButton.addEventListener('click', function() {
              const dropdown = document.querySelector('.dropdown-menu');
              dropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', function(event) {
              const dropdown = document.querySelector('.dropdown-menu');
              const profileButton = document.querySelector('.profile-button');
              
              if (dropdown && profileButton && !profileButton.contains(event.target) && !dropdown.contains(event.target)) {
                dropdown.classList.remove('show');
              }
            });
          }
        }
      })
      .catch(error => {
        console.error("Error fetching profile:", error);
      });
  }

  /**
   * Handle user logout
   */
  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    window.location.href = "login.html";
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
}

// Initialize the notifications manager when the page loads
document.addEventListener("DOMContentLoaded", () => {
  window.notificationsManager = new NotificationsManager();
});
