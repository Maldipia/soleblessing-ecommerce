# SoleBlessing API Reference

**Author:** Manus AI  
**Last Updated:** November 28, 2025

## API Overview

The SoleBlessing API is built using tRPC, providing end-to-end type safety between the frontend and backend. All API endpoints are exposed through the `/api/trpc` route with automatic request/response validation based on TypeScript schemas.

## Authentication

### OAuth Callback

**Endpoint:** `GET /api/oauth/callback`

Handles the OAuth callback from Manus authentication service. This endpoint is called automatically by the Manus OAuth flow and should not be invoked directly by client code.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| code | string | Authorization code from OAuth provider |
| state | string | CSRF protection token |

**Response:** Redirects to homepage with session cookie set

**Session Cookie:** `manus_session` (HTTP-only, secure, 7-day expiration)

### Authentication Queries

#### auth.me

Returns the currently authenticated user profile or null if not logged in.

**Input:** None

**Output:**

```typescript
{
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: 'user' | 'admin';
  createdAt: Date;
  lastSignedIn: Date;
} | null
```

**Example Usage:**

```typescript
const { data: user } = trpc.auth.me.useQuery();
if (user) {
  console.log(`Logged in as ${user.name}`);
}
```

#### auth.logout

Clears the session cookie and logs out the current user.

**Input:** None

**Output:**

```typescript
{
  success: boolean;
}
```

**Example Usage:**

```typescript
const logoutMutation = trpc.auth.logout.useMutation({
  onSuccess: () => {
    window.location.href = '/';
  }
});

logoutMutation.mutate();
```

## Product Endpoints

### products.list

Returns a paginated list of products with optional filtering and sorting.

**Input:**

```typescript
{
  page?: number;           // Default: 1
  limit?: number;          // Default: 20, Max: 100
  search?: string;         // Search in name and brand
  brand?: string;          // Filter by exact brand
  category?: string;       // Filter by exact category
  minPrice?: number;       // Minimum price in centavos
  maxPrice?: number;       // Maximum price in centavos
  sortBy?: 'price' | 'date' | 'name';  // Default: 'date'
  sortOrder?: 'asc' | 'desc';          // Default: 'desc'
}
```

**Output:**

```typescript
{
  products: Array<{
    id: number;
    name: string;
    brand: string;
    category: string;
    price: number;           // In centavos
    originalPrice: number;   // In centavos
    images: string[];        // JSON array of image URLs
    isNew: boolean;
    isFeatured: boolean;
    createdAt: Date;
  }>;
  total: number;             // Total count of matching products
  page: number;              // Current page number
  totalPages: number;        // Total number of pages
}
```

**Example Usage:**

```typescript
const { data } = trpc.products.list.useQuery({
  page: 1,
  limit: 20,
  brand: 'ADIDAS',
  sortBy: 'price',
  sortOrder: 'asc'
});
```

### products.getById

Fetches detailed information for a single product.

**Input:**

```typescript
{
  id: number;  // Product ID
}
```

**Output:**

```typescript
{
  id: number;
  name: string;
  brand: string;
  category: string;
  description: string | null;
  price: number;
  originalPrice: number;
  images: string[];          // JSON array [thumb, medium, large]
  sizes: string[];           // JSON array of available sizes
  sku: string;
  condition: string;
  supplier: string;
  status: string;
  isNew: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Example Usage:**

```typescript
const { data: product } = trpc.products.getById.useQuery({ id: 270002 });
```

### products.getBrands

Returns a list of all unique brands in the inventory.

**Input:** None

**Output:**

```typescript
string[]  // Array of brand names
```

**Example Usage:**

```typescript
const { data: brands } = trpc.products.getBrands.useQuery();
```

### products.getCategories

Returns a list of all product categories.

**Input:** None

**Output:**

```typescript
string[]  // Array of category names
```

**Example Usage:**

```typescript
const { data: categories } = trpc.products.getCategories.useQuery();
```

## Cart Endpoints

### cart.list

Returns all items in the current user's shopping cart.

**Input:** None (uses authenticated user ID)

**Output:**

```typescript
Array<{
  id: number;
  productId: number;
  size: string;
  quantity: number;
  createdAt: Date;
  product: {
    id: number;
    name: string;
    brand: string;
    price: number;
    images: string[];
  };
}>
```

**Example Usage:**

```typescript
const { data: cartItems } = trpc.cart.list.useQuery();
```

### cart.add

Adds a product to the shopping cart or updates quantity if already present.

**Input:**

```typescript
{
  productId: number;
  size: string;
  quantity: number;  // Default: 1
}
```

**Output:**

```typescript
{
  success: boolean;
  cartItem: {
    id: number;
    productId: number;
    size: string;
    quantity: number;
  };
}
```

**Example Usage:**

```typescript
const addToCartMutation = trpc.cart.add.useMutation({
  onSuccess: () => {
    toast.success('Added to cart');
  }
});

