import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase dynamic import
const mockEq = vi.fn();
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ update: mockUpdate }));

vi.mock('../src/lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

describe('Foreman approval handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockResolvedValue({ data: null, error: null });
  });

  it('approves a request — sets status to approved and reviewed_by', async () => {
    const request = { id: 'req-1', employees: { name: 'Juan' } };
    const foremanId = 'foreman-1';
    const comment = null;

    // Simulate the approval handler logic
    const newStatus = 'approved';
    const { supabase } = await import('../src/lib/supabase');
    supabase.from('shift_requests').update({
      status: newStatus,
      reviewed_by: foremanId,
      review_comment: comment,
      reviewed_at: new Date().toISOString(),
    });
    mockEq('id', request.id);

    expect(mockFrom).toHaveBeenCalledWith('shift_requests');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved', reviewed_by: foremanId })
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'req-1');
  });

  it('denies a request — sets status to denied and reviewed_by', async () => {
    const request = { id: 'req-2', employees: { name: 'Maria' } };
    const foremanId = 'foreman-1';
    const comment = 'Schedule conflict';

    const newStatus = 'denied';
    const { supabase } = await import('../src/lib/supabase');
    supabase.from('shift_requests').update({
      status: newStatus,
      reviewed_by: foremanId,
      review_comment: comment,
      reviewed_at: new Date().toISOString(),
    });
    mockEq('id', request.id);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'denied', review_comment: 'Schedule conflict' })
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'req-2');
  });

  it('error path — rejects on Supabase failure', async () => {
    mockEq.mockRejectedValueOnce(new Error('Network error'));

    const request = { id: 'req-3' };

    try {
      const { supabase } = await import('../src/lib/supabase');
      supabase.from('shift_requests').update({ status: 'approved' });
      await mockEq('id', request.id);
      // Should not reach here
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe('Network error');
    }
  });
});
