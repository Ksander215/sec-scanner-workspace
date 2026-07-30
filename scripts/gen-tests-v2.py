#!/usr/bin/env python3
import os
TB = '/home/z/my-project/src/__tests__/desktop'
def w(p, c):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f: f.write(c)

Q = chr(39)  # single quote

w(TB + '/window-manager.test.ts', f"""import {{ describe, it, expect, beforeEach }} from {Q}vitest{Q};
import {{ WindowManager }} from {Q}../../desktop/window-manager/window-manager.js{Q};
import {{ WindowState, WindowType }} from {Q}../../desktop/window-manager/types.js{Q};
import type {{ WindowId }} from {Q}../../desktop/window-manager/types.js{Q};
import {{ WindowNotFoundError, WindowLimitExceededError, InvalidWindowTransitionError }} from {Q}../../desktop/window-manager/errors.js{Q};

describe({Q}WindowManager{Q}, () => {{
  let wm: WindowManager;
  beforeEach(() => {{ wm = new WindowManager({{ maxWindows: 5 }}); }});

  describe({Q}lifecycle{Q}, () => {{
    it({Q}should initialize{Q}, async () => {{ await wm.initialize(); expect(wm.initialized).toBe(true); }});
    it({Q}should start{Q}, async () => {{ await wm.initialize(); await wm.start(); expect(wm.initialized).toBe(true); }});
    it({Q}should stop and clear{Q}, async () => {{ wm.create({{ type: WindowType.Main }}); await wm.stop(); expect(wm.count).toBe(0); }});
    it({Q}should shutdown{Q}, async () => {{ await wm.initialize(); await wm.shutdown(); expect(wm.initialized).toBe(false); }});
    it({Q}should have correct name{Q}, () => {{ expect(wm.name).toBe({Q}WindowManager{Q}); }});
    it({Q}should have 0 windows initially{Q}, () => {{ expect(wm.count).toBe(0); }});
    it({Q}should have null focused initially{Q}, () => {{ expect(wm.focusedWindow).toBeNull(); }});
  }});

  describe({Q}create{Q}, () => {{
    it({Q}should create main window{Q}, () => {{ const w = wm.create({{ type: WindowType.Main, title: {Q}Test{Q} }}); expect(w.title).toBe({Q}Test{Q}); expect(w.type).toBe(WindowType.Main); }});
    it({Q}should assign unique IDs{Q}, () => {{ const w1 = wm.create({{ type: WindowType.Main }}); const w2 = wm.create({{ type: WindowType.Main }}); expect(w1.id).not.toBe(w2.id); }});
    it({Q}should set default bounds{Q}, () => {{ const w = wm.create({{ type: WindowType.Main }}); expect(w.bounds.width).toBe(1024); }});
    it({Q}should apply custom bounds{Q}, () => {{ const w = wm.create({{ type: WindowType.Main, bounds: {{ width: 800, height: 600 }} }}); expect(w.bounds.width).toBe(800); }});
    it({Q}should auto-focus new window{Q}, () => {{ const w = wm.create({{ type: WindowType.Main }}); expect(w.focused).toBe(true); }});
    it({Q}should increment count{Q}, () => {{ wm.create({{ type: WindowType.Main }}); wm.create({{ type: WindowType.Conversation }}); expect(wm.count).toBe(2); }});
    it({Q}should throw on limit exceeded{Q}, () => {{ for (let i = 0; i < 5; i++) wm.create({{ type: WindowType.Main }}); expect(() => wm.create({{ type: WindowType.Main }})).toThrow(WindowLimitExceededError); }});
    it({Q}should set timestamps{Q}, () => {{ const w = wm.create({{ type: WindowType.Main }}); expect(w.createdAt).toBeTruthy(); }});
    it({Q}should create floating window{Q}, () => {{ const w = wm.create({{ type: WindowType.Floating }}); expect(w.type).toBe(WindowType.Floating); }});
    it({Q}should create settings window{Q}, () => {{ const w = wm.create({{ type: WindowType.Settings }}); expect(w.type).toBe(WindowType.Settings); }});
    it({Q}should create conversation window{Q}, () => {{ const w = wm.create({{ type: WindowType.Conversation }}); expect(w.type).toBe(WindowType.Conversation); }});
    it({Q}should create project window{Q}, () => {{ const w = wm.create({{ type: WindowType.Project }}); expect(w.type).toBe(WindowType.Project); }});
    it({Q}should create diagnostics window{Q}, () => {{ const w = wm.create({{ type: WindowType.Diagnostics }}); expect(w.type).toBe(WindowType.Diagnostics); }});
    it({Q}should use default title when not provided{Q}, () => {{ const w = wm.create({{ type: WindowType.Main }}); expect(w.title).toBeTruthy(); }});
  }});

  describe({Q}get{Q}, () => {{
    it({Q}should get all{Q}, () => {{ wm.create({{ type: WindowType.Main }}); wm.create({{ type: WindowType.Conversation }}); expect(wm.getAll().length).toBe(2); }});
    it({Q}should get by ID{Q}, () => {{ const w = wm.create({{ type: WindowType.Main }}); expect(wm.getById(w.id).id).toBe(w.id); }});
    it({Q}should throw on non-existent ID{Q}, () => {{ expect(() => wm.getById({Q}bad{Q} as WindowId)).toThrow(WindowNotFoundError); }});
    it({Q}should get by type{Q}, () => {{ wm.create({{ type: WindowType.Main }}); wm.create({{ type: WindowType.Main }}); wm.create({{ type: WindowType.Conversation }}); expect(wm.getByType(WindowType.Main).length).toBe(2); }});
    it({Q}should get focused window{Q}, () => {{ const w = wm.create({{ type: WindowType.Main }}); expect(wm.focusedWindow?.id).toBe(w.id); }});
    it({Q}should return null focused when empty{Q}, () => {{ expect(wm.focusedWindow).toBeNull(); }});
  }});

  describe({Q}focus{Q}, () => {{
    it({Q}should focus window{Q}, () => {{ const w1 = wm.create({{ type: WindowType.Main }}); const w2 = wm.create({{ type: WindowType.Conversation }}); wm.focus(w1.id); expect(wm.focusedWindow?.id).toBe(w1.id); }});
    it({Q}should throw on non-existent{Q}, () => {{ expect(() => wm.focus({Q}bad{Q} as WindowId)).toThrow(WindowNotFoundError); }});
    it({Q}should update zIndex{Q}, () => {{ const w1 = wm.create({{ type: WindowType.Main }}); const w2 = wm.create({{ type: WindowType.Conversation }}); const z = wm.getById(w1.id).zIndex; wm.focus(w1.id); expect(wm.getById(w1.id).zIndex).toBeGreaterThan(z); }});
    it({Q}should unfocus others{Q}, () => {{ const w1 = wm.create({{ type: WindowType.Main }}); const w2 = wm.create({{ type: WindowType.Conversation }}); wm.focus(w1.id); expect(wm.getById(w2.id).focused).toBe(false); }});
  }});

  describe({Q}state transitions{Q}, () => {{
    it({Q}should minimize{Q}, () => {{ const w = wm.create({{ type: WindowType.Main }}); wm.setState(w.id, WindowState.Minimized); expect(wm.getById(w.id).state).toBe(WindowState.Minimized); }});
    it({Q}should maximize{Q}, () => {{ const w = wm.create({{ type: WindowType.Main }}); wm.setState(w.id, WindowState.Maximized); expect(wm.getById(w.id).state).toBe(WindowState.Maximized); }});
    it({Q}should restore from minimized{Q}, () => {{ const w = wm.create({{ type: WindowType.Main }}); wm.setState(w.id, WindowState.Minimized); wm.setState(w.id, WindowState.Active); }});
    it({Q}should throw on invalid transition{Q}, () => {{ const w = wm.create({{ type: WindowType.Main }}); wm.setState(w.id, WindowState.Minimized); expect(() => wm.setState(w.id, WindowState.Hidden as any)).toThrow(InvalidWindowTransitionError); }});
    it({Q}should throw on non-existent{Q}, () => {{ expect(() => wm.setState({Q}bad{Q} as WindowId, WindowState.Active)).toThrow(WindowNotFoundError); }});
    it({Q}should maximize from minimized{Q}, () => {{ const w = wm.create({{ type: WindowType.Main }}); wm.setState(w.id, WindowState.Minimized); wm.setState(w.id, WindowState.Maximized); }});
  }});

  describe({Q}close{Q}, () => {{
    it({Q}should close window{Q}, () => {{ const w = wm.create({{ type: WindowType.Main }}); wm.close(w.id); expect(wm.count).toBe(0); }});
    it({Q}should focus next on close{Q}, () => {{ const w1 = wm.create({{ type: WindowType.Main }}); const w2 = wm.create({{ type: WindowType.Conversation }}); wm.close(w2.id); expect(wm.focusedWindow?.id).toBe(w1.id); }});
    it({Q}should handle no other windows{Q}, () => {{ const w = wm.create({{ type: WindowType.Main }}); wm.close(w.id); expect(wm.focusedWindow).toBeNull(); }});
  }});

  describe({Q}bounds{Q}, () => {{
    it({Q}should update bounds{Q}, () => {{ const w = wm.create({{ type: WindowType.Main }}); wm.updateBounds(w.id, {{ width: 800 }}); expect(wm.getById(w.id).bounds.width).toBe(800); }});
    it({Q}should update position{Q}, () => {{ const w = wm.create({{ type: WindowType.Main }}); wm.updateBounds(w.id, {{ x: 100, y: 200 }}); expect(wm.getById(w.id).bounds.x).toBe(100); }});
    it({Q}should throw on non-existent{Q}, () => {{ expect(() => wm.updateBounds({Q}bad{Q} as WindowId, {{}})).toThrow(WindowNotFoundError); }});
    it({Q}should update timestamp{Q}, () => {{ const w = wm.create({{ type: WindowType.Main }}); const t = w.updatedAt; wm.updateBounds(w.id, {{ width: 100 }}); expect(wm.getById(w.id).updatedAt).not.toBe(t); }});
  }});

  describe({Q}layout{Q}, () => {{
    it({Q}should get layout{Q}, () => {{ wm.create({{ type: WindowType.Main }}); wm.create({{ type: WindowType.Conversation }}); expect(wm.getLayout().length).toBe(2); }});
    it({Q}should restore layout{Q}, () => {{ const w = wm.create({{ type: WindowType.Main, bounds: {{ width: 800 }} }}); wm.setState(w.id, WindowState.Minimized); const l = wm.getLayout(); wm.updateBounds(w.id, {{ width: 1920 }}); wm.restoreLayout(l); expect(wm.getById(w.id).bounds.width).toBe(800); }});
    it({Q}should handle empty restore{Q}, () => {{ expect(() => wm.restoreLayout([])).not.toThrow(); }});
  }});

  describe({Q}config{Q}, () => {{
    it({Q}should respect custom maxWindows{Q}, () => {{ const c = new WindowManager({{ maxWindows: 2 }}); c.create({{ type: WindowType.Main }}); c.create({{ type: WindowType.Main }}); expect(() => c.create({{ type: WindowType.Main }})).toThrow(WindowLimitExceededError); }});
  }});
}});
""")
print('window-manager tests: OK')

