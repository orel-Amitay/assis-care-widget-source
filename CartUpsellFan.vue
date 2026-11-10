<template>
  <div class="cart-upsell" :class="{ 'cart-upsell--site': layout === 'site' }" :dir="dir">
    <template v-if="layout === 'site'">
      <div class="cart-upsell-sheet">
        <p v-if="matchLine || matchProduct" class="cart-upsell-match">
          <span class="cart-upsell-match-kicker">{{ matchKicker }}</span>
        </p>
        <div v-if="addedLine || matchProduct" class="cart-upsell-added">
          <img v-if="addedImage" class="cart-upsell-added-photo" :src="addedImage" alt="" />
          <span v-if="matchProduct" class="cart-upsell-added-name" dir="auto">{{ matchProduct }}</span>
          <span
            v-if="addedLine"
            class="cart-upsell-added-check"
            :aria-label="addedLine"
            :title="addedLine"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12.5 9.5 17 19 7"></path>
            </svg>
          </span>
        </div>
        <div v-if="showSiteThumbs" class="cart-upsell-thumbs" :aria-busy="loading ? 'true' : undefined">
          <div
            v-for="(item, index) in siteThumbSlots"
            :key="item ? `product-${item.id || item.title}-${index}` : `slot-${index}`"
            class="cart-upsell-thumb"
            :class="{
              'cart-upsell-thumb--skeleton': !item && loading,
              'cart-upsell-thumb--spacer': !item && !loading,
              'cart-upsell-thumb--rise': Boolean(item),
            }"
            :style="{ '--i': index }"
          >
            <template v-if="item">
              <div class="cart-upsell-thumb-frame">
                <a
                  class="cart-upsell-thumb-link"
                  :href="item.url || undefined"
                  :aria-label="item.title || undefined"
                  @click="openSuggestedProduct($event, item)"
                >
                  <img v-if="item.image" :src="item.image" alt="" />
                </a>
                <button
                  type="button"
                  class="cart-upsell-thumb-plus"
                  :aria-label="addLabel"
                  @click.stop.prevent="addSuggestedProduct($event, item)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14"></path>
                  </svg>
                </button>
              </div>
              <p v-if="item.priceLabel" class="cart-upsell-thumb-price">{{ item.priceLabel }}</p>
              <p v-else class="cart-upsell-thumb-price cart-upsell-thumb-price--spacer" aria-hidden="true">&nbsp;</p>
            </template>
            <template v-else>
              <div
                class="cart-upsell-thumb-frame"
                :class="{ 'cart-upsell-thumb-frame--skeleton': loading }"
                aria-hidden="true"
              ></div>
              <p class="cart-upsell-thumb-price cart-upsell-thumb-price--spacer" aria-hidden="true">&nbsp;</p>
            </template>
          </div>
        </div>
        <button
          type="button"
          class="cart-upsell-buy"
          @click.stop="$emit('checkout')"
        >
          <span>{{ checkoutLabel }}</span>
        </button>
      </div>
    </template>
    <div v-if="layout !== 'site' && items.length" class="cart-upsell-block">
      <p v-if="showBestSellerHeading" class="cart-upsell-heading">
        <span class="cart-upsell-badge">{{ bestSellerLabel }}</span>
      </p>
      <div class="cart-upsell-row">
        <div class="cart-upsell-fan">
          <article
            v-for="(item, index) in items"
            :key="`${item.id || item.title}-${index}`"
            class="cart-upsell-card"
            :class="{ 'cart-upsell-card--menu-open': isVariantMenuOpen(item) }"
            :style="{ '--tilt': tilts[index] || '0deg', '--i': index }"
          >
            <a
              class="cart-upsell-card-link"
              href="#"
              @click="onCardClick($event, item)"
            >
              <div class="cart-upsell-photo">
                <span v-if="!isItemPreOrder(item) && item.discountLabel" class="cart-upsell-sale">{{ item.discountLabel }}</span>
                <img v-if="shownImage(item)" :src="shownImage(item)" alt="" />
              </div>
              <span class="cart-upsell-copy">
                <p class="cart-upsell-name" dir="auto">{{ item.title }}</p>
                <p
                  v-if="shownPrice(item) || isItemPreOrder(item)"
                  class="cart-upsell-price"
                >
                  <span v-if="shownPrice(item)">{{ shownPrice(item) }}</span>
                  <span v-if="shownCompare(item)" class="cart-upsell-price-was">{{ shownCompare(item) }}</span>
                  <span
                    v-if="isItemPreOrder(item)"
                    class="cart-upsell-preorder"
                    :dir="dir"
                  >{{ dir === 'rtl' ? 'הזמנה מוקדמת' : 'Pre-order' }}</span>
                </p>
              </span>
            </a>
            <div class="cart-upsell-actions">
              <div
                v-if="variantChoices(item).length"
                class="cart-upsell-variant-wrap"
                :class="{ 'is-open': isVariantMenuOpen(item) }"
                :dir="dir"
                @click.stop
              >
                <button
                  type="button"
                  class="cart-upsell-variant-trigger"
                  :aria-label="dir === 'rtl' ? 'בחירת וריאנט' : 'Choose a variant'"
                  :aria-expanded="isVariantMenuOpen(item) ? 'true' : 'false'"
                  :dir="dir"
                  @click.stop.prevent="toggleVariantMenu(item)"
                >
                  <span class="cart-upsell-variant-label">{{ shownChoice(item)?.label || '' }}</span>
                </button>
                <div
                  v-if="isVariantMenuOpen(item)"
                  class="cart-upsell-variant-menu"
                  role="listbox"
                  @click.stop
                >
                  <button
                    v-for="choice in variantChoices(item)"
                    :key="choice.id"
                    type="button"
                    class="cart-upsell-variant-item"
                    role="option"
                    :dir="dir"
                    :aria-selected="String(choice.id) === String(pickedVariantId(item)) ? 'true' : 'false'"
                    :data-selected="String(choice.id) === String(pickedVariantId(item)) ? 'true' : null"
                    :data-unavailable="choice.available === false ? 'true' : null"
                    :disabled="choice.available === false"
                    @click.stop.prevent="selectVariantChoice(item, choice.id)"
                  >
                    <span>{{ choice.label }}</span>
                    <svg
                      v-if="String(choice.id) === String(pickedVariantId(item))"
                      class="cart-upsell-variant-check"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.6"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 12.5 9.5 18 20 6.5"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <button
                type="button"
                class="cart-upsell-add"
                :aria-label="addLabel"
                :title="addLabel"
                @click.stop="$emit('add', itemForAdd(item))"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14"></path>
                </svg>
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CartUpsellFan',
  props: {
    layout: { type: String, default: 'fan' },
    matchLine: { type: String, default: '' },
    matchProduct: { type: String, default: '' },
    addedLine: { type: String, default: '' },
    addedImage: { type: String, default: '' },
    checkoutLabel: { type: String, default: '' },
    items: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    dir: { type: String, default: 'ltr' },
    addLabel: { type: String, default: 'Add' },
    bestSellerLabel: { type: String, default: 'Best sellers' },
  },
  emits: ['add', 'checkout', 'open'],
  computed: {
    matchKicker() {
      if (this.matchProduct) {
        return this.dir === 'rtl' ? 'מוצרים שיכולים להתאים' : 'Goes nicely with';
      }
      return this.matchLine;
    },
    showBestSellerHeading() {
      return this.items.some((item) => item?.bestSeller);
    },
    // Always keep 3 slots so the bubble size stays put while products rise in.
    showSiteThumbs() {
      return this.loading || this.items.length > 0;
    },
    siteThumbSlots() {
      const slots = [];
      for (let index = 0; index < 3; index += 1) {
        slots.push(this.items[index] || null);
      }
      return slots;
    },
  },
  methods: {
    openSuggestedProduct(event, item) {
      event.preventDefault();
      this.$emit('open', item);
    },
    addSuggestedProduct(event, item) {
      event.preventDefault();
      event.stopPropagation();
      this.$emit('add', item);
    },
    onCardClick(event, item) {
      event.preventDefault();
      this.$emit('open', this.itemForAdd(item));
    },
    variantChoices(item) {
      return Array.isArray(item?.choices) ? item.choices : [];
    },
    itemKey(item) {
      return String(item?.id || item?.title || '');
    },
    pickedVariantId(item) {
      const picked = this.picked[this.itemKey(item)];
      if (picked) return picked;
      return this.variantChoices(item)[0]?.id || item?.variantId || '';
    },
    pickVariant(item, id) {
      this.picked = { ...this.picked, [this.itemKey(item)]: id };
    },
    isVariantMenuOpen(item) {
      return this.openMenuKey === this.itemKey(item);
    },
    toggleVariantMenu(item) {
      const key = this.itemKey(item);
      this.openMenuKey = this.openMenuKey === key ? '' : key;
    },
    selectVariantChoice(item, id) {
      if (id == null || id === '') return;
      this.pickVariant(item, id);
      this.openMenuKey = '';
    },
    onDocumentPointerDown(event) {
      if (!this.openMenuKey) return;
      const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      const inside = path.some((node) => node?.classList?.contains?.('cart-upsell-variant-wrap'));
      if (!inside) this.openMenuKey = '';
    },
    shownChoice(item) {
      const id = String(this.pickedVariantId(item) || '');
      return this.variantChoices(item).find((choice) => String(choice.id) === id) || null;
    },
    isItemPreOrder(item) {
      const choice = this.shownChoice(item);
      if (choice && (choice.isPreOrder === true || choice.isPreOrder === 'true')) return true;
      if (item?.isPreOrder === true || item?.isPreOrder === 'true') return true;
      if (item?.product?.isPreOrder === true || item?.product?.isPreOrder === 'true') return true;
      return false;
    },
    shownImage(item) {
      return this.shownChoice(item)?.image || item?.image || '';
    },
    shownPrice(item) {
      return this.shownChoice(item)?.priceLabel || item?.priceLabel || '';
    },
    shownCompare(item) {
      return this.shownChoice(item)?.compareLabel || item?.compareLabel || '';
    },
    itemForAdd(item) {
      const choice = this.shownChoice(item);
      if (!choice) return item;
      return {
        ...item,
        variantId: choice.id,
        priceCents: choice.priceCents || item.priceCents,
        image: choice.image || item.image,
      };
    },
  },
  data() {
    return {
      tilts: ['6deg', '-1deg', '-7deg'],
      lifts: ['8px', '-10px', '4px'],
      layers: [1, 3, 2],
      picked: {},
      openMenuKey: '',
    };
  },
  mounted() {
    document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
  },
  beforeUnmount() {
    document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
  },
};
</script>

