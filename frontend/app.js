document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('problemForm');
    const successMessage = document.getElementById('successMessage');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
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
                
                // Basic validation for required fields
                if (!problemData.name || !problemData.contactNo || !problemData.problem) {
                    alert('Please fill in all required fields: Name, Contact Number, and Problem Description');
                    return;
                }
                
                const response = await fetch('https://problems-production.up.railway.app/api/problems', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(problemData)
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
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
                alert(`Error: ${error.message}`);
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
