// This edition saves practice progress in browser storage, with no account service.
// Compatibility hooks keep the shared chart and Review renderers on their local paths.
function accountHistoryEnabled() { return false; }
function serverAccuracy() { return null; }
function serverDateAccuracy() { return null; }
function completeServerSpeedXp() {}
function reconcileAccountProgress() {}
