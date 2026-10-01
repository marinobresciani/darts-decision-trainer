import React from 'react';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import {
  BOARD_ORDER,
  R_BULLSEYE,
  R_DOUBLE_INNER,
  R_DOUBLE_OUTER,
  R_OUTER_BULL,
  R_TREBLE_INNER,
  R_TREBLE_OUTER,
  aimPoint,
} from '../game/board/geometry';
import type { DartTarget, SimulatedDart } from '../game/types';
import { colors } from '../theme';

type Props = {
  size: number;
  darts: SimulatedDart[];
  /** Darts from the visit that just ended, drawn faded. */
  ghostDarts?: SimulatedDart[];
  aim?: DartTarget | null;
};

const VIEW = 205; // half-width of the view box in mm (board + number ring)

/** Board point (y up) to SVG point (y down). */
const sx = (x: number) => x;
const sy = (y: number) => -y;

function sectorPath(r1: number, r2: number, centreDeg: number): string {
  const a1 = ((centreDeg - 9) * Math.PI) / 180;
  const a2 = ((centreDeg + 9) * Math.PI) / 180;
  const p = (r: number, a: number) => `${sx(r * Math.sin(a)).toFixed(2)} ${sy(r * Math.cos(a)).toFixed(2)}`;
  return `M ${p(r1, a1)} L ${p(r2, a1)} A ${r2} ${r2} 0 0 1 ${p(r2, a2)} L ${p(r1, a2)} A ${r1} ${r1} 0 0 0 ${p(r1, a1)} Z`;
}

function DartMark({ d, faded }: { d: SimulatedDart; faded?: boolean }) {
  const x = sx(d.x);
  const y = sy(d.y);
  const o = faded ? 0.35 : 1;
  return (
    <G opacity={o}>
      <Circle cx={x} cy={y} r={4.5} fill={d.bouncedOut ? 'none' : colors.dart} stroke="#000" strokeWidth={1} />
      {d.bouncedOut && <Line x1={x - 4} y1={y - 4} x2={x + 4} y2={y + 4} stroke={colors.dart} strokeWidth={2} />}
    </G>
  );
}

export function Dartboard({ size, darts, ghostDarts = [], aim }: Props) {
  const aimP = aim ? aimPoint(aim) : null;
  return (
    <Svg width={size} height={size} viewBox={`${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}`}>
      <Circle cx={0} cy={0} r={VIEW} fill={colors.boardSurround} />
      {BOARD_ORDER.map((n, i) => {
        const deg = i * 18;
        const dark = i % 2 === 0;
        const single = dark ? colors.boardDark : colors.boardLight;
        const ring = dark ? colors.boardRed : colors.boardGreen;
        return (
          <G key={n}>
            <Path d={sectorPath(R_OUTER_BULL, R_TREBLE_INNER, deg)} fill={single} />
            <Path d={sectorPath(R_TREBLE_INNER, R_TREBLE_OUTER, deg)} fill={ring} />
            <Path d={sectorPath(R_TREBLE_OUTER, R_DOUBLE_INNER, deg)} fill={single} />
            <Path d={sectorPath(R_DOUBLE_INNER, R_DOUBLE_OUTER, deg)} fill={ring} />
            <SvgText
              x={sx(187 * Math.sin((deg * Math.PI) / 180))}
              y={sy(187 * Math.cos((deg * Math.PI) / 180)) + 6}
              fill={colors.boardNumbers}
              fontSize={17}
              fontWeight="bold"
              textAnchor="middle"
            >
              {String(n)}
            </SvgText>
          </G>
        );
      })}
      <Circle cx={0} cy={0} r={R_OUTER_BULL} fill={colors.boardGreen} />
      <Circle cx={0} cy={0} r={R_BULLSEYE} fill={colors.boardRed} />
      {aimP && (
        <G>
          <Circle cx={sx(aimP.x)} cy={sy(aimP.y)} r={9} fill="none" stroke={colors.aim} strokeWidth={2} />
          <Line x1={sx(aimP.x) - 13} y1={sy(aimP.y)} x2={sx(aimP.x) + 13} y2={sy(aimP.y)} stroke={colors.aim} strokeWidth={1.5} />
          <Line x1={sx(aimP.x)} y1={sy(aimP.y) - 13} x2={sx(aimP.x)} y2={sy(aimP.y) + 13} stroke={colors.aim} strokeWidth={1.5} />
        </G>
      )}
      {ghostDarts.map((d, k) => (
        <DartMark key={`g${k}`} d={d} faded />
      ))}
      {darts.map((d, k) => (
        <DartMark key={k} d={d} />
      ))}
    </Svg>
  );
}
