/**
 * I18n - Simple internationalization for KidsTimer.
 * Loads JSON translation files from lang/ directory.
 * Supported languages: 'de', 'en'. Default: 'de'.
 */
const I18n = {
  translations: {},
  lang: 'de',
  supported: ['de', 'en'],

  async init() {
    const stored = localStorage.getItem('kidstimer-lang');
    const browserLang = (navigator.language || '').split('-')[0];
    this.lang = stored || (this.supported.includes(browserLang) ? browserLang : 'de');

    const response = await fetch('lang/' + this.lang + '.json');
    this.translations = await response.json();

    document.documentElement.lang = this.lang;
    this.applyToDOM();
  },

  t(key) {
    return this.translations[key] || key;
  },

  applyToDOM() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = I18n.t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.placeholder = I18n.t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.title = I18n.t(el.dataset.i18nTitle);
    });
  }
};