w(TB + '/navigation-runtime.test.ts', f"""import {{ describe, it, expect, beforeEach }} from {Q}vitest{Q};
import {{ NavigationRuntime }} from {Q}../../desktop/navigation-runtime/navigation-runtime.js{Q};
import {{ ScreenName }} from {Q}../../desktop/navigation-runtime/types.js{Q};
import {{ ScreenNotFoundError, NavigationHistoryError, DuplicateScreenError }} from {Q}../../desktop/navigation-runtime/errors.js{Q};

describe({Q}NavigationRuntime{Q}, () => {{
  let nav: NavigationRuntime;
  beforeEach(async () => {{ nav = new NavigationRuntime(); await nav.initialize(); }});

  describe({Q}lifecycle{Q}, () => {{
    it({Q}should initialize{Q}, () => {{ expect(nav.initialized).toBe(true); }});
    it({Q}should have correct name{Q}, () => {{ expect(nav.name).toBe({Q}NavigationRuntime{Q}); }});
    it({Q}should start with home{Q}, async () => {{ await nav.start(); expect(nav.currentPath).toBe({Q}/{Q}); }});
    it({Q}should stop and clear{Q}, async () => {{ await nav.stop(); expect(nav.historyCount).toBe(0); }});
    it({Q}should shutdown and clear{Q}, async () => {{ await nav.shutdown(); expect(nav.getAllScreens().length).toBe(0); }});
  }});

  describe({Q}screens{Q}, () => {{
    it({Q}should have 9 default screens{Q}, () => {{ expect(nav.getAllScreens().length).toBe(9); }});
    it({Q}should be in order{Q}, () => {{ const s = nav.getAllScreens(); expect(s[0]!.name).toBe(ScreenName.Home); expect(s[8]!.name).toBe(ScreenName.Diagnostics); }});
    it({Q}should register custom{Q}, () => {{ nav.registerScreen({{ id: {Q}x{Q} as any, name: ScreenName.Home, path: {Q}/custom{Q}, title: {Q}Custom{Q}, order: 10 }}); expect(nav.getAllScreens().length).toBe(10); }});
    it({Q}should throw on duplicate path{Q}, () => {{ expect(() => nav.registerScreen({{ id: {Q}d{Q} as any, name: ScreenName.Home, path: {Q}/{Q}, title: {Q}D{Q}, order: 99 }})).toThrow(DuplicateScreenError); }});
    it({Q}should unregister{Q}, () => {{ nav.unregisterScreen({Q}/{Q}); expect(nav.getAllScreens().length).toBe(8); }});
    it({Q}should get by path{Q}, () => {{ expect(nav.getScreen({Q}/{Q}).title).toBe({Q}Home{Q}); }});
    it({Q}should throw on missing path{Q}, () => {{ expect(() => nav.getScreen({Q}/no{Q})).toThrow(ScreenNotFoundError); }});
    it({Q}should get by name{Q}, () => {{ expect(nav.getScreenByName(ScreenName.Settings)?.path).toBe({Q}/settings{Q}); }});
    it({Q}should return null for missing name{Q}, () => {{ expect(nav.getScreenByName({Q}X{Q} as any)).toBeNull(); }});
  }});

  describe({Q}navigation{Q}, () => {{
    it({Q}should navigate{Q}, () => {{ nav.navigate({Q}/projects{Q}); expect(nav.currentPath).toBe({Q}/projects{Q}); }});
    it({Q}should build history{Q}, () => {{ nav.navigate({Q}/projects{Q}); nav.navigate({Q}/settings{Q}); expect(nav.historyCount).toBe(3); }});
    it({Q}should navigate with params{Q}, () => {{ nav.navigate({Q}/conversation{Q}, {{ id: {Q}123{Q} }}); expect(nav.getState().history[1]!.params).toEqual({{ id: {Q}123{Q} }}); }});
    it({Q}should truncate forward history{Q}, () => {{ nav.navigate({Q}/projects{Q}); nav.navigate({Q}/settings{Q}); nav.goBack(); nav.navigate({Q}/memory{Q}); expect(nav.getState().canGoForward).toBe(false); }});
  }});

  describe({Q}history{Q}, () => {{
    it({Q}should go back{Q}, () => {{ nav.navigate({Q}/projects{Q}); nav.goBack(); expect(nav.currentPath).toBe({Q}/{Q}); }});
    it({Q}should throw on goBack at start{Q}, () => {{ expect(() => nav.goBack()).toThrow(NavigationHistoryError); }});
    it({Q}should go forward{Q}, () => {{ nav.navigate({Q}/projects{Q}); nav.goBack(); nav.goForward(); expect(nav.currentPath).toBe({Q}/projects{Q}); }});
    it({Q}should throw on goForward at end{Q}, () => {{ expect(() => nav.goForward()).toThrow(NavigationHistoryError); }});
    it({Q}should report canGoBack{Q}, () => {{ expect(nav.getState().canGoBack).toBe(false); nav.navigate({Q}/projects{Q}); expect(nav.getState().canGoBack).toBe(true); }});
    it({Q}should report canGoForward{Q}, () => {{ expect(nav.getState().canGoForward).toBe(false); nav.navigate({Q}/projects{Q}); nav.goBack(); expect(nav.getState().canGoForward).toBe(true); }});
  }});

  describe({Q}getState{Q}, () => {{
    it({Q}should return current screen{Q}, () => {{ expect(nav.getState().current?.title).toBe({Q}Home{Q}); }});
    it({Q}should return full history{Q}, () => {{ nav.navigate({Q}/projects{Q}); expect(nav.getState().history.length).toBe(2); }});
    it({Q}should return correct index{Q}, () => {{ nav.navigate({Q}/projects{Q}); nav.navigate({Q}/settings{Q}); expect(nav.getState().historyIndex).toBe(2); }});
    it({Q}should return null before start{Q}, () => {{ const n = new NavigationRuntime(); expect(n.getState().current).toBeNull(); }});
  }});
}});
""")
print('navigation-runtime tests: OK')

