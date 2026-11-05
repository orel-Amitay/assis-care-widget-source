<template>
  <div
    class="assis-order-verification"
    :dir="language === 'he' ? 'rtl' : 'ltr'"
    @click.stop
  >
    <div
      class="assis-order-verification-card"
      :class="{
        'assis-order-verification-card--verified': verification.verified,
        'assis-order-verification-card--expired': isExpired,
        'assis-order-verification-card--prefix-open': phonePrefixOpen,
      }"
    >
      <div class="assis-order-verification-body">
        <template v-if="isExpired">
          <div class="assis-order-verification-intro">
            <div class="assis-order-verification-title-row">
              <p class="assis-order-verification-title">{{ expiredTitle }}</p>
            </div>
            <p class="assis-order-verification-description">{{ expiredSubtitle }}</p>
          </div>
        </template>
        <template v-else-if="showContactForm">
          <div class="assis-order-verification-intro">
            <div class="assis-order-verification-title-row">
              <span class="assis-order-verification-title-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 3l7 4v5c0 4.4-2.8 8.4-7 9-4.2-.6-7-4.6-7-9V7l7-4z"></path>
                  <path d="m9.5 12 1.8 1.8L15 10"></path>
                </svg>
              </span>
              <p class="assis-order-verification-title">{{ identityTitle }}</p>
            </div>
            <p class="assis-order-verification-description">{{ identitySubtitle }}</p>
          </div>

          <div
            v-if="channelOptions.length > 1"
            class="assis-order-verification-segments"
          >
            <button
              v-for="channel in channelOptions"
              :key="`order-verification-segment-${channel.id}`"
              type="button"
              class="assis-order-verification-segment"
              :data-active="verification.selectedChannel === channel.id ? 'true' : null"
              :disabled="verification.sending"
              @click="selectChannel(channel.id)"
            >
              <svg
                v-if="channel.id === 'whatsapp'"
                viewBox="0 0 24 24"
                width="11"
                height="11"
                fill="currentColor"
                aria-hidden="true"
              ><path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.02zm-7.01 15.24h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.07-.1-.25-.17-.5-.29z"/></svg>
              <svg
                v-else
                viewBox="0 0 24 24"
                width="11"
                height="11"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              ><rect x="4" y="6.5" width="16" height="11" rx="2"></rect><path d="m5.5 8.5 6.5 5 6.5-5"></path></svg>
              {{ channel.label }}
            </button>
          </div>

          <div class="assis-order-verification-contact-panel">
            <input
              v-if="verification.selectedChannel === 'email'"
              v-model="verification.contactInput"
              type="email"
              inputmode="email"
              autocomplete="off"
              class="assis-order-verification-contact-input"
              :class="{ 'assis-order-verification-contact-input--locked': isEmailContactLocked }"
              :placeholder="contactPlaceholder"
              :readonly="isEmailContactLocked"
              :disabled="verification.sending || isEmailContactLocked"
              dir="ltr"
              @input="onContactInput"
              @keydown.enter.prevent="sendCode()"
            />
            <div
              v-else
              ref="phoneGroup"
              class="ai-phone-input-group assis-order-verification-phone-group"
              :class="[phoneUi.groupClass, { 'assis-order-verification-phone-group--locked': isPhoneContactLocked }]"
            >
              <div class="ai-phone-prefix-select">
                <button
                  type="button"
                  class="ai-phone-prefix-trigger assis-order-verification-phone-prefix-trigger"
                  :aria-expanded="phonePrefixOpen ? 'true' : 'false'"
                  aria-haspopup="listbox"
                  :disabled="verification.sending || isPhoneContactLocked"
                  @click.stop="togglePhonePrefixDropdown"
                >
                  <span
                    class="ai-phone-prefix-flag"
                    aria-hidden="true"
                  >{{ countryCodeToFlag(phoneUi.countryIso) }}</span>
                  <span class="ai-phone-prefix-code">+{{ phoneUi.dialCode }}</span>
                  <svg
                    v-if="!isPhoneContactLocked"
                    class="ai-phone-prefix-chevron"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
              <input
                type="tel"
                inputmode="tel"
                autocomplete="off"
                class="ai-whatsapp-input assis-order-verification-phone-input"
                :class="[phoneUi.inputClass, { 'assis-order-verification-phone-input--locked': isPhoneContactLocked }]"
                :value="phoneUi.local"
                :placeholder="phoneUi.placeholder"
                :readonly="isPhoneContactLocked"
                :disabled="verification.sending || isPhoneContactLocked"
                maxlength="24"
                dir="ltr"
                @focus="ensurePhonePrefix"
                @input="onPhoneLocalInput"
                @keydown.enter.prevent="sendCode()"
              />
              <button
                v-if="isPhoneContactLocked"
                type="button"
                class="assis-order-verification-edit-number"
                :aria-label="editNumberLabel"
                :title="editNumberLabel"
                :disabled="verification.sending"
                @click.stop="unlockPhoneEdit"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                </svg>
              </button>
              <div
                v-if="phonePrefixOpen && !isPhoneContactLocked"
                class="ai-phone-prefix-dropdown assis-order-verification-phone-prefix-dropdown"
                @click.stop
              >
                <div class="ai-phone-prefix-search-wrap">
                  <input
                    ref="prefixSearch"
                    v-model="phonePrefixSearch"
                    type="text"
                    class="ai-phone-prefix-search"
                    :placeholder="phonePrefixSearchPlaceholder"
                    @keydown.stop
                    @click.stop
                  />
                </div>
                <ul class="ai-phone-prefix-list" role="listbox">
                  <li
                    v-for="country in filteredPhonePrefixes"
                    :key="`order-verification-prefix-${country.iso}`"
                    role="option"
                    :aria-selected="country.iso === phoneUi.selectedIso ? 'true' : 'false'"
                    :class="['ai-phone-prefix-option', { selected: country.iso === phoneUi.selectedIso }]"
                    @click="selectPhoneCountry(country)"
                  >
                    <span
                      class="ai-phone-prefix-flag"
                      aria-hidden="true"
                    >{{ countryCodeToFlag(country.iso) }}</span>
                    <span class="ai-phone-prefix-label">{{ formatCountryPrefixLabel(country) }}</span>
                  </li>
                  <li v-if="filteredPhonePrefixes.length === 0" class="ai-phone-prefix-empty">
                    {{ phonePrefixNoResultsLabel }}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="assis-order-verification-send assis-order-verification-send--cta"
            :disabled="verification.sending || !canSendCode || !canResendCode"
            @click="sendCode()"
          >
            {{ sendButtonLabel }}
          </button>
          <button
            v-if="canResumeCodeEntry"
            type="button"
            class="assis-order-verification-edit-contact assis-order-verification-cancel-edit"
            :disabled="verification.sending"
            @click="resumeCodeEntry"
          >
            {{ resumeCodeEntryLabel }}
          </button>
          <button
            v-else-if="editingContact"
            type="button"
            class="assis-order-verification-edit-contact assis-order-verification-cancel-edit"
            :disabled="verification.sending"
            @click="cancelContactEdit"
          >
            {{ cancelEditLabel }}
          </button>
        </template>

        <div
          v-if="!isExpired && verification.codeSent && !verification.noOrdersFound && !editingContact"
          class="assis-order-verification-doc-step"
        >
          <div class="assis-order-verification-intro">
            <div class="assis-order-verification-title-row">
              <span class="assis-order-verification-title-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 2 11 13"></path>
                  <path d="M22 2 15 22 11 13 2 9 22 2z"></path>
                </svg>
              </span>
              <p class="assis-order-verification-title">{{ codeSentDocTitle }}</p>
            </div>
            <p class="assis-order-verification-description">
              <span>{{ sentNotePrefix }}</span>
              <span
                v-if="sentNoteContact"
                class="assis-ltr-value"
                dir="ltr"
              >{{ sentNoteContact }}</span>
              <span>{{ codeSentDocSuffix }}</span>
            </p>
          </div>
        </div>

        <div
          v-if="!isExpired && !verification.verified && verification.codeSent && !verification.noOrdersFound && !editingContact"
          class="assis-order-verification-code-panel"
        >
          <div class="assis-order-verification-code-row">
            <input
              v-model="verification.codeInput"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="8"
              class="assis-order-verification-code-input"
              :placeholder="codePlaceholder"
              :disabled="verification.verifying"
              dir="ltr"
              @keydown.enter.prevent="verifyCode"
            />
            <button
              type="button"
              class="assis-order-verification-verify"
              :disabled="verification.verifying || !String(verification.codeInput || '').trim()"
              @click="verifyCode"
            >
              {{ verification.verifying ? verifyingLabel : verifyLabel }}
            </button>
          </div>
          <div class="assis-order-verification-code-actions">
            <button
              type="button"
              class="assis-order-verification-resend"
              :disabled="verification.sending || !canResendCode"
              @click="sendCode({ resend: true })"
            >
              {{ resendButtonLabel }}
            </button>
            <button
              type="button"
              class="assis-order-verification-edit-contact"
              :disabled="verification.sending || verification.verifying"
              :aria-label="editContactLabel"
              @click="editContact"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
              </svg>
              <span>{{ editContactLabel }}</span>
            </button>
          </div>
        </div>

        <div
          v-else-if="verification.noOrdersFound"
          class="assis-order-verification-empty"
        >
          <div class="assis-order-verification-intro">
            <div class="assis-order-verification-title-row">
              <span class="assis-order-verification-title-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="9"></circle>
                  <path d="M12 8v5"></path>
                  <path d="M12 16h.01"></path>
                </svg>
              </span>
              <p class="assis-order-verification-title">{{ noOrdersTitle }}</p>
            </div>
            <p class="assis-order-verification-description">
              <span>{{ noOrdersMessagePrefix }}</span>
              <span
                v-if="noOrdersContact"
                class="assis-ltr-value"
                dir="ltr"
              >{{ noOrdersContact }}</span>
              <span>{{ noOrdersMessageSuffix }}</span>
            </p>
          </div>
          <button
            type="button"
            class="assis-order-verification-send assis-order-verification-send--cta"
            @click="restartVerification({ unlockContact: true })"
          >
            {{ tryAgainLabel }}
          </button>
        </div>

        <div
          v-if="!isExpired && verification.verified && !editingContact"
          class="assis-order-verification-verified"
        >
          <div class="assis-order-verification-intro">
            <div class="assis-order-verification-title-row">
              <span class="assis-order-verification-title-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 12.5 9.5 18 20 6.5"></path>
                </svg>
              </span>
              <p class="assis-order-verification-title">{{ successLabel }}</p>
            </div>
            <p
              v-if="verification.verifiedVia === 'details' && hasVerifiedDetail"
              class="assis-order-verification-description assis-order-verification-verified-detail"
            >
              <span>{{ verifiedDetailPrefix }}</span>
              <span
                v-if="verifiedDetailContact"
                class="assis-ltr-value"
                dir="ltr"
              >{{ verifiedDetailContact }}</span>
            </p>
            <p
              v-else
              class="assis-order-verification-description"
            >{{ verifiedDocCaption }}</p>
          </div>
          <button
            v-if="canChangeVerifiedContact"
            type="button"
            class="assis-order-verification-edit-contact assis-order-verification-change-contact"
            @click="beginChangeContact"
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
            </svg>
            <span>{{ changeContactLabel }}</span>
          </button>
        </div>
      </div>

      <p
        v-if="!isExpired && (verification.error || sameContactError)"
        class="assis-order-verification-error"
        role="alert"
      >{{ verification.error || sameContactError }}</p>
    </div>
  </div>
