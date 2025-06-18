# Rently - Rental Marketplace Frontend

Rently is a modern, responsive web application that connects renters with property and item owners. The platform enables users to browse, rent, and list various items while providing comprehensive administrative tools for managing the marketplace.

## 🚀 Features

### User Features
- **User Authentication**: Complete registration, login, and password recovery system
- **Item Browsing**: Search and filter items by categories (Electronics, Furniture, Pets Supplies, Clothes, Medical Equipment, Tools, Sports Equipment)
- **Item Details**: Detailed product pages with image galleries, descriptions, and pricing
- **Shopping Cart**: Add items to cart with quantity management
- **Favorites**: Save preferred items for later viewing
- **Order Management**: Track rental orders from request to completion
- **Rating System**: Rate and review both items and sellers
- **Notifications**: Real-time toast notifications for user actions
- **Responsive Design**: Fully responsive interface for desktop and mobile devices

### Admin Features
- **Admin Dashboard**: Comprehensive overview with statistics and analytics
- **User Management**: View, edit, and manage user accounts and roles
- **Order Management**: Process rental requests, approve/reject orders
- **Listing Management**: Oversee all item listings, approve new items
- **Analytics**: View detailed analytics and reports on platform usage
- **Revenue Tracking**: Monitor financial metrics and trends

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Icons**: RemixIcon
- **Styling**: Custom CSS with modern design principles
- **Image Handling**: Lightbox functionality for image galleries
- **Local Storage**: For cart persistence and user session management

## 📁 Project Structure

```
rental_website_frontend/
├── 📄 Authentication
│   ├── index.html              # Landing page
│   ├── login.html              # User login
│   ├── signup.html             # User registration
│   ├── forgot-password.html    # Password recovery
│   └── reset-password.html     # Password reset
│
├── 🏠 Main User Interface
│   ├── home.html               # Main homepage with item listings
│   ├── item-detail.html        # Detailed item view
│   ├── cart.html               # Shopping cart
│   ├── favorite.html           # User favorites
│   ├── my-orders.html          # User's rental orders
│   ├── my-requests.html        # User's rental requests
│   ├── notifications.html      # User notifications
│   ├── order-confirmation.html # Order confirmation page
│   └── payment.html            # Payment processing
│
├── 👑 Admin Panel
│   ├── admin-dashboard.html    # Admin overview
│   ├── admin-users.html        # User management
│   ├── admin-orders.html       # Order management
│   ├── admin-listings.html     # Listing management
│   └── admin-analytics.html    # Analytics dashboard
│
├── 🎨 Styling
│   ├── style.css               # Landing page styles
│   ├── home.css               # Main homepage styles
│   ├── item-detail.css        # Item detail page styles
│   ├── cart.css               # Shopping cart styles
│   ├── favorite.css           # Favorites page styles
│   ├── login.css              # Authentication styles
│   ├── signup.css             # Registration styles
│   ├── payment.css            # Payment page styles
│   ├── nav-styles.css         # Navigation styles
│   ├── nav-utils.css          # Navigation utilities
│   ├── rating.css             # Rating system styles
│   ├── enhanced-rating-system.css # Enhanced rating styles
│   ├── toast-notifications.css # Notification styles
│   ├── status-labels.css      # Status indicator styles
│   └── admin-*.css            # Admin panel styles
│
├── ⚡ JavaScript
│   ├── script.js              # Landing page functionality
│   ├── home.js                # Homepage functionality
│   ├── item-detail.js         # Item detail functionality
│   ├── cart.js                # Shopping cart logic
│   ├── favorite.js            # Favorites functionality
│   ├── items.js               # Item listing logic
│   ├── login.js               # Authentication logic
│   ├── signup.js              # Registration logic
│   ├── payment.js             # Payment processing
│   ├── nav-utils.js           # Navigation utilities
│   ├── lightbox.js            # Image gallery functionality
│   ├── enhanced-rating-system.js # Advanced rating system
│   ├── consolidated-rating.js # Rating consolidation
│   └── admin-*.js             # Admin panel functionality
│
└── 🖼️ Assets
    ├── rent.png               # Main logo
    └── empty-box.png          # Empty state illustration
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local web server (optional but recommended)

### Installation

1. **Clone the repository**:
   ```bash
   git clone [repository-url]
   cd rental_website_frontend
   ```

2. **Serve the files**:
   
   **Option A: Using Python**:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```
   
   **Option B: Using Node.js**:
   ```bash
   npx http-server
   ```
   
   **Option C: Using VS Code Live Server**:
   - Install the Live Server extension
   - Right-click on `index.html` and select "Open with Live Server"

3. **Access the application**:
   - Open your browser and navigate to `http://localhost:8000`
   - Start with the landing page (`index.html`)

## 💡 Usage

### For Users
1. **Getting Started**: Visit the landing page and click "Enter Site"
2. **Registration**: Create an account or login with existing credentials
3. **Browse Items**: Use the category navigation and search functionality
4. **Item Details**: Click on any item to view detailed information
5. **Add to Cart**: Select items and manage quantities in your cart
6. **Place Orders**: Proceed through the checkout process
7. **Track Orders**: Monitor your rental requests in "My Orders"
8. **Rate & Review**: Provide feedback on items and sellers

### For Administrators
1. **Access Admin Panel**: Login with admin credentials
2. **Dashboard Overview**: View key metrics and recent activity
3. **Manage Users**: Review and edit user accounts
4. **Process Orders**: Approve or reject rental requests
5. **Oversee Listings**: Manage item submissions and availability
6. **Analytics**: Review platform performance and trends

## 🔧 Configuration

### API Integration
The frontend is designed to work with a REST API backend. Update the API endpoints in the JavaScript files as needed:

```javascript
// Example API configuration
const API_BASE_URL = 'https://your-api-domain.com/api';
```

### Customization
- **Branding**: Update logos in the `/assets` folder
- **Styling**: Modify CSS files for custom themes
- **Categories**: Update category lists in `home.js`
- **Features**: Enable/disable features through JavaScript configuration

## 📱 Responsive Design

The application is fully responsive and includes:
- Mobile-first design approach
- Flexible grid layouts
- Touch-friendly interface elements
- Optimized images and performance
- Cross-browser compatibility

## 🎨 Features Overview

### Rating System
- Dual rating system for items and sellers
- Star-based rating interface
- Detailed review comments
- Rating aggregation and display

### Shopping Cart
- Persistent cart storage
- Quantity management
- Real-time price calculation
- Seamless checkout process

### Admin Analytics
- User growth metrics
- Order processing statistics
- Revenue tracking
- Platform performance indicators

### Notification System
- Toast notifications for user actions
- Real-time feedback
- Success and error handling
- Non-intrusive design

## 🔒 Security Features

- Client-side input validation
- Secure authentication flows
- XSS protection measures
- CSRF token implementation ready
- Secure data handling practices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the FAQ section

## 🚀 Future Enhancements

- Progressive Web App (PWA) capabilities
- Real-time chat system
- Advanced search filters
- Social media integration
- Multi-language support
- Dark mode theme

---

**Rently** - Making rentals simple and accessible for everyone.