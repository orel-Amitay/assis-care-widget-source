import {
  COUNTRY_PHONE_PREFIXES,
  findCountryByDialCode,
  findCountryFromPhone,
} from './countryPhonePrefixes.js';

export function getDefaultOrderVerificationPhoneIso(phonePrefix, selectedPhoneCountryIso = 'IL') {
  return findCountryByDialCode(phonePrefix)?.iso || selectedPhoneCountryIso || 'IL';
}

export function parseOrderVerificationPhoneContact(contactInput, fallbackIso = 'IL') {
  const contact = String(contactInput || '').trim();
  const defaultIso = fallbackIso || 'IL';
  if (!contact) {
    return { iso: defaultIso, local: '', full: '' };
  }

  const detected = findCountryFromPhone(contact);
  if (detected) {
    const match = contact.match(new RegExp(`^\\+${detected.dialCode}\\s*(.*)$`));
    const local = (match ? match[1] : contact.replace(`+${detected.dialCode}`, '')).trim();
    return {
      iso: detected.iso,
      local,
      full: local ? `+${detected.dialCode} ${local}` : '',
    };
  }

  if (contact.startsWith('0')) {
    return { iso: defaultIso, local: contact, full: contact };
  }

  return { iso: defaultIso, local: contact, full: contact };
}

/** @returns {'both'|'phone'|'email'} */
export function normalizeOrderVerificationChannelsMode(mode) {
  const normalized = String(mode || '').trim().toLowerCase();
  if (normalized === 'phone' || normalized === 'email') return normalized;
  return 'both';
}

/** @returns {Array<'whatsapp'|'email'>} */
export function resolveOrderVerificationChannelIds(mode) {
  const normalized = normalizeOrderVerificationChannelsMode(mode);
  if (normalized === 'phone') return ['whatsapp'];
  if (normalized === 'email') return ['email'];
  return ['whatsapp', 'email'];
}