# Simple runtime tests
simple = [
  ('local-storage-runtime', 'LocalStorageRuntime', [
    ('set string', 'rt.set("k", "v"); expect(rt.get("k")).toBe("v");'),
    ('set number', 'rt.set("n", 42); expect(rt.get("n")).toBe(42);'),
    ('set object', 'rt.set("o", {a:1}); expect(rt.get("o")).toEqual({a:1});'),
    ('set boolean', 'rt.set("f", true); expect(rt.get("f")).toBe(true);'),
    ('set null', 'rt.set("n", null); expect(rt.get("n")).toBeNull();'),
    ('has existing', 'rt.set("x", 1); expect(rt.has("x")).toBe(true);'),
    ('has missing', 'expect(rt.has("m")).toBe(false);'),
    ('delete existing', 'rt.set("x", 1); expect(rt.delete("x")).toBe(true); expect(rt.has("x")).toBe(false);'),
    ('delete missing', 'expect(rt.delete("m")).toBe(false);'),
    ('clear', 'rt.set("a", 1); rt.set("b", 2); rt.clear(); expect(rt.size).toBe(0);'),
    ('size', 'rt.set("a", 1); rt.set("b", 2); expect(rt.size).toBe(2);'),
    ('keys', 'rt.set("a", 1); rt.set("b", 2); expect(rt.keys()).toEqual(["a","b"]);'),
    ('entries', 'rt.set("a", 1); rt.set("b", 2); expect(rt.entries().length).toBe(2);'),
    ('get missing', 'expect(rt.get("m")).toBeUndefined();'),
    ('overwrite', 'rt.set("x", 1); rt.set("x", 2); expect(rt.get("x")).toBe(2);'),
    ('get after clear', 'rt.set("x", 1); rt.clear(); expect(rt.get("x")).toBeUndefined();'),
    ('empty initially', 'expect(rt.size).toBe(0);'),
    ('set array', 'rt.set("arr", [1,2,3]); expect(rt.get<number[]>("arr")).toEqual([1,2,3]);'),
    ('set nested object', 'rt.set("n", {a:{b:1}}); expect(rt.get("n")).toEqual({a:{b:1}});'),
  ]),
  ('search-runtime', 'SearchRuntime', [
    ('index doc', 'rt.indexDocument("c", "1", {title:"Hello"}); expect(rt.getCollectionSize("c")).toBe(1);'),
    ('find match', 'rt.indexDocument("c", "1", {name:"alice"}); rt.indexDocument("c", "2", {name:"bob"}); expect(rt.search("c", "alice").length).toBe(1);'),
    ('case insensitive', 'rt.indexDocument("c", "1", {name:"Alice"}); expect(rt.search("c", "alice").length).toBe(1);'),
    ('no match', 'rt.indexDocument("c", "1", {name:"alice"}); expect(rt.search("c", "bob").length).toBe(0);'),
    ('empty collection', 'expect(rt.search("m", "a").length).toBe(0);'),
    ('remove from index', 'rt.indexDocument("c", "1", {n:"a"}); rt.removeFromIndex("c", "1"); expect(rt.getCollectionSize("c")).toBe(0);'),
    ('collection names', 'rt.indexDocument("a", "1", {}); rt.indexDocument("b", "1", {}); expect(rt.getCollectionNames().length).toBe(2);'),
    ('clear collection', 'rt.indexDocument("c", "1", {}); rt.clearCollection("c"); expect(rt.getCollectionSize("c")).toBe(0);'),
    ('clear all', 'rt.indexDocument("a", "1", {}); rt.clearAll(); expect(rt.getCollectionNames().length).toBe(0);'),
    ('multi field search', 'rt.indexDocument("c", "1", {name:"alice",role:"admin"}); expect(rt.search("c", "admin").length).toBe(1);'),
    ('empty query', 'rt.indexDocument("c", "1", {n:"t"}); expect(rt.search("c", "").length).toBe(1);'),
    ('multiple docs', 'rt.indexDocument("c", "1", {n:"a"}); rt.indexDocument("c", "2", {n:"ab"}); rt.indexDocument("c", "3", {n:"abc"}); expect(rt.search("c", "ab").length).toBe(2);'),
    ('size of collection', 'rt.indexDocument("c", "1", {}); rt.indexDocument("c", "2", {}); expect(rt.getCollectionSize("c")).toBe(2);'),
    ('non-existing collection size', 'expect(rt.getCollectionSize("m")).toBe(0);'),
  ]),
  ('startup-runtime', 'StartupRuntime', [
    ('register step', 'rt.registerStep("s1", async () => {}); expect(rt.getStepCount()).toBe(1);'),
    ('register multiple', 'rt.registerStep("s1", async () => {}); rt.registerStep("s2", async () => {}); expect(rt.getStepCount()).toBe(2);'),
    ('run sequence', 'let ran = false; rt.registerStep("s1", async () => { ran = true; }); await rt.runStartupSequence(); expect(ran).toBe(true);'),
    ('completed steps', 'rt.registerStep("s1", async () => {}); rt.registerStep("s2", async () => {}); await rt.runStartupSequence(); expect(rt.getCompletedSteps().length).toBe(2);'),
    ('startup duration', 'await rt.runStartupSequence(); expect(rt.getStartupDuration()).toBeGreaterThanOrEqual(0);'),
    ('step completed', 'rt.registerStep("s1", async () => {}); await rt.runStartupSequence(); expect(rt.isStepCompleted("s1")).toBe(true);'),
    ('step not completed before run', 'rt.registerStep("s1", async () => {}); expect(rt.isStepCompleted("s1")).toBe(false);'),
    ('empty sequence', 'await rt.runStartupSequence(); expect(rt.getCompletedSteps().length).toBe(0);'),
    ('steps in order', 'const o: string[] = []; rt.registerStep("a", async () => { o.push("a"); }); rt.registerStep("b", async () => { o.push("b"); }); await rt.runStartupSequence(); expect(o).toEqual(["a","b"]);'),
    ('step count', 'rt.registerStep("a", async () => {}); expect(rt.getStepCount()).toBe(1);'),
  ]),
  ('settings-runtime', 'SettingsRuntime', [
    ('set and get', 'rt.set("theme", "dark"); expect(rt.get("theme")).toBe("dark");'),
    ('get missing', 'expect(rt.get("missing")).toBeUndefined();'),
    ('has key', 'rt.set("x", 1); expect(rt.has("x")).toBe(true);'),
    ('delete key', 'rt.set("x", 1); expect(rt.delete("x")).toBe(true);'),
    ('register default', 'rt.registerDefault("lang", "en"); expect(rt.get("lang")).toBe("en");'),
    ('setting overrides default', 'rt.registerDefault("lang", "en"); rt.set("lang", "ru"); expect(rt.get("lang")).toBe("ru");'),
    ('getAll', 'rt.set("a", 1); rt.set("b", 2); expect(rt.getAll().size).toBe(2);'),
    ('clear', 'rt.set("a", 1); rt.clear(); expect(rt.getAll().size).toBe(0);'),
    ('export', 'rt.set("a", 1); const e = rt.exportSettings(); expect(e.a).toBe(1);'),
    ('import', 'rt.importSettings({a:1,b:2}); expect(rt.get("a")).toBe(1);'),
    ('getDefaults', 'rt.registerDefault("x", 42); expect(rt.getDefaults().get("x")).toBe(42);'),
    ('has returns false', 'expect(rt.has("nope")).toBe(false);'),
    ('delete returns false', 'expect(rt.delete("nope")).toBe(false);'),
    ('empty export', 'const e = rt.exportSettings(); expect(Object.keys(e).length).toBe(0);'),
    ('import empty', 'rt.importSettings({}); expect(rt.getAll().size).toBe(0);'),
  ]),
  ('diagnostics-runtime', 'DiagnosticsRuntime', [
    ('register health check', 'rt.registerHealthCheck("db", async () => ({healthy:true})); expect(rt.getHealthCheckCount()).toBe(1);'),
    ('run health checks', 'rt.registerHealthCheck("db", async () => ({healthy:true})); const r = await rt.runHealthChecks(); expect(r.db.healthy).toBe(true);'),
    ('unhealthy', 'rt.registerHealthCheck("f", async () => ({healthy:false, message:"err"})); const r = await rt.runHealthChecks(); expect(r.f.healthy).toBe(false);'),
    ('record metric', 'rt.recordMetric("cpu", 75.5); expect(rt.getMetric("cpu")).toBe(75.5);'),
    ('get missing metric', 'expect(rt.getMetric("m")).toBeUndefined();'),
    ('getAllMetrics', 'rt.recordMetric("a", 1); rt.recordMetric("b", 2); expect(rt.getAllMetrics().size).toBe(2);'),
    ('log message', 'rt.log("info", "test"); expect(rt.getLogs().length).toBe(1);'),
 ('clear logs', 'rt.log("info", "a"); rt.clearLogs(); expect(rt.getLogs().length).toBe(0);'),
    ('log has timestamp', 'rt.log("info", "t"); expect(rt.getLogs()[0]!.timestamp).toBeTruthy();'),
    ('multiple logs', 'rt.log("info", "a"); rt.log("error", "b"); expect(rt.getLogs().length).toBe(2);'),
    ('log levels', 'rt.log("warn", "w"); rt.log("debug", "d"); expect(rt.getLogs()[0]!.level).toBe("warn");'),
    ('health check count', 'rt.registerHealthCheck("a", async () => ({healthy:true})); rt.registerHealthCheck("b", async () => ({healthy:true})); expect(rt.getHealthCheckCount()).toBe(2);'),
    ('empty health checks', 'const r = await rt.runHealthChecks(); expect(Object.keys(r).length).toBe(0);'),
    ('multiple metrics', 'rt.recordMetric("a", 1); rt.recordMetric("a", 2); expect(rt.getMetric("a")).toBe(2);'),
  ]),
  ('crash-recovery-runtime', 'CrashRecoveryRuntime', [
    ('save and get snapshot', 'rt.saveSnapshot("s1", {data:42}); expect(rt.getSnapshot("s1")?.data).toBe(42);'),
    ('has snapshot', 'rt.saveSnapshot("s1", {}); expect(rt.hasSnapshot("s1")).toBe(true); expect(rt.hasSnapshot("m")).toBe(false);'),
    ('delete snapshot', 'rt.saveSnapshot("s1", {}); expect(rt.deleteSnapshot("s1")).toBe(true);'),
    ('get missing', 'expect(rt.getSnapshot("m")).toBeUndefined();'),
    ('snapshot IDs', 'rt.saveSnapshot("a", {}); rt.saveSnapshot("b", {}); expect(rt.getSnapshotIds().length).toBe(2);'),
    ('record crash', 'rt.recordCrash("oom", {mem:"full"}); expect(rt.getCrashCount()).toBe(1);'),
    ('get last crash', 'rt.recordCrash("err", {}); const c = rt.getLastCrash(); expect(c?.reason).toBe("err");'),
    ('crash recovered flag', 'expect(rt.lastCrashRecovered).toBe(false); rt.setCrashRecovered(true); expect(rt.lastCrashRecovered).toBe(true);'),
    ('clear crash log', 'rt.recordCrash("a", {}); rt.clearCrashLog(); expect(rt.getCrashCount()).toBe(0);'),
    ('clear snapshots', 'rt.saveSnapshot("a", {}); rt.clearSnapshots(); expect(rt.getSnapshotIds().length).toBe(0);'),
    ('snapshot preserves data', 'rt.saveSnapshot("s", {x:[1,2,3],y:"test"}); const s = rt.getSnapshot("s"); expect(s?.x).toEqual([1,2,3]);'),
    ('multiple crashes', 'rt.recordCrash("a", {}); rt.recordCrash("b", {}); expect(rt.getCrashCount()).toBe(2);'),
    ('empty crash log', 'expect(rt.getCrashCount()).toBe(0);'),
    ('no last crash initially', 'expect(rt.getLastCrash()).toBeUndefined();'),
    ('delete non-existent snapshot', 'expect(rt.deleteSnapshot("m")).toBe(false);'),
    ('overwrite snapshot', 'rt.saveSnapshot("s", {v:1}); rt.saveSnapshot("s", {v:2}); expect(rt.getSnapshot("s")?.v).toBe(2);'),
  ]),
]