addToCartMutation.mutate({
  productId: 270002,
  size: '25',
  quantity: 1
});
```

### cart.updateQuantity

Updates the quantity of an existing cart item.

**Input:**

```typescript
{
  id: number;       // Cart item ID
  quantity: number; // New quantity
}
```

**Output:**

```typescript
{
  success: boolean;
}
```

**Example Usage:**

```typescript
const updateMutation = trpc.cart.updateQuantity.useMutation();
updateMutation.mutate({ id: 123, quantity: 2 });
```

### cart.remove

Removes an item from the shopping cart.

**Input:**

```typescript
{
  id: number;  // Cart item ID
}
```

**Output:**

```typescript
{
  success: boolean;
}
```

**Example Usage:**

```typescript
const removeMutation = trpc.cart.remove.useMutation();
removeMutation.mutate({ id: 123 });
```

### cart.clear

Removes all items from the shopping cart.

**Input:** None

**Output:**

```typescript
{
  success: boolean;
}
```

**Example Usage:**

```typescript
const clearMutation = trpc.cart.clear.useMutation();
clearMutation.mutate();
```

## Wishlist Endpoints

### wishlist.list

Returns all products in the current user's wishlist.

**Input:** None

**Output:**

```typescript
Array<{
  id: number;
  productId: number;
  createdAt: Date;
  product: {
    id: number;
    name: string;
    brand: string;
    price: number;
    originalPrice: number;
    images: string[];
    isNew: boolean;
  };
}>
```

**Example Usage:**

```typescript
const { data: wishlistItems } = trpc.wishlist.list.useQuery();
```

### wishlist.add

Adds a product to the wishlist.

**Input:**

```typescript
{
  productId: number;
}
```

**Output:**

```typescript
{
  success: boolean;
}
```

**Example Usage:**

```typescript
const addMutation = trpc.wishlist.add.useMutation();
addMutation.mutate({ productId: 270002 });
```

### wishlist.remove

Removes a product from the wishlist.

**Input:**

```typescript
{
  productId: number;
}
```

**Output:**

```typescript
{
  success: boolean;
}
```

**Example Usage:**

```typescript
const removeMutation = trpc.wishlist.remove.useMutation();
removeMutation.mutate({ productId: 270002 });
```

### wishlist.toggle

Adds or removes a product from the wishlist based on current state.

**Input:**

```typescript
{
  productId: number;
}
```

**Output:**

```typescript
{
  added: boolean;  // true if added, false if removed
}
```

**Example Usage:**

```typescript
const toggleMutation = trpc.wishlist.toggle.useMutation();
toggleMutation.mutate({ productId: 270002 });
```

## Order Endpoints

### orders.list

Returns all orders for the current user.

**Input:** None

**Output:**

```typescript
Array<{
  id: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  totalAmount: number;
  shippingAddress: string;
  contactNumber: string;
  paymentMethod: 'bank_transfer' | 'gcash';
  paymentProofUrl: string;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: number;
    productId: number;
    size: string;
    quantity: number;
    price: number;
    product: {
      name: string;
      brand: string;
      images: string[];
    };
  }>;
}>
```

**Example Usage:**

```typescript
const { data: orders } = trpc.orders.list.useQuery();
```

### orders.getById

Fetches detailed information for a specific order.

**Input:**

```typescript
{
  id: number;  // Order ID
}
```

**Output:** Same as single order object from orders.list

**Example Usage:**

```typescript
const { data: order } = trpc.orders.getById.useQuery({ id: 12345 });
```

### orders.create

Creates a new order from the current user's cart.

**Input:**

```typescript
{
  shippingAddress: string;
  contactNumber: string;
  paymentMethod: 'bank_transfer' | 'gcash';
  paymentProofUrl: string;  // S3 URL of uploaded payment proof
}
```

**Output:**

```typescript
{
  success: boolean;
  orderId: number;
}
```

**Example Usage:**

```typescript
const createMutation = trpc.orders.create.useMutation({
  onSuccess: (data) => {
    console.log(`Order ${data.orderId} created`);
  }
});

