import React from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { protectDocumentHtml } from '@/lib/files/documentHtml';

export function DocumentHtmlView({ html, style, onLoadEnd }: { html: string; style?: StyleProp<ViewStyle>; onLoadEnd?: () => void }) {
  const protectedHtml = protectDocumentHtml(html);
  return <View style={[{ flex: 1 }, style]}>{Platform.OS === 'web'
    ? React.createElement('iframe', { title: 'Pratinjau dokumen', srcDoc: protectedHtml, sandbox: '', referrerPolicy: 'no-referrer', onLoad: onLoadEnd,
        style: { border: 0, width: '100%', height: '100%', flex: 1, backgroundColor: '#0f172a' } })
    : <WebView source={{ html: protectedHtml, baseUrl: 'about:blank' }} style={{ flex: 1, backgroundColor: '#0f172a' }}
        javaScriptEnabled={false} domStorageEnabled={false} setSupportMultipleWindows={false}
        originWhitelist={['about:blank']} onShouldStartLoadWithRequest={request => request.url === 'about:blank'}
        onLoadEnd={onLoadEnd} bounces={false} />}</View>;
}
