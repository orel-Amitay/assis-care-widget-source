/**
 * After a product lands in the bag: a short line plus a tilted row of real
 * store suggestions. Site adds replace the outside bubbles. Plugin adds sit
 * in the chat, above the checkout card. The store's own cart drawer opens.
 */

const UPSELL_PRODUCT_OPEN_KEY = 'assisUpsellProductOpen';
/** Site cart-upsell sheet: if idle, restore configured outside bubbles. */
const SITE_UPSELL_REVERT_MS = 20000;

function sameStorePath(href, here = window.location.href) {
  try {
    const target = new URL(href, window.location.origin);
    const current = new URL(here, window.location.origin);
    const path = (value) => value.pathname.replace(/\/+$/, '') || '/';
    return target.origin === current.origin && path(target) === path(current);
  } catch {
    return false;
  }
}

function suggestionImage(product) {
  const image = product?.featured_image || product?.images?.[0] || product?.image;
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.src || image.url || image.thumbnail || '';
}

/** `unit: 'cents'` = Shopify Ajax / Woo Store minor units. `unit: 'major'` = Assis catalog money. */
function suggestionPriceCents(price, unit = 'cents') {
  const amount = Number(price);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (unit === 'major') return Math.round(amount * 100);
  return Math.round(amount);
}

function suggestionCompareCents(priceCents, compare, unit = 'cents') {
  const cents = suggestionPriceCents(compare, unit);
  if (!priceCents || cents <= priceCents) return 0;
  return cents;
}

function decodeHtml(value) {
  const text = String(value || '').trim();
  if (!text || !text.includes('&')) return text;
  try {
    const node = document.createElement('textarea');
    node.innerHTML = text;
    return String(node.value || '').trim();
  } catch {
    return text;
  }
}

function variantLabel(variant) {
  const attributes = Array.isArray(variant?.attributes) ? variant.attributes : [];
  const fromAttributes = attributes
    .map((attribute) => decodeHtml(attribute?.value))
    .filter(Boolean)
    .join(' / ');
  const fromOptions = [variant?.option1, variant?.option2, variant?.option3]
    .map((value) => decodeHtml(value))
    .filter((value) => value && !/^default(\s+title)?$/i.test(value))
    .join(' / ');
  const label = fromAttributes
    || fromOptions
    || decodeHtml(variant?.title || variant?.name || '');
  if (!label || /^default(\s+title)?$/i.test(label)) return '';
  return label;
}

