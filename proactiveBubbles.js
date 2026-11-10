const STORAGE_KEY = 'assisProactiveContext';
const PAGE_CAP = 12;
const COOLDOWN_MS = 20 * 60 * 1000;
const DEFAULT_DWELL_MS = 45000;
/** No click on proactive outside bubbles → fall back to configured (default/dynamic). */
const PROACTIVE_REVERT_MS = 45000;
const AI_BUBBLE_KEY = 'assisProactiveAiBubbles';
const AI_BUBBLE_TRIGGERS = new Set([
  'collection_help',
  'narrow_help',
]);
/** Welcome-back lines on home rotate while the shopper stays. */
const HOME_RETURN_ROTATE_MS = 8000;
const DEFAULT_HOME_RETURN = {
  he: [
    {
      text: '<p><strong style="font-size:12px;">עוד מתלבטים? 💙</strong></p><p><span style="font-size:10.5px;color:#9ca3af;">אפשר לחשוב על זה יחד</span></p>',
      lines: ['עוד מתלבטים? 💙', 'אפשר לחשוב על זה יחד'],
      clickable: false,
    },
    {
      text: '<p><strong style="font-size:12px;">מצאתם משהו שאהבתם? 🙂</strong></p><p><span style="font-size:10.5px;color:#9ca3af;">אני כאן לכל שאלה</span></p>',
      lines: ['מצאתם משהו שאהבתם? 🙂', 'אני כאן לכל שאלה'],
      clickable: false,
    },
    {
      text: '<p><strong style="font-size:12px;">בואו נמצא את מה שמתאים לכם 💙</strong></p><p><span style="font-size:10.5px;color:#9ca3af;">מה אתם מחפשים היום?</span></p>',
      lines: ['בואו נמצא את מה שמתאים לכם 💙', 'מה אתם מחפשים היום?'],
      clickable: false,
    },
  ],
  en: [
    {
      text: '<p><strong style="font-size:12px;">Still deciding? 💙</strong></p><p><span style="font-size:10.5px;color:#9ca3af;">We can think it through together</span></p>',
      lines: ['Still deciding? 💙', 'We can think it through together'],
      clickable: false,
    },
    {
      text: '<p><strong style="font-size:12px;">Found something you like? 🙂</strong></p><p><span style="font-size:10.5px;color:#9ca3af;">I am here for any question</span></p>',
      lines: ['Found something you like? 🙂', 'I am here for any question'],
      clickable: false,
    },
    {
      text: '<p><strong style="font-size:12px;">Let us find what fits you 💙</strong></p><p><span style="font-size:10.5px;color:#9ca3af;">What are you looking for today?</span></p>',
      lines: ['Let us find what fits you 💙', 'What are you looking for today?'],
      clickable: false,
    },
  ],
};

