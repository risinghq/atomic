import { registerRootComponent } from 'expo';
import { App } from './src/App';
import { registerWidget } from './src/widget/platform';

registerRootComponent(App);
registerWidget();
