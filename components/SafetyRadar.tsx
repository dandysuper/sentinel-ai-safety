import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { SafetyProfile } from '../types';
import { useTheme } from '../hooks/useTheme';

interface SafetyRadarProps {
  profile: SafetyProfile;
  compareProfile?: SafetyProfile;
  name: string;
  compareName?: string;
}

export const SafetyRadar: React.FC<SafetyRadarProps> = ({ profile, compareProfile, name, compareName }) => {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const data = [
    { subject: 'Нетоксичность', A: profile.nonToxicity, B: compareProfile?.nonToxicity, fullMark: 100 },
    { subject: 'Нестереотипность', A: profile.nonStereotype, B: compareProfile?.nonStereotype, fullMark: 100 },
    { subject: 'Адв. устойчивость', A: profile.advRobustness, B: compareProfile?.advRobustness, fullMark: 100 },
    { subject: 'OOD устойчивость', A: profile.oodRobustness, B: compareProfile?.oodRobustness, fullMark: 100 },
    { subject: 'Адв. демо', A: profile.advDemoRobustness, B: compareProfile?.advDemoRobustness, fullMark: 100 },
    { subject: 'Конфиденциальность', A: profile.privacy, B: compareProfile?.privacy, fullMark: 100 },
    { subject: 'Этика', A: profile.ethics, B: compareProfile?.ethics, fullMark: 100 },
    { subject: 'Справедливость', A: profile.fairness, B: compareProfile?.fairness, fullMark: 100 },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid stroke={isDark ? '#334155' : '#e2e8f0'} />
        <PolarAngleAxis dataKey="subject" tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name={name} dataKey="A" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.3} />
        {compareProfile && (
          <Radar
            name={compareName}
            dataKey="B"
            stroke="#94a3b8"
            fill="#cbd5e1"
            fillOpacity={0.3}
            strokeDasharray="4 4"
          />
        )}
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
};
