import {ComponentEnum} from '../enum/ComponentEnum';

export interface IComponent {
  customId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (interaction: any) => Promise<void>;
  type: ComponentEnum;
  userCheck?: string[];
  timeout?: number;
  onTimeout?: () => Promise<void> | void;
}
