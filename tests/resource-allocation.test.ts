import { describe, it, expect, beforeEach } from 'vitest';

// Mock Clarity environment
const mockClarity = {
  tx: {
    sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'
  },
  contracts: {
    resourceAllocation: {
      functions: {
        'add-resource': (name, resourceType, capacity, costPerHour) => {
          if (mockClarity.tx.sender !== mockAdmin) {
            return { type: 'err', value: 403 };
          }
          const resourceId = nextResourceId++;
          resources[resourceId] = {
            name,
            'resource-type': resourceType,
            capacity,
            available: capacity,
            'cost-per-hour': costPerHour
          };
          return { type: 'ok', value: resourceId };
        },
        'allocate-resource': (resourceId, orderId, startTime, endTime, allocatedCapacity) => {
          if (mockClarity.tx.sender !== mockAdmin) {
            return { type: 'err', value: 403 };
          }
          if (!resources[resourceId]) {
            return { type: 'err', value: 404 };
          }
          if (resources[resourceId].available < allocatedCapacity) {
            return { type: 'err', value: 401 };
          }
          
          const allocationId = nextAllocationId++;
          allocations[allocationId] = {
            'resource-id': resourceId,
            'order-id': orderId,
            'start-time': startTime,
            'end-time': endTime,
            'allocated-capacity': allocatedCapacity
          };
          
          resources[resourceId].available -= allocatedCapacity;
          
          return { type: 'ok', value: allocationId };
        },
        'release-allocation': (allocationId) => {
          if (mockClarity.tx.sender !== mockAdmin) {
            return { type: 'err', value: 403 };
          }
          if (!allocations[allocationId]) {
            return { type: 'err', value: 404 };
          }
          
          const resourceId = allocations[allocationId]['resource-id'];
          const allocatedCapacity = allocations[allocationId]['allocated-capacity'];
          
          resources[resourceId].available += allocatedCapacity;
          
          return { type: 'ok', value: true };
        },
        'get-resource': (resourceId) => {
          return resources[resourceId] ?
              { type: 'some', value: resources[resourceId] } :
              { type: 'none' };
        },
        'get-allocation': (allocationId) => {
          return allocations[allocationId] ?
              { type: 'some', value: allocations[allocationId] } :
              { type: 'none' };
        }
      }
    }
  }
};

// Mock variables
let resources = {};
let allocations = {};
let nextResourceId = 1;
let nextAllocationId = 1;
const mockAdmin = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

describe('Resource Allocation Contract', () => {
  beforeEach(() => {
    // Reset state before each test
    resources = {};
    allocations = {};
    nextResourceId = 1;
    nextAllocationId = 1;
  });
  
  it('should add a new resource', () => {
    const result = mockClarity.contracts.resourceAllocation.functions['add-resource'](
        'CNC Machine', 'equipment', 100, 50
    );
    
    expect(result.type).toBe('ok');
    expect(result.value).toBe(1);
    expect(resources[1].name).toBe('CNC Machine');
    expect(resources[1]['resource-type']).toBe('equipment');
    expect(resources[1].capacity).toBe(100);
    expect(resources[1].available).toBe(100);
    expect(resources[1]['cost-per-hour']).toBe(50);
  });
  
  it('should allocate a resource', () => {
    // First add a resource
    mockClarity.contracts.resourceAllocation.functions['add-resource'](
        'CNC Machine', 'equipment', 100, 50
    );
    
    // Then allocate it
    const result = mockClarity.contracts.resourceAllocation.functions['allocate-resource'](
        1, 101, 1000, 1100, 30
    );
    
    expect(result.type).toBe('ok');
    expect(result.value).toBe(1);
    expect(allocations[1]['resource-id']).toBe(1);
    expect(allocations[1]['order-id']).toBe(101);
    expect(allocations[1]['allocated-capacity']).toBe(30);
    expect(resources[1].available).toBe(70); // 100 - 30
  });
  
  it('should release an allocation', () => {
    // First add a resource
    mockClarity.contracts.resourceAllocation.functions['add-resource'](
        'CNC Machine', 'equipment', 100, 50
    );
    
    // Then allocate it
    mockClarity.contracts.resourceAllocation.functions['allocate-resource'](
        1, 101, 1000, 1100, 30
    );
    
    // Finally release the allocation
    const result = mockClarity.contracts.resourceAllocation.functions['release-allocation'](1);
    
    expect(result.type).toBe('ok');
    expect(result.value).toBe(true);
    expect(resources[1].available).toBe(100); // Back to full capacity
  });
  
  it('should fail when allocating more than available', () => {
    // First add a resource
    mockClarity.contracts.resourceAllocation.functions['add-resource'](
        'CNC Machine', 'equipment', 100, 50
    );
    
    // Try to allocate more than available
    const result = mockClarity.contracts.resourceAllocation.functions['allocate-resource'](
        1, 101, 1000, 1100, 150
    );
    
    expect(result.type).toBe('err');
    expect(result.value).toBe(401);
    expect(resources[1].available).toBe(100); // Should remain unchanged
  });
  
  it('should get resource details', () => {
    // First add a resource
    mockClarity.contracts.resourceAllocation.functions['add-resource'](
        'CNC Machine', 'equipment', 100, 50
    );
    
    // Get the resource details
    const result = mockClarity.contracts.resourceAllocation.functions['get-resource'](1);
    
    expect(result.type).toBe('some');
    expect(result.value.name).toBe('CNC Machine');
    expect(result.value.capacity).toBe(100);
  });
});
