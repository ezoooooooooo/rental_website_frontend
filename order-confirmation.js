/**
 * Handle order confirmation and post-order actions
 */
class OrderConfirmationManager {
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");
    this.orderId = null;

    this.initConfirmationPage();
  }

  /**
   * Initialize the order confirmation page
   */
  initConfirmationPage() {
    // Try to get order data from localStorage first (from payment.js)
    const orderDataString = localStorage.getItem("orderData");
    
    if (orderDataString) {
      try {
        const orderData = JSON.parse(orderDataString);
        if (orderData && orderData.order) {
          // Display the order confirmation with the data from localStorage
          const confirmationContainer = document.getElementById("orderConfirmation");
          if (confirmationContainer) {
            this.renderOrderConfirmation(orderData.order, confirmationContainer);
            // Clear the localStorage after displaying
            localStorage.removeItem("orderData");
            return;
          }
        }
      } catch (error) {
        console.error("Error parsing order data from localStorage:", error);
      }
    }
    
    // Fallback to URL parameter if localStorage approach fails
    const params = new URLSearchParams(window.location.search);
    this.orderId = params.get("orderId");

    if (!this.orderId) {
      this.showErrorMessage("Thank you for your order! You will be redirected to the home page shortly.");
      // Redirect to home page after 3 seconds
      setTimeout(() => {
        window.location.href = "index.html";
      }, 3000);
      return;
    }

    this.loadOrderDetails();
  }

  /**
   * Load and display order details
   */
  async loadOrderDetails() {
    const confirmationContainer = document.getElementById("orderConfirmation");
    if (!confirmationContainer) return;

    try {
      const response = await fetch(`${this.baseUrl}/orders/${this.orderId}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load order details");
      }

      const order = await response.json();
      this.renderOrderConfirmation(order, confirmationContainer);

      // Add rating prompt if order is completed
      if (order.status === "completed") {
        this.addRatingPrompt(order);
      }
    } catch (error) {
      console.error("Error loading order details:", error);
      confirmationContainer.innerHTML = `
        <div class="error-message">
          <p>Failed to load order details. Please try again later.</p>
        </div>
      `;
    }
  }

  /**
   * Render order confirmation details
   * @param {Object} order - Order object
   * @param {HTMLElement} container - Container to render in
   */
  renderOrderConfirmation(order, container) {
    container.innerHTML = `
      <div class="confirmation-header">
        <div class="confirmation-icon">
          <i class="ri-checkbox-circle-line"></i>
        </div>
        <h1>Thank You for Your Order!</h1>
        <p class="confirmation-message">Your order has been placed successfully.</p>
        <div class="order-number">
          <span>Order Number:</span> ${order._id}
        </div>
      </div>
      
      <div class="confirmation-details">
        <div class="order-summary">
          <h2>Order Summary</h2>
          <div class="order-items">
            <div class="order-item">
              <div class="item-image">
                <img src="${order.listing?.images?.[0]?.url || "./pets.jpeg"}" alt="${
                order.listing?.name || 'Item'
              }" onerror="this.onerror=null; this.src='./pets.jpeg';">
              </div>
              <div class="item-details">
                <h4 class="item-name">${order.listing?.name || 'Item'}</h4>
                <div class="item-meta">
                  <span class="item-price">$${order.listing?.rentalRate || 0}/day</span>
                  <span class="rental-days">Duration: ${order.rentalDays} days</span>
                  <span class="rental-period">From: ${new Date(order.startDate).toLocaleDateString()} - To: ${new Date(order.endDate).toLocaleDateString()}</span>
                </div>
              </div>
              <div class="item-total">
                $${order.totalPrice.toFixed(2)}
              </div>
            </div>
          </div>
          
          <div class="order-totals">
            ${order.subtotal ? `
            <div class="order-subtotal">
              <span>Subtotal:</span>
              <span>$${order.subtotal.toFixed(2)}</span>
            </div>
            ${order.platformFee ? `
            <div class="order-platform-fee">
              <span>Platform Fee:</span>
              <span>$${order.platformFee.toFixed(2)}</span>
            </div>` : ''}
            ${order.insuranceFee ? `
            <div class="order-insurance-fee">
              <span>Insurance Fee:</span>
              <span>$${order.insuranceFee.toFixed(2)}</span>
            </div>` : ''}
            ` : ''}
            <div class="order-total">
              <span>Total:</span>
              <span>$${order.totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div class="confirmation-actions">
          <a href="index.html" class="btn btn-primary">Continue Shopping</a>
          <a href="my-orders.html" class="btn btn-secondary">View Your Orders</a>
        </div>
      </div>
    `;
  }

  /**
   * Add rating prompt for the order items and owner
   * @param {Object} order - Order object
   */
  addRatingPrompt(order) {
    if (!order || !order.listing) return;

    const container = document.getElementById("orderConfirmation");
    if (!container) return;

    // Create rating sections for both the item and the owner
    const ratingSection = document.createElement('div');
    ratingSection.className = 'rating-sections';
    ratingSection.innerHTML = `
      <div class="rating-section-header">
        <h2>Rate Your Experience</h2>
        <p>Please take a moment to rate the item you've rented and the owner.</p>
      </div>
      
      <div class="rating-tabs">
        <button id="itemRatingTab" class="rating-tab active">Rate Item</button>
        <button id="ownerRatingTab" class="rating-tab">Rate Owner</button>
      </div>
      
      <div id="itemRatingContainer" class="rating-container active"></div>
      <div id="ownerRatingContainer" class="rating-container"></div>
    `;
    
    container.appendChild(ratingSection);
    
    // Initialize the rating forms
    const itemRatingContainer = document.getElementById('itemRatingContainer');
    const ownerRatingContainer = document.getElementById('ownerRatingContainer');
    
    // Initialize item rating form
    if (itemRatingContainer) {
      window.ratingsManager.initRatingForm('item', order.listing._id, itemRatingContainer);
    }
    
    // Initialize owner rating form
    if (ownerRatingContainer) {
      window.ratingsManager.initRatingForm('owner', order.owner._id, ownerRatingContainer);
    }
    
    // Add tab switching functionality
    const itemTab = document.getElementById('itemRatingTab');
    const ownerTab = document.getElementById('ownerRatingTab');
    
    if (itemTab && ownerTab) {
      itemTab.addEventListener('click', () => {
        itemTab.classList.add('active');
        ownerTab.classList.remove('active');
        itemRatingContainer.classList.add('active');
        ownerRatingContainer.classList.remove('active');
      });
      
      ownerTab.addEventListener('click', () => {
        ownerTab.classList.add('active');
        itemTab.classList.remove('active');
        ownerRatingContainer.classList.add('active');
        itemRatingContainer.classList.remove('active');
      });
    }
  }

  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  showErrorMessage(message) {
    const container = document.getElementById("orderConfirmation");
    if (!container) return;

    container.innerHTML = `
      <div class="error-message">
        <p>${message}</p>
        <a href="index.html" class="btn btn-primary">Go to Home</a>
      </div>
    `;
  }
}

// Initialize the manager when the page loads
document.addEventListener("DOMContentLoaded", () => {
  window.orderConfirmationManager = new OrderConfirmationManager();
});
