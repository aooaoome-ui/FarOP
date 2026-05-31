module.exports = [
  {
    ignores: ["scratch/**"]
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        module: "readonly",
        // Browser globals
        window: "readonly",
        document: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        localStorage: "readonly",
        location: "readonly",
        confirm: "readonly",
        alert: "readonly",
        prompt: "readonly",
        parseInt: "readonly",
        parseFloat: "readonly",
        isNaN: "readonly",
        Date: "readonly",
        Math: "readonly",
        Object: "readonly",
        Array: "readonly",
        Set: "readonly",
        JSON: "readonly",
        RegExp: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        Blob: "readonly",
        URL: "readonly",
        FileReader: "readonly",
        // Third-party library globals
        firebase: "readonly",
        Chart: "readonly",
        XLSX: "readonly",
        jspdf: "readonly"
      }
    },
    rules: {
      "no-undef": "error"
    }
  }
];
