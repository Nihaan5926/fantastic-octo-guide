import React from 'react';

interface Props {
  password: string;
}

interface Rule {
  label: string;
  met: boolean;
}

function getRules(password: string): Rule[] {
  return [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
  ];
}

function getScore(password: string): number {
  const rules = getRules(password);
  if (password.length === 0) return 0;
  return rules.filter((r) => r.met).length;
}

function getBarColor(score: number): string {
  if (score <= 2) return '#ef4444';
  if (score <= 3) return '#eab308';
  return '#22c55e';
}

function getBarWidth(score: number): string {
  if (score === 0) return '0%';
  return `${(score / 5) * 100}%`;
}

export default function PasswordStrength({ password }: Props) {
  const rules = getRules(password);
  const score = getScore(password);
  const color = getBarColor(score);
  const width = getBarWidth(score);

  if (password.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="w-full h-1.5 bg-bg-primary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width, backgroundColor: color }}
        />
      </div>
      <ul className="space-y-0.5">
        {rules.map((rule) => (
          <li
            key={rule.label}
            className={`text-xs flex items-center gap-1.5 ${rule.met ? 'text-green-500' : 'text-text-muted'}`}
          >
            <span className={rule.met ? 'text-green-500' : 'text-text-muted'}>
              {rule.met ? '\u2713' : '\u00D7'}
            </span>
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