export function normalizeOrderVerification(raw, {
  phonePrefix = '972',
  selectedPhoneCountryIso = 'IL',
  channelsMode = 'both',
} = {}) {
  if (!raw || typeof raw !== 'object') return null;

  const orderNumber = String(
    raw.orderNumber || raw.order_number || raw.number || raw.orderName || raw.order_name || raw.name || ''
  ).trim().replace(/^#+/, '');

  const filteredChannels = resolveOrderVerificationChannelIds(channelsMode);

  const selectedChannelRaw = raw.selectedChannel || raw.selected_channel || null;

  const orderNumberInput = String(
    raw.orderNumberInput || raw.order_number_input || orderNumber || ''
  ).trim().replace(/^#+/, '');

  let selectedChannel = selectedChannelRaw === 'email'
    ? 'email'
    : (selectedChannelRaw === 'whatsapp' ? 'whatsapp' : null);
  if (!selectedChannel || !filteredChannels.includes(selectedChannel)) {
    selectedChannel = filteredChannels[0] || 'whatsapp';
  }

  const defaultIso = getDefaultOrderVerificationPhoneIso(phonePrefix, selectedPhoneCountryIso);
  const contactInput = String(raw.contactInput || raw.contact_input || '').trim();
  const phoneFields = parseOrderVerificationPhoneContact(contactInput, defaultIso);

  return {
    verificationId: String(raw.verificationId || raw.verification_id || raw.id || '').trim(),
    orderNumber: orderNumberInput || orderNumber,
    orderNumberInput,
    orderName: orderNumberInput || orderNumber ? `#${orderNumberInput || orderNumber}` : '',
    contactInput: phoneFields.full || contactInput,
    phoneCountryIso: String(raw.phoneCountryIso || raw.phone_country_iso || phoneFields.iso || '').trim(),
    phoneLocal: String(raw.phoneLocal || raw.phone_local || phoneFields.local || '').trim(),
    customerName: String(
      raw.customerName
      || raw.customer_name
      || raw.shippingFirstName
      || raw.shipping_first_name
      || ''
    ).trim(),
    maskedPhone: String(raw.maskedPhone || raw.masked_phone || raw.phoneMasked || raw.phone_masked || '').trim(),
    maskedEmail: String(raw.maskedEmail || raw.masked_email || raw.emailMasked || raw.email_masked || '').trim(),
    availableChannels: filteredChannels,
    verified: Boolean(raw.verified),
    codeSent: Boolean(raw.codeSent || raw.code_sent),
    verifiedVia: raw.verifiedVia === 'details' || raw.verified_via === 'details'
      ? 'details'
      : (raw.verifiedVia === 'code' || raw.verified_via === 'code' ? 'code' : null),
    detailsFieldType: ['first_name', 'phone', 'email'].includes(raw.detailsFieldType || raw.details_field_type)
      ? (raw.detailsFieldType || raw.details_field_type)
      : null,
    detailsFieldInput: String(raw.detailsFieldInput || raw.details_field_input || '').trim(),
    selectedChannel,
    selectedOrderIndex: Number.isInteger(raw.selectedOrderIndex)
      ? raw.selectedOrderIndex
      : (Number.isInteger(raw.selected_order_index) ? raw.selected_order_index : null),
    codeInput: String(raw.codeInput || raw.code_input || '').trim(),
    sending: false,
    verifying: false,
    noOrdersFound: Boolean(raw.noOrdersFound || raw.no_orders_found),
    error: String(raw.error || '').trim(),
    createdAt: Number(raw.createdAt || raw.created_at) || 0,
    expired: Boolean(raw.expired),
  };
}

export function findOrderVerificationPhoneCountryByIso(iso, phonePrefix) {
  return COUNTRY_PHONE_PREFIXES.find((country) => country.iso === iso)
    || findCountryByDialCode(phonePrefix)
    || COUNTRY_PHONE_PREFIXES[0];
}

export function filterOrderVerificationPhonePrefixesByQuery(query) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized) return COUNTRY_PHONE_PREFIXES;

  const digitsQuery = normalized.replace(/^\+/, '').replace(/\D/g, '');
  return COUNTRY_PHONE_PREFIXES.filter((country) => (
    country.name.toLowerCase().includes(normalized)
    || country.iso.toLowerCase().includes(normalized)
    || (digitsQuery && country.dialCode.includes(digitsQuery))
    || (normalized.startsWith('+') && `+${country.dialCode}`.startsWith(normalized))
  ));
}

function moneyAmount(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number' || typeof raw === 'string') return raw;
  if (typeof raw !== 'object') return null;
  return raw.shopMoney?.amount
    ?? raw.presentmentMoney?.amount
    ?? raw.amount
    ?? null;
}

function moneyCurrency(raw, fallback = '') {
  if (!raw || typeof raw !== 'object') return fallback;
  return String(
    raw.shopMoney?.currencyCode
    || raw.presentmentMoney?.currencyCode
    || raw.currencyCode
    || raw.currency
    || fallback
    || ''
  ).trim();
}

function pickImageUrl(raw) {
  if (!raw || typeof raw !== 'object') return '';

  const candidates = [
    raw.imageUrl,
    raw.image_url,
    raw.image,
    raw.thumbnail,
    raw.featuredImage,
    raw.featured_image,
    raw.productImage,
    raw.product_image,
    raw.img,
    raw.src,
    raw.variant?.image,
    raw.product?.featuredMedia?.image,
    raw.product?.featured_media?.image,
    raw.product?.featuredImage,
    raw.product?.image,
    raw.images?.[0],
    raw.media?.[0],
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === 'string') return candidate.trim();
    const url = candidate.url
      || candidate.src
      || candidate.originalSrc
      || candidate.transformedSrc
      || candidate.preview_image?.src;
    if (typeof url === 'string' && url.trim()) return url.trim();
  }

  return '';
}

