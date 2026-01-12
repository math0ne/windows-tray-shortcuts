const robot = require('robotjs');
const { spawn } = require('child_process');

class ShortcutExecutor {
  // Map our key names to robotjs key names
  static mapKeyToRobotjs(key) {
    const keyMap = {
      // Note: Print Screen might not be supported by robotjs on Windows
      // Keep as 'printscreen' - robotjs may not support it at all
      'pageup': 'page_up',
      'pagedown': 'page_down'
      // Numpad keys keep their underscores as-is
    };

    return keyMap[key] || key;
  }

  // Execute keyboard shortcut using robotjs
  static executeKeyboard(action) {
    try {
      const { keys } = action;

      if (!keys || keys.length === 0) {
        throw new Error('No keys specified for keyboard shortcut');
      }

      // Press all modifier keys down (all except last key)
      const modifiers = keys.slice(0, -1);
      const finalKey = keys[keys.length - 1];

      console.log(`Executing keyboard shortcut: ${keys.join(' + ')}`);

      // Map keys to robotjs format
      const mappedModifiers = modifiers.map(mod => this.mapKeyToRobotjs(mod));
      const mappedFinalKey = this.mapKeyToRobotjs(finalKey);

      console.log(`Mapped to robotjs: ${[...mappedModifiers, mappedFinalKey].join(' + ')}`);

      // Press modifiers down
      try {
        mappedModifiers.forEach(mod => {
          robot.keyToggle(mod, 'down');
        });
      } catch (error) {
        console.error(`Failed to press modifier key: ${error.message}`);
        throw new Error(`Invalid modifier key: ${modifiers.join(', ')}`);
      }

      // Tap the final key
      try {
        robot.keyTap(mappedFinalKey);
      } catch (error) {
        // Release any pressed modifiers before throwing
        mappedModifiers.reverse().forEach(mod => {
          try {
            robot.keyToggle(mod, 'up');
          } catch (e) {
            // Ignore errors when releasing
          }
        });
        console.error(`Failed to tap key '${mappedFinalKey}' (original: '${finalKey}')`);
        throw new Error(`Invalid or unsupported key: '${finalKey}'. Robotjs may not support this key on Windows.`);
      }

      // Release modifiers in reverse order
      mappedModifiers.reverse().forEach(mod => {
        robot.keyToggle(mod, 'up');
      });

      console.log('Keyboard shortcut executed successfully');
      return true;
    } catch (error) {
      console.error('Keyboard shortcut execution failed:', error);
      return false;
    }
  }

  // Execute external program
  static executeExe(action) {
    try {
      const { path, args = [] } = action;

      if (!path) {
        throw new Error('No path specified for executable');
      }

      console.log(`Launching executable: ${path}`, args.length > 0 ? `with args: ${args.join(' ')}` : '');

      // Spawn process in detached mode (don't wait for it to exit)
      const childProcess = spawn(path, args, {
        detached: true,
        stdio: 'ignore'
      });

      // Unreference the child process so parent can exit independently
      childProcess.unref();

      console.log('Executable launched successfully');
      return true;
    } catch (error) {
      console.error('Executable launch failed:', error);
      return false;
    }
  }

  // Main execute function that routes to appropriate handler
  static execute(shortcut) {
    if (!shortcut || !shortcut.type || !shortcut.action) {
      console.error('Invalid shortcut configuration');
      return false;
    }

    switch (shortcut.type) {
      case 'keyboard':
        return this.executeKeyboard(shortcut.action);
      case 'executable':
        return this.executeExe(shortcut.action);
      default:
        console.error(`Unknown shortcut type: ${shortcut.type}`);
        return false;
    }
  }
}

module.exports = ShortcutExecutor;
