import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { colors, radius, tabular } from '../theme';
import type { Currency } from '../currencies';

type Props = {
  currency: Currency;
  /** Already-formatted display value. */
  value: string;
  /** Small line under the value: the unit rate, or a running calculator total. */
  subline: string | null;
  active: boolean;
  onPress: () => void;
  onRemove: (() => void) | null;
};

export default function CurrencyRow({
  currency,
  value,
  subline,
  active,
  onPress,
  onRemove,
}: Props) {
  const handleLongPress = () => {
    if (!onRemove) return;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
        () => {}
      );
    }
    onRemove();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={handleLongPress}
      delayLongPress={450}
      style={({ pressed }) => [
        styles.row,
        active && styles.rowActive,
        pressed && !active && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${currency.name}, ${value}`}
    >
      <Text style={styles.flag}>{currency.flag}</Text>

      <View style={styles.labels}>
        <Text style={[styles.code, active && styles.codeActive]}>
          {currency.code}
        </Text>
        <Text style={styles.name} numberOfLines={1}>
          {currency.name}
        </Text>
      </View>

      <View style={styles.values}>
        <Text
          style={[styles.value, active && styles.valueActive, tabular]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.45}
        >
          {value}
        </Text>
        {subline ? (
          <Text
            style={[styles.hint, active && styles.hintActive, tabular]}
            numberOfLines={1}
          >
            {subline}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: radius.row,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowActive: {
    backgroundColor: colors.surfaceActive,
    borderColor: colors.accent,
  },
  rowPressed: {
    backgroundColor: colors.surfaceActive,
  },
  flag: {
    fontSize: 26,
    marginRight: 12,
  },
  labels: {
    flex: 1,
    marginRight: 10,
  },
  code: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  codeActive: {
    color: colors.accent,
  },
  name: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 2,
  },
  values: {
    flexShrink: 0,
    maxWidth: '58%',
    alignItems: 'flex-end',
  },
  value: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '400',
  },
  valueActive: {
    color: colors.accent,
    fontWeight: '500',
  },
  hint: {
    color: colors.textFaint,
    fontSize: 10.5,
    marginTop: 3,
  },
  hintActive: {
    color: colors.textDim,
    fontSize: 12,
  },
});
