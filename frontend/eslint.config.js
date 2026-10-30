import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import { fixupConfigRules } from "@eslint/compat";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  // Ignora le cartelle di build e le dipendenze
  {
    ignores: ["dist/", "node_modules/"],
  },

  // Configurazione base per tutti i file del progetto
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: {
        // Rileva automaticamente la versione di React installata
        version: "detect",
      },
    },
  },

  // Regole raccomandate da ESLint
  pluginJs.configs.recommended,

  // Regole raccomandate per TypeScript
  ...tseslint.configs.recommended,

  // Regole raccomandate per React (con fix per la nuova configurazione)
  ...fixupConfigRules(pluginReactConfig),

  // Regole degli hook di React (dipendenze degli effetti, hook chiamati in modo condizionale)
  reactHooks.configs.flat.recommended,

  // Sovrascrittura e personalizzazione delle regole
  {
    rules: {
      // Non necessarie con il nuovo JSX Transform di React 17+
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      // Disabilitato perché si usa TypeScript per la tipizzazione dei componenti
      "react/prop-types": "off",
      // Testi in italiano: gli apostrofi nel JSX sono normali, non errori
      "react/no-unescaped-entities": "off",
      // Emette un avviso invece di un errore per l'uso di 'any'
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];