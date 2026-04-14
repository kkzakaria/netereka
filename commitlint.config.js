module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "storefront",
        "admin",
        "whatsapp",
        "auth",
        "db",
        "seo",
        "claude",
        "ci",
        "deps",
        "release",
      ],
    ],
  },
};
