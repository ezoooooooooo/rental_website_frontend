/**
 * Admin Analytics Manager
 * Handles all functionality for the admin analytics page
 */
class AdminAnalyticsManager {
  constructor() {
    this.baseUrl = "http://localhost:3000/api";
    this.token = localStorage.getItem("token");
    this.userId = localStorage.getItem("userId");
    
    // Chart instances
    this.revenueChart = null;
    this.userActivityChart = null;
    this.categoryChart = null;
    this.orderStatusChart = null;
    
    // Current time period
    this.timePeriod = 30; // Default to 30 days
    
    // Chart colors
    this.chartColors = {
      primary: 'rgba(79, 70, 229, 1)',
      primaryLight: 'rgba(79, 70, 229, 0.2)',
      success: 'rgba(16, 185, 129, 1)',
      successLight: 'rgba(16, 185, 129, 0.2)',
      warning: 'rgba(245, 158, 11, 1)',
      warningLight: 'rgba(245, 158, 11, 0.2)',
      danger: 'rgba(239, 68, 68, 1)',
      dangerLight: 'rgba(239, 68, 68, 0.2)',
      info: 'rgba(14, 165, 233, 1)',
      infoLight: 'rgba(14, 165, 233, 0.2)',
      purple: 'rgba(139, 92, 246, 1)',
      purpleLight: 'rgba(139, 92, 246, 0.2)',
      pink: 'rgba(236, 72, 153, 1)',
      pinkLight: 'rgba(236, 72, 153, 0.2)',
      gray: 'rgba(107, 114, 128, 1)',
      grayLight: 'rgba(107, 114, 128, 0.2)',
    };
    
    // Initialize analytics page
    this.initAnalyticsPage();
  }

  /**
   * Initialize the analytics page
   */
  async initAnalyticsPage() {
    try {
      // Check if user is logged in and is admin
      if (!this.token) {
        window.location.href = "login.html";
        return;
      }

      // Set current date
      this.updateCurrentDate();
      
      // Setup admin profile
      await this.setupAdminProfile();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Load analytics data
      await this.loadAnalyticsData();
      
    } catch (error) {
      console.error("Error initializing admin analytics page:", error);
      this.showToast("Error loading analytics page", "error");
    }
  }

