export type ActivityTheme =
  | 'coffee'
  | 'festive'
  | 'fresh'
  | 'gold'
  | 'lime'
  | 'navy'
  | 'playful'
  | 'romantic'
  | 'rose'
  | 'sky'
  | 'sunset'
  | 'teal'
  | 'violet';

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
  {
    value: 'sunset',
    label: '暖阳橘',
    color: '#EA580C',
    background: '#FFF6EE',
    text: '#4B2C1E',
    description: '餐饮 · 美食团购',
  },
  {
    value: 'violet',
    label: '梦幻紫',
    color: '#8B5CF6',
    background: '#F7F3FF',
    text: '#3E2E58',
    description: '美业 · 艺术体验',
  },
  {
    value: 'teal',
    label: '湖光青',
    color: '#0D9488',
    background: '#EFFAF9',
    text: '#214843',
    description: '旅行 · 酒店民宿',
  },
  {
    value: 'gold',
    label: '香槟金',
    color: '#B88746',
    background: '#FCF8EF',
    text: '#493A25',
    description: '珠宝 · 礼品庆典',
  },
  {
    value: 'navy',
    label: '商务蓝',
    color: '#315C99',
    background: '#F1F5FB',
    text: '#253A55',
    description: '家装 · 汽车服务',
  },
  {
    value: 'coffee',
    label: '摩卡棕',
    color: '#8B5E3C',
    background: '#FAF5EF',
    text: '#47352B',
    description: '咖啡 · 烘焙家居',
  },
  {
    value: 'rose',
    label: '玫瑰红',
    color: '#C73E67',
    background: '#FFF2F5',
    text: '#542C3B',
    description: '鲜花 · 服饰零售',
  },
  {
    value: 'lime',
    label: '活力青柠',
    color: '#729B24',
    background: '#F7FAEC',
    text: '#374425',
    description: '运动 · 户外健身',
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
