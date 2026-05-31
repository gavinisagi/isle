// `text` renderer. Accepts either the { blocks } or { text } shape. / text 渲染器:支持 { blocks } 或 { text } 两种形状
import type { TextBlock } from '@isle/protocol';

type TextData = { blocks: TextBlock[] } | { text: string };

export function TextView({ data }: { data: TextData }): JSX.Element {
  if ('text' in data) return <p className="rk-text">{data.text}</p>;
  return (
    <div className="rk-text">
      {data.blocks.map((block, i) => (
        <p key={i} className="rk-text__block">
          {block.text}
        </p>
      ))}
    </div>
  );
}
