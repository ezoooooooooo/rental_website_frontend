/**
 * Admin Users Manager
 * Handles all functionality for the admin users page
 */
class AdminUsersManager {
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");
    this.userId = localStorage.getItem("userId");
    
    // Pagination state
    this.currentPage = 1;
    this.totalPages = 1;
    this.pageSize = 10;
    
    // Filter state
    this.filters = {
      role: "",
      search: ""
    };
    
    // Current user being edited
    this.currentEditUser = null;
    
    // Initialize users page
    this.initUsersPage();
  }

  /**
   * Initialize the users page
   */
  async initUsersPage() {
    try {
      // Check if user is logged in and is admin
      if (!this.token) {
        window.location.href = "login.html";
        return;
      }

      // Set current date
      this.updateCurrentDate();
      
      // Setup admin profile
      await this.setupAdminProfile();
      
      // Load users
      await this.loadUsers();
      
      // Setup event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error("Error initializing admin users page:", error);
      this.showToast("Error loading users page", "error");
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
      const response = await fetch(`${this.baseUrl}/auth/me`, {
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
   * Set up event listeners for the page
   */
  setupEventListeners() {
    // Filter buttons
    const applyFiltersBtn = document.getElementById("applyFiltersBtn");
    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener("click", () => {
        this.applyFilters();
      });
    }
    
    const resetFiltersBtn = document.getElementById("resetFiltersBtn");
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener("click", () => {
        this.resetFilters();
      });
    }
    
    // Pagination buttons
    const prevPageBtn = document.getElementById("prevPageBtn");
    if (prevPageBtn) {
      prevPageBtn.addEventListener("click", () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.loadUsers();
        }
      });
    }
    
    const nextPageBtn = document.getElementById("nextPageBtn");
    if (nextPageBtn) {
      nextPageBtn.addEventListener("click", () => {
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.loadUsers();
        }
      });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this.loadUsers();
      });
    }
    
    // Edit role modal buttons
    const cancelRoleEditBtn = document.getElementById("cancelRoleEditBtn");
    if (cancelRoleEditBtn) {
      cancelRoleEditBtn.addEventListener("click", () => {
        this.closeEditRoleModal();
      });
    }
    
    const saveRoleBtn = document.getElementById("saveRoleBtn");
    if (saveRoleBtn) {
      saveRoleBtn.addEventListener("click", () => {
        this.saveUserRole();
      });
    }
    
    // Close modals when clicking on close button or outside
    const closeModalButtons = document.querySelectorAll(".close-modal");
    closeModalButtons.forEach(button => {
      button.addEventListener("click", () => {
        this.closeAllModals();
      });
    });
    
    // Close modals when clicking outside
    const modals = document.querySelectorAll(".modal");
    modals.forEach(modal => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.closeAllModals();
        }
      });
    });
  }

  /**
   * Load users from the API
   */
  async loadUsers() {
    try {
      const tableBody = document.getElementById("usersTableBody");
      tableBody.innerHTML = `
        <tr class="loading-row">
          <td colspan="7">Loading users...</td>
        </tr>
      `;
      
      // Build query parameters
      let queryParams = new URLSearchParams({
        page: this.currentPage,
        limit: this.pageSize,
        sort: "-createdAt"
      });
      
      // Add filters if they exist
      if (this.filters.role) {
        queryParams.append("role", this.filters.role);
      }
      
      if (this.filters.search) {
        queryParams.append("search", this.filters.search);
      }
      
      const response = await fetch(`${this.baseUrl}/admin/users?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      const users = data.users;
      
      // Update pagination info
      this.totalPages = data.pagination.pages;
      this.currentPage = data.pagination.page;
      this.updatePaginationUI();
      
      // Update user count
      const userCountElement = document.getElementById("userCount");
      if (userCountElement) {
        userCountElement.textContent = data.pagination.total;
      }
      
      if (users.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" class="empty-table">No users found</td>
          </tr>
        `;
        return;
      }
      
      tableBody.innerHTML = users.map(user => {
        // Format date
        const joinedDate = new Date(user.createdAt);
        const formattedDate = joinedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        
        // Get shortened user ID
        const shortUserId = user._id.substring(user._id.length - 6);
        
        // Get user name
        const userName = `${user.firstName} ${user.lastName}`;
        const userInitial = user.firstName ? user.firstName.charAt(0) : '?';
        
        return `
          <tr>
            <td class="user-id">#${shortUserId}</td>
            <td class="user-name-cell">
              <div class="user-avatar">${userInitial}</div>
              <span class="user-name">${userName}</span>
            </td>
            <td class="user-email">${user.email}</td>
            <td>
              <span class="user-role role-${user.role}">${this.capitalizeFirstLetter(user.role)}</span>
            </td>
            <td class="user-joined">${formattedDate}</td>
            <td>
              <span class="user-status status-active"></span>
              Active
            </td>
            <td class="user-actions">
              <button class="action-btn view-btn" data-user-id="${user._id}" title="View Details">
                <i class="ri-eye-line"></i>
              </button>
              <button class="action-btn edit-btn" data-user-id="${user._id}" data-user-name="${userName}" data-user-email="${user.email}" data-user-role="${user.role}" data-user-initial="${userInitial}" title="Edit Role">
                <i class="ri-user-settings-line"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');
      
      // Attach event listeners to action buttons
      this.attachUserActionListeners();
      
    } catch (error) {
      console.error("Error loading users:", error);
      const tableBody = document.getElementById("usersTableBody");
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="error-table">Error loading users: ${error.message}</td>
        </tr>
      `;
    }
  }

  /**
   * Update the pagination UI elements
   */
  updatePaginationUI() {
    const paginationInfo = document.getElementById("paginationInfo");
    if (paginationInfo) {
      paginationInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    }
    
    const prevPageBtn = document.getElementById("prevPageBtn");
    if (prevPageBtn) {
      prevPageBtn.disabled = this.currentPage <= 1;
    }
    
    const nextPageBtn = document.getElementById("nextPageBtn");
    if (nextPageBtn) {
      nextPageBtn.disabled = this.currentPage >= this.totalPages;
    }
  }

  /**
   * Attach event listeners to user action buttons
   */
  attachUserActionListeners() {
    // View user details
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
      button.addEventListener('click', () => {
        const userId = button.getAttribute('data-user-id');
        this.viewUserDetails(userId);
      });
    });
    
    // Edit user role
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(button => {
      button.addEventListener('click', () => {
        const userId = button.getAttribute('data-user-id');
        const userName = button.getAttribute('data-user-name');
        const userEmail = button.getAttribute('data-user-email');
        const userRole = button.getAttribute('data-user-role');
        const userInitial = button.getAttribute('data-user-initial');
        
        this.openEditRoleModal(userId, userName, userEmail, userRole, userInitial);
      });
    });
  }

  /**
   * Apply filters and reload users
   */
  applyFilters() {
    const roleFilter = document.getElementById("roleFilter");
    const searchFilter = document.getElementById("searchFilter");
    
    this.filters = {
      role: roleFilter ? roleFilter.value : "",
      search: searchFilter ? searchFilter.value : ""
    };
    
    // Reset to first page when applying filters
    this.currentPage = 1;
    this.loadUsers();
  }

  /**
   * Reset filters and reload users
   */
  resetFilters() {
    const roleFilter = document.getElementById("roleFilter");
    const searchFilter = document.getElementById("searchFilter");
    
    if (roleFilter) roleFilter.value = "";
    if (searchFilter) searchFilter.value = "";
    
    this.filters = {
      role: "",
      search: ""
    };
    
    // Reset to first page when resetting filters
    this.currentPage = 1;
    this.loadUsers();
  }

  /**
   * View user details in a modal
   */
  async viewUserDetails(userId) {
    try {
      // Show modal with loading state
      const modal = document.getElementById("userDetailsModal");
      const modalContent = document.getElementById("userDetailsContent");
      
      if (modal && modalContent) {
        modal.classList.add("show");
        modalContent.innerHTML = `<div class="loading-indicator">Loading user details...</div>`;
        
        // Fetch user details
        const response = await fetch(`${this.baseUrl}/admin/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch user details");
        }
        
        const userData = await response.json();
        const user = userData.user;
        const activity = userData.activity;
        
        // Format date
        const joinedDate = new Date(user.createdAt);
        const formattedJoinedDate = joinedDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
        
        // Get user initial
        const userInitial = user.firstName ? user.firstName.charAt(0) : '?';
        
        // Format activity items
        const formatActivityItems = (items, type) => {
          if (!items || items.length === 0) {
            return `<p>No ${type} found.</p>`;
          }
          
          return items.slice(0, 5).map(item => {
            const itemDate = new Date(item.createdAt);
            const formattedDate = itemDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
            
            if (type === 'listings') {
              return `
                <div class="activity-item">
                  <div class="activity-icon listing">
                    <i class="ri-store-2-line"></i>
                  </div>
                  <div class="activity-content">
                    <h5 class="activity-title">${item.name}</h5>
                    <p class="activity-date">${formattedDate}</p>
                  </div>
                  <span class="activity-status status-${item.status}">${this.capitalizeFirstLetter(item.status)}</span>
                </div>
              `;
            } else {
              // Orders
              return `
                <div class="activity-item">
                  <div class="activity-icon order">
                    <i class="ri-shopping-cart-2-line"></i>
                  </div>
                  <div class="activity-content">
                    <h5 class="activity-title">${item.listing ? item.listing.name : 'Unknown Item'}</h5>
                    <p class="activity-date">${formattedDate}</p>
                  </div>
                  <span class="activity-status status-${item.status}">${this.capitalizeFirstLetter(item.status)}</span>
                </div>
              `;
            }
          }).join('');
        };
        
        // Render user details
        modalContent.innerHTML = `
          <div class="user-header">
            <div class="user-avatar-large">${userInitial}</div>
            <div class="user-header-info">
              <h3>${user.firstName} ${user.lastName}</h3>
              <p>${user.email}</p>
              <span class="user-role role-${user.role}">${this.capitalizeFirstLetter(user.role)}</span>
            </div>
          </div>
          
          <div class="user-details-grid">
            <div class="user-detail-section">
              <h4>Personal Information</h4>
              <div class="detail-row">
                <div class="detail-label">User ID:</div>
                <div class="detail-value">${user._id}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Joined:</div>
                <div class="detail-value">${formattedJoinedDate}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Username:</div>
                <div class="detail-value">${user.username || 'N/A'}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Phone:</div>
                <div class="detail-value">${user.phoneNumber || 'N/A'}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Address:</div>
                <div class="detail-value">${user.address || 'N/A'}</div>
              </div>
            </div>
            
            <div class="user-detail-section">
              <h4>Activity Summary</h4>
              <div class="user-stats">
                <div class="stat-box">
                  <div class="stat-value">${activity.listings.count}</div>
                  <p class="stat-label">Listings</p>
                </div>
                <div class="stat-box">
                  <div class="stat-value">${activity.ordersAsRenter.count}</div>
                  <p class="stat-label">Orders as Renter</p>
                </div>
                <div class="stat-box">
                  <div class="stat-value">${activity.ordersAsOwner.count}</div>
                  <p class="stat-label">Orders as Owner</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="user-detail-section">
            <h4>Recent Listings</h4>
            <div class="activity-list">
              ${formatActivityItems(activity.listings.items, 'listings')}
            </div>
          </div>
          
          <div class="user-detail-section">
            <h4>Recent Orders</h4>
            <div class="activity-list">
              ${formatActivityItems(activity.ordersAsRenter.items, 'orders')}
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error("Error viewing user details:", error);
      
      const modalContent = document.getElementById("userDetailsContent");
      if (modalContent) {
        modalContent.innerHTML = `
          <div class="error-message">
            <i class="ri-error-warning-line"></i>
            <p>Error loading user details: ${error.message}</p>
          </div>
        `;
      }
    }
  }

  /**
   * Open the edit role modal
   */
  openEditRoleModal(userId, userName, userEmail, userRole, userInitial) {
    const modal = document.getElementById("editUserRoleModal");
    const userInfoElement = document.getElementById("editUserInfo");
    const userRoleSelect = document.getElementById("userRole");
    
    if (modal && userInfoElement && userRoleSelect) {
      // Store current user being edited
      this.currentEditUser = {
        id: userId,
        name: userName,
        email: userEmail,
        role: userRole
      };
      
      // Set user info in modal
      userInfoElement.innerHTML = `
        <div class="user-info-avatar">${userInitial}</div>
        <div class="user-info-details">
          <h4>${userName}</h4>
          <p>${userEmail}</p>
        </div>
      `;
      
      // Set current role in select
      userRoleSelect.value = userRole;
      
      // Show modal
      modal.classList.add("show");
    }
  }

  /**
   * Close the edit role modal
   */
  closeEditRoleModal() {
    const modal = document.getElementById("editUserRoleModal");
    if (modal) {
      modal.classList.remove("show");
      this.currentEditUser = null;
    }
  }

  /**
   * Save user role changes
   */
  async saveUserRole() {
    try {
      if (!this.currentEditUser) {
        this.showToast("No user selected", "error");
        return;
      }
      
      const userRoleSelect = document.getElementById("userRole");
      const roleChangeNote = document.getElementById("roleChangeNote");
      
      if (!userRoleSelect) {
        this.showToast("Role selection not found", "error");
        return;
      }
      
      const newRole = userRoleSelect.value;
      const note = roleChangeNote ? roleChangeNote.value : "";
      
      // If role hasn't changed, just close the modal
      if (newRole === this.currentEditUser.role) {
        this.closeEditRoleModal();
        return;
      }
      
      // Show loading state
      const saveRoleBtn = document.getElementById("saveRoleBtn");
      const originalBtnText = saveRoleBtn.innerHTML;
      saveRoleBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Saving...';
      saveRoleBtn.disabled = true;
      
      // Send role update request
      const response = await fetch(`${this.baseUrl}/admin/users/${this.currentEditUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          role: newRole,
          note: note
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to update user role");
      }
      
      const result = await response.json();
      
      // Close modal and reload users
      this.closeEditRoleModal();
      this.loadUsers();
      
      // Show success message
      this.showToast(`User role updated to ${this.capitalizeFirstLetter(newRole)}`, "success");
      
    } catch (error) {
      console.error("Error saving user role:", error);
      this.showToast(`Error: ${error.message}`, "error");
    } finally {
      // Reset button state
      const saveRoleBtn = document.getElementById("saveRoleBtn");
      if (saveRoleBtn) {
        saveRoleBtn.innerHTML = 'Save Changes';
        saveRoleBtn.disabled = false;
      }
    }
  }

  /**
   * Close all modals
   */
  closeAllModals() {
    const modals = document.querySelectorAll(".modal");
    modals.forEach(modal => {
      modal.classList.remove("show");
    });
    
    // Reset current edit user
    this.currentEditUser = null;
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

// Initialize the admin users manager when the page loads
document.addEventListener("DOMContentLoaded", () => {
  window.adminUsers = new AdminUsersManager();
});
