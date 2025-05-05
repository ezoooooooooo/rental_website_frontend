document.addEventListener("DOMContentLoaded", async function () {
  // DOM element references
  const cartList = document.querySelector(".cart-list");
  const subtotalElement = document.getElementById("subtotal");
  const totalElement = document.getElementById("total");
  const userActions = document.querySelector(".user-actions");
  const baseUrl = "http://localhost:3000/api"; // Update with your actual base URL

  // Authentication check
  const token = localStorage.getItem("token");
  if (!token) {
    // Handle unauthenticated user
    cartList.innerHTML =
      "<div class='auth-required'><i class='fas fa-lock' style='font-size: 32px; margin-bottom: 15px; color: #cbd5e0;'></i><p>Please log in to view your cart</p></div>";
    return;
  }

  // -------------------------- PROFILE --------------------------

  /**
   * Checks authentication status and updates UI accordingly
   */
  function checkAuthStatus() {
    const addItemBtn = document.getElementById("addItemBtn");
    if (addItemBtn) {
      addItemBtn.style.display = "block"; // "Add Item" button is always visible
    }

    if (token) {
      // User is logged in - fetch profile data
      fetch(`${baseUrl}/profile`, {
        // This URL should match your backend route
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            console.error("Profile response error:", response.status);
            throw new Error(`Failed to fetch profile: ${response.status}`);
          }
          return response.json();
        })
        .then((userData) => {
          console.log("Profile data received:", userData);

          // Store user data for use elsewhere in the app
          window.userData = userData;

          // Create profile UI with actual user data
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
            <span class="username">${userData.firstName || "Profile"}</span>
            <i class="ri-arrow-down-s-line"></i>
        </button>
        <div class="dropdown-menu">
            <a href="favorite.html"><i class="ri-heart-3-line"></i> My Favorites</a>
            <a href="./item.html"><i class="ri-shopping-bag-3-line"></i> My Items</a>
            <a href="my-orders.html"><i class="ri-shopping-cart-2-line"></i> My Orders</a>
            <a href="my-requests.html"><i class="ri-file-list-3-line"></i> My Requests</a>
            <div class="dropdown-divider"></div>
            <a href="#" data-action="logout"><i class="ri-logout-box-r-line"></i> Logout</a>
        </div>
    </div>
`;

            setupDropdownListeners();
          }
        })
        .catch((error) => {
          console.error("Profile fetch error:", error);

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
                                <a href="#" onclick="logout()"><i class="ri-logout-box-line"></i> Logout</a>
                            </div>
                        </div>
                    `;

            setupDropdownListeners();
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

  /**
   * Sets up event listeners for the user profile dropdown
   */
  function setupDropdownListeners() {
    const profileButton =
      document.querySelector(".profile-button") ||
      document.querySelector(".profile-button");
    const dropdownMenu = document.querySelector(".dropdown-menu");

    if (profileButton && dropdownMenu) {
      // Define the toggle function
      const toggleDropdown = (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle("show");
      };

      // Remove any existing listeners first to avoid duplicates
      profileButton.removeEventListener("click", toggleDropdown);

      // Add the listener
      profileButton.addEventListener("click", toggleDropdown);

      // Close dropdown when clicking outside
      document.addEventListener("click", () => {
        dropdownMenu.classList.remove("show");
      });
    }
  }

  /**
   * Handles user logout
   */
  window.logout = function () {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  };

  /**
   * Redirects to login page
   */
  window.redirectToLogin = function () {
    window.location.href = "login.html";
  };

  /**
   * Redirects to signup page
   */
  window.redirectToSignup = function () {
    window.location.href = "signup.html";
  };

  window.redirectToPayment = function () {
    console.log("Button clicked");
    window.location.href = "payment.html";
  };
  // ======== UI INITIALIZATION FUNCTIONS ========

  /**
   * Creates and adds the Clear Cart button and popup to the page
   */
  function initializeCartUI() {
    // Create clear cart button
    const cartActionsDiv = document.createElement("div");
    cartActionsDiv.className = "cart-actions";
    cartActionsDiv.innerHTML = `
            <button id="clearCartBtn" class="clear-cart" aria-label="Clear cart">
                <i class="fas fa-trash-alt"></i> Clear Cart
            </button>
        `;

    // Create confirmation popup
    const popupHTML = document.createElement("div");
    popupHTML.id = "customPopup";
    popupHTML.className = "custom-popup-overlay";
    popupHTML.innerHTML = `
          <div class="custom-popup">
            <h3>Clear Shopping Cart</h3>
            <p>Are you sure you want to remove all items from your cart?</p>
            <div class="popup-buttons">
              <button id="cancelClearBtn" class="cancel-btn">Cancel</button>
              <button id="confirmClearBtn" class="confirm-btn">Clear Cart</button>
            </div>
          </div>
        `;
    document.body.appendChild(popupHTML);

    // Insert the clear cart button in the cart summary
    const cartSummary = document.querySelector(".cart-summary");
    if (cartSummary) {
      cartSummary.prepend(cartActionsDiv);
    }

    // Set up event listeners for the clear cart functionality
    setupClearCartButton();
  }

  /**
   * Sets up event listeners for the clear cart button and popup
   */
  function setupClearCartButton() {
    const clearCartBtn = document.getElementById("clearCartBtn");
    const customPopup = document.getElementById("customPopup");
    const cancelClearBtn = document.getElementById("cancelClearBtn");
    const confirmClearBtn = document.getElementById("confirmClearBtn");

    if (clearCartBtn) {
      clearCartBtn.addEventListener("click", function () {
        console.log("Clear cart button clicked");
        // Show custom popup
        customPopup.classList.add("active");
      });
    } else {
      console.error("Clear cart button not found");
    }

    // Handle cancel button
    cancelClearBtn.addEventListener("click", function () {
      customPopup.classList.remove("active");
    });

    // Handle confirm button
    confirmClearBtn.addEventListener("click", function () {
      customPopup.classList.remove("active");
      clearCartDirectly();
    });

    // Also close popup when clicking outside
    customPopup.addEventListener("click", function (e) {
      if (e.target === customPopup) {
        customPopup.classList.remove("active");
      }
    });
  }

  // ======== CART RENDERING FUNCTIONS ========

  /**
   * Renders the cart items in the DOM
   * @param {Array} items - Array of cart items to render
   */
  function renderCart(items) {
    cartList.innerHTML = ""; // Clear previous items

    if (!items || items.length === 0) {
      cartList.innerHTML =
        "<div class='empty-cart'><i class='fas fa-shopping-cart' style='font-size: 40px; margin-bottom: 15px; color: #cbd5e0;'></i><p>Your cart is empty</p></div>";
      return;
    }

    items.forEach((item) => {
      // Skip invalid items
      if (!item.listing) {
        console.error("Invalid cart item:", item);
        return;
      }

      const cartItem = document.createElement("div");
      cartItem.classList.add("cart-item");

      // Handle image path correctly based on data structure
      let imageUrl = "";
      if (item.listing.images && item.listing.images.length > 0) {
        // Check if images is an array of objects or strings
        imageUrl =
          typeof item.listing.images[0] === "object"
            ? item.listing.images[0].url
            : item.listing.images[0];
      }

      cartItem.innerHTML = `
                <button class="remove-item" data-item-id="${
                  item._id
                }">×</button>
                <img src="${imageUrl}" alt="${
        item.listing.name
      }" onerror="this.src='placeholder.jpg'">
                <div class="item-details">
                    <h2>${item.listing.name}</h2>
                    <p>$${item.listing.rentalRate} per day</p>
                    <p>Total: $${(
                      item.listing.rentalRate * item.rentalDays
                    ).toFixed(2)}</p>
                </div>
                <div class="quantity-controls">
                    <button class="decrease">-</button>
                    <span class="quantity">${item.rentalDays}</span>
                    <button class="increase">+</button>
                </div>
            `;

      cartList.appendChild(cartItem);

      // Add event listeners for item controls
      setupCartItemEventListeners(cartItem, item._id);
    });
  }

  /**
   * Sets up event listeners for cart item controls (quantity, remove)
   * @param {HTMLElement} cartItem - The cart item DOM element
   * @param {string} itemId - The ID of the cart item
   */
  function setupCartItemEventListeners(cartItem, itemId) {
    const decreaseButton = cartItem.querySelector(".decrease");
    const increaseButton = cartItem.querySelector(".increase");
    const quantityElement = cartItem.querySelector(".quantity");
    const removeButton = cartItem.querySelector(".remove-item");

    decreaseButton.addEventListener("click", () => {
      const currentVal = parseInt(quantityElement.textContent);
      if (currentVal > 1) {
        const newValue = currentVal - 1;
        updateCartItemDays(itemId, newValue);
      }
    });

    increaseButton.addEventListener("click", () => {
      const currentVal = parseInt(quantityElement.textContent);
      const newValue = currentVal + 1;
      updateCartItemDays(itemId, newValue);
    });

    // Add event listener for remove button
    removeButton.addEventListener("click", function () {
      removeFromCart(itemId);
    });
  }

  /**
   * Updates the total price display
   * @param {number} totalPrice - The total price to display
   */
  function updateTotal(totalPrice) {
    const subtotal = totalPrice;
    const insuranceFee = subtotal * 0.1; // 10% insurance fee
    const total = subtotal + insuranceFee;

    if (subtotalElement)
      subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    
    // Update insurance fee display
    const insuranceElement = document.querySelector('.summary-row:nth-child(3) span:last-child');
    if (insuranceElement) {
      insuranceElement.textContent = `$${insuranceFee.toFixed(2)}`;
    }
    
    if (totalElement) totalElement.textContent = `$${total.toFixed(2)}`;
  }

  // ======== API INTERACTION FUNCTIONS ========

  /**
   * Fetches the current cart from the backend
   */
  async function fetchCart() {
    try {
      const response = await fetch(`${baseUrl}/cart`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!data.success) {
        console.error("Failed to fetch cart:", data.message);
        cartList.innerHTML = `<div class='error-message'><i class='fas fa-exclamation-circle' style='font-size: 32px; margin-bottom: 15px; color: #cbd5e0;'></i><p>${data.message}</p></div>`;
        return;
      }

      // Calculate total price from cart items
      const totalPrice = data.cart.items.reduce((sum, item) => {
        return sum + item.listing.rentalRate * item.rentalDays;
      }, 0);

      renderCart(data.cart.items);
      updateTotal(totalPrice);
    } catch (error) {
      console.error("Error fetching cart:", error);
      cartList.innerHTML =
        "<div class='error-message'><i class='fas fa-exclamation-circle' style='font-size: 32px; margin-bottom: 15px; color: #cbd5e0;'></i><p>Error loading cart. Please try again later.</p></div>";
    }
  }

  /**
   * Removes an item from the cart
   * @param {string} itemId - The ID of the item to remove
   */
  async function removeFromCart(itemId) {
    try {
      console.log("Removing item with ID:", itemId);
      console.log("Using token:", token);

      const response = await fetch(`${baseUrl}/cart/${itemId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // Log response status for debugging
      console.log("Remove response status:", response.status);

      const data = await response.json();
      console.log("Remove response:", data);

      if (data.success) {
        // Refresh the cart after successful removal
        fetchCart();
        // Show success message to user
        showToast("Item removed from cart successfully", "success");
      } else {
        console.error("Failed to remove item:", data.message);
        // Show error message to user
        showToast(`Failed to remove item: ${data.message}`, "error");
      }
      updateCartBadgeWithAnimation();
    } catch (error) {
      console.error("Error removing item from cart:", error);
      // Show error message to user
      showToast("Error removing item from cart. Please try again.", "error");
    }
  }

  /**
   * Updates the rental days for a cart item
   * @param {string} itemId - The ID of the item to update
   * @param {number} rentalDays - The new number of rental days
   */
  async function updateCartItemDays(itemId, rentalDays) {
    try {
      console.log(`Updating item ${itemId}: rentalDays=${rentalDays}`);

      const response = await fetch(`${baseUrl}/cart/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rentalDays }),
      });

      console.log("Update response status:", response.status);

      const data = await response.json();
      console.log("Update response:", data);

      if (data.success) {
        // Refresh the cart after successful update
        fetchCart();
        // Show success message to user
        showToast("Cart item updated successfully", "success");
      } else {
        console.error("Failed to update item:", data.message);
        // Show error message to user
        showToast(`Failed to update item: ${data.message}`, "error");
      }
    } catch (error) {
      console.error("Error updating item in cart:", error);
      // Show error message to user
      showToast("Error updating item in cart. Please try again.", "error");
    }
  }

  /**
   * Clears all items from the cart
   */
  async function clearCartDirectly() {
    try {
      console.log("Attempting to clear cart with token:", token);

      const response = await fetch(`${baseUrl}/cart`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Clear cart response status:", response.status);

      const data = await response.json();
      console.log("Clear cart response:", data);

      if (data.success) {
        console.log("Cart cleared successfully");
        fetchCart(); // Refresh the cart display
        // Show success message to user
        showToast("Cart cleared successfully", "success");
      } else {
        console.error("Failed to clear cart:", data.message);
        // Show error message to user
        showToast(`Failed to clear cart: ${data.message}`, "error");
      }
      updateCartBadgeWithAnimation();
    } catch (error) {
      console.error("Error clearing cart:", error);
      // Show error message to user
      showToast("Error clearing cart. Please try again.", "error");
    }
  }

  // ======== INITIALIZATION ========

  // Set up the UI components
  initializeCartUI();

  // Check authentication status and update UI
  checkAuthStatus();

  // Load cart data from the server
  fetchCart();
  
  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {string} type - Type of notification (success or error)
   */
  function showToast(message, type = "success") {
    // Check if notification container exists, create if not
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      toastContainer.className = "notification-container";
      document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement("div");
    toast.className = `notification ${type}`;
    
    // Set icon based on type
    const icon = type === "success" 
      ? '<i class="ri-check-line notification-icon"></i>' 
      : '<i class="ri-error-warning-line notification-icon"></i>';
    
    // Create toast content
    toast.innerHTML = `
      ${icon}
      <div class="notification-content">
        <div class="notification-message">${message}</div>
      </div>
      <button class="notification-close">&times;</button>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add("show"), 10);
    
    // Add event listener to close button
    const closeBtn = toast.querySelector(".notification-close");
    closeBtn.addEventListener("click", () => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
  }
  
  // Make showToast available globally
  window.showToast = showToast;
});
