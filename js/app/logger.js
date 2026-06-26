const MAX_LOGS = 300;
const logs = [];

export function isDebugEnabled() {
  try {
    return (
      new URLSearchParams(location.search).has('debug') ||
      localStorage.getItem('call-prep-debug') === '1'
    );
  } catch {
    return false;
  }
}

export function log(category, message, data) {
  const entry = {
    time: new Date().toISOString(),
    category,
    message,
    data: data ?? null,
  };
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();

  if (isDebugEnabled()) {
    const prefix = `[call-prep:${category}]`;
    if (data !== undefined) console.debug(prefix, message, data);
    else console.debug(prefix, message);
  }
}

export function getLogs() {
  return [...logs];
}

export function exposeDebugApi(getState) {
  window.__callPrepLogs = getLogs;
  window.__callPrepDebug = () => ({
    logs: getLogs(),
    state: getState?.() ?? null,
  });

  if (isDebugEnabled()) {
    log('app', 'Debug mode enabled — use window.__callPrepDebug()');
  }
}
