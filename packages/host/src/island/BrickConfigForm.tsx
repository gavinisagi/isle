// Domain-blind config form (Q16 ②): renders the fields a brick declared in manifest.config, by `type` only. / 域无知配置表单(Q16 ②):仅按 type 渲染 brick 在 manifest.config 声明的字段
// The host never understands what a field MEANS — `secret` masks the input, that is the full extent of its knowledge. / host 永不理解字段含义,secret 打码即其全部认知
import { useEffect, useState } from 'react';
import type { Manifest } from '@isle/protocol';
import type { BrickConfigValues } from '../../shared/types.js';

export function BrickConfigForm({
  manifest,
  onClose,
}: {
  manifest: Manifest;
  onClose: () => void;
}): JSX.Element | null {
  const fields = manifest.config ?? [];
  const [values, setValues] = useState<BrickConfigValues>({});
  const [loaded, setLoaded] = useState(false);

  // Prefill from saved values, falling back to each field's declared default. / 用已存值预填,回退到各字段声明的默认值
  useEffect(() => {
    let alive = true;
    void window.isle?.getBrickConfig(manifest.id).then((saved) => {
      if (!alive) return;
      const init: BrickConfigValues = {};
      for (const f of fields) {
        const s = saved[f.key];
        if (s !== undefined) init[f.key] = s;
        else if (f.default !== undefined) init[f.key] = f.default;
      }
      setValues(init);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
    // Re-run only when switching bricks; `fields` is derived from manifest. / 仅切换 brick 时重跑,fields 由 manifest 派生
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest.id]);

  if (fields.length === 0) return null;

  const save = (): void => {
    void window.isle?.setBrickConfig(manifest.id, values).then(onClose);
  };

  return (
    <div className="isle-config">
      {fields.map((f) => (
        <label key={f.key} className="isle-config__row">
          <span className="isle-config__label">{f.label}</span>
          <input
            className="isle-config__input"
            type={f.type === 'secret' ? 'password' : f.type === 'number' ? 'number' : 'text'}
            value={String(values[f.key] ?? '')}
            disabled={!loaded}
            onChange={(e) => {
              const raw = e.target.value;
              setValues((prev) => ({ ...prev, [f.key]: f.type === 'number' ? Number(raw) : raw }));
            }}
          />
        </label>
      ))}
      <div className="isle-config__actions">
        <button className="isle-config__btn" onClick={save} disabled={!loaded}>
          save / 保存
        </button>
        <button className="isle-config__btn isle-config__btn--ghost" onClick={onClose}>
          cancel / 取消
        </button>
      </div>
    </div>
  );
}
