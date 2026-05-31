// `control` renderer. Buttons POST their action back to the owning brick. / control 渲染器:按钮把动作 POST 回所属 brick
import type { Control } from '@isle/protocol';

interface ControlViewProps {
  controls: Control[];
  brickId: string;
}

export function ControlView({ controls, brickId }: ControlViewProps): JSX.Element {
  return (
    <div className="rk-control">
      {controls.map((control, i) => (
        <button
          key={i}
          type="button"
          className="rk-control__btn"
          onClick={(e) => {
            e.stopPropagation(); // don't collapse the island on a control press / 按控件不收起岛
            window.isle.sendAction(brickId, control.action);
          }}
        >
          {control.label}
        </button>
      ))}
    </div>
  );
}
