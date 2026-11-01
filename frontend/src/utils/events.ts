export const authEventEmitter = new EventTarget();

export const triggerGlobalLogout = () => {
  authEventEmitter.dispatchEvent(new Event('logout'));
};
