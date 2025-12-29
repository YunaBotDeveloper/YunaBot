import Access from '../../instances/Access';
import {IComponent} from '../../interfaces/IComponent';
import ComponentBuilder from '../api/ComponentBuilder';

export default class ComponentManager {
  public static instance: ComponentManager;
  private client = Access.getClient();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  public static getComponentManager(): ComponentManager {
    if (!ComponentManager.instance) {
      ComponentManager.instance = new ComponentManager();
    }
    return ComponentManager.instance;
  }

  public register(components: (IComponent | ComponentBuilder)[]) {
    components.forEach(comp => {
      if (comp instanceof ComponentBuilder && !comp.isComponentBuilt()) {
        throw new Error('Component must be built before registration');
      }

      const builtComponent =
        comp instanceof ComponentBuilder ? comp.build() : comp;

      this.client.components.set(builtComponent.customId, builtComponent);

      if (builtComponent.timeout && builtComponent.timeout > 0) {
        const timeoutId = setTimeout(async () => {
          this.unregister(builtComponent.customId);
          if (builtComponent.onTimeout) {
            try {
              await builtComponent.onTimeout();
            } catch (error) {
              console.log(error);
            }
          }
        }, builtComponent.timeout);

        this.timeouts.set(builtComponent.customId, timeoutId);
      }
    });
  }

  public unregister(customId: string): boolean {
    const timeoutId = this.timeouts.get(customId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(customId);
    }

    return this.client.components.delete(customId);
  }

  public unregisterMany(customIds: string[]): void {
    customIds.forEach(id => this.unregister(id));
  }
}
