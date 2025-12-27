import {ComponentEnum} from '../../enum/ComponentEnum';
import ComponentBuilder from '../api/ComponentBuilder';

export default class SelectMenuComponentBuilder extends ComponentBuilder {
  constructor() {
    super();
    this.setType(ComponentEnum.MENU);
  }
}
