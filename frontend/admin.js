document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Note: Removed token verification call that was causing redirect loop
    // Token verification happens on API requests instead

    // DOM Elements - moved inside DOMContentLoaded to ensure DOM is ready
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
            // Get fresh references to DOM elements to ensure they're available
            const filterField = document.getElementById('filterField');
            const filterStatus = document.getElementById('filterStatus');
            const sortBy = document.getElementById('sortBy');

            const params = new URLSearchParams();
            if (filterField && filterField.value) params.append('field', filterField.value);
            if (filterStatus && filterStatus.value) params.append('status', filterStatus.value);
            if (sortBy) params.append('sortBy', sortBy.value);
            
            const response = await fetch(`https://problems-production.up.railway.app/api/problems?${params.toString()}`, {
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
            const submissionsTableBody = document.getElementById('submissionsTableBody');
            if (submissionsTableBody) {
                submissionsTableBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error loading data. Please try again.</td></tr>';
            }
        }
    }
    
    // Update the fields dropdown with unique field values
    function updateFieldsList() {
        fields = new Set(submissions.map(sub => sub.field).filter(Boolean));
        const fieldSelect = document.getElementById('filterField');
        if (!fieldSelect) return;
        
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
        const submissionsTableBody = document.getElementById('submissionsTableBody');
        if (!submissionsTableBody) return;

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
        if (!pagination) return;
        
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
            const response = await fetch(`https://problems-production.up.railway.app/api/problems/${id}`, {
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
            const response = await fetch(`https://problems-production.up.railway.app/api/problems/${id}`, {
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
        // Get DOM elements within the function to ensure they're available
        const filterField = document.getElementById('filterField');
        const filterStatus = document.getElementById('filterStatus');
        const sortBy = document.getElementById('sortBy');
        const refreshBtn = document.getElementById('refreshBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        // Filter and sort controls
        if (filterField) {
            filterField.addEventListener('change', () => {
                currentPage = 1; // Reset to first page when filters change
                fetchSubmissions();
            });
        }

        if (filterStatus) {
            filterStatus.addEventListener('change', () => {
                currentPage = 1; // Reset to first page when filters change
                fetchSubmissions();
            });
        }

        if (sortBy) {
            sortBy.addEventListener('change', () => {
                currentPage = 1; // Reset to first page when filters change
                fetchSubmissions();
            });
        }
        
        // Refresh button
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('Refresh button clicked'); // Debug log
                fetchSubmissions();
            });
        }
        
        // Logout button
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }

        // Setup touch/swipe functionality for mobile
        setupTouchGestures();
    }
    
    // Touch/Swipe gesture setup for mobile table scrolling
    function setupTouchGestures() {
        const tableContainer = document.querySelector('.table-responsive');
        if (!tableContainer) return;

        let startX = 0;
        let startY = 0;
        let isScrolling = false;

        // Function to check if table is scrollable and update visual indicator
        function updateScrollIndicator() {
            const canScroll = tableContainer.scrollWidth > tableContainer.clientWidth;
            if (canScroll) {
                tableContainer.classList.add('scrollable');
            } else {
                tableContainer.classList.remove('scrollable');
            }
        }

        // Initial check
        updateScrollIndicator();

        // Update indicator when window resizes
        window.addEventListener('resize', updateScrollIndicator);

        // Update indicator after table content changes
        const observer = new MutationObserver(updateScrollIndicator);
        observer.observe(tableContainer, { childList: true, subtree: true });

        // Touch start event
        tableContainer.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isScrolling = false;
        });

        // Touch move event
        tableContainer.addEventListener('touchmove', function(e) {
            if (!startX || !startY) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;

            const diffX = startX - currentX;
            const diffY = startY - currentY;

            // If horizontal movement is greater than vertical, it's a swipe
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
                isScrolling = true;
                // Prevent default to avoid page scroll
                e.preventDefault();

                // Calculate scroll amount (smooth scrolling)
                const scrollAmount = diffX * 0.5;
                tableContainer.scrollLeft += scrollAmount;

                // Reset start position for continuous scrolling
                startX = currentX;
            }
        });

        // Touch end event
        tableContainer.addEventListener('touchend', function(e) {
            startX = 0;
            startY = 0;

            // Add momentum scrolling for better UX
            if (isScrolling) {
                // Optional: Add momentum scrolling effect
                setTimeout(() => {
                    isScrolling = false;
                }, 100);
            }
        });

        // Also enable native scrolling with enhanced smoothness
        tableContainer.style.scrollBehavior = 'smooth';
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