<style scoped>
.cart-upsell {
  width: 100%;
  max-width: 100%;
  text-align: start;
}
.cart-upsell:not(.cart-upsell--site),
.cart-upsell:not(.cart-upsell--site) .cart-upsell-block,
.cart-upsell:not(.cart-upsell--site) .cart-upsell-row {
  width: max-content;
  max-width: 100%;
}
.cart-upsell-block {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  min-width: 0;
}
.cart-upsell-heading {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin: 0;
  padding: 0;
  line-height: 0;
}
.cart-upsell-name,
.cart-upsell-price {
  margin: 0;
}
.cart-upsell-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  margin-top: 0;
}
@keyframes cart-upsell-float {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -3px; }
}
.cart-upsell[dir='rtl'] .cart-upsell-fan,
.cart-upsell-fan {
  display: grid;
  grid-template-columns: minmax(0, max-content);
  justify-items: stretch;
  align-items: stretch;
  gap: 16px;
  width: max-content;
  max-width: 100%;
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  overflow: visible;
}
.cart-upsell[dir='rtl'] .cart-upsell-card,
.cart-upsell-card {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  flex: 0 0 auto;
  margin: 0;
  padding: 10px 12px 10px 16px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(29, 111, 238, 0.22);
  box-shadow: 0 0 0 3px rgba(29, 111, 238, 0.06), 0 8px 22px rgba(15, 23, 42, 0.08);
  overflow: visible;
  transform: translate3d(0, 0, 0) scale(1);
  animation: none;
  transition:
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.28s ease,
    border-color 0.28s ease;
  will-change: transform;
}
.cart-upsell[dir='rtl'] .cart-upsell-card {
  padding: 10px 16px 10px 12px;
}
.cart-upsell.cart-upsell-chat-arrive--play .cart-upsell-card {
  animation: cart-upsell-card-in 0.85s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(0.18s + (var(--i, 0) * 0.18s));
}
@keyframes cart-upsell-card-in {
  from { opacity: 0; translate: 0 12px; }
  to { opacity: 1; translate: 0 0; }
}
.cart-upsell-card:hover {
  z-index: 5;
}
.cart-upsell-card--menu-open,
.cart-upsell-card--menu-open:hover {
  z-index: 24;
  overflow: visible;
  /* Keep the card still so the menu stays glued under the trigger. */
  transform: none !important;
}
@media (hover: hover) and (pointer: fine) {
  @media (prefers-reduced-motion: no-preference) {
    .cart-upsell-card:hover:not(.cart-upsell-card--menu-open) {
      transform: translate3d(0, -7px, 0) scale(1.025);
      border-color: rgba(29, 111, 238, 0.38);
      box-shadow:
        0 0 0 3px rgba(29, 111, 238, 0.1),
        0 16px 30px rgba(15, 23, 42, 0.16);
    }
    .cart-upsell[dir='rtl'] .cart-upsell-card:hover:not(.cart-upsell-card--menu-open) {
      transform: translate3d(-4px, -7px, 0) scale(1.025);
    }
    .cart-upsell[dir='ltr'] .cart-upsell-card:hover:not(.cart-upsell-card--menu-open) {
      transform: translate3d(4px, -7px, 0) scale(1.025);
    }
  }
}
.cart-upsell-card:first-child {
  margin-inline-start: 0;
}
.cart-upsell-photo {
  position: relative;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  border-radius: 10px;
  background: #f3f1ec;
  overflow: hidden;
}
.cart-upsell-photo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
  padding: 6px;
  box-sizing: border-box;
  background: #f3f1ec;
}
.cart-upsell-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
  flex: 1 1 auto;
}
.cart-upsell-actions {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  flex: 0 0 118px;
  align-self: center;
  width: 118px;
  min-width: 118px;
  gap: 6px;
}
.cart-upsell-add {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  align-self: stretch;
  width: 100%;
  min-width: 0;
  height: 32px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 9999px;
  background-color: #1d6fee;
  background-image: none;
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(29, 111, 238, 0.32);
  animation: none;
}
.cart-upsell-add svg {
  width: 14px;
  height: 14px;
  display: block;
  pointer-events: none;
}
.cart-upsell-add:hover {
  background: #1557c0;
}
.cart-upsell-card-link {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1 1 auto;
  color: inherit;
  text-decoration: none;
}
.cart-upsell-name {
  margin: 0;
  padding: 0;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.3;
  color: #1f2937;
  text-align: start;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  unicode-bidi: isolate;
}
/*
 * Double the class so padding/type beat App.vue `.assis-plugin-root * { padding: 0 }`
 * (same pattern as order-verification restore). Without this, pills collapse to the text.
 */
