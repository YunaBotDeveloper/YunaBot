import {
  ButtonInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';
import {IComponent} from '../../interfaces/IComponent';
import {ComponentEnum} from '../../enum/ComponentEnum';

export default abstract class ComponentBuilder {
  protected data: Partial<IComponent> = {};
  private isBuilt = false;

  public setCustomId(customId: string): this {
    this.data.customId = customId;
    return this;
  }

  public setHandler(
    handler: (
      interaction:
        | ButtonInteraction
        | StringSelectMenuInteraction
        | ModalSubmitInteraction,
    ) => Promise<void>,
  ): this {
    this.data.handler = handler;
    return this;
  }

  public setType(type: ComponentEnum): this {
    this.data.type = type;
    return this;
  }

  public setUserCheck(userCheck: string[]): this {
    this.data.userCheck = userCheck;
    return this;
  }

  public setTimeout(timeout: number): this {
    this.data.timeout = timeout;
    return this;
  }

  public setOnTimeout(onTimeout: () => Promise<void> | void): this {
    this.data.onTimeout = onTimeout;
    return this;
  }

  public build(): IComponent {
    if (
      !this.data.customId ||
      !this.data.handler ||
      !this.data.type ||
      !this.data.userCheck
    ) {
      throw new Error('Missing required fields to build components');
    }
    this.isBuilt = true;
    return this.data as IComponent;
  }

  public isComponentBuilt(): boolean {
    return this.isBuilt;
  }
}
