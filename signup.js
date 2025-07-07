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

// Global variables for verification process
let userEmail = '';
let resendTimer = null;
let resendCountdown = 60;

// Step 1: Signup Form Submission
document.getElementById("signupForm").addEventListener("submit", async function (event) {
 event.preventDefault();

 // Create FormData object to handle file upload
 const formData = new FormData();
 formData.append('firstName', document.getElementById("firstname").value);
 formData.append('lastName', document.getElementById("lastname").value);
 formData.append('address', document.getElementById("address").value);
 formData.append('email', document.getElementById("email").value);
 formData.append('phone', document.getElementById("phone").value);
 formData.append('password', document.getElementById("password").value);
 
 // Add government ID file (validate but don't send to backend yet)
 const governmentIdFile = document.getElementById("governmentId").files[0];
 if (governmentIdFile) {
     // Store file info locally for validation, but don't send to backend
     console.log("Government ID validated:", governmentIdFile.name);
     // File is required and validated, but not sent to backend until it's ready
 }

 // Get form values for validation
 const formValues = {
     firstName: document.getElementById("firstname").value,
     lastName: document.getElementById("lastname").value,
     address: document.getElementById("address").value,
     email: document.getElementById("email").value,
     phone: document.getElementById("phone").value,
     password: document.getElementById("password").value,
 };

 const message = document.getElementById("signupMessage");
 const submitButton = document.getElementById("signupBtn");
 const buttonText = document.getElementById("signupBtnText");
 const loader = document.getElementById("signupLoader");

 // Client-side validation
 const hasLetters = /[a-zA-Z]/.test(formValues.password);
 const hasNumbers = /\d/.test(formValues.password);
 const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email);
 const validPhone = /^\d{11}$/.test(formValues.phone);

 // Validate government ID upload (required but not sent to backend)
 if (!governmentIdFile) {
     showMessage(message, "Please upload your government ID", "error");
     return;
 }

 if (!validEmail) {
     showMessage(message, "Please enter a valid email address", "error");
     return;
 }

 if (!validPhone) {
     showMessage(message, "Phone number must be exactly 11 digits", "error");
     return;
 }

 if (formValues.password.length < 8) {
     showMessage(message, "Password should contain at least 8 characters", "error");
     return;
 }

 if (!hasLetters || !hasNumbers) {
     showMessage(message, "Password must include both letters and numbers", "error");
     return;
 }

 // Show loading state
 setButtonLoading(submitButton, buttonText, loader, true);

 try {
     // For now, send as JSON until backend supports file uploads
     const response = await fetch("http://localhost:3000/api/request-verification", {
         method: "POST",
         headers: {
             "Content-Type": "application/json",
         },
         body: JSON.stringify(formValues),
     });

     const data = await response.json();

     if (response.ok) {
      userEmail = formValues.email;
      showMessage(message, "Verification code sent to your email!", "success");
      
      // Switch to verification step after a short delay
      setTimeout(() => {
          switchToVerificationStep();
      }, 1500);
  } else {
      
      if (data.message) {
          
          showMessage(message, data.message, "error");
      } else {
          
          showMessage(message, "Error sending verification code. Please try again.", "error");
      }
  }
} catch (error) {
  
  showMessage(message, "Connection error. Please try again.", "error");
} finally {
  setButtonLoading(submitButton, buttonText, loader, false);
}
});

// Step 2: Verification Form Submission
document.getElementById("verificationForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const verificationCode = document.getElementById("verificationCode").value;
    const message = document.getElementById("verificationMessage");
    const submitButton = document.getElementById("verifyBtn");
    const buttonText = document.getElementById("verifyBtnText");
    const loader = document.getElementById("verifyLoader");

    if (verificationCode.length !== 6 || !/^\d{6}$/.test(verificationCode)) {
        showMessage(message, "Please enter a valid 6-digit code", "error");
        return;
    }

    // Show loading state
    setButtonLoading(submitButton, buttonText, loader, true);

    try {
        const response = await fetch("http://localhost:3000/api/verify-signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: userEmail,
                verificationCode: verificationCode
            }),
        });

        const data = await response.json();

        if (response.ok) {
            // Account created successfully
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userRole', data.user.role);
            
            showMessage(message, "Account created successfully! Redirecting...", "success");
            
            // Redirect based on user role
            setTimeout(() => {
                if (data.user.role === 'admin') {
                    window.location.href = "./admin-dashboard.html";
                } else {
                    window.location.href = "./home.html";
                }
            }, 1500);
        } else {
            if (data.message && data.message.includes("too many")) {
                // Too many attempts - restart process
                showMessage(message, data.message, "error");
                setTimeout(() => {
                    resetToSignupStep();
                }, 3000);
            } else {
                showMessage(message, data.message || "Invalid verification code. Please try again.", "error");
            }
        }
    } catch (error) {
        showMessage(message, "Connection error. Please try again.", "error");
    } finally {
        setButtonLoading(submitButton, buttonText, loader, false);
    }
});

