/**
 * WooCommerce cart mixin for the Assis widget.
 * Same bundle as shopifyCart.js (one IIFE). The bag UI stays in shopifyCart.js.
 */
const WOO_BLOCKS_CART_EVENTS = ['wc-blocks_added_to_cart', 'wc-blocks_removed_from_cart'];
const WOO_JQUERY_CART_EVENTS = 'added_to_cart removed_from_cart updated_cart_totals updated_wc_div';
const WOO_CART_SNAPSHOT_KEY = 'assis_woo_cart_lines';
const WOO_PLUGIN_VISITOR_KEY = 'assis_woo_plugin_visitor';

/** Woo's sourcebuster writes "(none)" for visits without a campaign id; Woo drops it on save. */
function isFreeWooUtmId(value) {
  const text = String(value ?? '').trim();
  return !text || text === '(none)';
}

/** Allow first stamp and later upgrade `assis:visitor` → `assis:visitor:careRequestId`. */
function shouldWriteWooAssisStamp(current, next) {
  if (!next) return false;
  if (isFreeWooUtmId(current)) return true;
  return String(current).startsWith('assis:') && String(current) !== String(next);
}

function wooCartFromStorePayload(data) {
  const asCart = (value) => {
    if (!value || typeof value !== 'object' || !Array.isArray(value.items)) return null;
    if (value.totals || value.items_count != null) return value;
    return null;
  };
  const direct = asCart(data);
  if (direct) return direct;
  const list = Array.isArray(data?.responses) ? data.responses : (Array.isArray(data) ? data : null);
  if (!list) return null;
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const entry = list[index];
    const body = entry && typeof entry === 'object' && 'body' in entry ? entry.body : entry;
    const cart = asCart(body);
    if (cart) return cart;
  }
  return null;
}

