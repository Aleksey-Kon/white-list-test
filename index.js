// Background launches load the JS entry without mounting Expo Router's layouts.
// Define native tasks before registering the UI so cold starts can finish too.
import './services/backgroundTimerTask';
import './services/backgroundMonitor';
import 'expo-router/entry';
