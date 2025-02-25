
document.addEventListener("DOMContentLoaded", async function () {
    const cartList = document.querySelector(".cart-list");
    const subtotalElement = document.getElementById("subtotal");
    const totalElement = document.getElementById("total");
    const token = localStorage.getItem("token");
    // createPopupHTML();
    
    // Add a clear cart button to the page
    const cartActionsDiv = document.createElement("div");
    cartActionsDiv.className = "cart-actions";
    cartActionsDiv.innerHTML = `
        <button id="clearCartBtn" class="clear-cart" aria-label="Clear cart">
        <div class="trash-lid"></div>
        <div class="trash-body"></div>
    </button>
    `;
    // Create popup HTML and add it to the document
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
    
    // Insert the clear cart button before or after an appropriate element
    const cartSummary = document.querySelector(".cart-summary") || document.querySelector(".cart-container");
    if (cartSummary) {
        cartSummary.prepend(cartActionsDiv);
    }
    
    // Add event listener to clear cart button
    // document.getElementById("clearCartBtn")?.addEventListener("click", clearCart);

    // Check authentication first
    if (!token) {
        // Handle unauthenticated user (redirect to login or show message)
        cartList.innerHTML = "<div class='auth-required'>Please log in to view your cart</div>";
        return;
    }
    function setupClearCartButton() {
        const clearCartBtn = document.getElementById("clearCartBtn");
        const customPopup = document.getElementById("customPopup");
        const cancelClearBtn = document.getElementById("cancelClearBtn");
        const confirmClearBtn = document.getElementById("confirmClearBtn");
        
        if (clearCartBtn) {
            clearCartBtn.addEventListener("click", function() {
                console.log("Clear cart button clicked");
                // Show custom popup
                customPopup.classList.add("active");
            });
        } else {
            console.error("Clear cart button not found");
        }
        
        // Handle cancel button
        cancelClearBtn.addEventListener("click", function() {
            customPopup.classList.remove("active");
        });
        
        // Handle confirm button
        confirmClearBtn.addEventListener("click", function() {
            customPopup.classList.remove("active");
            clearCartDirectly();
        });
        
        // Also close popup when clicking outside
        customPopup.addEventListener("click", function(e) {
            if (e.target === customPopup) {
                customPopup.classList.remove("active");
            }
        });
    }

    // NEW FUNCTION 2: Clear cart directly
    async function clearCartDirectly() {
        try {
            console.log("Attempting to clear cart with token:", token);
            
            const response = await fetch("http://localhost:3000/api/cart", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            
            console.log("Clear cart response status:", response.status);
            
            const data = await response.json();
            console.log("Clear cart response:", data);
            
            if (data.success) {
                console.log("Cart cleared successfully");
                fetchCart(); // Refresh the cart display
            } else {
                console.error("Failed to clear cart:", data.message);
                alert(`Failed to clear cart: ${data.message}`);
            }
        } catch (error) {
            console.error("Error clearing cart:", error);
            alert("Error clearing cart. Please try again.");
        }
    }
    
    // Call setup function right after adding the button
    setupClearCartButton();
    
    // Function to fetch cart data
    async function fetchCart() {
        try {
            const response = await fetch("http://localhost:3000/api/cart", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (!data.success) {
                console.error("Failed to fetch cart:", data.message);
                cartList.innerHTML = `<div class='error-message'>${data.message}</div>`;
                return;
            }

            renderCart(data.cart.items);
            updateTotal(data.totalPrice);
        } catch (error) {
            console.error("Error fetching cart:", error);
            cartList.innerHTML = "<div class='error-message'>Error loading cart. Please try again later.</div>";
        }
    }

    // Function to render cart items in the HTML
    function renderCart(items) {
        cartList.innerHTML = ""; // Clear previous items
        
        if (!items || items.length === 0) {
            cartList.innerHTML = "<div class='empty-cart'>Your cart is empty</div>";
            return;
        }
        
        items.forEach(item => {
            // Skip invalid items
            if (!item.listing) {
                console.error("Invalid cart item:", item);
                return;
            }
            
            const cartItem = document.createElement("div");
            cartItem.classList.add("cart-item");
            
            // Handle image path correctly based on your data structure
            let imageUrl = "";
            if (item.listing.images && item.listing.images.length > 0) {
                // Check if images is an array of objects or strings
                imageUrl = typeof item.listing.images[0] === 'object' ? 
                    item.listing.images[0].url : 
                    item.listing.images[0];
            }
            
            cartItem.innerHTML = `
                <button class="remove-item" data-item-id="${item._id}">×</button>
                <img src="${imageUrl}" alt="${item.listing.name}" onerror="this.src='placeholder.jpg'">
                <div class="item-details">
                    <h2>${item.listing.name}</h2>
                    <p>$${item.listing.rentalRate} per day</p>
                    <p>Total: $${(item.listing.rentalRate * item.rentalDays).toFixed(2)}</p>
                </div>
                <div class="quantity-controls">
                    <button class="decrease">-</button>
                    <span class="quantity">${item.rentalDays}</span>
                    <button class="increase">+</button>
                </div>
            `;

            cartList.appendChild(cartItem);

            // Add event listeners for quantity update
            const decreaseButton = cartItem.querySelector(".decrease");
            const increaseButton = cartItem.querySelector(".increase");
            const quantityElement = cartItem.querySelector(".quantity");
            const removeButton = cartItem.querySelector(".remove-item");

            decreaseButton.addEventListener("click", () => {
                const currentVal = parseInt(quantityElement.textContent);
                if (currentVal > 1) {
                  const newValue = currentVal - 1;
                  updateCartItemDays(item._id, newValue);
                }
              });
            
              increaseButton.addEventListener("click", () => {
                const currentVal = parseInt(quantityElement.textContent);
                const newValue = currentVal + 1;
                updateCartItemDays(item._id, newValue);
              });
            
            // Add event listener for remove button
            removeButton.addEventListener("click", function() {
                removeFromCart(item._id);
            });
        });
    }

    // Function to update total price
    function updateTotal(totalPrice) {
        if (subtotalElement) subtotalElement.textContent = `$${totalPrice}`;
        if (totalElement) totalElement.textContent = `$${totalPrice}`;
    }
    
    // Function to remove item from cart
    async function removeFromCart(itemId) {
        try {
            console.log("Removing item with ID:", itemId);
            console.log("Using token:", token);
            
            const response = await fetch(`http://localhost:3000/api/cart/${itemId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            
            // Log response status for debugging
            console.log("Remove response status:", response.status);
            
            const data = await response.json();
            console.log("Remove response:", data);
            
            if (data.success) {
                // Refresh the cart after successful removal
                fetchCart();
            } else {
                console.error("Failed to remove item:", data.message);
                alert(`Failed to remove item: ${data.message}`);
            }
        } catch (error) {
            console.error("Error removing item from cart:", error);
            alert("Error removing item from cart. Please try again.");
        }
    }
    
    async function updateCartItemDays(itemId, rentalDays) {
        try {
          const token = localStorage.getItem("token");
          
          console.log(`Updating item ${itemId}: rentalDays=${rentalDays}`);
          
          const response = await fetch(`http://localhost:3000/api/cart/${itemId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ rentalDays })
          });
          
          console.log("Update response status:", response.status);
          
          const data = await response.json();
          console.log("Update response:", data);
          
          if (data.success) {
            // Refresh the cart after successful update
            fetchCart();
          } else {
            console.error("Failed to update item:", data.message);
            alert(`Failed to update item: ${data.message}`);
          }
        } catch (error) {
          console.error("Error updating item in cart:", error);
          alert("Error updating item in cart. Please try again.");
        }
      }

    // Initialize the cart
    fetchCart();
});