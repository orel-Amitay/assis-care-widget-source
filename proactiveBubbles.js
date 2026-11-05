const STORAGE_KEY = 'assisProactiveContext';
const PAGE_CAP = 12;
const COOLDOWN_MS = 20 * 60 * 1000;
const DWELL_MS = 45000;
const COPY_ROTATE_MS = 8000;
const AI_BUBBLE_KEY = 'assisProactiveAiBubbles';
const AI_BUBBLE_TRIGGERS = new Set([
  'collection_help',
  'narrow_help',
  'product_dwell',
  'product_revisit',
]);

const COPY = {
  he: {
    cart_help: [
      { intro: ['רגע לפני שמסיימים?', 'יש שאלה על ההזמנה?'], questions: ['איך מסיימים את ההזמנה?', 'כמה עולה המשלוח?'] },
      { intro: ['הסל עדיין כאן', 'רוצים עזרה לסיים?'], questions: ['יש משלוח חינם?', 'אפשר להוסיף קופון?'] },
    ],
    service_help: [
      { intro: ['צריכים עזרה כאן?', 'אפשר להסביר בקצרה'], questions: ['איך המשלוח עובד?', 'איך מחזירים מוצר?'] },
      { intro: ['שאלה על המשלוח?', 'או על החזרה, מה שצריך'], questions: ['תוך כמה זמן זה מגיע?', 'מה קורה אם לא מתאים?'] },
    ],
    product_revisit: [
      { intro: ['חזרתם ל{name}', 'עוד מתלבטים?'], questions: ['זה מתאים לי?', 'אפשר להשוות למוצר אחר?'] },
      { intro: ['עדיין על {name}?', 'אפשר לעזור להחליט'], questions: ['מה כדאי לדעת לפני?', 'יש משלוח חינם?'] },
    ],
    product_dwell: [
      { intro: ['שאלה על {name}?', 'אפשר לעזור לבחור'], questions: ['זה מתאים לי?', 'תוך כמה זמן זה מגיע?'] },
      { intro: ['רוצים עזרה עם {name}?', 'שאלה קצרה, ואני כאן'], questions: ['מה ההבדל מול דומים?', 'איך משתמשים בזה?'] },
    ],
    compare_help: [
      { intro: ['מתלבטים בין כמה?', 'אפשר לעזור לבחור'], questions: ['מה ההבדל ביניהם?', 'מה יותר מתאים לי?'] },
      { intro: ['ראיתם כמה מוצרים', 'רוצים המלצה?'], questions: ['אפשר המלצה קצרה?', 'מה הכי נמכר?'] },
    ],
    sale_help: [
      { intro: ['יש כאן מבצע', 'רוצים עזרה לבחור?'], questions: ['מה הכי משתלם עכשיו?', 'עד מתי זה בתוקף?'] },
      { intro: ['שאלה על המבצע?', 'אפשר להסביר מה כלול'], questions: ['על אילו מוצרים זה חל?', 'אפשר לשלב עם קופון?'] },
    ],
    narrow_help: [
      { intro: ['הרבה אפשרויות ב{name}', 'רוצים לצמצם?'], questions: ['מה הכי נמכר כאן?', 'מה כדאי להתחיל ממנו?'] },
      { intro: ['קשה לבחור מ{name}?', 'אפשר המלצה קצרה'], questions: ['מה מתאים למתחילים?', 'מה ההבדל בין המוצרים?'] },
    ],
    collection_help: [
      { intro: ['מחפשים משהו ב{name}?', 'אפשר לעזור לבחור'], questions: ['מה הכי נמכר כאן?', 'מה מתאים לי?'] },
      { intro: ['שאלה על {name}?', 'אפשר לעזור למצוא'], questions: ['מה יש בקטגוריה?', 'מה הכי מתאים לי?'] },
    ],
    search_help: [
      { intro: ['לא מצאתם בדיוק?', 'אפשר לנסות כיוון אחר'], questions: ['אפשר לדייק את החיפוש?', 'יש משהו דומה?'] },
      { intro: ['רוצים עזרה עם החיפוש?', 'תגידו מה חסר'], questions: ['אפשר המלצה לפי החיפוש?', 'מה הכי נמכר באתר?'] },
    ],
    returning: [
      { intro: ['כיף שחזרתם', 'ממשיכים מאיפה שעצרתם?'], questions: ['מה חדש מאז?', 'איפה ההזמנה שלי?'] },
      { intro: ['היי, שוב כאן', 'יש משהו שחיפשתם?'], questions: ['אפשר המלצה?', 'מה סטטוס ההזמנה?'] },
    ],
    exit_help: [
      { intro: ['רגע לפני שיוצאים', 'יש עוד שאלה?'], questions: ['שאלה אחרונה?', 'אפשר לשמור את הסל?'] },
      { intro: ['הולכים כבר?', 'אפשר לעזור רגע'], questions: ['יש משלוח חינם?', 'אפשר עזרה קצרה?'] },
    ],
  },
  en: {
    cart_help: [
      { intro: ['Before you check out?', 'Anything I can help with?'], questions: ['How do I finish the order?', 'How much is shipping?'] },
      { intro: ['Your bag is still here', 'Want a hand finishing?'], questions: ['Is shipping free?', 'Can I use a code?'] },
    ],
    service_help: [
      { intro: ['Need a hand here?', 'I can explain it quickly'], questions: ['How does shipping work?', 'How do returns work?'] },
      { intro: ['A question about shipping?', 'Or returns, whatever you need'], questions: ['How fast does it arrive?', 'What if it is not right?'] },
    ],
    product_revisit: [
      { intro: ['Back on {name}', 'Still deciding?'], questions: ['Is this right for me?', 'Can you compare it to another?'] },
      { intro: ['Still on {name}?', 'I can help you decide'], questions: ['What should I know first?', 'Is shipping free?'] },
    ],
    product_dwell: [
      { intro: ['A question about {name}?', 'I can help you choose'], questions: ['Is this right for me?', 'How fast does it ship?'] },
      { intro: ['Need a hand with {name}?', 'Ask me anything short'], questions: ['How is it different?', 'How do I use it?'] },
    ],
    compare_help: [
      { intro: ['Stuck between a few?', 'I can help you pick'], questions: ['What is the difference?', 'Which one fits me?'] },
      { intro: ['You looked at a few', 'Want a recommendation?'], questions: ['Can you recommend one?', 'What is the best seller?'] },
    ],
    sale_help: [
      { intro: ['There is a sale on', 'Want help choosing?'], questions: ['What is the best deal?', 'How long does it last?'] },
      { intro: ['A question about the sale?', 'I can say what is included'], questions: ['Which products are included?', 'Can I use a code too?'] },
    ],
    narrow_help: [
      { intro: ['A lot in {name}', 'Want to narrow it down?'], questions: ['What sells the most here?', 'What should I start with?'] },
      { intro: ['Hard to pick from {name}?', 'I can suggest one'], questions: ['What is good to start with?', 'What is the difference?'] },
    ],
    collection_help: [
      { intro: ['Looking for something in {name}?', 'I can help you choose'], questions: ['What sells the most here?', 'What fits me?'] },
      { intro: ['A question about {name}?', 'I can help you find it'], questions: ['What is in this category?', 'What fits me best?'] },
    ],
    search_help: [
      { intro: ['Not quite what you wanted?', 'I can try another way'], questions: ['Can you narrow the search?', 'Anything similar?'] },
      { intro: ['Need a hand with the search?', 'Tell me what is missing'], questions: ['Can you recommend from my search?', 'What is the best seller?'] },
    ],
    returning: [
      { intro: ['Good to see you again', 'Pick up where you left off?'], questions: ['What is new?', 'Where is my order?'] },
      { intro: ['Hey, you are back', 'Looking for something?'], questions: ['Can you recommend something?', 'What is my order status?'] },
    ],
    exit_help: [
      { intro: ['Before you head out', 'One more question?'], questions: ['One last question?', 'Can you save my bag?'] },
      { intro: ['Leaving already?', 'I can help real quick'], questions: ['Is shipping free?', 'Can I get a quick hand?'] },
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
    this.armProactiveCopyRotation();
  },
  beforeUnmount() {
    this._proactiveGone = true;
    this.clearProactiveDwell();
    this.clearProactiveCopyRotation();
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
      }
      if (this._proactivePageRecorded) this.refreshProactiveBubble();
    },
  },
  methods: {
    proactiveTriggerDisabled(id) {
      const map = this.proactiveTriggers;
      if (!map || typeof map !== 'object') return false;
      if (map._enabled === false) return true;
      return map[id] === false;
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
      const normalized = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
      let query = '';
      try {
        const params = new URLSearchParams(window.location.search);
        query = String(params.get('s') || params.get('q') || '').replace(/\s+/g, ' ').trim().slice(0, 80);
      } catch {
        query = '';
      }
      return query ? `${normalized}?q=${query}` : normalized;
    },
    proactiveProductName(title) {
      let name = String(title || '').split('|')[0].trim();
      if (!name) return this.language === 'he' ? 'המוצר' : 'this product';
      if (name.length > 42) name = name.slice(0, 42).trim();
      return name;
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
      if (!name) return this.language === 'he' ? 'הקולקציה' : 'this collection';
      if (name.length > 42) name = name.slice(0, 42).trim();
      return name;
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
      if (type === 'home') {
        if (!this._pluginReturning || this.proactiveTriggerDisabled('returning')) return '';
        const until = Number(ctx.cooldowns?.[this.proactiveCooldownKey('home_return', current.key)]) || 0;
        if (until > now && !(this.proactiveTriggerId === 'home_return' && current.key === this._proactiveShownPageKey)) return '';
        return 'home_return';
      }
      const productCount = Number(ctx.productCounts?.[current.key]) || 0;
      const distinctProducts = Object.keys(ctx.productCounts || {}).length;
      if (
        type === 'product'
        && productCount < 2
        && !this._proactiveDwellReady
        && !this.proactiveTriggerDisabled('product_dwell')
      ) {
        return '';
      }
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
        this._pluginReturning ? 'returning' : '',
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
              ? [`מחפשים ${short(topic, 24)}?`, first ? `יש כאן ${short(first, 22)}` : 'אפשר לעזור לבחור']
              : [`Looking for ${short(topic, 24)}?`, first ? `${short(first, 22)} is in here` : 'I can help you choose'],
            questions: [
              he ? `איך בוחרים ${short(topic, 20)}?` : `How do I choose ${short(topic, 20)}?`,
              first
                ? (he ? `מה מתאים מ${short(first, 18)}?` : `Does ${short(first, 18)} fit me?`)
                : (he ? `מה כלול ב${short(topic, 18)}?` : `What is in ${short(topic, 18)}?`),
            ],
          },
          {
            intro: he
              ? [`שאלה על ${short(topic, 22)}?`, second ? `גם ${short(second, 20)} כאן` : 'אפשר לעזור למצוא']
              : [`A question about ${short(topic, 22)}?`, second ? `${short(second, 20)} is here too` : 'I can help you find it'],
            questions: [
              first && second
                ? (he ? `${short(first, 14)} או ${short(second, 14)}?` : `${short(first, 14)} or ${short(second, 14)}?`)
                : (he ? `מה כלול ב${short(topic, 18)}?` : `What is included in ${short(topic, 18)}?`),
              he ? 'תוך כמה זמן זה מגיע?' : 'How fast does it arrive?',
            ],
          },
        ];
      }
      if (id === 'product_dwell' || id === 'product_revisit') {
        const blurb = facts.blurb && facts.blurb.toLowerCase() !== String(topic || '').toLowerCase()
          ? short(facts.blurb, 42)
          : '';
        return [
          {
            intro: he
              ? [`שאלה על ${short(topic, 22)}?`, blurb || 'אפשר לעזור לבחור']
              : [`A question about ${short(topic, 22)}?`, blurb || 'I can help you choose'],
            questions: [
              he ? `איך משתמשים ב${short(topic, 16)}?` : `How do I use ${short(topic, 16)}?`,
              he ? 'זה מתאים לי?' : 'Is this right for me?',
            ],
          },
          {
            intro: he
              ? [`רוצים עזרה עם ${short(topic, 16)}?`, 'שאלה קצרה, ואני כאן']
              : [`Need a hand with ${short(topic, 16)}?`, 'Ask me anything short'],
            questions: [
              he ? `מה כדאי לדעת על ${short(topic, 14)}?` : `What should I know about ${short(topic, 14)}?`,
              he ? 'תוך כמה זמן זה מגיע?' : 'How fast does it arrive?',
            ],
          },
        ];
      }
      if (id === 'search_help' && facts.query) {
        const query = short(facts.query, 22);
        return [
          {
            intro: he ? [`מחפשים ${query}?`, 'אפשר לדייק את זה'] : [`Looking for ${query}?`, 'I can narrow that down'],
            questions: [
              he ? `יש ${query} שמתאים לי?` : `Is there a ${query} that fits me?`,
              he ? 'מה דומה לחיפוש?' : 'Anything similar?',
            ],
          },
          {
            intro: he ? [`לא מצאתם ${query}?`, 'אפשר לנסות כיוון אחר'] : [`No ${query} yet?`, 'I can try another way'],
            questions: [
              he ? `אפשר המלצה ל${query}?` : `Can you recommend a ${query}?`,
              he ? 'תוך כמה זמן זה מגיע?' : 'How fast does it arrive?',
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
          const ctx = this.readProactiveContext();
          ctx.copyIndex[id] = 1;
          this.writeProactiveContext(ctx);
          this.applyProactiveCopy(id, variants[0], pageKey);
          this.armProactiveCopyRotation();
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
        return;
      }
      if (id === 'home_return') {
        this.proactiveTriggerId = id;
        this._proactiveShownPageKey = pageKey;
        this.proactiveOutsideBubbles = this.homeReturnBubbles();
        this.clearProactiveCopyRotation();
        return;
      }
      if (
        id === this.proactiveTriggerId
        && pageKey === this._proactiveShownPageKey
        && Array.isArray(this.proactiveOutsideBubbles)
      ) return;
      const variants = this.proactiveShownVariants(id);
      if (!variants.length) return;
      const index = Number(ctx.copyIndex?.[id]) || 0;
      const chosen = variants[index % variants.length];
      ctx.copyIndex[id] = index + 1;
      this.writeProactiveContext(ctx);
      this.applyProactiveCopy(id, chosen, pageKey);
      this.armProactiveCopyRotation();
      const aiKey = this.proactiveAiCacheKey(pageKey);
      if (this._proactiveAiKey !== aiKey) this.requestProactiveAiCopy(id, pageKey);
    },
    homeReturnBubbles() {
      const he = this.language === 'he';
      const lines = he
        ? ['היי, איזה כיף שחזרתם 🙂', 'אפשר לעזור עם משהו?']
        : ['Hey, so glad you are back 🙂', 'Want a hand with something?'];
      const intro = { text: lines.join('\n'), lines, clickable: false };
      const byLang = this.pluginOutsideBubblesByLang || { he: [], en: [] };
      const configured = Array.isArray(byLang[he ? 'he' : 'en']) ? byLang[he ? 'he' : 'en'] : [];
      const rest = configured.filter((bubble) => bubble && String(bubble.text || '').trim()).slice(1);
      return [intro, ...rest];
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
    },
    armProactiveCopyRotation() {
      this.clearProactiveCopyRotation();
      const variants = this.proactiveShownVariants(this.proactiveTriggerId);
      if (!variants || variants.length < 2) return;
      this._proactiveCopyTimer = window.setInterval(() => {
        this.rotateProactiveCopy();
      }, COPY_ROTATE_MS);
    },
    clearProactiveCopyRotation() {
      if (!this._proactiveCopyTimer) return;
      window.clearInterval(this._proactiveCopyTimer);
      this._proactiveCopyTimer = 0;
    },
    rotateProactiveCopy() {
      if (!this.showQuickActions || this.isChatOpen) return;
      const id = this.proactiveTriggerId;
      if (!id || this.proactivePageKey() !== this._proactiveShownPageKey) return;
      const variants = this.proactiveShownVariants(id);
      if (!variants || variants.length < 2) return;
      const ctx = this.readProactiveContext();
      const index = Number(ctx.copyIndex?.[id]) || 0;
      const chosen = variants[index % variants.length];
      ctx.copyIndex[id] = index + 1;
      this.writeProactiveContext(ctx);
      this.applyProactiveCopy(id, chosen, this._proactiveShownPageKey);
    },
    cooldownProactiveTrigger(id) {
      if (!id) return;
      const ctx = this.readProactiveContext();
      ctx.cooldowns[this.proactiveCooldownKey(id, this._proactiveShownPageKey)] = Date.now() + COOLDOWN_MS;
      this.writeProactiveContext(ctx);
    },
    armProactiveDwell() {
      if (this._proactivePageType !== 'product' || this._proactiveDwellReady) return;
      this.clearProactiveDwell();
      this._proactiveDwellTimer = window.setTimeout(() => {
        this._proactiveDwellReady = true;
        if (this.showQuickActions) this.refreshProactiveBubble();
      }, DWELL_MS);
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
        this.clearProactiveDwell();
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
