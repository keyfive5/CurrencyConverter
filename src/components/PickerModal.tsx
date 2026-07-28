import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ALL_CODES, CURRENCIES, POPULAR, currency } from '../currencies';
import { colors, radius } from '../theme';

type Props = {
  visible: boolean;
  /** Codes already on the list — shown with a check, tapping removes them. */
  selected: string[];
  onToggle: (code: string) => void;
  onClose: () => void;
};

type Entry = { code: string; section: string | null };

export default function PickerModal({
  visible,
  selected,
  onToggle,
  onClose,
}: Props) {
  const [query, setQuery] = useState('');
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const entries: Entry[] = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (q) {
      const scored = ALL_CODES.map((code) => {
        const c = CURRENCIES[code];
        const codeL = code.toLowerCase();
        const nameL = c.name.toLowerCase();
        // Exact code first, then code prefix, then name prefix, then anywhere.
        if (codeL === q) return { code, rank: 0 };
        if (codeL.startsWith(q)) return { code, rank: 1 };
        if (nameL.startsWith(q)) return { code, rank: 2 };
        if (nameL.includes(q)) return { code, rank: 3 };
        return { code, rank: -1 };
      })
        .filter((s) => s.rank >= 0)
        .sort((a, b) => a.rank - b.rank || a.code.localeCompare(b.code));

      return scored.map((s, i) => ({
        code: s.code,
        section: i === 0 ? 'Results' : null,
      }));
    }

    const rest = ALL_CODES.filter((c) => !POPULAR.includes(c)).sort((a, b) =>
      CURRENCIES[a].name.localeCompare(CURRENCIES[b].name)
    );

    return [
      ...POPULAR.map((code, i) => ({
        code,
        section: i === 0 ? 'Popular' : null,
      })),
      ...rest.map((code, i) => ({
        code,
        section: i === 0 ? 'All currencies' : null,
      })),
    ];
  }, [query]);

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <View style={styles.sheet}>
        <View style={styles.grabber} />

        <View style={styles.header}>
          <Text style={styles.title}>Currencies</Text>
          <Pressable
            onPress={close}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.search}
          placeholder="Search 160+ currencies"
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="characters"
          clearButtonMode="while-editing"
          returnKeyType="search"
        />

        <FlatList
          data={entries}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          initialNumToRender={20}
          renderItem={({ item }) => {
            const c = currency(item.code);
            const on = selectedSet.has(item.code);
            return (
              <>
                {item.section ? (
                  <Text style={styles.section}>{item.section}</Text>
                ) : null}
                <Pressable
                  onPress={() => onToggle(item.code)}
                  style={({ pressed }) => [
                    styles.item,
                    pressed && styles.itemPressed,
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                >
                  <Text style={styles.flag}>{c.flag}</Text>
                  <View style={styles.itemLabels}>
                    <Text style={styles.itemCode}>{c.code}</Text>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {c.name}
                    </Text>
                  </View>
                  <Text style={[styles.check, on && styles.checkOn]}>
                    {on ? '✓' : '+'}
                  </Text>
                </Pressable>
              </>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No currency matches “{query}”.</Text>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
  },
  done: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  search: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: radius.key,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  section: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 6,
    marginLeft: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  itemPressed: {
    backgroundColor: colors.surface,
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  itemLabels: {
    flex: 1,
  },
  itemCode: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  itemName: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 1,
  },
  check: {
    color: colors.textFaint,
    fontSize: 20,
    width: 26,
    textAlign: 'center',
  },
  checkOn: {
    color: colors.accent,
  },
  empty: {
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
});
