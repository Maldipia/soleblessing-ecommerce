# One-line patch for NSB SYSTEM (required before enabling the website bridge)

File: **SBOrder.gs** → function `processOrder`

Change this line:
```js
const orderId = generateOrderId(sheetName);
```
to:
```js
const orderId = data.orderId || generateOrderId(sheetName);
```

Why: website orders already carry their SB-number from the database. Without
this, processOrder would mint a second ID for the same order, and the hourly
sheet→DB import would create a duplicate order AND deduct stock twice.

After saving the patch, tell Claude "patched" — the GAS_ORDER_WEBHOOK env var
gets set (to the same /exec URL your order form already uses — no new
deployment needed) and website orders start flowing into the ORDER sheet and
your Google invoice system.
