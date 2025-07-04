/**
 * RentEaseApp - Main application class for the rental platform
 * Handles user authentication, navigation, and cart operations
 */
class RentEaseApp {
  /**
   * Initialize the application
   */
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");
    this.userId = localStorage.getItem("userId");
    this.cartId = localStorage.getItem("cartId");

    this.initializeApp();
  }

  /**
   * Main initialization method that sets up the application
   */
  initializeApp() {
    this.checkAuthStatus();
    this.setupDropdownListeners();
    
    // If we're on the payment page, load user info and cart items
    if (window.location.pathname.includes('payment.html')) {
      this.loadUserInfo();
      this.loadCartItems();
    }
  }

  /**
   * Load user information from profile and display it
   */
  async loadUserInfo() {
    if (!this.token) {
      console.error("No token found");
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/profile`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }

      const userData = await response.json();
      this.userData = userData;
      
      // Update user info section
      document.getElementById('user-name').textContent = `${userData.firstName || ''} ${userData.lastName || ''}`;
      document.getElementById('user-email').textContent = userData.email || 'Not provided';
      document.getElementById('user-phone').textContent = userData.phoneNumber || 'Not provided';
      document.getElementById('user-address').textContent = userData.address || 'Not provided';
      
    } catch (error) {
      console.error("Error loading user info:", error);
    }
  }

  /**
   * Load cart items and display them in the order summary
   */
  async loadCartItems() {
    if (!this.token) {
      console.error("No token found");
      return;
    }

    try {
      // Use the correct API endpoint for fetching cart
      const response = await fetch(`${this.baseUrl}/cart`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cart: ${response.status}`);
      }

      const cartData = await response.json();
      
      if (!cartData.success || !cartData.cart || !cartData.cart.items || cartData.cart.items.length === 0) {
        document.querySelector('.items-container').innerHTML = '<p>Your cart is empty</p>';
        document.querySelector('.order-summary').style.display = 'none';
        return;
      }
      
      this.cartData = cartData;
      this.renderCartItems(cartData.cart.items);
      this.calculateOrderSummary(cartData.cart.items);
      
      // Store cart ID
      localStorage.setItem('cartId', cartData.cart._id);
      this.cartId = cartData.cart._id;
      
    } catch (error) {
      console.error("Error loading cart items:", error);
    }
  }

  /**
   * Render cart items in the order summary
   */
  renderCartItems(items) {
    const container = document.querySelector('.items-container');
    container.innerHTML = '';
    
    items.forEach(item => {
      const listing = item.listing;
      const itemElement = document.createElement('div');
      itemElement.className = 'item';
      
      const imageUrl = listing.images && listing.images.length > 0 
        ? listing.images[0].url 
        : 'https://via.placeholder.com/80';
      
      itemElement.innerHTML = `
        <img src="${imageUrl}" alt="${listing.name}">
        <div class="item-details">
          <h4>${listing.name}</h4>
          <p>Rental Rate: $${listing.rentalRate}/day</p>
          <p>Rental Days: ${item.rentalDays}</p>
          <p>Subtotal: $${(listing.rentalRate * item.rentalDays).toFixed(2)}</p>
        </div>
      `;
      
      container.appendChild(itemElement);
    });
  }

  /**
   * Calculate and display order summary using price breakdown from API
   */
  calculateOrderSummary(items) {
    const subtotalElement = document.querySelector('.order-subtotal .price');
    const platformFeeElement = document.querySelector('.order-platform-fee .price');
    const insuranceElement = document.querySelector('.order-insurance .price');
    const totalElement = document.querySelector('.order-total .price');
    
    // Try to use price breakdown from the stored cart data
    if (this.cartData && this.cartData.priceBreakdown) {
      const breakdown = this.cartData.priceBreakdown;
      subtotalElement.textContent = `$${breakdown.subtotal.toFixed(2)}`;
      platformFeeElement.textContent = `$${breakdown.platformFee.toFixed(2)}`;
      insuranceElement.textContent = `$${breakdown.insuranceFee.toFixed(2)}`;
      totalElement.textContent = `$${breakdown.totalPrice.toFixed(2)}`;
    } else {
      // Fallback: calculate manually
      const subtotal = items.reduce((sum, item) => {
        return sum + (item.listing.rentalRate * item.rentalDays);
      }, 0);
      
      // Calculate platform fee and insurance fee (10% each)
      const platformFee = subtotal * 0.1;
      const insuranceFee = subtotal * 0.1;
      
      // Calculate total
      const total = subtotal + platformFee + insuranceFee;
      
      // Update display
      subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
      platformFeeElement.textContent = `$${platformFee.toFixed(2)}`;
      insuranceElement.textContent = `$${insuranceFee.toFixed(2)}`;
      totalElement.textContent = `$${total.toFixed(2)}`;
    }
  }

  /**
   * Check if user is logged in and update UI accordingly
   */
  checkAuthStatus() {
    const token = this.getToken();
    const userActions = document.querySelector(".user-actions");

    if (token) {
      // User is logged in - fetch profile data
      fetch(`${this.baseUrl}/profile`, {
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
          this.userData = userData;
          
          // Store user ID in localStorage
          localStorage.setItem("userId", userData._id);

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
                        ${userData.role === 'admin' ? `<a href="admin-dashboard.html"><i class='ri-shield-user-line'></i> Admin Dashboard</a>` : ''}
                            <div class="dropdown-divider"></div>
                        <a href="#" data-action="logout"><i class="ri-logout-box-r-line"></i> Logout</a>
                        </div>
                    </div>
                `;
            this.setupDropdownListeners();
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
                                <a href="#" onclick="rentEaseApp.logout()"><i class="ri-logout-box-line"></i> Logout</a>
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

  /**
   * Set up dropdown menu functionality
   */
  setupDropdownListeners() {
    const profileButton = document.querySelector(".profile-button");
    const dropdownMenu = document.querySelector(".dropdown-menu");

    if (profileButton && dropdownMenu) {
      // Remove any existing listeners first to avoid duplicates
      profileButton.removeEventListener("click", this.toggleDropdown);

      // Define the toggle function
      this.toggleDropdown = (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle("show");
      };

      // Add the listener
      profileButton.addEventListener("click", this.toggleDropdown);

      // Close dropdown when clicking outside
      document.addEventListener("click", () => {
        dropdownMenu.classList.remove("show");
      });
    }
  }

  /**
   * Get authentication token from local storage
   * @returns {string|null} Authentication token or null if not logged in
   */
  getToken() {
    return localStorage.getItem("token");
  }

  /**
   * Log out the current user and redirect to login page
   */
  logout() {
    localStorage.removeItem("token");
    redirectToLogin();
  }

  /**
   * Show a message to the user (success or error)
   * @param {string} message - Message to display
   * @param {boolean} isError - Whether this is an error message
   */
  showMessage(message, isError = false) {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${isError ? "error" : "success"}`;
    messageElement.textContent = message;
    document.body.appendChild(messageElement);

    setTimeout(() => {
      messageElement.remove();
    }, 3000);
  }

  /**
   * Show an error message to the user
   * @param {string} message - Error message to display
   */
  showErrorMessage(message) {
    this.showMessage(message, true);
  }

  /**
   * Calculate fee breakdown in real-time using the backend endpoint
   * @param {number} subtotal - The subtotal amount
   * @returns {Promise<Object>} Price breakdown object
   */
  async calculateFeeBreakdown(subtotal) {
    try {
      const response = await fetch(`${this.baseUrl}/orders/fee-breakdown`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ subtotal }),
      });

      if (!response.ok) {
        throw new Error(`Failed to calculate fees: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.breakdown : null;
    } catch (error) {
      console.error("Error calculating fee breakdown:", error);
      return null;
    }
  }

  /**
   * Update order summary with real-time fee calculation
   * @param {Array} items - Cart items array
   */
  async updateOrderSummaryRealTime(items) {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.listing.rentalRate * item.rentalDays);
    }, 0);

    // Try to get real-time breakdown from the API
    const breakdown = await this.calculateFeeBreakdown(subtotal);
    
    if (breakdown) {
      const subtotalElement = document.querySelector('.order-subtotal .price');
      const platformFeeElement = document.querySelector('.order-platform-fee .price');
      const insuranceElement = document.querySelector('.order-insurance .price');
      const totalElement = document.querySelector('.order-total .price');
      
      subtotalElement.textContent = `$${breakdown.subtotal.toFixed(2)}`;
      platformFeeElement.textContent = `$${breakdown.platformFee.toFixed(2)}`;
      insuranceElement.textContent = `$${breakdown.insuranceFee.toFixed(2)}`;
      totalElement.textContent = `$${breakdown.totalPrice.toFixed(2)}`;
    } else {
      // Fallback to existing calculation method
      this.calculateOrderSummary(items);
    }
  }
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
  window.location.href = "login.html";
}

/**
 * Redirect to signup page
 */
function redirectToSignup() {
  window.location.href = "signup.html";
}

// --- Toast CSS for popout messages ---
const toastStyle = document.createElement('style');
toastStyle.innerHTML = `
.custom-toast {
  position: fixed;
  top: 32px;
  left: 50%;
  transform: translateX(-50%) scale(0.97);
  background: linear-gradient(135deg, #6c5ce7, #9982b1);
  color: #fff;
  padding: 18px 36px;
  border-radius: 14px;
  font-size: 1.2rem;
  font-weight: 600;
  opacity: 0;
  z-index: 9999;
  box-shadow: 0 4px 32px rgba(44,62,80,0.15);
  transition: opacity 0.3s, transform 0.3s;
  pointer-events: none;
}
.custom-toast.show {
  opacity: 1;
  transform: translateX(-50%) scale(1.02);
}
`;
document.head.appendChild(toastStyle);

// Show toast and redirect after pay/checkout
function showSuccessAndRedirect(message, redirectUrl) {
  const toast = document.createElement('div');
  toast.className = 'custom-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
      window.location.href = redirectUrl;
    }, 400);
  }, 1800);
}

// Initialize the app
const rentEaseApp = new RentEaseApp();

// Handle form submission
document
  .getElementById("checkout-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    
    const token = localStorage.getItem("token");
    if (!token) {
      if (window.showToast) {
        window.showToast("Please log in to complete your purchase", "error");
      } else {
        alert("Please log in to complete your purchase");
      }
      window.location.href = "login.html";
      return;
    }
    
    try {
      // Get cart ID from local storage
      const cartId = localStorage.getItem("cartId");
      if (!cartId) {
        throw new Error("Cart not found");
      }
      
      // Get total price from the page
      const totalPriceElement = document.querySelector(".order-total .price");
      const totalPrice = totalPriceElement ? 
        parseFloat(totalPriceElement.textContent.replace('$', '')) : 0;
      
      // Create payment data - we'll use the rental days from the cart
      const paymentData = {
        cartId,
        totalPrice
      };
      
      // Show loading state
      const submitButton = document.querySelector("button[type='submit']");
      const originalButtonText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = "Processing...";
      
      // Process payment
      const response = await fetch("http://localhost:3000/api/orders/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
      });
      
      // Reset button state
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Payment failed");
      }
      
      const responseData = await response.json();
      
      // Store order data 
      localStorage.setItem("orderData", JSON.stringify(responseData));
      
      // Show toast and redirect to home.html
      showSuccessAndRedirect('Purchase successful! Redirecting to home...', 'home.html');
      
    } catch (error) {
      if (window.showToast) {
        window.showToast(`Payment failed: ${error.message}`, "error");
      } else {
        alert(`Payment failed: ${error.message}`);
      }
      console.error("Payment error:", error);
    }
  });
