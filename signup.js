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

document.getElementById("signupForm").addEventListener("submit", async function (event) {
 event.preventDefault();

 const formData = {
     firstName: document.getElementById("firstname").value,
     lastName: document.getElementById("lastname").value,
     address: document.getElementById("address").value,
     email: document.getElementById("email").value,
     phone: document.getElementById("phone").value,
     password: document.getElementById("password").value,
 };

 const message = document.getElementById("message");


 const hasLetters = /[a-zA-Z]/.test(formData.password);
 const hasNumbers = /\d/.test(formData.password);
 const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
 const validPhone = /^\d{11}$/.test(formData.phone);

 if (!validEmail) {
     message.textContent = "Please enter a valid email address";
     message.className = "message error";
     return;
 }

 if (!validPhone) {
     message.textContent = "Phone number must be exactly 11 digits";
     message.className = "message error";
     return;
 }

 if (formData.password.length < 8) {
     message.textContent = "Password should contain at least 8 characters";
     message.className = "message error";
     return;
 }

 if (!hasLetters || !hasNumbers) {
     message.textContent = "Password must include both letters and numbers";
     message.className = "message error";
     return;
 }

 try {
     const response = await fetch("http://localhost:3000/api/signup", {
         method: "POST",
         headers: {
             "Content-Type": "application/json",
         },
         body: JSON.stringify(formData),
     });

     const data = await response.json();

     if (response.ok) {
      localStorage.setItem('token', data.token);
      message.textContent = "Account created successfully!";
      message.className = "message success";
      
      
      setTimeout(() => {
          window.location.href = "./home.html";
      }, 1500);
  } else {
      
      if (data.errors) {
          
          const errorMessage = Object.values(data.errors).join(", ");
          message.textContent = errorMessage;
      } else {
          
          message.textContent = data.message || "Error creating account. Please try again.";
      }
      message.className = "message error"; 
  }
} catch (error) {
  
  message.textContent = "Connection error. Please try again.";
  message.className = "message error"; 
}
});

window.addEventListener('load', createParticles);