/**
 * Admin Listings Manager
 * Handles all functionality for the admin listings page
 */
class AdminListingsManager {
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");
    this.userId = localStorage.getItem("userId");
    
    // Pagination state
    this.currentPage = 1;
    this.totalPages = 1;
    this.pageSize = 10000; // Very high limit to ensure all listings are shown, especially when filtering
    
    // Filter state
    this.filters = {
      status: "",
      featured: "",
      search: ""
    };
    
    // View mode (grid or list)
    this.viewMode = "grid";
    
    // Current listing being edited
    this.currentEditListing = null;
    
    // Current main image in details modal
    this.currentMainImage = 0;
    
    // Initialize listings page
    this.initListingsPage();
  }

  /**
   * Initialize the listings page
   */
  async initListingsPage() {
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
      
      // Load listings
      await this.loadListings();
      
      // Setup event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error("Error initializing admin listings page:", error);
      this.showToast("Error loading listings page", "error");
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
    
    // Auto-apply filters when dropdowns change
    const statusFilter = document.getElementById("statusFilter");
    if (statusFilter) {
      statusFilter.addEventListener("change", () => {
        console.log('Status filter changed to:', statusFilter.value);
        this.applyFilters();
      });
    }
    
    const featuredFilter = document.getElementById("featuredFilter");
    if (featuredFilter) {
      featuredFilter.addEventListener("change", () => {
        console.log('Featured filter changed to:', featuredFilter.value);
        this.applyFilters();
      });
    }
    
    // Auto-apply search filter with debounce
    const searchFilter = document.getElementById("searchFilter");
    if (searchFilter) {
      let searchTimeout;
      searchFilter.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          console.log('Search filter changed to:', searchFilter.value);
          this.applyFilters();
        }, 500);
      });
    }
    
    // View toggle buttons
    const gridViewBtn = document.getElementById("gridViewBtn");
    const listViewBtn = document.getElementById("listViewBtn");
    
    if (gridViewBtn && listViewBtn) {
      gridViewBtn.addEventListener("click", () => {
        this.switchViewMode("grid");
      });
      
      listViewBtn.addEventListener("click", () => {
        this.switchViewMode("list");
      });
    }
    
    // Pagination buttons
    const prevPageBtn = document.getElementById("prevPageBtn");
    const prevPageBtnBottom = document.getElementById("prevPageBtnBottom");
    if (prevPageBtn && prevPageBtnBottom) {
      prevPageBtn.addEventListener("click", () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.loadListings();
        }
      });
      
      prevPageBtnBottom.addEventListener("click", () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.loadListings();
        }
      });
    }
    
    const nextPageBtn = document.getElementById("nextPageBtn");
    const nextPageBtnBottom = document.getElementById("nextPageBtnBottom");
    if (nextPageBtn && nextPageBtnBottom) {
      nextPageBtn.addEventListener("click", () => {
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.loadListings();
        }
      });
      
      nextPageBtnBottom.addEventListener("click", () => {
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.loadListings();
        }
      });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this.loadListings();
      });
    }
    
    // Edit status modal buttons
    const cancelStatusEditBtn = document.getElementById("cancelStatusEditBtn");
    if (cancelStatusEditBtn) {
      cancelStatusEditBtn.addEventListener("click", () => {
        this.closeEditStatusModal();
      });
    }
    
    const saveStatusBtn = document.getElementById("saveStatusBtn");
    if (saveStatusBtn) {
      saveStatusBtn.addEventListener("click", () => {
        this.saveListingStatus();
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
   * Load listings from the API
   */
  async loadListings() {
    console.log('🔄 Loading listings...');
    console.log('📋 Current filters:', this.filters);
    console.log('📄 Page info - Current:', this.currentPage, 'Size:', this.pageSize);
    try {
      const gridContainer = document.getElementById("listingsGridView");
      const tableBody = document.getElementById("listingsTableBody");
      
      if (gridContainer) {
        gridContainer.innerHTML = `<div class="loading-indicator">Loading listings...</div>`;
      }
      
      if (tableBody) {
        tableBody.innerHTML = `
          <tr class="loading-row">
            <td colspan="7">Loading listings...</td>
          </tr>
        `;
      }
      
      // Build query parameters
      let queryParams = new URLSearchParams({
        page: this.currentPage,
        limit: this.pageSize,
        sort: "-createdAt"
      });
      
      // Add filters if they exist
              // NOTE: Using client-side filtering instead of backend filtering
        // to ensure all available listings are shown when filtering
        /*
        if (this.filters.status) {
          queryParams.append("status", this.filters.status);
        }
        
        if (this.filters.featured) {
          queryParams.append("featured", this.filters.featured);
        }
        
        if (this.filters.search) {
          queryParams.append("search", this.filters.search);
        }
        */
        
        console.log('🔧 Final query params:', Object.fromEntries(queryParams));
        console.log('🌐 Query string:', queryParams.toString());
      
      // Try multiple possible endpoints for listings
      const listingsEndpoints = [
        `${this.baseUrl}/admin/listings`,
        `${this.baseUrl}/listings`,
        `${this.baseUrl}/admin/listings/all`,
        `${this.baseUrl}/listings/admin`
      ];

      let response = null;
      let data = null;
      let endpoint = '';

      for (const listingEndpoint of listingsEndpoints) {
        try {
          console.log(`Trying listings endpoint: ${listingEndpoint}?${queryParams.toString()}`);
          response = await fetch(`${listingEndpoint}?${queryParams.toString()}`, {
            headers: {
              Authorization: `Bearer ${this.token}`
            }
          });

          if (response.ok) {
            data = await response.json();
            endpoint = listingEndpoint;
            console.log(`Successfully fetched listings from: ${endpoint}`, data);
          console.log(`📊 Listings count: ${data.listings ? data.listings.length : 'No listings array'}`);
            break;
          } else {
            console.log(`Failed ${listingEndpoint}: ${response.status} ${response.statusText}`);
          }
        } catch (err) {
          console.log(`Error fetching from ${listingEndpoint}:`, err.message);
        }
      }

      if (!response || !response.ok) {
        throw new Error("Failed to fetch listings from all available endpoints");
      }

      // Handle different API response formats
      let listings = [];
      if (Array.isArray(data)) {
        listings = data;
      } else if (Array.isArray(data.listings)) {
        listings = data.listings;
      } else if (Array.isArray(data.data)) {
        listings = data.data;
      } else {
        console.warn("Unexpected API response format:", data);
        listings = [];
      }

      // Store all listings for client-side filtering
      this.allListings = listings;
      
      // Apply client-side filtering
      listings = this.applyClientSideFilters(listings);

      console.log(`Loaded ${listings.length} listings from ${endpoint}`);
      
      // Update pagination info safely
      if (data.pagination) {
        this.totalPages = data.pagination.pages || data.pagination.totalPages || 1;
        this.currentPage = data.pagination.page || data.pagination.currentPage || 1;
        
        // Update listing count
        const listingCountElement = document.getElementById("listingCount");
        if (listingCountElement) {
          listingCountElement.textContent = data.pagination.total || data.pagination.totalCount || listings.length;
        }
      } else {
        // No pagination info, assume single page
        this.totalPages = 1;
        this.currentPage = 1;
        
        const listingCountElement = document.getElementById("listingCount");
        if (listingCountElement) {
          listingCountElement.textContent = listings.length;
        }
      }
      
      this.updatePaginationUI();
      
      if (listings.length === 0) {
        if (gridContainer) {
          gridContainer.innerHTML = `<div class="empty-listings">No listings found</div>`;
        }
        
        if (tableBody) {
          tableBody.innerHTML = `
            <tr>
              <td colspan="7" class="empty-table">No listings found</td>
            </tr>
          `;
        }
        return;
      }
      
      // Render grid view
      if (gridContainer) {
        gridContainer.innerHTML = listings.map(listing => {
          // Get image
          const imageUrl = listing.images && listing.images.length > 0 
            ? (listing.images[0].url || listing.images[0]) 
            : 'https://via.placeholder.com/300x180?text=No+Image';
          
          // Get owner initial
          const ownerName = listing.owner ? `${listing.owner.firstName} ${listing.owner.lastName}` : 'Unknown Owner';
          const ownerInitial = listing.owner && listing.owner.firstName ? listing.owner.firstName.charAt(0) : '?';
          
          return `
            <div class="listing-card">
              <div class="listing-image-container">
                <img src="${imageUrl}" alt="${listing.name}" class="listing-image">
                <div class="listing-status-badge status-${listing.status}">${this.capitalizeFirstLetter(listing.status)}</div>
                ${listing.featured ? `<div class="listing-featured-badge"><i class="ri-star-fill"></i> Featured</div>` : ''}
              </div>
              <div class="listing-content">
                <h3 class="listing-title">${listing.name}</h3>
                <p class="listing-price">$${listing.rentalRate}/day</p>
                <div class="listing-owner">
                  <div class="owner-avatar">${ownerInitial}</div>
                  <span class="owner-name">${ownerName}</span>
                </div>
                <div class="listing-actions">
                  <button class="listing-action-btn view-listing-btn" data-listing-id="${listing._id}" title="View Details">
                    <i class="ri-eye-line"></i>
                  </button>
                  <button class="listing-action-btn edit-listing-btn" data-listing-id="${listing._id}" data-listing-name="${listing.name}" data-listing-status="${listing.status}" data-listing-featured="${listing.featured}" data-listing-image="${imageUrl}" title="Edit Status">
                    <i class="ri-edit-line"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
      
      // Render table view
      if (tableBody) {
        tableBody.innerHTML = listings.map(listing => {
          // Get image
          const imageUrl = listing.images && listing.images.length > 0 
            ? (listing.images[0].url || listing.images[0]) 
            : 'https://via.placeholder.com/50x50?text=No+Image';
          
          // Get owner initial
          const ownerName = listing.owner ? `${listing.owner.firstName} ${listing.owner.lastName}` : 'Unknown Owner';
          const ownerInitial = listing.owner && listing.owner.firstName ? listing.owner.firstName.charAt(0) : '?';
          
          return `
            <tr>
              <td class="listing-image-cell">
                <img src="${imageUrl}" alt="${listing.name}" class="listing-image-thumb">
              </td>
              <td class="listing-name-cell">
                <span class="listing-name">${listing.name}</span>
              </td>
              <td class="listing-owner-cell">
                <div class="owner-avatar">${ownerInitial}</div>
                <span class="owner-name">${ownerName}</span>
              </td>
              <td class="listing-price-cell">$${listing.rentalRate}/day</td>
              <td class="listing-status-cell">
                <span class="listing-status status-${listing.status}">${this.capitalizeFirstLetter(listing.status)}</span>
              </td>
              <td class="listing-featured-cell">
                ${listing.featured 
                  ? `<span class="featured-indicator" title="Featured"><i class="ri-star-fill"></i></span>` 
                  : `<span class="not-featured-indicator" title="Not Featured"><i class="ri-star-line"></i></span>`}
              </td>
              <td class="listing-actions-cell">
                <button class="listing-action-btn view-listing-btn" data-listing-id="${listing._id}" title="View Details">
                  <i class="ri-eye-line"></i>
                </button>
                <button class="listing-action-btn edit-listing-btn" data-listing-id="${listing._id}" data-listing-name="${listing.name}" data-listing-status="${listing.status}" data-listing-featured="${listing.featured}" data-listing-image="${imageUrl}" title="Edit Status">
                  <i class="ri-edit-line"></i>
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
      
      // Attach event listeners to action buttons
      this.attachListingActionListeners();
      
    } catch (error) {
      console.error("Error loading listings:", error);
      
      const gridContainer = document.getElementById("listingsGridView");
      const tableBody = document.getElementById("listingsTableBody");
      
      if (gridContainer) {
        gridContainer.innerHTML = `<div class="error-listings">Error loading listings: ${error.message}</div>`;
      }
      
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" class="error-table">Error loading listings: ${error.message}</td>
          </tr>
        `;
      }
    }
  }

  /**
   * Apply client-side filtering to listings array
   */
  applyClientSideFilters(listings) {
    console.log('🔍 Applying client-side filters to', listings.length, 'listings');
    console.log('📋 Current filters:', this.filters);
    
    let filteredListings = [...listings]; // Create a copy
    
    // Filter by status
    if (this.filters.status && this.filters.status !== "") {
      filteredListings = filteredListings.filter(listing => 
        listing.status === this.filters.status
      );
      console.log(`📊 After status filter (${this.filters.status}):`, filteredListings.length, 'listings');
    }
    
    // Filter by featured
    if (this.filters.featured && this.filters.featured !== "") {
      const featuredValue = this.filters.featured === "true";
      filteredListings = filteredListings.filter(listing => 
        listing.featured === featuredValue
      );
      console.log(`⭐ After featured filter (${this.filters.featured}):`, filteredListings.length, 'listings');
    }
    
    // Filter by search term
    if (this.filters.search && this.filters.search !== "") {
      const searchTerm = this.filters.search.toLowerCase();
      filteredListings = filteredListings.filter(listing => 
        listing.name.toLowerCase().includes(searchTerm) ||
        (listing.description && listing.description.toLowerCase().includes(searchTerm)) ||
        (listing.category && listing.category.toLowerCase().includes(searchTerm))
      );
      console.log(`🔎 After search filter (${this.filters.search}):`, filteredListings.length, 'listings');
    }
    
    console.log('✅ Final filtered count:', filteredListings.length);
    return filteredListings;
  }

  /**
   * Render listings using client-side filtering
   */
  renderFilteredListings() {
    console.log('🎨 Rendering filtered listings...');
    
    // Apply filters to cached listings
    const filteredListings = this.applyClientSideFilters(this.allListings);
    
    // Update listing count
    const listingCountElement = document.getElementById("listingCount");
    if (listingCountElement) {
      listingCountElement.textContent = filteredListings.length;
    }
    
    // Render the filtered listings
    const gridContainer = document.getElementById("listingsGridView");
    const tableBody = document.getElementById("listingsTableBody");
    
    if (filteredListings.length === 0) {
      if (gridContainer) {
        gridContainer.innerHTML = `<div class="empty-listings">No listings match the current filters</div>`;
      }
      
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" class="empty-table">No listings match the current filters</td>
          </tr>
        `;
      }
      return;
    }
    
    // Render grid view
    if (gridContainer) {
      gridContainer.innerHTML = filteredListings.map(listing => {
        // Get image
        const imageUrl = listing.images && listing.images.length > 0 
          ? (listing.images[0].url || listing.images[0]) 
          : 'https://via.placeholder.com/300x180?text=No+Image';
        
        // Get owner initial
        const ownerName = listing.owner ? `${listing.owner.firstName} ${listing.owner.lastName}` : 'Unknown Owner';
        const ownerInitial = listing.owner && listing.owner.firstName ? listing.owner.firstName.charAt(0) : '?';
        
        return `
          <div class="listing-card">
            <div class="listing-image-container">
              <img src="${imageUrl}" alt="${listing.name}" class="listing-image">
              <div class="listing-status-badge status-${listing.status}">${this.capitalizeFirstLetter(listing.status)}</div>
              ${listing.featured ? `<div class="listing-featured-badge"><i class="ri-star-fill"></i> Featured</div>` : ''}
            </div>
            <div class="listing-content">
              <h3 class="listing-title">${listing.name}</h3>
              <p class="listing-price">$${listing.rentalRate}/day</p>
              <div class="listing-owner">
                <div class="owner-avatar">${ownerInitial}</div>
                <span class="owner-name">${ownerName}</span>
              </div>
              <div class="listing-actions">
                <button class="listing-action-btn view-listing-btn" data-listing-id="${listing._id}" title="View Details">
                  <i class="ri-eye-line"></i>
                </button>
                <button class="listing-action-btn edit-listing-btn" data-listing-id="${listing._id}" data-listing-name="${listing.name}" data-listing-status="${listing.status}" data-listing-featured="${listing.featured}" data-listing-image="${imageUrl}" title="Edit Status">
                  <i class="ri-edit-line"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
    
    // Render table view
    if (tableBody) {
      tableBody.innerHTML = filteredListings.map(listing => {
        // Get image
        const imageUrl = listing.images && listing.images.length > 0 
          ? (listing.images[0].url || listing.images[0]) 
          : 'https://via.placeholder.com/50x50?text=No+Image';
        
        // Get owner initial
        const ownerName = listing.owner ? `${listing.owner.firstName} ${listing.owner.lastName}` : 'Unknown Owner';
        const ownerInitial = listing.owner && listing.owner.firstName ? listing.owner.firstName.charAt(0) : '?';
        
        return `
          <tr>
            <td class="listing-image-cell">
              <img src="${imageUrl}" alt="${listing.name}" class="listing-image-thumb">
            </td>
            <td class="listing-name-cell">
              <span class="listing-name">${listing.name}</span>
            </td>
            <td class="listing-owner-cell">
              <div class="owner-avatar">${ownerInitial}</div>
              <span class="owner-name">${ownerName}</span>
            </td>
            <td class="listing-price-cell">$${listing.rentalRate}/day</td>
            <td class="listing-status-cell">
              <span class="listing-status status-${listing.status}">${this.capitalizeFirstLetter(listing.status)}</span>
            </td>
            <td class="listing-featured-cell">
              ${listing.featured 
                ? `<span class="featured-indicator" title="Featured"><i class="ri-star-fill"></i></span>` 
                : `<span class="not-featured-indicator" title="Not Featured"><i class="ri-star-line"></i></span>`}
            </td>
            <td class="listing-actions-cell">
              <button class="listing-action-btn view-listing-btn" data-listing-id="${listing._id}" title="View Details">
                <i class="ri-eye-line"></i>
              </button>
              <button class="listing-action-btn edit-listing-btn" data-listing-id="${listing._id}" data-listing-name="${listing.name}" data-listing-status="${listing.status}" data-listing-featured="${listing.featured}" data-listing-image="${imageUrl}" title="Edit Status">
                <i class="ri-edit-line"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
    
    // Attach event listeners to action buttons
    this.attachListingActionListeners();
  }

  /**
   * Update the pagination UI elements
   */
  updatePaginationUI() {
    const paginationInfo = document.getElementById("paginationInfo");
    const paginationInfoBottom = document.getElementById("paginationInfoBottom");
    
    if (paginationInfo) {
      paginationInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    }
    
    if (paginationInfoBottom) {
      paginationInfoBottom.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    }
    
    const prevPageBtn = document.getElementById("prevPageBtn");
    const prevPageBtnBottom = document.getElementById("prevPageBtnBottom");
    
    if (prevPageBtn) {
      prevPageBtn.disabled = this.currentPage <= 1;
    }
    
    if (prevPageBtnBottom) {
      prevPageBtnBottom.disabled = this.currentPage <= 1;
    }
    
    const nextPageBtn = document.getElementById("nextPageBtn");
    const nextPageBtnBottom = document.getElementById("nextPageBtnBottom");
    
    if (nextPageBtn) {
      nextPageBtn.disabled = this.currentPage >= this.totalPages;
    }
    
    if (nextPageBtnBottom) {
      nextPageBtnBottom.disabled = this.currentPage >= this.totalPages;
    }
  }

  /**
   * Switch between grid and list view modes
   */
  switchViewMode(mode) {
    this.viewMode = mode;
    
    const gridViewBtn = document.getElementById("gridViewBtn");
    const listViewBtn = document.getElementById("listViewBtn");
    const gridView = document.getElementById("listingsGridView");
    const tableView = document.getElementById("listingsTableView");
    
    if (mode === "grid") {
      gridViewBtn.classList.add("active");
      listViewBtn.classList.remove("active");
      gridView.style.display = "grid";
      tableView.style.display = "none";
    } else {
      gridViewBtn.classList.remove("active");
      listViewBtn.classList.add("active");
      gridView.style.display = "none";
      tableView.style.display = "block";
    }
  }

  /**
   * Attach event listeners to listing action buttons
   */
  attachListingActionListeners() {
    console.log('Attaching listing action listeners...');
    
    // View listing details
    const viewButtons = document.querySelectorAll('.view-listing-btn');
    console.log(`Found ${viewButtons.length} view buttons`);
    
    viewButtons.forEach((button, index) => {
      // Remove existing listeners by cloning the button
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      
      newButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('View button clicked!', index);
        
        const listingId = newButton.getAttribute('data-listing-id');
        console.log('Viewing listing:', listingId);
        this.viewListingDetails(listingId);
      });
    });
    
    // Edit listing status
    const editButtons = document.querySelectorAll('.edit-listing-btn');
    console.log(`Found ${editButtons.length} edit buttons`);
    
    editButtons.forEach((button, index) => {
      // Remove existing listeners by cloning the button
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      
      newButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Edit button clicked!', index);
        
        const listingId = newButton.getAttribute('data-listing-id');
        const listingName = newButton.getAttribute('data-listing-name');
        const listingStatus = newButton.getAttribute('data-listing-status');
        const listingFeatured = newButton.getAttribute('data-listing-featured') === 'true';
        const listingImage = newButton.getAttribute('data-listing-image');
        
        console.log('Editing listing:', { listingId, listingName, listingStatus, listingFeatured });
        this.openEditStatusModal(listingId, listingName, listingStatus, listingFeatured, listingImage);
      });
    });
    
    console.log('Listing action listeners attached successfully');
  }

  /**
   * Apply filters and reload listings
   */
  applyFilters() {
    const statusFilter = document.getElementById("statusFilter");
    const featuredFilter = document.getElementById("featuredFilter");
    const searchFilter = document.getElementById("searchFilter");
    
    this.filters = {
      status: statusFilter ? statusFilter.value : "",
      featured: featuredFilter ? featuredFilter.value : "",
      search: searchFilter ? searchFilter.value : ""
    };
    
    console.log('🔄 Applied filters:', this.filters);
    
    // Reset to first page when applying filters
    this.currentPage = 1;
    
    // Use client-side filtering if we have all listings loaded
    if (this.allListings && this.allListings.length > 0) {
      console.log('🎯 Using client-side filtering with', this.allListings.length, 'total listings');
      this.renderFilteredListings();
    } else {
      console.log('📡 No cached listings, loading from API');
      this.loadListings();
    }
  }

  /**
   * Reset filters and reload listings
   */
  resetFilters() {
    const statusFilter = document.getElementById("statusFilter");
    const featuredFilter = document.getElementById("featuredFilter");
    const searchFilter = document.getElementById("searchFilter");
    
    if (statusFilter) statusFilter.value = "";
    if (featuredFilter) featuredFilter.value = "";
    if (searchFilter) searchFilter.value = "";
    
    this.filters = {
      status: "",
      featured: "",
      search: ""
    };
    
    // Reset to first page when resetting filters
    this.currentPage = 1;
    this.loadListings();
  }

  /**
   * View listing details in a modal
   */
  async viewListingDetails(listingId) {
    console.log('viewListingDetails called with:', listingId);
    try {
      // Show modal with loading state
      const modal = document.getElementById("listingDetailsModal");
      const modalContent = document.getElementById("listingDetailsContent");
      const viewOnSiteBtn = document.getElementById("viewOnSiteBtn");
      
      console.log('Modal elements found:', { modal: !!modal, modalContent: !!modalContent, viewOnSiteBtn: !!viewOnSiteBtn });
      
      if (modal && modalContent) {
        console.log('Adding show class to modal');
        modal.classList.add("show");
        modalContent.innerHTML = `<div class="loading-indicator">Loading listing details...</div>`;
        
        // Fetch listing details
        const response = await fetch(`${this.baseUrl}/listings/${listingId}`, {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch listing details");
        }
        
        const listing = await response.json();
        
        // Set view on site button URL
        if (viewOnSiteBtn) {
          viewOnSiteBtn.href = `item-detail.html?id=${listingId}`;
        }
        
        // Format dates
        const createdDate = new Date(listing.createdAt);
        const formattedCreatedDate = createdDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
        
        // Get owner info
        const ownerName = listing.owner ? `${listing.owner.firstName} ${listing.owner.lastName}` : 'Unknown Owner';
        
        // Get images
        const images = listing.images && listing.images.length > 0 
          ? listing.images.map(img => img.url || img) 
          : ['https://via.placeholder.com/400x250?text=No+Image'];
        
        // Reset current main image
        this.currentMainImage = 0;
        
        // Render listing details
        modalContent.innerHTML = `
          <div class="listing-header">
            <div class="listing-gallery">
              <img src="${images[0]}" alt="${listing.name}" class="listing-main-image" id="listingMainImage">
              <div class="listing-thumbnails">
                ${images.map((img, index) => `
                  <img src="${img}" alt="${listing.name}" class="listing-thumbnail" data-index="${index}">
                `).join('')}
              </div>
            </div>
            <div class="listing-header-info">
              <h3>${listing.name}</h3>
              <p class="listing-price-large">$${listing.rentalRate}/day</p>
              <div>
                <span class="listing-status-large status-${listing.status}">${this.capitalizeFirstLetter(listing.status)}</span>
                ${listing.featured ? `<span class="listing-featured-large"><i class="ri-star-fill"></i> Featured</span>` : ''}
              </div>
              <div class="detail-row">
                <div class="detail-label">Owner:</div>
                <div class="detail-value">${ownerName}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Category:</div>
                <div class="detail-value">${listing.category || 'N/A'}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Created:</div>
                <div class="detail-value">${formattedCreatedDate}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">ID:</div>
                <div class="detail-value">${listing._id}</div>
              </div>
            </div>
          </div>
          
          <div class="listing-detail-section">
            <h4>Description</h4>
            <div class="listing-description">
              ${listing.description || 'No description provided.'}
            </div>
          </div>
        `;
        
        // Add thumbnail click event listeners
        const thumbnails = document.querySelectorAll('.listing-thumbnail');
        const mainImage = document.getElementById('listingMainImage');
        
        thumbnails.forEach(thumbnail => {
          thumbnail.addEventListener('click', () => {
            const index = parseInt(thumbnail.getAttribute('data-index'));
            this.currentMainImage = index;
            mainImage.src = images[index];
            
            // Highlight the selected thumbnail
            thumbnails.forEach(thumb => thumb.style.opacity = '0.6');
            thumbnail.style.opacity = '1';
          });
        });
        
        // Highlight the first thumbnail
        if (thumbnails.length > 0) {
          thumbnails[0].style.opacity = '1';
        }
      }
    } catch (error) {
      console.error("Error viewing listing details:", error);
      
      const modalContent = document.getElementById("listingDetailsContent");
      if (modalContent) {
        modalContent.innerHTML = `
          <div class="error-message">
            <i class="ri-error-warning-line"></i>
            <p>Error loading listing details: ${error.message}</p>
          </div>
        `;
      }
    }
  }

  /**
   * Open the edit status modal
   */
  openEditStatusModal(listingId, listingName, listingStatus, listingFeatured, listingImage) {
    console.log('openEditStatusModal called with:', { listingId, listingName, listingStatus, listingFeatured, listingImage });
    
    const modal = document.getElementById("editListingStatusModal");
    const listingInfoElement = document.getElementById("editListingInfo");
    const listingStatusSelect = document.getElementById("listingStatus");
    const listingFeaturedCheckbox = document.getElementById("listingFeatured");
    
    console.log('Edit modal elements found:', { 
      modal: !!modal, 
      listingInfoElement: !!listingInfoElement, 
      listingStatusSelect: !!listingStatusSelect, 
      listingFeaturedCheckbox: !!listingFeaturedCheckbox 
    });
    
    if (modal && listingInfoElement && listingStatusSelect && listingFeaturedCheckbox) {
      console.log('Opening edit modal...');
      // Store current listing being edited
      this.currentEditListing = {
        id: listingId,
        name: listingName,
        status: listingStatus,
        featured: listingFeatured
      };
      
      // Set listing info in modal
      listingInfoElement.innerHTML = `
        <img src="${listingImage}" alt="${listingName}" class="listing-info-image">
        <div class="listing-info-details">
          <h4>${listingName}</h4>
          <p>ID: ${listingId.substring(listingId.length - 6)}</p>
        </div>
      `;
      
      // Set current status in select
      listingStatusSelect.value = listingStatus;
      
      // Set featured checkbox
      listingFeaturedCheckbox.checked = listingFeatured;
      
      // Show modal
      modal.classList.add("show");
    }
  }

  /**
   * Close the edit status modal
   */
  closeEditStatusModal() {
    const modal = document.getElementById("editListingStatusModal");
    if (modal) {
      modal.classList.remove("show");
      this.currentEditListing = null;
    }
  }

  /**
   * Save listing status changes
   */
  async saveListingStatus() {
    try {
      if (!this.currentEditListing) {
        this.showToast("No listing selected", "error");
        return;
      }
      
      const listingStatusSelect = document.getElementById("listingStatus");
      const listingFeaturedCheckbox = document.getElementById("listingFeatured");
      
      if (!listingStatusSelect || !listingFeaturedCheckbox) {
        this.showToast("Form elements not found", "error");
        return;
      }
      
      const newStatus = listingStatusSelect.value;
      const newFeatured = listingFeaturedCheckbox.checked;
      
      // If nothing has changed, provide feedback and close the modal
      if (newStatus === this.currentEditListing.status && newFeatured === this.currentEditListing.featured) {
        this.showToast("No changes detected", "info");
        this.closeEditStatusModal();
        return;
      }
      
      // Show loading state
      const saveStatusBtn = document.getElementById("saveStatusBtn");
      const originalBtnText = saveStatusBtn.innerHTML;
      saveStatusBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Saving...';
      saveStatusBtn.disabled = true;
      
      // Send status update request using the exact API specification
      const requestBody = {};
      
      // Only include fields that have changed or are being updated
      if (newStatus !== this.currentEditListing.status) {
        requestBody.status = newStatus;
      }
      
      if (newFeatured !== this.currentEditListing.featured) {
        requestBody.featured = newFeatured;
      }
      
      const response = await fetch(`${this.baseUrl}/admin/listings/${this.currentEditListing.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update listing status (${response.status})`);
      }
      
      const result = await response.json();
      console.log('Listing update response:', result);
      
      // Close modal and reload listings
      this.closeEditStatusModal();
      this.loadListings();
      
      // Show success message using the response message or default
      const successMessage = result.message || `Listing updated successfully`;
      this.showToast(successMessage, "success");
      
    } catch (error) {
      console.error("Error saving listing status:", error);
      this.showToast(`Error: ${error.message}`, "error");
    } finally {
      // Reset button state
      const saveStatusBtn = document.getElementById("saveStatusBtn");
      if (saveStatusBtn) {
        saveStatusBtn.innerHTML = 'Save Changes';
        saveStatusBtn.disabled = false;
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
    
    // Reset current edit listing
    this.currentEditListing = null;
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

// Initialize the admin listings manager when the page loads
document.addEventListener("DOMContentLoaded", () => {
  window.adminListings = new AdminListingsManager();
});
