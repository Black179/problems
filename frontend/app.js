document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('problemForm');
    const successMessage = document.getElementById('successMessage');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Reset form validation
            form.classList.add('was-validated');
            
            if (!form.checkValidity()) {
                e.stopPropagation();
                return;
            }
            
            try {
                const problemData = {
                    name: document.getElementById('name').value.trim(),
                    contactNo: document.getElementById('contactNo').value.trim(),
                    status: document.getElementById('status').value,
                    field: document.getElementById('field').value.trim(),
                    problemType: document.getElementById('problemType')?.value || '',
                    urgency: document.getElementById('urgency')?.value || '',
                    problem: document.getElementById('problem').value.trim(),
                    whenStarted: document.getElementById('whenStarted')?.value || '',
                    solutionsTried: document.getElementById('solutionsTried')?.value.trim() || '',
                    expectedOutcome: document.getElementById('expectedOutcome')?.value.trim() || ''
                };
                
                const response = await fetch('https://problems-production.up.railway.app/api/problems', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(problemData)
                });
                
                if (!response.ok) {
                    throw new Error('Failed to submit problem');
                }
                
                // Show success message and reset form
                successMessage.classList.remove('d-none');
                form.reset();
                form.classList.remove('was-validated');
                
                // Hide success message after 5 seconds
                setTimeout(() => {
                    successMessage.classList.add('d-none');
                }, 5000);
                
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while submitting the form. Please try again.');
            }
        });
    }
    
    // Contact number validation
    const contactInput = document.getElementById('contactNo');
    if (contactInput) {
        contactInput.addEventListener('input', function(e) {
            // Allow only numbers, spaces, +, -, and parentheses
            this.value = this.value.replace(/[^0-9+\-()\s]/g, '');
        });
    }
});
