class UserListingsManager {
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");

    this.initializeManager();
  }

  initializeManager() {
    this.setupModalInteractions();
    this.checkAuthStatus();
    this.fetchUserListings();
  }

    checkAuthStatus() {
        const token = this.getToken();
        const userActions = document.querySelector('.user-actions');
        const addItemBtn = document.getElementById("addItemBtn");
        if (addItemBtn) {
         addItemBtn.style.display = "block"; // "Add Item" button is always visible
    } 
        if (token) {
            // User is logged in - fetch profile data
            fetch(`${this.baseUrl}/profile`, {  // This URL should match your backend route
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => {
                if (!response.ok) {
                    console.error('Profile response error:', response.status);
                    throw new Error(`Failed to fetch profile: ${response.status}`);
                }
                return response.json();
            })
            .then(userData => {
                console.log('Profile data received:', userData);
                
                // Store user data for use elsewhere in the app
                this.userData = userData;
                
                // Create profile UI with actual user data
                if (userActions) {
                  userActions.innerHTML = `
                  <div class="user-profile-dropdown">
                      <button class="profile-button">
                          ${userData.profileImage 
                              ? `<img src="${userData.profileImage}" alt="Profile" class="avatar-img">` 
                              : userData.firstName 
                                  ? `<div class="avatar-initial">${userData.firstName[0]}</div>`
                                  : `<i class="ri-user-line profile-icon"></i>`
                          }
                          <span class="username">${userData.firstName || 'Profile'}</span>
                          <i class="ri-arrow-down-s-line"></i>
                      </button>
                      <div class="dropdown-menu">
                          <a href="favorite.html"><i class="ri-heart-3-line"></i> My Favorites</a>
                          <a href="./item.html"><i class="ri-shopping-bag-3-line"></i> My Items</a>
                          <a href="my-orders.html"><i class="ri-shopping-cart-2-line"></i> My Orders</a>
                          <a href="my-requests.html"><i class="ri-file-list-3-line"></i> My Requests</a>
                          <div class="dropdown-divider"></div>
                          <a href="#" onclick="favoritesManager.logout()"><i class="ri-logout-box-r-line"></i> Logout</a>
                      </div>
                  </div>
              `;
                    
                    this.setupDropdownListeners();
                }
            })
            .catch(error => {
                console.error('Profile fetch error:', error);
                
                if (userActions) {
                    userActions.innerHTML = `
                        <div class="user-profile-dropdown">
                            <button class="profile-button">
                                <div class="avatar-initial">U</div>
                                <span class="username">Profile</span>
                                <i class="ri-arrow-down-s-line"></i>
                            </button>
                            <div class="dropdown-menu">
                                <a href="./item.html"><i class="ri-shopping-bag-line"></i> My Items</a>
                                <a href="my-orders.html"><i class="ri-shopping-cart-line"></i> My Orders</a>
                                 <a href="favorite.html"><i class="ri-heart-line"></i> My Favorites</a>
                                <a href="my-requests.html"><i class="ri-file-list-line"></i> My Requests</a>
                                <div class="dropdown-divider"></div>
                                <a href="#" onclick="userListingsManager.logout()"><i class="ri-logout-box-line"></i> Logout</a>
                            </div>
                        </div>
                    `;
                    
                    this.setupDropdownListeners();
                }
            });
        } else {
            // User not logged in - show login/signup buttons
            if (userActions) {
                userActions.innerHTML = `
                    <button class="btn btn-login" onclick="redirectToLogin()">Login</button>
                    <button class="btn btn-signup" onclick="redirectToSignup()">Sign Up</button>
                `;
            }
        }
    }

// Extract the dropdown setup logic to avoid duplication
setupDropdownListeners() {
    const profileButton = document.querySelector('.profile-button');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    
    if (profileButton && dropdownMenu) {
        // Remove any existing listeners first to avoid duplicates
        profileButton.removeEventListener('click', this.toggleDropdown);
        
        // Define the toggle function
        this.toggleDropdown = (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        };
        
        // Add the listener
        profileButton.addEventListener('click', this.toggleDropdown);
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
        });
    }
}


  setupModalInteractions() {
    const addItemBtn = document.getElementById("addItemBtn");
    const addItemModal = document.getElementById("addItemModal");
    const closeModal = document.getElementById("closeModal");
    const editItemForm = document.getElementById("editItemForm");
    const closeEditModal = document.getElementById("closeEditModal");

    if (addItemBtn) {
      addItemBtn.addEventListener("click", () => this.handleAddItemClick());
    }

    if (closeModal) {
      closeModal.addEventListener("click", () => this.closeAddItemModal());
    }

    if (closeEditModal) {
      closeEditModal.addEventListener("click", () => this.closeEditModal());
    }

    if (editItemForm) {
      editItemForm.addEventListener("submit", (e) => this.handleEditItem(e));
    }

    // Close modal when clicking outside
    if (addItemModal) {
      addItemModal.addEventListener("click", (e) => {
        if (e.target === addItemModal) {
          this.closeAddItemModal();
        }
      });
    }

    // Setup form submission
    const listItemForm = document.querySelector(".item-listing-form");
    if (listItemForm) {
      listItemForm.addEventListener("submit", (e) => this.handleItemListing(e));
    }

    // File upload handler
    const fileUpload = document.querySelector(
      '.file-upload input[type="file"]'
    );
    if (fileUpload) {
      fileUpload.addEventListener("change", (e) => this.handleFileUpload(e));
    }
  }

  handleFileUpload(event) {
    const files = event.target.files;
    const fileUploadSpan = document.querySelector(".file-upload span");

    if (files.length > 0) {
      fileUploadSpan.textContent = `${files.length} file(s) selected`;
      fileUploadSpan.classList.add("files-selected");
    } else {
      fileUploadSpan.textContent = "Drag & Drop or Click to Upload";
      fileUploadSpan.classList.remove("files-selected");
    }
  }

  async fetchUserListings() {
    const token = this.getToken();
    const listingsContainer = document.getElementById("userListingsContainer");

    if (!token || !listingsContainer) return;

    // Show loading state
    listingsContainer.innerHTML = `
         <div class="loading-container">
             <div class="loading-spinner"></div>
             <p>Loading your listings...</p>
         </div>
     `;

    try {
      console.log("Fetching user listings with token:", token);

      const response = await fetch(`${this.baseUrl}/listings/user`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const listings = await response.json();
        console.log("Retrieved listings:", listings);

        if (Array.isArray(listings) && listings.length > 0) {
            this.renderListings(listings, listingsContainer, true);
          } else {
            listingsContainer.innerHTML = `
              <div class="no-listings">
                <img src="./empty-box.png" alt="No listings" class="empty-icon">
                <p class="no-listings-message">You don't have any listings yet.</p>
                <p class="add-item-hint">Click the button to start adding items <span class="pointing-arrow">↖</span></p>
              </div>
            `;
            
            // Make the Add New Item button pulse/glow to draw attention
            const addButton = document.getElementById('addItemBtn');
            if (addButton) {
              addButton.classList.add('pulse-attention');
              
              // Remove the attention-grabbing effect after 10 seconds
              setTimeout(() => {
                addButton.classList.remove('pulse-attention');
              }, 10000);
            }
          }
      } else {
        // Try parsing error response
        try {
          const errorData = await response.json();
          console.error("API error:", errorData);
          listingsContainer.innerHTML = `
                     <div class="error-container">
                         <p>Failed to fetch your listings: ${
                           errorData.message || "Unknown error"
                         }</p>
                         <button class="btn btn-retry" onclick="userListingsManager.fetchUserListings()">Try Again</button>
                     </div>
                 `;
        } catch (parseError) {
          console.error("Error parsing API response:", parseError);
          listingsContainer.innerHTML = `
                     <div class="error-container">
                         <p>Failed to fetch your listings. Server returned status: ${response.status}</p>
                         <button class="btn btn-retry" onclick="userListingsManager.fetchUserListings()">Try Again</button>
                     </div>
                 `;
        }
      }
    } catch (error) {
      console.error("Error fetching user listings:", error);
      listingsContainer.innerHTML = `
             <div class="error-container">
                 <p>Error connecting to server. Please check your connection and try again.</p>
                 <p class="error-details">${error.message}</p>
                 <button class="btn btn-retry" onclick="userListingsManager.fetchUserListings()">Try Again</button>
             </div>
         `;
    }
  }

  renderListings(listings, container, isUserListings = true) {
    if (!container) return;

    // Clean up any existing carousels
    this.cleanUpListingCarousels();

    if (listings.length > 0) {
      container.innerHTML = listings
        .map((listing) => {
          // Ensure images are properly formatted with the full URL
          const images =
            listing.images && listing.images.length > 0
              ? listing.images.map((img) =>
                  typeof img === "string" ? img : img.url
                )
              : ["./pets.jpeg"]; // Use default image if no images available

          return `
             <div class="listing-card" data-id="${listing._id}">
                 <div class="listing-image">
                     ${images
                       .map(
                         (imageUrl, index) => `
                         <img 
                             src="${imageUrl}" 
                             alt="${listing.name} - Image ${index + 1}" 
                             loading="lazy"
                             style="display: ${index === 0 ? "block" : "none"};"
                             onerror="this.onerror=null; this.src='./pets.jpeg';"
                         >
                     `
                       )
                       .join("")}
                     ${
                       images.length > 1
                         ? `
                         <div class="image-controls">
                             <button class="prev-img" onclick="userListingsManager.prevImage('${listing._id}')">
                                 <i class="ri-arrow-left-s-line"></i>
                             </button>
                             <span class="image-counter">1/${images.length}</span>
                             <button class="next-img" onclick="userListingsManager.nextImage('${listing._id}')">
                                 <i class="ri-arrow-right-s-line"></i>
                             </button>
                         </div>
                     `
                         : ""
                     }
                 </div>
                 <div class="listing-details">
                     <h3>${listing.name}</h3>
                     <p class="listing-category">
                         <span class="category-icon"><i class="ri-price-tag-3-line"></i></span>
                         ${listing.category}
                     </p>
                     <p class="listing-price">
                         <span class="price-icon"><i class="ri-money-dollar-circle-line"></i></span>
                         $${listing.rentalRate}/day
                     </p>
                     <p class="listing-description">${listing.description}</p>
                     <div class="listing-actions">
                         <button class="btn btn-edit" onclick="userListingsManager.openEditModal('${
                           listing._id
                         }')">
                             <i class="ri-edit-line"></i> Edit
                         </button>
                         <button class="btn btn-delete" onclick="userListingsManager.deleteListing('${
                           listing._id
                         }')">
                             <i class="ri-delete-bin-line"></i> Delete
                         </button>
                     </div>
                 </div>
             </div>
             `;
        })
        .join("");

      // Setup image carousel after rendering
      this.setupManualCarousel();
    } else {
        container.innerHTML = `
          <div class="no-listings">
            <img src="./empty-box.png" alt="No listings" class="empty-icon">
            <p class="no-listings-message">You don't have any listings yet.</p>
            <p class="add-item-hint">Click the button above to start adding items <span class="pointing-arrow">↑</span></p>
          </div>
        `;
        
        // Make the Add New Item button pulse/glow to draw attention
        const addButton = document.getElementById('addItemBtn');
        if (addButton) {
          addButton.classList.add('pulse-attention');
          
          // Remove the attention-grabbing effect after 10 seconds
          setTimeout(() => {
            addButton.classList.remove('pulse-attention');
          }, 10000);
        }
      }
  }

  setupManualCarousel() {
    // This method is kept for compatibility but implementation moved to nextImage/prevImage methods
  }

  nextImage(listingId) {
    const card = document.querySelector(
      `.listing-card[data-id="${listingId}"]`
    );
    if (!card) return;

    const images = card.querySelectorAll(".listing-image img");
    if (images.length <= 1) return;

    let currentIndex = -1;

    // Find current visible image index
    images.forEach((img, index) => {
      if (img.style.display === "block") {
        currentIndex = index;
      }
    });

    // Hide current image
    if (currentIndex >= 0) {
      images[currentIndex].style.display = "none";
    }

    // Show next image
    const nextIndex = (currentIndex + 1) % images.length;
    images[nextIndex].style.display = "block";

    // Update counter
    const counter = card.querySelector(".image-counter");
    if (counter) {
      counter.textContent = `${nextIndex + 1}/${images.length}`;
    }
  }

  prevImage(listingId) {
    const card = document.querySelector(
      `.listing-card[data-id="${listingId}"]`
    );
    if (!card) return;

    const images = card.querySelectorAll(".listing-image img");
    if (images.length <= 1) return;

    let currentIndex = -1;

    // Find current visible image index
    images.forEach((img, index) => {
      if (img.style.display === "block") {
        currentIndex = index;
      }
    });

    // Hide current image
    if (currentIndex >= 0) {
      images[currentIndex].style.display = "none";
    }

    // Show previous image
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    images[prevIndex].style.display = "block";

    // Update counter
    const counter = card.querySelector(".image-counter");
    if (counter) {
      counter.textContent = `${prevIndex + 1}/${images.length}`;
    }
  }

  cleanUpListingCarousels() {
    const container = document.getElementById("userListingsContainer");
    if (!container) return;

    const listingCards = container.querySelectorAll(".listing-card");

    listingCards.forEach((card) => {
      const intervalId = card.dataset.carouselInterval;
      if (intervalId) {
        clearInterval(intervalId);
      }
    });
  }

  handleAddItemClick() {
    const token = this.getToken();

    if (!token) {
      this.showAuthRedirectModal();
    } else {
      const addItemModal = document.getElementById("addItemModal");
      if (addItemModal) {
        addItemModal.classList.remove("hidden");
      }
    }
  }

  async handleItemListing(event) {
    event.preventDefault();
    const token = this.getToken();

    if (!token) {
      alert("Please log in to add a listing");
      return;
    }

    const form = event.target;
    const nameInput = form.querySelector(
      'input[placeholder="Enter item name"]'
    );
    const categorySelect = form.querySelector("select");
    const rentalRateInput = form.querySelector(
      'input[placeholder="Enter price per day"]'
    );
    const descriptionTextarea = form.querySelector("textarea");
    const fileInput = form.querySelector('input[type="file"]');

    // Validation checks
    if (!nameInput.value.trim()) {
      alert("Please enter an item name");
      nameInput.focus();
      return;
    }

    const rentalRate = Number(rentalRateInput.value);
    if (isNaN(rentalRate) || rentalRate <= 0) {
      alert("Please enter a valid rental rate (must be a positive number)");
      rentalRateInput.focus();
      return;
    }

    // Show loading overlay
    const loader = this.showLoadingIndicator();

    const formData = new FormData();

    // Append the listing data to the formData object
    formData.append("name", nameInput.value.trim());
    formData.append("category", categorySelect.value);
    formData.append("rentalRate", rentalRate);
    formData.append("description", descriptionTextarea.value.trim());

    // Append images (if any)
    if (fileInput.files.length > 0) {
      Array.from(fileInput.files).forEach((file) =>
        formData.append("images", file)
      );
    }

    try {
      console.log("Submitting form data with token:", token);

      const response = await fetch(`${this.baseUrl}/listings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData, // Send the formData directly without JSON stringification
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const newListing = await response.json();
        console.log("New listing created:", newListing);

        await this.fetchUserListings();
        this.closeAddItemModal();
        form.reset();
        this.showMessage("Listing added successfully");
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Failed to add listing");
      }
    } catch (error) {
      console.error("Failed to add listing:", error);
      alert("Failed to add listing. Please try again.");
    } finally {
      loader.remove();
    }
  }

  async openEditModal(listingId) {
    const token = this.getToken();
    if (!token) {
      this.showAuthRedirectModal();
      return;
    }

    const loader = this.showLoadingIndicator();

    try {
      const response = await fetch(`${this.baseUrl}/listings/${listingId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch listing details");
      }

      const listing = await response.json();

      // Clear any existing removed images
      const removedImagesInput = document.getElementById("removedImages");
      if (removedImagesInput) {
        removedImagesInput.value = "[]";
      }

      // Reset file input
      const fileInput = document.getElementById("editItemImages");
      if (fileInput) {
        fileInput.value = "";
      }

      this.populateEditForm(listing);
      this.displayCurrentImages(listing.images);
      document.getElementById("editItemModal").classList.remove("hidden");
    } catch (error) {
      this.showErrorMessage("Error fetching listing details: " + error.message);
    } finally {
      loader.remove();
    }
  }

  populateEditForm(listing) {
    const form = document.getElementById("editItemForm");
    if (!form) return;

    const fields = {
      editItemId: listing._id,
      editItemName: listing.name,
      editItemCategory: listing.category,
      editItemRate: listing.rentalRate,
      editItemDescription: listing.description,
    };

    Object.entries(fields).forEach(([id, value]) => {
      const input = form.querySelector(`#${id}`);
      if (input) input.value = value;
    });
  }

  displayCurrentImages(images) {
    const currentImagesContainer = document.getElementById("currentImages");
    if (!currentImagesContainer) return;

    if (!images || images.length === 0) {
      currentImagesContainer.innerHTML =
        '<p class="no-images">No images available</p>';
      return;
    }

    currentImagesContainer.innerHTML = images
      .map((image, index) => {
        // Clean the image path and ensure proper URL construction
        const imageUrl = typeof image === "string" ? image : image.url || "";
        return `
             <div class="current-image-container" data-image="${imageUrl}">
                 <img 
                     src="${imageUrl}" 
                     alt="Current image ${index + 1}"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                 >
                 <div class="loading-container" style="display: none;">
                     <div class="loading-spinner small"></div>
                 </div>
                 <button type="button" class="remove-image-btn" data-image="${imageUrl}" 
                         aria-label="Remove image ${index + 1}">&times;</button>
             </div>
         `;
      })
      .join("");

    // Add click handlers for remove buttons
    currentImagesContainer
      .querySelectorAll(".remove-image-btn")
      .forEach((button) => {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          this.handleImageRemoval(button.dataset.image);
        });
      });
  }

  handleImageRemoval(imagePath) {
    console.log('Attempting to remove image:', imagePath);
    // Get the input field for removed images
    const removedImagesInput = document.getElementById("removedImages");
    if (!removedImagesInput) {
      console.error("Removed images input not found");
      return;
    }

    // Parse current removed images array
    let removedImages = [];
    try {
      removedImages = JSON.parse(removedImagesInput.value || "[]");
      console.log('Current removed images before:', removedImages);
    } catch (e) {
      console.error("Error parsing removed images:", e);
      removedImages = [];
    }

    // Add the image to removed images if not already there
    try {
      // 2. Improve public_id extraction logic
      // Try multiple extraction methods
      let publicId;
      try {
          // Method 1: URL pathname
          publicId = new URL(imagePath).pathname.split("/").pop();
      } catch {
          try {
              // Method 2: Direct filename extraction
              publicId = imagePath.split("/").pop();
          } catch {
              // Method 3: Use full path
              publicId = imagePath;
          }
      }

      console.log('Extracted public_id:', publicId);

      if (!removedImages.includes(publicId)) {
          removedImages.push(publicId);
          removedImagesInput.value = JSON.stringify(removedImages);
          console.log('Updated removed images:', removedImages);
      }
  } catch (error) {
      console.error("❌ Error processing image removal:", error);
      return;
  }
    

    // Remove the image container from display
    const imageContainer = document.querySelector(
      `.current-image-container[data-image="${imagePath}"]`
  );

  if (imageContainer) {
      console.log('✅ Found image container, removing...');
      imageContainer.remove();
  } else {
      console.error('❌ Image container not found for path:', imagePath);
  }

  const currentImagesContainer = document.getElementById("currentImages");
  const remainingImages = currentImagesContainer.querySelectorAll(
      ".current-image-container"
  );

  if (currentImagesContainer && remainingImages.length === 0) {
      currentImagesContainer.innerHTML = '<p class="no-images">No images available</p>';
  }
  }

  async handleEditItem(event) {
    event.preventDefault();
    const token = this.getToken();
    if (!token) {
      this.showAuthRedirectModal();
      return;
    }

    const form = event.target;
    const listingId = form.querySelector("#editItemId")?.value.trim();

    if (!listingId) {
      this.showErrorMessage("Error: No listing ID found.");
      return;
    }

    const loader = this.showLoadingIndicator();

    try {
      // Validate form data
      const name = form.querySelector("#editItemName").value.trim();
      const category = form.querySelector("#editItemCategory").value.trim();
      const rentalRate = parseFloat(form.querySelector("#editItemRate").value);
      const description = form
        .querySelector("#editItemDescription")
        .value.trim();

      if (!name || !category || isNaN(rentalRate) || !description) {
        throw new Error("Please fill in all required fields");
      }

      const formData = new FormData();
      formData.append("name", name);
      formData.append("category", category);
      formData.append("rentalRate", rentalRate);
      formData.append("description", description);

      // Handle new image uploads
      const fileInput = form.querySelector("#editItemImages");
      if (fileInput && fileInput.files.length > 0) {
        Array.from(fileInput.files).forEach((file) => {
          if (file.size > 5 * 1024 * 1024) {
            // 5MB limit
            throw new Error("Image files must be less than 5MB");
          }
          formData.append("images", file);
        });
      }

      // Handle removed images
      const removedImagesInput = form.querySelector("#removedImages");
      if (removedImagesInput && removedImagesInput.value) {
        const removedImages = JSON.parse(removedImagesInput.value);
        if (removedImages.length > 0) {
          // Extract just the filenames if needed by your backend
          const removedFilenames = removedImages.map((url) => {
            try {
              return new URL(url).pathname.split("/").pop();
            } catch {
              return url;
            }
          });
          formData.append("removedImages", JSON.stringify(removedFilenames));
        }
      }

      const response = await fetch(`${this.baseUrl}/listings/${listingId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update listing");
      }

      // Fetch the updated listing to get the new image paths
      const updatedResponse = await fetch(
        `${this.baseUrl}/listings/${listingId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!updatedResponse.ok) {
        throw new Error("Failed to fetch updated listing");
      }

      const updatedListing = await updatedResponse.json();

      // Reset the file input and removed images
      if (fileInput) fileInput.value = "";
      if (removedImagesInput) removedImagesInput.value = "[]";

      // Update the images in the modal
      this.displayCurrentImages(updatedListing.images);

      // Refresh user listings
      await this.fetchUserListings();

      this.showMessage("Listing updated successfully");
      this.closeEditModal();
    } catch (error) {
      console.error("Error updating listing:", error);
      this.showErrorMessage(error.message || "Error updating listing");
    } finally {
      loader.remove();
    }
  }

  async deleteListing(listingId) {
    const token = this.getToken();

    if (!token) {
      alert("Please log in to delete a listing");
      return;
    }

    // Confirm deletion
    if (!confirm("Are you sure you want to delete this listing?")) {
      return;
    }

    const loader = this.showLoadingIndicator();

    try {
      const response = await fetch(`${this.baseUrl}/listings/${listingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await this.fetchUserListings();
        this.showMessage("Listing deleted successfully");
      } else {
        // Add error handling to get more information
        const errorText = await response.text();
        console.error("Delete error response:", errorText);
        this.showErrorMessage("Failed to delete listing");
      }
    } catch (error) {
      console.error("Failed to delete listing:", error);
      this.showErrorMessage("Failed to delete listing. Please try again.");
    } finally {
      loader.remove();
    }
  }

  showLoadingIndicator() {
    const loader = document.createElement("div");
    loader.className = "loading-overlay";
    loader.innerHTML = `
         <div class="loading-spinner"></div>
         <span>Processing...</span>
     `;
    document.body.appendChild(loader);
    return loader;
  }

  showMessage(message, isError = false) {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${isError ? "error" : "success"}`;
    messageElement.innerHTML = `
         <div class="message-content">
             <span class="message-icon">${isError ? "⚠️" : "✓"}</span>
             <span class="message-text">${message}</span>
         </div>
     `;
    document.body.appendChild(messageElement);

    // Add animation class after a small delay to trigger the animation
    setTimeout(() => {
      messageElement.classList.add("visible");
    }, 10);

    setTimeout(() => {
      messageElement.classList.remove("visible");
      setTimeout(() => {
        messageElement.remove();
      }, 300); // Wait for fade-out animation
    }, 3000);
  }

  showErrorMessage(message) {
    this.showMessage(message, true);
  }

  showAuthRedirectModal() {
    // Create and show authentication redirect modal
    const modalHtml = `
         <div id="authRedirectModal" class="modal auth-redirect-modal">
             <div class="modal-content">
                 <div class="modal-header">
                     <h2>Access Restricted</h2>
                     <button class="modal-close" onclick="userListingsManager.closeAuthRedirectModal()">&times;</button>
                 </div>
                 <div class="modal-body">
                     <p>You need to be logged in to manage listings.</p>
                     <div class="modal-actions">
                         <button class="btn btn-login" onclick="redirectToLogin()">Login</button>
                         <button class="btn btn-signup" onclick="redirectToSignup()">Sign Up</button>
                     </div>
                 </div>
             </div>
         </div>
     `;

    // Remove any existing modal first
    const existingModal = document.getElementById("authRedirectModal");
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML("beforeend", modalHtml);
  }

  closeAddItemModal() {
    const addItemModal = document.getElementById("addItemModal");
    if (addItemModal) {
      addItemModal.classList.add("hidden");
    }
  }

  closeEditModal() {
    const editItemModal = document.getElementById("editItemModal");
    if (editItemModal) {
      editItemModal.classList.add("hidden");
    }
  }

  closeAuthRedirectModal() {
    const modal = document.getElementById("authRedirectModal");
    if (modal) {
      modal.remove();
    }
  }

  getToken() {
    return localStorage.getItem("token");
  }

  logout() {
    localStorage.removeItem("token");
    redirectToLogin();
  }
}

function redirectToLogin() {
  window.location.href = "login.html";
}

function redirectToSignup() {
  window.location.href = "signup.html";
}

// Initialize the manager
const userListingsManager = new UserListingsManager();
