import {IComponent} from './IComponent';
import {EventManager} from '../events/EventManager';
import {CommandManager} from '../commands/CommandManager';
import {SQLize} from '../database/SQLize';

export default interface IClient {
  components: Map<string, IComponent>;
  eventManager: EventManager;
  commandManager: CommandManager;
  database: SQLize;

  initialize(): Promise<void>;
}
