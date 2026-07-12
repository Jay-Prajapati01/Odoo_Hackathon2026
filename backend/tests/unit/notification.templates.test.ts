import { renderTemplate, calculatePriority, NOTIFICATION_TEMPLATES } from '../../src/modules/notification/services/notification.templates';

describe('Notification templates', () => {
  it('renders a known template with correct type, priority and module', () => {
    const tpl = renderTemplate('user.signup');
    expect(tpl.type).toBe('info');
    expect(tpl.priority).toBe('medium');
    expect(tpl.module).toBe('auth');
    expect(tpl.title).toContain('AssetFlow');
  });

  it('fills placeholders from the data object', () => {
    const tpl = renderTemplate('role.promoted', { roleName: 'Asset Manager' });
    expect(tpl.message).toContain('Asset Manager');
    expect(tpl.message).not.toContain('{{roleName}}');
  });

  it('falls back to a generic template for unknown keys', () => {
    const tpl = renderTemplate('does.not.exist' as never);
    expect(tpl.type).toBe('info');
    expect(tpl.title).toBe('Notification');
  });

  it('covers every business event listed in the catalog', () => {
    const keys = Object.keys(NOTIFICATION_TEMPLATES);
    const required = [
      'user.signup',
      'role.promoted',
      'department.created',
      'department.updated',
      'category.created',
      'employee.updated',
      'asset.registered',
      'asset.updated',
      'asset.allocated',
      'transfer.requested',
      'transfer.approved',
      'transfer.rejected',
      'return.approved',
      'booking.created',
      'booking.cancelled',
      'booking.reminder',
      'maintenance.requested',
      'maintenance.approved',
      'maintenance.rejected',
      'repair.completed',
      'audit.assigned',
      'audit.completed',
      'discrepancy.created',
      'report.generated',
      'export.downloaded',
    ];
    for (const key of required) {
      expect(keys).toContain(key);
    }
  });

  it('calculates priority from notification type', () => {
    expect(calculatePriority('error')).toBe('critical');
    expect(calculatePriority('rejection')).toBe('high');
    expect(calculatePriority('approval')).toBe('medium');
    expect(calculatePriority('warning')).toBe('medium');
    expect(calculatePriority('info')).toBe('low');
  });
});
