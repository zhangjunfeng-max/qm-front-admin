import { formatDate } from '@vben/utils';

type DateValue = Parameters<typeof formatDate>[0];

/**
 * 统一格式化后台管理页面中的日期时间，精确到分钟。
 */
export function formatDateTimeToMinute(value?: DateValue) {
  return formatDate(value, 'YYYY-MM-DD HH:mm');
}
