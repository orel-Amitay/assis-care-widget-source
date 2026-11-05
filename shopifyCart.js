/**
 * Shopify cart management mixin for the Assis widget.
 * WooCommerce cart calls live in woocommerceCart.js. Both mixins ship in one IIFE.
 */
const CART_BADGE_COUNT_KEY = 'assis_cart_badge_count';

/** Shopify cart.js tokens often include `?key=…`; order.cart_token is usually the base only. */
function normalizeCartToken(token) {
  const raw = String(token || '').trim();
  if (!raw) return '';
  const base = raw.split('?')[0].trim();
  return base.slice(0, 500);
}

function readCartBadgeCount() {
  try {
    const count = Number(sessionStorage.getItem(CART_BADGE_COUNT_KEY));
    if (!Number.isFinite(count) || count < 1) return 0;
    return count;
  } catch {
    return 0;
  }
}

function writeCartBadgeCount(count) {
  try {
    const next = Number(count) || 0;
    if (next > 0) sessionStorage.setItem(CART_BADGE_COUNT_KEY, String(next));
    else sessionStorage.removeItem(CART_BADGE_COUNT_KEY);
  } catch {
    /* Storage is blocked. */
  }
}

export default {
  watch: {
    careRequestId() {
      // Stamp cart as soon as the Care chat exists so checkout keeps conversation_id.
      if (typeof this.stampAssisCartVisitor === 'function') {
        this.stampAssisCartVisitor();
      }
    },
  },
  data() {
    return {
      poweredByAssisAddedProductIds: {},
      shopifyCartKeys: {},
      shopifyCartItems: [],
      shopifyCartItemCount: readCartBadgeCount(),
      shopifyCartTotalCents: 0,
      shopifyCartCurrency: '',
      showShopifyCartPanel: false,
      showGoToCheckout: false,
      shopifyCartListExpanded: false,
      shopifyCartBadgeBump: false,
      appliedDiscountCode: '',
      applyingDiscountCode: '',
      inapplicableDiscountCodes: {},
      shopifyActionError: null,
      shopifyActionErrorTimer: null,
    };
  },
  async mounted() {
    if (!this.isStoreCart) return;
    if (this.isWooCommerceWebsite() && this.isWooPluginVisitor()) this.bindWooVisitorStamp();
    await this.syncShopifyCart();
    this.bindShopifyCartListeners();
    document.addEventListener('click', this.onShopifyCartOutsideClick, true);
    document.addEventListener('keydown', this.onShopifyCartEscape);
  },
  beforeUnmount() {
    this.unbindShopifyCartListeners();
    document.removeEventListener('click', this.onShopifyCartOutsideClick, true);
    document.removeEventListener('keydown', this.onShopifyCartEscape);
    if (this._assisNotifyingShopifyCartTimer) {
      clearTimeout(this._assisNotifyingShopifyCartTimer);
      this._assisNotifyingShopifyCartTimer = 0;
    }
    this._assisNotifyingShopifyCart = false;
    this._assisShopifyCartMutating = false;
    if (this._shopifyCartBadgeBumpTimer) {
      clearTimeout(this._shopifyCartBadgeBumpTimer);
      this._shopifyCartBadgeBumpTimer = 0;
    }
    if (this.shopifyActionErrorTimer) {
      clearTimeout(this.shopifyActionErrorTimer);
      this.shopifyActionErrorTimer = null;
    }
  },
  computed: {
    isStoreCart() {
      return this.isShopifyCartStore() || this.isWooCommerceWebsite();
    },
    shopifyCartPanelLines() {
      return (this.shopifyCartItems || []).map((item) => {
        const qty = Number(item?.quantity) || 0;
        const title = this.decodeCartText(item?.product_title || item?.title)
          || (this.language === 'he' ? 'מוצר' : 'Product');
        const variant = this.decodeCartText(item?.variant_title);
        const variantLabel = variant && variant.toLowerCase() !== 'default title' ? variant : '';
        const unitCents = Number(item?.final_price ?? item?.price ?? 0);
        const lineCents = Number(item?.final_line_price ?? item?.line_price ?? unitCents * qty);
        const handle = String(item?.handle || '').trim();
        const rawUrl = String(item?.url || '').trim();
        let href = '';
        if (rawUrl) {
          href = /^https?:\/\//i.test(rawUrl) || rawUrl.startsWith('/')
            ? rawUrl
            : `${this.shopifyStoreRoot()}${rawUrl}`;
        } else if (handle) {
          href = `${this.shopifyStoreRoot()}products/${encodeURIComponent(handle)}`;
        }
        return {
          key: String(item?.key || item?.id || ''),
          title,
          variantLabel,
          quantity: qty,
          href,
          handle,
          productId: String(item?.product_id || '').trim(),
          description: this.decodeCartText(item?.description),
          rating: item?.rating || null,
          variants: Array.isArray(item?.detailVariants) ? item.detailVariants : [],
          images: Array.isArray(item?.detailImages) ? item.detailImages : [],
          unitCents,
          image: this.normalizeShopifyCartImage(item?.image || item?.featured_image?.url),
          priceLabel: this.formatShopifyCartMoney(unitCents),
          lineLabel: this.formatShopifyCartMoney(lineCents),
        };
      }).filter((line) => line.key);
    },
    shopifyCartFormattedTotal() {
      return this.formatShopifyCartMoney(this.shopifyCartTotalCents);
    },
    shopifyCartBagLabel() {
      return this.language === 'he' ? 'סל' : 'Bag';
    },
    shopifyCartPanelTitle() {
      return this.language === 'he' ? 'הסל שלך' : 'Your bag';
    },
    shopifyCartEmptyLabel() {
      return this.language === 'he'
        ? 'אין פריטים עדיין - הוסיפו משהו מהצ׳אט.'
        : 'No items yet - add something from chat.';
    },
    shopifyCartCheckoutLabel() {
      return this.language === 'he' ? 'מעבר לתשלום' : 'Go to checkout';
    },
    shopifyCartFootNote() {
      if (this.appliedDiscountCode) {
        return this.language === 'he'
          ? `${this.appliedDiscountCode} יוחל בתשלום`
          : `${this.appliedDiscountCode} applied at checkout`;
      }
      return this.language === 'he' ? 'פותח את עמוד התשלום' : 'Opens checkout';
    },
    shopifyCartTotalLabel() {
      return this.language === 'he' ? 'סה״כ' : 'Total';
    },
    shopifyCheckoutPreviewLines() {
      return (this.shopifyCartPanelLines || []).slice(0, 3);
    },
    shopifyCheckoutMoreCount() {
      return Math.max(0, (this.shopifyCartPanelLines || []).length - 3);
    },
    shopifyCartVisibleLines() {
      const lines = this.shopifyCartPanelLines || [];
      if (this.shopifyCartListExpanded || lines.length <= 3) return lines;
      return lines.slice(0, 3);
    },
    shopifyCartMoreCount() {
      if (this.shopifyCartListExpanded) return 0;
      return Math.max(0, (this.shopifyCartPanelLines || []).length - 3);
    },
    shopifyCheckoutItemTitles() {
      return (this.shopifyCartPanelLines || [])
        .map((line) => String(line.title || '').trim())
        .filter(Boolean);
    },
    shopifyCheckoutItemNames() {
      return this.shopifyCheckoutItemTitles.slice(0, 2).join(' · ');
    },
    shopifyCheckoutExtraCount() {
      return Math.max(0, this.shopifyCheckoutItemTitles.length - 2);
    },
    shopifyCheckoutExtraNames() {
      return this.shopifyCheckoutItemTitles.slice(2);
    },
  },
  methods: {
    shopifyStoreRoot() {
      const root = window.Shopify?.routes?.root || '/';
      return String(root).endsWith('/') ? String(root) : `${root}/`;
    },
    decodeCartText(value) {
      const text = String(value || '').trim();
      if (!text) return '';
      if (!text.includes('&')) return text;
      try {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return String(textarea.value || '').trim();
      } catch {
        return text;
      }
    },
    shopifyNumericId(value) {
      if (value == null || value === '') return null;
      if (typeof value === 'object') return this.shopifyNumericId(value.id);
      const raw = String(value).trim();
      const gid = raw.match(/(?:ProductVariant|Product)\/(\d+)/);
      if (gid) return gid[1];
      const wooId = this.wooNumericId(raw);
      if (wooId) return wooId;
      // Woo variation ids are often short (3–4 digits); Shopify ids are longer.
      if (/^\d+$/.test(raw)) return raw;
      return null;
    },
    cartItemKeys(item) {
      if (!item || typeof item !== 'object') return [];
      const keys = [];
      const variantId = this.shopifyNumericId(item.variant_id || item.id);
      if (variantId) keys.push(`v:${variantId}`);
      const productId = this.shopifyNumericId(item.product_id);
      if (productId) keys.push(`p:${productId}`);
      const handle = item.handle ? String(item.handle).toLowerCase() : '';
      if (handle) keys.push(`h:${handle}`);
      return keys;
    },
    productCartKeys(product) {
      const item = this.unwrapProduct(product);
      const keys = [];
      const variantId = this.getShopifyVariantIdFromProduct(item);
      if (variantId) keys.push(`v:${variantId}`);
      const productId = this.shopifyNumericId(item.product_id || item.id);
      if (productId) keys.push(`p:${productId}`);
      const handle = this.getShopifyProductHandle(item);
      if (handle) {
        try {
          keys.push(`h:${decodeURIComponent(handle).toLowerCase()}`);
        } catch {
          keys.push(`h:${String(handle).toLowerCase()}`);
        }
      }
      return keys;
    },
    getProductBagStateKey(product, index = 0) {
      const item = product && typeof product === 'object' ? product : this.unwrapProduct(product);
      const variantId = this.shopifyNumericId(
        item?.selectedVariantId || item?.variant_id || item?.variantId
      );
      if (variantId) return `v:${variantId}`;
      const displayId = item?.id || this.getProductDisplayId(product, index);
      return displayId ? `p:${displayId}` : '';
    },
    isProductInBag(product, index = 0) {
      const bagKey = this.getProductBagStateKey(product, index);
      if (bagKey && this.poweredByAssisAddedProductIds?.[bagKey]) return true;

      const item = product && typeof product === 'object' ? product : this.unwrapProduct(product);
      const variantId = this.shopifyNumericId(
        item?.selectedVariantId || item?.variant_id || item?.variantId
      );
      // When a variant is known, only that variant counts as "in bag".
      if (variantId) {
        return Boolean(this.shopifyCartKeys?.[`v:${variantId}`]);
      }

      // Legacy keys from older adds (product display id only).
      const displayId = product?.id || this.getProductDisplayId(product, index);
      if (displayId && this.poweredByAssisAddedProductIds[displayId]) return true;
      const fallbackId = this.getProductDisplayId(product, index);
      if (fallbackId && this.poweredByAssisAddedProductIds[fallbackId]) return true;
      return this.productCartKeys(product).some((key) => this.shopifyCartKeys[key]);
    },
    getAddToCartLabel(inBag = false) {
      if (inBag) return this.language === 'he' ? 'בסל' : 'In your bag';
      return this.language === 'he' ? 'הוסף לסל' : 'Add to cart';
    },
    getDiscountApplyLabel(applied = false, applying = false, inapplicable = false) {
      if (applying) return this.language === 'he' ? 'מחיל…' : 'Applying…';
      if (inapplicable) return this.language === 'he' ? 'לא ניתן להחלה' : 'Not applicable';
      if (applied) return this.language === 'he' ? 'הוחל' : 'Applied';
      return this.language === 'he' ? 'החל על הסל' : 'Apply to bag';
    },

    isDiscountCodeCopied(discount) {
      const code = this.normalizeDiscountCode(
        this.getDiscountApplyValue(discount) || this.getDiscountDisplayText(discount)
      );
      return Boolean(code && this.normalizeDiscountCode(this.copiedDiscountCode) === code);
    },

    getDiscountCopyAriaLabel(discount) {
      if (this.isDiscountCodeCopied(discount)) {
        return this.language === 'he' ? 'הועתק' : 'Copied';
      }
      return this.language === 'he' ? 'העתקת קוד' : 'Copy code';
    },

    getDiscountCopyTitle(discount) {
      if (this.isDiscountCodeCopied(discount)) {
        return this.language === 'he' ? 'הועתק' : 'Copied';
      }
      return this.language === 'he' ? 'העתקה' : 'Copy';
    },

    async copyDiscountCode(discount) {
      if (this.isGeneralDiscount?.(discount)) return;
      const raw = String(
        this.getDiscountApplyValue(discount) || this.getDiscountDisplayText(discount) || ''
      ).trim();
      if (!raw) return;

      const copyWithFallback = () => {
        const input = document.createElement('textarea');
        input.value = raw;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.left = '-9999px';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(input);
        if (!ok) throw new Error('copy failed');
      };

      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(raw);
        } else {
          copyWithFallback();
        }
      } catch (error) {
        try {
          copyWithFallback();
        } catch (fallbackError) {
          console.error('Assis: copy discount code failed', fallbackError || error);
          return;
        }
      }

      this.copiedDiscountCode = raw;
      this.trackPluginEvent('coupon_copied', { code: this.clipPluginEventText(raw, 40) });
      if (this._copiedDiscountTimer) clearTimeout(this._copiedDiscountTimer);
      this._copiedDiscountTimer = setTimeout(() => {
        if (this.normalizeDiscountCode(this.copiedDiscountCode) === this.normalizeDiscountCode(raw)) {
          this.copiedDiscountCode = '';
        }
        this._copiedDiscountTimer = 0;
      }, 1800);
    },

    getDiscountCardDirection(discount) {
      if (this.isGeneralDiscount?.(discount)) {
        return this.getTextDirection(
          this.getDiscountDisplayText(discount)
          || this.getDiscountNote(discount)
        );
      }
      return this.getTextDirection(
        this.getDiscountApplyLabel(
          this.isDiscountApplied(discount),
          false,
          this.isDiscountInapplicable(discount)
        )
        || this.getDiscountNote(discount)
        || this.getDiscountDisplayText(discount)
      );
    },
    getProductCardDirection(product, index = 0) {
      const tags = this.getProductAvailabilityTags(product);
      return this.getTextDirection(
        this.getAddToCartLabel(this.isProductInBag(product, index))
        || this.getProductDisplayTitle(product)
        || this.getProductDisplayDescription(product)
        || tags.map((tag) => tag.text).join(' ')
      );
    },
    applyShopifyCartFromCart(cart) {
      if (cart?.token) this._shopifyCartToken = String(cart.token);
      const items = Array.isArray(cart?.items) ? cart.items : [];
      this.noteExternalCartAdds(items);
      if (this.isWooCommerceWebsite()) this.saveWooCartSnapshot(items);
      const next = {};
      for (const item of items) {
        for (const key of this.cartItemKeys(item)) next[key] = true;
      }
      this.shopifyCartKeys = next;
      this.shopifyCartItems = items;
      // Badge counts products in the bag, not units. Two of one product is 1.
      const nextCount = items.length;
      const prevCount = this._lastShopifyCartCount;
      this.shopifyCartItemCount = nextCount;
      writeCartBadgeCount(nextCount);
      this.shopifyCartTotalCents = Number(cart?.total_price) || items.reduce(
        (sum, item) => sum + (Number(item?.final_line_price ?? item?.line_price) || 0),
        0
      );
      this.shopifyCartCurrency = String(cart?.currency || this.shopifyCartCurrency || '').trim();
      if (prevCount >= 0 && nextCount > prevCount) this.bumpShopifyCartBadge();
      this._lastShopifyCartCount = nextCount;
      this.pruneAddedProductsNotInCart();
      const appliedCode = this.getAppliedDiscountCodeFromCart(cart);
      this.appliedDiscountCode = appliedCode || '';
      if (appliedCode) this.clearDiscountInapplicable(appliedCode);
      if (!items.length) this.showGoToCheckout = false;
      if (!items.length && this.showShopifyCartPanel) {
        /* keep panel open so empty state is visible */
      }
      // Theme cart updates often replace attributes and wipe Assis stamps — put them back.
      if (!this.isWooCommerceWebsite()) this.ensureAssisCartStamp(cart);
    },
    ensureAssisCartStamp(cart) {
      if (!this.isShopifyCartStore() || this.isLocalShopifyPreview()) return;
      if (this._assisShopifyCartMutating) return;
      const visitorId = typeof this.getOrCreateClientId === 'function' ? this.getOrCreateClientId() : '';
      if (!visitorId) return;
      const conversationId = this.careRequestId != null ? String(this.careRequestId) : '';
      const attrs = cart?.attributes && typeof cart.attributes === 'object' ? cart.attributes : {};
      const hasVisitor = String(attrs.assis_visitor_id || '') === visitorId;
      const hasCare = !conversationId || String(attrs.assis_conversation_id || '') === conversationId;
      const cartToken = normalizeCartToken(cart?.token || this._shopifyCartToken);
      const hasToken = !cartToken || normalizeCartToken(attrs.cart_token) === cartToken;
      if (hasVisitor && hasCare && hasToken) return;
      this._assisCartStamp = null;
      if (typeof this.stampAssisCartVisitor === 'function') this.stampAssisCartVisitor();
    },
    normalizeShopifyCartImage(url) {
      const raw = String(url || '').trim();
      if (!raw) return '';
      if (raw.startsWith('//')) return `https:${raw}`;
      return raw;
    },
    formatShopifyCartMoney(cents) {
      const amount = Number(cents);
      if (!Number.isFinite(amount)) return '';
      const value = amount / 100;
      const currency = String(this.shopifyCartCurrency || '').trim().toUpperCase();
      try {
        if (currency) {
          return new Intl.NumberFormat(this.language === 'he' ? 'he-IL' : 'en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(value);
        }
      } catch {
        /* fall through */
      }
      return value.toLocaleString(this.language === 'he' ? 'he-IL' : 'en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },
    revealGoToCheckout() {
      const wasShown = this.showGoToCheckout;
      this.showGoToCheckout = true;
      if (!wasShown) {
        this.trackPluginEvent('checkout_card_shown', {}, { onceKey: 'checkout_card' });
      }
      this.showShopifyCartPanel = false;
      this.$nextTick(() => {
        if (typeof this.scrollToBottom === 'function') this.scrollToBottom();
      });
    },
    bumpShopifyCartBadge() {
      this.shopifyCartBadgeBump = false;
      this.$nextTick(() => {
        this.shopifyCartBadgeBump = true;
        if (this._shopifyCartBadgeBumpTimer) clearTimeout(this._shopifyCartBadgeBumpTimer);
        this._shopifyCartBadgeBumpTimer = setTimeout(() => {
          this.shopifyCartBadgeBump = false;
          this._shopifyCartBadgeBumpTimer = 0;
        }, 700);
      });
    },
    toggleShopifyCartPanel(event) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      const opening = !this.showShopifyCartPanel;
      this.showShopifyCartPanel = opening;
      if (opening && typeof this.noteHeaderButton === 'function') this.noteHeaderButton('cart');
    },
    closeShopifyCartPanel() {
      this.showShopifyCartPanel = false;
    },
    onShopifyCartOutsideClick(event) {
      if (!this.showShopifyCartPanel) return;
      const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      const hit = path.some((node) => {
        const id = node && node.id;
        return id === 'assis-furisport-cart-btn' || id === 'assis-furisport-cart-panel';
      });
      if (hit) return;
      this.closeShopifyCartPanel();
    },
    onShopifyCartEscape(event) {
      if (event?.key !== 'Escape' || !this.showShopifyCartPanel) return;
      this.closeShopifyCartPanel();
    },
    isShopifyCartStore() {
      if (this.isShopifyWebsite) return true;
      try {
        return Boolean(window.Shopify);
      } catch (_) {
        return false;
      }
    },
    isLocalShopifyPreview() {
      if (!this.isShopifyCartStore() || window.Shopify) return false;
      try {
        const host = String(window.location.hostname || '').toLowerCase();
        return host === 'localhost' || host === '127.0.0.1' || host === '::1';
      } catch (_) {
        return false;
      }
    },
    seedLocalShopifyPreview() {
      this.publishLocalShopifyCart({
        items: [
          {
            key: 'local:preview-1',
            id: 'preview-1',
            variant_id: 'preview-1',
            product_id: 'preview-1',
            title: this.language === 'he' ? 'קרם לחות' : 'Moisturizer',
            product_title: this.language === 'he' ? 'קרם לחות' : 'Moisturizer',
            quantity: 1,
            price: 8990,
            final_price: 8990,
            line_price: 8990,
            final_line_price: 8990,
            image: '',
            handle: 'sample-1',
          },
          {
            key: 'local:preview-2',
            id: 'preview-2',
            variant_id: 'preview-2',
            product_id: 'preview-2',
            title: this.language === 'he' ? 'סרום' : 'Serum',
            product_title: this.language === 'he' ? 'סרום' : 'Serum',
            quantity: 1,
            price: 12900,
            final_price: 12900,
            line_price: 12900,
            final_line_price: 12900,
            image: '',
            handle: 'sample-2',
          },
        ],
        currency: 'ILS',
        discount_codes: [],
      });
      this.poweredByAssisHomeDismissed = true;
    },
    emptyLocalShopifyCart() {
      return { items: [], item_count: 0, total_price: 0, currency: 'ILS', discount_codes: [], token: '' };
    },
    localCartToken() {
      if (!this._localCartToken) {
        this._localCartToken = `local-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
      }
      return this._localCartToken;
    },
    localPreviewPriceCents(product) {
      const item = this.unwrapProduct?.(product) || product || {};
      const raw = item.selectedVariant?.price ?? item.price ?? item.final_price;
      const numeric = typeof this.parseProductPriceNumber === 'function'
        ? this.parseProductPriceNumber(raw)
        : Number(raw);
      if (numeric == null || !Number.isFinite(numeric) || numeric <= 0) return 0;
      return Math.round(numeric * 100);
    },
    publishLocalShopifyCart(cart) {
      const items = Array.isArray(cart?.items) ? cart.items : [];
      let token = String(cart?.token || '').trim();
      if (!items.length) {
        token = '';
        this._localCartToken = '';
      } else if (!token) {
        token = this.localCartToken();
      } else {
        this._localCartToken = token;
      }
      const itemCount = items.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
      const totalPrice = items.reduce((sum, line) => sum + (Number(line.final_line_price) || 0), 0);
      const next = {
        ...cart,
        token,
        items,
        item_count: itemCount,
        total_price: totalPrice,
        currency: cart?.currency || 'ILS',
        discount_codes: Array.isArray(cart?.discount_codes) ? cart.discount_codes : [],
      };
      this._localShopifyPreviewCart = next;
      this.applyShopifyCartFromCart(next);
      return next;
    },
    addLocalShopifyPreviewProduct(product) {
      const item = this.unwrapProduct?.(product) || product || {};
      const variantId = this.shopifyNumericId(
        item.selectedVariantId || item.variant_id || item.variantId
      ) || String(item.id || Date.now());
      const cents = this.localPreviewPriceCents(item);
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const cart = this._localShopifyPreviewCart || this.emptyLocalShopifyCart();
      const key = `local:${variantId}`;
      const image = typeof this.getProductDisplayImage === 'function'
        ? this.getProductDisplayImage(product)
        : (item.image || '');
      const existing = (cart.items || []).find((line) => line.key === key);
      if (existing) {
        const nextQty = (Number(existing.quantity) || 0) + quantity;
        const unit = Number(existing.final_price ?? existing.price) || cents;
        cart.items = (cart.items || []).map((line) => (
          line.key === key
            ? { ...line, quantity: nextQty, line_price: unit * nextQty, final_line_price: unit * nextQty }
            : line
        ));
      } else {
        cart.items = [...(cart.items || []), {
          key,
          id: variantId,
          variant_id: variantId,
          product_id: item.product_id || item.id,
          title: item.title || item.name || '',
          product_title: item.title || item.name || '',
          variant_title: item.selectedVariantTitle || item.variant_title || '',
          quantity,
          price: cents,
          final_price: cents,
          line_price: cents * quantity,
          final_line_price: cents * quantity,
          image: typeof image === 'string' ? image : '',
          handle: item.handle || '',
          description: String(item.description || item.body_html || item.bodyHtml || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
          rating: item.rating || null,
          detailVariants: Array.isArray(item.variants) ? item.variants.filter(Boolean) : [],
          detailImages: Array.isArray(item.images) ? item.images.filter(Boolean) : [],
        }];
      }
      this.publishLocalShopifyCart(cart);
      this.revealGoToCheckout();
    },
    recordedCartToken() {
      return normalizeCartToken(this._shopifyCartToken || this._wooCartToken || '');
    },
    closePluginForCheckout() {
      if (typeof this.closeShopifyCartPanel === 'function') this.closeShopifyCartPanel();
      if (this.productDetail) this.productDetail = null;
      if (this.productVariantMenu?.visible) {
        this.productVariantMenu = { ...this.productVariantMenu, visible: false };
      }
      if (this.isChatOpen) {
        this.isChatOpen = false;
        this.shouldAnimateChatOpen = false;
        if (typeof this.notePluginClosed === 'function') this.notePluginClosed();
      }
      if (typeof this.persistChatSession === 'function') this.persistChatSession();
    },
    async openShopifyCheckout() {
      const lines = Array.isArray(this.shopifyCartItems) ? this.shopifyCartItems : [];
      const cartToken = this.recordedCartToken();
      const wooCart = Boolean(cartToken && this.isWooCommerceWebsite());
      this.trackPluginEvent('checkout_clicked', {
        item_count: lines.length,
        product_ids: lines.slice(0, 12).map((item) => String(item?.product_id || item?.id || '')).filter(Boolean),
        ...(cartToken ? { cart_token: cartToken } : {}),
        ...(wooCart ? { cart_channel: 'woo' } : {}),
      });
      // Close widget before leaving so mobile/desktop do not keep an open overlay,
      // and so a restored session does not reopen the chat on the checkout page.
      this.closePluginForCheckout();
      if (this.isWooCommerceWebsite()) {
        try {
          await Promise.race([
            this.stampWooCartVisitor(),
            new Promise((resolve) => setTimeout(resolve, 1200)),
          ]);
        } catch {
          /* checkout still opens */
        }
        (window.top || window).location.assign(this.wooCheckoutUrl());
        return;
      }
      if (this.isLocalShopifyPreview()) return;
      try {
        await Promise.race([
          this.stampAssisCartVisitor(),
          new Promise((resolve) => setTimeout(resolve, 1200)),
        ]);
      } catch {
        /* checkout still opens */
      }
      const root = this.shopifyStoreRoot();
      const checkoutPath = `${root}checkout`;
      const code = this.normalizeDiscountCode(this.appliedDiscountCode);
      const url = code
        ? `${root}discount/${encodeURIComponent(code)}?redirect=${encodeURIComponent(checkoutPath)}`
        : checkoutPath;
      const topWindow = window.top || window;
      topWindow.location.assign(url);
    },
    async stampAssisCartVisitor() {
      if (this.isWooCommerceWebsite()) {
        await this.stampWooCartVisitor();
        return;
      }
      if (!this.isShopifyCartStore() || this.isLocalShopifyPreview()) return;
      const visitorId = typeof this.getOrCreateClientId === 'function' ? this.getOrCreateClientId() : '';
      if (!visitorId) return;
      let current = null;
      let cartToken = normalizeCartToken(this._shopifyCartToken);
      try {
        current = await this.fetchShopifyCart();
        if (current?.token) {
          this._shopifyCartToken = String(current.token);
          cartToken = normalizeCartToken(current.token);
        }
      } catch {
        /* keep last known token */
      }
      this.rememberAssisCareRequestCookie();
      const conversationId = this.careRequestId ? String(this.careRequestId) : '';
      const stampKey = `${visitorId}\n${conversationId}\n${cartToken}`;
      if (cartToken && this._assisCartStamp === stampKey) return;
      // Merge — cart/update.js replaces the whole attributes object.
      const existing =
        current?.attributes && typeof current.attributes === 'object' && !Array.isArray(current.attributes)
          ? { ...current.attributes }
          : {};
      const attributes = {
        ...existing,
        assis_visitor_id: visitorId,
      };
      if (conversationId) attributes.assis_conversation_id = conversationId;
      else delete attributes.assis_conversation_id;
      if (cartToken) attributes.cart_token = cartToken;
      this._assisShopifyCartMutating = true;
      try {
        const response = await fetch(`${this.shopifyStoreRoot()}cart/update.js`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ attributes }),
        });
        if (!response.ok) return;
        const cart = await response.json().catch(() => null);
        if (cart?.token) this._shopifyCartToken = String(cart.token);
        const stampedToken = normalizeCartToken(this._shopifyCartToken || cartToken);
        this._assisCartStamp = `${visitorId}\n${conversationId}\n${stampedToken}`;
        // Abandoned checkouts often drop cart customAttributes — keep a plugin_events trail for linking.
        if (stampedToken && typeof this.trackPluginEvent === 'function') {
          this.trackPluginEvent('cart_stamped', {
            cart_token: stampedToken,
          }, { onceKey: `cart-stamp:${stampedToken}:${conversationId || 'none'}` });
        }
      } finally {
        this._assisShopifyCartMutating = false;
      }
    },
    async changeShopifyCartLineQuantity(lineKey, nextQuantity) {
      const key = String(lineKey || '').trim();
      const quantity = Math.floor(Number(nextQuantity));
      if (!key || !this.isStoreCart || !Number.isFinite(quantity)) return;
      if (quantity < 1) {
        await this.removeShopifyCartLine(key);
        return;
      }
      const current = (this.shopifyCartItems || []).find((item) => String(item?.key) === key);
      const previous = Number(current?.quantity) || 0;
      this.trackPluginEvent('cart_quantity_changed', {
        direction: quantity > previous ? 'plus' : 'minus',
        quantity,
        title: this.clipPluginEventText?.(current?.title || current?.product_title || '') || '',
        in_bag: true,
      });
      if (this.isLocalShopifyPreview()) {
        const cart = this._localShopifyPreviewCart || this.emptyLocalShopifyCart();
        cart.items = (cart.items || []).map((line) => {
          if (String(line.key) !== key) return line;
          const unit = Number(line.final_price ?? line.price) || 0;
          return {
            ...line,
            quantity,
            line_price: unit * quantity,
            final_line_price: unit * quantity,
          };
        });
        this.publishLocalShopifyCart(cart);
        return;
      }
      if (this.isWooCommerceWebsite()) {
        this._assisShopifyCartMutating = true;
        try {
          const cart = await this.wooStore('/cart/update-item', {
            method: 'POST',
            body: { key, quantity },
          });
          this.applyShopifyCartFromCart(this.mapWooCartToShopifyCart(cart));
          this.refreshWooStoreCart();
        } catch (error) {
          console.error('Assis: change Woo cart quantity failed', error);
          this.showShopifyActionError('cart', error);
          await this.syncShopifyCart();
        } finally {
          this._assisShopifyCartMutating = false;
        }
        return;
      }
      this._assisShopifyCartMutating = true;
      try {
        const response = await fetch(`${this.shopifyStoreRoot()}cart/change.js`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: key, quantity }),
        });
        if (!response.ok) {
          throw new Error(`Shopify cart change failed (${response.status})`);
        }
        const cart = await response.json();
        this.applyShopifyCartFromCart(cart);
        const sections = await this.refreshShopifyCartSections() || cart?.sections || {};
        await this.notifyShopifyCartUpdated({ cart, sections });
      } catch (error) {
        console.error('Assis: change Shopify cart quantity failed', error);
        this.showShopifyActionError('cart', error);
        await this.syncShopifyCart();
      } finally {
        this._assisShopifyCartMutating = false;
      }
    },
    async removeShopifyCartLine(lineKey) {
      const key = String(lineKey || '').trim();
      if (!key || !this.isStoreCart) return;
      const current = (this.shopifyCartItems || []).find((item) => String(item?.key) === key);
      this.trackPluginEvent('cart_removed', {
        title: this.clipPluginEventText?.(current?.title || current?.product_title || '') || '',
        product_id: String(current?.product_id || ''),
      });
      if (this.isLocalShopifyPreview()) {
        const cart = this._localShopifyPreviewCart || this.emptyLocalShopifyCart();
        cart.items = (cart.items || []).filter((line) => String(line.key) !== key);
        this.publishLocalShopifyCart(cart);
        return;
      }
      if (this.isWooCommerceWebsite()) {
        this._assisShopifyCartMutating = true;
        try {
          const cart = await this.wooStore('/cart/remove-item', {
            method: 'POST',
            body: { key },
          });
          this.applyShopifyCartFromCart(this.mapWooCartToShopifyCart(cart));
          this.refreshWooStoreCart();
        } catch (error) {
          console.error('Assis: remove from Woo cart failed', error);
          this.showShopifyActionError('cart', error);
          await this.syncShopifyCart();
        } finally {
          this._assisShopifyCartMutating = false;
        }
        return;
      }
      this._assisShopifyCartMutating = true;
      try {
        const response = await fetch(`${this.shopifyStoreRoot()}cart/change.js`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: key, quantity: 0 }),
        });
        if (!response.ok) {
          throw new Error(`Shopify cart change failed (${response.status})`);
        }
        const cart = await response.json();
        this.applyShopifyCartFromCart(cart);
        const sections = await this.refreshShopifyCartSections() || cart?.sections || {};
        await this.notifyShopifyCartUpdated({ cart, sections });
      } catch (error) {
        console.error('Assis: remove from Shopify cart failed', error);
        this.showShopifyActionError('cart', error);
        await this.syncShopifyCart();
      } finally {
        this._assisShopifyCartMutating = false;
      }
    },
    findKnownProductById(id) {
      const wanted = String(id || '');
      if (!wanted) return null;
      const matches = (product, index = 0) => {
        const item = this.unwrapProduct(product);
        return [item?.id, product?.id, this.getProductDisplayId(product, index)]
          .some((value) => value != null && String(value) === wanted);
      };
      for (const [index, product] of (this.highlightedProducts || []).entries()) {
        if (matches(product, index)) return product;
      }
      for (const message of this.chatMessages || []) {
        for (const [index, product] of (message.products || []).entries()) {
          if (matches(product, index)) return product;
        }
      }
      return null;
    },
    pruneAddedProductsNotInCart() {
      const added = this.poweredByAssisAddedProductIds || {};
      const ids = Object.keys(added);
      if (!ids.length) return;
      const liveKeys = this.shopifyCartKeys || {};
      if (!Object.keys(liveKeys).length) {
        this.poweredByAssisAddedProductIds = {};
        return;
      }
      const remaining = {};
      for (const id of ids) {
        const product = this.findKnownProductById(id) || { id };
        if (this.productCartKeys(product).some((key) => liveKeys[key])) {
          remaining[id] = true;
        }
      }
      this.poweredByAssisAddedProductIds = remaining;
    },
    markDiscountInapplicable(code) {
      const key = this.normalizeDiscountCode(code);
      if (!key) return;
      this.inapplicableDiscountCodes = { ...this.inapplicableDiscountCodes, [key]: true };
      if (this.normalizeDiscountCode(this.appliedDiscountCode) === key) {
        this.appliedDiscountCode = '';
      }
    },
    clearDiscountInapplicable(code) {
      const key = this.normalizeDiscountCode(code);
      if (!key || !this.inapplicableDiscountCodes?.[key]) return;
      const next = { ...this.inapplicableDiscountCodes };
      delete next[key];
      this.inapplicableDiscountCodes = next;
    },
    isShopifyDiscountNotApplicable(cart, code) {
      const codes = Array.isArray(cart?.discount_codes) ? cart.discount_codes : [];
      if (!codes.length) return false;
      const wanted = this.normalizeDiscountCode(code);
      const matching = wanted
        ? codes.find((entry) => this.normalizeDiscountCode(entry?.code) === wanted)
        : null;
      if (matching) return matching.applicable === false;
      return codes.some((entry) => entry?.applicable === false);
    },
    getAppliedDiscountCodeFromCart(cart, preferredCode = '') {
      const wanted = this.normalizeDiscountCode(preferredCode);
      const codes = Array.isArray(cart?.discount_codes) ? cart.discount_codes : [];
      const matching = codes.find((entry) => {
        const code = this.normalizeDiscountCode(entry?.code);
        if (!code || entry?.applicable === false) return false;
        if (wanted && code !== wanted) return false;
        return true;
      });
      if (matching?.code) return this.normalizeDiscountCode(matching.code);

      const apps = [
        ...(Array.isArray(cart?.cart_level_discount_applications) ? cart.cart_level_discount_applications : []),
        ...(Array.isArray(cart?.discount_applications) ? cart.discount_applications : []),
      ];
      const matchingApp = apps.find((app) => {
        const title = this.normalizeDiscountCode(app?.title || app?.code);
        return Boolean(title && (!wanted || title === wanted));
      });
      if (matchingApp?.title || matchingApp?.code) {
        return this.normalizeDiscountCode(matchingApp.title || matchingApp.code);
      }
      return wanted && this.cartHasDiscountCode(cart, preferredCode) ? wanted : '';
    },
    cartHasDiscountCode(cart, code) {
      const wanted = this.normalizeDiscountCode(code);
      if (!wanted || !cart) return false;

      const codes = Array.isArray(cart.discount_codes) ? cart.discount_codes : [];
      if (codes.some((entry) => (
        entry?.applicable !== false
        && this.normalizeDiscountCode(entry?.code) === wanted
      ))) return true;
      if (this.normalizeDiscountCode(cart.discount_code) === wanted) return true;

      const apps = [
        ...(Array.isArray(cart.cart_level_discount_applications) ? cart.cart_level_discount_applications : []),
        ...(Array.isArray(cart.discount_applications) ? cart.discount_applications : []),
      ];
      if (apps.some((app) => {
        const title = this.normalizeDiscountCode(app?.title || app?.code);
        return title === wanted;
      })) return true;

      for (const item of cart.items || []) {
        const itemDiscounts = [
          ...(Array.isArray(item?.discounts) ? item.discounts : []),
          ...(Array.isArray(item?.line_level_discount_allocations) ? item.line_level_discount_allocations : []),
        ];
        if (itemDiscounts.some((entry) => {
          const title = this.normalizeDiscountCode(
            entry?.title || entry?.code || entry?.discount_application?.title
          );
          return title === wanted;
        })) return true;
      }
      return false;
    },
    async fetchShopifyCart() {
      const response = await fetch(`${this.shopifyStoreRoot()}cart.js`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      return response.json();
    },
    async syncShopifyCart() {
      if (this.isWooCommerceWebsite()) {
        const startedAt = Date.now();
        try {
          const cart = await this.wooStore('/cart');
          if (this._wooExternalCartAt && this._wooExternalCartAt > startedAt) return;
          this.applyShopifyCartFromCart(this.mapWooCartToShopifyCart(cart || {}));
        } catch {
          /* ignore - widget may not be on a Woo origin */
        }
        return;
      }
      if (!this.isShopifyCartStore()) return;
      if (this.isLocalShopifyPreview()) {
        this.seedLocalShopifyPreview();
        return;
      }
      try {
        const cart = await this.fetchShopifyCart();
        this.applyShopifyCartFromCart(cart || { items: [], discount_codes: [] });
      } catch {
        /* ignore - widget may not be on a Shopify origin */
      }
    },
    isAssisSourcedCartEvent(detail) {
      if (!detail || typeof detail !== 'object') return false;
      if (detail.sourceId === 'assis' || detail.source === 'assis') return true;
      if (detail.data?.source === 'assis') return true;
      return false;
    },
    onExternalShopifyCartEvent(event) {
      if (!this.isShopifyCartStore()) return;
      if (this._assisNotifyingShopifyCart || this._assisShopifyCartMutating) return;
      const detail = event?.detail;
      if (this.isAssisSourcedCartEvent(detail)) return;

      const cart = detail?.cart
        || detail?.resource
        || detail?.cartData
        || (Array.isArray(detail?.items) ? detail : null);
      if (cart && Array.isArray(cart.items)) {
        this.applyShopifyCartFromCart(cart);
        return;
      }
      this.scheduleShopifyCartSyncFromExternal();
    },
    scheduleShopifyCartSyncFromExternal() {
      if (!this.isStoreCart) return;
      if (this._assisNotifyingShopifyCart || this._assisShopifyCartMutating) return;
      if (this._shopifyCartSyncTimer) clearTimeout(this._shopifyCartSyncTimer);
      const scheduledAt = Date.now();
      this._shopifyCartSyncTimer = setTimeout(() => {
        this._shopifyCartSyncTimer = 0;
        if (this._assisNotifyingShopifyCart || this._assisShopifyCartMutating) return;
        if (this._wooExternalCartAt && this._wooExternalCartAt >= scheduledAt) return;
        if (this._shopifyCartSyncInFlight) return;
        this._shopifyCartSyncInFlight = true;
        Promise.resolve(this.syncShopifyCart())
          .catch(() => { /* ignore */ })
          .finally(() => {
            this._shopifyCartSyncInFlight = false;
          });
      }, 120);
    },
    bindShopifyCartFetchHook() {
      if (this._shopifyCartFetchHooked || typeof window.fetch !== 'function') return;
      this._shopifyCartFetchHooked = true;
      this._nativeFetch = window.fetch.bind(window);
      const self = this;
      window.fetch = async function assisShopifyCartAwareFetch(...args) {
        const response = await self._nativeFetch(...self.stampWooCheckoutRequest(args));
        try {
          if (self._assisNotifyingShopifyCart || self._assisShopifyCartMutating) return response;
          const request = args[0];
          const url = typeof request === 'string'
            ? request
            : (request && typeof request.url === 'string' ? request.url : '');
          if (!self._wooStoreFetchDepth && response?.ok && self.isWooCommerceWebsite() && /wc\/store(?:\/v1)?\/(?:cart(?:[/?#]|$)|batch)/i.test(url)) {
            self.noteExternalWooCartResponse(response);
          }
          if (
            url
            && (
              /\/cart\/(add|change|update|clear)(?:\.js)?(?:[/?#]|$)/i.test(url)
              || /wc\/store(?:\/v1)?\/(?:cart\/(?:add-item|update-item|remove-item)|batch)/i.test(url)
            )
            && response?.ok
          ) {
            self.scheduleShopifyCartSyncFromExternal();
          }
        } catch {
          /* ignore */
        }
        return response;
      };
    },
    unbindShopifyCartFetchHook() {
      if (!this._shopifyCartFetchHooked || !this._nativeFetch) return;
      if (window.fetch?.name === 'assisShopifyCartAwareFetch') {
        window.fetch = this._nativeFetch;
      }
      this._nativeFetch = null;
      this._shopifyCartFetchHooked = false;
    },
    bindShopifyCartListeners() {
      if (!this.isStoreCart || this._shopifyCartListenersBound) return;
      this._shopifyCartListenersBound = true;
      if (this.isWooCommerceWebsite()) {
        this.bindWooCartListeners();
        return;
      }
      this._onExternalShopifyCartEvent = (event) => this.onExternalShopifyCartEvent(event);
      this._shopifyCartEventNames = [
        'cart:update',
        'cart:updated',
        'cart:change',
        'cart:refresh',
        'cart-update',
        'theme:cart:change',
        'theme:cart:update',
        'shopify:cart:update',
        'ajaxProduct:added',
        'product-ajax-cart:added',
      ];
      for (const name of this._shopifyCartEventNames) {
        document.addEventListener(name, this._onExternalShopifyCartEvent);
      }
      try {
        const subscribe = window.subscribe;
        const events = window.PUB_SUB_EVENTS;
        if (typeof subscribe === 'function' && events?.cartUpdate) {
          this._shopifyCartPubSubUnsub = subscribe(events.cartUpdate, (payload) => {
            this.onExternalShopifyCartEvent({ detail: payload });
          });
        }
      } catch {
        /* ignore */
      }
      this.bindShopifyCartFetchHook();
    },
    unbindShopifyCartListeners() {
      if (!this._shopifyCartListenersBound) return;
      this._shopifyCartListenersBound = false;
      if (this._shopifyCartSyncTimer) {
        clearTimeout(this._shopifyCartSyncTimer);
        this._shopifyCartSyncTimer = 0;
      }
      if (this._onExternalShopifyCartEvent && Array.isArray(this._shopifyCartEventNames)) {
        for (const name of this._shopifyCartEventNames) {
          document.removeEventListener(name, this._onExternalShopifyCartEvent);
        }
      }
      this._onExternalShopifyCartEvent = null;
      this._shopifyCartEventNames = null;
      this.unbindWooCartListeners();
      try {
        if (typeof this._shopifyCartPubSubUnsub === 'function') this._shopifyCartPubSubUnsub();
      } catch {
        /* ignore */
      }
      this._shopifyCartPubSubUnsub = null;
      this.unbindShopifyCartFetchHook();
    },
    getShopifyProductHandle(product) {
      const item = this.unwrapProduct(product);
      if (item.handle || item.product_handle) return item.handle || item.product_handle;
      const url = item.url || item.href || item.link || '';
      try {
        const path = new URL(url, window.location.origin).pathname;
        return path.match(/\/products\/([^/]+)/)?.[1]
          || path.match(/\/product\/([^/]+)/)?.[1]
          || '';
      } catch {
        return String(url).match(/\/products\/([^/?#]+)/)?.[1]
          || String(url).match(/\/product\/([^/?#]+)/)?.[1]
          || '';
      }
    },
    getShopifyVariantIdFromProduct(product) {
      const item = this.unwrapProduct(product);

      // Explicit selection / payload ids win over URL defaults.
      const explicitCandidates = [
        item.selectedVariantId,
        item.variant_id,
        item.variantId,
        item.selectedVariant,
        item.default_variant_id,
      ];
      for (const candidate of explicitCandidates) {
        const id = this.shopifyNumericId(candidate);
        if (id) return id;
      }

      const url = item.url || item.href || item.link || '';
      try {
        const fromQuery = new URL(url, window.location.origin).searchParams.get('variant');
        const fromQueryId = this.shopifyNumericId(fromQuery);
        if (fromQueryId) return fromQueryId;
      } catch {
        /* ignore */
      }

      const selectedTitle = String(
        item.selectedVariantTitle || item.variant_title || item.selectedVariant?.title || ''
      ).trim().toLowerCase();
      const variants = Array.isArray(item.variants)
        ? item.variants
        : item.variants?.edges?.map((edge) => edge?.node).filter(Boolean) || [];

      if (selectedTitle) {
        const matched = variants.find((variant) => {
          const label = String(variant?.title || variant?.name || variant?.label || '').trim().toLowerCase();
          return label && label === selectedTitle;
        });
        const matchedId = this.shopifyNumericId(matched?.id || matched?.variant_id || matched);
        if (matchedId) return matchedId;
      }

      const firstAvailable = variants.find((variant) => variant?.available !== false && variant?.availableForSale !== false) || variants[0];
      const fallbackCandidates = [
        item.variant,
        firstAvailable,
        firstAvailable?.id,
        firstAvailable?.variant_id,
      ];
      for (const candidate of fallbackCandidates) {
        const id = this.shopifyNumericId(candidate);
        if (id) return id;
      }
      return null;
    },
    async resolveShopifyVariantId(product) {
      const fromProduct = this.getShopifyVariantIdFromProduct(product);
      if (fromProduct) return fromProduct;

      const handle = this.getShopifyProductHandle(product);
      if (!handle) return null;

      const response = await fetch(`${this.shopifyStoreRoot()}products/${encodeURIComponent(handle)}.js`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      const data = await response.json();
      const variants = Array.isArray(data?.variants) ? data.variants : [];

      const selectedTitle = String(
        product?.selectedVariantTitle || product?.variant_title || product?.selectedVariant?.title || ''
      ).trim().toLowerCase();
      if (selectedTitle) {
        const matched = variants.find((item) => String(item?.title || '').trim().toLowerCase() === selectedTitle);
        const matchedId = this.shopifyNumericId(matched?.id);
        if (matchedId) return matchedId;
      }

      const selectedIdHint = this.shopifyNumericId(
        product?.selectedVariantId || product?.variant_id || product?.variantId
      );
      if (selectedIdHint) {
        const matchedById = variants.find((item) => this.shopifyNumericId(item?.id) === selectedIdHint);
        if (matchedById) return selectedIdHint;
      }

      const variant = variants.find((item) => item?.available !== false) || variants[0];
      return this.shopifyNumericId(variant?.id);
    },
    shopifyCartSectionPath() {
      return window.location.pathname || this.shopifyStoreRoot() || '/';
    },
    isShopifyProtectedSectionId(id) {
      const raw = String(id || '');
      return /header|footer|announcement/i.test(raw) && !/cart/i.test(raw);
    },
    getShopifyCartSectionIds() {
      const ids = new Set();
      const addId = (value) => {
        const id = String(value || '').replace(/^shopify-section-/, '').trim();
        if (!id || this.isShopifyProtectedSectionId(id)) return;
        ids.add(id);
      };

      document.querySelectorAll('[id^="shopify-section-"]').forEach((el) => {
        const id = String(el.id || '').replace(/^shopify-section-/, '').trim();
        if (!id) return;
        if (!/cart|mini-cart|ajax-cart|side-cart|sidecart/i.test(id)) return;
        addId(id);
      });

      [
        'cart-icon-bubble',
        'cart-drawer',
        'cart-notification',
        'cart-live-region-text',
        'cart-notification-button',
        'mini-cart',
        'main-cart-items',
        'main-cart-footer',
      ].forEach((id) => {
        if (document.getElementById(id) || document.getElementById(`shopify-section-${id}`)) addId(id);
      });

      if (document.querySelector('cart-drawer, #CartDrawer, #cart-drawer')) addId('cart-drawer');
      if (document.querySelector('cart-notification, #cart-notification')) addId('cart-notification');

      document.querySelectorAll(
        'cart-items-component, cart-drawer-component, cart-drawer, cart-notification, cart-items, [data-cart-drawer]'
      ).forEach((el) => {
        addId(el.dataset?.sectionId || el.dataset?.id);
        addId(el.closest('[id^="shopify-section-"]')?.id);
      });

      return [...ids];
    },
    applyShopifySectionHtml(id, html) {
      if (!id || !html) return;
      const parsed = new DOMParser().parseFromString(String(html), 'text/html');
      const incomingSection = parsed.getElementById(`shopify-section-${id}`)
        || parsed.querySelector('.shopify-section')
        || parsed.body?.firstElementChild;
      if (!incomingSection) return;

      const liveSection = document.getElementById(`shopify-section-${id}`);
      if (liveSection?.querySelector?.('cart-items-component, cart-drawer-component')) {
        return;
      }
      if (liveSection && !this.isShopifyProtectedSectionId(id)) {
        liveSection.replaceWith(incomingSection.cloneNode(true));
        document.dispatchEvent(new CustomEvent('shopify:section:load', { bubbles: true, detail: { sectionId: id } }));
        return;
      }

      const incomingById = parsed.getElementById(id);
      const liveById = document.getElementById(id);
      if (liveById && incomingById) {
        liveById.replaceWith(incomingById.cloneNode(true));
        return;
      }
      if (liveById) liveById.innerHTML = incomingSection.innerHTML;
    },
    replaceShopifySections(sections) {
      if (!sections || typeof sections !== 'object') return;
      Object.entries(sections).forEach(([id, html]) => this.applyShopifySectionHtml(id, html));
    },
    async fetchShopifySectionsByIds(ids) {
      if (!ids?.length) return null;
      const response = await fetch(`${this.shopifyCartSectionPath()}?sections=${encodeURIComponent(ids.join(','))}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      return response.json();
    },
    async refreshShopifyCartSections() {
      const ids = this.getShopifyCartSectionIds();
      if (!ids.length) return {};
      try {
        const sections = await this.fetchShopifySectionsByIds(ids);
        if (sections) {
          this.replaceShopifySections(sections);
          return sections;
        }
      } catch {
        /* try one section at a time so one missing ID cannot block the rest */
      }
      const collected = {};
      await Promise.all(ids.map(async (id) => {
        try {
          const sections = await this.fetchShopifySectionsByIds([id]);
          if (!sections) return;
          Object.assign(collected, sections);
          this.replaceShopifySections(sections);
        } catch {
          /* ignore missing theme sections */
        }
      }));
      return collected;
    },
    syncShopifyCartCount(cart) {
      const count = Number(cart?.item_count);
      if (!Number.isFinite(count)) return;
      const text = String(count);

      document.querySelectorAll('[data-cart-count], [data-cart-item-count]').forEach((el) => {
        if (el.hasAttribute('data-cart-count')) el.setAttribute('data-cart-count', text);
        if (el.hasAttribute('data-cart-item-count')) el.setAttribute('data-cart-item-count', text);
        if (!el.children.length) el.textContent = text;
      });

      document.querySelectorAll(
        '.cart-count-bubble span[aria-hidden="true"], .cart-count, .js-cart-count, .cart-link__bubble-num, .header__cart-count, .cart-count-number'
      ).forEach((el) => {
        if (el.children.length) return;
        el.textContent = text;
      });

      document.querySelectorAll('.cart-count-bubble').forEach((el) => {
        el.classList.toggle('hidden', count === 0);
        el.classList.toggle('hide', count === 0);
        if (count === 0) el.setAttribute('hidden', '');
        else el.removeAttribute('hidden');
      });

      const icon = document.getElementById('cart-icon-bubble');
      if (!icon) return;
      let bubble = icon.querySelector('.cart-count-bubble');
      if (count > 0 && !bubble) {
        bubble = document.createElement('div');
        bubble.className = 'cart-count-bubble';
        bubble.innerHTML = `<span aria-hidden="true">${text}</span>`;
        icon.appendChild(bubble);
      } else if (count === 0 && bubble) {
        bubble.remove();
      } else if (bubble) {
        const num = bubble.querySelector('span[aria-hidden="true"]') || bubble;
        if (!num.children.length) num.textContent = text;
      }
    },
    async notifyShopifyCartUpdated(payload) {
      this._assisNotifyingShopifyCart = true;
      try {
      const input = payload && typeof payload === 'object' ? payload : {};
      const cart = input.cart || (input.item_count != null ? input : null);
      let sections = input.sections && typeof input.sections === 'object' ? input.sections : {};
      if (!Object.keys(sections).length) {
        try {
          sections = await this.fetchShopifySectionsByIds(this.getShopifyCartSectionIds()) || {};
        } catch {
          sections = {};
        }
      }
      const itemCount = Number(cart?.item_count);
      this.syncShopifyCartCount(cart);

      const data = {
        source: 'assis',
        itemCount: Number.isFinite(itemCount) ? itemCount : 0,
        variantId: input.variantId || input.line?.variant_id || input.line?.id,
        sections,
        didError: false,
      };
      const detail = {
        resource: cart,
        sourceId: 'assis',
        data,
        sections,
        cart,
        line: input.line,
      };

      const publish = window.publish;
      const events = window.PUB_SUB_EVENTS;
      if (typeof publish === 'function' && events?.cartUpdate) {
        publish(events.cartUpdate, {
          source: 'assis',
          cartData: cart || input,
          productVariantId: data.variantId,
        });
      }

      const cartUpdateEvent = new CustomEvent('cart:update', { bubbles: true, cancelable: true, detail });
      cartUpdateEvent.promise = Promise.resolve({ cart, detail: data });
      document.dispatchEvent(cartUpdateEvent);

      [
        'cart:refresh',
        'cart:updated',
        'cart:change',
        'cart-update',
        'theme:cart:change',
        'theme:cart:update',
        'shopify:cart:update',
        'ajaxProduct:added',
        'product-ajax-cart:added',
      ].forEach((name) => {
        document.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
      });
      document.documentElement.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true, detail }));

      window.Shopify?.onCartUpdate?.(cart);
      window.theme?.cart?.refresh?.();
      window.theme?.cart?.update?.(cart);
      window.CartJS?.getCart?.();

      if (window.jQuery) {
        window.jQuery(document).trigger('cart.requestComplete', [cart]);
        window.jQuery(document.body).trigger('added.ajaxProduct', [cart]);
        window.jQuery(document).trigger('theme:cart:update', [cart]);
      }
      } finally {
        // Keep the guard briefly so theme handlers that re-emit cart events don't re-sync us.
        clearTimeout(this._assisNotifyingShopifyCartTimer);
        this._assisNotifyingShopifyCartTimer = setTimeout(() => {
          this._assisNotifyingShopifyCart = false;
          this._assisNotifyingShopifyCartTimer = 0;
        }, 250);
      }
    },
    async readJsonIfPossible(response) {
      const contentType = response?.headers?.get?.('content-type') || '';
      if (!contentType.includes('application/json')) return null;
      try {
        return await response.json();
      } catch {
        return null;
      }
    },
    async applyShopifyDiscountViaUrl(code) {
      const root = this.shopifyStoreRoot();
      const redirectPath = `${root}cart.js`;
      const url = `${root}discount/${encodeURIComponent(code)}?redirect=${encodeURIComponent(redirectPath)}`;
      const response = await fetch(url, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        redirect: 'follow',
      });
      if (!response.ok) return null;
      return this.readJsonIfPossible(response);
    },
    applyShopifyDiscountViaIframe(code) {
      const root = this.shopifyStoreRoot();
      const src = `${root}discount/${encodeURIComponent(code)}?redirect=${encodeURIComponent(`${root}cart.js`)}`;
      return new Promise((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.tabIndex = -1;
        iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden;pointer-events:none';
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          iframe.onload = null;
          iframe.remove();
          resolve();
        };
        const timer = window.setTimeout(done, 2500);
        iframe.onload = done;
        iframe.src = src;
        document.body.appendChild(iframe);
      });
    },
    async addShopifyVariantToCart(variantId, quantity = 1) {
      this._assisShopifyCartMutating = true;
      try {
      const sectionIds = this.getShopifyCartSectionIds();
      const payload = { id: Number(variantId), quantity };
      if (sectionIds.length) {
        payload.sections = sectionIds;
        payload.sections_url = this.shopifyCartSectionPath();
      }

      let response = await fetch(`${this.shopifyStoreRoot()}cart/add.js`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok && sectionIds.length) {
        response = await fetch(`${this.shopifyStoreRoot()}cart/add.js`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: Number(variantId), quantity }),
        });
      }
      if (!response.ok) {
        let description = `Shopify cart add failed (${response.status})`;
        try {
          const error = await response.json();
          description = error.description || error.message || description;
        } catch {
          /* ignore */
        }
        throw new Error(description);
      }
      const line = await response.json();
      if (line?.sections) this.replaceShopifySections(line.sections);

      let cart = null;
      try {
        cart = await this.fetchShopifyCart();
      } catch {
        /* ignore */
      }
      if (cart) this.applyShopifyCartFromCart(cart);
      else this.shopifyCartKeys = {
        ...this.shopifyCartKeys,
        ...Object.fromEntries(this.cartItemKeys(line).map((key) => [key, true])),
      };
      const sections = await this.refreshShopifyCartSections() || line?.sections || {};
      await this.notifyShopifyCartUpdated({ line, cart: cart || line, variantId, sections });
      this.revealGoToCheckout();
      return line;
      } finally {
        this._assisShopifyCartMutating = false;
      }
    },
    async applyShopifyDiscount(code) {
      const trimmed = String(code || '').trim();
      if (!trimmed) throw new Error('Missing discount code');
      const root = this.shopifyStoreRoot();

      let cart = null;
      const sectionIds = this.getShopifyCartSectionIds();
      const payload = { discount: trimmed };
      if (sectionIds.length) {
        payload.sections = sectionIds;
        payload.sections_url = this.shopifyCartSectionPath();
      }

      try {
        const updateResponse = await fetch(`${root}cart/update.js`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (updateResponse.ok) {
          cart = await updateResponse.json();
          this.replaceShopifySections(cart?.sections);
          if (this.isShopifyDiscountNotApplicable(cart, trimmed)) {
            return this.finishInapplicableDiscount(trimmed, cart);
          }
        }
      } catch {
        /* Fall through to /discount/CODE, which works on older storefronts. */
      }

      // /discount/CODE sets the storefront cookie so Liquid cart drawers and checkout see it.
      try {
        const fromUrl = await this.applyShopifyDiscountViaUrl(trimmed);
        if (fromUrl) cart = fromUrl;
      } catch {
        /* Cookie apply is best-effort; cart.js below is the source of truth. */
      }

      try {
        cart = await this.fetchShopifyCart() || cart;
      } catch {
        /* keep last cart snapshot */
      }

      if (!this.cartHasDiscountCode(cart, trimmed)) {
        await this.applyShopifyDiscountViaIframe(trimmed);
        try {
          cart = await this.fetchShopifyCart() || cart;
        } catch {
          /* keep last cart snapshot */
        }
      }

      if (!this.cartHasDiscountCode(cart, trimmed)) {
        if (this.isShopifyDiscountNotApplicable(cart, trimmed)) {
          return this.finishInapplicableDiscount(trimmed, cart);
        }
        throw new Error('Discount code was not applied to the cart');
      }

      this.clearDiscountInapplicable(trimmed);
      this.applyShopifyCartFromCart(cart);
      this.appliedDiscountCode = this.getAppliedDiscountCodeFromCart(cart, trimmed) || this.normalizeDiscountCode(trimmed);
      const sections = await this.refreshShopifyCartSections() || cart?.sections || {};
      await this.notifyShopifyCartUpdated({ cart, sections });
      return cart;
    },
    async finishInapplicableDiscount(code, cart) {
      this.markDiscountInapplicable(code);
      if (cart) this.applyShopifyCartFromCart(cart);
      const sections = await this.refreshShopifyCartSections() || cart?.sections || {};
      await this.notifyShopifyCartUpdated({ cart, sections });
      return cart;
    },
    getShopifyActionErrorText(error) {
      if (error == null) return '';
      if (typeof error === 'string') return error.trim();
      const pick = (value) => {
        if (Array.isArray(value)) return value.filter(Boolean).join(' ').trim();
        return String(value || '').trim();
      };
      const text = pick(error.description) || pick(error.message) || pick(error.error);
      if (!text) return '';
      if (/^Shopify cart add failed/i.test(text)) return '';
      if (/Could not resolve a Shopify variant/i.test(text)) return '';
      return text;
    },
    showShopifyActionError(kind, error) {
      const isHe = this.language === 'he';
      const messages = {
        cart: isHe ? 'לא ניתן להוסיף לסל. נסו שוב.' : "Couldn't add to cart. Please try again.",
        discount: isHe ? 'לא ניתן להחיל את ההנחה. נסו שוב.' : "Couldn't apply the discount. Please try again.",
      };
      this.shopifyActionError = this.getShopifyActionErrorText(error)
        || messages[kind]
        || (isHe ? 'משהו השתבש. נסו שוב.' : 'Something went wrong. Please try again.');
      if (this.shopifyActionErrorTimer) {
        clearTimeout(this.shopifyActionErrorTimer);
      }
      this.shopifyActionErrorTimer = setTimeout(() => {
        this.shopifyActionError = null;
        this.shopifyActionErrorTimer = null;
      }, 5000);
    },
    noteCouponApply(code, accepted) {
      if (typeof this.trackPluginEvent !== 'function') return;
      this.trackPluginEvent('coupon_apply', {
        code: typeof this.clipPluginEventText === 'function'
          ? this.clipPluginEventText(code, 40)
          : String(code || '').slice(0, 40),
        accepted: Boolean(accepted),
      });
      if (typeof this.flushPluginEvents === 'function') this.flushPluginEvents();
    },
    async applyMessageDiscount(discount) {
      if (this.isGeneralDiscount?.(discount)) return;
      const applyValue = this.getDiscountApplyValue(discount);
      if (!applyValue || this.applyingDiscountCode) return;

      const event = new CustomEvent('assis-apply-discount', {
        bubbles: true,
        cancelable: true,
        detail: {
          id: this.getDiscountId(discount),
          code: applyValue,
          discount,
        },
      });
      window.dispatchEvent(event);
      if (event.defaultPrevented) {
        this.noteCouponApply(applyValue, false);
        return;
      }

      if (this.isWooCommerceWebsite()) {
        this.applyingDiscountCode = this.normalizeDiscountCode(applyValue);
        this.clearDiscountInapplicable(applyValue);
        let accepted = false;
        try {
          await this.applyWooDiscount(applyValue);
          accepted = typeof this.isDiscountInapplicable === 'function'
            ? !this.isDiscountInapplicable(discount)
            : true;
        } catch (error) {
          accepted = false;
          console.error('Assis: apply Woo discount failed', error);
          this.showShopifyActionError('discount');
        } finally {
          this.applyingDiscountCode = '';
          this.noteCouponApply(applyValue, accepted);
        }
        return;
      }

      if (!this.isShopifyCartStore()) {
        this.appliedDiscountCode = this.normalizeDiscountCode(applyValue);
        this.noteCouponApply(applyValue, true);
        return;
      }

      this.applyingDiscountCode = this.normalizeDiscountCode(applyValue);
      this.clearDiscountInapplicable(applyValue);
      let accepted = false;
      try {
        await this.applyShopifyDiscount(applyValue);
        accepted = typeof this.isDiscountInapplicable === 'function'
          ? !this.isDiscountInapplicable(discount)
          : true;
      } catch (error) {
        accepted = false;
        console.error('Assis: apply Shopify discount failed', error);
        this.showShopifyActionError('discount');
      } finally {
        this.applyingDiscountCode = '';
        this.noteCouponApply(applyValue, accepted);
      }
    },
    noteExternalCartAdds(items) {
      let previous = Array.isArray(this.shopifyCartItems) ? this.shopifyCartItems : [];
      if (!this._shopifyCartSeen) {
        this._shopifyCartSeen = true;
        // Classic Woo product pages add to cart with a full page reload; diff against this tab's last cart.
        const snapshot = this.isWooCommerceWebsite() ? this.readWooCartSnapshot() : null;
        if (!snapshot) return;
        previous = snapshot;
      }
      if (this._assisShopifyCartMutating) return;
      const before = new Map();
      previous.forEach((line) => {
        const id = String(line?.variant_id || line?.key || '');
        if (!id) return;
        before.set(id, (before.get(id) || 0) + (Number(line.quantity) || 0));
      });
      items.forEach((line) => {
        const id = String(line?.variant_id || line?.key || '');
        if (!id) return;
        const next = Number(line?.quantity) || 0;
        const added = next - (before.get(id) || 0);
        if (added < 1) return;
        const cents = Number(line?.final_price ?? line?.price) || 0;
        const previousCount = previous.reduce((sum, line) => sum + (Number(line?.quantity) || 0), 0);
        const cartStatus = previousCount > 0 ? 'existing' : 'new';
        this.noteCartAdded({
          id: line?.product_id || line?.id,
          product_id: line?.product_id || '',
          variant_id: line?.variant_id || '',
          title: line?.product_title || line?.title || '',
          quantity: added,
          price: cents / 100,
        }, 'store', cartStatus);
      });
    },
    noteCartAdded(product, source = 'plugin', cartStatus = '') {
      const quantity = Math.max(1, Number(product?.quantity) || 1);
      const unit = Number(product?.price ?? product?.final_price);
      const title = this.clipPluginEventText?.(product?.title || product?.name || '') || '';
      const cartToken = this.recordedCartToken();
      const wooCart = Boolean(cartToken && this.isWooCommerceWebsite());
      this.trackPluginEvent('cart_added', {
        product_id: String(product?.id || product?.product_id || ''),
        variant_id: String(product?.selectedVariantId || product?.variant_id || product?.variantId || ''),
        title,
        quantity,
        ...(Number.isFinite(unit) ? { line_price: unit * quantity } : {}),
        ...(cartToken ? { cart_token: cartToken } : {}),
        ...(wooCart ? { cart_channel: 'woo' } : {}),
        source: source || 'plugin',
        ...(cartStatus === 'new' || cartStatus === 'existing' ? { cart_status: cartStatus } : {}),
      });
      if (typeof this.stampAssisCartVisitor === 'function') this.stampAssisCartVisitor();
    },
    async addPoweredByAssisHomeProduct(product, source = 'home') {
      if (!product?.id || this.isProductInBag(product)) return;

      const event = new CustomEvent('assis-add-to-cart', {
        bubbles: true,
        cancelable: true,
        detail: {
          productId: product.id,
          product,
          variantId: product.selectedVariantId || product.variant_id || product.variantId || null,
          variantTitle: product.selectedVariantTitle || product.variant_title || null,
        },
      });
      window.dispatchEvent(event);
      if (event.defaultPrevented) return;

      const cartStatus = (Number(this.shopifyCartItemCount) || 0) > 0 ? 'existing' : 'new';
      const bagKey = this.getProductBagStateKey(product);
      const alreadyInBag = this.isProductInBag(product);
      this.poweredByAssisAddedProductIds = {
        ...this.poweredByAssisAddedProductIds,
        ...(bagKey ? { [bagKey]: true } : (product.id ? { [product.id]: true } : {})),
      };

      if (this.isWooCommerceWebsite()) {
        try {
          const productId = this.getShopifyVariantIdFromProduct(product) || this.shopifyNumericId(product.id);
          if (!productId) throw new Error('Could not resolve a Woo product to add');
          await this.addWooProductToCart(productId, Math.max(1, Number(product.quantity) || 1));
          this.noteCartAdded(product, source, cartStatus);
        } catch (error) {
          if (!alreadyInBag) {
            const next = { ...this.poweredByAssisAddedProductIds };
            if (bagKey) delete next[bagKey];
            else if (product.id) delete next[product.id];
            this.poweredByAssisAddedProductIds = next;
          }
          console.error('Assis: add to Woo cart failed', error);
          this.showShopifyActionError('cart', error);
        }
        return;
      }

      if (!this.isShopifyCartStore()) return;

      if (this.isLocalShopifyPreview()) {
        this._assisShopifyCartMutating = true;
        try {
          this.addLocalShopifyPreviewProduct(product);
          this.noteCartAdded(product, source, cartStatus);
        } finally {
          this._assisShopifyCartMutating = false;
        }
        return;
      }

      try {
        const variantId = this.shopifyNumericId(
          product.selectedVariantId || product.variant_id || product.variantId
        ) || await this.resolveShopifyVariantId(product);
        if (!variantId) {
          throw new Error('Could not resolve a Shopify variant to add');
        }
        await this.addShopifyVariantToCart(variantId, Math.max(1, Number(product.quantity) || 1));
          this.noteCartAdded(product, source, cartStatus);
      } catch (error) {
        if (!alreadyInBag) {
          const next = { ...this.poweredByAssisAddedProductIds };
          if (bagKey) delete next[bagKey];
          else if (product.id) delete next[product.id];
          this.poweredByAssisAddedProductIds = next;
        }
        console.error('Assis: add to Shopify cart failed', error);
        this.showShopifyActionError('cart', error);
      }
    },
    isAddToCartChatRequest(text) {
      const raw = String(text || '').trim();
      if (!raw) return false;
      if (/(תוסיפ[היו]?|הוסיפ[היו]?|להוסיף|תשימ[הי]|שימ[הי]|שים|לשים).{0,40}(לסל|לעגלה|עגלה)/.test(raw)) return true;
      return /\b(add|put)\b.{0,40}\b(cart|bag)\b/i.test(raw);
    },
    async addProductFromChatRequest(text) {
      if (!this.isStoreCart || !this.isAddToCartChatRequest(text)) return;
      const messages = Array.isArray(this.chatMessages) ? this.chatMessages : [];
      let productMessage = null;
      for (let i = messages.length - 1; i >= 0; i -= 1) {
        const message = messages[i];
        if (String(message?.sender || '').toLowerCase() === 'client') continue;
        if (Array.isArray(message?.products) && message.products.length) {
          productMessage = message;
          break;
        }
      }
      if (!productMessage) return;

      const products = productMessage.products;
      let chosenIndex = products.length === 1 ? 0 : -1;
      let bestScore = 0;
      products.forEach((product, index) => {
        const title = this.getProductDisplayTitle?.(product) || product?.title || '';
        const score = typeof this.scoreProductMentionMatch === 'function'
          ? this.scoreProductMentionMatch(title, text)
          : 0;
        if (score > bestScore) {
          bestScore = score;
          chosenIndex = index;
        }
      });
      if (chosenIndex < 0) chosenIndex = 0;

      const payload = typeof this.buildProductCardCartPayload === 'function'
        ? this.buildProductCardCartPayload(products[chosenIndex], chosenIndex, productMessage)
        : products[chosenIndex];
      if (!payload?.id) return;

      if (this.isProductInBag(payload)) {
        this.revealGoToCheckout();
        return;
      }

      await this.addPoweredByAssisHomeProduct(payload, 'chat');
      if (this.isProductInBag(payload)) this.revealGoToCheckout();
    },
  },
};