</template>

<script>
import {
  getDefaultOrderVerificationPhoneIso,
  parseOrderVerificationPhoneContact,
  findOrderVerificationPhoneCountryByIso,
  filterOrderVerificationPhonePrefixesByQuery,
} from './orderVerification.js';
import { countryCodeToFlag as isoToFlagEmoji } from './countryPhonePrefixes.js';

const RESEND_COOLDOWN_MS = 60 * 1000;

export default {
  name: 'OrderVerificationCard',
  props: {
    message: {
      type: Object,
      required: true,
    },
    language: {
      type: String,
      default: 'en',
    },
    assisBackendUrl: {
      type: String,
      required: true,
    },
    careRequestId: {
      type: [String, Number],
      default: null,
    },
    phonePrefix: {
      type: [String, Number],
      default: '972',
    },
    selectedPhoneCountryIso: {
      type: String,
      default: 'IL',
    },
    hasWhatsappChannel: {
      type: Boolean,
      default: true,
    },
    hasEmailChannel: {
      type: Boolean,
      default: true,
    },
    knownPhone: {
      type: String,
      default: '',
    },
    knownEmail: {
      type: String,
      default: '',
    },
    socket: {
      type: Object,
      default: null,
    },
    getClientId: {
      type: Function,
      required: true,
    },
    isValidEmail: {
      type: Function,
      required: true,
    },
    isValidPhone: {
      type: Function,
      required: true,
    },
    normalizePhone: {
      type: Function,
      default: null,
    },
    trackPluginEvent: {
      type: Function,
      default: null,
    },
  },
  emits: ['open-prefix-dropdown', 'restart'],
  data() {
    return {
      phonePrefixOpen: false,
      phonePrefixSearch: '',
      phoneEditUnlocked: false,
      emailEditUnlocked: false,
      editingContact: false,
      contactEditSnapshot: null,
      exitEditAfterSend: false,
      nowTick: Date.now(),
      resendTimerId: null,
      expiryTimerId: null,
    };
  },
  computed: {
    verification() {
      return this.message?.orderVerification || {};
    },
    showContactForm() {
      if (this.isExpired) return false;
      if (this.editingContact) return true;
      const verification = this.verification;
      return !verification.verified && !verification.codeSent && !verification.noOrdersFound;
    },
    identityTitle() {
      return this.language === 'he' ? 'רק לוודא שזה אתם' : "Just to make sure it's you";
    },
    expiredTitle() {
      return this.language === 'he' ? 'פג תוקף' : 'Expired';
    },
    expiredSubtitle() {
      return this.language === 'he'
        ? 'בקשת האימות הזו כבר לא פעילה.'
        : 'This verification request is no longer active.';
    },
    isExpired() {
      return Boolean(this.verification?.expired);
    },
    isSingleVerificationChannel() {
      return this.channelOptions.length === 1;
    },
    singleVerificationChannelId() {
      return this.isSingleVerificationChannel ? this.channelOptions[0]?.id : null;
    },
    identitySubtitle() {
      if (this.singleVerificationChannelId === 'email') {
        return this.language === 'he'
          ? 'יש להזין את המייל - נשלח אליו קוד חד-פעמי כדי להציג את פרטי ההזמנה בבטחה.'
          : 'Enter your email - we will send a one-time code so we can securely show your order details.';
      }
      if (this.singleVerificationChannelId === 'whatsapp') {
        return this.language === 'he'
          ? 'יש להזין את מספר הטלפון - נשלח אליו קוד חד-פעמי כדי להציג את פרטי ההזמנה בבטחה.'
          : 'Enter your phone number - we will send a one-time code so we can securely show your order details.';
      }
      return this.language === 'he'
        ? 'נשלח לכם קוד חד-פעמי, וכך נוכל להציג את פרטי ההזמנה בבטחה.'
        : "We'll send a one-time code so we can securely show your order details.";
    },
    emailLabel() {
      return this.language === 'he' ? 'אימייל' : 'Email';
    },
    whatsappLabel() {
      return this.language === 'he' ? 'וואטסאפ' : 'WhatsApp';
    },
    sendCodeLabel() {
      if (this.singleVerificationChannelId === 'email') {
        return this.language === 'he' ? 'שלחו לי את הקוד למייל' : 'Send the code to my email';
      }
      if (this.singleVerificationChannelId === 'whatsapp') {
        return this.language === 'he' ? 'שלחו לי את הקוד לטלפון' : 'Send the code to my phone';
      }
      return this.language === 'he' ? 'שלחו לי קוד' : 'Send me a code';
    },
    sendingLabel() {
      return this.language === 'he' ? 'שולח...' : 'Sending...';
    },
    verifyLabel() {
      return this.language === 'he' ? 'אימות' : 'Verify';
    },
    verifyingLabel() {
      return this.language === 'he' ? 'מאמת...' : 'Verifying...';
    },
    resendLabel() {
      return this.language === 'he' ? 'שליחה מחדש' : 'Resend code';
    },
    resendSecondsLeft() {
      const availableAt = Number(this.verification?.resendAvailableAt) || 0;
      if (!availableAt) return 0;
      return Math.max(0, Math.ceil((availableAt - this.nowTick) / 1000));
    },
    canResendCode() {
      return this.resendSecondsLeft <= 0;
    },
    resendCountdownLabel() {
      const total = this.resendSecondsLeft;
      const minutes = Math.floor(total / 60);
      const seconds = String(total % 60).padStart(2, '0');
      return `${minutes}:${seconds}`;
    },
    resendButtonLabel() {
      if (this.verification.sending) return this.sendingLabel;
      if (!this.canResendCode) {
        return `${this.resendLabel} (${this.resendCountdownLabel})`;
      }
      return this.resendLabel;
    },
    sendButtonLabel() {
      if (this.verification.sending) return this.sendingLabel;
      if (!this.canResendCode) {
        return `${this.sendCodeLabel} (${this.resendCountdownLabel})`;
      }
      return this.sendCodeLabel;
    },
    editNumberLabel() {
      return this.language === 'he' ? 'עריכת מספר' : 'Edit number';
    },
    editContactLabel() {
      if (this.verification?.selectedChannel === 'email') {
        return this.language === 'he' ? 'עריכת אימייל' : 'Edit email';
      }
      return this.editNumberLabel;
    },
    codePlaceholder() {
      return this.language === 'he' ? 'קוד אימות' : 'Verification code';
    },
    successLabel() {
      return this.language === 'he' ? 'ההזמנה אומתה בהצלחה' : 'Order verified successfully';
    },
    codeSentDocTitle() {
      return this.language === 'he' ? 'קוד נשלח' : 'Code sent';
    },
    codeSentDocSuffix() {
      return '.';
    },
    verifiedDocCaption() {
      return this.language === 'he'
        ? 'הקוד אומת בהצלחה. אפשר להציג את פרטי ההזמנה.'
        : 'The code was verified successfully. Your order details are ready.';
    },
    changeContactLabel() {
      if (this.verification?.selectedChannel === 'email') {
        return this.language === 'he' ? 'החלפת אימייל' : 'Change email';
      }
      return this.language === 'he' ? 'החלפת מספר' : 'Change number';
    },
    hasVerifiedOrders() {
      // After verify, order cards may be relocated to a later AI message, so
      // this verification message's `orders` can be empty. Prefer full/raw
      // providerOrders, and treat a successful verify as having orders
      // (verified is only set when orders were found).
      const providerOrders = this.message?.providerOrders;
      if (Array.isArray(providerOrders) && providerOrders.length > 0) return true;
      if (this.verification?.verified && !this.verification?.noOrdersFound) return true;
      return Array.isArray(this.message?.orders) && this.message.orders.length > 0;
    },
    canChangeVerifiedContact() {
      // Once contact is verified and orders are loaded, lock the contact.
      return !this.hasVerifiedOrders;
    },
    cancelEditLabel() {
      return this.language === 'he' ? 'ביטול' : 'Cancel';
    },
    resumeCodeEntryLabel() {
      return this.language === 'he' ? 'חזרה להזנת קוד' : 'Back to enter a code';
    },
    canResumeCodeEntry() {
      const snapshot = this.contactEditSnapshot;
      return Boolean(
        this.editingContact
        && snapshot
        && !snapshot.verified
        && snapshot.codeSent
      );
    },
    noOrdersTitle() {
      return this.language === 'he' ? 'לא נמצאה הזמנה' : 'No order found';
    },
    noOrdersContact() {
      const verification = this.verification;
      if (!verification) return '';
      const entered = String(verification.contactInput || '').trim();
      if (entered) return entered;
      if (verification.selectedChannel === 'email') {
        return String(verification.maskedEmail || '').trim();
      }
      return String(verification.maskedPhone || '').trim();
    },
    noOrdersMessagePrefix() {
      if (this.verification.selectedChannel === 'email') {
        return this.language === 'he'
          ? 'לא מצאנו הזמנה עבור כתובת האימייל '
          : 'No order found for the email address ';
      }
      return this.language === 'he'
        ? 'לא מצאנו הזמנה עבור מספר הטלפון '
        : 'No order found for the phone number ';
    },
    noOrdersMessageSuffix() {
      if (this.singleVerificationChannelId === 'email') {
        return this.language === 'he'
          ? '. נסו שוב עם אימייל אחר.'
          : '. Please try again with a different email.';
      }
      if (this.singleVerificationChannelId === 'whatsapp') {
        return this.language === 'he'
          ? '. נסו שוב עם מספר טלפון אחר.'
          : '. Please try again with a different phone number.';
      }
      return this.language === 'he'
        ? '. נסו שוב עם מספר טלפון או אימייל אחר.'
        : '. Please try again with a different phone number or email.';
    },
    tryAgainLabel() {
      return this.language === 'he' ? 'נסו שוב' : 'Try again';
    },
    historyLabel() {
      return this.language === 'he' ? 'קוד נשלח אל' : 'Code sent to';
    },
    detailsFirstNameLabel() {
      return this.language === 'he' ? 'שם פרטי' : 'First name';
    },
    detailsPhoneLabel() {
      return this.language === 'he' ? 'טלפון' : 'Phone';
    },
    detailsEmailLabel() {
      return this.language === 'he' ? 'אימייל' : 'Email';
    },
    verifiedWithLabel() {
      return this.language === 'he' ? 'אומת באמצעות' : 'Verified with';
    },
    phonePrefixSearchPlaceholder() {
      return this.language === 'he' ? 'חיפוש מדינה או קידומת...' : 'Search country or prefix...';
    },
    phonePrefixNoResultsLabel() {
      return this.language === 'he' ? 'לא נמצאו מדינות' : 'No countries found';
    },
    filteredPhonePrefixes() {
      return filterOrderVerificationPhonePrefixesByQuery(this.phonePrefixSearch);
    },
    channelOptions() {
      const allowed = Array.isArray(this.verification?.availableChannels)
        && this.verification.availableChannels.length
        ? this.verification.availableChannels
        : ['whatsapp', 'email'];
      const options = [];
      if (allowed.includes('whatsapp')) {
        options.push({ id: 'whatsapp', label: this.whatsappLabel });
      }
      if (allowed.includes('email')) {
        options.push({ id: 'email', label: this.emailLabel });
      }
      return options;
    },
    contactPlaceholder() {
      if (this.verification.selectedChannel === 'email') {
        return 'your.email@example.com';
      }
      return this.resolvePhoneCountry().placeholder || 'XX-XXX-XXXX';
    },
    contactValue() {
      const verification = this.verification;
      if (!verification) return '';
      if (verification.selectedChannel === 'email') {
        return String(verification.contactInput || '').trim();
      }
      const local = String(verification.phoneLocal || '').trim();
      if (!local) return String(verification.contactInput || '').trim();
      const country = this.resolvePhoneCountry();
      return `+${country.dialCode} ${local}`;
    },
    canSendCode() {
      const verification = this.verification;
      if (!verification?.selectedChannel) return false;
      if (this.isSameContactAsBefore) return false;
      const contact = this.contactValue;
      if (!contact) return false;
      return verification.selectedChannel === 'email'
        ? this.isValidEmail(contact)
        : this.isValidPhone(contact);
    },
    isSameContactAsBefore() {
      if (!this.editingContact || !this.contactEditSnapshot) return false;
      const verification = this.verification;
      const snapshot = this.contactEditSnapshot;
      const channel = verification?.selectedChannel;
      if (!channel || channel !== snapshot.selectedChannel) return false;
      const previous = this.normalizeContactKey(this.snapshotContactValue(snapshot), channel);
      const next = this.normalizeContactKey(this.contactValue, channel);
      return Boolean(previous && next && previous === next);
    },
    sameContactError() {
      if (!this.isSameContactAsBefore) return '';
      if (this.verification?.selectedChannel === 'email') {
        return this.language === 'he'
          ? 'זו אותה כתובת אימייל כמו קודם. הזינו אימייל אחר.'
          : 'This is the same email as before. Enter a different one.';
      }
      return this.language === 'he'
        ? 'זה אותו מספר כמו קודם. הזינו מספר אחר.'
        : 'This is the same number as before. Enter a different one.';
    },
    isPhoneContactLocked() {
      return Boolean(String(this.knownPhone || '').trim()) && !this.phoneEditUnlocked;
    },
    isEmailContactLocked() {
      return Boolean(String(this.knownEmail || '').trim()) && !this.emailEditUnlocked;
    },
    isCurrentContactLocked() {
      if (this.verification?.selectedChannel === 'email') return this.isEmailContactLocked;
      if (this.verification?.selectedChannel === 'whatsapp') return this.isPhoneContactLocked;
      return false;
    },
    phoneUi() {
      const verification = this.verification;
      const emptyState = {
        groupClass: {},
        inputClass: {},
        countryIso: 'IL',
        dialCode: '972',
        local: '',
        placeholder: 'XX-XXX-XXXX',
        selectedIso: 'IL',
      };
      if (!verification || verification.selectedChannel === 'email') return emptyState;

      const country = this.resolvePhoneCountry();
      const local = String(verification.phoneLocal || '').trim();
      const contact = local ? `+${country.dialCode} ${local}` : String(verification.contactInput || '').trim();
      const validation = contact ? (this.isValidPhone(contact) ? 'valid' : 'invalid') : '';

      return {
        groupClass: {
          'ai-phone-input-group--valid': validation === 'valid',
          'ai-phone-input-group--invalid': validation === 'invalid',
          'ai-phone-input-group--prefix-open': this.phonePrefixOpen,
        },
        inputClass: {
          valid: validation === 'valid',
          invalid: validation === 'invalid',
        },
        countryIso: country.iso,
        dialCode: country.dialCode,
        local,
        placeholder: country.placeholder || 'XX-XXX-XXXX',
        selectedIso: country.iso,
      };
    },
    sentNotePrefix() {
      return this.language === 'he'
        ? 'שלחנו קוד אימות ל-'
        : 'We sent a verification code to ';
    },
    sentNoteContact() {
      const verification = this.verification;
      if (!verification) return '';
      const entered = String(verification.contactInput || '').trim();
      if (entered) return entered;
      if (verification.selectedChannel === 'email') {
        return verification.maskedEmail
          || (this.language === 'he' ? 'האימייל שמקושר להזמנה' : 'the email linked to your order');
      }
      return verification.maskedPhone
        || (this.language === 'he' ? 'הטלפון שמקושר להזמנה' : 'the phone linked to your order');
    },
    detailFieldLabel() {
      const type = this.verification.detailsFieldType;
      if (type === 'first_name') return this.detailsFirstNameLabel;
      if (type === 'phone') return this.detailsPhoneLabel;
      if (type === 'email') return this.detailsEmailLabel;
      return '';
    },
    detailsHistoryValue() {
      return String(this.verification.detailsFieldInput || '').trim();
    },
    historyChannelLabel() {
      if (!this.verification.selectedChannel) return '';
      return this.verification.selectedChannel === 'email'
        ? this.emailLabel
        : this.whatsappLabel;
    },
    historyContact() {
      if (this.verification.selectedChannel === 'email') {
        return String(this.verification.maskedEmail || '').trim();
      }
      return String(this.verification.maskedPhone || '').trim();
    },
    verifiedDetailPrefix() {
      const verification = this.verification;
      if (!verification?.verified) return '';

      if (verification.verifiedVia === 'details') {
        const fieldLabel = this.detailFieldLabel;
        if (!fieldLabel) return '';
        const value = this.detailsHistoryValue;
        if (verification.detailsFieldType === 'first_name') {
          return value
            ? `${this.verifiedWithLabel} ${fieldLabel} · ${value}`
            : `${this.verifiedWithLabel} ${fieldLabel}`;
        }
        return value
          ? `${this.verifiedWithLabel} ${fieldLabel} · `
          : `${this.verifiedWithLabel} ${fieldLabel}`;
      }

      const channel = this.historyChannelLabel;
      const contact = this.historyContact;
      if (channel && contact) {
        return `${this.historyLabel} ${channel} · `;
      }
      return '';
    },
    verifiedDetailContact() {
      const verification = this.verification;
      if (!verification?.verified) return '';

      if (verification.verifiedVia === 'details' && verification.detailsFieldType !== 'first_name') {
        return this.detailsHistoryValue;
      }

      if (verification.verifiedVia !== 'details') {
        return this.historyContact;
      }

      return '';
    },
    hasVerifiedDetail() {
      return Boolean(this.verifiedDetailPrefix || this.verifiedDetailContact);
    },
  },
  watch: {
    'verification.resendAvailableAt'() {
      this.syncResendTimer();
    },
    'verification.sending'(isSending, wasSending) {
      if (!wasSending || isSending) return;
      const verification = this.verification;
      if (!verification || verification.error) {
        this.exitEditAfterSend = false;
        return;
      }
      if (!(this.editingContact || this.exitEditAfterSend)) return;
      if (!verification.codeSent) return;
      // New code sent after editing contact - keep order history, exit edit mode.
      verification.verified = false;
      verification.verifiedVia = null;
      this.editingContact = false;
      this.contactEditSnapshot = null;
      this.exitEditAfterSend = false;
    },
    knownPhone() {
      this.syncLockedContact();
    },
    knownEmail() {
      this.syncLockedContact();
    },
    'message.orderVerification'(value) {
      if (value) {
        this.clampSelectedChannel();
        this.syncLockedContact();
      }
    },
  },
  mounted() {
    document.addEventListener('click', this.onDocumentClick);
    this.clampSelectedChannel();
    this.syncResendTimer();
    this.syncLockedContact();
    this.syncExpiry();
    this.expiryTimerId = window.setInterval(() => this.syncExpiry(), 15000);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onDocumentClick);
    this.stopResendTimer();
    this.stopExpiryTimer();
  },
  methods: {
    syncResendTimer() {
      this.nowTick = Date.now();
      if (this.resendSecondsLeft <= 0) {
        this.stopResendTimer();
        return;
      }
      if (this.resendTimerId != null) return;
      this.resendTimerId = window.setInterval(() => {
        this.nowTick = Date.now();
        if (this.resendSecondsLeft <= 0) {
          this.stopResendTimer();
        }
      }, 250);
    },
    stopResendTimer() {
      if (this.resendTimerId == null) return;
      window.clearInterval(this.resendTimerId);
      this.resendTimerId = null;
    },
    syncExpiry() {
      const verification = this.verification;
      if (!verification || verification.verified || verification.expired) {
        this.stopExpiryTimer();
        return;
      }
      if (!verification.createdAt) {
        verification.createdAt = Date.now();
      }
      const ageMs = Date.now() - Number(verification.createdAt);
      if (ageMs >= 10 * 60 * 1000) {
        verification.expired = true;
        verification.sending = false;
        verification.verifying = false;
        this.stopExpiryTimer();
      }
    },
    stopExpiryTimer() {
      if (this.expiryTimerId == null) return;
      window.clearInterval(this.expiryTimerId);
      this.expiryTimerId = null;
    },
    countryCodeToFlag(iso) {
      return isoToFlagEmoji(iso);
    },
    formatCountryPrefixLabel(country) {
      if (!country) return '';
      const name = country.name.includes('(')
        ? country.name.split('(')[0].trim()
        : country.name;
      return `${name} (+${country.dialCode})`;
    },
    defaultPhoneIso() {
      return getDefaultOrderVerificationPhoneIso(this.phonePrefix, this.selectedPhoneCountryIso);
    },
    resolvePhoneCountry() {
      const verification = this.verification;
      if (!verification) {
        return findOrderVerificationPhoneCountryByIso(this.defaultPhoneIso(), this.phonePrefix);
      }

      if (!verification.phoneCountryIso && verification.contactInput) {
        const parsed = parseOrderVerificationPhoneContact(
          verification.contactInput,
          this.defaultPhoneIso()
        );
        verification.phoneCountryIso = parsed.iso;
        verification.phoneLocal = parsed.local;
      }

      return findOrderVerificationPhoneCountryByIso(
        verification.phoneCountryIso || this.defaultPhoneIso(),
        this.phonePrefix
      );
    },
    syncContactFromPhoneFields() {
      const verification = this.verification;
      if (!verification || verification.selectedChannel === 'email') return;
      const country = this.resolvePhoneCountry();
      const local = String(verification.phoneLocal || '').trim();
      verification.contactInput = local ? `+${country.dialCode} ${local}` : '';
    },
    syncOrderNumber() {
      const verification = this.verification;
      if (!verification) return '';
      const orderNumber = String(verification.orderNumberInput ?? verification.orderNumber ?? '')
        .trim()
        .replace(/^#+/, '');
      if (orderNumber) {
        verification.orderNumber = orderNumber;
        verification.orderName = `#${orderNumber}`;
      }
      return orderNumber;
    },
    onContactInput() {
      if (this.isEmailContactLocked) return;
      if (this.verification) this.verification.error = '';
    },
    onPhoneLocalInput(event) {
      if (this.isPhoneContactLocked) return;
      const verification = this.verification;
      if (!verification) return;
      verification.phoneLocal = String(event?.target?.value || '');
      verification.error = '';
      this.syncContactFromPhoneFields();
    },
    ensurePhonePrefix() {
      if (!this.verification || this.verification.selectedChannel === 'email') return;
      if (this.isPhoneContactLocked) return;
      this.resolvePhoneCountry();
    },
    togglePhonePrefixDropdown() {
      if (this.isPhoneContactLocked || this.verification?.sending) return;
      const nextOpen = !this.phonePrefixOpen;
      if (nextOpen) {
        this.$emit('open-prefix-dropdown');
      }
      this.phonePrefixOpen = nextOpen;
      this.phonePrefixSearch = '';
      if (nextOpen) {
        this.$nextTick(() => this.$refs.prefixSearch?.focus());
      }
    },
    closePhonePrefixDropdown() {
      this.phonePrefixOpen = false;
      this.phonePrefixSearch = '';
    },
    selectPhoneCountry(country) {
      if (this.isPhoneContactLocked) return;
      const verification = this.verification;
      if (!verification || !country) return;
      verification.phoneCountryIso = country.iso;
      this.syncContactFromPhoneFields();
      this.closePhonePrefixDropdown();
    },
    onDocumentClick(event) {
      if (!this.phonePrefixOpen) return;
      const group = this.$refs.phoneGroup;
      const path = typeof event.composedPath === 'function' ? event.composedPath() : [event.target];
      if (group && path.includes(group)) return;
      this.closePhonePrefixDropdown();
    },
    canSendVia(channel) {
      return this.channelOptions.some((option) => option.id === channel);
    },
    clampSelectedChannel() {
      const verification = this.verification;
      if (!verification) return;
      const options = this.channelOptions;
      if (!options.length) return;
      if (!options.some((option) => option.id === verification.selectedChannel)) {
        verification.selectedChannel = options[0].id;
      }
    },
    selectChannel(channel) {
      const verification = this.verification;
      if (!verification || (verification.verified && !this.editingContact)) return;
      const nextChannel = channel === 'email' ? 'email' : 'whatsapp';
      if (!this.canSendVia(nextChannel)) return;
      verification.selectedChannel = nextChannel;
      verification.error = '';
      this.closePhonePrefixDropdown();
      if (typeof this.trackPluginEvent === 'function') {
        this.trackPluginEvent('order_verification_channel_selected', {
          channel: verification.selectedChannel,
        });
      }

      if (verification.selectedChannel === 'email' && this.isEmailContactLocked) {
        this.applyLockedEmail();
        return;
      }
      if (verification.selectedChannel === 'whatsapp' && this.isPhoneContactLocked) {
        this.applyLockedPhone();
        return;
      }

      verification.contactInput = '';
      verification.phoneLocal = '';
      verification.phoneCountryIso = this.defaultPhoneIso();
    },
    syncLockedContact() {
      const verification = this.verification;
      if (!verification || verification.verified) return;

      const preferWhatsapp = this.isPhoneContactLocked && this.canSendVia('whatsapp');
      const preferEmail = this.isEmailContactLocked && this.canSendVia('email');

      if (!verification.codeSent) {
        if (preferWhatsapp && !preferEmail) {
          verification.selectedChannel = 'whatsapp';
        } else if (preferEmail && !preferWhatsapp) {
          verification.selectedChannel = 'email';
        } else if (!verification.selectedChannel) {
          if (preferWhatsapp) verification.selectedChannel = 'whatsapp';
          else if (preferEmail) verification.selectedChannel = 'email';
        }
      }

      if (verification.selectedChannel === 'email' && this.isEmailContactLocked) {
        this.applyLockedEmail();
      } else if (verification.selectedChannel === 'whatsapp' && this.isPhoneContactLocked) {
        this.applyLockedPhone();
      }
    },
    applyLockedEmail() {
      const verification = this.verification;
      if (!verification) return;
      const email = String(this.knownEmail || '').trim();
      if (!email) return;
      verification.selectedChannel = 'email';
      verification.contactInput = email;
      verification.phoneLocal = '';
    },
    applyLockedPhone() {
      const verification = this.verification;
      if (!verification) return;
      const phone = String(this.knownPhone || '').trim();
      if (!phone) return;
      const parsed = parseOrderVerificationPhoneContact(phone, this.defaultPhoneIso());
      verification.selectedChannel = 'whatsapp';
      verification.contactInput = parsed.full || phone;
      verification.phoneLocal = parsed.local;
      verification.phoneCountryIso = parsed.iso || this.defaultPhoneIso();
      this.closePhonePrefixDropdown();
    },
    unlockPhoneEdit() {
      if (this.verification?.sending) return;
      this.phoneEditUnlocked = true;
    },
    snapshotContactEdit() {
      const verification = this.verification;
      if (!verification) return null;
      return {
        verified: Boolean(verification.verified),
        verifiedVia: verification.verifiedVia || null,
        codeSent: Boolean(verification.codeSent),
        contactInput: String(verification.contactInput || ''),
        phoneLocal: String(verification.phoneLocal || ''),
        phoneCountryIso: String(verification.phoneCountryIso || this.defaultPhoneIso()),
        maskedEmail: String(verification.maskedEmail || ''),
        maskedPhone: String(verification.maskedPhone || ''),
        selectedChannel: verification.selectedChannel || 'whatsapp',
        selectedOrderIndex: verification.selectedOrderIndex,
        verificationId: String(verification.verificationId || ''),
        codeInput: String(verification.codeInput || ''),
        noOrdersFound: Boolean(verification.noOrdersFound),
        resendAvailableAt: verification.resendAvailableAt || null,
        phoneEditUnlocked: this.phoneEditUnlocked,
        emailEditUnlocked: this.emailEditUnlocked,
        orders: Array.isArray(this.message?.orders) ? [...this.message.orders] : [],
        providerOrders: Array.isArray(this.message?.providerOrders) ? [...this.message.providerOrders] : [],
      };
    },
    snapshotContactValue(snapshot) {
      if (!snapshot) return '';
      if (snapshot.selectedChannel === 'email') {
        return String(snapshot.contactInput || '').trim();
      }
      const local = String(snapshot.phoneLocal || '').trim();
      if (local) {
        const country = findOrderVerificationPhoneCountryByIso(
          snapshot.phoneCountryIso || this.defaultPhoneIso(),
          this.phonePrefix
        );
        return `+${country.dialCode} ${local}`;
      }
      return String(snapshot.contactInput || '').trim();
    },
    normalizeContactKey(contact, channel) {
      const value = String(contact || '').trim();
      if (!value) return '';
      if (channel === 'email') return value.toLowerCase();
      return value.replace(/\D/g, '');
    },
    clearSendCooldown() {
      const verification = this.verification;
      if (!verification) return;
      verification.resendAvailableAt = null;
      this.stopResendTimer();
      this.nowTick = Date.now();
    },
    beginChangeContact() {
      const verification = this.verification;
      if (!verification || !this.canChangeVerifiedContact || verification.sending || verification.verifying) return;
      this.contactEditSnapshot = this.snapshotContactEdit();
      this.editingContact = true;
      this.exitEditAfterSend = false;
      this.phoneEditUnlocked = true;
      this.emailEditUnlocked = true;
      verification.contactInput = '';
      verification.phoneLocal = '';
      verification.phoneCountryIso = this.defaultPhoneIso();
      verification.codeInput = '';
      verification.error = '';
      verification.sending = false;
      verification.verifying = false;
      this.clearSendCooldown();
      this.closePhonePrefixDropdown();
    },
    editContact() {
      const verification = this.verification;
      if (!verification || verification.verified || verification.sending || verification.verifying) return;
      this.contactEditSnapshot = this.snapshotContactEdit();
      this.editingContact = true;
      this.exitEditAfterSend = false;
      if (verification.selectedChannel === 'email') {
        this.emailEditUnlocked = true;
      } else {
        this.phoneEditUnlocked = true;
      }
      verification.codeInput = '';
      verification.error = '';
      this.clearSendCooldown();
      this.closePhonePrefixDropdown();
    },
    cancelContactEdit() {
      const verification = this.verification;
      const snapshot = this.contactEditSnapshot;
      if (!verification || !snapshot) {
        this.editingContact = false;
        this.contactEditSnapshot = null;
        this.exitEditAfterSend = false;
        return;
      }

      verification.verified = snapshot.verified;
      verification.verifiedVia = snapshot.verifiedVia;
      verification.codeSent = snapshot.codeSent;
      verification.contactInput = snapshot.contactInput;
      verification.phoneLocal = snapshot.phoneLocal;
      verification.phoneCountryIso = snapshot.phoneCountryIso;
      verification.maskedEmail = snapshot.maskedEmail;
      verification.maskedPhone = snapshot.maskedPhone;
      verification.selectedChannel = snapshot.selectedChannel;
      verification.selectedOrderIndex = snapshot.selectedOrderIndex;
      verification.verificationId = snapshot.verificationId;
      verification.codeInput = snapshot.codeInput;
      verification.noOrdersFound = snapshot.noOrdersFound;
      verification.resendAvailableAt = snapshot.resendAvailableAt;
      verification.error = '';
      verification.sending = false;
      verification.verifying = false;

      if (this.message) {
        this.message.orders = snapshot.orders;
        this.message.providerOrders = snapshot.providerOrders;
      }

      this.phoneEditUnlocked = snapshot.phoneEditUnlocked;
      this.emailEditUnlocked = snapshot.emailEditUnlocked;
      this.editingContact = false;
      this.contactEditSnapshot = null;
      this.exitEditAfterSend = false;
      this.syncResendTimer();
      this.closePhonePrefixDropdown();
    },
    resumeCodeEntry() {
      if (!this.canResumeCodeEntry) return;
      this.cancelContactEdit();
    },
    restartVerification({ unlockContact = false } = {}) {
      const verification = this.verification;
      if (!verification || verification.sending || verification.verifying) return;

      if (unlockContact) {
        this.phoneEditUnlocked = true;
        this.emailEditUnlocked = true;
      }

      this.editingContact = false;
      this.contactEditSnapshot = null;
      this.exitEditAfterSend = false;

      verification.noOrdersFound = false;
      verification.verified = false;
      verification.verifiedVia = null;
      verification.codeSent = false;
      verification.codeInput = '';
      verification.contactInput = '';
      verification.phoneLocal = '';
      verification.phoneCountryIso = this.defaultPhoneIso();
      verification.maskedEmail = '';
      verification.maskedPhone = '';
      verification.verificationId = '';
      verification.selectedOrderIndex = null;
      verification.attemptsRemaining = null;
      verification.resendAvailableAt = null;
      verification.error = '';
      verification.sending = false;
      verification.verifying = false;
      verification.pendingSendAt = null;
      verification.pendingVerifyAt = null;

      // Keep existing order history on the message - only clear when replacing after a new successful verify.
      this.stopResendTimer();
      this.closePhonePrefixDropdown();
      this.syncLockedContact();
      this.$emit('restart');
    },
    maskPhone(phone) {
      const digits = String(phone || '').replace(/\D/g, '');
      if (digits.length < 4) return '';
      const visible = digits.slice(-4);
      return `${'*'.repeat(Math.max(4, digits.length - 4))}${visible}`;
    },
    maskEmail(email) {
      const normalized = String(email || '').trim().toLowerCase();
      const [local, domain] = normalized.split('@');
      if (!local || !domain) return '';
      const visible = local.slice(0, 1);
      return `${visible}${'*'.repeat(Math.max(2, local.length - 1))}@${domain}`;
    },
    storeContactMask() {
      const verification = this.verification;
      const contact = String(verification?.contactInput || '').trim();
      if (!contact) return;
      if (verification.selectedChannel === 'email') {
        verification.maskedEmail = this.maskEmail(contact);
      } else {
        verification.maskedPhone = this.maskPhone(contact);
      }
    },
    sendCode(options = {}) {
      const verification = this.verification;
      if (!verification || verification.sending || verification.noOrdersFound) return;
      if (verification.verified && !this.editingContact) return;
      if (!this.canResendCode) return;

      this.syncOrderNumber();

      const channel = verification.selectedChannel;
      if (!channel) {
        verification.error = this.language === 'he'
          ? 'בחרו וואטסאפ או אימייל'
          : 'Choose WhatsApp or email';
        return;
      }

      let contact = this.contactValue;
      if (!contact) {
        verification.error = this.language === 'he'
          ? (channel === 'email' ? 'הזינו כתובת אימייל' : 'הזינו מספר טלפון')
          : (channel === 'email' ? 'Enter your email address' : 'Enter your phone number');
        return;
      }

      if (channel === 'whatsapp' && typeof this.normalizePhone === 'function') {
        const normalized = this.normalizePhone(contact);
        if (normalized) contact = normalized;
      }

      if (this.editingContact && this.contactEditSnapshot) {
        const previous = this.normalizeContactKey(
          this.snapshotContactValue(this.contactEditSnapshot),
          channel
        );
        const next = this.normalizeContactKey(contact, channel);
        if (previous && next && previous === next) {
          verification.error = this.sameContactError;
          return;
        }
      }

      if (channel === 'email' && !this.isValidEmail(contact)) {
        verification.error = this.language === 'he' ? 'כתובת האימייל אינה תקינה' : 'Invalid email address';
        return;
      }

      if (channel === 'whatsapp' && !this.isValidPhone(contact)) {
        verification.error = this.language === 'he' ? 'מספר הטלפון אינו תקין' : 'Invalid phone number';
        return;
      }

      if (!this.socket) {
        verification.error = this.language === 'he'
          ? 'החיבור לשרת אינו זמין. נסו שוב.'
          : 'Connection unavailable. Please try again.';
        return;
      }

      this.storeContactMask();
      this.exitEditAfterSend = Boolean(this.editingContact);
      verification.sending = true;
      verification.error = '';
      verification.pendingSendAt = Date.now();

      const clientId = this.getClientId();
      const data = {
        careRequestId: this.careRequestId,
        clientId,
        channel,
        resend: Boolean(options?.resend),
        order_number: verification.orderNumber || null,
        order_name: verification.orderName || null,
        verification_id: verification.verificationId || null,
        messageId: this.message?.id || this.message?.datetime || null,
      };

      if (channel === 'email') {
        data.email = contact;
      } else {
        data.phone = contact;
      }

      this.socket.emit('send-verification-code', data);
    },
    verifyCode() {
      const verification = this.verification;
      if (!verification || verification.verified || verification.verifying || verification.noOrdersFound) return;

      const code = String(verification.codeInput || '').trim();
      if (!code) {
        verification.error = this.language === 'he'
          ? 'הזינו את קוד האימות'
          : 'Enter the verification code';
        return;
      }

      if (!this.socket) {
        verification.error = this.language === 'he'
          ? 'החיבור לשרת אינו זמין. נסו שוב.'
          : 'Connection unavailable. Please try again.';
        return;
      }

      verification.verifying = true;
      verification.error = '';
      verification.pendingVerifyAt = Date.now();

      this.socket.emit('verify-verification-code', {
        careRequestId: this.careRequestId,
        code,
        target: 'orders',
        messageId: this.message?.id || this.message?.datetime || null,
      });
    },
  },
};
</script>

