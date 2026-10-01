import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { PROFILES, START_SCORE, type PlayerProfile } from './src/game';
import { GameScreen } from './src/screens/GameScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { SummaryScreen } from './src/screens/SummaryScreen';
import { saveLeg, type LegRecord } from './src/state/stats';
import { colors } from './src/theme';

type Screen = { name: 'home' } | { name: 'game'; seed: number } | { name: 'summary'; leg: LegRecord } | { name: 'stats' };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [profile, setProfile] = useState<PlayerProfile>(PROFILES[1]);
  const [showRunningScore, setShowRunningScore] = useState(true);

  const start = () => setScreen({ name: 'game', seed: Date.now() % 2147483647 });

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      {screen.name === 'home' && (
        <HomeScreen
          profile={profile}
          onProfile={setProfile}
          showRunningScore={showRunningScore}
          onShowRunningScore={setShowRunningScore}
          onStart={start}
          onStats={() => setScreen({ name: 'stats' })}
        />
      )}
      {screen.name === 'game' && (
        <GameScreen
          key={screen.seed}
          profile={profile}
          seed={screen.seed}
          showRunningScore={showRunningScore}
          onQuit={() => setScreen({ name: 'home' })}
          onFinish={({ darts, visits, log, checkoutDarts, won }) => {
            const leg: LegRecord = {
              date: new Date().toISOString(),
              profileId: profile.id,
              targetAverage: profile.targetAverage,
              won,
              darts,
              visits,
              average: darts ? (START_SCORE / darts) * 3 : 0,
              checkoutDarts,
              decisions: log,
            };
            saveLeg(leg);
            setScreen({ name: 'summary', leg });
          }}
        />
      )}
      {screen.name === 'summary' && <SummaryScreen leg={screen.leg} onAgain={start} onHome={() => setScreen({ name: 'home' })} />}
      {screen.name === 'stats' && <StatsScreen onBack={() => setScreen({ name: 'home' })} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