function normalizeDiscountApplication(raw, fallbackCurrency = '') {
  if (!raw || typeof raw !== 'object') return null;

  const value = raw.value && typeof raw.value === 'object' ? raw.value : null;
  const percentage = value?.percentage != null && value.percentage !== ''
    ? Number(value.percentage)
    : (raw.percentage != null && raw.percentage !== '' ? Number(raw.percentage) : null);
  const amount = moneyAmount(value)
    ?? moneyAmount(raw.amountSet)
    ?? moneyAmount(raw.allocatedAmountSet)
    ?? raw.amount
    ?? null;
  const currency = moneyCurrency(value || raw.amountSet || raw.allocatedAmountSet, fallbackCurrency);
  const code = String(raw.code || '').trim();
  const title = String(raw.title || raw.description || code || '').trim();
  const targetSelection = String(raw.targetSelection || raw.target_selection || '').trim();
  if (!title && amount == null && (percentage == null || Number.isNaN(percentage))) return null;

  return {
    code,
    title: title || code,
    label: code || title,
    amount,
    percentage: percentage != null && !Number.isNaN(percentage) ? percentage : null,
    currency,
    allocationMethod: String(raw.allocationMethod || raw.allocation_method || '').trim(),
    targetType: String(raw.targetType || raw.target_type || '').trim(),
    targetSelection,
    value: value || (percentage != null
      ? { percentage }
      : (amount != null ? { amount, currencyCode: currency } : null)),
  };
}

function normalizeDiscountAllocation(raw, fallbackCurrency = '') {
  if (!raw || typeof raw !== 'object') return null;
  const application = raw.discountApplication || raw.discount_application || null;
  const amount = moneyAmount(raw.allocatedAmountSet)
    ?? moneyAmount(raw.allocated_amount_set)
    ?? raw.amount
    ?? null;
  const currency = moneyCurrency(
    raw.allocatedAmountSet || raw.allocated_amount_set,
    fallbackCurrency
  );
  const code = String(application?.code || '').trim();
  const title = String(application?.title || application?.description || code || '').trim();
  const targetSelection = String(
    application?.targetSelection
    || application?.target_selection
    || ''
  ).trim();

  if (amount == null && !title && !code) return null;

  return {
    id: raw.id || `${code || title || 'discount'}-${amount || 0}`,
    amount,
    currency,
    code,
    title: title || code || 'Discount',
    label: code || title || 'Discount',
    targetSelection,
    discountApplication: application
      ? {
        ...application,
        code,
        title: title || code,
        targetSelection,
      }
      : null,
  };
}

function extractFulfillmentEvents(fulfillments = []) {
  const events = [];
  for (const fulfillment of fulfillments) {
    const list = Array.isArray(fulfillment?.fulfillmentEvents)
      ? fulfillment.fulfillmentEvents
      : (Array.isArray(fulfillment?.fulfillment_events) ? fulfillment.fulfillment_events : []);
    for (const event of list) {
      if (!event || typeof event !== 'object') continue;
      events.push(event);
    }
  }
  events.sort((a, b) => {
    const aTime = Date.parse(a?.happenedAt || a?.happened_at || a?.createdAt || a?.created_at || '') || 0;
    const bTime = Date.parse(b?.happenedAt || b?.happened_at || b?.createdAt || b?.created_at || '') || 0;
    return bTime - aTime;
  });
  return events;
}