export default {
  watch: {
    careRequestId() {
      this.rememberAssisCareRequestCookie();
      // Upgrade utm / cookies to include the care id before store checkout.
      if (typeof this.stampAssisCartVisitor === 'function') {
        this.stampAssisCartVisitor();
      } else if (typeof this.stampWooCartVisitor === 'function') {
        this.stampWooCartVisitor();
      }
    },
  },
  methods: {
    isWooCommerceWebsite() {
      if (this.isShopifyWebsite || (typeof window !== 'undefined' && window.Shopify)) return false;
      try {
        if (window.wc_add_to_cart_params || window.wc_checkout_params || window.wcSettings) return true;
        if (document.body?.classList?.contains('woocommerce')) return true;
      } catch {
        return false;
      }
      return false;
    },
    wooCheckoutUrl() {
      const usable = (value) => {
        const url = String(value || '').trim();
        if (!url || /[?&]wc-ajax=/i.test(url)) return '';
        // Never treat the cart page (or current page) as checkout.
        try {
          const parsed = new URL(url, window.location.origin);
          const path = parsed.pathname.replace(/\/+$/, '') || '/';
          if (/\/cart$/i.test(path)) return '';
          if (path === (window.location.pathname.replace(/\/+$/, '') || '/')) return '';
        } catch {
          /* keep raw */
        }
        return url;
      };
      // Blocks / Store API checkout page.
      const blocksUrl = usable(window.wcSettings?.checkoutUrl);
      if (blocksUrl) return blocksUrl;
      // Classic params: checkout_url is often the ajax place-order endpoint — skip that.
      const params = window.wc_checkout_params || {};
      const fromClassic = usable(params.checkout_url)
        || usable(params.checkout_page)
        || usable(window.wc_add_to_cart_params?.checkout_url)
        || usable(window.wc_add_to_cart_params?.cart_url?.replace(/\/cart\/?$/i, '/checkout/'));
      if (fromClassic) return fromClassic;
      // Never use the current page path — home/blog would "navigate" nowhere.
      return `${this.shopifyStoreRoot()}checkout/`;
    },
    wooCartUrl() {
      const usable = (value) => {
        const url = String(value || '').trim();
        if (!url || /[?&]wc-ajax=/i.test(url)) return '';
        try {
          const parsed = new URL(url, window.location.origin);
          const path = parsed.pathname.replace(/\/+$/, '') || '/';
          // Prefer real cart pages only (not checkout / current PDP).
          if (/\/checkout$/i.test(path)) return '';
          if (path === (window.location.pathname.replace(/\/+$/, '') || '/') && !/\/cart$/i.test(path)) return '';
        } catch {
          /* keep raw */
        }
        return url;
      };
      const fromSettings = usable(window.wcSettings?.cartUrl)
        || usable(window.wc_add_to_cart_params?.cart_url)
        || usable(window.wc_checkout_params?.cart_url);
      if (fromSettings) return fromSettings;
      return `${this.shopifyStoreRoot()}cart/`;
    },
    assisCookieSuffix() {
      try {
        return window.location.protocol === 'https:' ? '; Secure' : '';
      } catch {
        return '';
      }
    },
    rememberAssisCareRequestCookie() {
      const careId = this.careRequestId != null ? String(this.careRequestId).trim() : '';
      if (!careId || !/^\d+$/.test(careId)) return;
      try {
        document.cookie = `assis_care_request_id=${careId}; path=/; Max-Age=2592000; SameSite=Lax${this.assisCookieSuffix()}`;
      } catch {
        /* Cookie write blocked */
      }
    },
    readAssisCareRequestCookie() {
      try {
        const match = document.cookie.match(/(?:^|;\s*)assis_care_request_id=(\d+)/);
        return match ? match[1] : '';
      } catch {
        return '';
      }
    },
    wooVisitorStamp() {
      this.rememberAssisCareRequestCookie();
      const visitorId = typeof this.getOrCreateClientId === 'function' ? this.getOrCreateClientId() : '';
      if (!visitorId) return '';
      try {
        document.cookie = `assis_visitor_id=${encodeURIComponent(visitorId)}; path=/; Max-Age=2592000; SameSite=Lax${this.assisCookieSuffix()}`;
      } catch {
        /* Cookie write blocked */
      }
      let careId = this.careRequestId != null ? String(this.careRequestId).trim() : '';
      if (!/^\d+$/.test(careId)) careId = this.readAssisCareRequestCookie();
      return careId && /^\d+$/.test(careId) ? `assis:${visitorId}:${careId}` : `assis:${visitorId}`;
    },
    bindWooVisitorStamp() {
      if (this._wooStampBound) return;
      this._wooStampBound = true;
      document.addEventListener('submit', (event) => {
        if (!this.isWooPluginVisitor()) return;
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        const stamp = this.wooVisitorStamp();
        if (!stamp) return;
        let input = form.querySelector('input[name="wc_order_attribution_utm_id"]');
        if (!input) {
          if (!form.classList.contains('checkout')) return;
          input = document.createElement('input');
          input.type = 'hidden';
          input.name = 'wc_order_attribution_utm_id';
          form.appendChild(input);
        }
        if (shouldWriteWooAssisStamp(input.value, stamp)) input.value = stamp;
      }, true);
    },
    isWooPluginVisitor() {
      try {
        return localStorage.getItem(WOO_PLUGIN_VISITOR_KEY) === '1';
      } catch {
        return false;
      }
    },
    /** Blocks checkout posts order attribution as JSON. Stamp it when this browser opened the plugin. */
    stampWooCheckoutRequest(args) {
      const [request, init] = args;
      if (typeof request !== 'string' || typeof init?.body !== 'string') return args;
      if (!/wc\/store(?:\/v1)?\/checkout(?:[/?#]|$)/i.test(request) || !this.isWooPluginVisitor()) return args;
      const stamp = this.wooVisitorStamp();
      if (!stamp) return args;
      try {
        const body = JSON.parse(init.body);
        const extensions = body?.extensions && typeof body.extensions === 'object' ? body.extensions : {};
        const attribution = extensions['woocommerce/order-attribution'];
        const current = attribution && typeof attribution === 'object' ? attribution.utm_id : '';
        if (attribution && typeof attribution === 'object' && !shouldWriteWooAssisStamp(current, stamp)) {
          return args;
        }
        const nextAttribution = attribution && typeof attribution === 'object'
          ? { ...attribution, utm_id: stamp }
          : { utm_id: stamp };
        return [request, {
          ...init,
          body: JSON.stringify({
            ...body,
            extensions: {
              ...extensions,
              'woocommerce/order-attribution': nextAttribution,
            },
          }),
        }];
      } catch {
        return args;
      }
    },
    async stampWooCartVisitor() {
      const stamp = this.wooVisitorStamp();
      if (!stamp) return;
      try {
        localStorage.setItem(WOO_PLUGIN_VISITOR_KEY, '1');
      } catch {
        /* Storage is blocked; the stamp still covers this page. */
      }
      this.bindWooVisitorStamp();
      document.querySelectorAll('wc-order-attribution-inputs').forEach((element) => {
        const values = { ...(element.values || {}) };
        if (shouldWriteWooAssisStamp(values.utm_id, stamp)) element.values = { ...values, utm_id: stamp };
      });
      try {
        const select = window.wp?.data?.select?.('wc/store/checkout');
        const dispatch = window.wp?.data?.dispatch?.('wc/store/checkout');
        const current = select?.getExtensionData?.()?.['woocommerce/order-attribution'] || {};
        if (dispatch?.setExtensionData && shouldWriteWooAssisStamp(current.utm_id, stamp)) {
          dispatch.setExtensionData('woocommerce/order-attribution', { ...current, utm_id: stamp }, true);
        }
      } catch {
        /* Checkout block is not on this page. */
      }
    },
    rememberWooCartHeaders(response) {
      const nonce = response.headers.get('Nonce') || response.headers.get('nonce');
      const token = response.headers.get('Cart-Token') || response.headers.get('cart-token');
      if (nonce) this._wooCartNonce = nonce;
      if (token) this._wooCartToken = token;
    },
    async wooStore(path, { method = 'GET', body, retried = false } = {}) {
      this._wooStoreFetchDepth = (this._wooStoreFetchDepth || 0) + 1;
      try {
        if (method !== 'GET' && !this._wooCartNonce) {
          await this.wooStore('/cart');
        }
        const headers = { Accept: 'application/json' };
        if (this._wooCartNonce) headers.Nonce = this._wooCartNonce;
        // Never send Cart-Token: it switches the Store API to a separate headless cart the site and checkout never see.
        if (body) headers['Content-Type'] = 'application/json';
        const response = await fetch(`/wp-json/wc/store/v1${path}`, {
          method,
          credentials: 'same-origin',
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
        this.rememberWooCartHeaders(response);
        if (!response.ok) {
          if (!retried && method !== 'GET' && (response.status === 401 || response.status === 403)) {
            this._wooCartNonce = '';
            return this.wooStore(path, { method, body, retried: true });
          }
          let message = `Woo cart failed (${response.status})`;
          try {
            const error = await response.json();
            message = error?.message || message;
          } catch {
            /* keep the status */
          }
          throw new Error(message);
        }
        if (response.status === 204) return null;
        return response.json();
      } finally {
        this._wooStoreFetchDepth -= 1;
      }
    },
    mapWooCartToShopifyCart(cart) {
      const toCents = (raw, minorUnit) => {
        const value = Number(raw);
        if (!Number.isFinite(value)) return 0;
        const minor = Number.isFinite(Number(minorUnit)) ? Number(minorUnit) : 2;
        return Math.round((value / (10 ** minor)) * 100);
      };
      const items = (Array.isArray(cart?.items) ? cart.items : []).map((item) => {
        const minor = item?.prices?.currency_minor_unit ?? item?.totals?.currency_minor_unit ?? 2;
        const unit = toCents(item?.prices?.price, minor);
        const line = toCents(item?.totals?.line_total, minor);
        const image = item?.images?.[0]?.thumbnail || item?.images?.[0]?.src || '';
        const variation = Array.isArray(item?.variation)
          ? item.variation.map((entry) => entry?.value).filter(Boolean).join(' / ')
          : '';
        return {
          key: item?.key,
          id: item?.id,
          variant_id: item?.id,
          product_id: item?.id,
          title: item?.name || '',
          product_title: item?.name || '',
          variant_title: variation,
          quantity: item?.quantity,
          price: unit,
          final_price: unit,
          line_price: line,
          final_line_price: line,
          image,
          url: item?.permalink || '',
        };
      });
      const totalMinor = cart?.totals?.currency_minor_unit ?? 2;
      const coupons = Array.isArray(cart?.coupons) ? cart.coupons : [];
      return {
        items,
        item_count: items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
        total_price: toCents(cart?.totals?.total_price, totalMinor),
        currency: cart?.totals?.currency_code || '',
        discount_codes: coupons.map((coupon) => ({ code: coupon?.code })),
      };
    },
    async addWooProductToCart(productId, quantity = 1) {
      this._assisShopifyCartMutating = true;
      try {
        await this.wooStore('/cart/add-item', {
          method: 'POST',
          body: { id: Number(productId), quantity },
        });
        const cart = await this.wooStore('/cart');
        this.applyShopifyCartFromCart(this.mapWooCartToShopifyCart(cart));
        this.refreshWooStoreCart();
        this.revealGoToCheckout();
      } finally {
        this._assisShopifyCartMutating = false;
      }
    },
    async applyWooDiscount(code) {
      const trimmed = String(code || '').trim();
      const cart = this.mapWooCartToShopifyCart(await this.wooStore('/cart/apply-coupon', {
        method: 'POST',
        body: { code: trimmed },
      }));
      if (!this.cartHasDiscountCode(cart, trimmed)) {
        this.markDiscountInapplicable(trimmed);
        this.applyShopifyCartFromCart(cart);
        return cart;
      }
      this.clearDiscountInapplicable(trimmed);
      this.applyShopifyCartFromCart(cart);
      this.appliedDiscountCode = this.getAppliedDiscountCodeFromCart(cart, trimmed) || this.normalizeDiscountCode(trimmed);
      return cart;
    },
    /** Woo product ids are short, or prefixed `woocommerce_` / `woocommerce_variant_`. */
    wooNumericId(raw) {
      const woo = String(raw || '').match(/^woocommerce_(?:variant_)?(\d+)$/);
      if (woo) return woo[1];
      if (/^\d+$/.test(String(raw || '')) && this.isWooCommerceWebsite()) return String(raw);
      return null;
    },
    noteExternalWooCartResponse(response) {
      if (!response || typeof response.clone !== 'function') return;
      response.clone().json().then((data) => {
        if (this._assisShopifyCartMutating || this._wooStoreFetchDepth) return;
        const cart = wooCartFromStorePayload(data);
        if (!cart) return;
        this._wooExternalCartAt = Date.now();
        this.applyShopifyCartFromCart(this.mapWooCartToShopifyCart(cart));
      }).catch(() => {
        /* Not a cart payload. */
      });
    },
    bindWooCartListeners() {
      this._onExternalWooCartEvent = () => this.scheduleShopifyCartSyncFromExternal();
      for (const name of WOO_BLOCKS_CART_EVENTS) {
        document.body.addEventListener(name, this._onExternalWooCartEvent);
      }
      // Classic Woo fires these through jQuery only, so native listeners never see them.
      if (typeof window.jQuery === 'function') {
        window.jQuery(document.body).on(WOO_JQUERY_CART_EVENTS, this._onExternalWooCartEvent);
      }
      this.bindWooVisitorStamp();
      this.bindShopifyCartFetchHook();
    },
    unbindWooCartListeners() {
      if (!this._onExternalWooCartEvent) return;
      for (const name of WOO_BLOCKS_CART_EVENTS) {
        document.body.removeEventListener(name, this._onExternalWooCartEvent);
      }
      if (typeof window.jQuery === 'function') {
        window.jQuery(document.body).off(WOO_JQUERY_CART_EVENTS, this._onExternalWooCartEvent);
      }
      this._onExternalWooCartEvent = null;
    },
    /** Let the site's own mini-cart (classic fragments or Blocks store) show plugin changes. */
    refreshWooStoreCart() {
      try {
        if (typeof window.jQuery === 'function') window.jQuery(document.body).trigger('wc_fragment_refresh');
        window.wp?.data?.dispatch?.('wc/store/cart')?.invalidateResolutionForStore?.();
        // Woo block themes refresh the mini-cart only from these document events.
        for (const name of WOO_BLOCKS_CART_EVENTS) {
          document.dispatchEvent(new Event(name));
        }
      } catch {
        /* The store has no mini-cart we can refresh. */
      }
    },
    saveWooCartSnapshot(items) {
      try {
        const lines = items.map((line) => ({ variant_id: line?.variant_id, key: line?.key, quantity: line?.quantity }));
        sessionStorage.setItem(WOO_CART_SNAPSHOT_KEY, JSON.stringify(lines));
      } catch {
        /* Storage is blocked. */
      }
    },
    readWooCartSnapshot() {
      try {
        const lines = JSON.parse(sessionStorage.getItem(WOO_CART_SNAPSHOT_KEY) || 'null');
        return Array.isArray(lines) ? lines : null;
      } catch {
        return null;
      }
    },
  },
};
