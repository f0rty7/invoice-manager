import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Card, ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { useStats } from '../../hooks/useStats';
import MonthlyTrendChart from './MonthlyTrendChart';
import CategoryChart from './CategoryChart';
import TopItemsChart from './TopItemsChart';

export default function ChartSection() {
  const theme = useTheme();
  const { data: stats, isLoading } = useStats();
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (!stats) return null;

  return (
    <Card style={styles.card} mode="elevated">
      <List.Accordion
        title="Analytics"
        description="Charts and spending insights"
        left={(props) => <List.Icon {...props} icon="chart-line" />}
        expanded={expanded}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.chartContainer}>
          <MonthlyTrendChart stats={stats} />
          <CategoryChart stats={stats} />
          <TopItemsChart stats={stats} />
        </View>
      </List.Accordion>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  chartContainer: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    gap: 16,
  },
  loader: {
    padding: 20,
    alignItems: 'center',
  },
});
