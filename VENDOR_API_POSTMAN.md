# Vendor API - Postman Collection

## Import Instructions

1. Open Postman
2. Click **Import** button (top left)
3. Select the `vendor-api.postman_collection.json` file
4. The collection will be imported with all endpoints organized in folders

## Setup

### 1. Configure Environment Variables

After importing, set up the following variables in Postman:

1. Click on the collection name: **Safe Wallet - Vendor API**
2. Go to the **Variables** tab
3. Set the following variables:

| Variable | Initial Value | Current Value | Description |
|----------|---------------|---------------|-------------|
| `base_url` | `http://localhost:4000` | Your API base URL | Your server URL (e.g., `https://api.yourdomain.com`) |
| `api_key` | `your_api_key_here` | Your actual API key | Your vendor API key (publicApiKey or privateApiKey) |

### 2. API Key Authentication

The collection is pre-configured to use API key authentication via the `X-API-Key` header. The API key is automatically added to all requests using the `{{api_key}}` variable.

**To use a different API key for a specific request:**
- Click on the request
- Go to the **Authorization** tab
- Override the API key value

## Collection Structure

The collection is organized into the following folders:

### 📁 Wallets
- **Create Level 3 Wallet** - Create a new wallet for customers
- **Get All Wallets** - List all your Level 3 wallets
- **Get Wallet by ID** - Get specific wallet details
- **Get Vendor Wallet** - Get your Level 2 vendor wallet info

### 📁 Transactions
- **Get All Transactions** - List all transactions with filters
- **Get Transaction by ID** - Get specific transaction details

### 📁 Withdrawals
- **Send Transaction (Single Withdrawal)** - Send native token (ETH/BNB)
- **Send ERC20 Token** - Send ERC20 token transaction
- **Multi-Send Transaction (Batch Withdrawal)** - Batch send native tokens
- **Multi-Send ERC20 Tokens** - Batch send ERC20 tokens

### 📁 Coins
- **Get All Coins** - List all available coins/tokens
- **Get Coins by Chain** - Filter coins by blockchain
- **Get Coin by Currency Code** - Get specific coin details

### 📁 Fee Estimation
- **Estimate Native Token Fee** - Estimate gas for ETH/BNB transfer
- **Estimate ERC20 Token Fee** - Estimate gas for token transfer

## Quick Start Examples

### 1. Get Your Vendor Wallet
1. Open **Wallets** → **Get Vendor Wallet**
2. Click **Send**
3. You'll see your Level 2 wallet address and details

### 2. Create a Customer Wallet
1. Open **Wallets** → **Create Level 3 Wallet**
2. Modify the request body:
   ```json
   {
     "label": "Customer Wallet #123",
     "trackingId": "customer-123",
     "callbackUrl": "https://your-site.com/webhook"
   }
   ```
3. Click **Send**

### 3. Send a Transaction
1. Open **Withdrawals** → **Send Transaction (Single Withdrawal)**
2. Update the `toAddress` and `amount` in the request body
3. Click **Send**
4. Note the `taskId` and `taskUrl` in the response for tracking

### 4. Check Transaction Status
1. Copy the `taskId` from the send transaction response
2. Open **Transactions** → **Get All Transactions**
3. Add `?status=SUCCESS` to filter by status
4. Or use **Get Transaction by ID** with the transaction ID

## Common Use Cases

### Use Case 1: Create Wallet and Send Funds
1. **Create Level 3 Wallet** - Get the wallet address
2. **Estimate Native Token Fee** - Check gas costs
3. **Send Transaction** - Transfer funds to the wallet

### Use Case 2: Batch Payments
1. **Get All Wallets** - List customer wallets
2. **Multi-Send Transaction** - Send to multiple recipients at once
3. **Get All Transactions** - Verify all payments went through

### Use Case 3: Token Distribution
1. **Get Coin by Currency Code** - Get token details (e.g., USDT)
2. **Estimate ERC20 Token Fee** - Check gas costs
3. **Multi-Send ERC20 Tokens** - Distribute tokens to multiple addresses

## Response Examples

### Success Response
```json
{
  "success": true,
  "data": {
    "id": "wallet_id",
    "address": "0x...",
    "trackingId": "customer-123",
    "label": "Customer Wallet #123",
    "level": 3
  }
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error message here",
  "error": "Bad Request"
}
```

## Tips

1. **Save Responses**: After sending requests, save example responses for reference
2. **Use Variables**: Create environment-specific variables (dev, staging, production)
3. **Test Scripts**: Add test scripts to validate responses automatically
4. **Pre-request Scripts**: Use pre-request scripts to generate dynamic values
5. **Collection Runner**: Use Collection Runner to test multiple endpoints sequentially

## Troubleshooting

### 401 Unauthorized
- Check that `api_key` variable is set correctly
- Verify your API key is valid (check in your user profile)
- Ensure the API key hasn't expired

### 400 Bad Request
- Verify request body format matches the examples
- Check that all required fields are included
- Validate Ethereum addresses are correct format
- Ensure amounts are positive decimal strings

### 404 Not Found
- Verify the `base_url` is correct
- Check that the endpoint path is correct
- Ensure the resource (wallet/transaction) exists

## Support

For API documentation, see: `src/vendor-api/README.md`

For issues or questions, contact support.
