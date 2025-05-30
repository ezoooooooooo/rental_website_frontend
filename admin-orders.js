/**
 * Admin Orders Manager
 * Handles all functionality for the admin orders page
 */
class AdminOrdersManager {
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
      status: "",
      startDate: "",
      endDate: "",
      search: ""
    };
    
    // Selected orders for batch actions
    this.selectedOrders = new Set();
    
    // Initialize orders page
    this.initOrdersPage();
  }

  /**
   * Initialize the orders page
   */
  async initOrdersPage() {
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
      
      // Load orders
      await this.loadOrders();
      
      // Setup event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error("Error initializing admin orders page:", error);
      this.showToast("Error loading orders page", "error");
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
          this.loadOrders();
        }
      });
    }
    
    const nextPageBtn = document.getElementById("nextPageBtn");
    if (nextPageBtn) {
      nextPageBtn.addEventListener("click", () => {
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.loadOrders();
        }
      });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this.loadOrders();
      });
    }
    
    // Select all checkbox
    const selectAllCheckbox = document.getElementById("selectAllOrders");
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener("change", (e) => {
        this.toggleSelectAllOrders(e.target.checked);
      });
    }
    
    // Batch actions button
    const batchActionsBtn = document.getElementById("batchActionsBtn");
    if (batchActionsBtn) {
      batchActionsBtn.addEventListener("click", () => {
        this.openBatchActionsModal();
      });
    }
    
    // Batch modal buttons
    const cancelBatchBtn = document.getElementById("cancelBatchBtn");
    if (cancelBatchBtn) {
      cancelBatchBtn.addEventListener("click", () => {
        this.closeBatchActionsModal();
      });
    }
    
    const applyBatchBtn = document.getElementById("applyBatchBtn");
    if (applyBatchBtn) {
      applyBatchBtn.addEventListener("click", () => {
        this.applyBatchActions();
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
    
    // Edit order button in details modal
    const editOrderBtn = document.getElementById("editOrderBtn");
    if (editOrderBtn) {
      editOrderBtn.addEventListener("click", () => {
        const orderId = editOrderBtn.getAttribute("data-order-id");
        if (orderId) {
          window.location.href = `admin-edit-order.html?id=${orderId}`;
        }
      });
    }
  }

  /**
   * Load orders from the API
   */
  async loadOrders() {
    try {
      const tableBody = document.getElementById("ordersTableBody");
      tableBody.innerHTML = `
        <tr class="loading-row">
          <td colspan="8">Loading orders...</td>
        </tr>
      `;
      
      // Build query parameters
      let queryParams = new URLSearchParams({
        page: this.currentPage,
        limit: this.pageSize,
        sort: "-createdAt"
      });
      
      // Add filters if they exist
      if (this.filters.status) {
        queryParams.append("status", this.filters.status);
      }
      
      if (this.filters.startDate && this.filters.endDate) {
        queryParams.append("startDate", this.filters.startDate);
        queryParams.append("endDate", this.filters.endDate);
      }
      
      if (this.filters.search) {
        queryParams.append("search", this.filters.search);
      }
      
      const response = await fetch(`${this.baseUrl}/admin/orders?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      const orders = data.orders;
      
      // Update pagination info
      this.totalPages = data.pagination.pages;
      this.currentPage = data.pagination.page;
      this.updatePaginationUI();
      
      // Update order count
      const orderCountElement = document.getElementById("orderCount");
      if (orderCountElement) {
        orderCountElement.textContent = data.pagination.total;
      }
      
      // Clear selected orders when loading new data
      this.selectedOrders.clear();
      this.updateBatchActionsButton();
      
      if (orders.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="8" class="empty-table">No orders found</td>
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
            <td>
              <input type="checkbox" class="custom-checkbox order-checkbox" data-order-id="${order._id}">
            </td>
            <td class="order-id">#${shortOrderId}</td>
            <td class="order-user">
              <div class="avatar-initial">${userName.charAt(0)}</div>
              <span class="user-name">${userName}</span>
            </td>
            <td class="order-item">
              <img src="${listingImage}" alt="${listingName}" class="item-image">
              <span class="item-name">${listingName}</span>
            </td>
            <td class="order-price">$${order.totalPrice.toFixed(2)}</td>
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
      
      // Attach event listeners to action buttons and checkboxes
      this.attachOrderActionListeners();
      this.attachCheckboxListeners();
      
    } catch (error) {
      console.error("Error loading orders:", error);
      const tableBody = document.getElementById("ordersTableBody");
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="error-table">Error loading orders: ${error.message}</td>
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
   * Attach event listeners to order action buttons
   */
  attachOrderActionListeners() {
    // View order details
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
      button.addEventListener('click', () => {
        const orderId = button.getAttribute('data-order-id');
        this.viewOrderDetails(orderId);
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
   * Attach event listeners to order checkboxes
   */
  attachCheckboxListeners() {
    const orderCheckboxes = document.querySelectorAll('.order-checkbox');
    orderCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const orderId = checkbox.getAttribute('data-order-id');
        if (e.target.checked) {
          this.selectedOrders.add(orderId);
        } else {
          this.selectedOrders.delete(orderId);
        }
        this.updateBatchActionsButton();
        this.updateSelectAllCheckbox();
      });
    });
  }

  /**
   * Update the batch actions button state
   */
  updateBatchActionsButton() {
    const batchActionsBtn = document.getElementById("batchActionsBtn");
    if (batchActionsBtn) {
      batchActionsBtn.disabled = this.selectedOrders.size === 0;
    }
  }

  /**
   * Update the select all checkbox state
   */
  updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById("selectAllOrders");
    const orderCheckboxes = document.querySelectorAll('.order-checkbox');
    
    if (selectAllCheckbox && orderCheckboxes.length > 0) {
      const allChecked = Array.from(orderCheckboxes).every(checkbox => checkbox.checked);
      const someChecked = Array.from(orderCheckboxes).some(checkbox => checkbox.checked);
      
      selectAllCheckbox.checked = allChecked;
      selectAllCheckbox.indeterminate = someChecked && !allChecked;
    }
  }

  /**
   * Toggle select all orders
   */
  toggleSelectAllOrders(checked) {
    const orderCheckboxes = document.querySelectorAll('.order-checkbox');
    
    orderCheckboxes.forEach(checkbox => {
      checkbox.checked = checked;
      const orderId = checkbox.getAttribute('data-order-id');
      
      if (checked) {
        this.selectedOrders.add(orderId);
      } else {
        this.selectedOrders.delete(orderId);
      }
    });
    
    this.updateBatchActionsButton();
  }

  /**
   * Apply filters and reload orders
   */
  applyFilters() {
    const statusFilter = document.getElementById("statusFilter");
    const startDateFilter = document.getElementById("startDateFilter");
    const endDateFilter = document.getElementById("endDateFilter");
    const searchFilter = document.getElementById("searchFilter");
    
    this.filters = {
      status: statusFilter ? statusFilter.value : "",
      startDate: startDateFilter ? startDateFilter.value : "",
      endDate: endDateFilter ? endDateFilter.value : "",
      search: searchFilter ? searchFilter.value : ""
    };
    
    // Reset to first page when applying filters
    this.currentPage = 1;
    this.loadOrders();
  }

  /**
   * Reset filters and reload orders
   */
  resetFilters() {
    const statusFilter = document.getElementById("statusFilter");
    const startDateFilter = document.getElementById("startDateFilter");
    const endDateFilter = document.getElementById("endDateFilter");
    const searchFilter = document.getElementById("searchFilter");
    
    if (statusFilter) statusFilter.value = "";
    if (startDateFilter) startDateFilter.value = "";
    if (endDateFilter) endDateFilter.value = "";
    if (searchFilter) searchFilter.value = "";
    
    this.filters = {
      status: "",
      startDate: "",
      endDate: "",
      search: ""
    };
    
    // Reset to first page when resetting filters
    this.currentPage = 1;
    this.loadOrders();
  }

  /**
   * Open the batch actions modal
   */
  openBatchActionsModal() {
    const modal = document.getElementById("batchActionsModal");
    if (modal) {
      modal.classList.add("show");
      
      // Update selected orders count
      const selectedOrdersCount = document.getElementById("selectedOrdersCount");
      if (selectedOrdersCount) {
        selectedOrdersCount.textContent = this.selectedOrders.size;
      }
    }
  }

  /**
   * Close the batch actions modal
   */
  closeBatchActionsModal() {
    const modal = document.getElementById("batchActionsModal");
    if (modal) {
      modal.classList.remove("show");
    }
  }

  /**
   * Apply batch actions to selected orders
   */
  async applyBatchActions() {
    try {
      const batchStatus = document.getElementById("batchStatus").value;
      const batchNote = document.getElementById("batchNote").value;
      
      if (!batchStatus) {
        this.showToast("Please select a status", "error");
        return;
      }
      
      if (this.selectedOrders.size === 0) {
        this.showToast("No orders selected", "error");
        return;
      }
      
      // Show loading state
      const applyBatchBtn = document.getElementById("applyBatchBtn");
      const originalBtnText = applyBatchBtn.innerHTML;
      applyBatchBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Processing...';
      applyBatchBtn.disabled = true;
      
      // Prepare request data
      const requestData = {
        orderIds: Array.from(this.selectedOrders),
        status: batchStatus,
        note: batchNote
      };
      
      // Send batch update request
      const response = await fetch(`${this.baseUrl}/admin/orders/batch-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        throw new Error("Failed to update orders");
      }
      
      const result = await response.json();
      
      // Close modal and reload orders
      this.closeBatchActionsModal();
      this.loadOrders();
      
      // Show success message
      this.showToast(`Successfully updated ${this.selectedOrders.size} orders`, "success");
      
      // Reset selected orders
      this.selectedOrders.clear();
      this.updateBatchActionsButton();
      
    } catch (error) {
      console.error("Error applying batch actions:", error);
      this.showToast(`Error: ${error.message}`, "error");
    } finally {
      // Reset button state
      const applyBatchBtn = document.getElementById("applyBatchBtn");
      if (applyBatchBtn) {
        applyBatchBtn.innerHTML = '<i class="ri-check-line"></i> Apply Changes';
        applyBatchBtn.disabled = false;
      }
    }
  }

  /**
   * View order details in a modal
   */
  async viewOrderDetails(orderId) {
    try {
      // Show modal with loading state
      const modal = document.getElementById("orderDetailsModal");
      const modalContent = document.getElementById("orderDetailsContent");
      
      if (modal && modalContent) {
        modal.classList.add("show");
        modalContent.innerHTML = `<div class="loading-indicator">Loading order details...</div>`;
        
        // Set order ID for the edit button
        const editOrderBtn = document.getElementById("editOrderBtn");
        if (editOrderBtn) {
          editOrderBtn.setAttribute("data-order-id", orderId);
        }
        
        // Fetch order details
        const response = await fetch(`${this.baseUrl}/admin/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch order details");
        }
        
        const order = await response.json();
        
        // Format dates
        const createdDate = new Date(order.createdAt);
        const startDate = new Date(order.startDate);
        const endDate = new Date(order.endDate);
        
        const formatDate = (date) => {
          return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });
        };
        
        // Render order details
        modalContent.innerHTML = `
          <div class="order-details-grid">
            <div class="order-detail-section">
              <h4>Order Information</h4>
              <div class="detail-row">
                <div class="detail-label">Order ID:</div>
                <div class="detail-value">${order._id}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Created:</div>
                <div class="detail-value">${formatDate(createdDate)}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Status:</div>
                <div class="detail-value">
                  <span class="order-status status-${order.status.toLowerCase()}">${this.capitalizeFirstLetter(order.status)}</span>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Payment Status:</div>
                <div class="detail-value">
                  <span class="order-status status-${order.paymentStatus.toLowerCase()}">${this.capitalizeFirstLetter(order.paymentStatus)}</span>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Total Price:</div>
                <div class="detail-value">$${order.totalPrice.toFixed(2)}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Rental Period:</div>
                <div class="detail-value">${formatDate(startDate)} to ${formatDate(endDate)}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Rental Days:</div>
                <div class="detail-value">${order.rentalDays} days</div>
              </div>
            </div>
            
            <div class="order-detail-section">
              <h4>User Information</h4>
              <div class="detail-row">
                <div class="detail-label">Renter:</div>
                <div class="detail-value">${order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Unknown User'}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Email:</div>
                <div class="detail-value">${order.user ? order.user.email : 'N/A'}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Owner:</div>
                <div class="detail-value">${order.owner ? `${order.owner.firstName} ${order.owner.lastName}` : 'Unknown Owner'}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Owner Email:</div>
                <div class="detail-value">${order.owner ? order.owner.email : 'N/A'}</div>
              </div>
            </div>
          </div>
          
          <div class="order-detail-section">
            <h4>Item Details</h4>
            <div class="order-item-card">
              <div class="item-image-container">
                <img src="${order.listing && order.listing.images && order.listing.images.length > 0 ? order.listing.images[0] : 'https://via.placeholder.com/80'}" alt="${order.listing ? order.listing.name : 'Unknown Item'}">
              </div>
              <div class="item-details">
                <h5 class="item-name">${order.listing ? order.listing.name : 'Unknown Item'}</h5>
                <p class="item-price">$${order.listing ? order.listing.rentalRate : '0'}/day</p>
                <p class="item-dates">${formatDate(startDate)} - ${formatDate(endDate)}</p>
              </div>
            </div>
          </div>
          
          <div class="order-detail-section">
            <h4>Order Timeline</h4>
            <div class="order-timeline">
              <div class="timeline-item">
                <div class="timeline-date">${formatDate(createdDate)}</div>
                <div class="timeline-content">
                  <div class="timeline-title">Order Created</div>
                  <p class="timeline-description">Order was placed by ${order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Unknown User'}</p>
                </div>
              </div>
              
              ${order.status !== 'pending' ? `
              <div class="timeline-item">
                <div class="timeline-date">${formatDate(new Date())}</div>
                <div class="timeline-content">
                  <div class="timeline-title">Status Updated</div>
                  <p class="timeline-description">Order status changed to ${this.capitalizeFirstLetter(order.status)}</p>
                </div>
              </div>
              ` : ''}
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error("Error viewing order details:", error);
      
      const modalContent = document.getElementById("orderDetailsContent");
      if (modalContent) {
        modalContent.innerHTML = `
          <div class="error-message">
            <i class="ri-error-warning-line"></i>
            <p>Error loading order details: ${error.message}</p>
          </div>
        `;
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

// Initialize the admin orders manager when the page loads
document.addEventListener("DOMContentLoaded", () => {
  window.adminOrders = new AdminOrdersManager();
});
