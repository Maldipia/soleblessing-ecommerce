# GAS patch 2 — remote "Generate invoice" from the dashboard

## 1. In **SBOrder.gs**, inside `doPost`, right after the parse block (before
`// Process the order`), insert:

```js
    // Dashboard action: generate invoice remotely
    if (orderData && orderData.action === 'generate_invoice') {
      const inv = generateInvoiceByOrderId(orderData.orderId);
      return ContentService.createTextOutput(JSON.stringify(inv))
        .setMimeType(ContentService.MimeType.JSON);
    }
```

## 2. Anywhere in **SBOrder.gs** (bottom is fine), add:

```js
function generateInvoiceByOrderId(orderId) {
  if (!orderId) return { success: false, message: 'orderId required' };
  const ss = SpreadsheetApp.openById(SB_ORDER_SPREADSHEET_ID);
  for (let i = 0; i < SB_PAYMENT_SHEETS.length; i++) {
    const sh = ss.getSheetByName(SB_PAYMENT_SHEETS[i]);
    if (!sh) continue;
    const ids = sh.getRange(1, 3, sh.getLastRow(), 1).getValues().map(r => r[0]);
    const idx = ids.indexOf(orderId);
    if (idx !== -1) return createInvoiceForRow(sh, idx + 1);
  }
  return { success: false, message: 'Order not found in any payment sheet' };
}
```

## 3. Redeploy the WEBHOOK deployment (URL stays the same):
Deploy → Manage deployments → ✏️ on the webhook deployment (ID ending `…XUw`)
→ Version: **New version** → Deploy.

Then say "patched" — the dashboard button goes live instantly (it's already
deployed, waiting for your GAS side).
