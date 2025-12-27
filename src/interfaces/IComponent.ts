import {ComponentEnum} from '../enum/ComponentEnum';

export interface IComponent {
  customId: string;
  handler: (interaction: any) => Promise<void>;
  type: ComponentEnum;
  userCheck?: string[];
}
