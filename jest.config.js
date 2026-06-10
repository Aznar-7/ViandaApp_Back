export default {
    testEnvironment: "node",
    transform: {},
    testMatch: ["**/tests/**/*.test.js"],
    globalSetup: "./tests/globalSetup.cjs",
    setupFiles: ["./tests/setup-env.cjs"],
    setupFilesAfterEnv: ["./tests/setup-db.js"],
};
