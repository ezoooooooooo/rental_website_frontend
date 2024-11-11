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
  const response = await fetch('http://192.168.8.34:3000/api/login', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
  });
  
  if (response.ok) {
      
      message.textContent = 'Login successful!';
      message.className = 'message success';
      setTimeout(() => {
          window.location.href = './home.html';
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

window.addEventListener('load', createParticles);