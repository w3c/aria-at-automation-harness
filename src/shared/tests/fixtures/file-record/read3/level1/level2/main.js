function measureTime(fn) {
  const now = Date.now();
  try {
    return fn();
  } finally {
    window.measure = Date.now() - now;
  }
}