createMutation.mutate({
  shippingAddress: '123 Main St, Manila',
  contactNumber: '+639123456789',
  paymentMethod: 'gcash',
  paymentProofUrl: 'https://s3.amazonaws.com/...'
});
```

## Recommendation Endpoints

### recommendations.getForUser

Returns personalized product recommendations based on browsing history.

**Input:** None

**Output:**

```typescript
Array<{
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice: number;
  images: string[];
  isNew: boolean;
}>
```

**Example Usage:**

```typescript
const { data: recommendations } = trpc.recommendations.getForUser.useQuery();
```

### recommendations.trackView

Records a product view for the recommendation algorithm.

**Input:**

```typescript
{
  productId: number;
}
```

**Output:**

```typescript
{
  success: boolean;
}
```

**Example Usage:**

```typescript
const trackMutation = trpc.recommendations.trackView.useMutation();
trackMutation.mutate({ productId: 270002 });
```

## Admin Endpoints

All admin endpoints require the user to have `role = 'admin'` in the database. Unauthorized access attempts return a 403 Forbidden error.

### admin.orders.list

Returns all orders in the system with optional status filtering.

**Input:**

```typescript
{
  status?: 'pending' | 'processing' | 'shipped' | 'delivered';
}
```

**Output:**

```typescript
Array<{
  id: number;
  userId: number;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  contactNumber: string;
  paymentMethod: string;
  paymentProofUrl: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    name: string;
    email: string;
  };
  items: Array<{
    productId: number;
    size: string;
    quantity: number;
    price: number;
    product: {
      name: string;
      brand: string;
    };
  }>;
}>
```

**Example Usage:**

```typescript
const { data: orders } = trpc.admin.orders.list.useQuery({
  status: 'pending'
});
```

### admin.orders.updateStatus

Updates the status of an order.

**Input:**

```typescript
{
  id: number;  // Order ID
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
}
```

**Output:**

```typescript
{
  success: boolean;
}
```

**Example Usage:**

```typescript
const updateMutation = trpc.admin.orders.updateStatus.useMutation();
updateMutation.mutate({
  id: 12345,
  status: 'processing'
});
```

### admin.dashboard.stats

Returns aggregate statistics for the admin dashboard.

**Input:** None

**Output:**

```typescript
{
  totalRevenue: number;      // Sum of all confirmed orders
  totalOrders: number;       // Count of all orders
  totalProducts: number;     // Count of all products
  pendingOrders: number;     // Count of pending orders
  recentOrders: Array<{      // 10 most recent orders
    id: number;
    userId: number;
    status: string;
    totalAmount: number;
    createdAt: Date;
    user: {
      name: string;
    };
  }>;
}
```

**Example Usage:**

```typescript
const { data: stats } = trpc.admin.dashboard.stats.useQuery();
```

## File Upload Endpoints

### POST /api/upload/payment-proof

Uploads a payment proof image to S3 storage.

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Description |
|-------|------|-------------|
| file | File | Image file (JPEG, PNG, or PDF, max 5MB) |

**Response:**

```json
{
  "success": true,
  "url": "https://s3.amazonaws.com/bucket/path/to/file.jpg"
}
```

**Error Response:**

```json
{
  "error": "File too large" | "Invalid file type" | "Upload failed"
}
```

**Example Usage:**

```typescript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/upload/payment-proof', {
  method: 'POST',
  body: formData,
  credentials: 'include'
});

const { url } = await response.json();
```

## Error Handling

### Error Response Format

All tRPC endpoints return errors in a consistent format:

```typescript
{
  error: {
    code: string;      // Error code (e.g., 'UNAUTHORIZED', 'NOT_FOUND')
    message: string;   // Human-readable error message
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | User is not authenticated |
| FORBIDDEN | 403 | User lacks required permissions |
| NOT_FOUND | 404 | Requested resource does not exist |
| BAD_REQUEST | 400 | Invalid input parameters |
| INTERNAL_SERVER_ERROR | 500 | Unexpected server error |

### Error Handling Example

```typescript
const { data, error } = trpc.products.getById.useQuery({ id: 999999 });

if (error) {
  if (error.data?.code === 'NOT_FOUND') {
    console.log('Product not found');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## Rate Limiting

The API does not currently implement rate limiting. However, clients should implement reasonable request throttling to avoid overwhelming the server:

- Product list queries: Maximum 1 request per second
- Cart operations: Maximum 5 requests per second
- Order creation: Maximum 1 request per 5 seconds

## Pagination

List endpoints support pagination through `page` and `limit` parameters. The response includes pagination metadata:

```typescript
{
  products: [...],
  total: 150,        // Total number of matching items
  page: 1,           // Current page number (1-indexed)
  totalPages: 8      // Total number of pages
}
```

To fetch all pages:

```typescript
const fetchAllProducts = async () => {
  const firstPage = await trpc.products.list.query({ page: 1, limit: 20 });
  const allProducts = [...firstPage.products];
  
  for (let page = 2; page <= firstPage.totalPages; page++) {
    const pageData = await trpc.products.list.query({ page, limit: 20 });
    allProducts.push(...pageData.products);
  }
  
  return allProducts;
};
```

## Data Types

### Price Format

All prices are stored and transmitted as integers representing centavos (1/100 of a peso). To display prices in pesos:

```typescript
const formatPrice = (centavos: number) => {
  const pesos = centavos / 100;
  return `₱${pesos.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

// Example: 262500 centavos → ₱2,625.00
```

### Date Format

All dates are transmitted as ISO 8601 strings and automatically parsed to JavaScript Date objects by tRPC:

```typescript
{
  createdAt: "2025-11-28T12:34:56.789Z"  // Transmitted as string
}

// Automatically parsed to:
{
  createdAt: Date  // JavaScript Date object
}
```

### JSON Fields

Some fields store JSON data as strings in the database but are automatically parsed:

**images**: Array of three image URLs `[thumbnail, medium, large]`  
**sizes**: Array of available size strings `["23.5", "25", "26"]`

## API Versioning

The current API version is **v1**. The API does not include version numbers in endpoints as breaking changes will be avoided. If breaking changes become necessary, a new versioned API will be introduced alongside the existing API to maintain backward compatibility.

---

**Documentation Version:** 1.0  
**API Version:** v1  
**Website Version:** be68b0c9  
**Generated by:** Manus AI
