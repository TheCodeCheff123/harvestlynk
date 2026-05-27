// @ts-check
import eslint from "@eslint/js";
import { globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["eslint.config.mjs"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: "commonjs",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "no-console": [
        "warn",
        {
          allow: ["error", "info", "warn"],
        },
      ],
      "no-unused-vars": "off",
      "require-await": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          vars: "all",
          args: "after-used",
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-unsafe-call": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSAsExpression",
          message:
            "Don't use 'as' casting. Use type annotations or 'satisfies' instead.",
        },
        {
          selector:
            "FunctionDeclaration[returnType], FunctionExpression[returnType], ArrowFunctionExpression[returnType]",
          message: "Do not add explicit return types to functions.",
        },
        {
          selector: "NewExpression[callee.name='Error']",
          message:
            "Use NestJS exceptions (e.g. BadRequestException, NotFoundException) instead of Error.",
        },
      {
        selector:
          "Identifier[name='id'][parent.property.key.name='columns']",
        message:
          "Avoid vague identifier name 'id'. Use a descriptive name like 'userId', 'merchantId', or 'invoiceId'.",
      },
      ],
    },
  },
  globalIgnores(["dist", "note.ts"]),
);
