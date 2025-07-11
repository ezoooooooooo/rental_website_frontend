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

// Password toggle functionality
document.addEventListener('DOMContentLoaded', function() {
  const toggles = document.querySelectorAll('.password-toggle');
  
  toggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const targetInput = document.getElementById(targetId);
      
      if (targetInput.type === 'password') {
        targetInput.type = 'text';
        this.classList.remove('ri-eye-off-line');
        this.classList.add('ri-eye-line');
      } else {
        targetInput.type = 'password';
        this.classList.remove('ri-eye-line');
        this.classList.add('ri-eye-off-line');
      }
    });
  });
});

window.addEventListener('load', createParticles);
