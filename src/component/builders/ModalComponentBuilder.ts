import {ComponentEnum} from '../../enum/ComponentEnum';
import ComponentBuilder from '../api/ComponentBuilder';

export default class ModalComponentBuilder extends ComponentBuilder {
  constructor() {
    super();
    this.setType(ComponentEnum.MODAL);
  }
}
