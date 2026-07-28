import React, { useCallback } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { colors, radius, tabular } from '../theme';

type Props = {
  onKey: (key: string) => void;
};

const LAYOUT: string[][] = [
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '−'],
  ['.', '0', 'back', '+'],
];

const OPERATOR_KEYS = new Set(['÷', '×', '−', '+']);

function tap(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(style).catch(() => {});
}

function Key({
  label,
  onKey,
}: {
  label: string;
  onKey: (key: string) => void;
}) {
  const isOperator = OPERATOR_KEYS.has(label);
  const isBack = label === 'back';

  const handlePress = useCallback(() => {
    tap(Haptics.ImpactFeedbackStyle.Light);
    onKey(label);
  }, [label, onKey]);

  // Long-pressing backspace wipes the whole entry — the usual calculator gesture.
  const handleLongPress = useCallback(() => {
    if (!isBack) return;
    tap(Haptics.ImpactFeedbackStyle.Medium);
    onKey('clear');
  }, [isBack, onKey]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.key,
        isOperator && styles.keyOperator,
        pressed && styles.keyPressed,
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={400}
      accessibilityRole="button"
      accessibilityLabel={isBack ? 'Delete' : label}
    >
      <Text
        style={[
          styles.keyLabel,
          isOperator && styles.keyLabelOperator,
          isBack && styles.keyLabelBack,
          tabular,
        ]}
      >
        {isBack ? '⌫' : label}
      </Text>
    </Pressable>
  );
}

export default function Keypad({ onKey }: Props) {
  return (
    <View style={styles.pad}>
      {LAYOUT.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((label) => (
            <Key key={label} label={label} onKey={onKey} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    paddingHorizontal: 10,
    paddingTop: 8,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  key: {
    flex: 1,
    aspectRatio: 1.28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.key,
    borderRadius: radius.key,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyOperator: {
    backgroundColor: colors.surface,
  },
  keyPressed: {
    backgroundColor: colors.keyPress,
  },
  keyLabel: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '400',
  },
  keyLabelOperator: {
    color: colors.accent,
    fontSize: 26,
    fontWeight: '500',
  },
  keyLabelBack: {
    fontSize: 22,
    color: colors.textDim,
  },
});