export function normalizeOrderLineItem(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const title = String(raw.title || raw.name || raw.productTitle || raw.product_title || 'Product').trim();
  const variantTitle = String(raw.variantTitle || raw.variant_title || raw.variant?.title || '').trim();
  const currency = moneyCurrency(
    raw.discountedUnitPriceSet || raw.originalUnitPriceSet || raw.discountedTotalSet || raw.priceSet,
    String(raw.currency || '').trim()
  );
  // Match assis-care-fe orders store: unit price is discounted; original is pre-discount.
  const price = moneyAmount(raw.discountedUnitPriceSet)
    ?? raw.price
    ?? raw.unitPrice
    ?? raw.unit_price
    ?? raw.variant?.price
    ?? moneyAmount(raw.originalUnitPriceSet);
  const originalPrice = moneyAmount(raw.originalUnitPriceSet)
    ?? moneyAmount(raw.unitPriceSet)
    ?? raw.originalPrice
    ?? raw.original_price
    ?? raw.variant?.price
    ?? price;
  const quantity = Number(raw.quantity || raw.qty || 1) || 1;
  const currentQuantity = Number(
    raw.currentQuantity != null ? raw.currentQuantity : (raw.current_quantity != null ? raw.current_quantity : quantity)
  ) || quantity;
  const discountsRaw = raw.discountAllocations || raw.discount_allocations || raw.discounts || [];
  const discounts = (Array.isArray(discountsRaw) ? discountsRaw : [])
    .map((entry) => normalizeDiscountAllocation(entry, currency))
    .filter(Boolean);
  const lineTotal = price != null
    ? Number(price) * currentQuantity
    : (moneyAmount(raw.discountedTotalSet) ?? null);

  return {
    id: raw.id || null,
    title: variantTitle && variantTitle !== 'Default Title' ? `${title} - ${variantTitle}` : title,
    quantity,
    currentQuantity,
    variantTitle: variantTitle && variantTitle !== 'Default Title' ? variantTitle : '',
    variantLabel: variantTitle && variantTitle !== 'Default Title' ? variantTitle : '',
    variantType: variantTitle && variantTitle !== 'Default Title' ? variantTitle : '',
    price,
    originalPrice,
    lineTotal,
    currency,
    imageUrl: pickImageUrl(raw),
    sku: String(raw.sku || raw.variant?.sku || '').trim(),
    vendor: String(raw.vendor || '').trim(),
    discounts,
    isPreOrder: String(raw.sellingPlan?.name || raw.selling_plan?.name || '').toLowerCase() === 'preorder'
      || Boolean(raw.isPreOrder || raw.is_preorder || raw.preorder || raw.pre_order),
  };
}

