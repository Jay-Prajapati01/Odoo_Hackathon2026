import React, { useState, useEffect, useCallback } from 'react';
import { settingsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Setting } from '../types';

const Settings: React.FC = () => {
  const { user, role } = useAuth();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [changes, setChanges] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsApi.getAll();
      setSettings(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleChange = (key: string, value: unknown) => {
    setChanges(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(changes)) {
        const setting = settings.find(s => s.key === key);
        await settingsApi.set(key, value, setting?.group, setting?.description);
      }
      setChanges({});
      await fetchSettings();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const isBoolean = (val: unknown) => typeof val === 'boolean';
  const isNumber = (val: unknown) => typeof val === 'number';

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow p-6 sticky top-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center text-2xl font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{user?.firstName} {user?.lastName}</h2>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-t">
                <span className="text-gray-500">Role</span>
                <span className="font-medium">{role}</span>
              </div>
              {user?.department && (
                <div className="flex justify-between py-2 border-t">
                  <span className="text-gray-500">Department</span>
                  <span className="font-medium">{user.department}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t">
                <span className="text-gray-500">Status</span>
                <span className="font-medium capitalize">{user?.status || 'Active'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold mb-4">System Settings</h2>
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading settings...</div>
            ) : settings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No settings found</div>
            ) : (
              <div className="space-y-4">
                {settings.map(s => {
                  const currentVal = changes[s.key] !== undefined ? changes[s.key] : s.value;
                  const isModified = changes[s.key] !== undefined;

                  return (
                    <div key={s.key} className={`flex items-center justify-between p-4 rounded-lg border transition ${isModified ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                      <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{s.key}</p>
                          {s.group && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{s.group}</span>}
                        </div>
                        {s.description && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}
                      </div>
                      <div className="flex-shrink-0">
                        {isBoolean(currentVal) ? (
                          <button
                            onClick={() => handleChange(s.key, !currentVal)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${currentVal ? 'bg-primary' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${currentVal ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        ) : isNumber(currentVal) ? (
                          <input
                            type="number"
                            value={currentVal as number}
                            onChange={e => handleChange(s.key, Number(e.target.value))}
                            className="w-24 border rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <input
                            type="text"
                            value={String(currentVal ?? '')}
                            onChange={e => handleChange(s.key, e.target.value)}
                            className="w-48 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {Object.keys(changes).length > 0 && (
              <div className="flex justify-end mt-6 pt-4 border-t">
                <button onClick={() => setChanges({})} className="px-4 py-2 text-sm border rounded-lg mr-3 hover:bg-gray-50">Discard Changes</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                  {saving ? 'Saving...' : `Save ${Object.keys(changes).length} Change(s)`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { Settings };
export default Settings;
