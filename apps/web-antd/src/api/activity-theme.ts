export type ActivityTheme =
  | 'festive'
  | 'fresh'
  | 'playful'
  | 'romantic'
  | 'sky';

export const activityThemes: {
  value: ActivityTheme;
  label: string;
  color: string;
  background: string;
  text: string;
  description: string;
}[] = [
  {
    value: 'romantic',
    label: '婚纱柔粉',
    color: '#DB7296',
    background: '#FFF3F7',
    text: '#4C2A38',
    description: '婚纱摄影 · 婚庆',
  },
  {
    value: 'festive',
    label: '喜庆红',
    color: '#E53935',
    background: '#FFF5F2',
    text: '#38211D',
    description: '节庆 · 开业促销',
  },
  {
    value: 'playful',
    label: '童趣橙',
    color: '#F59A23',
    background: '#FFFAEC',
    text: '#45331F',
    description: '亲子 · 儿童活动',
  },
  {
    value: 'fresh',
    label: '清新绿',
    color: '#35A778',
    background: '#F0FAF5',
    text: '#204537',
    description: '生活 · 健康服务',
  },
  {
    value: 'sky',
    label: '淡蓝',
    color: '#69A9E8',
    background: '#F1F8FF',
    text: '#254461',
    description: '教育 · 通用活动',
  },
];

export function activityThemePreset(theme: string) {
  const preset = activityThemes.find((item) => item.value === theme);
  if (!preset) throw new Error('请选择活动主题');
  return preset;
}

export function normalizeActivityThemeColor(value: string) {
  if (!/^#[\dA-Fa-f]{6}$/.test(value))
    throw new Error('主题色请输入六位十六进制颜色，例如 #E53935');
  return value.toUpperCase();
}
