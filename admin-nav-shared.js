/**
 * Shared Admin Navigation Functionality
 * Provides standardized navigation, profile management, and user interactions
 * for all admin pages
 */
class AdminNavigation {
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");
    this.currentPage = this.getCurrentPage();
    
    this.init();
  }

  /**
   * Initialize the admin navigation
   */
  init() {
    this.setupAdminProfile();
    this.setupDropdownListeners();
    this.setActiveNavLink();
  }

  /**
   * Get the current page name from the URL
   */
  getCurrentPage() {
    const path = window.location.pathname;
    const fileName = path.split('/').pop() || 'admin-dashboard.html';
    return fileName.replace('.html', '');
  }

  /**
   * Set the active navigation link based on current page
   */
  setActiveNavLink() {
    // Remove active class from all nav links
    const navLinks = document.querySelectorAll('.admin-nav-links a');
    navLinks.forEach(link => link.classList.remove('active'));
    
    // Add active class to current page link
    const currentPageLink = document.querySelector(`.admin-nav-links a[href*="${this.currentPage}"]`);
    if (currentPageLink) {
      currentPageLink.classList.add('active');
    }
  }

  /**
   * Setup admin profile dropdown and user information
   */
  async setupAdminProfile() {
    const userActionsContainer = document.querySelector(".admin-user-actions");
    if (!userActionsContainer) return;

    // Show loading state
    const profileContainer = userActionsContainer.querySelector('.admin-profile-dropdown') || 
      this.createProfileContainer(userActionsContainer);
    
    profileContainer.innerHTML = `
      <div class="admin-profile-loading">
        <i class="ri-loader-4-line"></i>
        <span>Loading...</span>
      </div>
    `;

    if (!this.token) {
      this.handleUnauthenticated(userActionsContainer);
      return;
    }

    try {
      // Try multiple endpoints to get profile data
      const endpoints = [
        `${this.baseUrl}/admin/profile`,
        `${this.baseUrl}/profile`,
        `${this.baseUrl}/auth/profile`
      ];

      let userData = null;
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${this.token}` }
          });

          if (response.ok) {
            userData = await response.json();
            console.log(`✅ Admin profile loaded from: ${endpoint}`, userData);
            break;
          }
        } catch (error) {
          console.log(`❌ Failed to load from ${endpoint}:`, error.message);
        }
      }

      if (userData) {
        this.renderAdminProfile(userData, userActionsContainer);
      } else {
        this.renderFallbackProfile(userActionsContainer);
      }
    } catch (error) {
      console.error("Error loading admin profile:", error);
      this.renderFallbackProfile(userActionsContainer);
    }
  }

  /**
   * Create profile container if it doesn't exist
   */
  createProfileContainer(userActionsContainer) {
    const profileContainer = document.createElement('div');
    profileContainer.className = 'admin-profile-dropdown';
    userActionsContainer.appendChild(profileContainer);
    return profileContainer;
  }

  /**
   * Render the admin profile dropdown
   */
  renderAdminProfile(userData, container) {
    const profileContainer = container.querySelector('.admin-profile-dropdown');
    
    const firstName = userData.firstName || userData.name || 'Admin';
    const lastName = userData.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const initial = firstName.charAt(0).toUpperCase();
    const profileImage = userData.profileImage || userData.avatar;

    profileContainer.innerHTML = `
      <button class="admin-profile-button">
        ${profileImage 
          ? `<img src="${profileImage}" alt="Profile" class="admin-avatar-img">` 
          : `<div class="admin-avatar-initial">${initial}</div>`
        }
        <span class="admin-username">${fullName}</span>
        <i class="ri-arrow-down-s-line"></i>
      </button>
      <div class="admin-dropdown-menu">
        <a href="admin-dashboard.html">
          <i class="ri-dashboard-line"></i>
          Dashboard
        </a>
        <a href="admin-orders.html">
          <i class="ri-shopping-cart-2-line"></i>
          Orders
        </a>
        <a href="admin-users.html">
          <i class="ri-user-settings-line"></i>
          User Management
        </a>
        <a href="admin-listings.html">
          <i class="ri-store-2-line"></i>
          Listings
        </a>
        <a href="admin-analytics.html">
          <i class="ri-bar-chart-line"></i>
          Analytics
        </a>
        <div class="admin-dropdown-divider"></div>
        <a href="#" onclick="adminNav.logout()">
          <i class="ri-logout-box-r-line"></i>
          Logout
        </a>
      </div>
    `;
  }

  /**
   * Render fallback profile when API fails
   */
  renderFallbackProfile(container) {
    const profileContainer = container.querySelector('.admin-profile-dropdown');
    
    profileContainer.innerHTML = `
      <button class="admin-profile-button">
        <div class="admin-avatar-initial">A</div>
        <span class="admin-username">Admin</span>
        <i class="ri-arrow-down-s-line"></i>
      </button>
      <div class="admin-dropdown-menu">
        <a href="admin-dashboard.html">
          <i class="ri-dashboard-line"></i>
          Dashboard
        </a>
        <a href="admin-orders.html">
          <i class="ri-shopping-cart-2-line"></i>
          Orders
        </a>
        <a href="admin-users.html">
          <i class="ri-user-settings-line"></i>
          User Management
        </a>
        <a href="admin-listings.html">
          <i class="ri-store-2-line"></i>
          Listings
        </a>
        <a href="admin-analytics.html">
          <i class="ri-bar-chart-line"></i>
          Analytics
        </a>
        <div class="admin-dropdown-divider"></div>
        <a href="#" onclick="adminNav.logout()">
          <i class="ri-logout-box-r-line"></i>
          Logout
        </a>
      </div>
    `;
  }

  /**
   * Handle unauthenticated state
   */
  handleUnauthenticated(container) {
    const profileContainer = container.querySelector('.admin-profile-dropdown');
    
    profileContainer.innerHTML = `
      <div class="admin-profile-loading">
        <i class="ri-error-warning-line"></i>
        <span>Not authenticated</span>
      </div>
    `;

    // Redirect to login after a short delay
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);
  }

  /**
   * Setup dropdown event listeners
   */
  setupDropdownListeners() {
    // Use event delegation to handle dynamically created elements
    document.addEventListener('click', (e) => {
      const profileButton = e.target.closest('.admin-profile-button');
      const dropdown = e.target.closest('.admin-profile-dropdown');
      
      if (profileButton) {
        e.stopPropagation();
        this.toggleDropdown(profileButton);
      } else if (!dropdown) {
        // Click outside - close all dropdowns
        this.closeAllDropdowns();
      }
    });
  }

  /**
   * Toggle profile dropdown
   */
  toggleDropdown(button) {
    const dropdown = button.nextElementSibling;
    if (dropdown && dropdown.classList.contains('admin-dropdown-menu')) {
      dropdown.classList.toggle('show');
      
      // Close other dropdowns
      const allDropdowns = document.querySelectorAll('.admin-dropdown-menu');
      allDropdowns.forEach(d => {
        if (d !== dropdown) {
          d.classList.remove('show');
        }
      });
    }
  }

  /**
   * Close all dropdowns
   */
  closeAllDropdowns() {
    const allDropdowns = document.querySelectorAll('.admin-dropdown-menu');
    allDropdowns.forEach(dropdown => {
      dropdown.classList.remove('show');
    });
  }

  /**
   * Logout functionality
   */
  logout() {
    // Clear authentication
    localStorage.removeItem("token");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("user");
    localStorage.removeItem("adminUser");
    
    // Show logout message
    this.showMessage("Logged out successfully", "success");
    
    // Redirect to login
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1000);
  }

  /**
   * Show message notification
   */
  showMessage(message, type = "info") {
    // Create or get existing message container
    let messageContainer = document.getElementById('admin-message-container');
    if (!messageContainer) {
      messageContainer = document.createElement('div');
      messageContainer.id = 'admin-message-container';
      messageContainer.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
      `;
      document.body.appendChild(messageContainer);
    }

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    messageEl.innerHTML = `
      <i class="ri-${type === 'success' ? 'check' : type === 'error' ? 'error-warning' : 'information'}-line"></i>
      <span>${message}</span>
    `;

    messageContainer.appendChild(messageEl);

    // Animate in
    setTimeout(() => {
      messageEl.style.transform = 'translateX(0)';
    }, 100);

    // Auto remove
    setTimeout(() => {
      messageEl.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (messageEl.parentNode) {
          messageEl.parentNode.removeChild(messageEl);
        }
      }, 300);
    }, 3000);
  }

  /**
   * Generate standardized admin navigation HTML
   */
  static generateNavHTML(currentPage = '') {
    return `
      <nav class="admin-main-navigation">
        <div class="admin-nav-container">
          <div class="admin-logo-section">
            <a href="home.html" class="admin-logo-link">
              <img src="./rent.png" alt="Rently Logo" class="admin-logo" />
              <h1>Rently Admin</h1>
            </a>
          </div>
          
          <ul class="admin-nav-links">
            <li>
              <a href="admin-dashboard.html" ${currentPage === 'admin-dashboard' ? 'class="active"' : ''}>
                <i class="ri-dashboard-line"></i>
                <span>Dashboard</span>
              </a>
            </li>
            <li>
              <a href="admin-orders.html" ${currentPage === 'admin-orders' ? 'class="active"' : ''}>
                <i class="ri-shopping-cart-2-line"></i>
                <span>Orders</span>
              </a>
            </li>
            <li>
              <a href="admin-users.html" ${currentPage === 'admin-users' ? 'class="active"' : ''}>
                <i class="ri-user-line"></i>
                <span>Users</span>
              </a>
            </li>
            <li>
              <a href="admin-listings.html" ${currentPage === 'admin-listings' ? 'class="active"' : ''}>
                <i class="ri-store-2-line"></i>
                <span>Listings</span>
              </a>
            </li>
            <li>
              <a href="admin-analytics.html" ${currentPage === 'admin-analytics' ? 'class="active"' : ''}>
                <i class="ri-bar-chart-line"></i>
                <span>Analytics</span>
              </a>
            </li>
          </ul>
          
          <div class="admin-user-actions">
            <a href="home.html" class="back-to-site-link">
              <i class="ri-external-link-line"></i>
              <span>Back to Site</span>
            </a>
            
            <div class="admin-profile-dropdown">
              <!-- Profile will be rendered by JavaScript -->
            </div>
          </div>
        </div>
      </nav>
    `;
  }
}

// Global instance
let adminNav;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  adminNav = new AdminNavigation();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminNavigation;
} 