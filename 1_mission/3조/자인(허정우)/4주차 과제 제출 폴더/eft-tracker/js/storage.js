import { STORAGE_KEY } from './data.js';

export function defaultState() {
  return {
    nickname: '',
    splashSeen: false,
    onboardingDone: false,
    eftGuideSeen: false,
    dailyChecks: [],
    eftSessions: [],
  };
}

export function createStore(backend) {
  function load() {
    const raw = backend.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    try {
      return { ...defaultState(), ...JSON.parse(raw) };
    } catch {
      return defaultState();
    }
  }

  function save(state) {
    backend.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function update(mutator) {
    const state = load();
    mutator(state);
    save(state);
    return state;
  }

  return {
    load,
    save,
    setNickname(nickname) { return update((s) => { s.nickname = nickname; }); },
    setSplashSeen() { return update((s) => { s.splashSeen = true; }); },
    setOnboardingDone() { return update((s) => { s.onboardingDone = true; }); },
    setEftGuideSeen() { return update((s) => { s.eftGuideSeen = true; }); },
    addDailyCheck(check) { return update((s) => { s.dailyChecks.push(check); }); },
    addSession(session) {
      const withId = {
        ...session,
        id: session.id || `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      };
      update((s) => { s.eftSessions.push(withId); });
      return withId;
    },
  };
}
