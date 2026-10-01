import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const isDark = useColorScheme() === 'dark';
  const typeStyle =
    type === 'default' ? styles.default :
    type === 'title' ? styles.title :
    type === 'defaultSemiBold' ? styles.defaultSemiBold :
    type === 'subtitle' ? styles.subtitle :
    type === 'link' ? styles.link : undefined;
  const fontWeight =
    StyleSheet.flatten<TextStyle>(style)?.fontWeight ??
    StyleSheet.flatten<TextStyle>(typeStyle)?.fontWeight;
  const fontFamily =
    fontWeight === '800' || fontWeight === '900' ? Fonts.sansExtraBold :
    fontWeight === '700' || fontWeight === 'bold' ? Fonts.sansBold :
    fontWeight === '600' ? Fonts.sansSemiBold : Fonts.sans;
  const resolvedFontWeight =
    fontWeight === '800' || fontWeight === '900' ? '900' :
    fontWeight === '700' || fontWeight === 'bold' || fontWeight === '600' ? '700' : '400';

  return (
    <Text
      style={[
        { color, fontFamily },
        typeStyle,
        type === 'link' && isDark ? { color: darkColor ?? Colors.dark.link } : undefined,
        style,
        { fontFamily, fontWeight: resolvedFontWeight },
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 23,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  link: {
    lineHeight: 28,
    fontSize: 16,
    color: '#0a7ea4',
  },
});
