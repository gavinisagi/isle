// The `action` frame: host → brick over POST /action. / action 帧:host→brick 走 POST /action
export interface ActionFrame {
  // Must be one of the brick's manifest `actions`. / 必须是 brick manifest 中声明的 actions 之一
  name: string;
}