for mod, cls, methods in simple:
    method_tests = '\n'.join(f'    it({Q}{name}{Q}, () => {{ {body} }});' for name, body in methods)
    content = f"""import {{ describe, it, expect, beforeEach }} from {Q}vitest{Q};
import {{ {cls} }} from {Q}../../desktop/{mod}/{mod}.js{Q};

describe({Q}{cls}{Q}, () => {{
  let rt: {cls};
  beforeEach(async () => {{ rt = new {cls}(); await rt.initialize(); }});

  describe({Q}lifecycle{Q}, () => {{
    it({Q}should initialize{Q}, async () => {{ await rt.initialize(); expect(rt.initialized).toBe(true); }});
    it({Q}should have name{Q}, () => {{ expect(rt.name).toBe({Q}{cls}{Q}); }});
    it({Q}should start{Q}, async () => {{ await rt.initialize(); await rt.start(); }});
    it({Q}should stop{Q}, async () => {{ await rt.initialize(); await rt.stop(); }});
    it({Q}should shutdown{Q}, async () => {{ await rt.initialize(); await rt.shutdown(); expect(rt.initialized).toBe(false); }});
  }});

  describe({Q}methods{Q}, () => {{
{method_tests}
  }});

  describe({Q}edge cases{Q}, () => {{
    it({Q}should handle shutdown and reinit{Q}, async () => {{ await rt.shutdown(); await rt.initialize(); expect(rt.initialized).toBe(true); }});
    it({Q}should handle double init{Q}, async () => {{ await rt.initialize(); await rt.initialize(); expect(rt.initialized).toBe(true); }});
  }});
}});
"""
    w(f'{TB}/{mod}.test.ts', content)
    print(f'{mod} tests: OK')

