import './styles.css';
import { startApp } from './app';

export const APP_NAME = 'Cloudia';

const root = document.getElementById('app');
if (root) void startApp(root);