function suggestionFlagEnabled(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function suggestionIsPreOrder(product, variant = null) {
  if (suggestionFlagEnabled(variant?.isPreOrder)
    || suggestionFlagEnabled(variant?.is_pre_order)
    || suggestionFlagEnabled(variant?.preorder)) {
    return true;
  }
  if (!product || typeof product !== 'object') return false;
  if (suggestionFlagEnabled(product.isPreOrder)
    || suggestionFlagEnabled(product.is_pre_order)
    || suggestionFlagEnabled(product.preorder)) {
    return true;
  }
  const tags = product.tags;
  if (typeof tags === 'string' && /pre-?\s*order|הזמנה\s*מוקדמת/i.test(tags)) return true;
  if (Array.isArray(tags) && tags.some((tag) => /pre-?\s*order|הזמנה\s*מוקדמת/i.test(String(tag || '')))) {
    return true;
  }
  const variants = Array.isArray(product.variants) ? product.variants : [];
  return variants.some((entry) => (
    suggestionFlagEnabled(entry?.isPreOrder)
    || suggestionFlagEnabled(entry?.is_pre_order)
    || suggestionFlagEnabled(entry?.preorder)
  ));
}

function suggestionChoices(variants, unit = 'cents') {
  const choices = (Array.isArray(variants) ? variants : []).map((variant) => {
    const label = variantLabel(variant);
    const priceCents = suggestionPriceCents(variant?.price ?? variant?.prices?.price, unit);
    const preOrder = suggestionIsPreOrder(null, variant)
      || /pre-?\s*order|הזמנה\s*מוקדמת/i.test(String(variant?.title || variant?.name || ''));
    // Pre-order stays selectable even when Store JSON reports available:false / 0 stock.
    const available = preOrder || (
      variant?.available !== false
      && variant?.availableForSale !== false
      && variant?.is_in_stock !== false
    );
    return {
      id: variant?.id,
      label,
      priceCents,
      compareCents: suggestionCompareCents(
        priceCents,
        variant?.compare_at_price ?? variant?.prices?.regular_price,
        unit,
      ),
      image: suggestionImage(variant),
      available,
      isPreOrder: preOrder,
    };
  }).filter((choice) => choice.id && choice.label);
  return choices.length > 1 ? choices : [];
}

function suggestionUrl(product) {
  const raw = product?.url || product?.permalink || product?.href || '';
  if (raw) return String(raw);
  const handle = String(product?.handle || '').trim();
  return handle ? `/products/${handle}` : '';
}

function suggestionStoreProduct(item, extras = {}) {
  const title = decodeHtml(item?.title || item?.name);
  const handle = String(item?.handle || '').trim()
    || String(item?.permalink || '').split('/').filter(Boolean).pop()
    || '';
  const variants = Array.isArray(item?.variants) ? item.variants.filter(Boolean) : [];
  const isPreOrder = suggestionIsPreOrder(item);
  return {
    id: item?.id,
    title,
    handle,
    url: suggestionUrl(item),
    image: suggestionImage(item),
    images: [suggestionImage(item)].filter(Boolean),
    options: Array.isArray(item?.options) ? item.options : [],
    variants,
    ...(isPreOrder ? { isPreOrder: true } : {}),
    ...extras,
  };
}

function matchName(title) {
  const text = decodeHtml(title);
  if (!text) return '';
  const words = text.split(/\s+/).slice(0, 2).join(' ');
  if (words.length <= 18) return words;
  return text.slice(0, 16).trim();
}

function mapWooSuggestion(item) {
  const isPreOrder = suggestionIsPreOrder(item);
  return {
    id: item?.id,
    variantId: item?.id,
    title: decodeHtml(item?.name),
    image: suggestionImage(item),
    url: suggestionUrl(item),
    priceCents: suggestionPriceCents(item?.prices?.price),
    compareCents: suggestionCompareCents(
      suggestionPriceCents(item?.prices?.price),
      item?.prices?.regular_price,
    ),
    product: suggestionStoreProduct(item),
    ...(isPreOrder ? { isPreOrder: true } : {}),
  };
}

export default {
  data() {
    return {
      cartUpsell: null,
      cartUpsellTyped: '',
      cartUpsellHeadingTyped: '',
      cartUpsellCardsReady: false,
      cartUpsellIntro: '',
      cartUpsellIntroReady: false,
      cartUpsellLeadText: '',
      cartUpsellMoreReady: false,
      cartUpsellHold: false,
      cartUpsellAwaiting: false,
      cartFocusOn: false,
      cartUpsellMoreOpened: false,
      checkoutChatSnapshot: null,
      checkoutRestored: false,
    };
  },
  beforeUnmount() {
    this.clearSiteUpsellReturn();
    this.clearSiteUpsellAutoRevert();
    this.clearPluginCartSequence();
    this.stopCartUpsellTyping();
  },
  computed: {
    cartUpsellFromSite() {
      return Boolean(this.cartUpsell && this.cartUpsell.source === 'site' && !this.isChatOpen);
    },
    cartUpsellInChat() {
      return Boolean(this.cartUpsell && this.cartUpsell.source === 'plugin' && this.isChatOpen);
    },
    cartUpsellVisible() {
      const list = this.cartUpsell?.suggestions || [];
      return list.slice(0, 3).map((item) => ({
        ...item,
        priceLabel: this.cartUpsellPrice(item),
        compareLabel: item.compareCents ? this.cartUpsellPrice({ priceCents: item.compareCents }) : '',
        discountLabel: this.cartUpsellDiscountLabel(item),
        choices: (Array.isArray(item.choices) ? item.choices : []).map((choice) => ({
          ...choice,
          priceLabel: this.cartUpsellPrice(choice),
          compareLabel: choice.compareCents ? this.cartUpsellPrice({ priceCents: choice.compareCents }) : '',
        })),
      }));
    },
    cartUpsellImage() {
      return String(this.cartUpsell?.image || '').trim();
    },
    cartUpsellProductName() {
      return matchName(this.cartUpsell?.title);
    },
    cartUpsellMatch() {
      const title = matchName(this.cartUpsell?.title);
      if (!title) return this.language === 'he' ? 'מוצרים שיכולים להתאים' : 'Products that go with this';
      if (this.language !== 'he') return `Products that go with ${title}`;
      const hyphen = /^[A-Za-z0-9]/.test(title) ? '-' : '';
      return `מוצרים שיכולים להתאים ל${hyphen}${title}`;
    },
    cartUpsellSiteAdded() {
      return this.language === 'he' ? 'נוסף לסל' : 'Added to your bag';
    },
    cartUpsellAdded() {
      return this.cartUpsellLeadFallback();
    },
    cartUpsellTyping() {
      if (this.cartUpsell?.source !== 'plugin') return false;
      const full = this.cartUpsellLeadText;
      return Boolean(full && this.cartUpsellTyped !== full);
    },
    cartUpsellLead() {
      return this.cartUpsellAdded;
    },
    cartUpsellHeadingTyping() {
      const full = this.cartUpsellHeading;
      return Boolean(full && this.cartUpsellHeadingTyped && this.cartUpsellHeadingTyped !== full);
    },
    cartUpsellHeadingName() {
      return String(this.cartUpsell?.title || '').trim();
    },
    cartUpsellHeading() {
      if (this.language !== 'he') return 'More that goes with';
      return 'מוצרים נוספים שיכולים להתאים';
    },
  },
  methods: {
    async ensureChatReadyForCartAction() {
      this.poweredByAssisHomeDismissed = true;
      if (this.poweredByAssisForceHome) this.poweredByAssisForceHome = false;
      if (!this.isChatOpen && typeof this.toggleChat === 'function') {
        await this.toggleChat();
      }
      if (this.socket && this.isSocketConnected) return true;
      // First open may still be connecting — wait briefly before persist/AI.
      for (let i = 0; i < 8; i += 1) {
        if (this.socket && this.isSocketConnected) return true;
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      return Boolean(this.socket && this.isSocketConnected);
    },
    saveCartActionOnConversation(text, datetime, options = {}) {
      if (!text || !this.socket || !this.isSocketConnected) return false;
      if (!this.guestEmail && !this.guestPhone) {
        if (typeof this.generateRandomEmail !== 'function') return false;
        this.generatedEmail = this.generateRandomEmail();
        this.guestEmail = this.generatedEmail;
      }
      if (!this.guestEmail && !this.guestPhone) return false;
      const phone = this.guestPhone?.replace(/[^\d]/g, '')?.length > 5
        ? this.guestPhone.replace(/[^\d]/g, '')
        : null;
      // Button owns the AI turn (withAi). Chat affirm owns it — pin stays persist-only.
      const withAi = options.withAi === true;
      this.socket.emit('customer_to_agent_via_widget_with_ai', {
        type: 'message',
        cartAction: true,
        skipAi: !withAi,
        datetime,
        messages: [{ text, sender: 'client', datetime }],
        website: window.location.origin,
        isShopify: true,
        careRequestId: this.careRequestId || null,
        language: this.language,
        isTemporaryCustomer: (!this.guestPhone) || (this.generatedEmail && this.generatedEmail === this.guestEmail),
        userInfo: {
          name: this.guestName || 'Customer',
          email: this.guestEmail || this.generatedEmail,
          phone,
          websiteUrl: window.location.origin,
        },
      });
      return true;
    },
    scrollToCartActionPin(entry) {
      if (!entry) return;
      // Every add: scroll the chat down to the "הוספתי לעגלה" pin (bottom of the thread).
      if (this.productDetail && typeof this.closeProductDetail === 'function') {
        this.closeProductDetail();
      }
      if (this._chatUserScrollTimer) {
        clearTimeout(this._chatUserScrollTimer);
        this._chatUserScrollTimer = null;
      }
      this._chatUserScroll = false;
      const run = () => {
        const chatEl = this.$refs?.chatMessages;
        if (!chatEl) {
          if (typeof this.scrollToBottom === 'function') this.scrollToBottom('smooth');
          return;
        }
        const id = String(entry.id || '');
        const datetime = String(entry.datetime || '');
        const turns = this.$el?.querySelectorAll?.('.chat-turn') || [];
        let target = null;
        for (const turn of turns) {
          const keys = String(turn?.dataset?.anchorKeys || '');
          if ((id && keys.includes(id)) || (datetime && keys.includes(datetime))) {
            target = turn.querySelector?.('.message.assis-cart-action') || turn;
            break;
          }
        }
        if (!target) {
          const pins = chatEl.querySelectorAll?.('.message.assis-cart-action');
          target = pins && pins.length ? pins[pins.length - 1] : null;
        }
        // Pin is the latest line until the AI lands — scroll to the bottom of the thread.
        if (!target) {
          chatEl.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' });
          return;
        }
        const chatRect = chatEl.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const top = targetRect.bottom - chatRect.top + chatEl.scrollTop - chatEl.clientHeight + 16;
        chatEl.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      };
      this.$nextTick(() => {
        requestAnimationFrame(run);
        // Layout can shift once the loading bubble / drawer focus lands — nudge once more.
        window.setTimeout(run, 120);
        window.setTimeout(run, 320);
      });
    },
    /** True while an AI bubble is still streaming/typewriting (or we are waiting on one). */
    isAiReplyStillWriting() {
      if (this.typewriterMessage) return true;
      if (this.streamingMessage?.isStreaming || this.streamingMessage?.streamPendingCommit) return true;
      // Covers loadingIndicator + last client turn + AI isTyping/isStreaming.
      return Boolean(this.isWaitingOnAiReply);
    },
    /** Resolve only after the current AI reply is fully on screen — pin must not cut it off. */
    waitUntilAiReplyIdle() {
      if (!this.isAiReplyStillWriting()) return Promise.resolve();
      return new Promise((resolve) => {
        const tick = () => {
          if (!this.isAiReplyStillWriting()) {
            resolve();
            return;
          }
          window.setTimeout(tick, 100);
        };
        tick();
      });
    },
    async pushCartActionMessage(title, options = {}) {
      const name = decodeHtml(title);
      if (!name || typeof this.chatMessages === 'undefined') return null;
      const text = this.language === 'he' ? `הוספתי לעגלה: ${name}` : `Added to cart: ${name}`;
      // Bag may already have the item — only delay the chat pin / withAi turn until the
      // previous assistant bubble finished writing (otherwise that reply never lands).
      await this.waitUntilAiReplyIdle();
      // Layer 1: one pin per product per turn (button + AI cartActions can both fire).
      const recent = (this.chatMessages || []).slice(-10);
      const existing = recent.find((item) => {
        if (!item?.isCartAction) return false;
        const age = Date.now() - Date.parse(item.datetime || 0);
        if (!(age >= 0 && age < 15000)) return false;
        if (item.message === text) return true;
        const prevName = String(item.message || '')
          .replace(/^(?:הוספתי לעגלה:|Added to cart:)\s*/i, '')
          .trim();
        return Boolean(prevName) && prevName === name;
      });
      if (existing) {
        this.scrollToCartActionPin(existing);
        return existing;
      }
      const datetime = new Date().toISOString();
      const entry = {
        id: `cart-action-${Date.now()}`,
        message: text,
        sender: 'client',
        datetime,
        isCartAction: true,
      };
      // Always lead with the pin: when AI cartActions fire after the reply is already in
      // chat, insert the pin immediately before that AI message (not after it).
      const beforeMessage = options.beforeMessage || null;
      const beforeIndex = beforeMessage ? (this.chatMessages || []).indexOf(beforeMessage) : -1;
      if (beforeIndex >= 0) this.chatMessages.splice(beforeIndex, 0, entry);
      else this.chatMessages.push(entry);
      const withAi = options.withAi === true;
      // Button pin requests AI → bag card waits for that reply (under it), not an older AI above.
      this._cartUpsellNeedAiAfterPin = withAi;
      const saved = this.saveCartActionOnConversation(text, datetime, { withAi });
      if (withAi && saved) this.loadingIndicator = true;
      // Drawer + dim right after the pin — do not wait for AI / bag card.
      this.openPluginCartFocusNow();
      if (typeof this.clearIdleChatNudge === 'function') this.clearIdleChatNudge();
      // Proactive only after bag/reco choreography — not while waiting for AI.
      if (
        !withAi
        && !this._cartUpsellAwaitReply
        && !this._pluginCartChoreographyRunning
        && typeof this.armIdleChatNudge === 'function'
      ) {
        this.armIdleChatNudge();
      }
      if (typeof this.schedulePersistChatSession === 'function') this.schedulePersistChatSession();
      this.scrollToCartActionPin(entry);
      return entry;
    },
    /** Store/theme drawer + chat dim immediately (not Assis popup). */
    openPluginCartFocusNow() {
      if (typeof this.bumpShopifyCartBadge === 'function') this.bumpShopifyCartBadge();
      if (typeof this.openStoreCartDrawer === 'function') this.openStoreCartDrawer();
      this.cartFocusOn = true;
      if (typeof this.watchPluginCartFocus === 'function') this.watchPluginCartFocus();
    },
    waitCartChoreographyStep(ms) {
      const token = this._pluginCartChoreographyToken;
      const reduce = typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      const delay = reduce ? Math.min(ms, 180) : ms;
      return new Promise((resolve) => {
        const id = window.setTimeout(() => {
          this._pluginCartChoreographyTimers = (this._pluginCartChoreographyTimers || [])
            .filter((item) => item !== id);
          resolve(
            token === this._pluginCartChoreographyToken
            && this.cartUpsell?.source === 'plugin'
          );
        }, delay);
        (this._pluginCartChoreographyTimers || (this._pluginCartChoreographyTimers = [])).push(id);
      });
    },
    clearCartChoreographyTimers() {
      (this._pluginCartChoreographyTimers || []).forEach((id) => clearTimeout(id));
      this._pluginCartChoreographyTimers = [];
      this._pluginCartChoreographyToken = (this._pluginCartChoreographyToken || 0) + 1;
    },
    clearSiteUpsellReturn() {
      if (this._cartUpsellSiteTimer) {
        clearTimeout(this._cartUpsellSiteTimer);
        this._cartUpsellSiteTimer = null;
      }
    },
    clearSiteUpsellAutoRevert() {
      if (!this._cartUpsellAutoRevertTimer) return;
      window.clearTimeout(this._cartUpsellAutoRevertTimer);
      this._cartUpsellAutoRevertTimer = null;
    },
    /** After 20s without X / interaction, drop the site sheet and show configured bubbles again. */
    armSiteUpsellAutoRevert() {
      this.clearSiteUpsellAutoRevert();
      if (this.cartUpsell?.source !== 'site' || this.isChatOpen) return;
      this._cartUpsellAutoRevertTimer = window.setTimeout(() => {
        this._cartUpsellAutoRevertTimer = null;
        this.revertSiteUpsellToConfiguredBubbles();
      }, SITE_UPSELL_REVERT_MS);
    },
    revertSiteUpsellToConfiguredBubbles() {
      if (this.cartUpsell?.source !== 'site') {
        this.clearSiteUpsellAutoRevert();
        return;
      }
      this.dismissCartUpsell();
      // X dismisses forever; idle timeout restores configured outside bubbles.
      if (!this.isChatOpen) {
        this.outsideBubblesDismissed = false;
        this.showQuickActions = true;
      }
    },
    cartDrawerIsOpen() {
      if (typeof this.isWooCommerceWebsite === 'function' && this.isWooCommerceWebsite()) {
        return typeof this.wooMiniCartIsOpen === 'function' && this.wooMiniCartIsOpen();
      }
      if (typeof this.wooMiniCartIsOpen === 'function' && this.wooMiniCartIsOpen()) return true;
      const drawer = document.querySelector(
        'cart-drawer, cart-drawer-component, #CartDrawer, #cart-drawer, #sidebar-cart, .cart-drawer, [data-cart-drawer], dialog[id*="cart" i]'
      );
      if (!drawer) return false;
      if (
        drawer.hasAttribute('open')
        || drawer.classList.contains('active')
        || drawer.classList.contains('is-open')
        || drawer.classList.contains('is-visible')
      ) return true;
      const dialog = drawer.tagName === 'DIALOG' ? drawer : drawer.querySelector?.('dialog');
      return Boolean(dialog?.open);
    },
    scheduleSiteUpsellReturn() {
      this.clearSiteUpsellReturn();
      this._cartDrawerSawOpen = false;
      const watch = () => {
        if (this.cartUpsell?.source !== 'site') {
          this.clearSiteUpsellReturn();
          return;
        }
        const open = this.cartDrawerIsOpen();
        if (open) this._cartDrawerSawOpen = true;
        if (this._cartDrawerSawOpen && !open) {
          this.clearSiteUpsellReturn();
          this.dismissCartUpsell();
          return;
        }
        this._cartUpsellSiteTimer = window.setTimeout(watch, 280);
      };
      this._cartUpsellSiteTimer = window.setTimeout(watch, 400);
    },
    clearCartUpsellMoreTimer() {
      if (this._cartUpsellMoreTimer) {
        clearTimeout(this._cartUpsellMoreTimer);
        this._cartUpsellMoreTimer = null;
      }
    },
    armCartUpsellMore() {
      this.clearCartUpsellMoreTimer();
      this._cartUpsellMoreDue = false;
      this.cartUpsellMoreReady = false;
      this.cartUpsellMoreOpened = false;
      this._cartUpsellMoreWatch = false;
      this._cartUpsellMoreTimer = window.setTimeout(() => {
        this._cartUpsellMoreTimer = null;
        this._cartUpsellMoreDue = true;
        this.showCartUpsellMoreIfDue();
      }, 4000);
    },
    showCartUpsellMoreIfDue() {
      if (!this._cartUpsellMoreDue || this.cartUpsell?.source !== 'plugin' || this.cartUpsellMoreOpened) return;
      if (this.cartUpsellHold || this.cartUpsellTyping) return;
      if (!this.cartUpsellVisible.length) return;
      // Offer קרא עוד only — never auto-jump / auto-"click". Watch starts on shopper scroll.
      this.cartUpsellMoreReady = true;
      this.cartUpsellMoreOpened = false;
      this._cartUpsellMoreWatch = true;
    },
    openCheckoutRecoCards() {
      const id = this.checkoutChatAnchorId;
      const message = (this.chatMessages || []).find((item) => (
        typeof this.messageAnchorKeys === 'function' && this.messageAnchorKeys(item).includes(id)
      ));
      if (message?.checkoutMoment && message.checkoutMoment.revealed === false) {
        message.checkoutMoment = {
          ...message.checkoutMoment,
          revealed: true,
          intro: this.cartUpsellIntro || message.checkoutMoment.intro || '',
        };
      }
      this.cartUpsellCardsReady = this.cartUpsellVisible.length > 0;
      if (typeof this.schedulePersistChatSession === 'function') this.schedulePersistChatSession();
    },
    dismissCartUpsell() {
      this.clearSiteUpsellReturn();
      this.clearSiteUpsellAutoRevert();
      this.clearPluginCartSequence();
      this.clearCartChoreographyTimers();
      this._pluginCartChoreographyRunning = false;
      this._cartUpsellNeedAiAfterPin = null;
      this.clearCartUpsellMoreTimer();
      this._cartUpsellMoreDue = false;
      this.stopCartUpsellTyping();
      this.cartUpsellTyped = '';
      this.cartUpsellHeadingTyped = '';
      this.cartUpsellCardsReady = false;
      this.cartUpsellIntro = '';
      this.cartUpsellIntroReady = false;
      this.cartUpsellLeadText = '';
      this.cartUpsellMoreReady = false;
      this.cartUpsellHold = false;
      this.cartUpsellAwaiting = false;
      this.cartFocusOn = false;
      this.cartUpsellMoreOpened = false;
      this.cartUpsell = null;
    },
    clearPluginCartDrawerWatch() {
      if (this._pluginCartDrawerTimer) {
        clearTimeout(this._pluginCartDrawerTimer);
        this._pluginCartDrawerTimer = null;
      }
    },
    watchPluginCartFocus() {
      this.clearPluginCartDrawerWatch();
      this._pluginCartDrawerSawOpen = false;
      const started = Date.now();
      const watch = () => {
        if (!this.cartFocusOn || this.cartUpsell?.source !== 'plugin') {
          this.clearPluginCartDrawerWatch();
          this.cartFocusOn = false;
          return;
        }
        const open = this.cartDrawerIsOpen();
        if (open) this._pluginCartDrawerSawOpen = true;
        const gaveUp = !this._pluginCartDrawerSawOpen && Date.now() - started > 2500;
        if ((this._pluginCartDrawerSawOpen && !open) || gaveUp) {
          this.clearPluginCartDrawerWatch();
          this.cartFocusOn = false;
          return;
        }
        this._pluginCartDrawerTimer = window.setTimeout(watch, 280);
      };
      this._pluginCartDrawerTimer = window.setTimeout(watch, 280);
    },
    clearPluginCartSequence() {
      this.clearPluginCartDrawerWatch();
      (this._pluginCartTimers || []).forEach((id) => clearTimeout(id));
      this._pluginCartTimers = [];
      (this._pluginCartWaiters || []).splice(0).forEach((resolve) => resolve(false));
      this._pluginCartSequence = (this._pluginCartSequence || 0) + 1;
    },
    waitPluginCartStep(ms) {
      const token = this._pluginCartSequence;
      const reduce = typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      const delay = reduce ? Math.min(ms, 180) : ms;
      return new Promise((resolve) => {
        const waiters = this._pluginCartWaiters || (this._pluginCartWaiters = []);
        waiters.push(resolve);
        const id = window.setTimeout(() => {
          this._pluginCartWaiters = (this._pluginCartWaiters || []).filter((item) => item !== resolve);
          this._pluginCartTimers = (this._pluginCartTimers || []).filter((item) => item !== id);
          resolve(this._pluginCartSequence === token && this.cartUpsell?.source === 'plugin');
        }, delay);
        (this._pluginCartTimers || (this._pluginCartTimers = [])).push(id);
      });
    },
    async playPluginCartSequence() {
      this.clearPluginCartSequence();
      const token = this._pluginCartSequence;
      const alive = () => token === this._pluginCartSequence && this.cartUpsell?.source === 'plugin';
      if (!this.isChatOpen && typeof this.toggleChat === 'function') {
        await this.toggleChat();
      }
      if (!alive()) return false;
      // Prefer drawer already opened on pin; reinforce briefly if needed (never Assis popup).
      const alreadyOpen = this.cartFocusOn || (typeof this.cartDrawerIsOpen === 'function' && this.cartDrawerIsOpen());
      this.openPluginCartFocusNow();
      if (!alreadyOpen) {
        if (!await this.waitPluginCartStep(220)) return false;
        this.openStoreCartDrawer();
      }
      return true;
    },
    stopCartUpsellTyping() {
      if (this._cartUpsellTypeTimer) {
        clearInterval(this._cartUpsellTypeTimer);
        clearTimeout(this._cartUpsellTypeTimer);
        this._cartUpsellTypeTimer = null;
      }
    },
    placeCheckoutAfterAssistant() {
      this.tryShowCartUpsellUnderReply();
    },
    cartUpsellAssistantReply() {
      const messages = this.chatMessages || [];
      const usableAi = (message) => {
        if (!message || message.isContactSubmission || message.proactiveIdle) return false;
        const sender = String(message?.sender || '').toLowerCase();
        if (sender !== 'ai' && sender !== 'assis') return false;
        const text = String(message.message || '').trim();
        if (!text) return null;
        // Do not wait for the full typewriter / stream — bag can sit under the in-flight AI.
        return true;
      };
      let cartIndex = -1;
      for (let i = messages.length - 1; i >= 0; i -= 1) {
        if (messages[i]?.isCartAction) {
          cartIndex = i;
          break;
        }
      }
      if (cartIndex >= 0) {
        // הסל שלך must sit under the AI that comes AFTER the pin (button withAi path).
        for (let i = messages.length - 1; i > cartIndex; i -= 1) {
          const message = messages[i];
          const ok = usableAi(message);
          if (ok === null) return null;
          if (ok) return message;
        }
        // Button pin owns AI → keep waiting; never anchor under an older AI above the pin.
        if (this._cartUpsellNeedAiAfterPin) return null;
        // Chat cartActions race: pin landed after the AI confirm — use AI just above the pin.
        for (let i = cartIndex - 1; i >= 0; i -= 1) {
          const message = messages[i];
          if (!message || message.isContactSubmission) continue;
          if (String(message.sender || '').toLowerCase() === 'client' && !message.isCartAction) break;
          const ok = usableAi(message);
          if (ok === null) return null;
          if (ok) return message;
        }
      }
      if (this._cartUpsellNeedAiAfterPin) return null;
      // No cart-action line yet (AI confirm arrived first, or add-by-id) — use latest AI reply.
      for (let i = messages.length - 1; i >= 0; i -= 1) {
        const message = messages[i];
        if (!message || message.isContactSubmission) continue;
        if (String(message.sender || '').toLowerCase() === 'client') break;
        const ok = usableAi(message);
        if (ok === null) return null;
        if (ok) return message;
      }
      return null;
    },
    async tryShowCartUpsellUnderReply() {
      if (!this._cartUpsellAwaitReply || !this._cartUpsellReplyReady) return;
      if (this._pluginCartChoreographyRunning) return;
      const message = this.cartUpsellAssistantReply();
      if (!message) {
        // AI bubble / cart-action race — retry instead of getting stuck with await=true.
        if (this._cartUpsellRetryTimer) return;
        this._cartUpsellRetryTimer = window.setTimeout(() => {
          this._cartUpsellRetryTimer = null;
          this.tryShowCartUpsellUnderReply();
        }, 120);
        return;
      }
      if (this._cartUpsellRetryTimer) {
        clearTimeout(this._cartUpsellRetryTimer);
        this._cartUpsellRetryTimer = null;
      }
      this._cartUpsellAwaitReply = false;
      this._cartUpsellNeedAiAfterPin = false;
      this._cartUpsellReplyMessage = null;
      await this.runPluginCartAddChoreography(message);
    },
    /** Always run the add choreography, including when the item was already in the bag. */
    ensurePluginCartAddMoment(product) {
      if (!product || this._pluginCartChoreographyRunning) return;
      if (this._cartUpsellAwaitReply || this.cartUpsellAwaiting) {
        if (this._cartUpsellAwaitReply && this._cartUpsellReplyReady) this.tryShowCartUpsellUnderReply();
        return;
      }
      // First bag still live: still run present so a later add can stamp slim checkout.
      if (this.cartUpsell?.source === 'plugin' && !this.willStampSlimCheckoutMoment()) {
        return;
      }
      this.presentCartUpsell(product, 'plugin');
    },
    /**
     * After AI reply (drawer+dim already opened on pin):
     * 1) reinforce store drawer briefly
     * 2) הסל שלך under the AI (slim on 2nd add)
     * 3) under-bag content always present; park at bag (קרא עוד = optional jump)
     */
    countCartActionPins() {
      const messages = this.chatMessages || [];
      let pins = 0;
      for (const item of messages) {
        if (item?.isCartAction) {
          pins += 1;
          continue;
        }
        if (typeof this.isCartActionMessage === 'function' && this.isCartActionMessage(item)) {
          pins += 1;
        }
      }
      return pins;
    },
    willStampSlimCheckoutMoment() {
      // Any prior bag card (full or slim) → later adds are compact checkout only.
      if ((this.chatMessages || []).some((item) => (
        item?.checkoutMoment && !item.checkoutMoment.quiet
      ))) {
        return true;
      }
      // Fallback when the first bag never stamped (e.g. older pre-order skip): 2nd+ pin.
      return this.countCartActionPins() >= 2;
    },
    async runPluginCartAddChoreography(message) {
      if (this._pluginCartChoreographyRunning) return;
      this._pluginCartChoreographyRunning = true;
      this._cartUpsellAwaitReply = false;
      this.clearCartChoreographyTimers();
      if (typeof this.clearIdleChatNudge === 'function') this.clearIdleChatNudge();
      const slimAdd = this.willStampSlimCheckoutMoment();
      try {
        const keys = typeof this.messageAnchorKeys === 'function' ? this.messageAnchorKeys(message) : [];
        if (keys.length) this.checkoutChatAnchorId = keys[0];
        this.cartUpsellHold = true;
        this.cartUpsellTyped = '';
        this.cartUpsellCardsReady = false;
        this.stopCartUpsellTyping();
        if (typeof this.$nextTick === 'function') await this.$nextTick();
        // First add only: nudge toward the new turn. Later adds must not jump up to the first bag.
        if (!slimAdd && typeof this.scrollToBottom === 'function') this.scrollToBottom();

        await this.playPluginCartSequence();
        if (this.cartUpsell?.source !== 'plugin') return;
        // Stamp הסל שלך immediately after drawer focus — no extra beat before the bag card.
        if (typeof this.$nextTick === 'function') await this.$nextTick();

        this.stampCheckoutMoment('');
        this.cartUpsellHold = false;
        await this.revealCartUpsellBelowCheckout(slimAdd);
      } finally {
        this._pluginCartChoreographyRunning = false;
        this.cartUpsellHold = false;
      }
    },
    async revealCartUpsellBelowCheckout(slimAdd = false) {
      if (typeof this.$nextTick === 'function') await this.$nextTick();
      if (this.cartUpsell?.source !== 'plugin') return;
      const anchor = (this.chatMessages || []).find((item) => (
        typeof this.messageAnchorKeys === 'function'
        && this.messageAnchorKeys(item).includes(this.checkoutChatAnchorId)
      ));
      // Layer 5 slim: stay at the bottom with the new compact bag — never scroll up to the first card.
      // slimAdd is captured before stamp so a failed re-anchor cannot re-open full reco.
      if (slimAdd || anchor?.checkoutMoment?.slim) {
        if (typeof this.scrollToBottom === 'function') this.scrollToBottom('smooth');
        if (typeof this.armIdleChatNudge === 'function') this.armIdleChatNudge();
        return;
      }
      // First full bag: under-bag content stays in the DOM, but auto-scroll MUST stop at
      // the checkout card. Never auto-invoke scrollToCartUpsell / קרא עוד — only offer it.
      this.cartUpsellMoreOpened = false;
      this.cartUpsellMoreReady = false;
      this._cartUpsellMoreWatch = false;
      if (!this._cartUpsellCheckoutScrolled && typeof this.scrollCheckoutCardIntoView === 'function') {
        this._cartUpsellCheckoutScrolled = true;
        await this.scrollCheckoutCardIntoView();
      }
      this.cartUpsellIntro = '';
      this.cartUpsellIntroReady = true;
      this._cartUpsellIntroPromise = null;
      this.applyCartUpsellIntro('');
      this.openCheckoutRecoCards();
      if (typeof this.$nextTick === 'function') await this.$nextTick();
      // Re-park after cards mount so growing content cannot pull the viewport down.
      this.cartUpsellMoreOpened = false;
      if (typeof this.scrollCheckoutCardIntoView === 'function') {
        await this.scrollCheckoutCardIntoView();
      }
      this._cartUpsellMoreDue = true;
      this.showCartUpsellMoreIfDue();
      if (typeof this.armIdleChatNudge === 'function') this.armIdleChatNudge();
    },
    async releaseCartUpsellWithoutReply() {
      if (!this._cartUpsellAwaitReply) return;
      if (this._pluginCartChoreographyRunning) return;
      const reply = this.cartUpsellAssistantReply();
      if (reply) {
        await this.tryShowCartUpsellUnderReply();
        return;
      }
      const cart = [...(this.chatMessages || [])].reverse().find((item) => item?.isCartAction);
      if (!cart || !this._cartUpsellReplyReady) {
        this._cartUpsellAwaitReply = false;
        this.cartUpsellHold = false;
        return;
      }
      this._cartUpsellAwaitReply = false;
      await this.runPluginCartAddChoreography(cart);
    },
    stampCheckoutMoment(lead) {
      const id = this.checkoutChatAnchorId;
      const message = (this.chatMessages || []).find((item) => (
        typeof this.messageAnchorKeys === 'function' && this.messageAnchorKeys(item).includes(id)
      ));
      if (!message) return;
      const snap = this.checkoutChatSnapshot || {};
      const hadPriorCheckout = (this.chatMessages || []).some((item) => (
        item?.checkoutMoment
        && item !== message
        && !item.checkoutMoment.quiet
      ));
      // Layer 5: second add → compact bag card only (no full reco block again).
      if (hadPriorCheckout || this.countCartActionPins() >= 2) {
        // Never reuse / re-open the first full bag bubble — always slim on this turn.
        message.checkoutMoment = {
          lead: '',
          title: String(this.cartUpsell?.title || ''),
          lines: Array.isArray(snap.lines) ? snap.lines : [],
          moreCount: snap.moreCount || 0,
          names: snap.names || '',
          extraCount: snap.extraCount || 0,
          extraNames: Array.isArray(snap.extraNames) ? snap.extraNames : [],
          price: snap.price || '',
          suggestions: [],
          intro: '',
          revealed: true,
          slim: true,
        };
        // Slim 2nd-add: keep AI suggested-reply chips under the compact checkout.
        if (typeof this.scheduleFollowUpReveal === 'function') {
          this.scheduleFollowUpReveal(message, { force: true });
        }
        if (typeof this.schedulePersistChatSession === 'function') this.schedulePersistChatSession();
        return;
      }
      if (message.checkoutMoment) return;
      message.checkoutMoment = {
        lead: lead === '' ? '' : (this.cartUpsellLeadText || this.cartUpsellLeadFallback()),
        title: String(this.cartUpsell?.title || ''),
        lines: Array.isArray(snap.lines) ? snap.lines : [],
        moreCount: snap.moreCount || 0,
        names: snap.names || '',
        extraCount: snap.extraCount || 0,
        extraNames: Array.isArray(snap.extraNames) ? snap.extraNames : [],
        price: snap.price || '',
        suggestions: (this.cartUpsell?.suggestions || []).slice(0, 3),
        intro: this.cartUpsellIntro || '',
        revealed: true,
        slim: false,
      };
      // Full bag owns the next step — no suggested-reply chips.
      message.suggestedReplies = [];
      if (typeof this.schedulePersistChatSession === 'function') this.schedulePersistChatSession();
    },
    cartUpsellIntroFallback() {
      // Fixed reco intros ("הולך יפה עם…") are intentionally unused.
      return '';
    },
    applyCartUpsellIntro(text) {
      const clean = String(text || '').trim();
      const id = this.checkoutChatAnchorId;
      const message = (this.chatMessages || []).find((item) => (
        typeof this.messageAnchorKeys === 'function' && this.messageAnchorKeys(item).includes(id)
      ));
      if (message?.checkoutMoment) message.checkoutMoment = { ...message.checkoutMoment, intro: clean };
      if (typeof this.schedulePersistChatSession === 'function') this.schedulePersistChatSession();
    },
    cartUpsellLeadFallback(title) {
      const name = String(title || this.cartUpsell?.title || '').trim();
      if (!name) return '';
      if (this.language === 'he') return `${name} נכנס לסל. אפשר לסגור את ההזמנה מתי שנוח.`;
      return `${name} is in the bag. You can finish the order whenever you like.`;
    },
    requestCartUpsellIntro() {
      // No reco intro line (fixed or AI) — fan sits under the bag without a lead-in.
      this._cartUpsellIntroToken = (this._cartUpsellIntroToken || 0) + 1;
      return Promise.resolve('');
    },
    freezeCheckoutChatSnapshot() {
      const lines = Array.isArray(this.shopifyCheckoutPreviewLines) ? this.shopifyCheckoutPreviewLines : [];
      this.checkoutChatSnapshot = {
        lines: lines.map((line) => ({
          key: line.key,
          title: line.title,
          image: line.image,
        })),
        moreCount: this.shopifyCheckoutMoreCount || 0,
        names: this.shopifyCheckoutItemNames || '',
        extraCount: this.shopifyCheckoutExtraCount || 0,
        extraNames: Array.isArray(this.shopifyCheckoutExtraNames) ? this.shopifyCheckoutExtraNames.slice() : [],
        price: this.shopifyCartFormattedTotal || '',
      };
    },
    cartUpsellPrice(item) {
      const cents = Number(item?.priceCents) || 0;
      if (!cents) return '';
      const value = cents / 100;
      const currency = String(
        this.shopifyCartCurrency
        || item?.currency
        || item?.product?.currency
        || (this.language === 'he' ? 'ILS' : '')
        || '',
      ).trim().toUpperCase();
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
      if (typeof this.formatShopifyCartMoney === 'function') return this.formatShopifyCartMoney(cents);
      return value.toLocaleString(this.language === 'he' ? 'he-IL' : 'en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },
    cartUpsellDiscountLabel(item) {
      const current = Number(item?.priceCents) || 0;
      const compare = Number(item?.compareCents) || 0;
      if (!current || compare <= current) return '';
      const percent = Math.round((1 - current / compare) * 100);
      if (percent < 1) return '';
      return this.language === 'he' ? `${percent}% הנחה` : `${percent}% off`;
    },
    openCartUpsellFromSite(item) {
      // Site sheet thumb (not +): open the in-chat product sheet — never the store PDP.
      this.openCartUpsellProduct(item, false);
    },
    openCartUpsellProduct(item, visitPage = false) {
      const raw = item?.product;
      const title = String(raw?.title || item?.title || '').trim();
      const handle = String(raw?.handle || '').trim();
      if (!title && !handle) return;
      const product = (raw?.title || raw?.handle) ? raw : {
        id: item?.id,
        title,
        handle,
        url: item?.url || '',
        image: item?.image || '',
        images: item?.image ? [item.image] : [],
        variants: [],
      };
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const selectedId = String(item?.variantId || '');
      const ordered = selectedId
        ? [...variants].sort((left, right) => {
          if (String(left?.id) === selectedId) return -1;
          if (String(right?.id) === selectedId) return 1;
          return 0;
        })
        : variants;
      const detail = {
        ...product,
        title: product.title || title,
        url: product.url || item?.url || '',
        variants: ordered,
      };
      // visitPage is reserved for rare leave-and-resume; site upsell always keeps chat.
      const href = String(item?.url || detail.url || '').trim();
      const leaving = Boolean(visitPage && href && !sameStorePath(href));
      if (leaving) {
        try {
          sessionStorage.setItem(UPSELL_PRODUCT_OPEN_KEY, JSON.stringify({
            href,
            product: detail,
            at: Date.now(),
          }));
        } catch {
          /* private mode still navigates */
        }
        window.location.assign(href);
        return;
      }
      this.showUpsellProduct(detail);
    },
    showUpsellProduct(product) {
      const open = () => {
        if (!this.isChatOpen && typeof this.toggleChat === 'function') {
          this._pluginOpenSource = 'upsell';
          this.toggleChat();
        }
        this.$nextTick(() => {
          this._pluginProductSource = 'upsell';
          if (typeof this.openProductDetail === 'function') {
            this.openProductDetail(product, null, 0);
          }
        });
      };
      if (this.pluginMessagesFetched) {
        open();
        return;
      }
      const stop = this.$watch('pluginMessagesFetched', (ready) => {
        if (!ready) return;
        stop();
        open();
      });
    },
    resumeUpsellProductOpen() {
      let saved = null;
      try {
        saved = JSON.parse(sessionStorage.getItem(UPSELL_PRODUCT_OPEN_KEY) || 'null');
      } catch {
        saved = null;
      }
      if (!saved?.product) return;
      sessionStorage.removeItem(UPSELL_PRODUCT_OPEN_KEY);
      if (Date.now() - Number(saved.at || 0) > 20000) return;
      this.showUpsellProduct(saved.product);
    },
    mounted() {
      this.bindInstantCartDrawer();
      this.resumeUpsellProductOpen();
    },
    bindInstantCartDrawer() {
      // Intentionally no-op: do not auto-open the store/Assis cart popup on add-to-cart clicks.
      this._instantCartDrawerBound = true;
    },
    wooMiniCartIsOpen() {
      const drawer = document.querySelector('.wc-block-mini-cart__drawer');
      if (drawer?.getAttribute('aria-hidden') === 'true') return false;
      const root = document.querySelector('.wc-block-mini-cart');
      const opened = (node) => Boolean(node && (
        node.classList.contains('is-open')
        || node.getAttribute('aria-hidden') === 'false'
      ));
      return opened(drawer) || opened(root);
    },
    /** Opt-in via Plugin Settings → Open cart drawer after add (`open_cart_drawer_on_site_add`). */
    shouldOpenCartDrawerOnSiteAdd() {
      return this.proactiveTriggers?.open_cart_drawer_on_site_add === true;
    },
    maybeOpenCartDrawerOnSiteAdd() {
      if (!this.shouldOpenCartDrawerOnSiteAdd()) return;
      if (typeof this.openStoreCartDrawer === 'function') this.openStoreCartDrawer();
    },
    openStoreCartDrawer() {
      if (this.tryOpenStoreCartDrawer()) return;
      if (this._cartDrawerClickAt) return;
      window.setTimeout(() => this.tryOpenStoreCartDrawer(), 80);
    },
    tryOpenStoreCartDrawer() {
      if (this.wooMiniCartIsOpen()) return true;
      const now = Date.now();
      if (this._cartDrawerClickAt && now - this._cartDrawerClickAt < 600) return false;
      const miniButton = document.querySelector('button.wc-block-mini-cart__button');
      if (miniButton) {
        this._cartDrawerClickAt = now;
        miniButton.click();
        return this.wooMiniCartIsOpen();
      }
      const drawer = document.querySelector(
        'cart-drawer, cart-drawer-component, cart-notification, #CartDrawer, #cart-drawer, #sidebar-cart, .cart-drawer, [data-cart-drawer], dialog[id*="cart" i]'
      );
      const dialog = drawer?.tagName === 'DIALOG' ? drawer : drawer?.querySelector?.('dialog');
      try {
        if (typeof drawer?.showDialog === 'function') drawer.showDialog();
        else if (typeof drawer?.open === 'function') drawer.open();
        else if (typeof drawer?.show === 'function') drawer.show();
        if (typeof dialog?.showModal === 'function' && !dialog.open) dialog.showModal();
      } catch {
        /* The theme rejected a second open. */
      }
      const trigger = document.querySelector(
        'button[aria-controls="CartDrawer"], button[aria-controls="cart-drawer"], button[aria-controls*="cart-drawer"], [data-cart-drawer-toggle], [data-action="open-cart"], button.header__icon--cart, cart-icon button'
      );
      if (drawer) {
        drawer.open = true;
        drawer.setAttribute('open', '');
        drawer.classList.add('active', 'is-open', 'is-visible', 'animate');
        document.body.classList.add('overflow-hidden');
      } else if (trigger) {
        trigger.click();
      }
      document.dispatchEvent(new CustomEvent('cart:open', { bubbles: true }));
      document.dispatchEvent(new CustomEvent('theme:cart:open', { bubbles: true }));
      if (window.jQuery) window.jQuery(document.body).trigger('added_to_cart');
      return Boolean(drawer || trigger);
    },
    async loadCartUpsellSuggestions(product) {
      const rawId = product?.product_id || product?.id;
      const id = typeof this.shopifyNumericId === 'function'
        ? this.shopifyNumericId(rawId)
        : String(rawId || '').replace(/\D/g, '');
      if (!id) return [];
      const cache = this._cartUpsellCache || (this._cartUpsellCache = {});
      if (cache[id]?.length) return cache[id];
      let suggestions = [];
      try {
        if (typeof this.isWooCommerceWebsite === 'function' && this.isWooCommerceWebsite()) {
          suggestions = await this.loadWooCartUpsellSuggestions(id);
        } else {
          suggestions = await this.loadShopifyCartUpsellSuggestions(id);
        }
      } catch {
        suggestions = [];
      }
      const own = String(id);
      suggestions = suggestions.filter((item) => String(item.id) !== own).slice(0, 6);
      if (suggestions.length) cache[id] = suggestions;
      return suggestions;
    },
    findAssisCatalogProduct(rawId, handle = '') {
      const id = typeof this.shopifyNumericId === 'function'
        ? this.shopifyNumericId(rawId)
        : String(rawId || '').replace(/\D/g, '');
      const handleKey = String(handle || '').trim().toLowerCase();
      if (!id && !handleKey) return null;
      const pools = [];
      (Array.isArray(this.highlightedProducts) ? this.highlightedProducts : []).forEach((entry) => {
        pools.push(entry?.product && typeof entry.product === 'object' ? { ...entry, ...entry.product } : entry);
      });
      (Array.isArray(this.chatMessages) ? this.chatMessages : []).forEach((message) => {
        (Array.isArray(message?.products) ? message.products : []).forEach((product) => {
          pools.push(typeof this.unwrapProduct === 'function' ? this.unwrapProduct(product) : product);
        });
      });
      for (const product of pools) {
        if (!product) continue;
        const productId = typeof this.shopifyNumericId === 'function'
          ? this.shopifyNumericId(product.id || product.product_id)
          : String(product.id || product.product_id || '').replace(/\D/g, '');
        const productHandle = String(product.handle || '').trim().toLowerCase();
        if ((id && productId && id === productId) || (handleKey && productHandle && handleKey === productHandle)) {
          return product;
        }
      }
      return null;
    },
    mapShopifyRecommendationProducts(products) {
      return (Array.isArray(products) ? products : []).map((item) => {
        const assis = this.findAssisCatalogProduct?.(item?.id, item?.handle);
        const merged = assis
          ? {
            ...item,
            isPreOrder: assis.isPreOrder ?? assis.is_pre_order ?? item?.isPreOrder,
            variants: Array.isArray(item?.variants) && Array.isArray(assis.variants)
              ? item.variants.map((variant) => {
                const match = assis.variants.find((entry) => (
                  String(entry?.id) === String(variant?.id)
                  || (typeof this.shopifyNumericId === 'function'
                    && this.shopifyNumericId(entry?.id) === this.shopifyNumericId(variant?.id))
                ));
                if (!match) return variant;
                return {
                  ...variant,
                  isPreOrder: match.isPreOrder ?? match.is_pre_order ?? variant?.isPreOrder,
                };
              })
              : (item?.variants || assis.variants),
          }
          : item;
        const variant = Array.isArray(merged?.variants) ? merged.variants[0] : null;
        const isPreOrder = suggestionIsPreOrder(merged, variant);
        return {
          id: merged?.id,
          variantId: variant?.id || merged?.id,
          title: decodeHtml(merged?.title),
          image: suggestionImage(merged),
          url: suggestionUrl(merged),
          priceCents: suggestionPriceCents(merged?.price),
          compareCents: suggestionCompareCents(
            suggestionPriceCents(merged?.price),
            variant?.compare_at_price ?? merged?.compare_at_price,
          ),
          choices: suggestionChoices(merged?.variants),
          product: suggestionStoreProduct(merged),
          ...(isPreOrder ? { isPreOrder: true } : {}),
        };
      }).filter((item) => item.title);
    },
    async fetchShopifyRecommendations(productId, intent) {
      const root = typeof this.shopifyStoreRoot === 'function' ? this.shopifyStoreRoot() : '/';
      const response = await fetch(
        `${root}recommendations/products.json?product_id=${encodeURIComponent(productId)}&limit=6&intent=${encodeURIComponent(intent)}`,
        { credentials: 'same-origin', headers: { Accept: 'application/json' } },
      );
      if (!response.ok) return [];
      const data = await response.json();
      return this.mapShopifyRecommendationProducts(data?.products);
    },
    async loadShopifyCartUpsellSuggestions(productId) {
      try {
        const related = await this.fetchShopifyRecommendations(productId, 'related');
        if (related.length) return related;
      } catch {
        /* Fall through to complementary / bestsellers. */
      }
      try {
        const complementary = await this.fetchShopifyRecommendations(productId, 'complementary');
        if (complementary.length) return complementary;
      } catch {
        /* Fall through to bestsellers. */
      }
      return this.loadHighlightedBestSellerSuggestions(productId, 'shopify');
    },
    wooLinkedProductIds(product) {
      const bags = [product?.related_ids, product?.upsell_ids, product?.cross_sell_ids];
      const seen = new Set();
      const ids = [];
      bags.forEach((bag) => {
        (Array.isArray(bag) ? bag : []).forEach((raw) => {
          const id = String(raw || '').replace(/\D/g, '');
          if (!id || seen.has(id)) return;
          seen.add(id);
          ids.push(id);
        });
      });
      return ids;
    },
    async loadWooCartUpsellSuggestions(productId) {
      if (typeof this.wooStore !== 'function') return [];
      let product = null;
      try {
        product = await this.wooStore(`/products/${encodeURIComponent(productId)}`);
      } catch {
        product = null;
      }
      const parentId = Number(product?.parent) || 0;
      if (parentId && !this.wooLinkedProductIds(product).length) {
        try {
          const parent = await this.wooStore(`/products/${encodeURIComponent(parentId)}`);
          if (parent) product = parent;
        } catch {
          /* Variation pages often have no linked list of their own. */
        }
      }
      const own = String(product?.id || parentId || productId);
      const linkedIds = this.wooLinkedProductIds(product)
        .filter((id) => id !== own)
        .slice(0, 6);
      let list = [];
      if (linkedIds.length) {
        try {
          list = await this.wooStore(`/products?include=${linkedIds.join(',')}&per_page=${linkedIds.length}`);
        } catch {
          list = [];
        }
      }
      // Store API often omits related_ids on the product — use the related= query instead.
      if (!(Array.isArray(list) && list.length)) {
        try {
          list = await this.wooStore(
            `/products?related=${encodeURIComponent(own)}&exclude=${encodeURIComponent(own)}&per_page=6`,
          );
        } catch {
          list = [];
        }
      }
      const mapped = await this.withWooSuggestionChoices(list, own);
      if (mapped.length) return mapped;
      return this.loadWooBestSellerSuggestions(own);
    },
    async loadHighlightedBestSellerSuggestions(own, channel) {
      const ownId = String(own || '');
      const seen = new Set();
      const items = (Array.isArray(this.highlightedProducts) ? this.highlightedProducts : [])
        .map((item) => {
          const product = item?.product && typeof item.product === 'object' ? { ...item, ...item.product } : item;
          const raw = product?.id || product?.product_id;
          const id = channel === 'woo' && typeof this.wooNumericId === 'function'
            ? this.wooNumericId(raw)
            : (typeof this.shopifyNumericId === 'function' ? this.shopifyNumericId(raw) : String(raw || '').replace(/\D/g, ''));
          if (!id || id === ownId || seen.has(id)) return null;
          seen.add(id);
          const variant = Array.isArray(product?.variants) ? product.variants[0] : null;
          // Assis catalog money is major units (same as home product cards) — not Shopify cents.
          const priceCents = suggestionPriceCents(
            variant?.price ?? product?.prices?.[0] ?? product?.price
              ?? (product?.priceCents != null ? Number(product.priceCents) / 100 : null),
            'major',
          );
          const title = decodeHtml(product?.title || product?.name);
          if (!title) return null;
          const isPreOrder = suggestionIsPreOrder(product, variant);
          return {
            id,
            variantId: variant?.id || product?.variant_id || product?.variantId || id,
            title,
            image: suggestionImage(product),
            url: suggestionUrl(product),
            priceCents,
            compareCents: suggestionCompareCents(
              priceCents,
              variant?.compare_at_price ?? product?.compare_at_price
                ?? (product?.compareCents != null ? Number(product.compareCents) / 100 : null),
              'major',
            ),
            choices: suggestionChoices(product?.variants, 'major'),
            product: suggestionStoreProduct(product),
            bestSeller: true,
            currency: String(product?.currency || '').trim(),
            ...(isPreOrder ? { isPreOrder: true } : {}),
          };
        })
        .filter(Boolean)
        .slice(0, 6);
      return items;
    },
    async loadWooBestSellerSuggestions(own) {
      const fromAssis = await this.loadHighlightedBestSellerSuggestions(own, 'woo');
      if (fromAssis.length) {
        // Prefer live Store prices/images when Assis ids resolve on the shop.
        const ids = fromAssis.map((item) => String(item.id)).filter(Boolean);
        if (ids.length && typeof this.wooStore === 'function') {
          try {
            const list = await this.wooStore(`/products?include=${ids.join(',')}&per_page=${ids.length}`);
            const mapped = await this.withWooSuggestionChoices(list, own);
            if (mapped.length) return mapped.map((item) => ({ ...item, bestSeller: true }));
          } catch {
            /* Keep Assis-mapped cards below. */
          }
        }
        return fromAssis;
      }
      if (typeof this.wooStore !== 'function') return [];
      try {
        const list = await this.wooStore(
          `/products?orderby=popularity&order=desc&exclude=${encodeURIComponent(own)}&per_page=8`,
        );
        const mapped = await this.withWooSuggestionChoices(list, own);
        return mapped.slice(0, 6).map((item) => ({ ...item, bestSeller: true }));
      } catch {
        return [];
      }
    },
    async withWooSuggestionChoices(list, own) {
      const raws = (Array.isArray(list) ? list : []).filter((item) => String(item?.name || '').trim() && String(item?.id) !== String(own));
      return Promise.all(raws.map(async (raw) => {
        const item = mapWooSuggestion(raw);
        const variable = raw?.type === 'variable' || (Array.isArray(raw?.variations) && raw.variations.length > 1);
        if (!variable) return item;
        let variations = [];
        try {
          variations = await this.wooStore(`/products?type=variation&parent=${encodeURIComponent(raw.id)}&per_page=20`);
        } catch {
          variations = [];
        }
        const choices = suggestionChoices(variations);
        if (choices.length < 2) return item;
        const isPreOrder = Boolean(item.isPreOrder || choices.some((choice) => choice.isPreOrder));
        return {
          ...item,
          variantId: choices[0].id,
          choices,
          ...(isPreOrder ? { isPreOrder: true } : {}),
          product: {
            ...(item.product || {}),
            ...(isPreOrder ? { isPreOrder: true } : {}),
            variants: choices.map((choice) => ({
              id: choice.id,
              title: choice.label,
              price: choice.priceCents,
              available: choice.available,
              ...(choice.isPreOrder ? { isPreOrder: true } : {}),
              featured_image: choice.image ? { src: choice.image } : null,
            })),
          },
        };
      }));
    },
    async presentCartUpsell(product, source) {
      const title = decodeHtml(product?.title || product?.name);
      if (!title) {
        this.cartUpsellHold = false;
        return;
      }
      if (source === 'site' && this.proactiveTriggers?.cart_upsell === false) {
        this.cartUpsellHold = false;
        // Upsell bubble off — drawer still follows the site-add setting.
        return;
      }
      if (source !== 'plugin' && this.isChatOpen && this.cartUpsell?.source === 'plugin') return;
      // Chat add often fires twice (client heuristic + AI cartActions). One bag card only.
      if (source === 'plugin' && (this.cartUpsellAwaiting || this._cartUpsellAwaitReply || this._pluginCartChoreographyRunning)) {
        if (this._cartUpsellAwaitReply && this._cartUpsellReplyReady && !this._pluginCartChoreographyRunning) {
          this.tryShowCartUpsellUnderReply();
        }
        this.cartUpsellHold = false;
        return;
      }
      const key = source === 'plugin'
        ? `plugin:${title}`
        : String(product?.product_id || product?.id || title);
      const now = Date.now();
      const recent = this._cartUpsellStamp;
      const windowMs = source === 'plugin' ? 8000 : 2000;
      // Detect before dedupe — 2nd+ plugin add must still stamp slim under the new AI.
      const slimAdd = source === 'plugin' && this.willStampSlimCheckoutMoment();
      if (
        !slimAdd
        && recent
        && now - recent.at < windowMs
        && (recent.key === key || (source === 'site' && recent.source === 'plugin'))
      ) {
        if (!this.cartUpsellAwaiting && !(this.cartUpsell?.source === 'plugin' && this.cartUpsellLeadText && this.cartUpsellTyped !== this.cartUpsellLeadText)) {
          this.cartUpsellHold = false;
        }
        return;
      }
      this._cartUpsellStamp = { key, source, at: now };
      if (source === 'plugin') {
        this.clearCartChoreographyTimers();
        this._pluginCartChoreographyRunning = false;
        this.checkoutChatAnchorId = null;
        this.cartUpsellLeadText = '';
        this._cartUpsellLeadPromise = null;
        // Wait for AI reply after the pin — הסל שלך / slim is stamped under that AI bubble.
        // Always true on every plugin add (not only when null): after the 1st add this flag is
        // false, and leaving it false reuses the old AI bubble (full bag) instead of slim.
        this._cartUpsellAwaitReply = true;
        this._cartUpsellReplyReady = false;
        this._cartUpsellReplyMessage = null;
        this._cartUpsellNeedAiAfterPin = true;
        this.cartUpsellCardsReady = false;
        this.cartUpsellMoreReady = false;
        this.cartUpsellMoreOpened = false;
        if (slimAdd) {
          this.clearCartUpsellMoreTimer();
          this._cartUpsellMoreDue = false;
          this._cartUpsellMoreWatch = false;
        } else {
          this.armCartUpsellMore();
        }
      }
      const image = suggestionImage(product);
      this.cartUpsellAwaiting = true;
      if (source === 'plugin') this.cartUpsellHold = true;
      else {
        this.stopCartUpsellTyping();
        this.cartUpsellTyped = '';
        this.cartUpsellHold = false;
        // Reserve thumb slots immediately so the site bubble does not grow after fetch.
        this.cartUpsell = { source, title, image, suggestions: [] };
      }
      let suggestions = [];
      try {
        // Slim 2nd-add never shows reco cards — skip the fetch.
        suggestions = (source === 'plugin' && slimAdd)
          ? []
          : await this.loadCartUpsellSuggestions(product);
      } finally {
        this.cartUpsellAwaiting = false;
      }
      if (source === 'plugin') this.freezeCheckoutChatSnapshot();
      this.cartUpsell = { source, title, image, suggestions };
      this.cartUpsellIntro = '';
      this.cartUpsellIntroReady = false;
      this._cartUpsellIntroPromise = source === 'plugin'
        ? this.requestCartUpsellIntro(suggestions.slice(0, 3))
        : null;
      if (source === 'plugin') {
        this.checkoutRestored = false;
        this.clearSiteUpsellReturn();
        this.cartUpsellTyped = '';
        this.cartUpsellHeadingTyped = '';
        this.cartUpsellCardsReady = false;
        this._cartUpsellReplyReady = true;
        // Pin → AI → then drawer + הסל שלך (AI stays above the bag card).
        this.tryShowCartUpsellUnderReply();
        return;
      }
      this.stopCartUpsellTyping();
      this.cartUpsellTyped = '';
      this.cartUpsellHold = false;
      this.scheduleSiteUpsellReturn();
      this.armSiteUpsellAutoRevert();
    },
    async addCartUpsellSuggestion(item) {
      if (!item || this._cartUpsellAdding) return;
      this._cartUpsellAdding = true;
      try {
        // Prefer the variant the shopper picked on the card (itemForAdd), not the first
        // "available" choice — pre-order sizes are often flagged unavailable in Store JSON.
        const pickedId = item.variantId || item.selectedVariantId || '';
        const choices = Array.isArray(item.choices) ? item.choices : [];
        const choice = choices.find((entry) => String(entry?.id || '') === String(pickedId))
          || choices.find((entry) => entry?.available !== false && entry?.id)
          || choices.find((entry) => entry?.id)
          || null;
        const rawId = choice?.id || pickedId || item.id;
        const variantId = (typeof this.shopifyNumericId === 'function'
          ? this.shopifyNumericId(rawId)
          : null) || rawId;
        if (!variantId) throw new Error('Could not resolve a product to add');

        const unit = (Number(choice?.priceCents || item.priceCents) || 0) / 100;
        const fromStore = item.product && typeof item.product === 'object' ? item.product : {};
        const storeVariant = (Array.isArray(fromStore.variants) ? fromStore.variants : [])
          .find((variant) => String(variant?.id) === String(choice?.id || rawId)
            || (typeof this.shopifyNumericId === 'function'
              && this.shopifyNumericId(variant?.id) === this.shopifyNumericId(rawId)));
        const selectedVariant = storeVariant || (choice ? {
          id: choice.id,
          title: choice.label,
          price: unit || undefined,
          available: choice.available !== false,
          isPreOrder: Boolean(choice.isPreOrder || fromStore.isPreOrder),
        } : null);
        const preOrder = Boolean(
          selectedVariant?.isPreOrder
          || fromStore.isPreOrder
          || fromStore.is_pre_order
          || choice?.isPreOrder
        );
        // Outside site sheet: add quietly (never open chat). Drawer follows
        // open_cart_drawer_on_site_add via noteCartAdded (store source).
        // In-chat upsell cards keep the pin + AI + bag choreography.
        const fromSite = this.cartUpsell?.source === 'site' && !this.isChatOpen;
        const addSource = fromSite ? 'store' : 'upsell';
        const payload = {
          ...fromStore,
          id: fromStore.id || item.id,
          product_id: fromStore.product_id || fromStore.id || item.id,
          title: item.title || fromStore.title,
          handle: fromStore.handle,
          image: choice?.image || item.image || fromStore.image,
          price: unit || fromStore.price,
          quantity: 1,
          variant_id: variantId,
          variantId,
          selectedVariantId: variantId,
          selectedVariantTitle: choice?.label || selectedVariant?.title || '',
          variant_title: choice?.label || selectedVariant?.title || '',
          selectedVariant,
          ...(preOrder ? { isPreOrder: true } : {}),
        };
        // Same path as chat cards / product sheet: local preview, Woo, and Shopify
        // pre-order selling_plan resolution all live in addPoweredByAssisHomeProduct.
        // (Direct cart/add.js here skipped local preview and pre-order plans.)
        if (typeof this.addPoweredByAssisHomeProduct === 'function') {
          await this.addPoweredByAssisHomeProduct(payload, addSource, { withAi: !fromSite });
        } else {
          if (typeof this.isWooCommerceWebsite === 'function' && this.isWooCommerceWebsite()) {
            await this.addWooProductToCart(variantId, 1);
          } else if (typeof this.addShopifyVariantToCart === 'function') {
            await this.addShopifyVariantToCart(variantId, 1);
          }
          this.noteCartAdded(payload, addSource, '', { withAi: !fromSite });
        }
        if (fromSite && typeof this.bumpShopifyCartBadge === 'function') {
          this.bumpShopifyCartBadge();
        }
      } catch (error) {
        if (typeof this.showShopifyActionError === 'function') this.showShopifyActionError('cart', error);
      } finally {
        this._cartUpsellAdding = false;
      }
    },
  },
};
