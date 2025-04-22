import { describe, it, expect, beforeEach } from 'vitest';

// Mock Clarity environment
const mockClarity = {
  tx: {
    sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'
  },
  block: {
    height: 100
  },
  contracts: {
    materialInventory: {
      functions: {
        'add-material': (name, quantity, unitCost) => {
          if (mockClarity.tx.sender !== mockAdmin) {
            return { type: 'err', value: 403 };
          }
          const materialId = nextMaterialId++;
          materials[materialId] = {
            name,
            quantity,
            'unit-cost': unitCost,
            'last-updated': mockClarity.block.height
          };
          return { type: 'ok', value: materialId };
        },
        'update-quantity': (materialId, newQuantity) => {
          if (mockClarity.tx.sender !== mockAdmin) {
            return { type: 'err', value: 403 };
          }
          if (!materials[materialId]) {
            return { type: 'err', value: 404 };
          }
          materials[materialId].quantity = newQuantity;
          materials[materialId]['last-updated'] = mockClarity.block.height;
          return { type: 'ok', value: true };
        },
        'consume-material': (materialId, amount) => {
          if (mockClarity.tx.sender !== mockAdmin) {
            return { type: 'err', value: 403 };
          }
          if (!materials[materialId]) {
            return { type: 'err', value: 404 };
          }
          if (materials[materialId].quantity < amount) {
            return { type: 'err', value: 401 };
          }
          materials[materialId].quantity -= amount;
          materials[materialId]['last-updated'] = mockClarity.block.height;
          return { type: 'ok', value: true };
        },
        'get-material': (materialId) => {
          return materials[materialId] ?
              { type: 'some', value: materials[materialId] } :
              { type: 'none' };
        }
      }
    }
  }
};

// Mock variables
let materials = {};
let nextMaterialId = 1;
const mockAdmin = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

describe('Material Inventory Contract', () => {
  beforeEach(() => {
    // Reset state before each test
    materials = {};
    nextMaterialId = 1;
    mockClarity.block.height = 100;
  });
  
  it('should add a new material', () => {
    const result = mockClarity.contracts.materialInventory.functions['add-material'](
        'Steel', 1000, 50
    );
    
    expect(result.type).toBe('ok');
    expect(result.value).toBe(1);
    expect(materials[1].name).toBe('Steel');
    expect(materials[1].quantity).toBe(1000);
    expect(materials[1]['unit-cost']).toBe(50);
  });
  
  it('should update material quantity', () => {
    // First add a material
    mockClarity.contracts.materialInventory.functions['add-material'](
        'Steel', 1000, 50
    );
    
    // Then update its quantity
    const result = mockClarity.contracts.materialInventory.functions['update-quantity'](
        1, 1500
    );
    
    expect(result.type).toBe('ok');
    expect(result.value).toBe(true);
    expect(materials[1].quantity).toBe(1500);
  });
  
  it('should consume material', () => {
    // First add a material
    mockClarity.contracts.materialInventory.functions['add-material'](
        'Steel', 1000, 50
    );
    
    // Then consume some of it
    const result = mockClarity.contracts.materialInventory.functions['consume-material'](
        1, 300
    );
    
    expect(result.type).toBe('ok');
    expect(result.value).toBe(true);
    expect(materials[1].quantity).toBe(700);
  });
  
  it('should fail when consuming more than available', () => {
    // First add a material
    mockClarity.contracts.materialInventory.functions['add-material'](
        'Steel', 1000, 50
    );
    
    // Try to consume more than available
    const result = mockClarity.contracts.materialInventory.functions['consume-material'](
        1, 1500
    );
    
    expect(result.type).toBe('err');
    expect(result.value).toBe(401);
    expect(materials[1].quantity).toBe(1000); // Quantity should remain unchanged
  });
  
  it('should get material details', () => {
    // First add a material
    mockClarity.contracts.materialInventory.functions['add-material'](
        'Steel', 1000, 50
    );
    
    // Get the material details
    const result = mockClarity.contracts.materialInventory.functions['get-material'](1);
    
    expect(result.type).toBe('some');
    expect(result.value.name).toBe('Steel');
    expect(result.value.quantity).toBe(1000);
    expect(result.value['unit-cost']).toBe(50);
  });
});