# Desktop runtime orchestrator
w(TB + '/desktop-runtime.test.ts', f"""import {{ describe, it, expect, beforeEach }} from {Q}vitest{Q};
import {{ DesktopRuntime }} from {Q}../../desktop/desktop-runtime/desktop-runtime.js{Q};
import {{ DesktopState, DefaultDesktopRuntimeConfig }} from {Q}../../desktop/desktop-runtime/types.js{Q};
import {{ DesktopNotInitializedError, SubsystemNotFoundError }} from {Q}../../desktop/desktop-runtime/errors.js{Q};

describe({Q}DesktopRuntime{Q}, () => {{
  let dr: DesktopRuntime;
  beforeEach(() => {{ dr = new DesktopRuntime(); }});

  describe({Q}construction{Q}, () => {{
    it({Q}should create with default config{Q}, () => {{ expect(dr.state).toBe(DesktopState.Uninitialized); }});
    it({Q}should create with custom config{Q}, () => {{ const d = new DesktopRuntime({{ maxWindows: 5 }}); expect(d.state).toBe(DesktopState.Uninitialized); }});
    it({Q}should have 14 subsystems{Q}, () => {{ expect(dr.subsystemCount).toBe(14); }});
    it({Q}should have correct names{Q}, () => {{ expect(dr.subsystemNames).toContain({Q}WindowManager{Q}); expect(dr.subsystemNames).toContain({Q}NavigationRuntime{Q}); }});
    it({Q}should expose all subsystems{Q}, () => {{
      expect(dr.windowManager).toBeDefined(); expect(dr.navigation).toBeDefined(); expect(dr.workspace).toBeDefined();
      expect(dr.project).toBeDefined(); expect(dr.session).toBeDefined(); expect(dr.localStorage).toBeDefined();
      expect(dr.theme).toBeDefined(); expect(dr.notification).toBeDefined(); expect(dr.commandPalette).toBeDefined();
      expect(dr.search).toBeDefined(); expect(dr.startup).toBeDefined(); expect(dr.settings).toBeDefined();
      expect(dr.diagnostics).toBeDefined(); expect(dr.crashRecovery).toBeDefined();
    }});
  }});

  describe({Q}lifecycle{Q}, () => {{
    it({Q}should initialize all{Q}, async () => {{ await dr.initialize(); expect(dr.state).toBe(DesktopState.Ready); }});
    it({Q}should start all{Q}, async () => {{ await dr.initialize(); await dr.start(); expect(dr.state).toBe(DesktopState.Running); }});
    it({Q}should stop all{Q}, async () => {{ await dr.initialize(); await dr.start(); await dr.stop(); expect(dr.state).toBe(DesktopState.Stopped); }});
    it({Q}should shutdown all{Q}, async () => {{ await dr.initialize(); await dr.shutdown(); expect(dr.state).toBe(DesktopState.Uninitialized); }});
    it({Q}should throw on start before init{Q}, async () => {{ await expect(dr.start()).rejects.toThrow(DesktopNotInitializedError); }});
    it({Q}should throw on double start{Q}, async () => {{ await dr.initialize(); await dr.start(); await expect(dr.start()).rejects.toThrow(); }});
  }});

  describe({Q}getSubsystem{Q}, () => {{
    it({Q}should get by name{Q}, async () => {{ await dr.initialize(); const wm = dr.getSubsystem<any>({Q}WindowManager{Q}); expect(wm.name).toBe({Q}WindowManager{Q}); }});
    it({Q}should throw for missing{Q}, () => {{ expect(() => dr.getSubsystem({Q}Missing{Q})).toThrow(SubsystemNotFoundError); }});
  }});

  describe({Q}config{Q}, () => {{
    it({Q}should have app version{Q}, () => {{ expect(DefaultDesktopRuntimeConfig.appVersion).toBe({Q}1.0.0{Q}); }});
    it({Q}should have dev environment{Q}, () => {{ expect(DefaultDesktopRuntimeConfig.environment).toBe({Q}development{Q}); }});
    it({Q}should have crash recovery{Q}, () => {{ expect(DefaultDesktopRuntimeConfig.crashRecoveryEnabled).toBe(true); }});
    it({Q}should have auto start{Q}, () => {{ expect(DefaultDesktopRuntimeConfig.autoStart).toBe(true); }});
    it({Q}should have max windows{Q}, () => {{ expect(DefaultDesktopRuntimeConfig.maxWindows).toBe(20); }});
  }});

  describe({Q}state transitions{Q}, () => {{
    it({Q}should transition all states{Q}, async () => {{
      expect(dr.state).toBe(DesktopState.Uninitialized);
      await dr.initialize(); expect(dr.state).toBe(DesktopState.Ready);
      await dr.start(); expect(dr.state).toBe(DesktopState.Running);
      await dr.stop(); expect(dr.state).toBe(DesktopState.Stopped);
      await dr.shutdown(); expect(dr.state).toBe(DesktopState.Uninitialized);
    }});
  }});

  describe({Q}integration{Q}, () => {{
    it({Q}should init window manager{Q}, async () => {{ await dr.initialize(); expect(dr.windowManager.initialized).toBe(true); }});
    it({Q}should init navigation{Q}, async () => {{ await dr.initialize(); expect(dr.navigation.initialized).toBe(true); }});
    it({Q}should allow creating windows{Q}, async () => {{ await dr.initialize(); await dr.start(); dr.windowManager.create({type: {Q}Main{Q}} as any); expect(dr.windowManager.count).toBe(1); }});
    it({Q}should init workspace{Q}, async () => {{ await dr.initialize(); expect(dr.workspace.initialized).toBe(true); }});
    it({Q}should init project{Q}, async () => {{ await dr.initialize(); expect(dr.project.initialized).toBe(true); }});
    it({Q}should init session{Q}, async () => {{ await dr.initialize(); expect(dr.session.initialized).toBe(true); }});
    it({Q}should init local storage{Q}, async () => {{ await dr.initialize(); expect(dr.localStorage.initialized).toBe(true); }});
    it({Q}should init theme{Q}, async () => {{ await dr.initialize(); expect(dr.theme.initialized).toBe(true); }});
    it({Q}should init notification{Q}, async () => {{ await dr.initialize(); expect(dr.notification.initialized).toBe(true); }});
    it({Q}should init command palette{Q}, async () => {{ await dr.initialize(); expect(dr.commandPalette.initialized).toBe(true); }});
    it({Q}should init search{Q}, async () => {{ await dr.initialize(); expect(dr.search.initialized).toBe(true); }});
    it({Q}should init startup{Q}, async () => {{ await dr.initialize(); expect(dr.startup.initialized).toBe(true); }});
    it({Q}should init settings{Q}, async () => {{ await dr.initialize(); expect(dr.settings.initialized).toBe(true); }});
    it({Q}should init diagnostics{Q}, async () => {{ await dr.initialize(); expect(dr.diagnostics.initialized).toBe(true); }});
    it({Q}should init crash recovery{Q}, async () => {{ await dr.initialize(); expect(dr.crashRecovery.initialized).toBe(true); }});
  }});
}});
""")
print('desktop-runtime tests: OK')