<style>
/* Local reset — App.vue's `.assis-plugin-root *` reset is scoped and does not
   reach this child, but also overrides this root's padding when it matches.
   Keep margin reset here; set padding with higher-specificity rules below. */
.assis-order-verification,
.assis-order-verification * {
  margin: 0;
  box-sizing: border-box;
  font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: normal;
}

.assis-order-verification button,
.assis-order-verification input,
.assis-order-verification ul,
.assis-order-verification li,
.assis-order-verification p {
  padding: 0;
}

.assis-plugin-root .assis-order-verification,
.assis-plugin-root div.assis-order-verification {
  width: min(300px, 100%);
  max-width: 100%;
  min-width: 0;
  /* Must beat App.vue scoped `.assis-plugin-root[data-v] * { padding: 0 }` (equal 0,2,0 otherwise). */
  padding: 4px;
  margin-bottom: 14px;
  box-sizing: border-box;
  animation: assis-agent-card-in 0.48s cubic-bezier(0.22, 1, 0.36, 1) both;
  overflow: visible;
}

.assis-order-verification:has(.ai-phone-input-group--prefix-open),
.assis-order-verification:has(.assis-order-verification-card--prefix-open) {
  overflow: visible;
  z-index: 20;
  position: relative;
}

.chat-container.assis-chat-v2.assis-chat-he-flip .assis-order-verification {
  margin-left: auto;
  margin-right: 0;
}

