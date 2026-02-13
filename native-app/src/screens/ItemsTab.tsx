import React from 'react';
import { View, StyleSheet } from 'react-native';
import ItemList from '../components/ItemList';
import FilterChips from '../components/FilterChips';

export default function ItemsTab() {
  const header = (
    <View style={styles.header}>
      <FilterChips target="items" />
    </View>
  );

  return <ItemList ListHeaderComponent={header} />;
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 8,
  },
});
