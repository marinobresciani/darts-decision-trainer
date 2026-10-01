import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { PROFILES, type PlayerProfile } from '../game';
import { colors } from '../theme';

type Props = {
  profile: PlayerProfile;
  onProfile: (p: PlayerProfile) => void;
  showRunningScore: boolean;
  onShowRunningScore: (v: boolean) => void;
  onStart: () => void;
  onStats: () => void;
};

const BLURB: Record<string, string> = {
  easy: 'The simulated player usually hits what you choose. Learn the routes.',
  medium: 'Regular misses into neighbours. Start recalculating.',
  hard: 'Constant recovery from awkward scores.',
  extreme: 'Chaos. Every dart is a new problem.',
};

export function HomeScreen({ profile, onProfile, showRunningScore, onShowRunningScore, onStart, onStats }: Props) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Darts Decision Trainer</Text>
      <Text style={styles.tagline}>You choose where to aim. The simulator chooses where the dart lands.</Text>

      <Text style={styles.section}>Simulated player</Text>
      <Text style={styles.hint}>A weaker player makes the training harder: you keep recovering from misses.</Text>
      {PROFILES.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => onProfile(p)}
          style={[styles.card, p.id === profile.id && styles.cardOn]}
          accessibilityRole="radio"
          accessibilityState={{ selected: p.id === profile.id }}
        >
          <Text style={styles.cardTitle}>{p.name}</Text>
          <Text style={styles.cardText}>{BLURB[p.id]}</Text>
        </Pressable>
      ))}

      <View style={styles.setting}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Show running score</Text>
          <Text style={styles.cardText}>Turn off to practise the arithmetic: the score only updates between visits.</Text>
        </View>
        <Switch value={showRunningScore} onValueChange={onShowRunningScore} />
      </View>

      <Pressable onPress={onStart} style={styles.primary} accessibilityRole="button">
        <Text style={styles.primaryText}>Start 501 leg</Text>
      </Pressable>
      <Pressable onPress={onStats} style={styles.secondary} accessibilityRole="button">
        <Text style={styles.secondaryText}>Statistics</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center' },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 12 },
  tagline: { color: colors.textDim, fontSize: 16 },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 12 },
  hint: { color: colors.textDim, fontSize: 13 },
  card: { backgroundColor: colors.panel, borderRadius: 12, padding: 14, borderWidth: 2, borderColor: 'transparent' },
  cardOn: { borderColor: colors.accent },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  cardText: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  setting: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.panel, borderRadius: 12, padding: 14 },
  primary: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  primaryText: { color: '#06281a', fontSize: 18, fontWeight: '800' },
  secondary: { borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2f3b35' },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
