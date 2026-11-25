# GAS patch 3 — branded order emails (send_html_email)

The website now builds Nike/Adidas-style order emails (product photos, totals,
payment status) from the DB and asks GAS to send them from your Gmail.

## 1. In **SBOrder.gs**, inside `doPost`, right next to the existing
`generate_invoice` action block, insert:

```js
    // Website action: send a prebuilt branded HTML email from our Gmail
    if (orderData && orderData.action === 'send_html_email') {
      try {
        GmailApp.sendEmail(orderData.to, orderData.subject, 'Your SoleBlessing order — open in an HTML mail app to view.', {
          htmlBody: orderData.html,
          name: 'SoleBlessing',
        });
        return ContentService.createTextOutput(JSON.stringify({ success: true }))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, message: String(e) }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
```

## 2. Redeploy the WEBHOOK deployment (URL stays the same):
Deploy → Manage deployments → ✏️ on the webhook deployment
→ Version: **New version** → Deploy.

## 3. Say "patched" in chat.
The server is gated behind a DB flag (`sb_settings.gas_email_patched`) so it
never posts the new action to an unpatched GAS (which would log a junk order
row). When you say "patched", the flag gets flipped to 1 and a live test runs.

What goes live then:
- **Checkout** → customer instantly gets the "Order received" email with item
  photos + an Upload Payment button (COD orders get a pay-on-delivery note).
- **Verify payment** in admin → "Payment confirmed" email with the invoice link.
- **Generate Invoice & Send Link** in the invoice editor → the confidential
  "Your invoice is ready" notification: logo, greeting, ONE button to the
  secure 7-day link, expiry notice, support footer — **no amounts, no items,
  no order details** (those are visible only inside the secure invoice).
- Every send is recorded in **sb_email_log** and stamps the order
  (`confirmation_sent_at` / `invoice_sent_at`).