export function normalizeOrder(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw._normalized) {
    // Re-normalize from the original Shopify payload when available so newer fields stay in sync.
    if (raw.raw && typeof raw.raw === 'object' && !raw.raw._normalized) {
      return normalizeOrder(raw.raw);
    }
    return raw;
  }

  const currency = moneyCurrency(
    raw.currentTotalPriceSet || raw.totalPriceSet || raw.subtotalPriceSet,
    String(raw.currency || raw.presentmentCurrency || raw.presentment_currency || '').trim()
  );

  let lineItemsRaw = raw.lineItems || raw.line_items || raw.items || raw.products || [];
  if (lineItemsRaw && !Array.isArray(lineItemsRaw) && Array.isArray(lineItemsRaw.edges)) {
    lineItemsRaw = lineItemsRaw.edges.map((edge) => edge?.node).filter(Boolean);
  } else if (lineItemsRaw && !Array.isArray(lineItemsRaw) && Array.isArray(lineItemsRaw.nodes)) {
    lineItemsRaw = lineItemsRaw.nodes;
  }
  const lineItems = (Array.isArray(lineItemsRaw) ? lineItemsRaw : [])
    .map((item) => normalizeOrderLineItem(
      item && typeof item === 'object' ? { ...item, currency: item.currency || currency } : item
    ))
    .filter(Boolean);

  const delivery = raw.delivery && typeof raw.delivery === 'object' ? raw.delivery : null;
  const rootFulfillments = Array.isArray(raw.fulfillments) ? raw.fulfillments : [];
  const deliveryFulfillments = Array.isArray(delivery?.fulfillments) ? delivery.fulfillments : [];
  const fulfillments = deliveryFulfillments.length ? deliveryFulfillments : rootFulfillments;
  const fulfillmentWithTracking = fulfillments.find((entry) => Array.isArray(entry?.trackingInfo) && entry.trackingInfo.length)
    || fulfillments[0]
    || null;
  const tracking = fulfillmentWithTracking?.trackingInfo?.[0] || null;
  const fulfillmentEvents = extractFulfillmentEvents(
    fulfillments.length ? fulfillments : rootFulfillments
  );
  const latestEvent = fulfillmentEvents[0] || null;
  const estimatedDelivery = latestEvent?.estimatedDeliveryAt
    || delivery?.estimatedDelivery
    || delivery?.estimated_delivery
    || null;

  const discountsRaw = raw.discountApplications || raw.discount_applications || raw.discounts || [];
  const discounts = (Array.isArray(discountsRaw) ? discountsRaw : [])
    .map((entry) => normalizeDiscountApplication(entry, currency))
    .filter(Boolean);
  const couponCodes = discounts
    .map((entry) => entry.code || entry.title)
    .filter(Boolean);
  const couponCode = String(
    raw.couponCode
    || raw.coupon_code
    || raw.discountCode
    || raw.discount_code
    || couponCodes.join(', ')
    || ''
  ).trim();

  const customer = raw.customer && typeof raw.customer === 'object' ? raw.customer : null;
  const customerName = String(
    raw.customerName
    || raw.customer_name
    || customer?.displayName
    || [customer?.firstName, customer?.lastName].filter(Boolean).join(' ')
    || raw.shippingAddress?.name
    || raw.shipping_address?.name
    || ''
  ).trim();

  // Match assis-care-fe: subtotal = sum(discountedUnitPrice * quantity)
  const computedSubtotal = lineItems.reduce((acc, item) => {
    const unit = Number(item?.price ?? 0);
    const qty = Number(item?.quantity ?? 0);
    if (!Number.isFinite(unit) || !Number.isFinite(qty)) return acc;
    return acc + (unit * qty);
  }, 0);

  const total = moneyAmount(raw.totalPriceSet)
    ?? moneyAmount(raw.currentTotalPriceSet)
    ?? raw.total
    ?? raw.totalPrice
    ?? raw.total_price;
  const subtotal = computedSubtotal
    || moneyAmount(raw.subtotalPriceSet)
    || raw.subtotal
    || raw.subtotalPrice
    || raw.subtotal_price
    || 0;
  const discountAmount = moneyAmount(raw.totalDiscountsSet)
    ?? raw.discountAmount
    ?? raw.discount_amount
    ?? 0;
  const shippingAmount = moneyAmount(raw.totalShippingPriceSet)
    ?? raw.shippingAmount
    ?? raw.shipping_amount
    ?? raw.shippingPrice
    ?? raw.shipping_price;
  const taxAmount = moneyAmount(raw.totalTaxSet)
    ?? raw.taxAmount
    ?? raw.tax_amount
    ?? raw.totalTax
    ?? raw.total_tax;
  const paidAmount = moneyAmount(raw.totalReceivedSet)
    ?? raw.paid
    ?? raw.paidAmount
    ?? raw.paid_amount;

  const fulfillmentStatus = String(
    raw.displayFulfillmentStatus
    || raw.fulfillmentStatus
    || raw.fulfillment_status
    || fulfillmentWithTracking?.status
    || ''
  ).trim();
  const deliveryStatus = String(
    latestEvent?.status
    || delivery?.status
    || delivery?.deliveryStatus
    || delivery?.delivery_status
    || ''
  ).trim();
  const financialStatus = String(raw.displayFinancialStatus || raw.financialStatus || '').trim();
  const itemCount = lineItems.reduce((acc, item) => acc + (Number(item?.quantity) || 0), 0);

  return {
    _normalized: true,
    id: raw.id || raw.orderId || raw.order_id || raw.legacyResourceId || raw.name,
    name: String(raw.name || raw.orderName || raw.order_name || raw.orderNumber || raw.order_number || 'Order').trim(),
    orderNumber: String(raw.orderNumber || raw.order_number || raw.name || '').trim(),
    status: String(fulfillmentStatus || deliveryStatus || financialStatus || raw.status || '').trim(),
    financialStatus,
    fulfillmentStatus,
    deliveryStatus,
    createdAt: raw.createdAt || raw.created_at || raw.orderDate || raw.order_date || raw.date,
    currency,
    lineItems,
    itemCount,
    subtotal,
    total,
    discountAmount,
    shippingAmount,
    taxAmount,
    paidAmount,
    discounts,
    couponCode,
    tags: Array.isArray(raw.tags) ? raw.tags.map((tag) => String(tag || '').trim()).filter(Boolean) : [],
    shippingCity: String(
      raw.shippingCity
      || raw.shipping_city
      || raw.shippingAddress?.city
      || raw.shipping_address?.city
      || ''
    ).trim(),
    shippingCountry: String(
      raw.shippingCountry
      || raw.shipping_country
      || raw.shippingAddress?.country
      || raw.shipping_address?.country
      || ''
    ).trim(),
    shippingAddress: raw.shippingAddress || raw.shipping_address || null,
    customerName,
    email: String(raw.email || customer?.email || '').trim(),
    phone: String(raw.phone || customer?.phone || raw.shippingAddress?.phone || '').trim(),
    fulfillment: {
      status: fulfillmentStatus,
      carrier: String(
        delivery?.carrier
        || tracking?.company
        || raw.carrier
        || ''
      ).trim(),
      trackingNumber: String(
        delivery?.trackingNumber
        || delivery?.tracking_number
        || tracking?.number
        || ''
      ).trim(),
      trackingUrl: String(
        delivery?.trackingUrl
        || delivery?.tracking_url
        || tracking?.url
        || ''
      ).trim(),
      estimatedDelivery,
      deliveryStatus,
      fullyShipped: ['FULFILLED', 'COMPLETED'].includes(String(fulfillmentStatus || '').toUpperCase().replace(/[\s-]+/g, '_'))
        || String(fulfillmentWithTracking?.status || '').toUpperCase() === 'SUCCESS',
      partiallyShipped: ['PARTIAL', 'PARTIALLY_FULFILLED'].includes(String(fulfillmentStatus || '').toUpperCase()),
    },
    raw,
  };
}