const COPY = {
  he: {
    cart_help: [
      { intro: ['רגע לפני שמסיימים?', 'נעזור לסיים את ההזמנה'], questions: ['איך מסיימים את ההזמנה?', 'כמה עולה המשלוח?'] },
      { intro: ['הסל עדיין כאן', 'רוצים עזרה קצרה?'], questions: ['יש משלוח חינם?', 'אפשר להוסיף קופון?'] },
    ],
    service_help: [
      { intro: ['צריכים עזרה עם ההזמנה?', 'נעזור עם משלוחים והחזרות'], questions: ['איך עוקבים אחרי הזמנה?', 'איך מחזירים מוצר?'] },
      { intro: ['שאלה על משלוח או החזרה?', 'אפשר להסביר בקצרה'], questions: ['תוך כמה זמן זה מגיע?', 'מה מדיניות ההחזרה?'] },
    ],
    product_revisit: [
      { intro: ['עוד מתלבטים לגבי {name}?', 'נעזור להחליט'], questions: ['זה מתאים לי?', 'מה כדאי לדעת לפני?'] },
      { intro: ['חזרתם ל{name}', 'אפשר לעזור לבחור'], questions: ['איך משתמשים בזה?', 'אפשר להשוות למוצר אחר?'] },
    ],
    product_dwell: [
      { intro: ['מתלבטים לגבי {name}?', 'נעזור לוודא שזה מתאים'], questions: ['זה מתאים לי?', 'איך משתמשים בזה?'] },
      { intro: ['מתעניינים ב{name}?', 'שאלה קצרה ואנחנו כאן'], questions: ['מה ההבדל מול דומים?', 'מה כדאי לדעת לפני?'] },
    ],
    compare_help: [
      { intro: ['מתלבטים בין כמה אפשרויות?', 'נעזור לבחור'], questions: ['מה ההבדל ביניהם?', 'מה יותר מתאים לי?'] },
      { intro: ['ראיתם כמה מוצרים', 'רוצים המלצה קצרה?'], questions: ['אפשר המלצה לפי הצורך?', 'מה הכי נמכר?'] },
    ],
    sale_help: [
      { intro: ['יש כאן מבצע', 'נעזור לבחור מה משתלם'], questions: ['מה הכי משתלם עכשיו?', 'עד מתי זה בתוקף?'] },
      { intro: ['שאלה על המבצע?', 'אפשר להסביר מה כלול'], questions: ['על אילו מוצרים זה חל?', 'אפשר לשלב עם קופון?'] },
    ],
    narrow_help: [
      { intro: ['הרבה אפשרויות ב{name}', 'נעזור לצמצם'], questions: ['איך בוחרים כאן?', 'מה כדאי להתחיל ממנו?'] },
      { intro: ['קשה לבחור ב{name}?', 'אפשר המלצה קצרה'], questions: ['מה מתאים לי?', 'מה ההבדל בין המוצרים?'] },
    ],
    collection_help: [
      { intro: ['מחפשים משהו ב{name}?', 'נעזור לבחור'], questions: ['איך בוחרים כאן?', 'מה מתאים לי?'] },
      { intro: ['מתלבטים ב{name}?', 'אפשר לעזור למצוא'], questions: ['מה ההבדל בין האפשרויות?', 'מה כדאי להתחיל ממנו?'] },
    ],
    search_help: [
      { intro: ['לא מצאתם בדיוק?', 'אפשר לדייק יחד'], questions: ['אפשר לדייק את החיפוש?', 'יש משהו דומה?'] },
      { intro: ['רוצים עזרה עם החיפוש?', 'תגידו מה חסר'], questions: ['אפשר המלצה לפי החיפוש?', 'מה הכי נמכר באתר?'] },
    ],
    returning: [
      { intro: ['כיף שחזרתם', 'ממשיכים מאיפה שעצרתם?'], questions: ['מה חדש מאז?', 'איפה ההזמנה שלי?'] },
      { intro: ['שוב כאן', 'יש משהו שחיפשתם?'], questions: ['אפשר המלצה?', 'מה סטטוס ההזמנה?'] },
    ],
    exit_help: [
      { intro: ['רגע לפני שיוצאים', 'יש עוד שאלה?'], questions: ['שאלה אחרונה?', 'אפשר לשמור את הסל?'] },
      { intro: ['הולכים כבר?', 'אפשר לעזור רגע'], questions: ['יש משלוח חינם?', 'אפשר עזרה קצרה?'] },
    ],
  },
  en: {
    cart_help: [
      { intro: ['Before you check out?', 'We can help finish the order'], questions: ['How do I finish the order?', 'How much is shipping?'] },
      { intro: ['Your bag is still here', 'Want a quick hand?'], questions: ['Is shipping free?', 'Can I use a code?'] },
    ],
    service_help: [
      { intro: ['Need help with an order?', 'We can cover shipping and returns'], questions: ['How do I track an order?', 'How do returns work?'] },
      { intro: ['A shipping or returns question?', 'We can explain quickly'], questions: ['How fast does it arrive?', 'What is the return policy?'] },
    ],
    product_revisit: [
      { intro: ['Still deciding on {name}?', 'We can help you choose'], questions: ['Is this right for me?', 'What should I know first?'] },
      { intro: ['Back on {name}', 'Ask anything short'], questions: ['How do I use this?', 'Can you compare it to another?'] },
    ],
    product_dwell: [
      { intro: ['Deciding on {name}?', 'We can check if it fits'], questions: ['Is this right for me?', 'How do I use this?'] },
      { intro: ['Looking at {name}?', 'A short question and we are here'], questions: ['How is it different?', 'What should I know first?'] },
    ],
    compare_help: [
      { intro: ['Stuck between a few?', 'We can help you pick'], questions: ['What is the difference?', 'Which one fits me?'] },
      { intro: ['You looked at a few', 'Want a short recommendation?'], questions: ['Can you recommend by need?', 'What is the best seller?'] },
    ],
    sale_help: [
      { intro: ['There is a sale on', 'We can help you choose'], questions: ['What is the best deal?', 'How long does it last?'] },
      { intro: ['A question about the sale?', 'We can say what is included'], questions: ['Which products are included?', 'Can I use a code too?'] },
    ],
    narrow_help: [
      { intro: ['A lot in {name}', 'We can narrow it down'], questions: ['How do I choose here?', 'What should I start with?'] },
      { intro: ['Hard to pick in {name}?', 'We can suggest one'], questions: ['What fits me?', 'What is the difference?'] },
    ],
    collection_help: [
      { intro: ['Looking for something in {name}?', 'We can help you choose'], questions: ['How do I choose here?', 'What fits me?'] },
      { intro: ['Deciding in {name}?', 'We can help you find it'], questions: ['What is the difference?', 'What should I start with?'] },
    ],
    search_help: [
      { intro: ['Not quite what you wanted?', 'We can narrow that down'], questions: ['Can you refine the search?', 'Anything similar?'] },
      { intro: ['Need a hand with the search?', 'Tell us what is missing'], questions: ['Can you recommend from my search?', 'What is the best seller?'] },
    ],
    returning: [
      { intro: ['Good to see you again', 'Pick up where you left off?'], questions: ['What is new?', 'Where is my order?'] },
      { intro: ['You are back', 'Looking for something?'], questions: ['Can you recommend something?', 'What is my order status?'] },
    ],
    exit_help: [
      { intro: ['Before you head out', 'One more question?'], questions: ['One last question?', 'Can you save my bag?'] },
      { intro: ['Leaving already?', 'We can help real quick'], questions: ['Is shipping free?', 'Can I get a quick hand?'] },
    ],
  },
};

function emptyProactiveContext() {
  return { pages: [], productCounts: {}, cooldowns: {}, copyIndex: {} };
}

