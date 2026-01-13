// Custom JavaScript for Safe Wallet
(function() {
  'use strict';
  
  // Snackbar notification function
  function showSnackbar(message, type = 'info') {
    const snackbar = document.getElementById('snackbar');
    if (snackbar) {
      snackbar.textContent = message;
      snackbar.className = `snackbar show ${type}`;
      setTimeout(() => {
        snackbar.classList.remove('show');
      }, 3000);
    }
  }
  
  // Make it globally available
  window.showSnackbar = showSnackbar;

  // Sidebar Toggle Functionality
  document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (sidebarToggle && sidebar) {
      // Toggle sidebar
      sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('open');
        if (sidebarOverlay) {
          sidebarOverlay.classList.toggle('active');
        }
      });

      // Close sidebar when clicking overlay
      if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
          sidebar.classList.remove('open');
          sidebarOverlay.classList.remove('active');
        });
      }

      // Set active nav link based on current URL
      const currentPath = window.location.pathname;
      const navLinks = document.querySelectorAll('.nav-link');
      
      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath.startsWith(href) && href !== '/')) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }
  });
})();