# UI tests
screens = ['Home', 'Conversation', 'Projects', 'Memory', 'Knowledge', 'Workflows', 'Marketplace', 'Settings', 'Diagnostics']
for s in screens:
    sn = s.lower()
    w(f'{TB}/ui/{sn}.test.ts', f"""import {{ describe, it, expect }} from {Q}vitest{Q};
import {{ {s}Screen }} from {Q}../../ui/screens/{sn}.js{Q};

describe({Q}{s}Screen{Q}, () => {{
  it({Q}should construct{Q}, () => {{ const sc = new {s}Screen({Q}test-id{Q}); expect(sc.screenId).toBe({Q}test-id{Q}); }});
  it({Q}should start inactive{Q}, () => {{ const sc = new {s}Screen({Q}test-id{Q}); expect(sc.isActive).toBe(false); }});
  it({Q}should activate{Q}, () => {{ const sc = new {s}Screen({Q}test-id{Q}); sc.activate(); expect(sc.isActive).toBe(true); }});
  it({Q}should deactivate{Q}, () => {{ const sc = new {s}Screen({Q}test-id{Q}); sc.activate(); sc.deactivate(); expect(sc.isActive).toBe(false); }});
  it({Q}should render{Q}, () => {{ const sc = new {s}Screen({Q}test-id{Q}); expect(sc.render()).toBe({Q}{sn}-screen{Q}); }});
  it({Q}should get state{Q}, () => {{ const sc = new {s}Screen({Q}test-id{Q}); sc.activate(); const st = sc.getState(); expect(st.screenId).toBe({Q}test-id{Q}); expect(st.isActive).toBe(true); }});
}});
""")

