# Dual Rating System Implementation Guide

This document provides instructions for implementing the dual rating system (item ratings and owner ratings) in your rental website.

## Overview

The rating system consists of:

1. **Item Ratings**: Users can rate rental items (1-5 stars) and leave text reviews
2. **Owner Ratings**: Users can rate owners/sellers with detailed ratings for communication, reliability, and item condition

## Files Structure

- `rating.css` - Styles for all rating components
- `rating.js` - Core rating system functionality
- `item-rating.js` - Item-specific rating functions
- `owner-rating.js` - Owner-specific rating functions
- `rating-templates.html` - HTML templates for easy integration

## Implementation Steps

### 1. Include Required Files

Add the following to your HTML `<head>` section:

```html
<link rel="stylesheet" href="rating.css">
```

Add the following before the closing `</body>` tag:

```html
<script src="rating.js"></script>
<script src="item-rating.js"></script>
<script src="owner-rating.js"></script>
```

### 2. Add Rating Containers

#### Combined Item & Owner Rating (Product Detail Page)

```html
<!-- Rating System Section -->
<section class="rating-container">
    <div class="rating-tabs">
        <div class="rating-tab active" data-tab="item">Item Reviews</div>
        <div class="rating-tab" data-tab="owner">Seller Reviews</div>
    </div>
    
    <div id="itemRatingContainer">
        <!-- Content will be dynamically generated -->
        <div class="loading">Loading ratings...</div>
    </div>
    
    <div id="ownerRatingContainer" style="display: none;">
        <!-- Content will be dynamically generated -->
        <div class="loading">Loading ratings...</div>
    </div>
</section>
```

#### Item Rating Only

```html
<section class="rating-container">
    <div id="itemRatingContainer">
        <!-- Content will be dynamically generated -->
        <div class="loading">Loading ratings...</div>
    </div>
</section>
```

#### Owner Rating Only (Seller Profile Page)

```html
<section class="rating-container">
    <div id="ownerRatingContainer">
        <!-- Content will be dynamically generated -->
        <div class="loading">Loading ratings...</div>
    </div>
</section>
```

### 3. Initialize the Rating System

Add this script to initialize the rating system:

```javascript
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the rating system
    window.ratingSystem = new RatingSystem();
    
    // You can pass specific IDs in the URL:
    // ?itemId=123&ownerId=456
});
```

### 4. Adding Ratings to Product Listings

Update your product listing rendering functions to include ratings:

```javascript
// Add this to your renderListings function
const ratingDisplay = listing.rating ? `
    <div class="product-rating">
        ${this.generateStarRating(listing.rating.average)}
        <span class="review-count">(${listing.rating.count})</span>
    </div>
` : '';

// Add this to your listing card HTML
<div class="listing-details">
    <h3>${listing.name}</h3>
    <p class="listing-category">${listing.category}</p>
    <p class="listing-price">${formattedPrice}</p>
    ${ratingDisplay}
    <p class="listing-description">${shortDescription}</p>
</div>

// Add this helper function
generateStarRating(rating) {
    if (!rating) return '';
    
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let html = '<div class="star-rating readonly">';
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
        html += '<i class="ri-star-fill" style="color: var(--star-filled);"></i>';
    }
    
    // Add half star if needed
    if (halfStar) {
        html += '<i class="ri-star-half-fill" style="color: var(--star-filled);"></i>';
    }
    
    // Add empty stars
    for (let i = 0; i < emptyStars; i++) {
        html += '<i class="ri-star-line" style="color: var(--star-empty);"></i>';
    }
    
    html += '</div>';
    return html;
}
```

## API Integration

The rating system works with the following API endpoints:

### Item Ratings

- `GET /api/ratings?itemId={id}` - Get all ratings for an item
- `POST /api/ratings` - Submit a new item rating
- `PUT /api/ratings/{id}` - Update an existing rating
- `DELETE /api/ratings/{id}` - Delete a rating

### Owner Ratings

- `GET /api/owner-ratings?ownerId={id}` - Get all ratings for an owner
- `POST /api/owner-ratings` - Submit a new owner rating
- `PUT /api/owner-ratings/{id}` - Update an existing rating
- `DELETE /api/owner-ratings/{id}` - Delete a rating

## Example API Response Format

### Item Ratings Response

```json
{
  "ratings": [
    {
      "_id": "123abc",
      "itemId": "item123",
      "userId": "user456",
      "rating": 4,
      "comment": "Great item, works as described",
      "createdAt": "2023-01-15T12:30:45Z",
      "user": {
        "firstName": "John",
        "profileImage": "profile.jpg"
      }
    }
  ],
  "averageRating": 4.2,
  "ratingCount": 15,
  "ratingDistribution": {
    "1": 1,
    "2": 0,
    "3": 2,
    "4": 5,
    "5": 7
  },
  "userHasRated": false
}
```

### Owner Ratings Response

```json
{
  "ratings": [
    {
      "_id": "456def",
      "ownerId": "owner789",
      "userId": "user456",
      "overallRating": 4,
      "communicationRating": 5,
      "reliabilityRating": 4,
      "itemConditionRating": 4,
      "comment": "Great seller, quick responses",
      "createdAt": "2023-01-20T14:22:37Z",
      "user": {
        "firstName": "Sarah",
        "profileImage": null
      }
    }
  ],
  "averageRating": 4.5,
  "communicationAverage": 4.8,
  "reliabilityAverage": 4.3,
  "itemConditionAverage": 4.5,
  "ratingCount": 12,
  "ratingDistribution": {
    "1": 0,
    "2": 1,
    "3": 1,
    "4": 4,
    "5": 6
  },
  "userHasRated": true
}
```

## Authentication

All write operations (POST, PUT, DELETE) require authentication. The system will automatically use the token stored in localStorage.

## Customization

You can customize the appearance by modifying the `rating.css` file. The rating system uses CSS variables that you can override:

```css
:root {
  --star-empty: #ecf0f1;   /* Color of empty stars */
  --star-filled: #f1c40f;  /* Color of filled stars */
  --star-hover: #f39c12;   /* Color of stars on hover */
}
```

## Complete Example

See `product-detail.html` for a complete example of implementing the rating system on a product detail page.

## Troubleshooting

- If ratings don't load, check the browser console for errors
- Ensure your API endpoints match the ones expected by the rating system
- If star rating inputs don't work correctly, check that the markup structure is preserved
- For authentication issues, verify that your token is valid and stored in localStorage

For additional support, contact the development team. 