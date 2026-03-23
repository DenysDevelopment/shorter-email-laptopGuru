export interface ParsedEmailData {
  productUrl: string | null;
  productName: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
}

// Strip HTML tags for text analysis
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function parseEmail(body: string, subject: string): ParsedEmailData {
  const text = stripHtml(body);
  const combined = `${subject} ${text}`;

  return {
    productUrl: extractProductUrl(body, text),
    productName: extractProductName(combined),
    customerName: extractCustomerName(text),
    customerEmail: extractCustomerEmail(text),
    customerPhone: extractCustomerPhone(text),
  };
}

function extractProductUrl(html: string, text: string): string | null {
  // Look for laptopguru.pl product links in href attributes first
  const hrefMatch = html.match(/href=["']?(https?:\/\/[^"'\s]*laptopguru\.pl[^"'\s]*)/i);
  if (hrefMatch) return hrefMatch[1];

  // Then in plain text — laptopguru.pl links
  const urlMatch = text.match(/(https?:\/\/[^\s]*laptopguru\.pl[^\s]*)/i);
  if (urlMatch) return urlMatch[1];

  // Shopify form: "Link:" field
  const linkField = text.match(/Link\s*[:：]\s*(https?:\/\/[^\s]+)/i);
  if (linkField) return linkField[1];

  // Any URL as fallback
  const anyUrl = text.match(/(https?:\/\/[^\s,;)]+)/i);
  if (anyUrl) return anyUrl[1];

  return null;
}

function extractProductName(text: string): string | null {
  // Shopify form: "Produkt:" field (Polish)
  const produktMatch = text.match(/Produkt\s*[:：]\s*(.+?)(?:\s*Sku\s*[:：]|Link\s*[:：]|Name\s*[:：]|E-mail\s*[:：]|$)/i);
  if (produktMatch) return produktMatch[1].trim();

  // Common form patterns
  const patterns = [
    /(?:товар|продукт|название|product|item|model|модель)\s*[:：]\s*(.+?)(?:\s*(?:Sku|Link|Name|E-mail|цена|ціна|price)\s*[:：]|$)/i,
    /(?:тема|subject)\s*[:：]\s*(.+?)(?:\s*(?:Sku|Link|Name)\s*[:：]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  return null;
}

function extractCustomerName(text: string): string | null {
  const patterns = [
    // Shopify form: "Name:" field
    /Name\s*[:：]\s*(.+?)(?:\s*E-mail\s*[:：]|Treść\s*[:：]|$)/i,
    // Other patterns
    /(?:имя|ім['ʼ]?я|imię|ваше имя|ваше ім['ʼ]?я)\s*[:：]\s*(.+?)(?:\s*(?:E-mail|Email|Telefon|Phone)\s*[:：]|$)/i,
    /(?:от|від|from)\s*[:：]\s*(.+?)(?:\s*(?:E-mail|Email)\s*[:：]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const name = match[1].trim();
      // Sanity check: names shouldn't be very long or look like emails
      if (name.length <= 60 && !name.includes("@")) return name;
    }
  }

  return null;
}

function extractCustomerEmail(text: string): string | null {
  const patterns = [
    // Shopify form: "E-mail:" field
    /E-mail\s*[:：]\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
    /(?:email|почта|пошта|електронна)\s*[:：]\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].toLowerCase();
  }

  // Fallback: find any email that isn't noreply/system
  const allEmails = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g);
  if (allEmails) {
    const customerEmail = allEmails.find(
      (e) => !/(noreply|no-reply|mailer|system|wordpress|hostinger|shopify)/i.test(e)
    );
    if (customerEmail) return customerEmail.toLowerCase();
  }

  return null;
}

function extractCustomerPhone(text: string): string | null {
  const patterns = [
    /(?:телефон|phone|тел|tel|номер|telefon)\s*[:：]\s*([+\d\s\-()]{7,20})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  // Fallback: look for phone-like patterns (Polish/Ukrainian format)
  const phoneMatch = text.match(/(?:\+48|(?:\+38)0)\s*\d[\d\s\-]{7,12}/);
  if (phoneMatch) return phoneMatch[0].trim();

  return null;
}
