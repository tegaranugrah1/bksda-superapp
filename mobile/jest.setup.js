/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({ uri: 'test' })),
  },
}), { virtual: true });

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: (props) => React.createElement('Ionicons', props),
    MaterialIcons: (props) => React.createElement('MaterialIcons', props),
    FontAwesome: (props) => React.createElement('FontAwesome', props),
    Feather: (props) => React.createElement('Feather', props),
  };
}, { virtual: true });

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: (props) => React.createElement(View, props),
  };
});
