document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const loginText = document.getElementById('loginText');
    const loginSpinner = document.getElementById('loginSpinner');
    
    // Check if already logged in
    const token = localStorage.getItem('adminToken');
    if (token) {
        window.location.href = 'admin.html';
    }
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        // Show loading state
        loginText.classList.add('d-none');
        loginSpinner.classList.remove('d-none');
        errorMessage.classList.add('d-none');
        
        try {
<<<<<<< HEAD
            const response = await fetch('/.netlify/functions/server/api/admin/login', {
=======
            const response = await fetch('https://problems-production.up.railway.app/api/admin/login', {
>>>>>>> a1520dc61de03cbf031e921fd063977509ad753c
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
<<<<<<< HEAD
                body: JSON.stringify({ email, password })
=======
                body: JSON.stringify({ 
                    email, 
                    password
                })
>>>>>>> a1520dc61de03cbf031e921fd063977509ad753c
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            
            // Store token
            if (rememberMe) {
                localStorage.setItem('adminToken', data.token);
            } else {
                sessionStorage.setItem('adminToken', data.token);
            }
            
            // Redirect to admin page
            window.location.href = 'admin.html';
            
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = error.message || 'Invalid username or password';
            errorMessage.classList.remove('d-none');
            
            // Reset button state
            loginText.classList.remove('d-none');
            loginSpinner.classList.add('d-none');
        }
    });
});
