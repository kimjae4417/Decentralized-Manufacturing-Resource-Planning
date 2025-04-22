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
    outputTracking: {
      functions: {
        'record-output': (orderId, quantityProduced, qualityScore) => {
          if (mockClarity.tx.sender !== mockAdmin) {
            return { type: 'err', value: 403 };
          }
          const outputId = nextOutputId++;
          outputs[outputId] = {
            'order-id': orderId,
            'quantity-produced': quantityProduced,
            'quality-score': qualityScore,
            'completion-time': mockClarity.block.height,
            verified: false
          };
          return { type: 'ok', value: outputId };
        },
        'verify-output': (outputId) => {
          if (mockClarity.tx.sender !== mockAdmin) {
            return { type: 'err', value: 403 };
          }
          if (!outputs[outputId]) {
            return { type: 'err', value: 404 };
          }
          outputs[outputId].verified = true;
          return { type: 'ok', value: true };
        },
        'update-quality-score': (outputId, newQualityScore) => {
          if (mockClarity.tx.sender !== mockAdmin) {
            return { type: 'err', value: 403 };
          }
          if (!outputs[outputId]) {
            return { type: 'err', value: 404 };
          }
          outputs[outputId]['quality-score'] = newQualityScore;
          return { type: 'ok', value: true };
        },
        'get-output': (outputId) => {
          return outputs[outputId] ?
              { type: 'some', value: outputs[outputId] } :
              { type: 'none' };
        }
      }
    }
  }
};

// Mock variables
let outputs = {};
let nextOutputId = 1;
const mockAdmin = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

describe('Output Tracking Contract', () => {
  beforeEach(() => {
    // Reset state before each test
    outputs = {};
    nextOutputId = 1;
    mockClarity.block.height = 100;
  });
  
  it('should record production output', () => {
    const result = mockClarity.contracts.outputTracking.functions['record-output'](
        101, 450, 85
    );
    
    expect(result.type).toBe('ok');
    expect(result.value).toBe(1);
    expect(outputs[1]['order-id']).toBe(101);
    expect(outputs[1]['quantity-produced']).toBe(450);
    expect(outputs[1]['quality-score']).toBe(85);
    expect(outputs[1].verified).toBe(false);
  });
  
  it('should verify output', () => {
    // First record an output
    mockClarity.contracts.outputTracking.functions['record-output'](
        101, 450, 85
    );
    
    // Then verify it
    const result = mockClarity.contracts.outputTracking.functions['verify-output'](1);
    
    expect(result.type).toBe('ok');
    expect(result.value).toBe(true);
    expect(outputs[1].verified).toBe(true);
  });
  
  it('should update quality score', () => {
    // First record an output
    mockClarity.contracts.outputTracking.functions['record-output'](
        101, 450, 85
    );
    
    // Then update its quality score
    const result = mockClarity.contracts.outputTracking.functions['update-quality-score'](
        1, 90
    );
    
    expect(result.type).toBe('ok');
    expect(result.value).toBe(true);
    expect(outputs[1]['quality-score']).toBe(90);
  });
  
  it('should get output details', () => {
    // First record an output
    mockClarity.contracts.outputTracking.functions['record-output'](
        101, 450, 85
    );
    
    // Get the output details
    const result = mockClarity.contracts.outputTracking.functions['get-output'](1);
    
    expect(result.type).toBe('some');
    expect(result.value['order-id']).toBe(101);
    expect(result.value['quantity-produced']).toBe(450);
    expect(result.value['quality-score']).toBe(85);
    expect(result.value.verified).toBe(false);
  });
  
  it('should fail when verifying non-existent output', () => {
    const result = mockClarity.contracts.outputTracking.functions['verify-output'](999);
    
    expect(result.type).toBe('err');
    expect(result.value).toBe(404);
  });
});
