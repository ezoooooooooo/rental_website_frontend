/**
 * Admin Dashboard Manager
 * Handles all functionality for the admin dashboard
 */
class AdminDashboardManager {
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");
    this.userId = localStorage.getItem("userId");
    
    console.log("Admin Dashboard initialized");
    console.log("API Base URL:", this.baseUrl);
    console.log("Token available:", !!this.token);
    
    // Initialize dashboard
    this.initDashboard();
  }

  /**
   * Initialize the admin dashboard
   */
  async initDashboard() {
    try {
      console.log("Starting dashboard initialization...");
      
      // Define fallback image paths
      this.fallbackImages = {
        profile: 'assets/images/default-avatar.png',
        listing: 'assets/images/default-listing.png',
        error: 'assets/images/error-image.png'
      };
      
      // Create fallback images folder and files if they don't exist
      this.ensureFallbackImagesExist();
      
      // Setup admin profile
      await this.setupAdminProfile();
      
      // Load dashboard data
      await Promise.all([
        this.loadDashboardStats(),
        this.loadRecentOrders(),
        this.loadPopularListings(),
        this.loadUserActivity()
      ]);
      
      // Update current date
      this.updateCurrentDate();
      
      console.log("Dashboard initialization complete");
    } catch (error) {
      console.error("Error initializing dashboard:", error);
      this.showToast("Error initializing dashboard. Please try refreshing the page.", "error");
    }
  }

  /**
   * Ensure fallback images exist
   */
  ensureFallbackImagesExist() {
    try {
      // Create assets/images directory if it doesn't exist
      const assetsDir = document.createElement('div');
      assetsDir.innerHTML = `
        <style>
          .fallback-image {
            display: none;
            width: 0;
            height: 0;
          }
        </style>
        <img class="fallback-image" id="default-avatar" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23cccccc'/%3E%3Ctext x='50' y='60' font-family='Arial' font-size='40' text-anchor='middle' fill='%23ffffff'%3EA%3C/text%3E%3C/svg%3E" alt="Default Avatar">
        <img class="fallback-image" id="default-listing" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23eeeeee'/%3E%3Ctext x='100' y='110' font-family='Arial' font-size='20' text-anchor='middle' fill='%23999999'%3ENo Image%3C/text%3E%3C/svg%3E" alt="Default Listing">
        <img class="fallback-image" id="error-image" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23ffeeee'/%3E%3Ctext x='100' y='110' font-family='Arial' font-size='20' text-anchor='middle' fill='%23cc0000'%3EError%3C/text%3E%3C/svg%3E" alt="Error Image">
      `;
      document.body.appendChild(assetsDir);
      
      // Update fallback image paths to use the embedded data URLs
      this.fallbackImages = {
        profile: document.getElementById('default-avatar').src,
        listing: document.getElementById('default-listing').src,
        error: document.getElementById('error-image').src
      };
      
      console.log("Fallback images ready:", this.fallbackImages);
    } catch (error) {
      console.error("Error setting up fallback images:", error);
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
      // Try different possible API endpoints for the profile
      const possibleEndpoints = [
        `${this.baseUrl}/auth/me`,
        `${this.baseUrl}/auth/profile`,
        `${this.baseUrl}/users/me`,
        `${this.baseUrl}/profile`,
        `${this.baseUrl}/users/profile`,
        `${this.baseUrl}/user/profile`
      ];
      
      let response = null;
      let userData = null;
      let endpointUsed = '';
      
      for (const endpoint of possibleEndpoints) {
        console.log(`Trying profile endpoint: ${endpoint}`);
        try {
          response = await fetch(endpoint, {
            headers: {
              Authorization: `Bearer ${this.token}`
            }
          });
          
          if (response.ok) {
            userData = await response.json();
            endpointUsed = endpoint;
            console.log(`Successfully fetched profile from: ${endpoint}`, userData);
            break;
          }
        } catch (err) {
          console.log(`Failed to fetch from ${endpoint}:`, err.message);
        }
      }
      
      if (!userData) {
        // Use placeholder admin data if API fails
        console.log("Using placeholder admin data");
        userData = {
          firstName: "Admin",
          lastName: "User",
          role: "admin",
          email: "admin@example.com",
          profileImage: null
        };
      }
      
      // Check if user is admin
      if (userData.role !== "admin") {
        console.warn("User is not an admin. Role:", userData.role);
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
            <span class="admin-name">${userData.firstName || ''} ${userData.lastName || ''}</span>
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
      
      // Create a simple profile with admin data if there's an error
      const adminProfileElement = document.getElementById("adminProfile");
      if (adminProfileElement) {
        adminProfileElement.innerHTML = `
          <div class="admin-avatar">
            <div class="avatar-initial">A</div>
          </div>
          <div class="admin-info">
            <span class="admin-name">Admin User</span>
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
    }
  }

  /**
   * Load dashboard statistics from the API
   */
  async loadDashboardStats() {
    try {
      console.log("Fetching dashboard stats from:", `${this.baseUrl}/admin/dashboard/stats`);
      
      const response = await fetch(`${this.baseUrl}/admin/dashboard/stats`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      console.log("Dashboard stats API response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${response.status} ${response.statusText}`);
      }

      const stats = await response.json();
      console.log("Dashboard stats data received:", stats);
      console.log("Full stats object structure:", JSON.stringify(stats, null, 2));
      
      // Update users stats with real data
      const totalUsers = stats.userCounts?.total || stats.totalUsers || stats.users?.total || 0;
      const newUsersToday = stats.userCounts?.newToday || stats.newUsers || stats.users?.newToday || 0;
      
      document.getElementById("totalUsers").textContent = totalUsers.toLocaleString();
      document.getElementById("newUsers").textContent = `+${newUsersToday.toLocaleString()} today`;
      
      // Update orders stats with real data
      const totalOrders = stats.orderCounts?.total || stats.totalOrders || stats.orders?.total || 0;
      const todayOrders = stats.orderCounts?.today || stats.todayOrders || stats.orders?.today || 0;
      
      document.getElementById("totalOrders").textContent = totalOrders.toLocaleString();
      document.getElementById("todayOrders").textContent = `+${todayOrders.toLocaleString()} today`;
      
      // Update listings stats with real data
      const activeListings = stats.listingCounts?.active || stats.activeListings || stats.listings?.active || 0;
      const totalListings = stats.listingCounts?.total || stats.totalListings || stats.listings?.total || 0;
      
      document.getElementById("activeListings").textContent = activeListings.toLocaleString();
      document.getElementById("totalListings").textContent = `${totalListings.toLocaleString()} total`;
      
      // Update revenue stats with real data
      const monthlyRevenue = stats.revenue?.monthly || stats.monthlyRevenue || stats.totalRevenue || 0;
      
      document.getElementById("monthlyRevenue").textContent = `$${monthlyRevenue.toLocaleString()}`;
      
      // Update order status counts with real data - try multiple possible data structures
      console.log("Checking order status data in stats:", {
        orderStatus: stats.orderStatus,
        orderCounts: stats.orderCounts,
        statusCounts: stats.statusCounts,
        directProps: {
          pending: stats.pending,
          approved: stats.approved,
          completed: stats.completed,
          cancelled: stats.cancelled,
          rejected: stats.rejected
        }
      });
      
      const pendingOrders = stats.orderStatus?.pending || 
                           stats.orderCounts?.byStatus?.pending || 
                           stats.orderCounts?.pending ||
                           stats.statusCounts?.pending ||
                           stats.pending ||
                           stats.orders?.pending ||
                           stats.ordersByStatus?.pending ||
                           stats.status?.pending || 0;
                           
      const approvedOrders = stats.orderStatus?.approved || 
                            stats.orderCounts?.byStatus?.approved || 
                            stats.orderCounts?.approved ||
                            stats.statusCounts?.approved ||
                            stats.approved ||
                            stats.orders?.approved ||
                            stats.ordersByStatus?.approved ||
                            stats.status?.approved || 0;
                            
      const completedOrders = stats.orderStatus?.completed || 
                             stats.orderCounts?.byStatus?.completed || 
                             stats.orderCounts?.completed ||
                             stats.statusCounts?.completed ||
                             stats.completed ||
                             stats.orders?.completed ||
                             stats.ordersByStatus?.completed ||
                             stats.status?.completed || 0;
                             
      const cancelledOrders = stats.orderStatus?.cancelled || 
                             stats.orderCounts?.byStatus?.cancelled || 
                             stats.orderCounts?.cancelled ||
                             stats.statusCounts?.cancelled ||
                             stats.cancelled ||
                             stats.orders?.cancelled ||
                             stats.ordersByStatus?.cancelled ||
                             stats.status?.cancelled || 0;
                             
      const rejectedOrders = stats.orderStatus?.rejected || 
                            stats.orderCounts?.byStatus?.rejected || 
                            stats.orderCounts?.rejected ||
                            stats.statusCounts?.rejected ||
                            stats.rejected ||
                            stats.orders?.rejected ||
                            stats.ordersByStatus?.rejected ||
                            stats.status?.rejected || 0;
      
      console.log("Order status counts extracted:", {
        pending: pendingOrders,
        approved: approvedOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        rejected: rejectedOrders
      });
      
      document.getElementById("pendingOrders").textContent = pendingOrders.toLocaleString();
      document.getElementById("approvedOrders").textContent = approvedOrders.toLocaleString();
      document.getElementById("completedOrders").textContent = completedOrders.toLocaleString();
      document.getElementById("cancelledRejectedOrders").textContent = (cancelledOrders + rejectedOrders).toLocaleString();
      
      // Make stats clickable
      this.makeStatsClickable();
      
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
      this.showToast("Unable to load dashboard statistics. Using placeholder data.", "warning");
      
      // Use placeholder data when API fails
      document.getElementById("totalUsers").textContent = "120";
      document.getElementById("newUsers").textContent = "+5 today";
      
      document.getElementById("totalOrders").textContent = "85";
      document.getElementById("todayOrders").textContent = "+3 today";
      
      document.getElementById("activeListings").textContent = "42";
      document.getElementById("totalListings").textContent = "65 total";
      
      document.getElementById("monthlyRevenue").textContent = "$4,250";
      
      document.getElementById("pendingOrders").textContent = "12";
      document.getElementById("approvedOrders").textContent = "28";
      document.getElementById("completedOrders").textContent = "35";
      document.getElementById("cancelledRejectedOrders").textContent = "10";
      
      // Make stats clickable even with placeholder data
      this.makeStatsClickable();
    }
  }

  /**
   * Make dashboard stats clickable
   */
  makeStatsClickable() {
    // Make total users clickable
    const totalUsersCard = document.querySelector('.stat-card:has(#totalUsers)');
    if (totalUsersCard) {
      totalUsersCard.style.cursor = 'pointer';
      totalUsersCard.addEventListener('click', () => {
        window.location.href = 'admin-users.html';
      });
    }
    
    // Make total orders clickable
    const totalOrdersCard = document.querySelector('.stat-card:has(#totalOrders)');
    if (totalOrdersCard) {
      totalOrdersCard.style.cursor = 'pointer';
      totalOrdersCard.addEventListener('click', () => {
        window.location.href = 'admin-orders.html';
      });
    }
    
    // Make active listings clickable
    const activeListingsCard = document.querySelector('.stat-card:has(#activeListings)');
    if (activeListingsCard) {
      activeListingsCard.style.cursor = 'pointer';
      activeListingsCard.addEventListener('click', () => {
        window.location.href = 'admin-listings.html';
      });
    }
    
    // Make monthly revenue clickable
    const monthlyRevenueCard = document.querySelector('.stat-card:has(#monthlyRevenue)');
    if (monthlyRevenueCard) {
      monthlyRevenueCard.style.cursor = 'pointer';
      monthlyRevenueCard.addEventListener('click', () => {
        window.location.href = 'admin-analytics.html';
      });
    }
    
    // Make order status cards clickable
    const pendingCard = document.querySelector('.status-card:has(#pendingOrders)');
    if (pendingCard) {
      pendingCard.style.cursor = 'pointer';
      pendingCard.addEventListener('click', () => {
        window.location.href = 'admin-orders.html?status=pending';
      });
    }
    
    const approvedCard = document.querySelector('.status-card:has(#approvedOrders)');
    if (approvedCard) {
      approvedCard.style.cursor = 'pointer';
      approvedCard.addEventListener('click', () => {
        window.location.href = 'admin-orders.html?status=approved';
      });
    }
    
    const completedCard = document.querySelector('.status-card:has(#completedOrders)');
    if (completedCard) {
      completedCard.style.cursor = 'pointer';
      completedCard.addEventListener('click', () => {
        window.location.href = 'admin-orders.html?status=completed';
      });
    }
    
    const cancelledCard = document.querySelector('.status-card:has(#cancelledRejectedOrders)');
    if (cancelledCard) {
      cancelledCard.style.cursor = 'pointer';
      cancelledCard.addEventListener('click', () => {
        window.location.href = 'admin-orders.html?status=cancelled';
      });
    }
  }

  /**
   * Load recent orders from the API
   */
  async loadRecentOrders() {
    try {
      console.log("Fetching recent orders from:", `${this.baseUrl}/admin/orders?limit=5`);
      
      const response = await fetch(`${this.baseUrl}/admin/orders?limit=5`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      console.log("Recent orders API response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch recent orders: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Recent orders data received:", data);
      
      // Handle different API response formats
      let orders = [];
      
      if (Array.isArray(data)) {
        orders = data;
      } else if (Array.isArray(data.orders)) {
        orders = data.orders;
      } else if (Array.isArray(data.data)) {
        orders = data.data;
      }
      
      const recentOrdersTable = document.getElementById("recentOrdersTable");
      if (!recentOrdersTable) return;
      
      if (!orders || orders.length === 0) {
        recentOrdersTable.innerHTML = `
          <tr class="empty-row">
            <td colspan="6">
              <div class="empty-state">
                <i class="ri-inbox-line"></i>
                <p>No recent orders found</p>
              </div>
            </td>
          </tr>
        `;
        return;
      }
      
      recentOrdersTable.innerHTML = orders.slice(0, 5).map(order => {
        // Handle different property names in API response
        const orderId = order.id || order._id || order.orderId;
        const user = order.user || order.renter || order.customer || {};
        const item = order.item || order.listing || order.product || {};
        const totalAmount = order.totalAmount || order.totalPrice || order.price || order.amount || 0;
        const status = order.status || 'pending';
        const createdAt = order.createdAt || order.date || order.orderDate || new Date().toISOString();
        
        // Extract image URL properly with fallback
        let imageUrl = 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop';
        
        if (item.images && Array.isArray(item.images) && item.images.length > 0) {
          // Handle both string URLs and object URLs
          const firstImage = item.images[0];
          if (typeof firstImage === 'string') {
            imageUrl = firstImage;
          } else if (firstImage && typeof firstImage === 'object') {
            // Check for common URL properties
            imageUrl = firstImage.url || firstImage.src || firstImage.path || firstImage.uri || imageUrl;
          }
        } else if (item.image) {
          imageUrl = item.image;
        } else if (item.thumbnail) {
          imageUrl = item.thumbnail;
        } else if (item.photo) {
          imageUrl = item.photo;
        }
        
        console.log("Recent order item image URL extracted:", imageUrl);
        
        return `
          <tr>
            <td class="order-id">#${orderId}</td>
            <td class="order-user">
              <div class="avatar-initial">${(user.firstName || user.name || 'U')[0]}</div>
              <span class="user-name">${user.firstName || user.name || ''} ${user.lastName || ''}</span>
            </td>
            <td class="order-item">
              <img src="${imageUrl}" alt="${item.name || item.title || 'Item'}" class="item-image" onerror="this.src='https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop'">
              <span class="item-name">${item.name || item.title || 'Unknown Item'}</span>
            </td>
            <td class="order-date">${new Date(createdAt).toLocaleDateString()}</td>
            <td>
              <span class="order-status status-${status.toLowerCase()}">${this.capitalizeFirstLetter(status)}</span>
            </td>
            <td class="order-actions">
              <button class="action-btn view-btn" data-order-id="${orderId}" title="View Details">
                <i class="ri-eye-line"></i>
              </button>
              <button class="action-btn edit-btn" data-order-id="${orderId}" title="Edit Order">
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
      this.showToast("Unable to load recent orders. Using placeholder data.", "warning");
      
      // Use placeholder data when API fails
      const recentOrdersTable = document.getElementById("recentOrdersTable");
      if (!recentOrdersTable) return;
      
      const placeholderOrders = [
        {
          id: "ORD1001",
          user: { firstName: "John", lastName: "Doe" },
          item: { name: "Professional Camera Kit" },
          totalAmount: 45.00,
          createdAt: new Date().toISOString(),
          status: "pending"
        },
        {
          id: "ORD1002",
          user: { firstName: "Jane", lastName: "Smith" },
          item: { name: "Mountain Bike" },
          totalAmount: 35.00,
          createdAt: new Date().toISOString(),
          status: "approved"
        },
        {
          id: "ORD1003",
          user: { firstName: "Mike", lastName: "Johnson" },
          item: { name: "Camping Tent" },
          totalAmount: 25.00,
          createdAt: new Date().toISOString(),
          status: "completed"
        }
      ];
      
      recentOrdersTable.innerHTML = placeholderOrders.map(order => `
        <tr>
          <td class="order-id">#${order.id}</td>
          <td class="order-user">
            <div class="avatar-initial">${order.user.firstName[0]}</div>
            <span class="user-name">${order.user.firstName} ${order.user.lastName}</span>
          </td>
          <td class="order-item">
            <img src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop" alt="${order.item.name}" class="item-image" onerror="this.src='https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop'">
            <span class="item-name">${order.item.name}</span>
          </td>
          <td class="order-date">${new Date(order.createdAt).toLocaleDateString()}</td>
          <td>
            <span class="order-status status-${order.status.toLowerCase()}">${this.capitalizeFirstLetter(order.status)}</span>
          </td>
          <td class="order-actions">
            <button class="action-btn view-btn" data-order-id="${order.id}" title="View Details">
              <i class="ri-eye-line"></i>
            </button>
            <button class="action-btn edit-btn" data-order-id="${order.id}" title="Edit Order">
              <i class="ri-edit-line"></i>
            </button>
          </td>
        </tr>
      `).join('');
      
      // Attach event listeners to action buttons
      this.attachOrderActionListeners();
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
        window.location.href = `admin-orders.html?order=${orderId}`;
      });
    });
    
    // Edit order
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(button => {
      button.addEventListener('click', () => {
        const orderId = button.getAttribute('data-order-id');
        window.location.href = `admin-orders.html?order=${orderId}`;
      });
    });
  }

  /**
   * Load popular listings from the API
   */
  async loadPopularListings() {
    try {
      // Try different possible endpoints
      const possibleEndpoints = [
        `${this.baseUrl}/admin/analytics/popular-listings?timeframe=month&limit=4`,
        `${this.baseUrl}/admin/popular-listings?timeframe=month&limit=4`,
        `${this.baseUrl}/admin/listings/popular?timeframe=month&limit=4`
      ];
      
      let response = null;
      let data = null;
      let endpointUsed = '';
      
      for (const endpoint of possibleEndpoints) {
        console.log(`Trying popular listings endpoint: ${endpoint}`);
        try {
          response = await fetch(endpoint, {
            headers: {
              Authorization: `Bearer ${this.token}`
            }
          });
          
          if (response.ok) {
            data = await response.json();
            endpointUsed = endpoint;
            console.log(`Successfully fetched popular listings from: ${endpoint}`, data);
            break;
          }
        } catch (err) {
          console.log(`Failed to fetch from ${endpoint}:`, err.message);
        }
      }
      
      if (!data) {
        throw new Error("Failed to fetch popular listings from any endpoint");
      }

      // Handle different possible data structures
      let listings = [];
      
      if (Array.isArray(data.listings)) {
        listings = data.listings;
      } else if (Array.isArray(data.popularListings)) {
        listings = data.popularListings;
      } else if (Array.isArray(data)) {
        listings = data;
      }
      
      console.log("Processed popular listings data:", listings);
      
      const listingsContainer = document.getElementById("popularListings");
      
      if (listings.length === 0) {
        listingsContainer.innerHTML = `
          <div class="empty-listings">No popular listings found</div>
        `;
        return;
      }
      
      listingsContainer.innerHTML = listings.map(item => {
        // Handle different data structures
        const listing = item.listing || item;
        const name = listing.name || 'Unknown Listing';
        
        // Get image - handle both string URLs and object URLs
        let imageUrl = this.fallbackImages.listing;
        if (listing.images && listing.images.length > 0) {
          const firstImage = listing.images[0];
          if (typeof firstImage === 'string') {
            imageUrl = firstImage;
          } else if (firstImage && typeof firstImage === 'object') {
            // Check for common URL properties
            if (firstImage.url) {
              imageUrl = firstImage.url;
            } else if (firstImage.src) {
              imageUrl = firstImage.src;
            } else if (firstImage.path) {
              imageUrl = firstImage.path;
            } else if (firstImage.uri) {
              imageUrl = firstImage.uri;
            }
          }
          console.log("Popular listing image URL extracted:", imageUrl);
        }
          
        // Get owner info
        const ownerName = listing.owner ? 
          `${listing.owner.firstName || ''} ${listing.owner.lastName || ''}`.trim() || 'Unknown Owner' : 
          'Unknown Owner';
          
        // Get revenue and orders - handle different data structures
        const revenue = item.revenue || item.totalRevenue || 0;
        const orders = item.orderCount || item.orders || 0;
        
        return `
          <div class="listing-card">
            <img src="${imageUrl}" alt="${name}" class="listing-image" onerror="this.src='${this.fallbackImages.error}'">
            <div class="listing-details">
              <h4 class="listing-name">${name}</h4>
              <p class="listing-price">$${listing.rentalRate || 0}/day</p>
              <div class="listing-stats">
                <span><i class="ri-shopping-cart-2-line"></i> ${orders} orders</span>
                <span><i class="ri-money-dollar-circle-line"></i> $${(revenue).toFixed(2)}</span>
              </div>
              <div class="listing-owner">
                <div class="avatar-initial">${ownerName.charAt(0)}</div>
                <span>${ownerName}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
    } catch (error) {
      console.error("Error loading popular listings:", error);
      const listingsContainer = document.getElementById("popularListings");
      listingsContainer.innerHTML = `
        <div class="error-listings">Error loading popular listings: ${error.message}</div>
      `;
    }
  }

  /**
   * Load user activity data
   */
  async loadUserActivity() {
    try {
      // Try different possible endpoints
      const possibleEndpoints = [
        `${this.baseUrl}/admin/analytics/user-activity`,
        `${this.baseUrl}/admin/user-activity`,
        `${this.baseUrl}/admin/users/activity`
      ];
      
      let response = null;
      let data = null;
      let endpointUsed = '';
      
      for (const endpoint of possibleEndpoints) {
        console.log(`Trying user activity endpoint: ${endpoint}`);
        try {
          response = await fetch(endpoint, {
            headers: {
              Authorization: `Bearer ${this.token}`
            }
          });
          
          if (response.ok) {
            data = await response.json();
            endpointUsed = endpoint;
            console.log(`Successfully fetched user activity from: ${endpoint}`, data);
            break;
          }
        } catch (err) {
          console.log(`Failed to fetch from ${endpoint}:`, err.message);
        }
      }
      
      if (!data) {
        console.log("No user activity data found from any endpoint, using sample data");
        // Use sample data if no API endpoint works
        data = {
          recentUsers: [],
          totalActiveUsers: 0,
          userGrowth: 0
        };
      }

      // Handle different possible data structures
      const recentUsers = data.recentUsers || data.users || [];
      const totalActiveUsers = data.totalActiveUsers || data.activeUsers || 0;
      const userGrowth = data.userGrowth || data.growth || 0;
      
      // Update user count stats
      const userCountElement = document.getElementById("userCount");
      if (userCountElement) {
        userCountElement.textContent = totalActiveUsers.toLocaleString();
      }
      
      const userGrowthElement = document.getElementById("userGrowth");
      if (userGrowthElement) {
        const growthValue = parseFloat(userGrowth);
        const isPositive = growthValue >= 0;
        
        userGrowthElement.innerHTML = `
          <i class="ri-arrow-${isPositive ? 'up' : 'down'}-line"></i>
          ${Math.abs(growthValue).toFixed(1)}%
        `;
        
        userGrowthElement.className = isPositive ? 'stat-change positive' : 'stat-change negative';
      }
      
      // Update recent users list
      const recentUsersList = document.getElementById("recentUsers");
      if (recentUsersList) {
        if (recentUsers.length === 0) {
          recentUsersList.innerHTML = `<div class="empty-list">No recent users</div>`;
          return;
        }
        
        recentUsersList.innerHTML = recentUsers.map(user => {
          // Handle profile image
          let profileImage = this.fallbackImages.profile;
          
          if (user.profileImage) {
            // Handle both string and object profile images
            if (typeof user.profileImage === 'string') {
              profileImage = user.profileImage;
            } else if (typeof user.profileImage === 'object' && user.profileImage !== null) {
              if (user.profileImage.url) {
                profileImage = user.profileImage.url;
              } else if (user.profileImage.src) {
                profileImage = user.profileImage.src;
              } else if (user.profileImage.path) {
                profileImage = user.profileImage.path;
              } else if (user.profileImage.uri) {
                profileImage = user.profileImage.uri;
              }
            }
          }
          
          // Format last activity date
          const lastActive = user.lastActive ? new Date(user.lastActive) : new Date();
          const formattedDate = lastActive.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
          
          // Get user name
          const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
          
          return `
            <div class="user-item">
              <img src="${profileImage}" alt="${userName}" class="user-avatar" onerror="this.src='${this.fallbackImages.profile}'">
              <div class="user-info">
                <h5 class="user-name">${userName}</h5>
                <p class="user-email">${user.email || 'No email'}</p>
              </div>
              <div class="user-activity">
                <span class="activity-date">${formattedDate}</span>
                <span class="activity-status ${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (error) {
      console.error("Error loading user activity:", error);
      const recentUsersList = document.getElementById("recentUsers");
      if (recentUsersList) {
        recentUsersList.innerHTML = `<div class="error-list">Error loading user activity: ${error.message}</div>`;
      }
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
