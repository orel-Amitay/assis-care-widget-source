const FLUSH_MS = 4000;
const QUEUE_CAP = 80;
const SEEN_CAP = 400;
// Events that happen by themselves or only move the window. They do not count as the shopper doing something.
const PASSIVE_EVENTS = new Set([
  'site_visit', 'plugin_opened', 'plugin_closed', 'plugin_maximized', 'plugin_minimized', 'plugin_dragged',
  'home_viewed', 'outside_bubbles_shown', 'product_card_shown', 'coupon_shown', 'offer_shown',
  'checkout_card_shown', 'banner_shown', 'assistant_replied', 'first_message',
]);
// Chat text stays on the Care session. The event is still sent, without the message body.
const CHAT_MESSAGE_PLUGIN_EVENTS = new Set([
  'message_sent',
  'first_message',
  'assistant_replied',
  'home_message_sent',
  'product_free_question',
]);

export default {
  created() {
    this._pluginEventsQueue = [];
    this._pluginEventsSeen = null;
    this._pluginLoadedAt = Date.now();
    this._pluginOpenedAt = 0;
    this._pluginMaximizedAt = 0;
    this._productSheetOpenedAt = 0;
    this._pluginClientSentAt = 0;
    this._pluginClientMessageCount = 0;
    this._pluginSawAssistantReply = false;
    this._pluginReplyTracked = false;
    this._pluginFirstMessageTracked = false;
    this._pluginOpenNoted = false;
    this._pluginActedSinceOpen = false;
    this._pluginReturning = false;
    try {
      this._pluginReturning = localStorage.getItem('assisPluginSeen') === '1';
      localStorage.setItem('assisPluginSeen', '1');
    } catch {
      /* storage can be blocked */
    }
  },
  mounted() {
    this._pluginEventsTimer = window.setInterval(() => this.flushPluginEvents(), FLUSH_MS);
    this._onPluginEventsPageHide = () => {
      if (this.isChatOpen && this._pluginOpenNoted) this.notePluginClosed();
      else this.flushPluginEvents();
    };
    window.addEventListener('pagehide', this._onPluginEventsPageHide);
    this.trackPluginEvent('site_visit', { returning: this._pluginReturning }, { onceKey: 'site_visit' });
    this.$nextTick(() => {
      if (this.showQuickActions) this.noteOutsideBubblesShown();
      if (this.showPoweredByAssisHome) {
        this.trackPluginEvent('home_viewed');
        this.noteHomeProductsShown();
      }
    });
  },
  beforeUnmount() {
    if (this._pluginEventsTimer) window.clearInterval(this._pluginEventsTimer);
    if (this._onPluginEventsPageHide) {
      window.removeEventListener('pagehide', this._onPluginEventsPageHide);
    }
    if (this.isChatOpen && this._pluginOpenNoted) this.notePluginClosed();
    this.flushPluginEvents();
  },
  watch: {
    showPoweredByAssisHome(open) {
      if (!open) return;
      this.trackPluginEvent('home_viewed');
      this.noteHomeProductsShown();
    },
    showQuickActions(open) {
      if (open) this.noteOutsideBubblesShown();
    },
    showShopifyCartPanel(open) {
      if (open) this.trackPluginEvent('cart_opened');
    },
  },
  methods: {
    clipPluginEventText(value, max = 180) {
      const text = String(value ?? '').replace(/\s+/g, ' ').trim();
      if (!text) return '';
      return text.length > max ? text.slice(0, max) : text;
    },
    pluginPageType(url = window.location.href) {
      let path = '';
      let search = '';
      let isCurrent = false;
      try {
        const parsed = new URL(url, window.location.origin);
        path = parsed.pathname || '';
        search = parsed.search || '';
        isCurrent = parsed.pathname === window.location.pathname && parsed.search === window.location.search;
      } catch {
        path = window.location.pathname || '';
        search = window.location.search || '';
        isCurrent = true;
      }
      const body = isCurrent && document.body ? String(document.body.className || '') : '';
      let decoded = path;
      try {
        decoded = decodeURIComponent(path);
      } catch {
        decoded = path;
      }
      const decodedLower = decoded.toLowerCase();

      if (/\/checkouts?(?:\/|$)/.test(path) || /\bwoocommerce-checkout\b/.test(body)) return 'checkout';
      if (/\/cart(?:\/|$)/.test(path) || /\bwoocommerce-cart\b/.test(body)) return 'cart';

      const params = new URLSearchParams(search);
      const wooSearch = String(params.get('s') || '').trim();
      if (wooSearch || /\/search(?:\/|$)/.test(path)) return 'search';

      if (
        /\/products\//.test(path)
        || /\/product\//.test(path)
        || /\bsingle-product\b/.test(body)
      ) return 'product';

      const tokens = decodedLower.split(/[/\-_]+/).filter(Boolean);
      const hasToken = (words) => tokens.some((token) => words.includes(token));
      if (hasToken(['sale', 'deal', 'deals', 'outlet', 'clearance', 'מבצע', 'מבצעים'])) return 'sale';

      if (
        /\/collections\//.test(path)
        || /\/product-category\//.test(path)
        || /\btax-product_cat\b/.test(body)
        || /\bpost-type-archive-product\b/.test(body)
      ) return 'collection';

      if (path === '/' || path === '') return 'home';

      if (hasToken([
        'shipping', 'delivery', 'refund', 'return', 'returns', 'faq', 'track', 'tracking',
        'policy', 'משלוח', 'משלוחים', 'החזר', 'החזרות', 'שאלות', 'מעקב', 'מדיניות',
      ])) return 'service';
      return 'other';
    },
    pluginPageDetailMax() {
      return 280;
    },
    pluginPageReadMeta(selector) {
      const el = document.querySelector(selector);
      if (!el) return '';
      const value = el.getAttribute('content') || el.textContent || '';
      return this.clipPluginEventText(value, this.pluginPageDetailMax());
    },
    pluginPageReadText(selector) {
      const el = document.querySelector(selector);
      return el ? this.clipPluginEventText(el.textContent || '', this.pluginPageDetailMax()) : '';
    },
    pluginPageTitleFromDocument() {
      return (
        this.pluginPageReadMeta('meta[property="og:title"]')
        || this.pluginPageReadText('.product_title')
        || this.pluginPageReadText('h1.product_title')
        || this.pluginPageReadText('.summary .product_title')
        || this.pluginPageReadText('main h1')
        || this.pluginPageReadText('h1.entry-title')
        || this.pluginPageReadText('[data-product-title]')
        || this.pluginPageReadText('h1.product-title')
        || this.clipPluginEventText(document.title || '', this.pluginPageDetailMax())
      );
    },
    pluginCollectionTitleFromDocument() {
      return (
        this.pluginPageReadText('.collection-title')
        || this.pluginPageReadText('.collection-hero__title')
        || this.pluginPageReadText('.collection-header__title')
        || this.pluginPageReadText('.woocommerce-products-header h1')
        || this.pluginPageReadText('.page-title')
        || this.pluginPageReadText('main h1')
        || this.pluginPageTitleFromDocument()
      );
    },
    pluginCartLineTitleForCare(line) {
      const item = line && typeof line === 'object' ? line : {};
      const title = this.clipPluginEventText(
        item.title || item.product_title || item.name || item.productTitle || 'Item',
        56,
      );
      const variant = this.clipPluginEventText(
        item.variant_title || item.selectedVariantTitle || item.variantTitle || '',
        32,
      );
      let label = title;
      if (variant && !String(label).toLowerCase().includes(String(variant).toLowerCase())) {
        label = `${label} (${variant})`;
      }
      const qty = Number(item.quantity) || 1;
      return qty > 1 ? `${label} ×${qty}` : label;
    },
    pluginCartSummaryForCare(maxLines = 8) {
      const items = Array.isArray(this.shopifyCartItems) ? this.shopifyCartItems : [];
      if (!items.length) return '';
      const lines = items.slice(0, maxLines).map((line) => this.pluginCartLineTitleForCare(line));
      let summary = lines.join(', ');
      if (items.length > maxLines) summary += ` +${items.length - maxLines} more`;
      const totalQty = items.reduce((sum, line) => sum + (Number(line?.quantity) || 1), 0);
      if (totalQty > 0) summary = `${totalQty} item${totalQty === 1 ? '' : 's'}: ${summary}`;
      return this.clipPluginEventText(summary, this.pluginPageDetailMax());
    },
    pluginCheckoutSummaryForCare() {
      const heading = this.pluginPageTitleFromDocument() || 'Checkout';
      const cart = this.pluginCartSummaryForCare(5);
      if (!cart) return this.clipPluginEventText(heading, this.pluginPageDetailMax());
      return this.clipPluginEventText(`${heading} · ${cart}`, this.pluginPageDetailMax());
    },
    pluginProductTitleForCare() {
      if (this.productDetail?.product && typeof this.getProductDisplayTitle === 'function') {
        const fromDetail = this.clipPluginEventText(this.getProductDisplayTitle(this.productDetail.product), this.pluginPageDetailMax());
        if (fromDetail) return fromDetail;
      }
      const base = this.pluginPageTitleFromDocument();
      const variant = this.pluginPageReadText('.variations .value')
        || this.pluginPageReadText('form.variations_form .woocommerce-variation-description')
        || this.pluginPageReadText('[data-selected-variant-title]');
      if (variant && base && !base.toLowerCase().includes(variant.toLowerCase())) {
        return this.clipPluginEventText(`${base} (${variant})`, this.pluginPageDetailMax());
      }
      return base;
    },
    pluginPageTitleForCare(pageType = this.pluginPageType()) {
      const type = String(pageType || '').trim() || 'other';
      if (type === 'home') return 'Home';
      if (type === 'cart') return this.pluginCartSummaryForCare();
      if (type === 'checkout') return this.pluginCheckoutSummaryForCare();
      if (type === 'collection') return this.pluginCollectionTitleFromDocument();
      if (type === 'product') return this.pluginProductTitleForCare();
      return this.pluginPageTitleFromDocument();
    },
    pluginPageContextForCare() {
      const pageType = this.pluginPageType();
      const pageTitle = this.pluginPageTitleForCare(pageType);
      return {
        pluginPageUrl: this.clipPluginEventText(window.location.href, 300),
        pluginPageType: pageType,
        ...(pageTitle ? { pluginPageTitle: pageTitle } : {}),
      };
    },
    pluginEventDevice() {
      return window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
    },
    pluginEventSeen(key) {
      if (!this._pluginEventsSeen) {
        const seen = new Set();
        try {
          const raw = sessionStorage.getItem('assisPluginSeenEvents');
          const parsed = raw ? JSON.parse(raw) : [];
          if (Array.isArray(parsed)) parsed.forEach((item) => seen.add(String(item)));
        } catch {
          /* ignore */
        }
        this._pluginEventsSeen = seen;
      }
      if (this._pluginEventsSeen.has(key)) return true;
      this._pluginEventsSeen.add(key);
      try {
        const keys = [...this._pluginEventsSeen].slice(-SEEN_CAP);
        this._pluginEventsSeen = new Set(keys);
        sessionStorage.setItem('assisPluginSeenEvents', JSON.stringify(keys));
      } catch {
        /* ignore */
      }
      return false;
    },
    forgetPluginEventOnce(key) {
      if (!this._pluginEventsSeen) return;
      this._pluginEventsSeen.delete(key);
      try {
        sessionStorage.setItem('assisPluginSeenEvents', JSON.stringify([...this._pluginEventsSeen]));
      } catch {
        /* ignore */
      }
    },
    trackPluginEvent(name, properties = {}, options = {}) {
      const eventName = String(name || '').trim();
      if (!eventName) return;
      if (CHAT_MESSAGE_PLUGIN_EVENTS.has(eventName)) {
        if (
          this._pluginOpenNoted
          && (eventName === 'message_sent' || eventName === 'first_message' || eventName === 'home_message_sent')
        ) {
          this._pluginActedSinceOpen = true;
        }
        const slim = { ...(properties && typeof properties === 'object' ? properties : {}) };
        delete slim.text;
        delete slim.message;
        properties = slim;
      }
      if (options.onceKey && this.pluginEventSeen(String(options.onceKey))) return;
      if (this._pluginOpenNoted && !PASSIVE_EVENTS.has(eventName)
        && properties?.source !== 'assistant' && properties?.source !== 'store') {
        this._pluginActedSinceOpen = true;
      }
      const queue = this._pluginEventsQueue || (this._pluginEventsQueue = []);
      queue.push({
        name: eventName,
        properties: {
          ...(properties && typeof properties === 'object' ? properties : {}),
        },
        page_url: this.clipPluginEventText(window.location.href, 300),
        page_type: this.pluginPageType(),
        device: this.pluginEventDevice(),
        language: this.language === 'he' ? 'he' : 'en',
        conversation_id: this.careRequestId || '',
        created_at: Date.now(),
      });
      if (queue.length > QUEUE_CAP) queue.splice(0, queue.length - QUEUE_CAP);
      if (queue.length >= 20) this.flushPluginEvents();
    },
    flushPluginEvents() {
      const queue = this._pluginEventsQueue || [];
      if (!queue.length || !this.ASSIS_BACKEND_URL) return;
      const events = queue.splice(0, 40);
      const body = JSON.stringify({
        store_url: window.location.origin,
        visitor_id: typeof this.getOrCreateClientId === 'function' ? this.getOrCreateClientId() : '',
        conversation_id: this.careRequestId || null,
        events,
      });
      const restore = () => {
        this._pluginEventsQueue = events.concat(this._pluginEventsQueue || []).slice(-QUEUE_CAP);
      };
      fetch(`${this.ASSIS_BACKEND_URL}/api/shopify/plugin-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body,
        keepalive: true,
      }).then((response) => {
        if (!response.ok && (response.status === 0 || response.status === 429)) restore();
      }).catch(() => restore());
    },
    notePluginOpened(source) {
      if (this._pluginOpenNoted && source !== 'click' && source !== 'bubble') {
        this._pluginOpenedAt = this._pluginOpenedAt || Date.now();
        return;
      }
      this._pluginOpenNoted = true;
      this._pluginActedSinceOpen = false;
      this._pluginOpenedAt = Date.now();
      this.trackPluginEvent('plugin_opened', {
        source: source || 'click',
        ms_since_load: Date.now() - (this._pluginLoadedAt || Date.now()),
        returning: Boolean(this._pluginReturning),
      });
      if (typeof this.stampAssisCartVisitor === 'function') this.stampAssisCartVisitor();
    },
    notePluginClosed() {
      if (!this._pluginOpenNoted) return;
      const openMs = this._pluginOpenedAt ? Date.now() - this._pluginOpenedAt : 0;
      const sentMessage = this._pluginClientMessageCount > 0;
      this.trackPluginEvent('plugin_closed', {
        open_ms: openMs,
        sent_message: sentMessage,
        closed_without_message: !sentMessage,
        no_action: !this._pluginActedSinceOpen,
      });
      if (this.isMaximized && this._pluginMaximizedAt) {
        this.trackPluginEvent('plugin_minimized', {
          maximized_ms: Date.now() - this._pluginMaximizedAt,
        });
        this._pluginMaximizedAt = 0;
      }
      this._pluginOpenNoted = false;
      this._pluginOpenedAt = 0;
      this.flushPluginEvents();
    },
    notePluginMaximized(source) {
      if (this.isMaximized) return;
      this._pluginMaximizedAt = Date.now();
      this.trackPluginEvent('plugin_maximized', { source: source || 'control' });
    },
    notePluginAssistantReply() {
      this._pluginSawAssistantReply = true;
      if (!this._pluginClientSentAt || this._pluginReplyTracked) return;
      this._pluginReplyTracked = true;
      this.trackPluginEvent('assistant_replied', {
        reply_ms: Date.now() - this._pluginClientSentAt,
      });
    },
    noteHomeProductsShown() {
      const products = Array.isArray(this.poweredByAssisHomeProducts) ? this.poweredByAssisHomeProducts : [];
      products.forEach((product) => {
        const props = this.pluginProductProps(product);
        const id = props.product_id || props.handle || props.title;
        if (!id) return;
        this.trackPluginEvent('product_card_shown', {
          ...props,
          source: 'home',
        }, { onceKey: `home-product:${id}` });
      });
    },
    noteOutsideBubblesShown() {
      const bubbles = Array.isArray(this.orderedPluginOutsideBubbles)
        ? this.orderedPluginOutsideBubbles
        : [];
      if (!bubbles.length) return;
      this.trackPluginEvent('outside_bubbles_shown', {
        bubbles: bubbles.slice(0, 12).map((bubble) => ({
          text: this.clipPluginEventText(bubble.plainText || bubble.textToSend || '', 120),
          clickable: Boolean(bubble.clickable),
        })),
      }, { onceKey: 'outside-bubbles' });
    },
    notePluginCatalog(messages) {
      const list = Array.isArray(messages) ? messages : [];
      list.forEach((message) => {
        if (message?.orderVerification && typeof this.showOrderVerificationCard === 'function' && this.showOrderVerificationCard(message)) {
          this.trackPluginEvent('order_verification_opened', {}, { onceKey: `order:${message.id || 'open'}` });
        }
        const products = Array.isArray(message?.products) ? message.products : [];
        products.forEach((product) => {
          const item = typeof this.unwrapProduct === 'function' ? this.unwrapProduct(product) : product;
          const id = item?.id || item?.handle || item?.title;
          if (!id) return;
          this.trackPluginEvent('product_card_shown', {
            ...this.pluginProductProps(product),
            source: 'chat',
          }, { onceKey: `product:${id}` });
        });
        const discounts = typeof this.getMessageDiscounts === 'function' ? this.getMessageDiscounts(message) : [];
        if (!Array.isArray(discounts) || !discounts.length) return;
        const noted = this._pluginDiscountNoted || (this._pluginDiscountNoted = new WeakMap());
        const shown = noted.get(message) || {};
        if (!noted.has(message)) noted.set(message, shown);
        const messageKey = message.id || message.datetime || '';
        discounts.forEach((discount) => {
          const general = typeof this.isGeneralDiscount === 'function' && this.isGeneralDiscount(discount);
          const title = typeof this.getDiscountDisplayText === 'function' ? this.getDiscountDisplayText(discount) : '';
          const identity = `${general ? 'offer' : 'coupon'}:${title || discount?.id || ''}`;
          if (shown[identity]) return;
          shown[identity] = true;
          this.trackPluginEvent(general ? 'offer_shown' : 'coupon_shown', {
            title: this.clipPluginEventText(title),
            ...(general ? {} : { code: this.clipPluginEventText(title) }),
          }, { onceKey: messageKey ? `${identity}:${messageKey}` : '' });
        });
      });
    },
    pluginProductImage(product) {
      const item = typeof this.unwrapProduct === 'function' ? (this.unwrapProduct(product) || product) : product;
      const candidates = [
        item?.image,
        item?.featuredImage,
        item?.featured_image,
        item?.images?.[0],
      ];
      for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        const url = typeof candidate === 'string'
          ? candidate
          : candidate?.url || candidate?.src || candidate?.originalSrc;
        if (typeof url === 'string' && /^https:\/\//i.test(url)) return url;
      }
      return '';
    },
    pluginProductProps(product) {
      const item = typeof this.unwrapProduct === 'function' ? (this.unwrapProduct(product) || product) : product;
      const image = this.pluginProductImage(product);
      return {
        product_id: String(item?.id || item?.product_id || ''),
        title: this.clipPluginEventText(typeof this.getProductDisplayTitle === 'function' ? this.getProductDisplayTitle(product) : item?.title),
        handle: this.clipPluginEventText(item?.handle || '', 80),
        ...(image ? { image: this.clipPluginEventText(image, 500) } : {}),
      };
    },
  },
};