// Resend Code Functionality
document.getElementById("resendBtn").addEventListener("click", async function() {
    const resendBtn = document.getElementById("resendBtn");
    const message = document.getElementById("verificationMessage");
    
    resendBtn.disabled = true;
    const originalText = resendBtn.textContent;
    resendBtn.textContent = "Sending...";

    try {
        const response = await fetch("http://localhost:3000/api/resend-code", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: userEmail
            }),
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(message, "New verification code sent!", "success");
            startResendCountdown();
        } else {
            showMessage(message, data.message || "Failed to resend code. Please try again.", "error");
            resendBtn.disabled = false;
            resendBtn.textContent = originalText;
        }
    } catch (error) {
        showMessage(message, "Connection error. Please try again.", "error");
        resendBtn.disabled = false;
        resendBtn.textContent = originalText;
    }
});

// Back to Signup Functionality
document.getElementById("backToSignup").addEventListener("click", function(event) {
    event.preventDefault();
    resetToSignupStep();
});

// Utility Functions
function showMessage(messageElement, text, type) {
    messageElement.textContent = text;
    messageElement.className = `message ${type}`;
}

function setButtonLoading(button, textElement, loader, isLoading) {
    if (isLoading) {
        button.disabled = true;
        textElement.classList.add('hidden');
        loader.classList.remove('hidden');
    } else {
        button.disabled = false;
        textElement.classList.remove('hidden');
        loader.classList.add('hidden');
    }
}

function switchToVerificationStep() {
    document.getElementById("signupStep").classList.add("hidden");
    document.getElementById("verificationStep").classList.remove("hidden");
    document.getElementById("verificationEmail").textContent = userEmail;
    
    // Clear verification form
    document.getElementById("verificationCode").value = "";
    document.getElementById("verificationMessage").textContent = "";
    document.getElementById("verificationMessage").className = "message";
    
    // Start resend countdown
    startResendCountdown();
    
    // Focus on verification input
    setTimeout(() => {
        document.getElementById("verificationCode").focus();
    }, 100);
}

function resetToSignupStep() {
    document.getElementById("verificationStep").classList.add("hidden");
    document.getElementById("signupStep").classList.remove("hidden");
    
    // Clear messages
    document.getElementById("signupMessage").textContent = "";
    document.getElementById("signupMessage").className = "message";
    document.getElementById("verificationMessage").textContent = "";
    document.getElementById("verificationMessage").className = "message";
    
    // Reset resend timer
    if (resendTimer) {
        clearInterval(resendTimer);
        resendTimer = null;
    }
    
    // Reset email
    userEmail = "";
}

function startResendCountdown() {
    const resendBtn = document.getElementById("resendBtn");
    const countdown = document.getElementById("countdown");
    const countdownTimer = document.getElementById("countdownTimer");
    
    resendCountdown = 60;
    resendBtn.disabled = true;
    resendBtn.textContent = "Code Sent";
    countdown.classList.remove("hidden");
    
    resendTimer = setInterval(() => {
        resendCountdown--;
        countdownTimer.textContent = resendCountdown;
        
        if (resendCountdown <= 0) {
            clearInterval(resendTimer);
            resendTimer = null;
            resendBtn.disabled = false;
            resendBtn.textContent = "Resend Code";
            countdown.classList.add("hidden");
        }
    }, 1000);
}

// Auto-format verification code input (numbers only)
document.getElementById("verificationCode").addEventListener("input", function(event) {
    const input = event.target;
    const value = input.value.replace(/\D/g, ''); // Remove non-digits
    input.value = value;
    
    // Auto-submit when 6 digits are entered
    if (value.length === 6) {
        document.getElementById("verificationForm").dispatchEvent(new Event('submit'));
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

// Initialize particles on page load
window.addEventListener('load', createParticles);