export default {
  data() {
    return {
      proactiveTriggerId: '',
      proactiveOutsideBubbles: null,
    };
  },
  mounted() {
    this.recordProactivePage();
    this.refreshProactiveBubble();
    this.armProactiveDwell();
    this.armProactiveExit();
    this.armProactiveNavigation();
  },
  beforeUnmount() {
    this._proactiveGone = true;
    this.clearProactiveDwell();
    this.clearProactiveCopyRotation();
    this.clearProactiveRevertTimer();
    if (this._onProactiveExit) document.removeEventListener('mouseout', this._onProactiveExit);
    if (this._onProactiveNavigation) {
      window.removeEventListener('popstate', this._onProactiveNavigation);
      window.removeEventListener('assis:navigation', this._onProactiveNavigation);
    }
  },
  watch: {
    proactiveTriggers() {
      if (this.proactiveTriggerId && this.proactiveTriggerDisabled(this.proactiveTriggerId)) {
        this.proactiveTriggerId = '';
        this.proactiveOutsideBubbles = null;
        this.clearProactiveRevertTimer();
      }
      if (this._proactivePageRecorded) this.refreshProactiveBubble();
    },
  },
  methods: {
    proactiveTriggerDisabled(id) {
      const map = this.proactiveTriggers;
      if (!map || typeof map !== 'object') return false;
      // Timed AI nudges + welcome-back are independent of the Automatic bubbles master switch.
      if (id === 'site_entry' || id === 'idle_chat' || id === 'returning') return map[id] === false;
      if (map._enabled === false) return true;
      return map[id] === false;
    },
    /** Cross-session revisit, or same-session return to home after another page. */
    isProactiveHomeReturn(ctx, current) {
      if (this._pluginReturning) return true;
      const pages = Array.isArray(ctx?.pages) ? ctx.pages : [];
      if (pages.length < 2) return false;
      const key = current?.key || '';
      return pages.slice(0, -1).some((page) => (
        page && (page.type !== 'home' || String(page.key || '') !== key)
      ));
    },
    readProactiveContext() {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (!parsed || typeof parsed !== 'object') return emptyProactiveContext();
        return {
          pages: Array.isArray(parsed.pages) ? parsed.pages.slice(-PAGE_CAP) : [],
          productCounts: parsed.productCounts && typeof parsed.productCounts === 'object' ? parsed.productCounts : {},
          cooldowns: parsed.cooldowns && typeof parsed.cooldowns === 'object' ? parsed.cooldowns : {},
          copyIndex: parsed.copyIndex && typeof parsed.copyIndex === 'object' ? parsed.copyIndex : {},
        };
      } catch {
        return emptyProactiveContext();
      }
    },
    writeProactiveContext(ctx) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
      } catch {
        /* storage can be blocked */
      }
    },
    proactivePageKey() {
      const path = window.location.pathname || '/';
      let normalized = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
      // Decode %D7%9E… so backend collection_key matches Hebrew/Unicode handles.
      try {
        normalized = decodeURIComponent(normalized);
      } catch {
        /* keep encoded path */
      }
      let query = '';
      try {
        const params = new URLSearchParams(window.location.search);
        query = String(params.get('s') || params.get('q') || '').replace(/\s+/g, ' ').trim().slice(0, 80);
      } catch {
        query = '';
      }
      return query ? `${normalized}?q=${query}` : normalized;
    },
    proactiveHasHebrew(text) {
      return /[\u0590-\u05FF]/.test(String(text || ''));
    },
    proactiveLocalName(raw, fallbackHe, fallbackEn) {
      const he = this.language === 'he';
      let name = String(raw || '').split('|')[0].split(' - ')[0].trim().replace(/:\s*$/, '');
      if (name.length > 42) name = name.slice(0, 42).trim();
      if (he && name && !this.proactiveHasHebrew(name)) return fallbackHe;
      if (!he && name && this.proactiveHasHebrew(name) && !/[A-Za-z]/.test(name)) return fallbackEn;
      if (!name) return he ? fallbackHe : fallbackEn;
      return name;
    },
    proactiveProductName(title) {
      return this.proactiveLocalName(title, 'המוצר', 'this product');
    },
    proactiveCollectionName(title) {
      let name = String(title || '').split('|')[0].split(' - ')[0].trim().replace(/:\s*$/, '');
      const generic = /^(קולקציה|קטגוריה|collection|category|products)$/i;
      if (!name || generic.test(name)) {
        try {
          const slug = decodeURIComponent((window.location.pathname || '').split('/').filter(Boolean).pop() || '');
          name = slug.replace(/[-_]+/g, ' ').trim();
        } catch {
          name = '';
        }
      }
      return this.proactiveLocalName(name, 'הקטגוריה', 'this collection');
    },
    proactiveCooldownKey(id, pageKey) {
      return `${id}:${pageKey || this.proactivePageKey()}`;
    },
    recordProactivePage() {
      if (this._proactivePageRecorded) return this.readProactiveContext();
      this._proactivePageRecorded = true;
      const type = typeof this.pluginPageType === 'function' ? this.pluginPageType() : 'other';
      const key = this.proactivePageKey();
      let title = '';
      if (type === 'product' && typeof this.pluginProductTitleForCare === 'function') {
        title = this.pluginProductTitleForCare();
      } else if (type === 'collection' && typeof this.pluginCollectionTitleFromDocument === 'function') {
        title = this.pluginCollectionTitleFromDocument();
      } else if (typeof this.pluginPageTitleFromDocument === 'function') {
        title = this.pluginPageTitleFromDocument();
      }
      const ctx = this.readProactiveContext();
      const previous = ctx.pages[ctx.pages.length - 1];
      if (previous && previous.type === type && previous.key === key) {
        this._proactivePageType = type;
        this._proactivePageTitle = previous.title || title;
        this._proactiveLocation = `${window.location.pathname}${window.location.search}`;
        return ctx;
      }
      ctx.pages.push({ type, key, title: String(title || '').slice(0, 80) });
      if (ctx.pages.length > PAGE_CAP) ctx.pages = ctx.pages.slice(-PAGE_CAP);
      if (type === 'product') {
        ctx.productCounts[key] = (Number(ctx.productCounts[key]) || 0) + 1;
      }
      this.writeProactiveContext(ctx);
      this._proactivePageType = type;
      this._proactivePageTitle = title;
      this._proactiveLocation = `${window.location.pathname}${window.location.search}`;
      return ctx;
    },
    proactiveCollectionsWithoutProduct(pages) {
      let count = 0;
      for (let i = pages.length - 1; i >= 0; i -= 1) {
        if (pages[i].type === 'product') break;
        if (pages[i].type === 'collection') count += 1;
      }
      return count;
    },
    pickProactiveTrigger(ctx) {
      const now = Date.now();
      const pages = Array.isArray(ctx.pages) ? ctx.pages : [];
      const current = pages[pages.length - 1] || { type: this._proactivePageType || 'other', key: '' };
      const type = current.type || 'other';
      // Home: fixed Care bubbles, except a welcome-back intro for returning visitors.
      if (type === 'home') {
        if (this.proactiveTriggerDisabled('returning') || !this.isProactiveHomeReturn(ctx, current)) return '';
        const until = Number(ctx.cooldowns?.[this.proactiveCooldownKey('home_return', current.key)]) || 0;
        if (until > now && !(this.proactiveTriggerId === 'home_return' && current.key === this._proactiveShownPageKey)) return '';
        return 'home_return';
      }
      const productCount = Number(ctx.productCounts?.[current.key]) || 0;
      const distinctProducts = Object.keys(ctx.productCounts || {}).length;
      const checks = [
        type === 'cart' ? 'cart_help' : '',
        type === 'service' ? 'service_help' : '',
        type === 'product' && productCount >= 2 ? 'product_revisit' : '',
        type === 'product' ? 'product_dwell' : '',
        type === 'collection' && this.proactiveCollectionsWithoutProduct(pages) >= 2 ? 'narrow_help' : '',
        type === 'collection' ? 'collection_help' : '',
        type === 'search' ? 'search_help' : '',
        type === 'sale' ? 'sale_help' : '',
        distinctProducts >= 2 ? 'compare_help' : '',
        this._proactiveExitIntent ? 'exit_help' : '',
        'page_help',
      ];
      for (let i = 0; i < checks.length; i += 1) {
        const id = checks[i];
        if (!id) continue;
        if (this.proactiveTriggerDisabled(id)) continue;
        const until = Number(ctx.cooldowns?.[this.proactiveCooldownKey(id, current.key)]) || 0;
        if (until > now && !(id === this.proactiveTriggerId && current.key === this._proactiveShownPageKey)) continue;
        return id;
      }
      return '';
    },
    proactiveCopyVariants(id) {
      const lang = this.language === 'he' ? 'he' : 'en';
      const table = COPY[lang] || COPY.en;
      const variants = table[id];
      return Array.isArray(variants) && variants.length ? variants : [];
    },
    fillProactiveCopy(text, name) {
      return String(text || '').split('{name}').join(name);
    },
    clipProactiveLine(text, max) {
      const value = String(text || '').replace(/\s+/g, ' ').trim();
      if (value.length <= max) return value;
      return value.slice(0, max).trim();
    },
    proactivePageFacts() {
      const products = [];
      const seen = new Set();
      const add = (raw) => {
        const name = String(raw || '').replace(/\s+/g, ' ').trim();
        const key = name.toLowerCase();
        if (!name || name.length < 2 || name.length > 48 || seen.has(key)) return;
        if (this.language === 'he' && !this.proactiveHasHebrew(name)) return;
        if (this.language !== 'he' && this.proactiveHasHebrew(name) && !/[A-Za-z]/.test(name)) return;
        seen.add(key);
        products.push(name);
      };
      if (typeof document !== 'undefined') {
        [
          '.woocommerce-loop-product__title',
          '.product-card__title',
          '.card__heading a',
          '.card__heading',
          '.grid-product__title',
          '.product-item__title',
          '.product-title a',
        ].forEach((selector) => {
          if (products.length >= 4) return;
          document.querySelectorAll(selector).forEach((el) => {
            if (products.length >= 4) return;
            add(el.textContent);
          });
        });
        document.querySelectorAll('script[type="application/ld+json"]').forEach((node) => {
          if (products.length >= 4) return;
          try {
            const data = JSON.parse(node.textContent || '');
            const list = Array.isArray(data) ? data : [data];
            list.forEach((entry) => {
              if (!entry || typeof entry !== 'object') return;
              if (entry['@type'] === 'Product') add(entry.name);
              if (Array.isArray(entry.itemListElement)) {
                entry.itemListElement.forEach((item) => add(item?.item?.name || item?.name));
              }
            });
          } catch {
            /* a page can include broken json-ld */
          }
        });
      }
      let query = '';
      try {
        const params = new URLSearchParams(window.location.search || '');
        query = String(params.get('q') || params.get('s') || '').replace(/\s+/g, ' ').trim();
      } catch {
        query = '';
      }
      let blurb = '';
      if (typeof document !== 'undefined') {
        const meta = document.querySelector('meta[name="description"]');
        blurb = String(meta?.getAttribute('content') || '').replace(/\s+/g, ' ').trim().split('|')[0].trim();
      }
      return {
        products: products.slice(0, 4),
        query: query.slice(0, 32),
        blurb: blurb.slice(0, 80),
      };
    },
    proactiveContextVariants(id) {
      const he = this.language === 'he';
      const facts = this.proactivePageFacts();
      const topic = id === 'collection_help' || id === 'narrow_help'
        ? this.proactiveCollectionName(this._proactivePageTitle)
        : this.proactiveProductName(this._proactivePageTitle);
      const skip = new Set([String(topic || '').toLowerCase()]);
      const products = (facts.products || []).filter((item) => !skip.has(item.toLowerCase()));
      const first = products[0] || '';
      const second = products[1] || '';
      const short = (value, max) => this.clipProactiveLine(value, max);
      if ((id === 'collection_help' || id === 'narrow_help') && topic) {
        return [
          {
            intro: he
              ? [`מחפשים משהו ב${short(topic, 22)}?`, first ? `נעזור לבחור מתוך ${short(first, 18)}` : 'נעזור לבחור']
              : [`Looking for something in ${short(topic, 22)}?`, first ? `We can help pick from ${short(first, 18)}` : 'We can help you choose'],
            questions: [
              he ? `איך בוחרים ב${short(topic, 18)}?` : `How do I choose in ${short(topic, 18)}?`,
              first && second
                ? (he ? `${short(first, 12)} או ${short(second, 12)}?` : `${short(first, 12)} or ${short(second, 12)}?`)
                : (he ? 'מה מתאים לי?' : 'What fits me?'),
            ],
          },
          {
            intro: he
              ? [`מתלבטים ב${short(topic, 22)}?`, 'אפשר לעזור למצוא']
              : [`Deciding in ${short(topic, 22)}?`, 'We can help you find it'],
            questions: [
              he ? 'מה ההבדל בין האפשרויות?' : 'What is the difference?',
              he ? 'מה כדאי להתחיל ממנו?' : 'What should I start with?',
            ],
          },
        ];
      }
      if (id === 'product_dwell' || id === 'product_revisit') {
        return [
          {
            intro: he
              ? [`מתלבטים לגבי ${short(topic, 20)}?`, 'נעזור לוודא שזה מתאים']
              : [`Deciding on ${short(topic, 20)}?`, 'We can check if it fits'],
            questions: [
              he ? 'זה מתאים לי?' : 'Is this right for me?',
              he ? `איך משתמשים ב${short(topic, 14)}?` : `How do I use ${short(topic, 14)}?`,
            ],
          },
          {
            intro: he
              ? [`מתעניינים ב${short(topic, 18)}?`, 'שאלה קצרה ואנחנו כאן']
              : [`Looking at ${short(topic, 18)}?`, 'Ask anything short'],
            questions: [
              he ? 'מה כדאי לדעת לפני?' : 'What should I know first?',
              he ? 'מה ההבדל מול דומים?' : 'How is it different?',
            ],
          },
        ];
      }
      if (id === 'search_help' && facts.query) {
        const rawQuery = short(facts.query, 22);
        const queryOk = he ? this.proactiveHasHebrew(rawQuery) : !this.proactiveHasHebrew(rawQuery) || /[A-Za-z]/.test(rawQuery);
        if (!queryOk) return null;
        const query = rawQuery;
        return [
          {
            intro: he ? [`מחפשים ${query}?`, 'אפשר לדייק יחד'] : [`Looking for ${query}?`, 'We can narrow that down'],
            questions: [
              he ? `יש ${query} שמתאים לי?` : `Is there a ${query} that fits me?`,
              he ? 'מה דומה לחיפוש?' : 'Anything similar?',
            ],
          },
          {
            intro: he ? [`לא מצאתם ${query}?`, 'אפשר לנסות כיוון אחר'] : [`No ${query} yet?`, 'We can try another way'],
            questions: [
              he ? `אפשר המלצה ל${query}?` : `Can you recommend a ${query}?`,
              he ? 'מה הכי נמכר באתר?' : 'What is the best seller?',
            ],
          },
        ];
      }
      if (id === 'sale_help' && first) {
        return [
          {
            intro: he
              ? ['יש כאן מבצע', `כולל ${short(first, 22)}`]
              : ['There is a sale on', `It includes ${short(first, 22)}`],
            questions: [
              he ? `המבצע חל על ${short(first, 16)}?` : `Is ${short(first, 16)} in the sale?`,
              second
                ? (he ? `ועל ${short(second, 18)}?` : `And on ${short(second, 18)}?`)
                : (he ? 'עד מתי זה בתוקף?' : 'How long does it last?'),
            ],
          },
          {
            intro: he ? ['שאלה על המבצע?', 'אפשר להסביר מה כלול'] : ['A question about the sale?', 'I can say what is included'],
            questions: [
              he ? 'מה הכי משתלם עכשיו?' : 'What is the best deal?',
              he ? 'אפשר לשלב עם קופון?' : 'Can I use a code too?',
            ],
          },
        ];
      }
      if (id === 'page_help') {
        const rawTitle = String(this._proactivePageTitle || '').split('|')[0].trim();
        const title = rawTitle ? short(rawTitle, 24) : '';
        return [
          {
            intro: he
              ? [title ? `שאלה על ${title}?` : 'שאלה על העמוד?', first ? `יש כאן ${short(first, 22)}` : 'אפשר לעזור מכאן']
              : [title ? `A question about ${title}?` : 'A question about this page?', first ? `${short(first, 22)} is on this page` : 'I can help from here'],
            questions: [
              title
                ? (he ? `אפשר הסבר על ${short(title, 16)}?` : `Can you explain ${short(title, 16)}?`)
                : (he ? 'אפשר הסבר קצר?' : 'Can you explain this page?'),
              first
                ? (he ? `מה עם ${short(first, 18)}?` : `What about ${short(first, 18)}?`)
                : (he ? 'אפשר עזרה לבחור?' : 'Can you help me choose?'),
            ],
          },
          {
            intro: he
              ? [title ? `רוצים עזרה עם ${short(title, 16)}?` : 'רוצים עזרה בעמוד?', 'שאלה קצרה, ואני כאן']
              : [title ? `Need a hand with ${short(title, 16)}?` : 'Need a hand on this page?', 'Ask me anything short'],
            questions: [
              he ? 'מה כדאי לדעת כאן?' : 'What should I know here?',
              second
                ? (he ? `וגם ${short(second, 18)}?` : `And ${short(second, 18)}?`)
                : (he ? 'אפשר המלצה קצרה?' : 'Can you recommend something?'),
            ],
          },
        ];
      }
      return null;
    },
    proactiveShownVariants(id) {
      const aiKey = this.proactiveAiCacheKey(this.proactivePageKey());
      if (
        this._proactiveAiKey === aiKey
        && Array.isArray(this._proactiveAiVariants)
        && this._proactiveAiVariants.length >= 2
      ) {
        return this._proactiveAiVariants;
      }
      const cached = this.readProactiveAiCache(aiKey);
      if (cached?.variants?.length >= 2) {
        this._proactiveAiKey = aiKey;
        this._proactiveAiVariants = cached.variants;
        return cached.variants;
      }
      const contextual = this.proactiveContextVariants(id);
      if (contextual && contextual.length) return contextual;
      return this.proactiveCopyVariants(id);
    },
    proactiveAiCacheKey(pageKey) {
      const lang = this.language === 'he' ? 'he' : 'en';
      return `${lang}|${pageKey}`;
    },
    homeReturnPlainLines(text) {
      if (typeof this.stripQuickActionHtml === 'function') {
        const plain = this.stripQuickActionHtml(String(text || ''));
        return String(plain || '')
          .split(/\n+/)
          .map((line) => line.replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          .slice(0, 2);
      }
      return String(text || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .split(/\n+/)
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 2);
    },
    normalizeHomeReturnBubble(item, fallback) {
      const base = fallback && typeof fallback === 'object' ? fallback : { text: '', lines: [], clickable: false };
      if (Array.isArray(item)) {
        const lines = [String(item[0] || '').trim(), String(item[1] || '').trim()].filter(Boolean).slice(0, 2);
        if (!lines.length) return null;
        return {
          text: lines.join('\n'),
          lines,
          clickable: false,
          textToSendOnClick: '',
          icon: 'chat',
        };
      }
      if (!item || typeof item !== 'object') return null;
      if (item.line1 != null || item.line2 != null || (Array.isArray(item.lines) && !item.text)) {
        const fromLines = Array.isArray(item.lines) ? item.lines : [];
        const lines = [
          String(item.line1 ?? fromLines[0] ?? '').trim(),
          String(item.line2 ?? fromLines[1] ?? '').trim(),
        ].filter(Boolean).slice(0, 2);
        if (!lines.length) return null;
        return {
          text: lines.join('\n'),
          lines,
          clickable: !!item.clickable,
          textToSendOnClick: String(item.textToSendOnClick || '').trim(),
          icon: String(item.icon || 'chat'),
        };
      }
      const text = String(item.text || item.content || '').trim();
      if (!text) return null;
      const lines = Array.isArray(item.lines) && item.lines.length
        ? item.lines.map((line) => String(line || '').trim()).filter(Boolean).slice(0, 2)
        : this.homeReturnPlainLines(text);
      return {
        text,
        lines: lines.length ? lines : (base.lines || []),
        clickable: item.clickable === true || item.clickable === 'true' || item.clickable === 1 || item.clickable === '1',
        textToSendOnClick: String(item.textToSendOnClick || '').trim(),
        icon: String(item.icon || 'chat'),
      };
    },
    homeReturnBubbles() {
      const lang = this.language === 'he' ? 'he' : 'en';
      const defaults = DEFAULT_HOME_RETURN[lang] || DEFAULT_HOME_RETURN.en;
      const map = this.proactiveTriggers;
      const stored = map && typeof map === 'object' && map._welcome_back && typeof map._welcome_back === 'object'
        ? map._welcome_back[lang]
        : null;
      const source = Array.isArray(stored) && stored.length ? stored : defaults;
      const variants = [];
      source.forEach((item, index) => {
        const bubble = this.normalizeHomeReturnBubble(item, defaults[index] || defaults[0]);
        if (bubble && (bubble.text || (bubble.lines && bubble.lines.length))) variants.push(bubble);
      });
      return variants.length ? variants : defaults.slice();
    },
    applyHomeReturnBubble(pageKey, index = 0) {
      const variants = this.homeReturnBubbles();
      if (!variants.length) return;
      const chosen = variants[((Number(index) || 0) % variants.length + variants.length) % variants.length];
      const lines = Array.isArray(chosen.lines) && chosen.lines.length
        ? chosen.lines
        : this.homeReturnPlainLines(chosen.text);
      const intro = {
        text: chosen.text || lines.join('\n'),
        lines,
        clickable: !!chosen.clickable,
        textToSendOnClick: chosen.textToSendOnClick || '',
        icon: chosen.icon || 'chat',
      };
      const he = this.language === 'he';
      const byLang = this.pluginOutsideBubblesByLang || { he: [], en: [] };
      const configured = Array.isArray(byLang[he ? 'he' : 'en']) ? byLang[he ? 'he' : 'en'] : [];
      const rest = configured.filter((bubble) => bubble && String(bubble.text || '').trim()).slice(1);
      this.proactiveTriggerId = 'home_return';
      this._proactiveShownPageKey = pageKey;
      this._homeReturnIndex = ((Number(index) || 0) % variants.length + variants.length) % variants.length;
      this.proactiveOutsideBubbles = [intro, ...rest];
    },
    armHomeReturnRotation() {
      this.clearProactiveCopyRotation();
      const variants = this.homeReturnBubbles();
      if (variants.length < 2 || this.isChatOpen) return;
      this._proactiveCopyTimer = window.setInterval(() => {
        if (this._proactiveGone || this.isChatOpen || this.proactiveTriggerId !== 'home_return') {
          this.clearProactiveCopyRotation();
          return;
        }
        const next = ((Number(this._homeReturnIndex) || 0) + 1) % variants.length;
        this.applyHomeReturnBubble(this.proactivePageKey(), next);
      }, HOME_RETURN_ROTATE_MS);
    },
    readProactiveAiCache(key) {
      try {
        const raw = sessionStorage.getItem(AI_BUBBLE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        const entry = parsed && typeof parsed === 'object' ? parsed[key] : null;
        if (!entry || typeof entry !== 'object') return null;
        if (entry.miss) return { variants: null };
        if (entry.emptyUntil && Date.now() < Number(entry.emptyUntil)) return { variants: null };
        if (Array.isArray(entry.variants) && entry.variants.length >= 2) return { variants: entry.variants };
      } catch {
        /* storage can be blocked */
      }
      return null;
    },
    writeProactiveAiCache(key, value) {
      try {
        const raw = sessionStorage.getItem(AI_BUBBLE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        const next = parsed && typeof parsed === 'object' ? parsed : {};
        const keys = Object.keys(next);
        if (keys.length > 80) delete next[keys[0]];
        next[key] = value;
        sessionStorage.setItem(AI_BUBBLE_KEY, JSON.stringify(next));
      } catch {
        /* storage can be blocked */
      }
    },
    requestProactiveAiCopy(id, pageKey) {
      if (!AI_BUBBLE_TRIGGERS.has(id) || !this.ASSIS_BACKEND_URL || this._proactiveGone) return;
      const aiKey = this.proactiveAiCacheKey(pageKey);
      if (this._proactiveAiInflight === aiKey || this.readProactiveAiCache(aiKey)) return;
      this._proactiveAiInflight = aiKey;
      fetch(`${this.ASSIS_BACKEND_URL}/api/shopify/plugin-bubbles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          store_url: window.location.origin,
          language: this.language === 'he' ? 'he' : 'en',
          trigger_id: id,
          page_type: this._proactivePageType || '',
          page_path: pageKey,
        }),
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (this._proactiveGone) return;
          const variants = this.sanitizeProactiveAiVariants(data?.variants);
          if (!variants) {
            this.writeProactiveAiCache(aiKey, { miss: true });
            return;
          }
          this.writeProactiveAiCache(aiKey, { variants });
          if (
            !this.showQuickActions
            || this.isChatOpen
            || this.proactiveTriggerId !== id
            || this.proactivePageKey() !== pageKey
          ) return;
          this._proactiveAiKey = aiKey;
          this._proactiveAiVariants = variants;
          if (this._proactiveShownPageKey === pageKey && Array.isArray(this.proactiveOutsideBubbles)) return;
          this.applyProactiveCopy(id, variants[0], pageKey);
        })
        .catch(() => {
          if (!this._proactiveGone) {
            this.writeProactiveAiCache(aiKey, { emptyUntil: Date.now() + (10 * 60 * 1000) });
          }
        })
        .finally(() => {
          if (this._proactiveAiInflight === aiKey) this._proactiveAiInflight = '';
        });
    },
    sanitizeProactiveAiVariants(list) {
      if (!Array.isArray(list)) return null;
      const line = (value) => String(value || '').replace(/<[^>]+>/g, ' ').replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 72);
      const variants = [];
      list.forEach((item) => {
        if (!item || typeof item !== 'object') return;
        const intro = Array.isArray(item.intro) ? item.intro : [];
        const questions = Array.isArray(item.questions) ? item.questions : [];
        const first = line(intro[0]);
        const second = line(intro[1]);
        const q1 = line(questions[0]);
        const q2 = line(questions[1]);
        if (!first || !second || !q1 || !q2) return;
        variants.push({ intro: [first, second], questions: [q1, q2] });
      });
      return variants.length >= 2 ? variants.slice(0, 2) : null;
    },
    refreshProactiveBubble() {
      const ctx = this.readProactiveContext();
      const id = this.pickProactiveTrigger(ctx);
      const pageKey = this.proactivePageKey();
      if (!id) {
        this.proactiveTriggerId = '';
        this.proactiveOutsideBubbles = null;
        this._proactiveShownPageKey = pageKey;
        this.clearProactiveCopyRotation();
        this.clearProactiveRevertTimer();
        return;
      }
      if (id === 'home_return') {
        const same = id === this.proactiveTriggerId
          && pageKey === this._proactiveShownPageKey
          && Array.isArray(this.proactiveOutsideBubbles);
        if (!same) {
          this.applyHomeReturnBubble(pageKey, this._homeReturnIndex || 0);
          this.armHomeReturnRotation();
        } else if (!this._proactiveCopyTimer) {
          this.armHomeReturnRotation();
        }
        return;
      }
      if (
        id === this.proactiveTriggerId
        && pageKey === this._proactiveShownPageKey
        && Array.isArray(this.proactiveOutsideBubbles)
      ) return;
      const variants = this.proactiveShownVariants(id);
      if (!variants.length) return;
      this.applyProactiveCopy(id, variants[0], pageKey);
      this.clearProactiveCopyRotation();
      const aiKey = this.proactiveAiCacheKey(pageKey);
      if (this._proactiveAiKey !== aiKey) this.requestProactiveAiCopy(id, pageKey);
    },
    applyProactiveCopy(id, chosen, pageKey) {
      const name = id === 'collection_help' || id === 'narrow_help'
        ? this.proactiveCollectionName(this._proactivePageTitle)
        : this.proactiveProductName(this._proactivePageTitle);
      const questions = Array.isArray(chosen.questions) ? chosen.questions : [];
      const introLines = (Array.isArray(chosen.intro) ? chosen.intro : [chosen.intro])
        .map((line) => this.fillProactiveCopy(line, name))
        .filter(Boolean)
        .slice(0, 2);
      this.proactiveTriggerId = id;
      this._proactiveShownPageKey = pageKey;
      this.proactiveOutsideBubbles = [
        { text: introLines.join('\n'), lines: introLines, clickable: false },
        ...questions.slice(0, 2).map((question) => {
          const text = this.fillProactiveCopy(question, name);
          return { text, clickable: true, textToSendOnClick: text };
        }),
      ];
      this.armProactiveRevertToConfigured();
    },
    clearProactiveCopyRotation() {
      if (!this._proactiveCopyTimer) return;
      window.clearInterval(this._proactiveCopyTimer);
      this._proactiveCopyTimer = 0;
    },
    clearProactiveRevertTimer() {
      if (!this._proactiveRevertTimer) return;
      window.clearTimeout(this._proactiveRevertTimer);
      this._proactiveRevertTimer = 0;
    },
    /** After 45s without a click, drop proactive copy and show configured bubbles again. */
    armProactiveRevertToConfigured() {
      this.clearProactiveRevertTimer();
      if (!Array.isArray(this.proactiveOutsideBubbles) || !this.proactiveOutsideBubbles.length) return;
      if (this.isChatOpen) return;
      this._proactiveRevertTimer = window.setTimeout(() => {
        this._proactiveRevertTimer = 0;
        this.revertProactiveToConfigured();
      }, PROACTIVE_REVERT_MS);
    },
    revertProactiveToConfigured() {
      if (this.isChatOpen) {
        this.clearProactiveRevertTimer();
        return;
      }
      // Idle follow-up replies own the outside stack — leave them; clear proactive underneath.
      const id = this.proactiveTriggerId;
      if (id) this.cooldownProactiveTrigger(id);
      this.proactiveTriggerId = '';
      this.proactiveOutsideBubbles = null;
      this.clearProactiveCopyRotation();
      this.clearProactiveRevertTimer();
    },
    cooldownProactiveTrigger(id) {
      if (!id) return;
      this.clearProactiveRevertTimer();
      const ctx = this.readProactiveContext();
      ctx.cooldowns[this.proactiveCooldownKey(id, this._proactiveShownPageKey)] = Date.now() + COOLDOWN_MS;
      this.writeProactiveContext(ctx);
    },
    armProactiveDwell() {
      if (this._proactivePageType !== 'product' || this._proactiveDwellReady) return;
      this.clearProactiveDwell();
      const ms = typeof this.proactiveDelayMs === 'function'
        ? this.proactiveDelayMs('product_dwell', DEFAULT_DWELL_MS / 1000)
        : DEFAULT_DWELL_MS;
      if (ms <= 0) {
        this._proactiveDwellReady = true;
        if (this.showQuickActions) this.refreshProactiveBubble();
        return;
      }
      this._proactiveDwellTimer = window.setTimeout(() => {
        this._proactiveDwellReady = true;
        if (this.showQuickActions) this.refreshProactiveBubble();
      }, ms);
    },
    clearProactiveDwell() {
      if (!this._proactiveDwellTimer) return;
      window.clearTimeout(this._proactiveDwellTimer);
      this._proactiveDwellTimer = 0;
    },
    armProactiveNavigation() {
      if (!window.__assisProactiveHistoryPatched) {
        window.__assisProactiveHistoryPatched = true;
        ['pushState', 'replaceState'].forEach((method) => {
          const original = history[method];
          if (typeof original !== 'function') return;
          history[method] = function proactiveHistoryPatch(...args) {
            const result = original.apply(this, args);
            window.dispatchEvent(new Event('assis:navigation'));
            return result;
          };
        });
      }
      this._onProactiveNavigation = () => {
        const here = `${window.location.pathname}${window.location.search}`;
        if (here === this._proactiveLocation) return;
        this._proactivePageRecorded = false;
        this._proactiveDwellReady = false;
        this.proactiveTriggerId = '';
        this.proactiveOutsideBubbles = null;
        this.clearProactiveDwell();
        this.clearProactiveRevertTimer();
        this.recordProactivePage();
        this.refreshProactiveBubble();
        this.armProactiveDwell();
        if (!this.isChatOpen) this.showQuickActions = true;
      };
      window.addEventListener('popstate', this._onProactiveNavigation);
      window.addEventListener('assis:navigation', this._onProactiveNavigation);
    },
    armProactiveExit() {
      this._onProactiveExit = (event) => {
        if (event.relatedTarget || event.clientY > 0) return;
        if (this._proactiveExitIntent || !this.showQuickActions) return;
        this._proactiveExitIntent = true;
        this.refreshProactiveBubble();
      };
      document.addEventListener('mouseout', this._onProactiveExit);
    },
  },
};
