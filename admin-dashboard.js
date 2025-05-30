/**
 * Admin Dashboard Manager
 * Handles all functionality for the admin dashboard
 */
class AdminDashboardManager {
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");
    this.userId = localStorage.getItem("userId");
    
    // Initialize dashboard
    this.initDashboard();
  }

  /**
   * Initialize the admin dashboard
   */
  async initDashboard() {
    try {
      // Check if user is logged in and is admin
      if (!this.token) {
        window.location.href = "login.html";
        return;
      }

      // Set current date
      this.updateCurrentDate();
      
      // Setup admin profile
      this.setupAdminProfile();
      
      // Load dashboard stats
      await this.loadDashboardStats();
      
      // Load recent orders
      await this.loadRecentOrders();
      
      // Load popular listings
      await this.loadPopularListings();
      
    } catch (error) {
      console.error("Error initializing admin dashboard:", error);
      this.showToast("Error loading dashboard data", "error");
    }
  }

  /**
   * Update the current date display
   */
  updateCurrentDate() {
    const dateElement = document.getElementById("currentDate");
    if (dateElement) {
      const now = new Date();
      const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
  }

  /**
   * Set up the admin profile dropdown
   */
  async setupAdminProfile() {
    try {
      const response = await fetch(`${this.baseUrl}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch admin profile");
      }

      const userData = await response.json();
      
      // Check if user is admin
      if (userData.role !== "admin") {
        this.showToast("Access denied. Admin privileges required.", "error");
        setTimeout(() => {
          window.location.href = "home.html";
        }, 2000);
        return;
      }

      const adminProfileElement = document.getElementById("adminProfile");
      if (adminProfileElement) {
        adminProfileElement.innerHTML = `
          <div class="admin-avatar">
            ${userData.profileImage 
              ? `<img src="${userData.profileImage}" alt="Admin" />` 
              : `<div class="avatar-initial">${userData.firstName ? userData.firstName[0] : 'A'}</div>`}
          </div>
          <div class="admin-info">
            <span class="admin-name">${userData.firstName} ${userData.lastName}</span>
            <span class="admin-role">Administrator</span>
          </div>
          <i class="ri-arrow-down-s-line"></i>
          <div class="dropdown-menu">
            <a href="home.html"><i class="ri-home-line"></i> Main Site</a>
            <div class="dropdown-divider"></div>
            <a href="#" id="logoutBtn"><i class="ri-logout-box-r-line"></i> Logout</a>
          </div>
        `;

        // Set up dropdown toggle
        const profileElement = adminProfileElement;
        const dropdownMenu = profileElement.querySelector(".dropdown-menu");
        
        profileElement.addEventListener("click", (e) => {
          e.stopPropagation();
          dropdownMenu.classList.toggle("show");
        });
        
        document.addEventListener("click", (e) => {
          if (!profileElement.contains(e.target)) {
            dropdownMenu.classList.remove("show");
          }
        });
        
        // Set up logout button
        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
          logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.logout();
          });
        }
      }
    } catch (error) {
      console.error("Error setting up admin profile:", error);
    }
  }

  /**
   * Load dashboard statistics from the API
   */
  async loadDashboardStats() {
    try {
      const response = await fetch(`${this.baseUrl}/admin/dashboard/stats`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard stats");
      }

      const stats = await response.json();
      
      // Update users stats
      document.getElementById("totalUsers").textContent = stats.users.total;
      document.getElementById("newUsers").textContent = `+${stats.users.newToday} today`;
      
      // Update orders stats
      document.getElementById("totalOrders").textContent = stats.orders.total;
      document.getElementById("todayOrders").textContent = `+${stats.orders.today} today`;
      
      // Update listings stats
      document.getElementById("activeListings").textContent = stats.listings.active;
      document.getElementById("totalListings").textContent = `${stats.listings.total} total`;
      
      // Update revenue stats
      document.getElementById("monthlyRevenue").textContent = `$${stats.revenue.monthly.toFixed(2)}`;
      
      // Update order status counts
      document.getElementById("pendingOrders").textContent = stats.orders.pending;
      document.getElementById("approvedOrders").textContent = stats.orders.approved;
      document.getElementById("completedOrders").textContent = stats.orders.completed;
      document.getElementById("cancelledRejectedOrders").textContent = 
        stats.orders.cancelled + stats.orders.rejected;
      
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
      this.showToast("Error loading dashboard statistics", "error");
    }
  }

  /**
   * Load recent orders from the API
   */
  async loadRecentOrders() {
    try {
      const response = await fetch(`${this.baseUrl}/admin/orders?limit=5&sort=-createdAt`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch recent orders");
      }

      const data = await response.json();
      const orders = data.orders;
      
      const tableBody = document.getElementById("recentOrdersTable");
      
      if (orders.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="6" class="empty-table">No orders found</td>
          </tr>
        `;
        return;
      }
      
      tableBody.innerHTML = orders.map(order => {
        // Format date
        const orderDate = new Date(order.createdAt);
        const formattedDate = orderDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        
        // Get shortened order ID
        const shortOrderId = order._id.substring(order._id.length - 6);
        
        // Get user details
        const userName = order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Unknown User';
        
        // Get listing details
        const listingName = order.listing ? order.listing.name : 'Unknown Item';
        const listingImage = order.listing && order.listing.images && order.listing.images.length > 0 
          ? order.listing.images[0]
          : 'https://via.placeholder.com/40';
        
        return `
          <tr>
            <td class="order-id">#${shortOrderId}</td>
            <td class="order-user">
              <div class="avatar-initial">${userName.charAt(0)}</div>
              <span class="user-name">${userName}</span>
            </td>
            <td class="order-item">
              <img src="${listingImage}" alt="${listingName}" class="item-image">
              <span class="item-name">${listingName}</span>
            </td>
            <td class="order-date">${formattedDate}</td>
            <td>
              <span class="order-status status-${order.status.toLowerCase()}">${this.capitalizeFirstLetter(order.status)}</span>
            </td>
            <td class="order-actions">
              <button class="action-btn view-btn" data-order-id="${order._id}" title="View Details">
                <i class="ri-eye-line"></i>
              </button>
              <button class="action-btn edit-btn" data-order-id="${order._id}" title="Edit Order">
                <i class="ri-edit-line"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');
      
      // Attach event listeners to action buttons
      this.attachOrderActionListeners();
      
    } catch (error) {
      console.error("Error loading recent orders:", error);
      const tableBody = document.getElementById("recentOrdersTable");
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="error-table">Error loading orders</td>
        </tr>
      `;
    }
  }

  /**
   * Attach event listeners to order action buttons
   */
  attachOrderActionListeners() {
    // View order details
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
      button.addEventListener('click', () => {
        const orderId = button.getAttribute('data-order-id');
        window.location.href = `admin-order-details.html?id=${orderId}`;
      });
    });
    
    // Edit order
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(button => {
      button.addEventListener('click', () => {
        const orderId = button.getAttribute('data-order-id');
        window.location.href = `admin-edit-order.html?id=${orderId}`;
      });
    });
  }

  /**
   * Load popular listings from the API
   */
  async loadPopularListings() {
    try {
      const response = await fetch(`${this.baseUrl}/admin/analytics/popular-listings?limit=4`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch popular listings");
      }

      const data = await response.json();
      const listings = data.popularListings;
      
      const listingsContainer = document.getElementById("popularListings");
      
      if (listings.length === 0) {
        listingsContainer.innerHTML = `
          <div class="empty-listings">No popular listings found</div>
        `;
        return;
      }
      
      listingsContainer.innerHTML = listings.map(item => {
        const listing = item.listing;
        const imageUrl = listing.images && listing.images.length > 0 
          ? listing.images[0] 
          : 'https://via.placeholder.com/200';
          
        return `
          <div class="listing-card">
            <img src="${imageUrl}" alt="${listing.name}" class="listing-image">
            <div class="listing-details">
              <h4 class="listing-name">${listing.name}</h4>
              <p class="listing-price">$${listing.rentalRate}/day</p>
              <div class="listing-stats">
                <span>${item.orderCount} orders</span>
                <span>$${item.totalRevenue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
    } catch (error) {
      console.error("Error loading popular listings:", error);
      const listingsContainer = document.getElementById("popularListings");
      listingsContainer.innerHTML = `
        <div class="error-listings">Error loading popular listings</div>
      `;
    }
  }

  /**
   * Logout the admin user
   */
  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    window.location.href = "login.html";
  }

  /**
   * Show a toast notification
   */
  showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `custom-toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Show the toast
    setTimeout(() => {
      toast.classList.add("show");
    }, 10);
    
    // Hide and remove the toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  /**
   * Helper function to capitalize the first letter of a string
   */
  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}

// Initialize the admin dashboard when the page loads
document.addEventListener("DOMContentLoaded", () => {
  window.adminDashboard = new AdminDashboardManager();
});
