import { useEffect, useState, useCallback } from 'react';
import { Building2, UserCog, ShieldCheck, LogOut, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AlertBanner, LoadingSpinner, StatusBadge } from '../components/UI';

export default function SettingsPage() {
  const { profile, hospital, isAdmin, refreshHospital, refreshProfile, signOut } = useAuth();

  const [tab, setTab] = useState('profile');
  const [banner, setBanner] = useState({ type: '', message: '' });

  // Profile & Password state
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Hospital state
  const [hospForm, setHospForm] = useState(hospital);
  const [savingHosp, setSavingHosp] = useState(false);

  // Users state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('receptionist');

  useEffect(() => {
    setFullName(profile?.full_name || '');
  }, [profile]);

  useEffect(() => {
    setHospForm(hospital);
  }, [hospital]);

  const loadUsers = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setBanner({ type: 'error', message: error.message });
    setUsers(data || []);
    setLoadingUsers(false);
  }, [isAdmin]);

  useEffect(() => {
    if (tab === 'users' && isAdmin) {
      loadUsers();
    }
  }, [tab, isAdmin, loadUsers]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setBanner({ type: '', message: '' });
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', profile.id);
      if (error) throw error;
      await refreshProfile();
      setBanner({ type: 'success', message: 'Profile updated successfully.' });
    } catch (err) {
      setBanner({ type: 'error', message: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setBanner({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setBanner({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    setSavingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      setBanner({ type: 'success', message: 'Password updated successfully.' });
    } catch (err) {
      setBanner({ type: 'error', message: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveHospital = async (e) => {
    e.preventDefault();
    setSavingHosp(true);
    setBanner({ type: '', message: '' });
    try {
      const { error } = await supabase
        .from('hospitals')
        .update({
          name: hospForm.name,
          logo_url: hospForm.logo_url,
          address: hospForm.address,
          phone: hospForm.phone,
          email: hospForm.email,
          website: hospForm.website,
          gst_number: hospForm.gst_number,
        })
        .eq('id', hospForm.id);
      if (error) throw error;
      await refreshHospital();
      setBanner({ type: 'success', message: 'Hospital settings saved.' });
    } catch (err) {
      setBanner({ type: 'error', message: err.message });
    } finally {
      setSavingHosp(false);
    }
  };

  const handleToggleUserActive = async (u) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !u.is_active })
      .eq('id', u.id);
    if (error) setBanner({ type: 'error', message: error.message });
    else loadUsers();
  };

  const handleRoleChange = async (u, newRole) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', u.id);
    if (error) setBanner({ type: 'error', message: error.message });
    else {
      setBanner({ type: 'success', message: `Updated ${u.full_name}'s role to ${newRole}.` });
      loadUsers();
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setBanner({ type: '', message: '' });
    try {
      const { error } = await supabase.auth.signUp({
        email: newUserEmail.trim(),
        password: newUserPassword,
        options: {
          data: {
            full_name: newUserName.trim(),
            role: newUserRole,
          },
        },
      });
      if (error) throw error;
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      setBanner({
        type: 'success',
        message: 'Staff user created! Note: if email confirmation is enabled in Supabase, they must confirm their email.',
      });
      setTimeout(loadUsers, 1000);
    } catch (err) {
      setBanner({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {banner.message && (
        <AlertBanner
          type={banner.type}
          message={banner.message}
          onClose={() => setBanner({ type: '', message: '' })}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
          <p className="text-sm text-slate-500">Manage your profile, hospital details, and user roles</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => setTab('profile')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap ${
            tab === 'profile'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Profile &amp; Security
        </button>
        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => setTab('hospital')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap ${
                tab === 'hospital'
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Hospital &amp; App Settings
            </button>
            <button
              type="button"
              onClick={() => setTab('users')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap ${
                tab === 'users'
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCog className="w-4 h-4" />
              User Management
            </button>
          </>
        )}
      </div>

      {tab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleUpdateProfile} className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Profile Settings</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                disabled
                value={profile?.email || ''}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <input
                type="text"
                disabled
                value={profile?.role || ''}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 capitalize"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save Profile
            </button>
          </form>

          <form onSubmit={handleChangePassword} className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Change Password</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0D9488] rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              Update Password
            </button>
          </form>
        </div>
      )}

      {tab === 'hospital' && isAdmin && (
        <form onSubmit={handleSaveHospital} className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
          <h3 className="text-base font-semibold text-slate-900">Hospital Information &amp; Regional Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hospital Name</label>
              <input
                type="text"
                required
                value={hospForm?.name || ''}
                onChange={(e) => setHospForm({ ...hospForm, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL</label>
              <input
                type="url"
                value={hospForm?.logo_url || ''}
                onChange={(e) => setHospForm({ ...hospForm, logo_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={hospForm?.phone || ''}
                onChange={(e) => setHospForm({ ...hospForm, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={hospForm?.email || ''}
                onChange={(e) => setHospForm({ ...hospForm, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
              <input
                type="text"
                value={hospForm?.website || ''}
                onChange={(e) => setHospForm({ ...hospForm, website: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">GST Number (optional)</label>
              <input
                type="text"
                value={hospForm?.gst_number || ''}
                onChange={(e) => setHospForm({ ...hospForm, gst_number: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hospital Address</label>
            <textarea
              rows={2}
              value={hospForm?.address || ''}
              onChange={(e) => setHospForm({ ...hospForm, address: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block">Currency</span>
              <span className="font-semibold text-slate-800">INR (₹)</span>
            </div>
            <div>
              <span className="text-slate-400 block">Date Format</span>
              <span className="font-semibold text-slate-800">DD/MM/YYYY</span>
            </div>
            <div>
              <span className="text-slate-400 block">Time Format</span>
              <span className="font-semibold text-slate-800">12-hour</span>
            </div>
            <div>
              <span className="text-slate-400 block">Timezone</span>
              <span className="font-semibold text-slate-800">Asia/Kolkata</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingHosp}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {savingHosp ? 'Saving...' : 'Save Hospital Settings'}
          </button>
        </form>
      )}

      {tab === 'users' && isAdmin && (
        <div className="space-y-6">
          <form onSubmit={handleCreateUser} className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Add Staff User</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="text"
                required
                placeholder="Full Name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="email"
                required
                placeholder="Email Address"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Temporary Password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="receptionist">Receptionist</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700"
            >
              Create User
            </button>
          </form>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loadingUsers ? (
              <LoadingSpinner label="Loading staff users..." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{u.full_name}</td>
                        <td className="px-4 py-3 text-slate-600">{u.email}</td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            disabled={u.id === profile?.id}
                            className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white capitalize"
                          >
                            <option value="admin">admin</option>
                            <option value="receptionist">receptionist</option>
                            <option value="doctor">doctor</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={u.is_active ? 'Active' : 'Inactive'} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {u.id !== profile?.id && (
                            <button
                              type="button"
                              onClick={() => handleToggleUserActive(u)}
                              className="text-xs font-medium text-[#2563EB] hover:underline"
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
