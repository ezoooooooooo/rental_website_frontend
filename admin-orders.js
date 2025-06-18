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
    
    // Store loaded orders data for view/edit operations
    this.ordersData = new Map();
    
    // Initialize orders page
    this.init();
  }

  /**
   * Initialize the admin orders page
   */
  async init() {
    console.log("Initializing Admin Orders...");
    
    // Check authentication
    if (!this.token) {
      console.log("No token found, redirecting to login");
      window.location.href = 'login.html';
      return;
    }

    // Load admin profile
    await this.loadAdminProfile();
    
    // Update current date display
    this.updateCurrentDate();
    
    // Check for URL parameters (status filter from dashboard)
    const urlParams = new URLSearchParams(window.location.search);
    const statusFilter = urlParams.get('status');
    
    if (statusFilter) {
      // Set the status filter dropdown
      const statusSelect = document.getElementById('statusFilter');
      if (statusSelect) {
        statusSelect.value = statusFilter;
        this.filters.status = statusFilter;
      }
    }

    // Load orders
    await this.loadOrders();
    
    // Attach event listeners
    this.attachEventListeners();
    
    // Test: temporarily enable batch actions button for debugging
    setTimeout(() => {
      const testBtn = document.getElementById('batchActionsBtn');
      if (testBtn) {
        console.log('Testing batch actions button...');
        testBtn.disabled = false;
        testBtn.style.opacity = '1';
        testBtn.style.pointerEvents = 'auto';
        testBtn.style.cursor = 'pointer';
      }
    }, 2000);
    
    // Setup modal close functionality
    this.setupModalHandlers();
    
    console.log("Admin Orders initialized successfully");
  }

  /**
   * Update the current date display
   */
  updateCurrentDate() {
    const currentDateElement = document.getElementById("currentDate");
    if (currentDateElement) {
      const now = new Date();
      const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      currentDateElement.textContent = now.toLocaleDateString('en-US', options);
    }
  }

  /**
   * Load admin profile from multiple possible endpoints
   */
  async loadAdminProfile() {
    const profileEndpoints = [
      `${this.baseUrl}/auth/me`,
      `${this.baseUrl}/auth/profile`,
      `${this.baseUrl}/users/me`,
      `${this.baseUrl}/profile`,
      `${this.baseUrl}/users/profile`,
      `${this.baseUrl}/user/profile`
    ];

    for (const endpoint of profileEndpoints) {
      try {
        console.log("Trying profile endpoint:", endpoint);
        
        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        });

        if (response.ok) {
          const profile = await response.json();
          console.log("Profile loaded successfully from:", endpoint);
          this.setupAdminProfileUI(profile);
          return;
        }
      } catch (error) {
        console.log(`Failed to load profile from ${endpoint}:`, error.message);
        continue;
      }
    }

    console.log("All profile endpoints failed, using fallback");
    this.setupAdminProfileUI(null);
  }

  /**
   * Setup admin profile UI
   */
  setupAdminProfileUI(profile) {
    const adminProfileElement = document.getElementById("adminProfile");
    if (!adminProfileElement) return;

    const adminName = profile?.firstName 
      ? `${profile.firstName} ${profile.lastName || ''}`.trim()
      : profile?.name || "Admin User";
    
    const adminRole = profile?.role || "Administrator";
    const adminAvatar = profile?.profileImage || profile?.avatar;
    const adminInitial = adminName.charAt(0).toUpperCase();

    adminProfileElement.innerHTML = `
      <div class="admin-avatar">
        ${adminAvatar 
          ? `<img src="${adminAvatar}" alt="${adminName}" />` 
          : `<div class="avatar-initial">${adminInitial}</div>`}
      </div>
      <div class="admin-info">
        <span class="admin-name">${adminName}</span>
        <span class="admin-role">${adminRole}</span>
      </div>
      <i class="ri-arrow-down-s-line"></i>
      <div class="dropdown-menu">
        <a href="home.html"><i class="ri-home-line"></i> Main Site</a>
        <div class="dropdown-divider"></div>
        <a href="#" id="logoutBtn"><i class="ri-logout-box-r-line"></i> Logout</a>
      </div>
    `;

    // Set up dropdown functionality
    const dropdownMenu = adminProfileElement.querySelector(".dropdown-menu");
    
    adminProfileElement.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
      if (!adminProfileElement.contains(e.target)) {
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

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.loadOrders();
      });
    }
    
    // Search functionality
    const searchInput = document.getElementById('searchFilter');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
          this.filters.search = e.target.value;
          this.loadOrders();
        }, 500);
      });
    }
    
    // Date filters
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    
    if (startDateFilter) {
      startDateFilter.addEventListener('change', (e) => {
        this.filters.startDate = e.target.value;
        this.loadOrders();
      });
    }
    
    if (endDateFilter) {
      endDateFilter.addEventListener('change', (e) => {
        this.filters.endDate = e.target.value;
        this.loadOrders();
      });
    }
    
    // Batch actions button
    const batchActionsBtn = document.getElementById('batchActionsBtn');
    if (batchActionsBtn) {
      // Remove any existing listeners first
      const newBtn = batchActionsBtn.cloneNode(true);
      batchActionsBtn.parentNode.replaceChild(newBtn, batchActionsBtn);
      
      // Add fresh event listener
      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Batch actions button clicked!');
        
        if (newBtn.disabled) {
          console.log('Button is disabled, not opening modal');
          this.showToast('Please select at least one order first', 'warning');
          return;
        }
        
        this.openBatchActionsModal();
      });
      
      // Also add a test click handler
      newBtn.addEventListener('mousedown', () => {
        console.log('Button mousedown event triggered');
      });
    }
    
    // Apply batch actions button
    const applyBatchBtn = document.getElementById('applyBatchBtn');
    if (applyBatchBtn) {
      applyBatchBtn.addEventListener('click', () => {
        this.applyBatchActions();
      });
    }
    
    // Select all checkbox
    const selectAllCheckbox = document.getElementById('selectAllOrders');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        this.toggleSelectAllOrders(e.target.checked);
      });
    }
  }

  /**
   * Load orders from the API
   */
  async loadOrders() {
    // Try multiple possible endpoints for orders
    const ordersEndpoints = [
      `${this.baseUrl}/admin/orders`,
      `${this.baseUrl}/orders`,
      `${this.baseUrl}/admin/orders/all`,
      `${this.baseUrl}/orders/admin`,
      `${this.baseUrl}/rentals`,
      `${this.baseUrl}/admin/rentals`
    ];

    for (const endpoint of ordersEndpoints) {
      try {
        console.log("Fetching orders from:", endpoint);
        
        const response = await fetch(endpoint, {
        headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        }
      });

        console.log(`Orders API response from ${endpoint}:`, response.status);
      
      if (!response.ok) {
          console.log(`Failed ${endpoint}: ${response.status} ${response.statusText}`);
          continue;
      }

      const data = await response.json();
        console.log(`Orders data received from ${endpoint}:`, data);
      
      // Handle different API response formats
      let orders = [];
      
      if (Array.isArray(data)) {
        orders = data;
      } else if (Array.isArray(data.orders)) {
        orders = data.orders;
      } else if (Array.isArray(data.data)) {
        orders = data.data;
        } else if (data.rentals && Array.isArray(data.rentals)) {
          orders = data.rentals;
      }
        
        console.log(`Successfully loaded ${orders.length} orders from ${endpoint}`);
        
        // Clear previous selections and data
        this.selectedOrders.clear();
        this.ordersData.clear();
        
        // Store orders data for view/edit operations
        orders.forEach(order => {
          const orderId = order.id || order._id || order.orderId;
          this.ordersData.set(orderId, order);
        });
        console.log(`Stored ${this.ordersData.size} orders in memory for view/edit operations`);
        
        const ordersTableBody = document.getElementById("ordersTableBody");
        if (!ordersTableBody) return;
        
        if (!orders || orders.length === 0) {
          ordersTableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="8">
                <div class="empty-state">
                  <i class="ri-inbox-line"></i>
                  <p>No orders found</p>
                </div>
              </td>
            </tr>
          `;
            this.attachOrderActionListeners();
            this.attachCheckboxListeners();
          return;
        }
        
        ordersTableBody.innerHTML = orders.map(order => {
          // Handle different property names in API response
          const orderId = order.id || order._id || order.orderId;
          const user = order.user || order.renter || order.customer || {};
          const item = order.item || order.listing || order.product || {};
          const totalAmount = order.totalAmount || order.totalPrice || order.price || order.amount || 0;
          const status = order.status || 'pending';
          const createdAt = order.createdAt || order.date || order.orderDate || new Date().toISOString();
          const startDate = order.startDate || order.rentalStartDate || order.fromDate || '';
          const endDate = order.endDate || order.rentalEndDate || order.toDate || '';
          
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
          
          console.log("Order item image URL extracted:", imageUrl);
          
          return `
            <tr data-order-id="${orderId}">
              <td>
                <input type="checkbox" class="order-checkbox custom-checkbox" data-order-id="${orderId}">
              </td>
              <td>
                <a href="#" class="order-link" onclick="viewOrderDetails('${orderId}')">#${orderId}</a>
              </td>
              <td>
                <div class="user-info">
                  <div class="user-avatar">
                    ${user.profileImage 
                      ? `<img src="${user.profileImage}" alt="${user.firstName || 'User'}" />` 
                      : `<div class="avatar-initial">${(user.firstName || user.name || 'U')[0]}</div>`}
                  </div>
                  <div class="user-details">
                    <span class="user-name">${user.firstName || user.name || ''} ${user.lastName || ''}</span>
                    <span class="user-email">${user.email || ''}</span>
                  </div>
                </div>
              </td>
              <td>
                <div class="item-info">
                                    <div class="item-image">
                          <img src="${imageUrl}" alt="${item.name || item.title || 'Item'}" class="item-image" onerror="this.src='https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop'" />
                        </div>
                      <div class="item-details">
                        <span class="item-name">${item.name || item.title || 'Unknown Item'}</span>
                        <span class="item-category">${item.category || 'Uncategorized'}</span>
                      </div>
                    </div>
              </td>
              <td>${new Date(createdAt).toLocaleDateString()}</td>
              <td>
                ${startDate ? new Date(startDate).toLocaleDateString() : 'N/A'} - 
                ${endDate ? new Date(endDate).toLocaleDateString() : 'N/A'}
              </td>
              <td>$${totalAmount.toFixed(2)}</td>
              <td>
                <span class="status-badge ${status}-status">${this.capitalizeFirstLetter(status)}</span>
              </td>
              <td>
                <div class="actions">
                  <button class="action-btn view-btn" data-order-id="${orderId}" title="View Details">
                    <i class="ri-eye-line"></i>
                  </button>
                  <button class="action-btn edit-btn" data-order-id="${orderId}" title="Edit Order">
                    <i class="ri-edit-line"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
        
          // Attach event listeners after orders are loaded
          this.attachOrderActionListeners();
          this.attachCheckboxListeners();
          this.updateBatchActionsButton(); // Update button state
          return; // Successfully loaded orders, exit the loop
        
      } catch (error) {
          console.log(`Error loading orders from ${endpoint}:`, error.message);
          continue; // Try next endpoint
        }
    }
    
        // If all endpoints failed, show placeholder data
    console.log("All order endpoints failed, showing placeholder data");
    this.showPlaceholderOrders();
  }

  /**
   * Show placeholder orders when API fails
   */
  showPlaceholderOrders() {
    console.error("Error loading orders from all endpoints");
    this.showToast("Unable to load orders. Using placeholder data.", "warning");
    
    const ordersTableBody = document.getElementById("ordersTableBody");
    if (!ordersTableBody) return;

    const placeholderOrders = [
      {
        id: "ORD1001",
        user: { firstName: "John", lastName: "Doe", email: "john@example.com" },
        item: { 
          name: "Professional Camera Kit", 
          category: "Electronics",
          images: ["https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=400&fit=crop"]
        },
        totalAmount: 45.00,
        createdAt: new Date().toISOString(),
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending"
      },
      {
        id: "ORD1002",
        user: { firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
        item: { 
          name: "Mountain Bike", 
          category: "Sports",
          images: ["https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop"]
        },
        totalAmount: 35.00,
        createdAt: new Date().toISOString(),
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: "approved"
      },
      {
        id: "ORD1003",
        user: { firstName: "Mike", lastName: "Johnson", email: "mike@example.com" },
        item: { 
          name: "Camping Tent", 
          category: "Outdoor",
          images: ["https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=400&fit=crop"]
        },
        totalAmount: 25.00,
        createdAt: new Date().toISOString(),
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: "completed"
      }
    ];
    
    // Clear previous selections and store placeholder orders data
    this.selectedOrders.clear();
    this.ordersData.clear();
    placeholderOrders.forEach(order => {
      this.ordersData.set(order.id, order);
    });
    console.log(`Stored ${this.ordersData.size} placeholder orders in memory`);
    
    ordersTableBody.innerHTML = placeholderOrders.map(order => {
      const imageUrl = order.item.images && order.item.images.length > 0 
        ? order.item.images[0] 
        : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23cccccc%22/%3E%3C/svg%3E';
      
             return `
       <tr data-order-id="${order.id}">
         <td>
           <input type="checkbox" class="order-checkbox custom-checkbox" data-order-id="${order.id}">
         </td>
         <td>
           <a href="#" class="order-link" onclick="viewOrderDetails('${order.id}')">#${order.id}</a>
         </td>
        <td>
          <div class="user-info">
            <div class="user-avatar">
              <div class="avatar-initial">${order.user.firstName[0]}</div>
            </div>
            <div class="user-details">
              <span class="user-name">${order.user.firstName} ${order.user.lastName}</span>
              <span class="user-email">${order.user.email}</span>
            </div>
          </div>
        </td>
        <td>
          <div class="item-info">
            <div class="item-image">
              <img src="${imageUrl}" alt="${order.item.name}" class="item-image" />
            </div>
            <div class="item-details">
              <span class="item-name">${order.item.name}</span>
              <span class="item-category">${order.item.category}</span>
            </div>
          </div>
        </td>
        <td>${new Date(order.createdAt).toLocaleDateString()}</td>
        <td>
          ${new Date(order.startDate).toLocaleDateString()} - 
          ${new Date(order.endDate).toLocaleDateString()}
        </td>
        <td>$${order.totalAmount.toFixed(2)}</td>
        <td>
          <span class="status-badge ${order.status}-status">${this.capitalizeFirstLetter(order.status)}</span>
        </td>
        <td>
          <div class="actions">
          <button class="action-btn view-btn" data-order-id="${order.id}" title="View Details">
            <i class="ri-eye-line"></i>
            </button>
          <button class="action-btn edit-btn" data-order-id="${order.id}" title="Edit Order">
            <i class="ri-edit-line"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
  
    // Attach event listeners after placeholder orders are loaded
    this.attachOrderActionListeners();
    this.attachCheckboxListeners();
    this.updateBatchActionsButton(); // Update button state
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
        this.openEditOrderModal(orderId);
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
      const isDisabled = this.selectedOrders.size === 0;
      batchActionsBtn.disabled = isDisabled;
      
      // Force update the button style to make sure it's clickable
      if (!isDisabled) {
        batchActionsBtn.style.pointerEvents = 'auto';
        batchActionsBtn.style.opacity = '1';
        batchActionsBtn.style.cursor = 'pointer';
        console.log('Batch actions button enabled');
      } else {
        batchActionsBtn.style.pointerEvents = 'auto'; // Keep pointer events for warning message
        batchActionsBtn.style.opacity = '0.6';
        batchActionsBtn.style.cursor = 'not-allowed';
        console.log('Batch actions button disabled');
      }
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
    console.log('Viewing order details for:', orderId);
    
    // Show the order details modal
    const modal = document.getElementById('orderDetailsModal');
    const modalContent = document.getElementById('orderDetailsContent');
    
    console.log('Modal element found:', modal);
    console.log('Modal content element found:', modalContent);
    
    if (modal && modalContent) {
      // Show loading state
      modalContent.innerHTML = `
        <div class="loading-indicator">
          <i class="ri-loader-4-line"></i>
          <p>Loading order details...</p>
        </div>
      `;
      
      modal.classList.add('show');
      console.log('Modal should now be visible, classes:', modal.className);
      
      // Get order data from stored data
      const orderData = this.ordersData.get(orderId);
      
      if (orderData) {
        console.log('Found order data in memory:', orderData);
        
        // Extract order information with fallbacks
        const order = orderData;
        const user = order.user || order.renter || order.customer || {};
        const item = order.item || order.listing || order.product || {};
        const orderId_display = order.id || order._id || orderId;
        const status = order.status || 'pending';
        const totalAmount = order.totalAmount || order.totalPrice || order.price || order.amount || 0;
        const createdAt = order.createdAt || order.date || order.orderDate || new Date().toISOString();
        const startDate = order.startDate || order.rentalStartDate || order.fromDate || '';
        const endDate = order.endDate || order.rentalEndDate || order.toDate || '';
        const adminNote = order.adminNote || order.note || '';
        
        // Extract image URL
        let imageUrl = 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop';
        
        if (item.images && Array.isArray(item.images) && item.images.length > 0) {
          const firstImage = item.images[0];
          if (typeof firstImage === 'string') {
            imageUrl = firstImage;
          } else if (firstImage && typeof firstImage === 'object') {
            imageUrl = firstImage.url || firstImage.src || firstImage.path || firstImage.uri || imageUrl;
          }
        } else if (item.image) {
          imageUrl = item.image;
        } else if (item.thumbnail) {
          imageUrl = item.thumbnail;
        } else if (item.photo) {
          imageUrl = item.photo;
        }
        
        // Build the order details HTML with real data
        modalContent.innerHTML = `
          <div class="order-details-grid">
            <div class="order-detail-section">
              <h4>Order Information</h4>
              <div class="detail-row">
                <span class="detail-label">Order ID:</span>
                <span class="detail-value">#${orderId_display}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                  <span class="status-badge ${status}-status">${this.capitalizeFirstLetter(status)}</span>
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Order Date:</span>
                <span class="detail-value">${new Date(createdAt).toLocaleDateString()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Total Amount:</span>
                <span class="detail-value">$${totalAmount.toFixed(2)}</span>
              </div>
              ${adminNote ? `
              <div class="detail-row">
                <span class="detail-label">Admin Notes:</span>
                <span class="detail-value">${adminNote}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="order-detail-section">
              <h4>Customer Information</h4>
              <div class="detail-row">
                <span class="detail-label">Name:</span>
                <span class="detail-value">${user.firstName || user.name || 'N/A'} ${user.lastName || ''}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${user.email || 'N/A'}</span>
              </div>
            </div>
            
            <div class="order-detail-section">
              <h4>Item Details</h4>
              <div class="order-item-card">
                <div class="item-image-container">
                  <img src="${imageUrl}" alt="${item.name || item.title || 'Item'}" onerror="this.src='https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop'">
                </div>
                <div class="item-details">
                  <h5 class="item-name">${item.name || item.title || 'Unknown Item'}</h5>
                  <p class="item-price">$${(item.pricePerDay || item.price || totalAmount).toFixed(2)}/day</p>
                  <p class="item-category">${item.category || 'Uncategorized'}</p>
                  ${startDate && endDate ? `
                  <div class="item-dates">
                    <strong>Rental Period:</strong><br>
                    ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}
                  </div>
                  ` : ''}
                </div>
              </div>
            </div>
            
            <div class="order-detail-section">
              <h4>Order Timeline</h4>
              <div class="order-timeline">
                <div class="timeline-item">
                  <div class="timeline-date">${new Date(createdAt).toLocaleDateString()}</div>
                  <div class="timeline-content">
                    <h6 class="timeline-title">Order Placed</h6>
                    <p class="timeline-description">Order was successfully placed by the customer.</p>
                  </div>
                </div>
                ${order.updatedAt && order.updatedAt !== order.createdAt ? `
                <div class="timeline-item">
                  <div class="timeline-date">${new Date(order.updatedAt).toLocaleDateString()}</div>
                  <div class="timeline-content">
                    <h6 class="timeline-title">Order Updated</h6>
                    <p class="timeline-description">Order status was updated to ${this.capitalizeFirstLetter(status)}.</p>
                  </div>
                </div>
                ` : ''}
              </div>
            </div>
          </div>
        `;
        
      } else {
        console.error('Order data not found in memory for ID:', orderId);
        
        // Show error state
        modalContent.innerHTML = `
          <div class="order-details-grid">
            <div class="order-detail-section">
              <h4>Order Information</h4>
              <div class="detail-row">
                <span class="detail-label">Order ID:</span>
                <span class="detail-value">#${orderId}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                  <span class="status-badge error-status">Order data not found</span>
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Error:</span>
                <span class="detail-value" style="color: #dc3545;">Please refresh the page to reload order data.</span>
              </div>
            </div>
          </div>
        `;
      }
    } else {
      console.error('Modal or modal content not found!');
      alert(`Order Details for #${orderId}\n\nModal elements not found in DOM.`);
    }
  }

  /**
   * Open the edit order modal
   */
  async openEditOrderModal(orderId) {
    try {
      console.log("Opening edit modal for order:", orderId);
      
      // Show edit modal with loading state first
      const editModal = document.getElementById('editOrderModal');
      if (editModal) {
        editModal.classList.add('show');
        
        // Show loading state in form fields
        document.getElementById('editOrderId').value = orderId;
        document.getElementById('editOrderStatus').value = "";
        document.getElementById('editCustomerName').value = "Loading...";
        document.getElementById('editCustomerEmail').value = "Loading...";
        document.getElementById('editItemName').value = "Loading...";
        document.getElementById('editTotalPrice').value = "0.00";
        document.getElementById('editAdminNotes').value = "";
      }
      
      // Get order data from stored data
      const orderData = this.ordersData.get(orderId);
      
      if (orderData) {
        console.log('Found order data in memory for edit:', orderData);
        
        // Extract order information with fallbacks
        const order = orderData;
        const user = order.user || order.renter || order.customer || {};
        const item = order.item || order.listing || order.product || {};
        const totalAmount = order.totalAmount || order.totalPrice || order.price || order.amount || 0;
        const status = order.status || 'pending';
        const adminNote = order.adminNote || order.note || '';
        
        // Populate edit form with real data
        document.getElementById('editOrderId').value = orderId;
        document.getElementById('editOrderStatus').value = status;
        document.getElementById('editCustomerName').value = `${user.firstName || user.name || 'N/A'} ${user.lastName || ''}`.trim();
        document.getElementById('editCustomerEmail').value = user.email || 'N/A';
        document.getElementById('editItemName').value = item.name || item.title || 'Unknown Item';
        document.getElementById('editTotalPrice').value = totalAmount.toFixed(2);
        document.getElementById('editAdminNotes').value = adminNote;
        
        console.log("Edit form populated with real order data");
      } else {
        console.error('Order data not found in memory for ID:', orderId);
        
        // Populate with basic info and show warning
        document.getElementById('editOrderId').value = orderId;
        document.getElementById('editOrderStatus').value = "pending";
        document.getElementById('editCustomerName').value = "Order data not found";
        document.getElementById('editCustomerEmail').value = "Please refresh page";
        document.getElementById('editItemName').value = "Order data not found";
        document.getElementById('editTotalPrice').value = "0.00";
        document.getElementById('editAdminNotes').value = "";
        
        this.showToast("Warning: Order data not found. Please refresh the page.", "warning");
      }
      
      // Close any other open modals
      this.closeAllModals();
      
      // Show edit modal
      if (editModal) {
        editModal.classList.add('show');
      }
      
      // Store current order ID for saving
      this.currentEditOrderId = orderId;
      
    } catch (error) {
      console.error("Error opening edit modal:", error);
      this.showToast("Error opening edit form", "error");
    }
  }

  /**
   * Save order changes using the API
   */
  async saveOrderChanges() {
    try {
      if (!this.currentEditOrderId) {
        this.showToast("No order selected for editing", "error");
        return;
      }
      
      const newStatus = document.getElementById('editOrderStatus').value;
      const adminNote = document.getElementById('editAdminNotes').value;
      
      if (!newStatus) {
        this.showToast("Please select a status", "error");
        return;
      }
      
      // Show loading state
      const saveBtn = document.getElementById('saveOrderChanges');
      const originalBtnText = saveBtn.innerHTML;
      saveBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Saving...';
      saveBtn.disabled = true;
      
      // Call the API to update order status
      const response = await fetch(`${this.baseUrl}/admin/orders/${this.currentEditOrderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          status: newStatus,
          note: adminNote || undefined
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update order");
      }
      
      const result = await response.json();
      
      // Close modal and reload orders
      this.closeEditOrderModal();
      await this.loadOrders();
      
      // Show success message
      this.showToast(result.message || "Order updated successfully", "success");
      
    } catch (error) {
      console.error("Error saving order changes:", error);
      this.showToast(`Error: ${error.message}`, "error");
    } finally {
      // Reset button state
      const saveBtn = document.getElementById('saveOrderChanges');
      if (saveBtn) {
        saveBtn.innerHTML = 'Save Changes';
        saveBtn.disabled = false;
      }
    }
  }

  /**
   * Close edit order modal
   */
  closeEditOrderModal() {
    const editModal = document.getElementById('editOrderModal');
    if (editModal) {
      editModal.classList.remove('show');
    }
    this.currentEditOrderId = null;
  }

  /**
   * Setup modal close functionality
   */
  setupModalHandlers() {
    // Add event listeners for closing modals
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.closeAllModals();
      });
    });
    
    // Close modals when clicking outside
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeAllModals();
        }
      });
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  /**
   * Close all modals
   */
  closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.classList.remove('show');
    });
  }

  /**
   * Logout the admin user
   */
  logout() {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    window.location.href = 'login.html';
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

// Global functions for order actions
window.viewOrderDetails = function(orderId) {
  if (window.adminOrders) {
    window.adminOrders.viewOrderDetails(orderId);
  }
};

window.editOrder = function(orderId) {
  if (window.adminOrders) {
    window.adminOrders.openEditOrderModal(orderId);
  }
};


