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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', updateCartBadge);

// Make both functions globally available
window.updateCartBadge = updateCartBadge;
window.updateCartBadgeWithAnimation = updateCartBadgeWithAnimation;