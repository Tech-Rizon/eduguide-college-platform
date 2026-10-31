module.exports = function (api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./src"],
          alias: {
            "@": "./src",
            "@components": "./src/components",
            "@navigation": "./src/navigation",
            "@screens": "./src/screens",
            "@services": "./src/services",
            "@store": "./src/store",
            "@theme": "./src/theme/index",
            "@types": "./src/types/index",
            "@utils": "./src/utils"
          }
        }
      ],
      "react-native-reanimated/plugin"
    ]
  };
};