w(TB + '/ui/layout.test.ts', f"""import {{ describe, it, expect, beforeEach }} from {Q}vitest{Q};
import {{ LayoutManager }} from {Q}../../ui/components/layout.js{Q};

describe({Q}LayoutManager{Q}, () => {{
  let lm: LayoutManager;
  beforeEach(() => {{ lm = new LayoutManager(); }});
  it({Q}should register screen{Q}, () => {{ lm.registerScreen({Q}home{Q}, {{render: () => {Q}home-screen{Q} }}); expect(lm.getRegisteredScreens().length).toBe(1); }});
  it({Q}should set active{Q}, () => {{ lm.registerScreen({Q}home{Q}, {{render: () => {Q}home-screen{Q} }}); lm.setActiveScreen({Q}home{Q}); expect(lm.getActiveScreen()).toBe({Q}home{Q}); }});
  it({Q}should render active{Q}, () => {{ lm.registerScreen({Q}home{Q}, {{render: () => {Q}home-screen{Q} }}); lm.setActiveScreen({Q}home{Q}); expect(lm.render()).toBe({Q}home-screen{Q}); }});
  it({Q}should return no-active when empty{Q}, () => {{ expect(lm.render()).toBe({Q}no-active-screen{Q}); }});
  it({Q}should throw on missing screen{Q}, () => {{ expect(() => lm.setActiveScreen({Q}missing{Q})).toThrow(); }});
  it({Q}should return empty list initially{Q}, () => {{ expect(lm.getRegisteredScreens().length).toBe(0); }});
}});
""")
print('UI tests: OK')

print('\n=== ALL TEST FILES GENERATED ===')
