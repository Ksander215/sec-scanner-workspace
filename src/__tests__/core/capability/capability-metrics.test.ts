/**
 * CapabilityMetricsCollector Tests
 *
 * Tests for: increment/set/reset methods, getMetrics, counter floors.
 */
import { CapabilityMetricsCollector } from '../../../core/capability/capability-metrics.js';

describe('CapabilityMetricsCollector', () => {
  let metrics: CapabilityMetricsCollector;

  beforeEach(() => {
    metrics = new CapabilityMetricsCollector();
  });

  // --- 1. Initial metrics all zero (12 tests) ---

  describe('initial metrics', () => {
    it('should start with totalPacks at 0', () => {
      expect(metrics.getMetrics().totalPacks).toBe(0);
    });

    it('should start with activePacks at 0', () => {
      expect(metrics.getMetrics().activePacks).toBe(0);
    });

    it('should start with disabledPacks at 0', () => {
      expect(metrics.getMetrics().disabledPacks).toBe(0);
    });

    it('should start with suspendedPacks at 0', () => {
      expect(metrics.getMetrics().suspendedPacks).toBe(0);
    });

    it('should start with totalCapabilities at 0', () => {
      expect(metrics.getMetrics().totalCapabilities).toBe(0);
    });

    it('should start with validationChecks at 0', () => {
      expect(metrics.getMetrics().validationChecks).toBe(0);
    });

    it('should start with dependencyResolutions at 0', () => {
      expect(metrics.getMetrics().dependencyResolutions).toBe(0);
    });

    it('should start with sandboxViolations at 0', () => {
      expect(metrics.getMetrics().sandboxViolations).toBe(0);
    });

    it('should start with permissionRequests at 0', () => {
      expect(metrics.getMetrics().permissionRequests).toBe(0);
    });

    it('should start with permissionGrants at 0', () => {
      expect(metrics.getMetrics().permissionGrants).toBe(0);
    });

    it('should start with permissionDenials at 0', () => {
      expect(metrics.getMetrics().permissionDenials).toBe(0);
    });

    it('should start with eventsPublished at 0', () => {
      expect(metrics.getMetrics().eventsPublished).toBe(0);
    });
  });

  // --- 2. Increment methods (10 tests) ---

  describe('increment methods', () => {
    it('should increment totalPacks', () => {
      metrics.incrementTotalPacks();
      metrics.incrementTotalPacks();
      expect(metrics.getMetrics().totalPacks).toBe(2);
    });

    it('should increment validationChecks', () => {
      metrics.incrementValidationChecks();
      metrics.incrementValidationChecks();
      metrics.incrementValidationChecks();
      expect(metrics.getMetrics().validationChecks).toBe(3);
    });

    it('should increment dependencyResolutions', () => {
      metrics.incrementDependencyResolutions();
      expect(metrics.getMetrics().dependencyResolutions).toBe(1);
    });

    it('should increment sandboxViolations', () => {
      metrics.incrementSandboxViolations();
      metrics.incrementSandboxViolations();
      expect(metrics.getMetrics().sandboxViolations).toBe(2);
    });

    it('should increment permissionRequests', () => {
      metrics.incrementPermissionRequests();
      expect(metrics.getMetrics().permissionRequests).toBe(1);
    });

    it('should increment permissionGrants', () => {
      metrics.incrementPermissionGrants();
      metrics.incrementPermissionGrants();
      expect(metrics.getMetrics().permissionGrants).toBe(2);
    });

    it('should increment permissionDenials', () => {
      metrics.incrementPermissionDenials();
      expect(metrics.getMetrics().permissionDenials).toBe(1);
    });

    it('should increment eventsPublished', () => {
      metrics.incrementEventsPublished();
      metrics.incrementEventsPublished();
      metrics.incrementEventsPublished();
      expect(metrics.getMetrics().eventsPublished).toBe(3);
    });

    it('should add capabilities with positive count', () => {
      metrics.addCapabilities(5);
      metrics.addCapabilities(3);
      expect(metrics.getMetrics().totalCapabilities).toBe(8);
    });

    it('should remove capabilities', () => {
      metrics.addCapabilities(10);
      metrics.removeCapabilities(4);
      expect(metrics.getMetrics().totalCapabilities).toBe(6);
    });
  });

  // --- 3. Set methods (3 tests) ---

  describe('set methods', () => {
    it('should set activePacks to a specific value', () => {
      metrics.setActivePacks(7);
      expect(metrics.getMetrics().activePacks).toBe(7);
    });

    it('should set disabledPacks to a specific value', () => {
      metrics.setDisabledPacks(3);
      expect(metrics.getMetrics().disabledPacks).toBe(3);
    });

    it('should set suspendedPacks to a specific value', () => {
      metrics.setSuspendedPacks(1);
      expect(metrics.getMetrics().suspendedPacks).toBe(1);
    });
  });

  // --- 4. Reset (1 test) ---

  describe('reset', () => {
    it('should reset all metrics to zero', () => {
      metrics.incrementTotalPacks();
      metrics.incrementValidationChecks();
      metrics.incrementSandboxViolations();
      metrics.incrementPermissionRequests();
      metrics.incrementPermissionGrants();
      metrics.incrementPermissionDenials();
      metrics.incrementEventsPublished();
      metrics.incrementDependencyResolutions();
      metrics.addCapabilities(42);
      metrics.setActivePacks(5);
      metrics.setDisabledPacks(2);
      metrics.setSuspendedPacks(1);

      metrics.reset();

      const m = metrics.getMetrics();
      expect(m.totalPacks).toBe(0);
      expect(m.activePacks).toBe(0);
      expect(m.disabledPacks).toBe(0);
      expect(m.suspendedPacks).toBe(0);
      expect(m.totalCapabilities).toBe(0);
      expect(m.validationChecks).toBe(0);
      expect(m.dependencyResolutions).toBe(0);
      expect(m.sandboxViolations).toBe(0);
      expect(m.permissionRequests).toBe(0);
      expect(m.permissionGrants).toBe(0);
      expect(m.permissionDenials).toBe(0);
      expect(m.eventsPublished).toBe(0);
    });
  });

  // --- 5. getMetrics returns frozen object (2 tests) ---

  describe('getMetrics immutability', () => {
    it('should return a frozen object', () => {
      const result = metrics.getMetrics();
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should return independent snapshots on each call', () => {
      metrics.incrementTotalPacks();
      const first = metrics.getMetrics();
      metrics.incrementTotalPacks();
      const second = metrics.getMetrics();
      expect(first.totalPacks).toBe(1);
      expect(second.totalPacks).toBe(2);
    });
  });

  // --- 6. Counter behavior: decrement does not go below zero (2) ---

  describe('counter floor at zero', () => {
    it('decrementTotalPacks should not go below zero', () => {
      metrics.decrementTotalPacks();
      metrics.decrementTotalPacks();
      expect(metrics.getMetrics().totalPacks).toBe(0);
    });

    it('removeCapabilities should not go below zero', () => {
      metrics.removeCapabilities(100);
      expect(metrics.getMetrics().totalCapabilities).toBe(0);
    });
  });
});
