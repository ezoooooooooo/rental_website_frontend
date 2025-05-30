function createParticles() {
 const particlesContainer = document.getElementById('particles');
 const numberOfParticles = 50;

 for (let i = 0; i < numberOfParticles; i++) {
     const particle = document.createElement('div');
     particle.className = 'particle';
     
     const size = Math.random() * 4 + 2;
     particle.style.width = `${size}px`;
     particle.style.height = `${size}px`;
     
     particle.style.left = `${Math.random() * 100}%`;
     particle.style.top = `${Math.random() * 100}%`;
     
     particle.style.animation = `float ${Math.random() * 6 + 4}s linear infinite`;
     particle.style.opacity = Math.random() * 0.5 + 0.2;
     
     particlesContainer.appendChild(particle);
 }
}

// Forgot Password Modal Functionality
const modal = document.getElementById('forgotPasswordModal');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const closeModal = document.querySelector('.close-modal');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const resetMessage = document.getElementById('resetMessage');

// Open modal when clicking on forgot password link
forgotPasswordLink.addEventListener('click', function(event) {
    event.preventDefault();
    modal.style.display = 'flex';
});

// Close modal when clicking on close button
closeModal.addEventListener('click', function() {
    modal.style.display = 'none';
    resetMessage.textContent = '';
    resetMessage.className = 'message';
    forgotPasswordForm.reset();
});

// Close modal when clicking outside of it
window.addEventListener('click', function(event) {
    if (event.target === modal) {
        modal.style.display = 'none';
        resetMessage.textContent = '';
        resetMessage.className = 'message';
        forgotPasswordForm.reset();
    }
});

document.getElementById('loginForm').addEventListener('submit', async function(event) {
 event.preventDefault();
 
 const email = document.getElementById('email').value;
 const password = document.getElementById('password').value;
 const message = document.getElementById('message');
 
 try {
  const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
  });
  
  if (response.ok) {
      const data = await response.json(); 
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userRole', data.user.role);
      message.textContent = 'Login successful!';
      message.className = 'message success';
      
      // Check if user is admin and redirect accordingly
      setTimeout(() => {
          if (data.user.role === 'admin') {
              window.location.href = './admin-dashboard.html';
          } else {
              window.location.href = './home.html';
          }
      }, 1500);
  } else {
      
      const errorData = await response.json();
      
      if (errorData.errors) {
          
          const errorMessage = Object.values(errorData.errors).join(", ");
          message.textContent = errorMessage;
          message.className = 'message error';
      } else if (errorData.message === 'Too many login attempts. Please try again after 15 minutes.') {
          
          message.textContent = errorData.message;
          message.className = 'message error';
      } else {
          
          message.textContent = errorData.message || 'Invalid email or password';
          message.className = 'message error';
      }
  }
} catch (error) {
  
  message.textContent = 'Connection error. Please try again.';
  message.className = 'message error';
}

});

// Handle forgot password form submission
forgotPasswordForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const email = document.getElementById('resetEmail').value;
    
    // Show loading state
    const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    
    try {
        const response = await fetch('http://localhost:3000/api/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });
        
        // Reset button state
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
        
        if (response.ok) {
            resetMessage.textContent = 'Password reset link sent to your email!';
            resetMessage.className = 'message success';
            
            // Clear the form
            forgotPasswordForm.reset();
            
            // Close the modal after 3 seconds
            setTimeout(() => {
                modal.style.display = 'none';
                resetMessage.textContent = '';
                resetMessage.className = 'message';
            }, 3000);
        } else {
            const errorData = await response.json();
            resetMessage.textContent = errorData.message || 'Failed to send reset link. Please try again.';
            resetMessage.className = 'message error';
        }
    } catch (error) {
        // Reset button state
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
        
        resetMessage.textContent = 'Connection error. Please try again.';
        resetMessage.className = 'message error';
    }
});

window.addEventListener('load', createParticles);
