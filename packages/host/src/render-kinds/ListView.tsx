// `list` renderer. Generic: text + opaque state + optional badge. Host never reads `state`'s meaning. / list 渲染器:通用,text+不透明 state+可选 badge,host 不解读 state 含义
import type { ListItem } from '@isle/protocol';

export function ListView({ items }: { items: ListItem[] }): JSX.Element {
  if (items.length === 0) return <div className="rk-empty">empty / 空</div>;
  return (
    <ul className="rk-list">
      {items.map((item, i) => (
        <li key={i} className={`rk-list__item${item.state ? ` rk-list__item--${item.state}` : ''}`}>
          <span className="rk-list__text">{item.text}</span>
          {item.badge && <span className="rk-list__badge">{item.badge}</span>}
        </li>
      ))}
    </ul>
  );
}
