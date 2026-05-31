// tone → CSS class. This is the host's ONLY semantic output — it colors, nothing more. / tone→CSS 类,host 唯一语义输出:只上色
import type { MetricTone, StatusTone } from '@isle/protocol';

// Classes resolve to the --tone-* CSS vars in styles.css. / 类对应 styles.css 的 --tone-* 变量
export function toneClass(tone: MetricTone | StatusTone | undefined): string {
  return tone ? `tone-${tone}` : '';
}
