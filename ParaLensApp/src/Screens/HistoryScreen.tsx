import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const HistoryScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Verlauf</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: '600',
    color: '#222',
  },
});

export default HistoryScreen; 