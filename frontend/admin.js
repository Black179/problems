document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Verify token is still valid
    verifyToken(token);
    
    // DOM Elements
    const submissionsTableBody = document.getElementById('submissionsTableBody');
    const filterField = document.getElementById('filterField');
    const filterStatus = document.getElementById('filterStatus');
    const sortBy = document.getElementById('sortBy');
    const refreshBtn = document.getElementById('refreshBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const viewProblemModal = new bootstrap.Modal(document.getElementById('viewProblemModal'));
    const problemDetails = document.getElementById('problemDetails');
    
    // State
    let submissions = [];
    let fields = new Set();
    let currentPage = 1;
    const itemsPerPage = 10;
    
    // Verify token validity
    async function verifyToken(token) {
        try {
            const response = await fetch('/.netlify/functions/server/api/admin/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Invalid token');
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            localStorage.removeItem('adminToken');
            sessionStorage.removeItem('adminToken');
            window.location.href = 'login.html';
        }
    }
    
    // Get token for API requests
    function getAuthHeader() {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        return {
            'Authorization': `Bearer ${token}`
        };
    }
    
    // Logout function
    function logout() {
        localStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminToken');
        window.location.href = 'login.html';
    }
    
    // Initialize the page
    async function init() {
        await fetchSubmissions();
        setupEventListeners();
    }
    
    // Fetch submissions from the API
    async function fetchSubmissions() {
        try {
            const params = new URLSearchParams();
            if (filterField.value) params.append('field', filterField.value);
            if (filterStatus.value) params.append('status', filterStatus.value);
            params.append('sortBy', sortBy.value);
            
            const response = await fetch(`/.netlify/functions/server/api/problems?${params.toString()}`, {
                headers: getAuthHeader()
            });
            
            if (response.status === 401 || response.status === 403) {
                logout();
                return;
            }
            
            if (!response.ok) {
                throw new Error('Failed to fetch submissions');
            }
            
            const data = await response.json();
            submissions = data.data || [];
            
            // Extract unique fields for filter
            updateFieldsList();
            renderTable();
            renderPagination();
            
        } catch (error) {
            console.error('Error fetching submissions:', error);
            submissionsTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading data. Please try again.</td></tr>';
        }
    }
    
    // Update the fields dropdown with unique field values
    function updateFieldsList() {
        fields = new Set(submissions.map(sub => sub.field).filter(Boolean));
        const fieldSelect = document.getElementById('filterField');
        const currentValue = fieldSelect.value;
        
        // Clear and add default option
        fieldSelect.innerHTML = '<option value="">All Fields</option>';
        
        // Add field options
        fields.forEach(field => {
            const option = document.createElement('option');
            option.value = field;
            option.textContent = field;
            fieldSelect.appendChild(option);
        });
        
        // Restore previous selection if it still exists
        if (currentValue && Array.from(fields).includes(currentValue)) {
            fieldSelect.value = currentValue;
        }
    }
    
    // Render the submissions table
    function renderTable() {
        if (submissions.length === 0) {
            submissionsTableBody.innerHTML = '<tr><td colspan="9" class="text-center">No submissions found.</td></tr>';
            return;
        }
        
        // Calculate pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, submissions.length);
        const paginatedSubmissions = submissions.slice(startIndex, endIndex);
        
        submissionsTableBody.innerHTML = '';
        
        paginatedSubmissions.forEach(submission => {
            const row = document.createElement('tr');
            const date = new Date(submission.createdAt).toLocaleString();
            const problemPreview = submission.problem.length > 50 
                ? `${submission.problem.substring(0, 50)}...` 
                : submission.problem;
            
            // Create urgency badge
            const urgencyColors = {
                'Low': 'success',
                'Medium': 'warning',
                'High': 'orange',
                'Critical': 'danger'
            };
            const urgencyColor = urgencyColors[submission.urgency] || 'secondary';
            
            row.innerHTML = `
                <td>${escapeHtml(submission.name)}</td>
                <td>${escapeHtml(submission.contactNo)}</td>
                <td><span class="status-badge status-${submission.status}">${submission.status}</span></td>
                <td>${escapeHtml(submission.field)}</td>
                <td><span class="badge bg-info">${escapeHtml(submission.problemType || 'N/A')}</span></td>
                <td><span class="badge bg-${urgencyColor}">${escapeHtml(submission.urgency || 'N/A')}</span></td>
                <td>${escapeHtml(problemPreview)}</td>
                <td>${new Date(submission.createdAt).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-btn" data-id="${submission.id || submission._id}">
                        <i class="bi bi-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${submission.id || submission._id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            submissionsTableBody.appendChild(row);
        });
        
        // Add event listeners to buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', handleViewProblem);
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDeleteProblem);
        });
    }
    
    // Render pagination controls
    function renderPagination() {
        const totalPages = Math.ceil(submissions.length / itemsPerPage);
        const pagination = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Previous button
        html += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        // Next button
        html += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `;
        
        pagination.innerHTML = html;
        
        // Add event listeners to pagination links
        document.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const page = parseInt(this.getAttribute('data-page'));
                if (page >= 1 && page <= totalPages && page !== currentPage) {
                    currentPage = page;
                    renderTable();
                    // Scroll to top of table
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
    
    // Handle view problem button click
    async function handleViewProblem(e) {
        const id = e.currentTarget.getAttribute('data-id');
        try {
            const response = await fetch(`/.netlify/functions/server/api/problems/${id}`, {
                headers: getAuthHeader()
            });
            
            if (response.status === 401 || response.status === 403) {
                logout();
                return;
            }
            
            if (!response.ok) {
                throw new Error('Failed to fetch problem details');
            }
            
            const problem = await response.json();
            const date = new Date(problem.createdAt).toLocaleString();
            
            const urgencyColors = {
                'Low': 'success',
                'Medium': 'warning',
                'High': 'orange',
                'Critical': 'danger'
            };
            const urgencyColor = urgencyColors[problem.urgency] || 'secondary';
            
            problemDetails.innerHTML = `
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <h6><i class="bi bi-person-fill"></i> Name</h6>
                        <p>${escapeHtml(problem.name)}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                        <h6><i class="bi bi-telephone-fill"></i> Contact Number</h6>
                        <p>${escapeHtml(problem.contactNo)}</p>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-4 mb-3">
                        <h6><i class="bi bi-briefcase-fill"></i> Status</h6>
                        <p><span class="status-badge status-${problem.status}">${problem.status}</span></p>
                    </div>
                    <div class="col-md-4 mb-3">
                        <h6><i class="bi bi-bookmark-fill"></i> Field</h6>
                        <p>${escapeHtml(problem.field)}</p>
                    </div>
                    <div class="col-md-4 mb-3">
                        <h6><i class="bi bi-calendar-fill"></i> Submitted On</h6>
                        <p>${date}</p>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <h6><i class="bi bi-tag-fill"></i> Problem Type</h6>
                        <p><span class="badge bg-info">${escapeHtml(problem.problemType || 'Not specified')}</span></p>
                    </div>
                    <div class="col-md-6 mb-3">
                        <h6><i class="bi bi-exclamation-triangle-fill"></i> Urgency Level</h6>
                        <p><span class="badge bg-${urgencyColor}">${escapeHtml(problem.urgency || 'Not specified')}</span></p>
                    </div>
                </div>
                
                ${problem.whenStarted ? `
                <div class="mb-3">
                    <h6><i class="bi bi-clock-fill"></i> When Started</h6>
                    <p>${escapeHtml(problem.whenStarted)}</p>
                </div>
                ` : ''}
                
                <div class="mb-3">
                    <h6><i class="bi bi-file-text-fill"></i> Problem Description</h6>
                    <div class="p-3 bg-light rounded">
                        ${escapeHtml(problem.problem).replace(/\n/g, '<br>')}
                    </div>
                </div>
                
                ${problem.solutionsTried ? `
                <div class="mb-3">
                    <h6><i class="bi bi-tools"></i> Solutions Tried</h6>
                    <div class="p-3 bg-light rounded">
                        ${escapeHtml(problem.solutionsTried).replace(/\n/g, '<br>')}
                    </div>
                </div>
                ` : ''}
                
                ${problem.expectedOutcome ? `
                <div class="mb-3">
                    <h6><i class="bi bi-trophy-fill"></i> Expected Outcome</h6>
                    <div class="p-3 bg-light rounded">
                        ${escapeHtml(problem.expectedOutcome).replace(/\n/g, '<br>')}
                    </div>
                </div>
                ` : ''}
            `;
            
            viewProblemModal.show();
            
        } catch (error) {
            console.error('Error fetching problem details:', error);
            problemDetails.innerHTML = '<div class="alert alert-danger">Error loading problem details. Please try again.</div>';
        }
    }
    
    // Handle delete problem button click
    async function handleDeleteProblem(e) {
        if (!confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
            return;
        }
        
        const id = e.currentTarget.getAttribute('data-id');
        const row = e.currentTarget.closest('tr');
        
        try {
            const response = await fetch(`/.netlify/functions/server/api/problems/${id}`, {
                method: 'DELETE',
                headers: getAuthHeader()
            });
            
            if (response.status === 401 || response.status === 403) {
                logout();
                return;
            }
            
            if (!response.ok) {
                throw new Error('Failed to delete submission');
            }
            
            // Remove the row from the table
            row.remove();
            
            // Refresh the data
            await fetchSubmissions();
            
        } catch (error) {
            console.error('Error deleting submission:', error);
            alert('Failed to delete submission. Please try again.');
        }
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Filter and sort controls
        [filterField, filterStatus, sortBy].forEach(control => {
            control.addEventListener('change', () => {
                currentPage = 1; // Reset to first page when filters change
                fetchSubmissions();
            });
        });
        
        // Refresh button
        if (refreshBtn) {
            refreshBtn.addEventListener('click', fetchSubmissions);
        }
        
        // Logout button
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
    }
    
    // Helper function to escape HTML
    function escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    // Initialize the page
    init();
});
