import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));

export default {
  rootDir,
  collectCoverageFrom: ["src/**/*.js"],
  coverageDirectory: "<rootDir>/coverage",
  coverageProvider: "v8",
  projects: [
    {
      displayName: "unit",
      rootDir,
      testEnvironment: "node",
      transform: {},
      testMatch: ["<rootDir>/test/unit/**/*.test.js"],
    },
  ],
};
