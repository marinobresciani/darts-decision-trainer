import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Dartboard } from '../components/Dartboard';
import { targetLabel, type PlayerProfile } from '../game';
import { useLeg } from '../hooks/useLeg';
import type { DecisionLogEntry } from '../state/stats';
import { colors, gradeColor, gradeLabel } from '../theme';

type Props = {
  profile: PlayerProfile;
  seed: number;
  showRunningScore: boolean;
  onFinish: (result: { darts: number; visits: number; log: DecisionLogEntry[]; checkoutDarts: number; won: boolean }) => void;
  onQuit: () => void;
};

export function GameScreen({ profile, seed, showRunningScore, onFinish, onQuit }: Props) {
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;
  const { state, candidates, choose, lastTurn, ghost, log, checkoutDarts, landedLabel } = useLeg(profile, seed);

  useEffect(() => {
    if (state.legStatus === 'won') {
      const t = setTimeout(
        () => onFinish({ darts: state.totalDartsThrown, visits: state.history.length, log, checkoutDarts, won: true }),
        1200,
      );
      return () => clearTimeout(t);
    }
  }, [state.legStatus]);

  const boardSize = wide ? Math.min(height - 260, width * 0.5, 560) : Math.min(width - 32, 420);
  const scoreShown = showRunningScore || state.dartsRemainingInVisit === 3 ? state.playerScore : '?';
  const visitDarts = state.visitDarts.map((d) => landedLabel(d));

  const statePanel = (
    <View style={styles.panel}>
      <Text style={styles.label}>Score</Text>
      <Text style={styles.score}>{scoreShown}</Text>
      <Text style={styles.sub}>
        {state.legStatus === 'won' ? 'Game shot!' : `${state.dartsRemainingInVisit} dart${state.dartsRemainingInVisit > 1 ? 's' : ''} in hand`}
      </Text>
      <Text style={styles.small}>
        Visit {state.visitNumber} · {state.totalDartsThrown} darts · {profile.name}
      </Text>
      {visitDarts.length > 0 && <Text style={styles.small}>This visit: {visitDarts.join(', ')}</Text>}
      {!showRunningScore && state.dartsRemainingInVisit < 3 && (
        <Text style={styles.small}>Started the visit on {state.visitStartScore}. Keep the count yourself.</Text>
      )}
    </View>
  );

  const feedback = lastTurn && (
    <View style={[styles.panel, { borderLeftWidth: 4, borderLeftColor: gradeColor[lastTurn.evaluation.grade] }]}>
      <Text style={[styles.grade, { color: gradeColor[lastTurn.evaluation.grade] }]}>
        {targetLabel(lastTurn.evaluation.target)}: {gradeLabel[lastTurn.evaluation.grade]}
      </Text>
      {!!lastTurn.evaluation.feedback && <Text style={styles.feedback}>{lastTurn.evaluation.feedback}</Text>}
      <Text style={styles.landed}>
        Landed: {landedLabel(lastTurn.dart)}
        {lastTurn.bust ? ' · BUST' : ''}
        {lastTurn.checkout ? ' · CHECKOUT' : ''}
      </Text>
      {lastTurn.visitEnded && !lastTurn.checkout && (
        <Text style={styles.small}>
          Visit {lastTurn.bust ? 'busted' : `scored ${lastTurn.visitScored}`}, {lastTurn.after} left.
        </Text>
      )}
    </View>
  );

  const buttons = (
    <View style={styles.buttons}>
      {candidates.map((c) => (
        <Pressable
          key={c.label}
          onPress={() => choose(c)}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Aim at ${c.label}`}
        >
          <Text style={styles.btnText}>{c.label}</Text>
        </Pressable>
      ))}
    </View>
  );

  const board = <Dartboard size={boardSize} darts={state.dartsInBoard} ghostDarts={ghost} aim={lastTurn?.evaluation.target} />;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={onQuit}>
          <Text style={styles.link}>‹ Quit leg</Text>
        </Pressable>
      </View>
      {wide ? (
        <>
          <View style={styles.row}>
            <View style={{ width: 320, gap: 12 }}>
              {statePanel}
              {feedback}
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>{board}</View>
          </View>
          {buttons}
        </>
      ) : (
        <>
          {statePanel}
          {buttons}
          {feedback}
          <View style={{ alignItems: 'center' }}>{board}</View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  topBar: { flexDirection: 'row' },
  link: { color: colors.textDim, fontSize: 15 },
  row: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  panel: { backgroundColor: colors.panel, borderRadius: 12, padding: 14, gap: 4 },
  label: { color: colors.textDim, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  score: { color: colors.text, fontSize: 56, fontWeight: '800' },
  sub: { color: colors.text, fontSize: 18, fontWeight: '600' },
  small: { color: colors.textDim, fontSize: 13 },
  grade: { fontSize: 17, fontWeight: '700' },
  feedback: { color: colors.text, fontSize: 15 },
  landed: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 4 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    backgroundColor: colors.panelAlt,
    borderRadius: 10,
    paddingVertical: 14,
    minWidth: 72,
    flexGrow: 1,
    flexBasis: '18%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2f3b35',
  },
  btnPressed: { backgroundColor: '#2c3a33' },
  btnText: { color: colors.text, fontSize: 18, fontWeight: '700' },
});