.chat-container.assis-chat-v2:not(.assis-chat-he-flip) .assis-order-verification {
  margin-left: 0;
  margin-right: auto;
}

.assis-order-verification[dir="rtl"] {
  text-align: right;
}

.assis-order-verification[dir="ltr"] {
  text-align: left;
}

.assis-plugin-root .assis-order-verification .assis-order-verification-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  width: 100%;
  min-height: 68px;
  margin: 0;
  /* Match orel + beat App.vue universal padding:0 (specificity 0,3,0 > 0,2,0). */
  padding: 8px 10px;
  box-sizing: border-box;
  border-radius: var(--assis-chat-card-radius, 16px);
  background: var(--assis-chat-card-bg, #ffffff);
  border: var(--assis-chat-card-border, 1px solid rgba(15, 23, 42, 0.06));
  box-shadow: var(--assis-chat-card-shadow, 0 4px 12px rgba(15, 23, 42, 0.06));
  transition: translate 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease, border-color 0.18s ease;
  overflow: hidden;
}

.assis-order-verification-card--verified {
  box-shadow: var(--assis-chat-card-shadow, 0 4px 12px rgba(15, 23, 42, 0.06));
}

.assis-order-verification-card--expired {
  background: #f8fafc;
  box-shadow: none;
}

