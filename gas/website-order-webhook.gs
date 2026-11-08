/**
 * SoleBlessing — Website → ORDER Sheet webhook
 * Paste this into the SAME Apps Script project as your order form / invoice
 * generator, then: Deploy → New deployment → Web app → Execute as: Me →
 * Who has access: Anyone. Copy the /exec URL into Vercel env GAS_ORDER_WEBHOOK.
 *
 * Every website order then lands in the ORDER sheet in the exact column
 * layout your invoice system already reads — so Google invoices cover
 * website orders too, 24/7, same as FB orders.
 */
var ORDER_SHEET_ID = '13eM-zpN--AVOwN4uFUSVeQX0e6YA922VzgjOomhfk-Y';
var ORDER_TAB_NAME = null; // null = first tab; or put the exact tab name here

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents || '{}');
    if (payload.kind !== 'website_order' || !payload.order) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'bad payload' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var o = payload.order;

    // Duplicate guard: skip if this order number is already in the sheet
    var ss = SpreadsheetApp.openById(ORDER_SHEET_ID);
    var sh = ORDER_TAB_NAME ? ss.getSheetByName(ORDER_TAB_NAME) : ss.getSheets()[0];
    var ids = sh.getRange(1, 3, sh.getLastRow(), 1).getValues().flat(); // col C = ORDER ID
    if (ids.indexOf(o.order_number) !== -1) {
      return ContentService.createTextOutput(JSON.stringify({ ok: true, skipped: 'duplicate' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var items = o.items || [];
    var ts = Utilities.formatDate(new Date(), 'Asia/Manila', 'MM/dd/yyyy HH:mm:ss');
    var php = function (c) { return c ? (c / 100) : ''; };

    // One row per line item, order header on the first row — matches your layout:
    // A ts | B email | C order id | D fb name | E receiver | F address | G contact |
    // H payment method | I request | J region | K city | ... N payment status |
    // T notes | AA item code | AB details | AC sku | AD size | AF price
    items.forEach(function (it, i) {
      var row = new Array(40).fill('');
      if (i === 0) {
        row[0] = ts;
        row[1] = o.customer_email || '';
        row[2] = o.order_number;
        row[3] = 'WEBSITE';
        row[4] = o.customer_name || '';
        row[5] = o.shipping_address || '';
        row[6] = o.contact_number || '';
        row[7] = o.payment_method || '';
        row[8] = o.notes || '';
        row[9] = o.region || '';
        row[10] = o.city || '';
        row[13] = 'PENDING';
        row[19] = 'Website order — auto-logged';
      } else {
        row[2] = o.order_number; // keep order id on item rows for grouping
      }
      row[26] = it.id || '';
      row[27] = it.name || '';
      row[28] = it.sku || '';
      row[29] = it.size || '';
      row[31] = php(it.price); // Price column, in pesos
      sh.appendRow(row);
    });

    // OPTIONAL: if your invoice generator is a function (e.g. generateInvoice(orderId)),
    // call it here so the Google invoice is created instantly:
    // try { generateInvoice(o.order_number); } catch (err) {}

    return ContentService.createTextOutput(JSON.stringify({ ok: true, rows: items.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
