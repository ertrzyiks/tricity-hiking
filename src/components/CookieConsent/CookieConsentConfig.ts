export const config = {
  categories: {
    necessary: {
      readOnly: true,
    },
    analytics: {},
  },

  language: {
    default: "en",
    translations: {
      en: {
        consentModal: {
          title: "Cookies on this site",
          description:
            "We use essential cookies to make our site work and optional analytics cookies to help us improve the product. You can change your preferences at any time.",
          acceptAllBtn: "Accept all",
          acceptNecessaryBtn: "Reject all",
          showPreferencesBtn: "Manage Individual preferences",
        },
        preferencesModal: {
          title: "Manage your cookie preferences",
          acceptAllBtn: "Accept all",
          acceptNecessaryBtn: "Reject all",
          savePreferencesBtn: "Accept current selection",
          closeIconLabel: "Close modal",
          sections: [
            {
              description:
                "We use cookies to ensure the basic functions of our site and to collect analytics to improve our product. Choose which types of cookies you’re happy for us to use. You can update your preferences anytime.",
            },
            {
              title:
                'Strictly Necessary Cookies <span class="pm__badge">Always Enabled</span>',
              description:
                "These cookies are essential for the site to function properly and cannot be switched off.",
              linkedCategory: "necessary",
            },
            {
              title: "Performance and Analytics",
              description:
                "These cookies collect information about how you use our website. All of the data is anonymized and cannot be used to identify you.",
              linkedCategory: "analytics",
            },
          ],
        },
      },
    },
  },
};
