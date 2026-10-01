import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { decisionScore, gradeCounts, type LegRecord } from '../state/stats';
import { colors, gradeColor, gradeLabel } from '../theme';

type Props = { leg: LegRecord; onAgain: () => void; onHome: () => void };

export function SummaryScreen({ leg, onAgain, onHome }: Props) {
  const counts = gradeCounts(leg.decisions);
  const mistakes = leg.decisions.filter((d) => d.grade === 'poor' || d.grade === 'invalid' || d.bogeyMistake);
  const total = leg.decisions.length;
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{leg.won ? 'Leg won' : 'Leg ended'}</Text>

      <View style={styles.grid}>
        <Stat label="Your decision score" value={`${decisionScore(leg.decisions)}`} hint="measures you" />
        <Stat label="Simulated 3-dart average" value={leg.average.toFixed(1)} hint={`target ≈${leg.targetAverage}, measures the simulator`} />
        <Stat label="Darts used" value={`${leg.darts}`} hint={`${leg.visits} visits`} />
        <Stat label="Darts at a double" value={`${leg.checkoutDarts}`} hint={leg.won && leg.checkoutDarts ? `${Math.round(100 / leg.checkoutDarts)}% checkout` : ''} />
      </View>

      <Text style={styles.section}>Decisions</Text>
      {(Object.keys(counts) as (keyof typeof counts)[]).map((g) => (
        <View key={g} style={styles.bar}>
          <Text style={[styles.barLabel, { color: gradeColor[g] }]}>{gradeLabel[g]}</Text>
          <Text style={styles.barValue}>
            {counts[g]} {total ? `(${Math.round((counts[g] / total) * 100)}%)` : ''}
          </Text>
        </View>
      ))}

      {mistakes.length > 0 && (
        <>
          <Text style={styles.section}>Worth reviewing</Text>
          {mistakes.slice(0, 12).map((m, i) => (
            <View key={i} style={styles.mistake}>
              <Text style={styles.mistakeHead}>
                On {m.score}, {m.dartsLeft} in hand: aimed {m.target} → {m.landed}
              </Text>
              {!!m.feedback && <Text style={styles.mistakeText}>{m.feedback}</Text>}
            </View>
          ))}
        </>
      )}

      <Pressable onPress={onAgain} style={styles.primary}>
        <Text style={styles.primaryText}>Another leg</Text>
      </Pressable>
      <Pressable onPress={onHome} style={styles.secondary}>
        <Text style={styles.secondaryText}>Home</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {!!hint && <Text style={styles.statHint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 10, maxWidth: 760, width: '100%', alignSelf: 'center' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { backgroundColor: colors.panel, borderRadius: 12, padding: 14, flexGrow: 1, flexBasis: '45%' },
  statLabel: { color: colors.textDim, fontSize: 13 },
  statValue: { color: colors.text, fontSize: 30, fontWeight: '800' },
  statHint: { color: colors.textDim, fontSize: 12 },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 10 },
  bar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.panel, borderRadius: 8, padding: 10 },
  barLabel: { fontSize: 15, fontWeight: '700' },
  barValue: { color: colors.text, fontSize: 15 },
  mistake: { backgroundColor: colors.panel, borderRadius: 8, padding: 10, gap: 2 },
  mistakeHead: { color: colors.text, fontSize: 14, fontWeight: '600' },
  mistakeText: { color: colors.textDim, fontSize: 14 },
  primary: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#06281a', fontSize: 18, fontWeight: '800' },
  secondary: { borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2f3b35' },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