.cart-upsell-badge.cart-upsell-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: max-content;
  max-width: none;
  flex: 0 0 auto;
  box-sizing: border-box;
  margin: 0;
  /* Section label above the whole reco list — not per card. */
  padding: 4px 10px;
  border: none;
  min-height: 0;
  border-radius: 999px;
  background-color: #1d6fee;
  background-image: linear-gradient(110deg, #1557c0 0%, #1d6fee 42%, #1d6fee 47%, rgba(255, 255, 255, 0.55) 50%, #1d6fee 53%, #1d6fee 58%, #134bab 100%);
  background-size: 220% 100%;
  color: #ffffff;
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.01em;
  line-height: 1.25;
  white-space: nowrap;
  overflow: visible;
  box-shadow: none;
  animation: cart-upsell-badge-sheen 3.4s ease-in-out infinite;
}
@keyframes cart-upsell-badge-sheen {
  0% { background-position: 100% 0; }
  100% { background-position: 0% 0; }
}
.cart-upsell-price.cart-upsell-price {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-wrap: nowrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.3;
  color: #111827;
  text-align: start;
  min-width: 0;
}
.cart-upsell-variant-wrap {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 28px;
  min-height: 28px;
  margin: 0;
}
.cart-upsell-variant-wrap.is-open {
  z-index: 40;
  overflow: visible;
}
.cart-upsell-variant-trigger {
  appearance: none;
  -webkit-appearance: none;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 28px;
  min-height: 28px;
  margin: 0;
  padding: 0 26px 0 12px;
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 999px;
  background-color: #ffffff;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 10px;
  color: #374151;
  font-size: 10px;
  font-weight: 400;
  font-family: inherit;
  line-height: 1;
  cursor: pointer;
  text-align: center;
}
.cart-upsell-variant-trigger[dir="rtl"] {
  padding: 0 12px 0 26px;
  background-position: left 10px center;
}
.cart-upsell-variant-trigger[aria-expanded="true"] {
  border-color: #1d6fee;
  box-shadow: 0 0 0 3px rgba(29, 111, 238, 0.12);
}
.cart-upsell-variant-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  font-weight: 400;
}
.cart-upsell-variant-menu {
  position: absolute;
  top: calc(100% + 6px);
  bottom: auto;
  inset-inline: 0;
  left: auto;
  right: auto;
  z-index: 50;
  width: 100%;
  max-width: 100%;
  max-height: 180px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.14);
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.55) transparent;
}
.cart-upsell-variant-menu::-webkit-scrollbar {
  width: 6px;
}
.cart-upsell-variant-menu::-webkit-scrollbar-track {
  background: transparent;
}
.cart-upsell-variant-menu::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.55);
  border-radius: 999px;
}
.cart-upsell-variant-item {
  appearance: none;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
  gap: 0;
  width: 100%;
  min-height: 28px;
  margin: 0;
  padding: 6px 24px 6px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #1f2937;
  font-size: 10px;
  font-weight: 400;
  font-family: inherit;
  line-height: 1.25;
  text-align: start;
  cursor: pointer;
}
.cart-upsell-variant-item[dir="rtl"] {
  padding: 6px 8px 6px 24px;
}
.cart-upsell-variant-item > span {
  flex: 1 1 auto;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: start;
  font-weight: 400;
}
.cart-upsell-variant-item:hover:not(:disabled):not([data-selected="true"]) {
  background: rgba(29, 111, 238, 0.08);
}
.cart-upsell-variant-item[data-selected="true"] {
  background: #1d6fee;
  color: #ffffff;
}
.cart-upsell-variant-item[data-unavailable="true"] {
  color: #c4c9d1;
  text-decoration: line-through;
  cursor: not-allowed;
}
.cart-upsell-variant-item[data-selected="true"][data-unavailable="true"] {
  color: #ffffff;
}
.cart-upsell-variant-item:disabled {
  cursor: not-allowed;
}
.cart-upsell-variant-check {
  position: absolute;
  top: 50%;
  inset-inline-end: 8px;
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  transform: translateY(-50%);
  pointer-events: none;
}
.cart-upsell-price-was {
  font-size: 10px;
  font-weight: 500;
  color: #9aa1ad;
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}
.cart-upsell-sale {
  position: absolute;
  top: 6px;
  inset-inline-start: 6px;
  z-index: 2;
  display: inline-flex;
  max-width: calc(100% - 12px);
  margin: 0;
  padding: 3px 7px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 650;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: rgba(29, 111, 238, 0.12);
  color: #1d6fee;
}
.cart-upsell-preorder.cart-upsell-preorder {
  position: static;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: max-content;
  max-width: none;
  flex: 0 0 auto;
  margin: 0;
  padding: 4px 10px;
  border: none;
  min-height: 0;
  border-radius: 999px;
  background: rgba(29, 111, 238, 0.14);
  color: #1d6fee;
  font-size: 9px;
  font-weight: 650;
  line-height: 1.25;
  white-space: nowrap;
  overflow: visible;
  box-shadow: none;
}
.cart-upsell-next {
  position: static;
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 999px;
  background: #e8f3ff;
  color: #1d6fee;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.cart-upsell-next svg {
  width: 14px;
  height: 14px;
}
.cart-upsell[dir='rtl'] .cart-upsell-next svg {
  transform: scaleX(-1);
}
.cart-upsell--site {
  width: max-content;
  max-width: min(280px, calc(100vw - 36px));
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
.cart-upsell-sheet {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}
.cart-upsell--site .cart-upsell-thumbs {
  /* 3×56 frames + 2×10 gaps; height = frame + price — bubble never shrinks on load. */
  min-width: 188px;
  min-height: 73px;
}
.cart-upsell--site .cart-upsell-thumb {
  /* Override the shared fan stagger — site uses its own rise-in. */
  animation: none;
}
.cart-upsell--site .cart-upsell-thumb--rise {
  animation: cart-upsell-thumb-rise 0.48s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(0.05s + (var(--i, 0) * 0.08s));
}
@keyframes cart-upsell-thumb-rise {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.94);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.cart-upsell-thumb-frame--skeleton {
  background: linear-gradient(110deg, #f3f4f6 0%, #eef2f7 45%, #f3f4f6 90%);
  background-size: 220% 100%;
  animation: cart-upsell-skeleton-sheen 1.2s ease-in-out infinite;
  border-color: rgba(15, 23, 42, 0.04);
  box-shadow: none;
}
.cart-upsell-thumb--skeleton,
.cart-upsell-thumb--spacer {
  pointer-events: none;
}
.cart-upsell-thumb--spacer .cart-upsell-thumb-frame {
  visibility: hidden;
  box-shadow: none;
  border-color: transparent;
  background: transparent;
}
.cart-upsell-thumb-price--spacer {
  visibility: hidden;
}
@keyframes cart-upsell-skeleton-sheen {
  0% { background-position: 100% 0; }
  100% { background-position: 0% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .cart-upsell-thumb-frame--skeleton {
    animation: none;
  }
  .cart-upsell--site .cart-upsell-thumb--rise {
    animation: none;
  }
}
.cart-upsell-match {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  width: 100%;
  margin: 0;
  text-align: center;
}
.cart-upsell-match-kicker {
  display: block;
  width: 100%;
  text-align: center;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.3;
  color: #6b7280;
  letter-spacing: 0.01em;
}
.cart-upsell-added {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: max-content;
  max-width: 100%;
  min-width: 0;
  align-self: center;
  padding: 0;
  box-sizing: border-box;
  border-radius: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
}
.cart-upsell-added-name {
  flex: 0 1 auto;
  min-width: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: -0.015em;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}
.cart-upsell-added-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  border-radius: 999px;
  background: #e8f3ff;
  color: #1d6fee;
  line-height: 0;
  box-shadow: none;
  animation: cart-upsell-added-pop 0.48s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.cart-upsell-added-check svg {
  width: 11px;
  height: 11px;
  display: block;
}
@keyframes cart-upsell-added-pop {
  0% { opacity: 0; transform: scale(0.82) translateY(4px); }
  55% { opacity: 1; transform: scale(1.06) translateY(0); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
.cart-upsell-added-photo {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  object-fit: cover;
  border-radius: 10px;
  background: #f3f4f6;
  border: 0;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
}
.cart-upsell-thumbs {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 2px 0 0;
  box-sizing: border-box;
  border-top: 0;
}
.cart-upsell-thumb {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: auto;
  height: auto;
  flex: 0 0 auto;
  min-width: 0;
  background: transparent;
  box-shadow: none;
  border: 0;
  padding: 0;
  pointer-events: auto;
  animation: cart-upsell-thumb-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(0.05s + (var(--i, 0) * 0.06s));
}
@keyframes cart-upsell-thumb-in {
  from { opacity: 0; transform: translateY(8px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.cart-upsell-thumb-frame {
  position: relative;
  width: 56px;
  height: 56px;
  max-width: none;
  aspect-ratio: auto;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
  transform: translate3d(0, 0, 0) scale(1);
  transition:
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.28s ease,
    border-color 0.28s ease;
  will-change: transform;
}
.cart-upsell-thumb-link {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  overflow: hidden;
  color: inherit;
  text-decoration: none;
  background: #f8fafc;
  cursor: pointer;
}
.cart-upsell-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
  padding: 6px;
  box-sizing: border-box;
  pointer-events: none;
}
.cart-upsell-thumb-price {
  margin: 5px 0 0;
  font-size: 10px;
  font-weight: 650;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: #111827;
  text-align: center;
  white-space: nowrap;
  transition: color 0.28s ease;
}
.cart-upsell-thumb-plus {
  position: absolute;
  top: 4px;
  right: 4px;
  left: auto;
  z-index: 5;
  width: 20px;
  height: 20px;
  border: 0;
  padding: 0;
  border-radius: 999px;
  background: #1d6fee;
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 6px 14px rgba(29, 111, 238, 0.28);
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), background 0.2s ease, box-shadow 0.28s ease;
}
.cart-upsell-thumb-plus:active {
  transform: scale(0.94);
}
.cart-upsell-thumb-plus svg {
  width: 11px;
  height: 11px;
  display: block;
  pointer-events: none;
}
@media (hover: hover) and (pointer: fine) {
  @media (prefers-reduced-motion: no-preference) {
    .cart-upsell-thumb:hover .cart-upsell-thumb-frame {
      transform: translate3d(0, -6px, 0) scale(1.04);
      border-color: rgba(29, 111, 238, 0.28);
      box-shadow:
        0 0 0 3px rgba(29, 111, 238, 0.08),
        0 16px 28px rgba(15, 23, 42, 0.14);
    }
    .cart-upsell-thumb:hover .cart-upsell-thumb-price {
      color: #1d6fee;
    }
    .cart-upsell-thumb:hover .cart-upsell-thumb-plus {
      transform: scale(1.1);
      box-shadow: 0 10px 18px rgba(29, 111, 238, 0.34);
    }
    .cart-upsell-thumb-plus:hover,
    .cart-upsell-thumb-plus:focus-visible {
      transform: scale(1.16);
      background: #1557c0;
      box-shadow: 0 12px 22px rgba(29, 111, 238, 0.4);
    }
  }
}
.cart-upsell-buy {
  appearance: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  width: 100%;
  flex: 0 0 auto;
  height: 30px;
  min-height: 30px;
  min-width: 0;
  margin: 2px 0 0;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background-color: #1d6fee;
  background-image: linear-gradient(110deg, #1557c0 0%, #1d6fee 42%, #1d6fee 47%, rgba(255, 255, 255, 0.55) 50%, #1d6fee 53%, #1d6fee 58%, #134bab 100%);
  background-size: 220% 100%;
  color: #fff;
  font-size: 12px;
  font-weight: 650;
  font-family: inherit;
  line-height: 1;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(29, 111, 238, 0.26);
  animation: cart-upsell-sheen 3.4s ease-in-out infinite;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.28s ease, filter 0.2s ease;
}
.cart-upsell-buy:hover {
  transform: translate3d(0, -1px, 0);
  filter: brightness(1.03);
  box-shadow: 0 12px 22px rgba(29, 111, 238, 0.32);
  animation-duration: 1.6s;
}
.cart-upsell-buy:active {
  transform: scale(0.985);
}
@keyframes cart-upsell-sheen {
  0% { background-position: 100% 0; }
  100% { background-position: 0% 0; }
}
@media (max-width: 767px) {
  .cart-upsell--site {
    width: max-content;
    max-width: min(248px, calc(100vw - 28px));
  }
  .cart-upsell-sheet {
    gap: 6px;
    min-width: 0;
  }
  .cart-upsell-thumbs {
    gap: 6px;
    min-width: 0;
  }
  .cart-upsell--site .cart-upsell-thumbs {
    min-width: 162px;
    min-height: 64px;
  }
  .cart-upsell-thumb-frame {
    width: 50px;
    height: 50px;
    border-radius: 12px;
  }
  .cart-upsell-thumb-plus {
    width: 18px;
    height: 18px;
    top: 3px;
    right: 3px;
  }
  .cart-upsell-thumb-plus svg {
    width: 10px;
    height: 10px;
  }
  .cart-upsell-thumb-price {
    font-size: 9px;
    margin-top: 4px;
  }
  .cart-upsell-buy {
    min-width: 0;
    height: 28px;
    min-height: 28px;
    padding: 0 12px;
    font-size: 11px;
  }
  .cart-upsell-added {
    gap: 7px;
  }
  .cart-upsell-added-photo {
    width: 24px;
    height: 24px;
    flex-basis: 24px;
  }
  .cart-upsell-added-name {
    font-size: 12px;
  }
  .cart-upsell-added-check {
    width: 18px;
    height: 18px;
    flex-basis: 18px;
  }
  .cart-upsell-match-kicker {
    font-size: 9px;
  }
  .cart-upsell-photo,
  .cart-upsell-photo img {
    width: 44px;
    height: 44px;
    flex-basis: 44px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .cart-upsell-card,
  .cart-upsell-thumb,
  .cart-upsell-thumb-frame,
  .cart-upsell-thumb-plus,
  .cart-upsell-added-check,
  .cart-upsell-badge {
    transform: none;
    animation: none;
  }
  .cart-upsell-row,
  .cart-upsell-buy {
    animation: none;
  }
  .cart-upsell-thumb {
    opacity: 1;
  }
}
</style>