.assis-order-verification-card--expired .assis-order-verification-title,
.assis-order-verification-card--expired .assis-order-verification-description {
  color: #64748b;
}

.assis-plugin-root .assis-order-verification .assis-order-verification-card--prefix-open,
.assis-order-verification-card--prefix-open {
  overflow: visible !important;
  z-index: 20;
}

.assis-order-verification-title-row {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  flex: 1 1 auto;
}

.assis-order-verification-title-icon {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: linear-gradient(145deg, #4f8ef7 0%, #1d6fee 100%);
  box-shadow: 0 3px 8px rgba(29, 111, 238, 0.28);
}

.assis-order-verification-title {
  margin: 0;
  flex: 1 1 auto;
  min-width: 0;
  font-size: 11.5px;
  font-weight: 650;
  letter-spacing: -0.01em;
  text-transform: none;
  line-height: 1.35;
  color: #1e293b;
}

.assis-order-verification-intro {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.assis-order-verification-intro .assis-order-verification-title-icon {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  color: #7c8593;
  background: #f3f1ec;
  box-shadow: none;
}

.assis-order-verification-intro .assis-order-verification-title {
  font-size: 11.5px;
  font-weight: 650;
  color: #1e293b;
}

.assis-plugin-root .assis-order-verification .assis-order-verification-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.assis-order-verification-description {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.45;
  color: #9ca3af;
  font-weight: 500;
}

.assis-plugin-root .assis-order-verification .assis-order-verification-segments {
  display: flex;
  gap: 0;
  padding: 2px;
  border-radius: 999px;
  background: #f3f1ec;
}

.assis-plugin-root .assis-order-verification .assis-order-verification-segment {
  appearance: none;
  flex: 1 1 0;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #9aa1ad;
  font-size: 10.5px;
  font-weight: 550;
  line-height: 1;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.assis-order-verification-segment svg {
  width: 11px;
  height: 11px;
  flex-shrink: 0;
}

.assis-plugin-root .assis-order-verification .assis-order-verification-segment:hover:not(:disabled) {
  color: #6b7280;
}

.assis-plugin-root .assis-order-verification .assis-order-verification-segment[data-active="true"] {
  background: #ffffff;
  color: #3a3f46;
  box-shadow: inset 0 0 0 1.5px rgba(15, 23, 42, 0.06);
}

.assis-plugin-root .assis-order-verification .assis-order-verification-segment:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.assis-order-verification-contact-panel {
  width: 100%;
}

/* Self-contained phone row: App.vue styles are scoped and do not reach this child. */
.assis-order-verification-phone-group {
  position: relative;
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 28px;
  min-height: 28px;
  min-width: 0;
  max-width: 100%;
  direction: ltr;
  border-radius: 999px;
  background: #f7f8fa;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
  overflow: visible;
  box-sizing: border-box;
}

.assis-order-verification-phone-group.ai-phone-input-group--valid,
.assis-order-verification-phone-group.ai-phone-input-group--invalid {
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
}

.assis-order-verification-phone-group .ai-phone-prefix-select {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  align-items: stretch;
  direction: ltr;
  line-height: 1;
}

.assis-plugin-root .assis-order-verification .assis-order-verification-phone-prefix-trigger {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  min-width: 58px;
  border: none;
  border-right: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px 0 0 999px;
  background: transparent;
  box-shadow: none;
  font-size: 11px;
  color: #111827;
  padding: 0 6px 0 8px;
  gap: 4px;
  cursor: pointer;
  font-family: inherit;
  line-height: 1;
}

.assis-order-verification-phone-group .assis-order-verification-phone-prefix-trigger .ai-phone-prefix-flag,
.assis-order-verification-phone-group .assis-order-verification-phone-prefix-trigger .ai-phone-prefix-flag-img {
  display: block;
  width: 16px;
  height: 12px;
  flex: 0 0 16px;
  object-fit: cover;
}

.assis-order-verification-phone-group .assis-order-verification-phone-prefix-trigger .ai-phone-prefix-code {
  font-size: 11px;
  color: #374151;
  white-space: nowrap;
  line-height: 1;
}

.assis-order-verification-phone-group .ai-phone-prefix-chevron {
  opacity: 0.45;
  flex: 0 0 auto;
}

.assis-plugin-root .assis-order-verification .assis-order-verification-phone-input {
  appearance: none;
  flex: 1 1 auto;
  min-width: 0;
  width: auto;
  height: 28px;
  border: none;
  border-radius: 0 999px 999px 0;
  background: transparent;
  box-shadow: none;
  padding: 0 10px 0 6px;
  margin: 0;
  font-size: 11.5px;
  color: #6b7280;
  font-family: inherit;
  line-height: 28px;
  outline: none;
  box-sizing: border-box;
}

.assis-order-verification-phone-group .assis-order-verification-phone-input:focus {
  outline: none;
  background: #ffffff;
}

.assis-order-verification-phone-group.ai-phone-input-group--prefix-open,
.assis-order-verification-phone-group:focus-within {
  background: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(29, 111, 238, 0.25);
}

.assis-order-verification-phone-prefix-dropdown {
  position: absolute;
  bottom: calc(100% + 4px);
  top: auto;
  left: 0;
  right: auto;
  width: min(300px, calc(100vw - 32px));
  min-width: 100%;
  max-height: 260px;
  z-index: 1200;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0;
  padding: 0;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
  direction: ltr;
  text-align: left;
  box-sizing: border-box;
}

.assis-plugin-root .assis-order-verification .ai-phone-prefix-search-wrap {
  flex: 0 0 auto;
  min-width: 0;
  padding: 8px;
  border-bottom: 1px solid #e5e7eb;
  overflow: hidden;
}

.assis-plugin-root .assis-order-verification .ai-phone-prefix-search {
  width: 100%;
  height: 28px;
  padding: 0 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 11px;
  color: #111827;
  outline: none;
  box-sizing: border-box;
  background: #ffffff;
  font-family: inherit;
}

.assis-order-verification-phone-prefix-dropdown .ai-phone-prefix-search::placeholder {
  color: #9ca3af;
}

.assis-order-verification-phone-prefix-dropdown .ai-phone-prefix-search:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.assis-plugin-root .assis-order-verification .ai-phone-prefix-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1 1 auto;
  min-height: 0;
}

.assis-plugin-root .assis-order-verification .ai-phone-prefix-empty {
  padding: 12px 10px;
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
}

.assis-plugin-root .assis-order-verification .ai-phone-prefix-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  font-size: 11px;
  color: #111827;
  cursor: pointer;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.assis-order-verification-phone-prefix-dropdown .ai-phone-prefix-option:hover,
.assis-order-verification-phone-prefix-dropdown .ai-phone-prefix-option.selected {
  background: #f3f4f6;
}

.assis-order-verification-phone-prefix-dropdown .ai-phone-prefix-flag-img {
  width: 16px;
  height: 12px;
  flex: 0 0 16px;
  object-fit: cover;
}

.assis-order-verification-phone-prefix-dropdown .ai-phone-prefix-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assis-plugin-root .assis-order-verification .assis-order-verification-contact-input {
  width: 100%;
  height: 28px;
  padding: 0 10px;
  border: none;
  border-radius: 999px;
  background: #f7f8fa;
  color: #6b7280;
  font-size: 11.5px;
  font-weight: 500;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
}

.assis-order-verification-contact-input::placeholder {
  color: #aeb6c0;
  opacity: 1;
}

.assis-order-verification-contact-input:focus {
  background: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(29, 111, 238, 0.25);
}

.assis-plugin-root .assis-order-verification .assis-order-verification-contact-input--locked,
.assis-plugin-root .assis-order-verification .assis-order-verification-contact-input:disabled,
.assis-plugin-root .assis-order-verification .assis-order-verification-phone-input--locked,
.assis-plugin-root .assis-order-verification .assis-order-verification-phone-input:disabled {
  color: #374151;
  background: #eef1f5;
  cursor: default;
  opacity: 1;
}

.assis-order-verification-phone-group--locked .assis-order-verification-phone-prefix-trigger:disabled {
  cursor: default;
  opacity: 1;
}

.assis-order-verification-send--cta {
  width: 100%;
  height: 28px;
  margin-top: 0;
  border-radius: 999px;
  border: none;
  background: #f3f1ec;
  color: #7c8593;
  font-size: 11px;
  font-weight: 550;
  letter-spacing: -0.01em;
  box-shadow: none;
}

.assis-order-verification-send--cta:not(:disabled) {
  background: linear-gradient(145deg, #4f8ef7 0%, #1d6fee 100%);
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(29, 111, 238, 0.24);
}

.assis-order-verification-send--cta:not(:disabled):hover {
  background: linear-gradient(145deg, #4588f5 0%, #1866e8 100%);
}

.assis-order-verification-send--cta:not(:disabled):active {
  background: #1a62db;
  box-shadow: 0 2px 8px rgba(29, 111, 238, 0.2);
}

.assis-order-verification-send:disabled,
.assis-order-verification-verify:disabled,
.assis-order-verification-resend:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.assis-order-verification-send,
.assis-order-verification-verify {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 9px;
  background: linear-gradient(145deg, #4f8ef7 0%, #1d6fee 100%);
  color: #ffffff;
  font-size: 11px;
  font-weight: 650;
  font-family: inherit;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(29, 111, 238, 0.24);
  transition: background 0.18s ease, scale 0.18s ease, box-shadow 0.18s ease;
}

.assis-order-verification-send {
  width: 100%;
  height: 28px;
  margin-top: 2px;
}

.assis-order-verification-send:hover:not(:disabled),
.assis-order-verification-verify:hover:not(:disabled) {
  background: #1557c0;
}

.assis-order-verification-send:active:not(:disabled),
.assis-order-verification-verify:active:not(:disabled) {
  scale: 0.96;
}

.assis-order-verification-code-panel {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-top: 1px;
  width: 100%;
}

.assis-order-verification-code-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.assis-plugin-root .assis-order-verification .assis-order-verification-code-input {
  flex: 1 1 auto;
  min-width: 0;
  height: 28px;
  padding: 0 10px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 9px;
  background: #f8f9fb;
  color: #3a3f46;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.06em;
  font-family: inherit;
  outline: none;
  box-shadow: none;
  text-align: left;
}

.assis-order-verification-code-input::placeholder {
  color: #aeb6c0;
  letter-spacing: normal;
}

.assis-order-verification-code-input:focus {
  background: #ffffff;
  border-color: rgba(29, 111, 238, 0.35);
  box-shadow: 0 0 0 3px rgba(29, 111, 238, 0.1);
}

.assis-plugin-root .assis-order-verification .assis-order-verification-verify {
  flex: 0 0 auto;
  width: auto;
  min-width: 64px;
  height: 28px;
  padding: 0 12px;
}

.assis-order-verification-resend {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  color: #1d6fee;
  font-size: 10.5px;
  font-weight: 550;
  cursor: pointer;
  font-family: inherit;
}

.assis-order-verification-code-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  width: 100%;
}

.assis-order-verification[dir="rtl"] .assis-order-verification-error,
.assis-order-verification[dir="ltr"] .assis-order-verification-error {
  align-self: flex-start;
  width: fit-content;
  max-width: 100%;
}

.assis-order-verification[dir="rtl"] .assis-order-verification-code-actions,
.assis-order-verification[dir="ltr"] .assis-order-verification-code-actions {
  align-items: flex-start;
}

.assis-order-verification[dir="rtl"] .assis-order-verification-resend {
  align-self: center;
  text-align: center;
}

.assis-order-verification[dir="ltr"] .assis-order-verification-resend {
  align-self: flex-start;
  text-align: left;
}

.assis-order-verification-resend:hover:not(:disabled),
.assis-order-verification-edit-contact:hover:not(:disabled) {
  text-decoration: underline;
}

.assis-order-verification-edit-contact {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  padding: 0;
  color: #1d6fee;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.assis-order-verification-edit-number {
  appearance: none;
  flex: 0 0 auto;
  align-self: center;
  width: 26px;
  height: 26px;
  margin-inline-end: 4px;
  border: none;
  border-radius: 999px;
  background: #e8f1ff;
  color: #1d6fee;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.assis-order-verification-edit-number:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.assis-order-verification-edit-contact:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.assis-order-verification-verified {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.assis-order-verification-doc-step {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 8px;
}

.assis-order-verification-doc-step + .assis-order-verification-verified {
  padding-top: 10px;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}

.assis-order-verification-change-contact {
  align-self: flex-start;
}

.assis-order-verification-cancel-edit {
  align-self: stretch;
  justify-content: center;
  margin-top: 2px;
  background: transparent;
  color: #64748b;
}

.assis-order-verification-cancel-edit:hover {
  background: rgba(15, 23, 42, 0.04);
  color: #334155;
}

.assis-order-verification-empty {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.assis-order-verification-verified .assis-order-verification-intro,
.assis-order-verification-empty .assis-order-verification-intro {
  /* flex-start follows dir: right in rtl, left in ltr */
  align-items: flex-start;
  text-align: start;
}

.assis-order-verification-verified-detail {
  width: 100%;
}

.assis-ltr-value {
  display: inline-block;
  direction: ltr;
  unicode-bidi: isolate;
  text-align: left;
}

.assis-order-verification-error {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.4;
  color: #dc2626;
}
</style>
