import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { InvoiceStats } from '../../types';
import { formatCurrency } from '../../utils/format';

interface Props {
  stats: InvoiceStats;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 180;
const PADDING = { top: 20, right: 20, bottom: 30, left: 10 };

// Lazy-require Skia only on native to avoid import.meta crash on web
function getSkia() {
  if (Platform.OS === 'web') return null;
  try {
    return require('@shopify/react-native-skia');
  } catch {
    return null;
  }
}

function SkiaChart({ stats }: Props) {
  const theme = useTheme();
  const Skia = getSkia();

  const chartData = useMemo(() => {
    const entries = Object.entries(stats.by_month)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12);

    if (entries.length === 0 || !Skia) return null;

    const values = entries.map(([, v]) => v.total);
    const maxVal = Math.max(...values, 1);
    const plotW = CHART_WIDTH - PADDING.left - PADDING.right;
    const plotH = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const points = entries.map(([, v], i) => ({
      x: PADDING.left + (i / Math.max(entries.length - 1, 1)) * plotW,
      y: PADDING.top + plotH - (v.total / maxVal) * plotH,
    }));

    const path = Skia.Skia.Path.Make();
    points.forEach((p, i) => {
      if (i === 0) path.moveTo(p.x, p.y);
      else path.lineTo(p.x, p.y);
    });

    const areaPath = Skia.Skia.Path.Make();
    points.forEach((p, i) => {
      if (i === 0) areaPath.moveTo(p.x, p.y);
      else areaPath.lineTo(p.x, p.y);
    });
    areaPath.lineTo(points[points.length - 1].x, PADDING.top + plotH);
    areaPath.lineTo(points[0].x, PADDING.top + plotH);
    areaPath.close();

    return { entries, points, path, areaPath };
  }, [stats, Skia]);

  if (!chartData || !Skia) return null;

  const { Canvas, Path, LinearGradient, vec, Circle } = Skia;

  return (
    <Canvas style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}>
      <Path path={chartData.areaPath} style="fill">
        <LinearGradient
          start={vec(0, PADDING.top)}
          end={vec(0, CHART_HEIGHT)}
          colors={[theme.colors.primary + '40', theme.colors.primary + '05']}
        />
      </Path>
      <Path
        path={chartData.path}
        style="stroke"
        strokeWidth={2.5}
        color={theme.colors.primary}
        strokeCap="round"
        strokeJoin="round"
      />
      {chartData.points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} color={theme.colors.primary} />
      ))}
    </Canvas>
  );
}

// Simple web fallback using View bars
function WebFallbackChart({ stats }: Props) {
  const theme = useTheme();

  const entries = useMemo(
    () =>
      Object.entries(stats.by_month)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12),
    [stats],
  );

  if (entries.length === 0) return null;

  const maxVal = Math.max(...entries.map(([, v]) => v.total), 1);

  return (
    <View style={webStyles.container}>
      {entries.map(([month, { total }]) => (
        <View key={month} style={webStyles.barCol}>
          <View
            style={[
              webStyles.bar,
              {
                height: Math.max((total / maxVal) * 120, 2),
                backgroundColor: theme.colors.primary,
              },
            ]}
          />
          <Text variant="labelSmall" style={webStyles.label}>
            {month.slice(-2)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const webStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', height: 150, gap: 4, paddingHorizontal: 4 },
  barCol: { flex: 1, alignItems: 'center' },
  bar: { width: '80%', borderRadius: 3, minHeight: 2 },
  label: { fontSize: 9, marginTop: 4 },
});

export default function MonthlyTrendChart({ stats }: Props) {
  const entries = Object.entries(stats.by_month);

  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="bodySmall">No monthly data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="titleSmall" style={styles.title}>
        Monthly Spending Trend
      </Text>
      {Platform.OS === 'web' ? (
        <WebFallbackChart stats={stats} />
      ) : (
        <SkiaChart stats={stats} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 8 },
  title: { fontWeight: '600', marginBottom: 8 },
  empty: { padding: 20, alignItems: 'center' },
});