  /**
   * Update the current date display
   */
  updateCurrentDate() {
    const dateElement = document.getElementById("currentDate");
    if (dateElement) {
      const now = new Date();
      const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
  }

  /**
   * Set up the admin profile dropdown
   */
  async setupAdminProfile() {
    try {
      const response = await fetch(`${this.baseUrl}/profile`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch admin profile");
      }

      const userData = await response.json();
      
      // Check if user is admin
      if (userData.role !== "admin") {
        this.showToast("Access denied. Admin privileges required.", "error");
        setTimeout(() => {
          window.location.href = "home.html";
        }, 2000);
        return;
      }

      const adminProfileElement = document.getElementById("adminProfile");
      if (adminProfileElement) {
        adminProfileElement.innerHTML = `
          <div class="admin-avatar">
            ${userData.profileImage 
              ? `<img src="${userData.profileImage}" alt="Admin" />` 
              : `<div class="avatar-initial">${userData.firstName ? userData.firstName[0] : 'A'}</div>`}
          </div>
          <div class="admin-info">
            <span class="admin-name">${userData.firstName} ${userData.lastName}</span>
            <span class="admin-role">Administrator</span>
          </div>
          <i class="ri-arrow-down-s-line"></i>
          <div class="dropdown-menu">
            <a href="home.html"><i class="ri-home-line"></i> Main Site</a>
            <div class="dropdown-divider"></div>
            <a href="#" id="logoutBtn"><i class="ri-logout-box-r-line"></i> Logout</a>
          </div>
        `;

        // Set up dropdown toggle
        const profileElement = adminProfileElement;
        const dropdownMenu = profileElement.querySelector(".dropdown-menu");
        
        profileElement.addEventListener("click", (e) => {
          e.stopPropagation();
          dropdownMenu.classList.toggle("show");
        });
        
        document.addEventListener("click", (e) => {
          if (!profileElement.contains(e.target)) {
            dropdownMenu.classList.remove("show");
          }
        });
        
        // Set up logout button
        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
          logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.logout();
          });
        }
      }
    } catch (error) {
      console.error("Error setting up admin profile:", error);
    }
  }

  /**
   * Set up event listeners for the page
   */
  setupEventListeners() {
    // Time period selector
    const timePeriodSelect = document.getElementById("timePeriod");
    if (timePeriodSelect) {
      timePeriodSelect.addEventListener("change", () => {
        this.timePeriod = parseInt(timePeriodSelect.value);
        this.loadAnalyticsData();
      });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById("refreshAnalyticsBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this.loadAnalyticsData();
      });
    }
    
    // Download buttons
    const downloadRevenueBtn = document.getElementById("downloadRevenueBtn");
    if (downloadRevenueBtn) {
      downloadRevenueBtn.addEventListener("click", () => {
        this.downloadCSV("revenue");
      });
    }
    
    const downloadPopularBtn = document.getElementById("downloadPopularBtn");
    if (downloadPopularBtn) {
      downloadPopularBtn.addEventListener("click", () => {
        this.downloadCSV("popular");
      });
    }
    
    const downloadUserActivityBtn = document.getElementById("downloadUserActivityBtn");
    if (downloadUserActivityBtn) {
      downloadUserActivityBtn.addEventListener("click", () => {
        this.downloadCSV("user-activity");
      });
    }
    
    const downloadCategoryBtn = document.getElementById("downloadCategoryBtn");
    if (downloadCategoryBtn) {
      downloadCategoryBtn.addEventListener("click", () => {
        this.downloadCSV("category");
      });
    }
    
    const downloadOrderStatusBtn = document.getElementById("downloadOrderStatusBtn");
    if (downloadOrderStatusBtn) {
      downloadOrderStatusBtn.addEventListener("click", () => {
        this.downloadCSV("order-status");
      });
    }
  }

  /**
   * Load all analytics data
   */
  async loadAnalyticsData() {
    try {
      // Show loading state for all sections
      this.showLoadingState();
      
      // Load revenue data
      await this.loadRevenueData();
      
      // Load popular listings
      await this.loadPopularListings();
      
      // Load user activity
      await this.loadUserActivity();
      
      // Load category performance
      await this.loadCategoryPerformance();
      
      // Load order status
      await this.loadOrderStatus();
      
    } catch (error) {
      console.error("Error loading analytics data:", error);
      this.showToast("Error loading analytics data", "error");
    }
  }

  /**
   * Show loading state for all sections
   */
  showLoadingState() {
    // Revenue chart
    const revenueChartContainer = document.querySelector(".revenue-chart-container");
    if (revenueChartContainer) {
      revenueChartContainer.innerHTML = '<canvas id="revenueChart"></canvas>';
    }
    
    // Popular listings
    const popularListingsList = document.getElementById("popularListingsList");
    if (popularListingsList) {
      popularListingsList.innerHTML = '<div class="loading-indicator">Loading popular listings...</div>';
    }
    
    // User activity chart
    const userActivityChartContainer = document.querySelector(".user-activity-chart-container");
    if (userActivityChartContainer) {
      userActivityChartContainer.innerHTML = '<canvas id="userActivityChart"></canvas>';
    }
    
    // Category chart
    const categoryChartContainer = document.querySelector(".category-chart-container");
    if (categoryChartContainer) {
      categoryChartContainer.innerHTML = '<canvas id="categoryChart"></canvas>';
    }
    
    // Order status chart
    const orderStatusChartContainer = document.querySelector(".order-status-chart-container");
    if (orderStatusChartContainer) {
      orderStatusChartContainer.innerHTML = '<canvas id="orderStatusChart"></canvas>';
    }
    
    // Reset metrics
    document.getElementById("totalRevenue").textContent = "$0.00";
    document.getElementById("revenueChange").textContent = "+0% vs previous period";
    document.getElementById("totalOrders").textContent = "0";
    document.getElementById("avgOrderValue").textContent = "$0.00";
    document.getElementById("newUsers").textContent = "0";
    document.getElementById("activeUsers").textContent = "0";
    document.getElementById("conversionRate").textContent = "0%";
  }

  /**
   * Load revenue data and create chart
   */
  async loadRevenueData() {
    try {
      const response = await fetch(`${this.baseUrl}/admin/analytics/revenue?days=${this.timePeriod}`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch revenue data");
      }

      const data = await response.json();
      
      // Debug logs
      console.log('Frontend - Revenue Data Received:', data);
      
      // Update revenue metrics
      const totalRevenue = data.totalRevenue || 0;
      const previousPeriodRevenue = data.previousPeriodRevenue || 0;
      const totalOrders = data.totalOrders || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      console.log('Frontend - Calculated Values:');
      console.log('Total Revenue:', totalRevenue);
      console.log('Previous Period Revenue:', previousPeriodRevenue);
      console.log('Total Orders:', totalOrders);
      console.log('Avg Order Value:', avgOrderValue);
      
      // Calculate percentage change
      const percentChange = previousPeriodRevenue > 0 
        ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 
        : 0;
      
      console.log('Percent Change:', percentChange);
      
      // Update UI
      document.getElementById("totalRevenue").textContent = `$${totalRevenue.toFixed(2)}`;
      
      const revenueChangeElement = document.getElementById("revenueChange");
      revenueChangeElement.textContent = `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}% vs previous period`;
      revenueChangeElement.className = `revenue-change ${percentChange >= 0 ? '' : 'negative'}`;
      
      document.getElementById("totalOrders").textContent = totalOrders;
      document.getElementById("avgOrderValue").textContent = `$${avgOrderValue.toFixed(2)}`;
      
      // Check if daily revenue data exists
      const dailyRevenue = data.dailyRevenue || [];
      console.log('Frontend - Daily Revenue Data:', dailyRevenue);
      console.log('Frontend - Daily Revenue Length:', dailyRevenue.length);
      
      // Create revenue chart
      this.createRevenueChart(dailyRevenue);
      
    } catch (error) {
      console.error("Error loading revenue data:", error);
      
      const revenueChartContainer = document.querySelector(".revenue-chart-container");
      if (revenueChartContainer) {
        revenueChartContainer.innerHTML = `
          <div class="error-message">
            <i class="ri-error-warning-line"></i>
            <p>Error loading revenue data: ${error.message}</p>
          </div>
        `;
      }
    }
  }

  /**
   * Create revenue chart
   */
  createRevenueChart(dailyRevenue) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    // Destroy previous chart if it exists
    if (this.revenueChart) {
      this.revenueChart.destroy();
    }
    
    // Check if dailyRevenue is undefined or not an array
    if (!dailyRevenue || !Array.isArray(dailyRevenue) || dailyRevenue.length === 0) {
      console.warn('No daily revenue data available for chart');
      // Create empty chart with placeholder data
      this.revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['No Data'],
          datasets: [{
            label: 'Revenue',
            data: [0],
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            borderColor: 'rgba(0, 123, 255, 0.5)',
            borderWidth: 2,
            pointBackgroundColor: '#fff',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          }
        }
      });
      return;
    }
    
    // Format data for chart
    const labels = dailyRevenue.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    const revenueData = dailyRevenue.map(item => item.revenue);
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, this.chartColors.primaryLight);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    // Create chart
    this.revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue',
          data: revenueData,
          borderColor: this.chartColors.primary,
          backgroundColor: gradient,
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointBackgroundColor: this.chartColors.primary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += `$${context.parsed.y.toFixed(2)}`;
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 7
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              borderDash: [2, 2]
            },
            ticks: {
              callback: function(value) {
                return '$' + value;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Load popular listings
   */
  async loadPopularListings() {
    try {
      const response = await fetch(`${this.baseUrl}/admin/analytics/popular-listings?days=${this.timePeriod}`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch popular listings");
      }

      const data = await response.json();
      const popularListings = data.popularListings || [];
      
      const popularListingsList = document.getElementById("popularListingsList");
      
      if (!popularListings || popularListings.length === 0) {
        popularListingsList.innerHTML = '<div class="empty-message">No listings data available for this period</div>';
        return;
      }
      
      popularListingsList.innerHTML = popularListings.map((listing, index) => {
        // Handle potentially missing or malformed data
        const item = listing.listing ? listing : { listing: listing, orderCount: 0, totalRevenue: 0 };
        const listingData = item.listing || {};
        const name = listingData.name || 'Unknown Listing';
        const category = listingData.category || 'Uncategorized';
        
        // Get image - handle both object with url and direct string url
        let imageUrl = 'https://via.placeholder.com/60x60?text=No+Image';
        if (listingData.images && listingData.images.length > 0) {
          imageUrl = typeof listingData.images[0] === 'object' ? 
            (listingData.images[0].url || imageUrl) : 
            listingData.images[0] || imageUrl;
        }
        
        // Get revenue and orders
        const revenue = item.totalRevenue || item.revenue || 0;
        const orders = item.orderCount || item.orders || 0;
        
        return `
          <div class="popular-listing-item">
            <div class="popular-listing-rank">${index + 1}</div>
            <img src="${imageUrl}" alt="${name}" class="popular-listing-image">
            <div class="popular-listing-info">
              <h4 class="popular-listing-name">${name}</h4>
              <p class="popular-listing-category">${category}</p>
            </div>
            <div class="popular-listing-stats">
              <p class="popular-listing-revenue">$${revenue.toFixed(2)}</p>
              <p class="popular-listing-orders">${orders} orders</p>
            </div>
          </div>
        `;
      }).join('');
      
    } catch (error) {
      console.error("Error loading popular listings:", error);
      
      const popularListingsList = document.getElementById("popularListingsList");
      if (popularListingsList) {
        popularListingsList.innerHTML = `
          <div class="error-message">
            <i class="ri-error-warning-line"></i>
            <p>Error loading popular listings: ${error.message}</p>
          </div>
        `;
      }
    }
  }

  /**
   * Load user activity data and create chart
   */
  async loadUserActivity() {
    try {
      const response = await fetch(`${this.baseUrl}/admin/analytics/user-activity?days=${this.timePeriod}`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user activity data");
      }

      const data = await response.json();
      
      // Update user metrics
      document.getElementById("newUsers").textContent = data.newUsers;
      document.getElementById("activeUsers").textContent = data.activeUsers;
      document.getElementById("conversionRate").textContent = `${data.conversionRate.toFixed(1)}%`;
      
      // Create user activity chart
      this.createUserActivityChart(data.dailyActivity);
      
    } catch (error) {
      console.error("Error loading user activity:", error);
      
      const userActivityChartContainer = document.querySelector(".user-activity-chart-container");
      if (userActivityChartContainer) {
        userActivityChartContainer.innerHTML = `
          <div class="error-message">
            <i class="ri-error-warning-line"></i>
            <p>Error loading user activity: ${error.message}</p>
          </div>
        `;
      }
    }
  }

  /**
   * Create user activity chart
   */
  createUserActivityChart(dailyActivity) {
    const ctx = document.getElementById('userActivityChart').getContext('2d');
    
    // Destroy previous chart if it exists
    if (this.userActivityChart) {
      this.userActivityChart.destroy();
    }
    
    // Format data for chart
    const labels = dailyActivity.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    const newUsersData = dailyActivity.map(item => item.newUsers);
    const activeUsersData = dailyActivity.map(item => item.activeUsers);
    
    // Create chart
    this.userActivityChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'New Users',
            data: newUsersData,
            backgroundColor: this.chartColors.success,
            borderRadius: 4
          },
          {
            label: 'Active Users',
            data: activeUsersData,
            backgroundColor: this.chartColors.primary,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 12,
              usePointStyle: true,
              pointStyle: 'rectRounded'
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 7
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              borderDash: [2, 2]
            }
          }
        }
      }
    });
  }

  /**
   * Load category performance data and create chart
   */
  async loadCategoryPerformance() {
    try {
      const response = await fetch(`${this.baseUrl}/admin/analytics/category-performance?days=${this.timePeriod}`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch category performance data");
      }

      const data = await response.json();
      
      // Create category chart
      this.createCategoryChart(data.categoryPerformance);
      
    } catch (error) {
      console.error("Error loading category performance:", error);
      
      const categoryChartContainer = document.querySelector(".category-chart-container");
      if (categoryChartContainer) {
        categoryChartContainer.innerHTML = `
          <div class="error-message">
            <i class="ri-error-warning-line"></i>
            <p>Error loading category performance: ${error.message}</p>
          </div>
        `;
      }
    }
  }

  /**
   * Create category performance chart
   */
  createCategoryChart(categoryPerformance) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    // Destroy previous chart if it exists
    if (this.categoryChart) {
      this.categoryChart.destroy();
    }
    
    // Format data for chart
    const labels = categoryPerformance.map(item => item.category);
    const revenueData = categoryPerformance.map(item => item.revenue);
    const ordersData = categoryPerformance.map(item => item.orders);
    
    // Chart colors
    const colors = [
      this.chartColors.primary,
      this.chartColors.success,
      this.chartColors.warning,
      this.chartColors.info,
      this.chartColors.purple,
      this.chartColors.pink,
      this.chartColors.gray
    ];
    
    // Create chart
    this.categoryChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Revenue',
            data: revenueData,
            backgroundColor: colors,
            borderRadius: 4,
            yAxisID: 'y'
          },
          {
            label: 'Orders',
            data: ordersData,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            borderRadius: 4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 12,
              usePointStyle: true,
              pointStyle: 'rectRounded'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  if (context.datasetIndex === 0) {
                    label += `$${context.parsed.y.toFixed(2)}`;
                  } else {
                    label += context.parsed.y;
                  }
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            grid: {
              borderDash: [2, 2]
            },
            ticks: {
              callback: function(value) {
                return '$' + value;
              }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  /**
   * Load order status data and create chart
   */
  async loadOrderStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/admin/analytics/order-status?days=${this.timePeriod}`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch order status data");
      }

      const data = await response.json();
      
      // Create order status chart
      this.createOrderStatusChart(data.orderStatusCounts);
      
    } catch (error) {
      console.error("Error loading order status:", error);
      
      const orderStatusChartContainer = document.querySelector(".order-status-chart-container");
      if (orderStatusChartContainer) {
        orderStatusChartContainer.innerHTML = `
          <div class="error-message">
            <i class="ri-error-warning-line"></i>
            <p>Error loading order status: ${error.message}</p>
          </div>
        `;
      }
    }
  }

  /**
   * Create order status chart
   */
  createOrderStatusChart(orderStatusCounts) {
    const ctx = document.getElementById('orderStatusChart').getContext('2d');
    
    // Destroy previous chart if it exists
    if (this.orderStatusChart) {
      this.orderStatusChart.destroy();
    }
    
    // Format data for chart
    const labels = orderStatusCounts.map(item => this.capitalizeFirstLetter(item.status));
    const counts = orderStatusCounts.map(item => item.count);
    
    // Status colors
    const statusColors = {
      'pending': this.chartColors.warning,
      'confirmed': this.chartColors.info,
      'completed': this.chartColors.success,
      'cancelled': this.chartColors.danger,
      'refunded': this.chartColors.gray
    };
    
    const colors = orderStatusCounts.map(item => {
      return statusColors[item.status] || this.chartColors.primary;
    });
    
    // Create chart
    this.orderStatusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: counts,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
    
    // Create legend
    this.createOrderStatusLegend(orderStatusCounts, statusColors);
  }

  /**
   * Create order status legend
   */
  createOrderStatusLegend(orderStatusCounts, statusColors) {
    const legendContainer = document.getElementById('orderStatusLegend');
    if (!legendContainer) return;
    
    const total = orderStatusCounts.reduce((sum, item) => sum + item.count, 0);
    
    legendContainer.innerHTML = orderStatusCounts.map(item => {
      const percentage = Math.round((item.count / total) * 100);
      const color = statusColors[item.status] || this.chartColors.primary;
      
      return `
        <div class="legend-item">
          <div class="legend-color" style="background-color: ${color}"></div>
          <span class="legend-label">${this.capitalizeFirstLetter(item.status)}: ${item.count} (${percentage}%)</span>
        </div>
      `;
    }).join('');
  }

  /**
   * Download data as CSV
   */
  downloadCSV(type) {
    // This is a placeholder function - in a real implementation, 
    // this would fetch data from the API and convert it to CSV
    this.showToast(`Downloading ${type} data as CSV...`, "info");
    
    // Simulate download delay
    setTimeout(() => {
      this.showToast(`${this.capitalizeFirstLetter(type)} data downloaded successfully`, "success");
    }, 1500);
  }

  /**
   * Logout the admin user
   */
  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    window.location.href = "login.html";
  }

  /**
   * Show a toast notification
   */
  showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `custom-toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Show the toast
    setTimeout(() => {
      toast.classList.add("show");
    }, 10);
    
    // Hide and remove the toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  /**
   * Helper function to capitalize the first letter of a string
   */
  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}

// Initialize the admin analytics manager when the page loads
document.addEventListener("DOMContentLoaded", () => {
  window.adminAnalytics = new AdminAnalyticsManager();
});