export function normalizeOrders(orders) {
  return (Array.isArray(orders) ? orders : [])
    .map((order) => normalizeOrder(order))
    .filter(Boolean);
}

export function extractCustomerNameFromOrders(orders) {
  for (const order of Array.isArray(orders) ? orders : []) {
    const name = String(
      order?.customerName
      || order?.customer_name
      || order?.customer?.displayName
      || [order?.customer?.firstName, order?.customer?.lastName].filter(Boolean).join(' ')
      || order?.shippingAddress?.name
      || ''
    ).trim();
    if (name) return name;
  }
  return '';
}

function normalizeOrderMentionToken(value) {
  return String(value || '')
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function getOrderMentionTokens(order) {
  const tokens = new Set();
  const add = (value) => {
    const token = normalizeOrderMentionToken(value);
    if (token.length >= 2) tokens.add(token);
  };

  add(order?.orderNumber);
  add(order?.name);
  add(order?.orderName);
  add(order?.order_name);
  add(order?.legacyResourceId);
  add(order?.legacy_resource_id);

  return [...tokens].sort((a, b) => b.length - a.length);
}

function questionMentionsOrderToken(question, token) {
  const text = String(question || '');
  if (!text || !token) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^0-9a-zA-Z\u0590-\u05FF])#?${escaped}(?![0-9a-zA-Z])`, 'i');
  return re.test(text);
}

/**
 * If the question explicitly mentions exactly one order number/name from the list, return its index.
 * Returns null when zero or multiple orders are mentioned (or when there aren't multiple orders).
 */
export function findExplicitlyMentionedOrderIndex(question, orders) {
  if (!Array.isArray(orders) || orders.length < 2) return null;

  const matchedIndexes = [];
  for (let i = 0; i < orders.length; i += 1) {
    const tokens = getOrderMentionTokens(orders[i]);
    if (tokens.some((token) => questionMentionsOrderToken(question, token))) {
      matchedIndexes.push(i);
    }
  }

  return matchedIndexes.length === 1 ? matchedIndexes[0] : null;
}
