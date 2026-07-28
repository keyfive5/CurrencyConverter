import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import CurrencyRow from './src/components/CurrencyRow';
import Keypad from './src/components/Keypad';
import PickerModal from './src/components/PickerModal';
import { currency } from './src/currencies';
import {
  convert,
  evaluate,
  formatAmount,
  formatExpression,
  hasOperator,
  pressKey,
  relativeTime,
  toEntry,
  unitRatePrecision,
} from './src/engine';
import {
  fetchRates,
  loadCached,
  saveCached,
  seedSnapshot,
  type RateSnapshot,
} from './src/rates';
import { colors, radius } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const PREFS_KEY = 'cc.prefs.v1';
const DEFAULT_CODES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'];
const DEFAULT_AMOUNT = '100';

function Converter() {
  const insets = useSafeAreaInsets();

  const [codes, setCodes] = useState<string[]>(DEFAULT_CODES);
  const [active, setActive] = useState('USD');
  const [expr, setExpr] = useState(DEFAULT_AMOUNT);
  const [snapshot, setSnapshot] = useState<RateSnapshot>(seedSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(Date.now());

  const loaded = useRef(false);

  /* ------------------------------------------------------------ rates */

  const refresh = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setRefreshing(true);
    try {
      const fresh = await fetchRates();
      setSnapshot(fresh);
      setStale(false);
      saveCached(fresh);
    } catch {
      // Keep showing the cached numbers; just flag that they may be old.
      setStale(true);
    } finally {
      if (showSpinner) setRefreshing(false);
      setNow(Date.now());
    }
  }, []);

  /* ------------------------------------------------------------- boot */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [prefsRaw, cached] = await Promise.all([
        AsyncStorage.getItem(PREFS_KEY).catch(() => null),
        loadCached(),
      ]);
      if (cancelled) return;

      if (prefsRaw) {
        try {
          const prefs = JSON.parse(prefsRaw);
          if (Array.isArray(prefs.codes) && prefs.codes.length >= 2) {
            setCodes(prefs.codes);
            setActive(
              prefs.codes.includes(prefs.active) ? prefs.active : prefs.codes[0]
            );
          }
          if (typeof prefs.expr === 'string') setExpr(prefs.expr);
        } catch {
          // Corrupt prefs just fall back to the defaults.
        }
      }

      if (cached) setSnapshot(cached);

      loaded.current = true;
      setReady(true);
      SplashScreen.hideAsync().catch(() => {});

      refresh(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  /* ------------------------------------------------------- persistence */

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ codes, active, expr })
    ).catch(() => {});
  }, [codes, active, expr]);

  /** The active row must always exist in the list. */
  useEffect(() => {
    if (codes.length && !codes.includes(active)) setActive(codes[0]);
  }, [codes, active]);

  // Keeps the "updated 2h ago" label honest while the app sits open.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  /* ------------------------------------------------------------ input */

  const onKey = useCallback((key: string) => {
    setExpr((prev) => pressKey(prev, key));
  }, []);

  const amount = useMemo(() => evaluate(expr), [expr]);

  const selectRow = useCallback(
    (code: string) => {
      if (code === active) return;
      const value = convert(amount ?? 0, active, code, snapshot.rates);
      setActive(code);
      setExpr(value === null ? '' : toEntry(value, currency(code).decimals));
    },
    [active, amount, snapshot.rates]
  );

  const removeRow = useCallback((code: string) => {
    setCodes((prev) =>
      prev.length <= 2 ? prev : prev.filter((c) => c !== code)
    );
  }, []);

  const toggleCode = useCallback((code: string) => {
    setCodes((prev) =>
      prev.includes(code)
        ? prev.length <= 2
          ? prev
          : prev.filter((c) => c !== code)
        : [...prev, code]
    );
  }, []);

  /* ----------------------------------------------------------- render */

  const showingExpression = hasOperator(expr);

  const updatedLabel =
    snapshot.source === 'seed' && stale
      ? 'Offline · using bundled rates'
      : `Updated ${relativeTime(snapshot.timestamp, now)}`;

  if (!ready) {
    return (
      <View style={styles.boot}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.status}>
          <View style={[styles.dot, stale && styles.dotStale]} />
          <Text style={styles.statusText}>{updatedLabel}</Text>
        </View>
        <Pressable
          onPress={() => refresh(true)}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel="Refresh rates"
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={styles.refresh}>⟳</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refresh(true)}
            tintColor={colors.textDim}
          />
        }
      >
        {codes.map((code) => {
          const c = currency(code);
          const isActive = code === active;

          let value: string;
          let subline: string | null;

          if (isActive) {
            // The active row echoes exactly what was typed, so mid-entry
            // values like "12." aren't rewritten under the user's finger.
            value = formatExpression(expr);
            subline = showingExpression
              ? `= ${amount === null ? '—' : formatAmount(amount, c.decimals)}`
              : null;
          } else {
            const converted = convert(amount ?? 0, active, code, snapshot.rates);
            value = converted === null ? '—' : formatAmount(converted, c.decimals);

            const unit = convert(1, active, code, snapshot.rates);
            subline =
              unit === null
                ? null
                : `1 ${active} = ${formatAmount(unit, unitRatePrecision(unit))}`;
          }

          return (
            <CurrencyRow
              key={code}
              currency={c}
              value={value}
              subline={subline}
              active={isActive}
              onPress={() => selectRow(code)}
              onRemove={codes.length > 2 ? () => removeRow(code) : null}
            />
          );
        })}

        <Pressable
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [styles.add, pressed && styles.addPressed]}
          accessibilityRole="button"
          accessibilityLabel="Add a currency"
        >
          <Text style={styles.addText}>+  Add currency</Text>
        </Pressable>

        <Text style={styles.hint}>
          Tap a row to convert from it · hold to remove
        </Text>
      </ScrollView>

      <View style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
        <Keypad onKey={onKey} />
      </View>

      <PickerModal
        visible={pickerOpen}
        selected={codes}
        onToggle={toggleCode}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Converter />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 12,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: 8,
  },
  dotStale: {
    backgroundColor: colors.warn,
  },
  statusText: {
    color: colors.textDim,
    fontSize: 13,
  },
  refresh: {
    color: colors.textDim,
    fontSize: 22,
    lineHeight: 24,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
  },
  add: {
    marginHorizontal: 12,
    marginTop: 2,
    paddingVertical: 14,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addPressed: {
    backgroundColor: colors.surface,
  },
  addText: {
    color: colors.textDim,
    fontSize: 15,
    fontWeight: '500',
  },
  hint: {
    color: colors.textFaint,
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 12,
  },
});
