import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { clearLegs, decisionScore, gradeCounts, loadLegs, type LegRecord } from '../state/stats';
import { colors } from '../theme';

export function StatsScreen({ onBack }: { onBack: () => void }) {
  const [legs, setLegs] = useState<LegRecord[] | null>(null);
  useEffect(() => {
    loadLegs().then(setLegs);
  }, []);

  if (!legs) return <View style={styles.root} />;
  const decisions = legs.flatMap((l) => l.decisions);
  const c = gradeCounts(decisions);
  const darts = legs.reduce((s, l) => s + l.darts, 0);
  const avg = legs.length ? legs.reduce((s, l) => s + l.average, 0) / legs.length : 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack}>
        <Text style={styles.link}>‹ Back</Text>
      </Pressable>
      <Text style={styles.title}>Statistics</Text>
      {legs.length === 0 ? (
        <Text style={styles.text}>No legs yet. Play one and your decisions will show up here.</Text>
      ) : (
        <>
          <Row label="Legs played" value={legs.length} />
          <Row label="Darts thrown" value={darts} />
          <Row label="Decision score (all legs)" value={decisionScore(decisions)} />
          <Row label="Best-choice rate" value={`${Math.round((c.preferred / Math.max(1, decisions.length)) * 100)}%`} />
          <Row label="Bogey mistakes" value={decisions.filter((d) => d.bogeyMistake).length} />
          <Row label="Obstruction decisions" value={decisions.filter((d) => d.obstructionRelated).length} />
          <Row label="Simulated average (mean per leg)" value={avg.toFixed(1)} />
          <Text style={styles.section}>Recent legs</Text>
          {legs
            .slice(-10)
            .reverse()
            .map((l, i) => (
              <Row
                key={i}
                label={`${new Date(l.date).toLocaleDateString()} · ${l.profileId}`}
                value={`${l.darts} darts · decisions ${decisionScore(l.decisions)}`}
              />
            ))}
          <Pressable
            onPress={async () => {
              await clearLegs();
              setLegs([]);
            }}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>Clear statistics</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 8, maxWidth: 640, width: '100%', alignSelf: 'center' },
  link: { color: colors.textDim, fontSize: 15 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  text: { color: colors.textDim, fontSize: 15 },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.panel, borderRadius: 8, padding: 12, gap: 8 },
  rowLabel: { color: colors.textDim, fontSize: 14, flexShrink: 1 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
  secondary: { borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2f3b35', marginTop: 12 },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
