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
    this.pageSize = 12;
    
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
      if (this.filters.status) {
        queryParams.append("status", this.filters.status);
      }
      
      if (this.filters.featured) {
        queryParams.append("featured", this.filters.featured);
      }
      
      if (this.filters.search) {
        queryParams.append("search", this.filters.search);
      }
      
      const response = await fetch(`${this.baseUrl}/admin/listings?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch listings");
      }

      const data = await response.json();
      const listings = data.listings;
      
      // Update pagination info
      this.totalPages = data.pagination.pages;
      this.currentPage = data.pagination.page;
      this.updatePaginationUI();
      
      // Update listing count
      const listingCountElement = document.getElementById("listingCount");
      if (listingCountElement) {
        listingCountElement.textContent = data.pagination.total;
      }
      
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
    // View listing details
    const viewButtons = document.querySelectorAll('.view-listing-btn');
    viewButtons.forEach(button => {
      button.addEventListener('click', () => {
        const listingId = button.getAttribute('data-listing-id');
        this.viewListingDetails(listingId);
      });
    });
    
    // Edit listing status
    const editButtons = document.querySelectorAll('.edit-listing-btn');
    editButtons.forEach(button => {
      button.addEventListener('click', () => {
        const listingId = button.getAttribute('data-listing-id');
        const listingName = button.getAttribute('data-listing-name');
        const listingStatus = button.getAttribute('data-listing-status');
        const listingFeatured = button.getAttribute('data-listing-featured') === 'true';
        const listingImage = button.getAttribute('data-listing-image');
        
        this.openEditStatusModal(listingId, listingName, listingStatus, listingFeatured, listingImage);
      });
    });
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
    
    // Reset to first page when applying filters
    this.currentPage = 1;
    this.loadListings();
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
    try {
      // Show modal with loading state
      const modal = document.getElementById("listingDetailsModal");
      const modalContent = document.getElementById("listingDetailsContent");
      const viewOnSiteBtn = document.getElementById("viewOnSiteBtn");
      
      if (modal && modalContent) {
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
    const modal = document.getElementById("editListingStatusModal");
    const listingInfoElement = document.getElementById("editListingInfo");
    const listingStatusSelect = document.getElementById("listingStatus");
    const listingFeaturedCheckbox = document.getElementById("listingFeatured");
    
    if (modal && listingInfoElement && listingStatusSelect && listingFeaturedCheckbox) {
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
      
      // If nothing has changed, just close the modal
      if (newStatus === this.currentEditListing.status && newFeatured === this.currentEditListing.featured) {
        this.closeEditStatusModal();
        return;
      }
      
      // Show loading state
      const saveStatusBtn = document.getElementById("saveStatusBtn");
      const originalBtnText = saveStatusBtn.innerHTML;
      saveStatusBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Saving...';
      saveStatusBtn.disabled = true;
      
      // Send status update request
      const response = await fetch(`${this.baseUrl}/admin/listings/${this.currentEditListing.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          status: newStatus,
          featured: newFeatured
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to update listing status");
      }
      
      const result = await response.json();
      
      // Close modal and reload listings
      this.closeEditStatusModal();
      this.loadListings();
      
      // Show success message
      this.showToast(`Listing updated successfully`, "success");
      
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
