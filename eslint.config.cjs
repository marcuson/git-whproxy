const prettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = [
	{
		ignores: ["coverage/**", "docs/**"],
	},
	{
		files: ["src/**/*.js", "test/**/*.js"],
	},
	prettierRecommended,
];
