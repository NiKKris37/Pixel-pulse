import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Line, Text as Label } from 'react-native-svg';
import { DAY } from './history';
import { Card, Header, Row } from './ui';
import { styles } from './styles';

const HEIGHT = 220;
const LEFT = 30;
const BOTTOM = 20;
const HOUR = 3600000;

function Chart({ samples, color }) {
  const [width, setWidth] = useState(0);
  const now = Date.now();
  const x = (t) => LEFT + ((t - (now - DAY)) / DAY) * (width - LEFT - 8);
  const y = (level) => 8 + (1 - level / 100) * (HEIGHT - BOTTOM - 8);
  const points = samples.filter((s) => now - s.t <= DAY);

  return (
    <View style={styles.chart} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          {[0, 50, 100].map((v) => (
            <Line key={v} x1={LEFT} x2={width - 8} y1={y(v)} y2={y(v)} stroke="#1c2030" />
          ))}
          {[0, 50, 100].map((v) => (
            <Label key={`t${v}`} x={0} y={y(v) + 4} fill="#8b93a7" fontSize="10">{v}</Label>
          ))}
          <Label x={LEFT} y={HEIGHT - 4} fill="#8b93a7" fontSize="10">il y a 24 h</Label>
          <Label x={width - 8} y={HEIGHT - 4} fill="#8b93a7" fontSize="10" textAnchor="end">maintenant</Label>
          {points.slice(1).map((p, i) => {
            const a = points[i];
            const gap = p.t - a.t > HOUR; // pas de relevé entre les deux : trait en pointillés
            const line = { x1: x(a.t), y1: y(a.level), x2: x(p.t), y2: y(p.level), stroke: color, strokeLinecap: 'round' };
            return gap ? (
              <Line key={p.t} {...line} strokeWidth={1.5} strokeDasharray="4 5" opacity={0.6} />
            ) : [
              <Line key={`g${p.t}`} {...line} strokeWidth={9} opacity={0.25} />,
              <Line key={p.t} {...line} strokeWidth={2.5} />,
            ];
          })}
          {points.map((p) => (
            <Circle key={`c${p.t}`} cx={x(p.t)} cy={y(p.level)} r={2.5} fill={p.plugged ? '#fff' : color} />
          ))}
        </Svg>
      )}
    </View>
  );
}

export default function History({ battery, theme, onBack }) {
  const levels = battery.history.map((s) => s.level);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="BATTERIE 24 H" color={theme.main} onBack={onBack} />
      <View style={{ height: 20 }} />
      <Card title="NIVEAU" color={theme.main} delay={50}>
        <Chart samples={battery.history} color={theme.second} />
        <Text style={styles.hint}>
          Points blancs : téléphone branché. Les relevés ne sont pris que lorsque l'app est ouverte ;
          les pointillés relient deux moments sans mesure.
        </Text>
      </Card>
      <Card title="RÉSUMÉ" color={theme.second} delay={150}>
        <Row label="Relevés" value={String(levels.length)} />
        <Row label="Plus haut" value={levels.length ? `${Math.max(...levels)} %` : '…'} />
        <Row label="Plus bas" value={levels.length ? `${Math.min(...levels)} %` : '…'} />
        <Row
          label="Décharge"
          value={battery.rate ? `${battery.rate.toFixed(1).replace('.', ',')} %/h` : 'Pas assez de mesures'}
        />
      </Card>
    </ScrollView>
  );
}
