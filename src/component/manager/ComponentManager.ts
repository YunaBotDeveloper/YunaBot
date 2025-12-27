import Access from '../../instances/Access';
import {IComponent} from '../../interfaces/IComponent';
import ComponentBuilder from '../api/ComponentBuilder';

export default class ComponentManager {
  public static instance: ComponentManager;
  private client = Access.getClient();

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

      const builtComponents =
        comp instanceof ComponentBuilder ? comp.build() : comp;

      this.client.components.set(builtComponents.customId, builtComponents);
    });
  }
}
