import {ComponentEnum} from '../../enum/ComponentEnum';
import ComponentBuilder from '../api/ComponentBuilder';

export default class ButtonComponentBuilder extends ComponentBuilder {
  constructor() {
    super();
    this.setType(ComponentEnum.BUTTON);
  }
}
