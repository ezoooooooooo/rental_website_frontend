// nav-utils.js - Your shared JavaScript file
async function updateCartBadge() {
 try {
   const token = localStorage.getItem('token');
   
   if (!token) {
     document.getElementById('cart-badge').style.display = 'none';
     return;
   }
   
   const response = await fetch('http://localhost:3000/api/cart', {
     headers: {
       'Authorization': `Bearer ${token}`
     }
   });
   
   const data = await response.json();
   
   if (data.success) {
     const cartCount = data.cart?.items?.length || 0;
     const cartBadge = document.getElementById('cart-badge');
     
     cartBadge.textContent = cartCount;
     cartBadge.style.display = cartCount > 0 ? 'block' : 'none';
   }
 } catch (error) {
   console.error('Error fetching cart:', error);
 }
}

// Add this new function for animated updates
async function updateCartBadgeWithAnimation() {
 await updateCartBadge();
 
 // Add pulse animation class
 const badge = document.getElementById('cart-badge');
 badge.classList.add('pulse');
 
 // Remove the class after animation completes
 setTimeout(() => {
   badge.classList.remove('pulse');
 }, 500);
}

/**
 * Shared logout function for all pages
 * Removes the token from localStorage and redirects to login page
 */
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  window.location.href = "login.html";
}

/**
 * Set up event listeners for logout buttons with data-action attribute
 * This should be called when the DOM is loaded on each page
 */
function setupLogoutListeners() {
  document.addEventListener('click', function(event) {
    const target = event.target.closest('[data-action="logout"]');
    if (target) {
      event.preventDefault();
      logout();
    }
  });
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (success, error, warning, info)
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
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "polite");
  
  // Set icon based on type
  let icon;
  switch(type) {
    case "success":
      icon = '<i class="ri-check-line notification-icon"></i>';
      break;
    case "error":
      icon = '<i class="ri-error-warning-line notification-icon"></i>';
      break;
    case "warning":
      icon = '<i class="ri-alert-line notification-icon"></i>';
      break;
    case "info":
      icon = '<i class="ri-information-line notification-icon"></i>';
      break;
    default:
      icon = '<i class="ri-information-line notification-icon"></i>';
  }
  
  // Create toast content with progress bar
  toast.innerHTML = `
    ${icon}
    <div class="notification-content">
      <div class="notification-message">${message}</div>
    </div>
    <button class="notification-close" aria-label="Close notification">&times;</button>
    <div class="notification-progress"></div>
  `;
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add("show"), 10);
  
  // Add event listener to close button
  const closeBtn = toast.querySelector(".notification-close");
  closeBtn.addEventListener("click", () => {
    toast.classList.add("hide");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 400);
  });
  
  // Auto remove after 5 seconds
  const autoRemoveTimer = setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.classList.add("hide");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 400);
    }
  }, 5000);
  
  // Pause auto-remove on hover
  toast.addEventListener("mouseenter", () => {
    clearTimeout(autoRemoveTimer);
    const progressBar = toast.querySelector(".notification-progress");
    if (progressBar) {
      progressBar.style.animationPlayState = "paused";
    }
  });
  
  // Resume auto-remove on mouse leave
  toast.addEventListener("mouseleave", () => {
    const progressBar = toast.querySelector(".notification-progress");
    if (progressBar) {
      progressBar.style.animationPlayState = "running";
    }
    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.classList.add("hide");
        setTimeout(() => {
          if (toast.parentNode) {
            toast.remove();
          }
        }, 400);
      }
    }, 2000); // Shorter time after mouse leave
  });
}

/**
 * Ensure toast notification CSS is loaded
 */
function ensureToastCSSLoaded() {
  // Check if the CSS is already loaded
  const cssLoaded = Array.from(document.styleSheets).some(styleSheet => {
    try {
      return styleSheet.href && styleSheet.href.includes('toast-notifications.css');
    } catch (e) {
      return false;
    }
  });
  
  if (!cssLoaded) {
    // Create link element
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'toast-notifications.css';
    
    // Append to head
    document.head.appendChild(link);
    console.log('Toast notifications CSS loaded dynamically');
  }
}

// Set up logout listeners when the DOM is loaded
document.addEventListener('DOMContentLoaded', setupLogoutListeners);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  
  // Add event listener to all logout links
  document.querySelectorAll('[data-action="logout"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  });
  
  // Ensure toast CSS is loaded
  ensureToastCSSLoaded();
});

// Make functions globally available
window.updateCartBadge = updateCartBadge;
window.updateCartBadgeWithAnimation = updateCartBadgeWithAnimation;
window.logout = logout;
window.showToast = showToast;